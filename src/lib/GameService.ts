import db from './db';
import redis, { TableState, PlayerState, getTableState, setTableState, addToDelayBuffer } from './redis';

export interface TableConfig {
  minPlayers?: number;
  maxPlayers?: number;
}

export const GameService = {
  /**
   * Create a new game table
   * Table starts in 'waiting' status until 2+ players join
   */
  async createTable(config: TableConfig = {}): Promise<number> {
    const minPlayers = Math.max(2, Math.min(config.minPlayers || 2, 9));
    const maxPlayers = Math.max(minPlayers, Math.min(config.maxPlayers || 9, 9));

    const stmt = db.prepare(`
      INSERT INTO tables (status, min_players, max_players)
      VALUES ('waiting', ?, ?)
    `);

    const result = stmt.run(minPlayers, maxPlayers);
    const tableId = result.lastInsertRowid as number;

    // Initialize Redis state
    const initialState: TableState = {
      id: tableId,
      status: 'waiting',
      settlesAt: 0,
      players: [],
      currentHand: 0,
      dealerSeat: 0,
    };

    await setTableState(tableId, initialState);

    return tableId;
  },

  /**
   * Add a player (agent) to a table.
   * Uses a DB transaction to keep DB and Redis in sync.
   */
  async joinTable(tableId: number, agentId: number, seatNumber: number): Promise<void> {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId) as any;
    if (!table) throw new Error('Table not found');
    if (table.status !== 'waiting' && table.status !== 'active') {
      throw new Error('Table is not accepting players');
    }

    // Validate seat number bounds
    if (seatNumber < 0 || seatNumber >= table.max_players) {
      throw new Error(`Seat number must be between 0 and ${table.max_players - 1}`);
    }

    // Check if agent is already at another active table
    const existingSeat = db.prepare(`
      SELECT tp.table_id FROM table_players tp
      JOIN tables t ON tp.table_id = t.id
      WHERE tp.agent_id = ? AND tp.status = 'active' AND t.status IN ('waiting', 'active')
    `).get(agentId) as any;

    if (existingSeat) {
      throw new Error(`Agent is already at table ${existingSeat.table_id}`);
    }

    // Check if seat is taken
    const existing = db.prepare(`
      SELECT * FROM table_players WHERE table_id = ? AND seat_number = ? AND status = 'active'
    `).get(tableId, seatNumber);

    if (existing) throw new Error('Seat already taken');

    // Use DB transaction for atomicity
    const joinTransaction = db.transaction(() => {
      // Add to database
      db.prepare(`
        INSERT INTO table_players (table_id, agent_id, seat_number, chips, status)
        VALUES (?, ?, ?, 1000, 'active')
      `).run(tableId, agentId, seatNumber);

      // Count current players
      const playerCount = db.prepare(`
        SELECT COUNT(*) as count FROM table_players WHERE table_id = ? AND status = 'active'
      `).get(tableId) as any;

      // Auto-start if 2+ players
      if (playerCount.count >= 2 && table.status === 'waiting') {
        const now = new Date();
        const settlesAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        db.prepare(`
          UPDATE tables SET status = 'active', started_at = ?, settles_at = ?
          WHERE id = ?
        `).run(now.toISOString(), settlesAt.toISOString(), tableId);

        return { started: true, startedAt: now.getTime(), settlesAt: settlesAt.getTime() };
      }

      return { started: false };
    });

    const result = joinTransaction();

    // Update Redis state (outside DB transaction since Redis is separate)
    const state = await getTableState(tableId);
    if (state) {
      state.players.push({
        agentId,
        seatNumber,
        chips: 1000,
        status: 'active',
      });

      if (result.started) {
        state.status = 'active';
        state.startedAt = result.startedAt;
        state.settlesAt = result.settlesAt!;
      }

      await setTableState(tableId, state);
    }

    // Log to delay buffer
    await addToDelayBuffer(tableId, {
      type: 'player_joined',
      agentId,
      seatNumber,
      timestamp: Date.now(),
    });
  },

  /**
   * Get all active tables with pagination
   */
  async getActiveTables(limit: number = 50, offset: number = 0): Promise<any[]> {
    const stmt = db.prepare(`
      SELECT t.*, COUNT(tp.agent_id) as player_count
      FROM tables t
      LEFT JOIN table_players tp ON t.id = tp.table_id AND tp.status = 'active'
      WHERE t.status = 'active' OR t.status = 'waiting'
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset) as any[];
  },

  /**
   * Get table details with players
   */
  async getTableDetails(tableId: number): Promise<any> {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId);
    if (!table) return { table: null, players: [] };

    const players = db.prepare(`
      SELECT tp.*, a.name as agent_name
      FROM table_players tp
      JOIN agents a ON tp.agent_id = a.id
      WHERE tp.table_id = ? AND tp.status = 'active'
    `).all(tableId);

    return { table, players };
  },

  /**
   * Record a hand result
   */
  async recordHand(tableId: number, handData: {
    handNumber: number;
    dealerSeat: number;
    smallBlind: number;
    bigBlind: number;
    communityCards: string;
    winnerAgentId: number;
    potSize: number;
  }): Promise<void> {
    const recordTransaction = db.transaction(() => {
      // Insert hand record
      db.prepare(`
        INSERT INTO hands (table_id, hand_number, dealer_seat, small_blind, big_blind,
                          community_cards, winner_agent_id, pot_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tableId,
        handData.handNumber,
        handData.dealerSeat,
        handData.smallBlind,
        handData.bigBlind,
        handData.communityCards,
        handData.winnerAgentId,
        handData.potSize
      );

      // Update winner's chips
      db.prepare(`
        UPDATE table_players SET chips = chips + ?
        WHERE table_id = ? AND agent_id = ?
      `).run(handData.potSize, tableId, handData.winnerAgentId);
    });

    recordTransaction();

    // Log to delay buffer
    await addToDelayBuffer(tableId, {
      type: 'hand_complete',
      ...handData,
      timestamp: Date.now(),
    });
  },

  /**
   * Settle a table (2hr cycle complete)
   * Winner takes all token reward
   */
  async settleTable(tableId: number, tokenReward: number): Promise<void> {
    const state = await getTableState(tableId);
    if (!state) throw new Error('Table not found');

    // Get leaderboard
    const ranking = state.players
      .map(p => ({ agentId: p.agentId, chips: p.chips }))
      .sort((a, b) => b.chips - a.chips)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    const winner = ranking[0];
    if (!winner) return;

    const startedAt = state.startedAt || Date.now();

    // Use transaction for settlement writes
    const settleTransaction = db.transaction(() => {
      // Create settlement record
      db.prepare(`
        INSERT INTO settlements (table_id, cycle_start, cycle_end, winner_agent_id,
                                 total_chips_ranking, token_reward)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        tableId,
        new Date(startedAt).toISOString(),
        new Date(state.settlesAt).toISOString(),
        winner.agentId,
        JSON.stringify(ranking),
        tokenReward
      );

      // Update agent's total chips and wins
      db.prepare(`
        UPDATE agents SET total_chips = total_chips + ?, wins = wins + 1
        WHERE id = ?
      `).run(winner.chips, winner.agentId);

      // Update losers
      for (const player of ranking.slice(1)) {
        db.prepare(`
          UPDATE agents SET losses = losses + 1 WHERE id = ?
        `).run(player.agentId);
      }

      // Mark table as completed
      db.prepare(`UPDATE tables SET status = 'completed' WHERE id = ?`).run(tableId);
    });

    settleTransaction();

    // Update Redis state
    state.status = 'completed';
    await setTableState(tableId, state);

    // Log settlement
    await addToDelayBuffer(tableId, {
      type: 'settlement',
      winnerAgentId: winner.agentId,
      tokenReward,
      timestamp: Date.now(),
    });
  },
};

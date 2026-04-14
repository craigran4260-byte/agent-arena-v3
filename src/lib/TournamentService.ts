import db from './db';

export interface Tournament {
  id: number;
  name: string;
  description?: string;
  status: 'upcoming' | 'active' | 'completed';
  tournament_type: 'elimination' | 'round_robin' | 'swiss';
  game_mode?: string; // V3: 'poker' by default
  max_participants: number;
  current_participants: number;
  entry_fee: number;
  prize_pool: number;
  small_blind?: number; // V3: Blind configuration
  big_blind?: number;   // V3: Blind configuration
  created_by?: number;
  starts_at: string;
  ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TournamentEntry {
  id: number;
  tournament_id: number;
  agent_id: number;
  user_id: number;
  seed_number?: number;
  status: 'active' | 'eliminated' | 'withdrawn';
  eliminated_round?: number;
  final_placement?: number;
  created_at: string;
}

export interface TournamentMatch {
  id: number;
  tournament_id: number;
  round_number: number;
  match_number: number;
  agent1_id?: number;
  agent2_id?: number;
  winner_agent_id?: number;
  loser_agent_id?: number;
  table_id?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'walkover';
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
  // V3: Replay data
  replay_available?: boolean;
  replay_data?: string; // JSON string of hand actions
}

export interface TournamentReplay {
  matchId: number;
  tournamentId: number;
  roundNumber: number;
  matchNumber: number;
  agent1Name: string;
  agent2Name: string;
  winnerName: string;
  hands: any[]; // Array of hand summaries
  duration?: number; // Match duration in seconds
}

export const TournamentService = {
  /**
   * Create a new tournament (V3 enhanced)
   */
  async create(tournament: Omit<Tournament, 'id' | 'created_at' | 'updated_at' | 'current_participants'>): Promise<Tournament> {
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO tournaments (
        name, description, status, tournament_type, game_mode, max_participants,
        entry_fee, prize_pool, small_blind, big_blind, created_by, starts_at, ends_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tournament.name,
      tournament.description || null,
      tournament.status,
      tournament.tournament_type,
      tournament.game_mode || 'poker',
      tournament.max_participants,
      tournament.entry_fee,
      tournament.prize_pool,
      tournament.small_blind || 10,
      tournament.big_blind || 20,
      tournament.created_by || null,
      tournament.starts_at,
      tournament.ends_at || null,
      now,
      now
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) throw new Error('Failed to create tournament');
    return created;
  },

  /**
   * Find tournament by ID (V3 enhanced)
   */
  findById(id: number): Tournament | null {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as Tournament | undefined;
    return tournament || null;
  },

  /**
   * Get tournament with full details including blind config
   */
  getTournamentDetails(id: number): { tournament: Tournament; entries: TournamentEntry[]; matches: TournamentMatch[] } | null {
    const tournament = this.findById(id);
    if (!tournament) return null;

    const entries = this.getEntries(id);
    const matches = this.getMatches(id);

    return { tournament, entries, matches };
  },

  /**
   * Update tournament blind configuration (V3)
   */
  async updateBlindConfig(tournamentId: number, smallBlind: number, bigBlind: number): Promise<void> {
    db.prepare(`
      UPDATE tournaments
      SET small_blind = ?, big_blind = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(smallBlind, bigBlind, tournamentId);
  },

  /**
   * Update prize pool (V3)
   */
  async updatePrizePool(tournamentId: number, prizePool: number): Promise<void> {
    db.prepare(`
      UPDATE tournaments
      SET prize_pool = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(prizePool, tournamentId);
  },

  /**
   * List tournaments with optional filtering
   */
  list(status?: string, limit = 50, offset = 0): Tournament[] {
    let query = 'SELECT * FROM tournaments';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY starts_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const tournaments = db.prepare(query).all(...params) as Tournament[];
    return tournaments;
  },

  /**
   * Register an agent for a tournament
   */
  async register(tournamentId: number, agentId: number, userId: number): Promise<TournamentEntry> {
    const tournament = this.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.current_participants >= tournament.max_participants) {
      throw new Error('Tournament is full');
    }

    // Check if agent already registered
    const existing = db.prepare(`
      SELECT id FROM tournament_entries
      WHERE tournament_id = ? AND agent_id = ?
    `).get(tournamentId, agentId);

    if (existing) {
      throw new Error('Agent already registered for this tournament');
    }

    const now = new Date().toISOString();

    // Get next seed number
    const maxSeed = db.prepare(`
      SELECT MAX(seed_number) as max_seed FROM tournament_entries WHERE tournament_id = ?
    `).get(tournamentId) as any;

    const seedNumber = (maxSeed?.max_seed || 0) + 1;

    // Register agent
    const result = db.prepare(`
      INSERT INTO tournament_entries (tournament_id, agent_id, user_id, seed_number, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(tournamentId, agentId, userId, seedNumber, now);

    // Update participant count
    db.prepare(`
      UPDATE tournaments
      SET current_participants = current_participants + 1
      WHERE id = ?
    `).run(tournamentId);

    const entry = this.findEntryById(result.lastInsertRowid as number);
    if (!entry) throw new Error('Failed to register agent');
    return entry;
  },

  /**
   * Find tournament entry by ID
   */
  findEntryById(id: number): TournamentEntry | null {
    const entry = db.prepare('SELECT * FROM tournament_entries WHERE id = ?').get(id) as TournamentEntry | undefined;
    return entry || null;
  },

  /**
   * Get entries for a tournament
   */
  getEntries(tournamentId: number): TournamentEntry[] {
    const entries = db.prepare(`
      SELECT * FROM tournament_entries
      WHERE tournament_id = ?
      ORDER BY seed_number ASC
    `).all(tournamentId) as TournamentEntry[];
    return entries;
  },

  /**
   * Get matches for a tournament
   */
  getMatches(tournamentId: number, roundNumber?: number): TournamentMatch[] {
    let query = 'SELECT * FROM tournament_matches WHERE tournament_id = ?';
    const params: any[] = [tournamentId];

    if (roundNumber !== undefined) {
      query += ' AND round_number = ?';
      params.push(roundNumber);
    }

    query += ' ORDER BY round_number, match_number';

    const matches = db.prepare(query).all(...params) as TournamentMatch[];
    return matches;
  },

  /**
   * Create match between two agents
   */
  async createMatch(
    tournamentId: number,
    roundNumber: number,
    matchNumber: number,
    agent1Id: number,
    agent2Id: number
  ): Promise<TournamentMatch> {
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO tournament_matches (
        tournament_id, round_number, match_number, agent1_id, agent2_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(tournamentId, roundNumber, matchNumber, agent1Id, agent2Id, now);

    const match = this.findMatchById(result.lastInsertRowid as number);
    if (!match) throw new Error('Failed to create match');
    return match;
  },

  /**
   * Find match by ID
   */
  findMatchById(id: number): TournamentMatch | null {
    const match = db.prepare('SELECT * FROM tournament_matches WHERE id = ?').get(id) as TournamentMatch | undefined;
    return match || null;
  },

  /**
   * Record match result
   */
  async recordResult(matchId: number, winnerAgentId: number, loserAgentId: number, tableId?: number): Promise<TournamentMatch> {
    const match = this.findMatchById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE tournament_matches
      SET winner_agent_id = ?, loser_agent_id = ?, table_id = ?, status = 'completed', completed_at = ?
      WHERE id = ?
    `).run(winnerAgentId, loserAgentId, tableId || null, now, matchId);

    // Mark loser as eliminated
    db.prepare(`
      UPDATE tournament_entries
      SET status = 'eliminated', eliminated_round = ?
      WHERE tournament_id = ? AND agent_id = ?
    `).run(match.round_number, match.tournament_id, loserAgentId);

    const updated = this.findMatchById(matchId);
    if (!updated) throw new Error('Failed to update match');
    return updated;
  },

  /**
   * Generate bracket for single elimination tournament
   */
  async generateBracket(tournamentId: number): Promise<number> {
    const tournament = this.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const entries = this.getEntries(tournamentId);
    if (entries.length < 2) {
      throw new Error('Need at least 2 participants');
    }

    // Calculate number of rounds
    const numRounds = Math.ceil(Math.log2(entries.length));
    let currentRound = 1;
    let matchNumber = 1;

    // First round - pair up entries
    for (let i = 0; i < entries.length; i += 2) {
      const agent1 = entries[i];
      const agent2 = entries[i + 1];

      if (agent2) {
        await this.createMatch(
          tournamentId,
          currentRound,
          matchNumber,
          agent1.agent_id,
          agent2.agent_id
        );
      } else {
        // Bye for odd participant
        await this.createMatch(
          tournamentId,
          currentRound,
          matchNumber,
          agent1.agent_id,
          agent1.agent_id
        );
      }

      matchNumber++;
    }

    return numRounds;
  },

  /**
   * Get tournament standings (V3 updated)
   */
  getStandings(tournamentId: number): any[] {
    const standings = db.prepare(`
      SELECT
        te.id,
        te.agent_id,
        te.seed_number,
        te.final_placement,
        te.status,
        a.name as agent_name,
        COUNT(CASE WHEN tm.winner_agent_id = te.agent_id THEN 1 END) as wins,
        COUNT(CASE WHEN tm.loser_agent_id = te.agent_id THEN 1 END) as losses
      FROM tournament_entries te
      LEFT JOIN agents a ON te.agent_id = a.id
      LEFT JOIN tournament_matches tm ON (
        (tm.agent1_id = te.agent_id OR tm.agent2_id = te.agent_id)
        AND tm.tournament_id = te.tournament_id
      )
      WHERE te.tournament_id = ?
      GROUP BY te.id
      ORDER BY te.status DESC, wins DESC, te.seed_number ASC
    `).all(tournamentId) as any[];

    return standings;
  },

  /**
   * Withdraw agent from tournament
   */
  async withdraw(tournamentId: number, agentId: number): Promise<void> {
    const entry = db.prepare(`
      SELECT * FROM tournament_entries
      WHERE tournament_id = ? AND agent_id = ?
    `).get(tournamentId, agentId) as any;

    if (!entry) {
      throw new Error('Entry not found');
    }

    db.prepare(`
      UPDATE tournament_entries
      SET status = 'withdrawn'
      WHERE tournament_id = ? AND agent_id = ?
    `).run(tournamentId, agentId);

    db.prepare(`
      UPDATE tournaments
      SET current_participants = current_participants - 1
      WHERE id = ?
    `).run(tournamentId);
  },

  /**
   * Complete tournament
   */
  async complete(tournamentId: number): Promise<void> {
    const now = new Date().toISOString();

    // Update entries with final placement
    const standings = this.getStandings(tournamentId);
    const runTransaction = db.transaction(() => {
      standings.forEach((s, index) => {
        if (s.status === 'active') {
          db.prepare(`
            UPDATE tournament_entries
            SET final_placement = ?
            WHERE id = ?
          `).run(index + 1, s.id);
        }
      });

      db.prepare(`
        UPDATE tournaments
        SET status = 'completed', ends_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, tournamentId);
    });

    runTransaction();
  },

  // ==================================================================
  // V3: Replay Methods
  // ==================================================================

  /**
   * Save match replay data (V3)
   */
  async saveMatchReplay(matchId: number, replayData: string): Promise<void> {
    db.prepare(`
      UPDATE tournament_matches
      SET replay_available = TRUE, replay_data = ?
      WHERE id = ?
    `).run(replayData, matchId);
  },

  /**
   * Get match replay data (V3)
   */
  getMatchReplay(matchId: number): TournamentReplay | null {
    const match = this.findMatchById(matchId);
    if (!match || !match.replay_available || !match.replay_data) {
      return null;
    }

    try {
      const replayData = JSON.parse(match.replay_data);

      // Get agent names
      const agent1 = db.prepare('SELECT name FROM agents WHERE id = ?').get(match.agent1_id) as any;
      const agent2 = db.prepare('SELECT name FROM agents WHERE id = ?').get(match.agent2_id) as any;
      const winner = db.prepare('SELECT name FROM agents WHERE id = ?').get(match.winner_agent_id) as any;

      return {
        matchId: match.id,
        tournamentId: match.tournament_id,
        roundNumber: match.round_number,
        matchNumber: match.match_number,
        agent1Name: agent1?.name || 'Unknown',
        agent2Name: agent2?.name || 'Unknown',
        winnerName: winner?.name || 'Unknown',
        hands: replayData.hands || [],
        duration: replayData.duration
      };
    } catch {
      return null;
    }
  },

  /**
   * List all replays for a tournament (V3)
   */
  getTournamentReplays(tournamentId: number): TournamentReplay[] {
    const matches = db.prepare(`
      SELECT * FROM tournament_matches
      WHERE tournament_id = ? AND replay_available = TRUE AND status = 'completed'
      ORDER BY round_number, match_number
    `).all(tournamentId) as TournamentMatch[];

    const replays: TournamentReplay[] = [];

    for (const match of matches) {
      if (match.replay_data) {
        const replay = this.getMatchReplay(match.id);
        if (replay) {
          replays.push(replay);
        }
      }
    }

    return replays;
  },

  /**
   * Start tournament (V3)
   */
  async startTournament(tournamentId: number): Promise<void> {
    db.prepare(`
      UPDATE tournaments
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(tournamentId);
  }
};

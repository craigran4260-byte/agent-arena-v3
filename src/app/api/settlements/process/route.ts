/**
 * Settlement Cron Job
 * Handles 2-hour settlement cycles for Agent Arena tables
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTableState, setTableState } from '@/lib/redis';
import { RewardService } from '@/lib/RewardService';

const TOKEN_REWARD = {
  FIRST: 100,
};

export interface SettlementResult {
  tableId: number;
  winnerAgentId: number;
  winnerName: string;
  finalChips: number;
  tokenReward: number;
  ranking: Array<{
    agentId: number;
    name: string;
    chips: number;
    rank: number;
  }>;
}

export const SettlementService = {
  /**
   * Process all tables that are due for settlement
   */
  async processDueTables(): Promise<SettlementResult[]> {
    const now = new Date();
    const results: SettlementResult[] = [];

    // Find all active tables that have passed their settlement time
    const dueTables = db.prepare(`
      SELECT * FROM tables
      WHERE status = 'active'
        AND settles_at IS NOT NULL
        AND settles_at <= ?
    `).all(now.toISOString()) as any[];

    for (const table of dueTables) {
      try {
        const result = await this.settleTable(table.id);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`[Settlement] Error settling table ${table.id}:`, error);
      }
    }

    return results;
  },

  /**
   * Settle a single table
   */
  async settleTable(tableId: number): Promise<SettlementResult | null> {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId) as any;
    if (!table || table.status !== 'active') {
      return null;
    }

    // Check idempotency — don't settle if already settled for this cycle
    const existingSettlement = db.prepare(`
      SELECT id FROM settlements
      WHERE table_id = ? AND cycle_start = ?
    `).get(tableId, new Date(table.started_at).toISOString()) as any;

    if (existingSettlement) {
      console.warn(`[Settlement] Table ${tableId} already settled for this cycle`);
      return null;
    }

    // Get Redis state for final chip counts
    const tableState = await getTableState(tableId);
    if (!tableState) {
      console.error(`[Settlement] No state found for table ${tableId}`);
      return null;
    }

    // Look up agent names from DB
    const agentNames = new Map<number, string>();
    for (const p of tableState.players) {
      const agent = db.prepare('SELECT name FROM agents WHERE id = ?').get(p.agentId) as any;
      agentNames.set(p.agentId, agent?.name || `Agent ${p.agentId}`);
    }

    // Build final ranking
    const ranking = tableState.players
      .map(p => ({
        agentId: p.agentId,
        name: agentNames.get(p.agentId) || `Agent ${p.agentId}`,
        chips: p.chips,
        rank: 0,
      }))
      .sort((a, b) => b.chips - a.chips)
      .map((p, index) => ({ ...p, rank: index + 1 }));

    const winner = ranking[0];
    if (!winner) {
      console.error(`[Settlement] No players found for table ${tableId}`);
      return null;
    }

    const tokenReward = TOKEN_REWARD.FIRST;

    // Get winner's user ID for reward creation
    const winnerAgent = db.prepare('SELECT user_id FROM agents WHERE id = ?').get(winner.agentId) as any;
    const winnerUserId = winnerAgent?.user_id;

    // Use transaction for atomicity
    const settleTransaction = db.transaction(() => {
      // Record settlement in database
      db.prepare(`
        INSERT INTO settlements (
          table_id, cycle_start, cycle_end,
          winner_agent_id, total_chips_ranking, token_reward
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        tableId,
        new Date(table.started_at).toISOString(),
        new Date(table.settles_at).toISOString(),
        winner.agentId,
        JSON.stringify(ranking),
        tokenReward
      );

      // Update winner's agent stats
      db.prepare(`
        UPDATE agents
        SET total_chips = total_chips + ?, wins = wins + 1
        WHERE id = ?
      `).run(winner.chips, winner.agentId);

      // Update losers' agent stats
      for (const player of ranking.slice(1)) {
        db.prepare(`
          UPDATE agents SET losses = losses + 1 WHERE id = ?
        `).run(player.agentId);
      }

      // Mark table as completed
      db.prepare(`UPDATE tables SET status = 'completed' WHERE id = ?`).run(tableId);
    });

    settleTransaction();

    // Create reward for winner's owner (outside transaction to avoid nested async)
    if (winnerUserId) {
      try {
        await RewardService.create(
          winnerUserId,
          tokenReward,
          `Settlement win on table ${tableId} with ${winner.name}`,
          'settlement_payout'
        );
      } catch (error) {
        console.error(`[Settlement] Failed to create reward for user ${winnerUserId}:`, error);
        // Don't fail the settlement if reward creation fails
      }
    }

    // Update Redis state
    tableState.status = 'completed';
    await setTableState(tableId, tableState);

    console.log(`[Settlement] Table ${tableId} settled. Winner: ${winner.name} with ${winner.chips} chips (+${tokenReward} tokens)`);

    return {
      tableId,
      winnerAgentId: winner.agentId,
      winnerName: winner.name,
      finalChips: winner.chips,
      tokenReward,
      ranking,
    };
  },

  /**
   * Get settlement history for a table
   */
  getSettlementHistory(tableId: number): any[] {
    return db.prepare(`
      SELECT s.*, a.name as winner_name
      FROM settlements s
      LEFT JOIN agents a ON s.winner_agent_id = a.id
      WHERE s.table_id = ?
      ORDER BY s.created_at DESC
    `).all(tableId) as any[];
  },

  /**
   * Get upcoming settlements (tables settling soon)
   */
  getUpcomingSettlements(minutesFromNow = 30): any[] {
    const safeMinutes = Math.max(1, Math.min(minutesFromNow, 10080)); // Max 7 days
    const now = new Date();
    const future = new Date(now.getTime() + safeMinutes * 60 * 1000);

    return db.prepare(`
      SELECT *,
        datetime(settles_at) as settles_at_local,
        ROUND((julianday(settles_at) - julianday('now')) * 24 * 60) as minutes_remaining
      FROM tables
      WHERE status = 'active'
        AND settles_at IS NOT NULL
        AND settles_at <= ?
      ORDER BY settles_at ASC
      LIMIT 50
    `).all(future.toISOString()) as any[];
  },
};

/**
 * API endpoint to trigger settlement processing
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate cron job
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.SETTLEMENT_CRON_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await SettlementService.processDueTables();

    return NextResponse.json({
      success: true,
      settled: results.length,
      data: results,
    });
  } catch (error: any) {
    console.error('[SettlementAPI] Error:', error);
    return NextResponse.json({ error: 'Failed to process settlements' }, { status: 500 });
  }
}

/**
 * Get upcoming settlements
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minutes = Math.max(1, Math.min(parseInt(searchParams.get('minutes') || '30'), 10080));

    const upcoming = SettlementService.getUpcomingSettlements(minutes);

    return NextResponse.json({
      data: upcoming,
      count: upcoming.length,
      nextSettlement: upcoming[0] || null,
    });
  } catch (error: any) {
    console.error('[SettlementAPI] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch upcoming settlements' }, { status: 500 });
  }
}

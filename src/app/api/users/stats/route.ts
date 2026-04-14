import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUserId } from '@/lib/get-session';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();

    // Get user's agent stats aggregated
    const stats = db
      .prepare(
        `SELECT
          COUNT(DISTINCT a.id) as total_agents,
          COALESCE(SUM(a.wins), 0) as total_wins,
          COALESCE(SUM(a.losses), 0) as total_losses,
          COALESCE(SUM(a.wins + a.losses), 0) as total_games,
          CASE 
            WHEN SUM(a.wins + a.losses) > 0 
            THEN ROUND(SUM(a.wins) * 100.0 / SUM(a.wins + a.losses), 1)
            ELSE 0
          END as win_rate
        FROM agents a
        WHERE a.user_id = ?`
      )
      .get(userId) as any;

    return NextResponse.json({
      totalGames: stats.total_games || 0,
      totalWins: stats.total_wins || 0,
      totalLosses: stats.total_losses || 0,
      winRate: stats.win_rate || 0,
      totalAgents: stats.total_agents || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import redis from '@/lib/redis';
import { getWSStats } from '@/lib/websocket';

// Admin middleware - check if user is admin
async function isAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return false;

    // Check if user has admin role (for now, check email)
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    return adminEmails.includes(session.user.email);
  } catch {
    return false;
  }
}

// GET /api/admin - Get admin dashboard stats
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user stats
    const userStats = db.prepare(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as new_users_week,
        COUNT(CASE WHEN daily_bonus_claimed_at >= datetime('now', '-1 days') THEN 1 END) as active_users_today
      FROM users
    `).get() as any;

    // Get agent stats
    const agentStats = db.prepare(`
      SELECT
        COUNT(*) as total_agents,
        COUNT(CASE WHEN wins > 0 OR losses > 0 THEN 1 END) as active_agents,
        SUM(wins) as total_wins,
        SUM(losses) as total_losses
      FROM agents
    `).get() as any;

    // Get table stats
    const tableStats = db.prepare(`
      SELECT
        COUNT(*) as total_tables,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tables,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_tables,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tables
      FROM tables
    `).get() as any;

    // Get tournament stats
    const tournamentStats = db.prepare(`
      SELECT
        COUNT(*) as total_tournaments,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tournaments,
        COUNT(CASE WHEN status = 'upcoming' THEN 1 END) as upcoming_tournaments
      FROM tournaments
    `).get() as any;

    // Get token stats
    const tokenStats = db.prepare(`
      SELECT
        SUM(token_balance) as total_tokens_held,
        COUNT(CASE WHEN type = 'daily_bonus' THEN 1 END) as bonuses_claimed,
        COUNT(CASE WHEN type = 'purchase' THEN 1 END) as purchases
      FROM users, token_transactions
    `).get() as any;

    // Get game session stats
    const gameSessionStats = db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions
      FROM game_sessions
    `).get() as any;

    // Get Redis stats
    const redisInfo = await redis.info('memory');
    const redisMemoryMatch = redisInfo.match(/used_memory_human:(\S+)/);
    const redisMemory = redisMemoryMatch ? redisMemoryMatch[1] : 'unknown';

    // Get WebSocket stats (if available)
    let wsStats = null;
    try {
      wsStats = getWSStats();
    } catch {
      // WebSocket server not initialized
    }

    // Get recent activity
    const recentActivity = db.prepare(`
      SELECT
        'hand' as type,
        h.id as id,
        h.created_at as timestamp,
        t.id as table_id,
        a.name as winner_name,
        h.pot_size as pot_size
      FROM hands h
      LEFT JOIN tables t ON h.table_id = t.id
      LEFT JOIN agents a ON h.winner_agent_id = a.id
      ORDER BY h.created_at DESC
      LIMIT 10
    `).all() as any[];

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      stats: {
        users: userStats,
        agents: agentStats,
        tables: tableStats,
        tournaments: tournamentStats,
        tokens: tokenStats,
        gameSessions: gameSessionStats,
      },
      infrastructure: {
        redis: {
          connected: redis.status === 'ready',
          memory: redisMemory,
        },
        websocket: wsStats,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('[Admin API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
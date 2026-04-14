import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUserId } from '@/lib/get-session';
import { authenticateRequest } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  try {
    const { tableId: tableIdParam } = await params;
    const tableId = parseInt(tableIdParam);

    if (isNaN(tableId) || tableId <= 0) {
      return NextResponse.json({ error: 'Invalid tableId' }, { status: 400 });
    }

    // Authentication - prefer NextAuth userId
    let userId: number | null = null;
    try {
      userId = await getRequiredUserId();
    } catch {
      // Fall back to API key auth
      const authError = authenticateRequest(request);
      if (authError) return authError;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount < 10 || amount > 100000) {
      return NextResponse.json(
        { error: 'Bet amount must be between 10 and 100,000' },
        { status: 400 }
      );
    }

    // Verify table exists
    const table = db.prepare('SELECT id FROM tables WHERE id = ?').get(tableId);

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Create bet record (spectator bet on table outcome)
    const result = db
      .prepare(
        `INSERT INTO bets (user_id, table_id, agent_id, bet_type, amount, status)
         VALUES (?, ?, NULL, 'win', ?, 'pending')`
      )
      .run(userId, tableId, amount);

    return NextResponse.json({
      success: true,
      message: 'Bet placed successfully',
      betAmount: amount,
      betId: result.lastInsertRowid,
    });
  } catch (error: any) {
    console.error('[API:placeBet:POST] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to place bet' },
      { status: 500 }
    );
  }
}

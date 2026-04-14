import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from '@/lib/TokenService';
import { getSession } from '@/lib/get-session';

/**
 * GET /api/tokens/history - Get transaction history
 * Query params: limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const transactions = await TokenService.getTransactionHistory(userId, limit, offset);
    const total = await TokenService.getTransactionCount(userId);

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('[Tokens] History error:', error);
    return NextResponse.json(
      { error: 'Failed to get transaction history' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from '@/lib/TokenService';
import { getSession } from '@/lib/get-session';

/**
 * GET /api/tokens - Get user's token balance and daily bonus status
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const balance = await TokenService.getBalance(userId);
    const stats = await TokenService.getTransactionStats(userId);

    return NextResponse.json({
      balance,
      stats,
      dailyBonusAmount: 100
    });
  } catch (error) {
    console.error('[Tokens] Get balance error:', error);
    return NextResponse.json(
      { error: 'Failed to get token balance' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tokens - Perform token operation
 * Body: { action: 'claim_daily' | 'purchase', amount?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { action, amount } = body;

    switch (action) {
      case 'claim_daily':
        const bonusResult = await TokenService.claimDailyBonus(userId);
        return NextResponse.json(bonusResult);

      case 'purchase':
        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: 'Invalid purchase amount' },
            { status: 400 }
          );
        }

        // In production, this would integrate with payment processor
        // For now, simulate successful purchase
        const purchaseResult = await TokenService.addTokens(
          userId,
          amount,
          'purchase',
          `Token purchase: ${amount} tokens`
        );

        return NextResponse.json({
          success: purchaseResult.success,
          amount,
          newBalance: purchaseResult.newBalance
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Tokens] Action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform token operation' },
      { status: 500 }
    );
  }
}
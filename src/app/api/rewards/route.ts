import { NextRequest, NextResponse } from 'next/server';
import { RewardService } from '@/lib/RewardService';
import { getRequiredUserId } from '@/lib/get-session';

/**
 * GET /api/rewards — List user rewards
 * Query params:
 *   - claimed: 'true'|'false' (optional, filter by claimed status)
 *   - type: 'unclaimed' (optional, shorthand for unclaimed rewards)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    const { searchParams } = new URL(req.url);

    const claimedParam = searchParams.get('claimed');
    const type = searchParams.get('type');

    let claimed: boolean | undefined;
    if (type === 'unclaimed') {
      claimed = false;
    } else if (claimedParam === 'true') {
      claimed = true;
    } else if (claimedParam === 'false') {
      claimed = false;
    }

    const rewards = RewardService.list(userId, claimed);

    return NextResponse.json(rewards);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rewards — Claim rewards
 * Body: { action: 'claim' | 'claim-all', rewardId?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    const { action, rewardId } = await req.json();

    if (action === 'claim') {
      if (!rewardId) {
        return NextResponse.json(
          { error: 'rewardId required for claim action' },
          { status: 400 }
        );
      }
      const result = await RewardService.claim(rewardId, userId);
      return NextResponse.json(result);
    } else if (action === 'claim-all') {
      const result = await RewardService.claimAll(userId);
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "claim" or "claim-all"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to process reward' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { RewardService } from '@/lib/RewardService';
import { getRequiredUserId } from '@/lib/get-session';

/**
 * GET /api/rewards/stats — Get unclaimed rewards statistics
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    const stats = RewardService.getUnclaimedStats(userId);
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch reward stats' },
      { status: 500 }
    );
  }
}

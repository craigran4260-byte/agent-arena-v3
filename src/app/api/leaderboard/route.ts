import { NextRequest, NextResponse } from 'next/server';
import { AgentService } from '@/lib/AgentService';

type SortBy = 'winRate' | 'gamesPlayed' | 'wins';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sortBy = (searchParams.get('sortBy') as SortBy) || 'winRate';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search');

    let result;

    if (search && search.trim()) {
      result = AgentService.searchAgents(search, limit);
      result = result.map((agent: any, idx: number) => ({
        ...agent,
        rank: offset + idx + 1,
      }));
    } else {
      result = AgentService.getLeaderboard(limit, offset, sortBy);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

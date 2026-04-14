import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/lib/TournamentService';
import { getOptionalUserId } from '@/lib/get-session';

/**
 * GET /api/tournaments — List tournaments
 * Query params:
 *   - status: 'upcoming' | 'active' | 'completed' (optional)
 *   - limit: number (default 50)
 *   - offset: number (default 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 100);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

    const tournaments = TournamentService.list(status, limit, offset);

    return NextResponse.json({
      data: tournaments,
      count: tournaments.length,
      limit,
      offset
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tournaments — Create new tournament (V3 enhanced)
 * Requires authentication
 * V3 fields: game_mode, small_blind, big_blind
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getOptionalUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      tournament_type = 'elimination',
      game_mode = 'poker', // V3
      max_participants = 8,
      entry_fee = 0,
      prize_pool = 0,
      small_blind = 10, // V3
      big_blind = 20,   // V3
      starts_at
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Tournament name required' },
        { status: 400 }
      );
    }

    if (!starts_at) {
      return NextResponse.json(
        { error: 'Start time required' },
        { status: 400 }
      );
    }

    const tournament = await TournamentService.create({
      name,
      description,
      status: 'upcoming',
      tournament_type,
      game_mode,
      max_participants,
      entry_fee,
      prize_pool,
      small_blind,
      big_blind,
      created_by: userId,
      starts_at
    });

    return NextResponse.json(tournament);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create tournament' },
      { status: 500 }
    );
  }
}

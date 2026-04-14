import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/lib/TournamentService';

/**
 * GET /api/tournaments/[id]/replay/[matchId] — Get specific match replay
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { id, matchId } = await params;
    const tournamentId = parseInt(id);
    const matchIdNum = parseInt(matchId);

    if (isNaN(tournamentId) || isNaN(matchIdNum)) {
      return NextResponse.json(
        { error: 'Invalid tournament or match ID' },
        { status: 400 }
      );
    }

    const replay = TournamentService.getMatchReplay(matchIdNum);

    if (!replay) {
      return NextResponse.json(
        { error: 'Replay not found for this match' },
        { status: 404 }
      );
    }

    // Verify match belongs to this tournament
    if (replay.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Match does not belong to this tournament' },
        { status: 400 }
      );
    }

    return NextResponse.json(replay);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch replay' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/lib/TournamentService';

/**
 * GET /api/tournaments/[id]/replay — Get all replays for a tournament
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);
    if (isNaN(tournamentId)) {
      return NextResponse.json(
        { error: 'Invalid tournament ID' },
        { status: 400 }
      );
    }

    const tournament = TournamentService.findById(tournamentId);
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    const replays = TournamentService.getTournamentReplays(tournamentId);

    return NextResponse.json({
      tournamentId,
      tournamentName: tournament.name,
      replays,
      count: replays.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch replays' },
      { status: 500 }
    );
  }
}
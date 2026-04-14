import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/lib/TournamentService';
import { getSession } from '@/lib/get-session';
import db from '@/lib/db';

/**
 * GET /api/tournaments/[id] — Get tournament details
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

    const entries = TournamentService.getEntries(tournamentId);
    const matches = TournamentService.getMatches(tournamentId);
    const standings = TournamentService.getStandings(tournamentId);

    return NextResponse.json({
      tournament,
      entries,
      matches,
      standings
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch tournament' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tournaments/[id] — Update tournament settings (V3)
 * Supports: blind configuration, prize pool updates
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

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

    // Check if user is tournament creator
    if (tournament.created_by !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: 'Only tournament creator can modify settings' },
        { status: 403 }
      );
    }

    // Tournament must be upcoming to modify
    if (tournament.status !== 'upcoming') {
      return NextResponse.json(
        { error: 'Cannot modify tournament that has started' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { small_blind, big_blind, prize_pool, name, description } = body;

    // Update blind configuration
    if (small_blind !== undefined && big_blind !== undefined) {
      if (small_blind <= 0 || big_blind <= 0 || big_blind < small_blind) {
        return NextResponse.json(
          { error: 'Invalid blind configuration' },
          { status: 400 }
        );
      }
      await TournamentService.updateBlindConfig(tournamentId, small_blind, big_blind);
    }

    // Update prize pool
    if (prize_pool !== undefined) {
      if (prize_pool < 0) {
        return NextResponse.json(
          { error: 'Prize pool cannot be negative' },
          { status: 400 }
        );
      }
      await TournamentService.updatePrizePool(tournamentId, prize_pool);
    }

    // Update basic info
    if (name) {
      db.prepare(`UPDATE tournaments SET name = ? WHERE id = ?`).run(name, tournamentId);
    }
    if (description) {
      db.prepare(`UPDATE tournaments SET description = ? WHERE id = ?`).run(description, tournamentId);
    }

    const updated = TournamentService.findById(tournamentId);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update tournament' },
      { status: 500 }
    );
  }
}
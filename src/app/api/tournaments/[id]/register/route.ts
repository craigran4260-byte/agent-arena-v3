import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/lib/TournamentService';
import { getRequiredUserId } from '@/lib/get-session';

/**
 * POST /api/tournaments/[id]/register — Register agent for tournament
 * Body: { agentId: number, action: 'register' | 'withdraw' }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;
    const tournamentId = parseInt(id);
    if (isNaN(tournamentId)) {
      return NextResponse.json(
        { error: 'Invalid tournament ID' },
        { status: 400 }
      );
    }

    const { agentId, action = 'register' } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID required' },
        { status: 400 }
      );
    }

    if (action === 'register') {
      const entry = await TournamentService.register(tournamentId, agentId, userId);
      return NextResponse.json({
        action: 'registered',
        entry
      });
    } else if (action === 'withdraw') {
      await TournamentService.withdraw(tournamentId, agentId);
      return NextResponse.json({
        action: 'withdrawn'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to process registration' },
      { status: 500 }
    );
  }
}

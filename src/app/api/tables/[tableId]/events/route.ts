import { NextRequest, NextResponse } from 'next/server';
import { GameService } from '@/lib/GameService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  try {
    const { tableId: tableIdParam } = await params;
    const tableId = parseInt(tableIdParam);
    const sinceParam = request.nextUrl.searchParams.get('since');
    const sinceTime = sinceParam ? parseInt(sinceParam, 10) : Date.now() - 60000;

    if (isNaN(tableId) || tableId <= 0) {
      return NextResponse.json({ error: 'Invalid tableId' }, { status: 400 });
    }

    // Get table details and events
    const details = await GameService.getTableDetails(tableId);

    if (!details.table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Filter events by timestamp
    const events = (details.events || []).filter((e: any) => {
      const eventTime = typeof e.timestamp === 'string' ? new Date(e.timestamp).getTime() : e.timestamp;
      return eventTime >= sinceTime;
    });

    return NextResponse.json({
      tableId,
      status: details.table.status,
      events: events.map((e: any) => ({
        timestamp: typeof e.timestamp === 'string' ? new Date(e.timestamp).getTime() : e.timestamp,
        type: e.action_type || e.type,
        agentName: e.agent_name || e.agentName,
        amount: e.amount,
      })),
      players: details.table.current_players || 0,
      maxPlayers: details.table.max_players || 9,
    });
  } catch (error: any) {
    console.error('[API:tableEvents:GET] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch table events' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUserId, getOptionalSession } from '@/lib/get-session';
import db from '@/lib/db';
import { ApiKeyService } from '@/lib/ApiKeyService';

// Simple base64 encoding for development (use real encryption in production)
function encrypt(text: string): string {
  return Buffer.from(text).toString('base64');
}

export async function GET(req: NextRequest) {
  try {
    const session = await getOptionalSession();
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    let query = 'SELECT id, name, wins, losses, created_at FROM agents';
    const params: any[] = [];

    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(parseInt(userId, 10));
    } else if (session?.user?.id) {
      query += ' WHERE user_id = ?';
      params.push(parseInt(session.user.id, 10));
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const agents = db.prepare(query).all(...params);
    return NextResponse.json(agents);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    const body = await req.json();
    const { name, description, connectionType, apiEndpoint, apiToken } = body;

    // Validate name
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }

    if (name.length > 64) {
      return NextResponse.json(
        { error: 'Agent name must be 64 characters or less' },
        { status: 400 }
      );
    }

    // Check for duplicate name for this user
    const existing = db.prepare(`
      SELECT id FROM agents WHERE name = ? AND user_id = ?
    `).get(name, userId);

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an agent with this name' },
        { status: 400 }
      );
    }

    // Create agent record
    const insertResult = db.prepare(`
      INSERT INTO agents (name, user_id, api_endpoint_encrypted, api_token_encrypted, wins, losses)
      VALUES (?, ?, ?, ?, 0, 0)
    `).run(
      name,
      userId,
      connectionType === 'http' ? encrypt(apiEndpoint || '') : null,
      connectionType === 'http' ? encrypt(apiToken || '') : null
    );

    const agentId = insertResult.lastInsertRowid as number;

    // Create API key for this agent
    const { key, fullKey } = await ApiKeyService.create({
      userId,
      agentId,
      name: `${name} API Key`,
      permissions: ['read', 'agent_play'],
    });

    // Generate WebSocket endpoint
    const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}`;
    const wsEndpoint = `${wsBaseUrl}/ws/agent/${agentId}`;

    // Return agent with connection info
    const agent = db.prepare('SELECT id, name, wins, losses, created_at FROM agents WHERE id = ?').get(agentId);

    return NextResponse.json({
      agent,
      connection: {
        type: connectionType || 'websocket',
        wsEndpoint,
        apiKey: fullKey,
        // For HTTP mode (optional)
        apiEndpoint: connectionType === 'http' ? apiEndpoint : undefined,
        apiToken: connectionType === 'http' ? apiToken : undefined,
      },
      instructions: connectionType === 'websocket' ? {
        protocol: 'WebSocket',
        steps: [
          `1. Connect to ${wsEndpoint}`,
          `2. Send auth message: {"type": "auth", "apiKey": "${fullKey}"}`,
          `3. Wait for "your_turn" message with game state`,
          `4. Send action: {"type": "action", "action": "fold|check|call|raise", "amount": <number>}`,
        ],
        exampleCode: `
// JavaScript WebSocket client
const ws = new WebSocket('${wsEndpoint}');
ws.onopen = () => ws.send(JSON.stringify({type: 'auth', apiKey: '${fullKey}'}));
ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  if (data.type === 'your_turn') {
    // Your decision logic here
    ws.send(JSON.stringify({type: 'action', action: 'call', amount: 0}));
  }
};
`,
      } : undefined,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUserId, getOptionalSession } from '@/lib/get-session';
import db from '@/lib/db';

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
    const { name, apiEndpoint, apiToken } = await req.json();

    if (!name || !apiEndpoint || !apiToken) {
      return NextResponse.json(
        { error: 'Missing required fields: name, apiEndpoint, apiToken' },
        { status: 400 }
      );
    }

    if (name.length > 64) {
      return NextResponse.json(
        { error: 'Agent name must be 64 characters or less' },
        { status: 400 }
      );
    }

    const encryptedEndpoint = encrypt(apiEndpoint);
    const encryptedToken = encrypt(apiToken);

    const sql = 'INSERT INTO agents (name, user_id, api_endpoint_encrypted, api_token_encrypted, wins, losses) VALUES (?, ?, ?, ?, 0, 0)';
    const result = db.prepare(sql).run(name, userId, encryptedEndpoint, encryptedToken);

    const agent = db.prepare('SELECT id, name, wins, losses, created_at FROM agents WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json(agent, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}

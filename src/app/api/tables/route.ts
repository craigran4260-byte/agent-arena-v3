import { NextRequest, NextResponse } from 'next/server';
import { getOptionalSession, getRequiredUserId } from '@/lib/get-session';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getOptionalSession();

    // Get all active tables (limit to 100)
    const tables = db
      .prepare(
        `SELECT id, name, buy_in, max_players, current_players, created_at
         FROM tables
         WHERE status = 'active'
         ORDER BY created_at DESC
         LIMIT 100`
      )
      .all();

    return NextResponse.json(
      tables.map((t: any) => ({
        id: t.id,
        name: t.name,
        buyIn: t.buy_in,
        maxPlayers: t.max_players,
        currentPlayers: t.current_players,
        createdAt: t.created_at,
      }))
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    const { name, buyIn, maxPlayers } = await req.json();

    if (!name || !buyIn || !maxPlayers) {
      return NextResponse.json(
        { error: 'Missing required fields: name, buyIn, maxPlayers' },
        { status: 400 }
      );
    }

    if (name.length > 64) {
      return NextResponse.json(
        { error: 'Table name must be 64 characters or less' },
        { status: 400 }
      );
    }

    if (buyIn < 100 || buyIn > 100000) {
      return NextResponse.json(
        { error: 'Buy-in must be between 100 and 100,000' },
        { status: 400 }
      );
    }

    if (maxPlayers < 2 || maxPlayers > 9) {
      return NextResponse.json(
        { error: 'Max players must be between 2 and 9' },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO tables (name, created_by, buy_in, max_players, current_players, status)
      VALUES (?, ?, ?, ?, 0, 'active')
    `;
    const result = db.prepare(sql).run(name, userId, buyIn, maxPlayers);

    const table = db
      .prepare(
        `SELECT id, name, buy_in, max_players, current_players, created_at
         FROM tables WHERE id = ?`
      )
      .get(result.lastInsertRowid) as any;

    return NextResponse.json(
      {
        id: table.id,
        name: table.name,
        buyIn: table.buy_in,
        maxPlayers: table.max_players,
        currentPlayers: table.current_players,
        createdAt: table.created_at,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create table' },
      { status: 500 }
    );
  }
}

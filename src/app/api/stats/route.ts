import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const agentsCount = (db.prepare('SELECT COUNT(*) as count FROM agents').get() as any).count || 0;
    const tablesCount = (db.prepare('SELECT COUNT(*) as count FROM tables').get() as any).count || 0;
    const handsCount = (db.prepare('SELECT COUNT(*) as count FROM hands').get() as any).count || 0;

    return NextResponse.json({
      agents: agentsCount,
      tables: tablesCount,
      games: handsCount,
      totalUsers: (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

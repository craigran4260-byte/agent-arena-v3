import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/UserService';
import { getRequiredSession, getOptionalSession } from '@/lib/get-session';

/**
 * POST /api/users — Register new user
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, name' },
        { status: 400 }
      );
    }

    const user = await UserService.create(email, password, name);
    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    const message = error?.message || 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * GET /api/users — Get current authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getOptionalSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = UserService.findById(parseInt(session.user.id, 10));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/UserService';
import { getRequiredUserId } from '@/lib/get-session';

/**
 * PUT /api/users/profile — Update user profile
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await getRequiredUserId();
    const { name, email, avatarUrl } = await req.json();

    if (name !== undefined && (!name || name.length > 64)) {
      return NextResponse.json(
        { error: 'Name must be 1-64 characters' },
        { status: 400 }
      );
    }

    if (email !== undefined && !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const user = UserService.updateProfile(userId, {
      name,
      email,
      avatar_url: avatarUrl
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

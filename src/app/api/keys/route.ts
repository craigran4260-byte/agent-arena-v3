import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/ApiKeyService';
import { getSession } from '@/lib/get-session';

/**
 * GET /api/keys - List all API keys for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const keys = await ApiKeyService.listByUser(userId);

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('[API Keys] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/keys - Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { name, permissions, agentId } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      );
    }

    if (name.length > 64) {
      return NextResponse.json(
        { error: 'API key name must be 64 characters or less' },
        { status: 400 }
      );
    }

    // Default permissions
    const keyPermissions = permissions || ['read'];

    const { key, fullKey } = await ApiKeyService.create({
      userId,
      agentId: agentId ? parseInt(agentId) : undefined,
      name: name.trim(),
      permissions: keyPermissions,
    });

    return NextResponse.json({
      key,
      fullKey,
      message: 'API key created successfully. Store the fullKey securely - it cannot be retrieved again.'
    }, { status: 201 });
  } catch (error) {
    console.error('[API Keys] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/ApiKeyService';
import { getSession } from '@/lib/get-session';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/keys/[id] - Get a specific API key
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
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
    const keyId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(keyId)) {
      return NextResponse.json(
        { error: 'Invalid key ID' },
        { status: 400 }
      );
    }

    const key = await ApiKeyService.getById(keyId, userId);

    if (!key) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ key });
  } catch (error) {
    console.error('[API Keys] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get API key' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/keys/[id] - Delete an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
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
    const keyId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(keyId)) {
      return NextResponse.json(
        { error: 'Invalid key ID' },
        { status: 400 }
      );
    }

    const deleted = await ApiKeyService.delete(keyId, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'API key not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('[API Keys] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/keys/[id] - Update API key (name)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
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
    const keyId = parseInt(id);
    const userId = parseInt(session.user.id);
    const body = await request.json();

    if (isNaN(keyId)) {
      return NextResponse.json(
        { error: 'Invalid key ID' },
        { status: 400 }
      );
    }

    if (body.name) {
      const updated = await ApiKeyService.updateName(keyId, userId, body.name.trim());

      if (!updated) {
        return NextResponse.json(
          { error: 'API key not found or revoked' },
          { status: 404 }
        );
      }
    }

    const key = await ApiKeyService.getById(keyId, userId);
    return NextResponse.json({ key });
  } catch (error) {
    console.error('[API Keys] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}
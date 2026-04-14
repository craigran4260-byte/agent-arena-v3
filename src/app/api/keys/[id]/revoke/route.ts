import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/ApiKeyService';
import { getSession } from '@/lib/get-session';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/keys/[id]/revoke - Revoke an API key
 */
export async function POST(
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

    const revoked = await ApiKeyService.revoke(keyId, userId);

    if (!revoked) {
      return NextResponse.json(
        { error: 'API key not found or already revoked' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('[API Keys] Revoke error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
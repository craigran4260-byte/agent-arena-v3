/**
 * API Key Authentication Middleware
 * Validates API keys for agent endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/ApiKeyService';

export interface AuthenticatedRequest {
  userId: number;
  agentId?: number;
  permissions: string[];
}

/**
 * Extract and validate API key from request headers
 * Returns the validated key info or null if invalid
 */
export async function validateApiKey(request: NextRequest): Promise<AuthenticatedRequest | null> {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer aa_live_xxx" and "aa_live_xxx" formats
  const apiKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (!apiKey || !apiKey.startsWith('aa_')) {
    return null;
  }

  const result = await ApiKeyService.validate(apiKey);

  if (!result.valid || !result.key) {
    return null;
  }

  return {
    userId: result.key.userId,
    agentId: result.key.agentId,
    permissions: result.key.permissions
  };
}

/**
 * Middleware wrapper for API routes
 * Returns 401 if API key is invalid, otherwise passes through
 */
export function withApiKeyAuth(
  handler: (request: NextRequest, auth: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = await validateApiKey(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    return handler(request, auth);
  };
}

/**
 * Check if the authenticated request has a specific permission
 */
export function hasPermission(auth: AuthenticatedRequest, permission: string): boolean {
  return auth.permissions.includes(permission) || auth.permissions.includes('admin');
}

/**
 * Require specific permission, return 403 if not authorized
 */
export function requirePermission(
  request: NextRequest,
  auth: AuthenticatedRequest,
  permission: string
): NextResponse | null {
  if (!hasPermission(auth, permission)) {
    return NextResponse.json(
      { error: `Permission denied. Required: ${permission}` },
      { status: 403 }
    );
  }
  return null;
}
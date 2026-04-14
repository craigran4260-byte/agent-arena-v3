import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth-config';
import { Session } from 'next-auth';

/**
 * Get current user session (alias for getOptionalSession)
 */
export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/**
 * Get current user session (required)
 * Throws if not authenticated
 */
export async function getRequiredSession(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

/**
 * Get current user session (optional)
 * Returns null if not authenticated
 */
export async function getOptionalSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/**
 * Get current user ID (required)
 */
export async function getRequiredUserId(): Promise<number> {
  const session = await getRequiredSession();
  return parseInt(session.user.id, 10);
}

/**
 * Get current user ID (optional)
 * Returns null if not authenticated
 */
export async function getOptionalUserId(): Promise<number | null> {
  const session = await getOptionalSession();
  if (!session) return null;
  return parseInt(session.user.id, 10);
}

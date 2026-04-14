import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix?: string; // Redis key prefix
  skipSuccessfulRequests?: boolean; // Don't count successful requests
}

// Default configurations for different endpoints
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // General API rate limit
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'rl:',
  },
  // Auth endpoints - stricter
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    keyPrefix: 'rl:auth:',
  },
  // Game actions - moderate
  game: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    keyPrefix: 'rl:game:',
  },
  // Chat - moderate
  chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyPrefix: 'rl:chat:',
  },
  // Admin - lenient for internal use
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    keyPrefix: 'rl:admin:',
  },
};

// Redis client for rate limiting
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!redis) {
    try {
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      redis.on('error', (err) => {
        console.error('[RateLimit] Redis error:', err.message);
        redis = null;
      });
    } catch (err) {
      console.error('[RateLimit] Redis init failed:', err);
    }
  }
  return redis;
}

// In-memory fallback when Redis is unavailable
const memoryStore: Map<string, { count: number; resetAt: number }> = new Map();

function getMemoryKey(key: string): { count: number; resetAt: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    return { count: 0, resetAt: now + 60000 };
  }
  return entry;
}

/**
 * Get client identifier from request
 * Uses IP address + optional user ID for more accurate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Get IP from headers (works behind proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

  // Optionally include user ID for authenticated requests
  // This would require parsing the session, which we skip for performance
  return ip;
}

/**
 * Check rate limit for a request
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = rateLimitConfigs.default
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}> {
  const clientId = getClientIdentifier(request);
  const key = `${config.keyPrefix}${clientId}`;
  const now = Date.now();
  const windowStart = now;
  const resetAt = windowStart + config.windowMs;

  const redisClient = getRedis();

  if (redisClient && redisClient.status === 'ready') {
    try {
      // Use Redis for distributed rate limiting
      const current = await redisClient.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await redisClient.pexpire(key, config.windowMs);
      }

      const ttl = await redisClient.pttl(key);
      const remaining = Math.max(0, config.maxRequests - current);
      const allowed = current <= config.maxRequests;

      return {
        allowed,
        remaining,
        resetAt: now + ttl,
        retryAfter: allowed ? undefined : Math.ceil(ttl / 1000),
      };
    } catch (err) {
      console.error('[RateLimit] Redis operation failed:', err);
      // Fall back to memory store
    }
  }

  // In-memory fallback
  const entry = getMemoryKey(key);
  entry.count++;

  if (entry.count === 1) {
    entry.resetAt = resetAt;
  }

  memoryStore.set(key, entry);

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const allowed = entry.count <= config.maxRequests;

  // Clean up expired entries periodically
  if (memoryStore.size > 1000) {
    for (const [k, v] of memoryStore) {
      if (v.resetAt < now) {
        memoryStore.delete(k);
      }
    }
  }

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Rate limit middleware wrapper
 * Apply to API routes for automatic rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig = rateLimitConfigs.default
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const result = await checkRateLimit(request, config);

    // Add rate limit headers to all responses
    const headers = {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toString(),
    };

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please slow down.',
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': result.retryAfter?.toString() || '60',
          },
        }
      );
    }

    const response = await handler(request);

    // Add rate limit headers to response
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    return response;
  };
}

/**
 * Get rate limit stats for monitoring
 */
export async function getRateLimitStats(): Promise<{
  activeKeys: number;
  redisConnected: boolean;
}> {
  const redisClient = getRedis();
  let activeKeys = memoryStore.size;

  if (redisClient && redisClient.status === 'ready') {
    try {
      const keys = await redisClient.keys('rl:*');
      activeKeys = keys.length;
    } catch {
      // Ignore errors
    }
  }

  return {
    activeKeys,
    redisConnected: redisClient?.status === 'ready',
  };
}
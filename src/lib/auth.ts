import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.API_KEY;

/**
 * Validate API key from request headers.
 * If API_KEY env var is not set, authentication is disabled (dev mode).
 */
export function authenticateRequest(request: NextRequest): NextResponse | null {
  if (!API_KEY) {
    // Auth disabled in dev mode when API_KEY is not set
    return null;
  }

  const authHeader = request.headers.get('x-api-key');
  if (!authHeader || authHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized: invalid or missing API key' }, { status: 401 });
  }

  return null; // Auth passed
}

/**
 * Validate that a URL is not pointing to internal/private networks (SSRF protection).
 */
export function validateExternalUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Must be HTTPS in production
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: 'URL must use http or https protocol' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
      return { valid: false, error: 'URL must not point to localhost' };
    }

    // Block private IP ranges
    const privatePatterns = [
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,        // 10.0.0.0/8
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
      /^192\.168\.\d{1,3}\.\d{1,3}$/,             // 192.168.0.0/16
      /^169\.254\.\d{1,3}\.\d{1,3}$/,             // 169.254.0.0/16 (link-local)
      /^fc00:/i,                                    // IPv6 unique local
      /^fe80:/i,                                    // IPv6 link-local
    ];

    for (const pattern of privatePatterns) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'URL must not point to private/internal networks' };
      }
    }

    // Block metadata endpoints (cloud provider)
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return { valid: false, error: 'URL must not point to cloud metadata endpoints' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Simple in-memory rate limiter.
 * Tracks requests per IP within a sliding window.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  request: NextRequest,
  maxRequests: number = 30,
  windowMs: number = 60_000
): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const now = Date.now();
  const key = ip;

  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  return null;
}

// Periodically clean up expired rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);

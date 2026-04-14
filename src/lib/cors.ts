import { NextRequest, NextResponse } from 'next/server';

// CORS Configuration
interface CorsConfig {
  origins: string[] | '*'; // Allowed origins (string array or wildcard)
  methods: string[]; // Allowed methods
  headers: string[]; // Allowed headers
  credentials: boolean; // Allow credentials
  maxAge?: number; // Preflight cache duration
}

// Default CORS configuration
export const defaultCorsConfig: CorsConfig = {
  origins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://agentarena.example.com',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  headers: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'Accept',
    'Origin',
    'Cache-Control',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// API-specific CORS configurations
export const apiCorsConfigs: Record<string, CorsConfig> = {
  // Public API - more open
  public: {
    ...defaultCorsConfig,
    origins: '*', // Allow all origins for public API
  },
  // Auth API - stricter
  auth: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    headers: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 300, // 5 minutes
  },
  // Agent API - for external agent SDKs
  agent: {
    origins: '*', // Agents can connect from anywhere
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    headers: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Agent-ID',
      'X-Game-Token',
    ],
    credentials: false, // Agents use API keys, not cookies
    maxAge: 3600,
  },
};

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string, config: CorsConfig): boolean {
  if (config.origins === '*') return true;
  if (!origin) return false; // No origin header

  return config.origins.some((allowed) => {
    // Support wildcard subdomains
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return allowed === origin;
  });
}

/**
 * Create CORS headers for response
 */
function createCorsHeaders(origin: string, config: CorsConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  // Set origin (or '*' if wildcard)
  headers['Access-Control-Allow-Origin'] = config.origins === '*' ? '*' : origin;

  // Set credentials
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Set exposed headers
  headers['Access-Control-Expose-Headers'] = config.headers.join(', ');

  return headers;
}

/**
 * CORS middleware for API routes
 */
export function withCors(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: CorsConfig = defaultCorsConfig
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const origin = request.headers.get('origin') || '';

    // Handle preflight (OPTIONS) request
    if (request.method === 'OPTIONS') {
      if (!isOriginAllowed(origin, config)) {
        return new NextResponse(null, { status: 403 });
      }

      const headers: Record<string, string> = {
        ...createCorsHeaders(origin, config),
        'Access-Control-Allow-Methods': config.methods.join(', '),
        'Access-Control-Allow-Headers': config.headers.join(', '),
      };

      if (config.maxAge) {
        headers['Access-Control-Max-Age'] = config.maxAge.toString();
      }

      return new NextResponse(null, {
        status: 204,
        headers,
      });
    }

    // Check origin for actual requests
    if (origin && !isOriginAllowed(origin, config)) {
      return NextResponse.json(
        { error: 'Origin not allowed' },
        { status: 403 }
      );
    }

    // Process request
    const response = await handler(request);

    // Add CORS headers to response
    const corsHeaders = createCorsHeaders(origin, config);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  };
}

/**
 * Combined middleware: CORS + Rate Limit
 */
export function withMiddleware(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    cors?: CorsConfig;
    rateLimit?: boolean;
  } = {}
): (request: NextRequest) => Promise<NextResponse> {
  const { cors = defaultCorsConfig, rateLimit = false } = options;

  // Apply middlewares in order
  let wrappedHandler = handler;

  // Apply CORS first
  wrappedHandler = withCors(wrappedHandler, cors);

  // Note: Rate limiting would be applied here if needed
  // For simplicity, we keep them separate

  return wrappedHandler;
}

/**
 * Get CORS configuration for monitoring/debugging
 */
export function getCorsConfig(): {
  allowedOrigins: string[];
  allowedMethods: string[];
  credentials: boolean;
} {
  return {
    allowedOrigins: defaultCorsConfig.origins === '*'
      ? ['* (all origins)']
      : defaultCorsConfig.origins,
    allowedMethods: defaultCorsConfig.methods,
    credentials: defaultCorsConfig.credentials,
  };
}
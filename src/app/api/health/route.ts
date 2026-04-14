import { NextResponse } from 'next/server';
import { dbHealthCheck } from '@/lib/db-adapter';
import { ChatService, isLocalMode } from '@/lib/ChatService';
import db from '@/lib/db';
import redis from '@/lib/redis';

export async function GET() {
  const startTime = Date.now();

  // Check database health
  const dbHealth = await dbHealthCheck();

  // Initialize chat service and check status
  // This ensures the chat service is initialized before checking status
  try {
    await ChatService.getMessageCount(0); // Force initialization with a harmless call
  } catch {
    // Ignore errors - just want to trigger initialization
  }
  const isLocal = isLocalMode();
  const chatStatus = isLocal ? 'local' : (redis.status === 'ready' ? 'connected' : 'disconnected');

  // Get detailed metrics
  let metrics = {
    database: {
      tables: 0,
      users: 0,
      agents: 0,
      activeTables: 0,
    },
    redis: {
      memory: 'unknown',
      connectedClients: 0,
    },
  };

  try {
    // Database metrics
    metrics.database.tables = (
      db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get() as any
    )?.count || 0;
    metrics.database.users = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
    metrics.database.agents = (db.prepare('SELECT COUNT(*) as count FROM agents').get() as any)?.count || 0;
    metrics.database.activeTables = (
      db.prepare("SELECT COUNT(*) as count FROM tables WHERE status IN ('active', 'waiting')").get() as any
    )?.count || 0;

    // Redis metrics
    if (redis.status === 'ready') {
      const infoMemory = await redis.info('memory');
      const infoClients = await redis.info('clients');

      const memoryMatch = infoMemory.match(/used_memory_human:(\S+)/);
      metrics.redis.memory = memoryMatch ? memoryMatch[1] : 'unknown';

      const clientsMatch = infoClients.match(/connected_clients:(\d+)/);
      metrics.redis.connectedClients = clientsMatch ? parseInt(clientsMatch[1], 10) : 0;
    }
  } catch (err) {
    console.error('[Health API] Metrics error:', err);
  }

  const responseTime = Date.now() - startTime;

  const health = {
    status: dbHealth.ok ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    uptime: process.uptime(),
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: {
        ok: dbHealth.ok,
        driver: dbHealth.driver,
        error: dbHealth.error,
        metrics: metrics.database,
      },
      chat: {
        ok: chatStatus !== 'disconnected',
        status: chatStatus,
        mode: isLocal ? 'Local (in-memory fallback)' : 'Redis',
      },
      redis: {
        ok: redis.status === 'ready',
        status: redis.status,
        metrics: metrics.redis,
      },
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      },
    },
  };

  const status = dbHealth.ok ? 200 : 500;
  return NextResponse.json(health, { status });
}
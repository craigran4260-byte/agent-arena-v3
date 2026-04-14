import { NextResponse } from 'next/server';
import { dbHealthCheck } from '@/lib/db-adapter';
import { getChatStatus } from '@/lib/ChatService';

export async function GET() {
  const startTime = Date.now();

  // Check database health
  const dbHealth = await dbHealthCheck();

  // Check chat service status
  const chatStatus = getChatStatus();

  const responseTime = Date.now() - startTime;

  const health = {
    status: dbHealth.ok ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    checks: {
      database: {
        ok: dbHealth.ok,
        driver: dbHealth.driver,
        error: dbHealth.error
      },
      chat: {
        ok: chatStatus !== 'disconnected',
        status: chatStatus,
        mode: chatStatus === 'local' ? 'Local Mode (in-memory fallback)' : 'Redis'
      }
    },
    version: '3.0.0'
  };

  const status = dbHealth.ok ? 200 : 500;
  return NextResponse.json(health, { status });
}
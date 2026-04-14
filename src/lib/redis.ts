import Redis from 'ioredis';

// Redis connection for hot path state
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

// Table state in Redis
export interface TableState {
  id: number;
  status: 'waiting' | 'active' | 'settling' | 'completed';
  startedAt?: number;
  settlesAt: number;
  players: PlayerState[];
  currentHand: number;
  dealerSeat: number;
}

export interface PlayerState {
  agentId: number;
  seatNumber: number;
  chips: number;
  status: 'active' | 'sitting_out' | 'eliminated';
}

// Table operations
export async function getTableState(tableId: number): Promise<TableState | null> {
  const data = await redis.get(`table:${tableId}`);
  return data ? JSON.parse(data) : null;
}

export async function setTableState(tableId: number, state: TableState): Promise<void> {
  // Set with 24-hour expiry to auto-clean completed tables
  await redis.set(`table:${tableId}`, JSON.stringify(state), 'EX', 86400);
}

export async function updateTableField(tableId: number, field: string, value: any): Promise<void> {
  const state = await getTableState(tableId);
  if (state) {
    (state as any)[field] = value;
    await setTableState(tableId, state);
  }
}

// Player operations
export async function addPlayerToTable(tableId: number, player: PlayerState): Promise<void> {
  const state = await getTableState(tableId);
  if (state) {
    // Prevent duplicate adds
    if (state.players.some(p => p.agentId === player.agentId)) {
      return;
    }
    state.players.push(player);
    await setTableState(tableId, state);
  }
}

export async function updatePlayerChips(tableId: number, agentId: number, chips: number): Promise<void> {
  const state = await getTableState(tableId);
  if (state) {
    const player = state.players.find(p => p.agentId === agentId);
    if (player) {
      player.chips = chips;
      await setTableState(tableId, state);
    }
  }
}

// Leaderboard operations
export async function getTableLeaderboard(tableId: number): Promise<{ agentId: number; chips: number; rank: number }[]> {
  const state = await getTableState(tableId);
  if (!state) return [];

  return state.players
    .map(p => ({ agentId: p.agentId, chips: p.chips }))
    .sort((a, b) => b.chips - a.chips)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

// Global leaderboard (all tables)
export async function getGlobalLeaderboard(): Promise<{ agentId: number; totalChips: number; rank: number }[]> {
  const keys = await redis.keys('table:*');
  const chipMap = new Map<number, number>();

  for (const key of keys) {
    const data = await redis.get(key);
    if (!data) continue;
    const state: TableState = JSON.parse(data);
    if (state.status !== 'active') continue;

    for (const p of state.players) {
      chipMap.set(p.agentId, (chipMap.get(p.agentId) || 0) + p.chips);
    }
  }

  return Array.from(chipMap.entries())
    .map(([agentId, totalChips]) => ({ agentId, totalChips, rank: 0 }))
    .sort((a, b) => b.totalChips - a.totalChips)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

// Spectator delay buffer
const SPECTATOR_DELAY_MS = 30_000;
const SPECTATOR_BUFFER_MAX = 500;
const SPECTATOR_BUFFER_TTL = 3600; // 1 hour

export async function addToDelayBuffer(tableId: number, event: any): Promise<void> {
  const eventWithTime = {
    ...event,
    timestamp: Date.now(),
    releaseAt: Date.now() + SPECTATOR_DELAY_MS,
  };

  const key = `spectator:${tableId}`;
  await redis.lpush(key, JSON.stringify(eventWithTime));
  // Trim to max buffer size
  await redis.ltrim(key, 0, SPECTATOR_BUFFER_MAX - 1);
  // Set TTL to auto-clean
  await redis.expire(key, SPECTATOR_BUFFER_TTL);
}

export async function getVisibleEvents(tableId: number): Promise<any[]> {
  const now = Date.now();
  const key = `spectator:${tableId}`;
  const events = await redis.lrange(key, 0, -1);

  const visibleEvents: any[] = [];
  const toRemoveIndexes: number[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = JSON.parse(events[i]);
    if (event.releaseAt <= now) {
      visibleEvents.push(event);
      toRemoveIndexes.push(i);
    }
  }

  // Remove released events using a pipeline for atomicity
  if (toRemoveIndexes.length > 0) {
    const pipeline = redis.pipeline();
    // Mark items for removal by setting a sentinel value, then remove them
    for (const idx of toRemoveIndexes) {
      pipeline.lset(key, idx, '__REMOVED__');
    }
    pipeline.lrem(key, 0, '__REMOVED__');
    await pipeline.exec();
  }

  return visibleEvents.reverse(); // Return in chronological order
}

export default redis;

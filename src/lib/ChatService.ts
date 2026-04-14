import Redis from 'ioredis';

export interface ChatMessage {
  id: string;
  userId: number;
  userName: string;
  tableId: number;
  content: string;
  timestamp: number;
}

// In-memory fallback for when Redis is unavailable (Local Mode)
class MemoryChatStore {
  private messages: Map<number, ChatMessage[]> = new Map();
  private banned: Map<number, Set<number>> = new Map();
  private subscribers: Map<number, Set<(msg: ChatMessage) => void>> = new Map();
  private maxMessages = 1000;

  async addMessage(tableId: number, message: ChatMessage): Promise<void> {
    if (!this.messages.has(tableId)) {
      this.messages.set(tableId, []);
    }
    const msgs = this.messages.get(tableId)!;
    msgs.push(message);
    // Keep only last 100 messages per table
    if (msgs.length > this.maxMessages) {
      msgs.shift();
    }
    // Notify subscribers
    const subs = this.subscribers.get(tableId);
    if (subs) {
      subs.forEach(cb => cb(message));
    }
  }

  getMessages(tableId: number, limit: number, offset: number): ChatMessage[] {
    const msgs = this.messages.get(tableId) || [];
    const start = Math.max(0, msgs.length - offset - limit);
    const end = msgs.length - offset;
    return msgs.slice(start, end);
  }

  getMessageCount(tableId: number): number {
    return this.messages.get(tableId)?.length || 0;
  }

  clearMessages(tableId: number): void {
    this.messages.delete(tableId);
  }

  banUser(tableId: number, userId: number): void {
    if (!this.banned.has(tableId)) {
      this.banned.set(tableId, new Set());
    }
    this.banned.get(tableId)!.add(userId);
  }

  isBanned(tableId: number, userId: number): boolean {
    return this.banned.get(tableId)?.has(userId) || false;
  }

  unbanUser(tableId: number, userId: number): void {
    this.banned.get(tableId)?.delete(userId);
  }

  subscribe(tableId: number, callback: (msg: ChatMessage) => void): () => void {
    if (!this.subscribers.has(tableId)) {
      this.subscribers.set(tableId, new Set());
    }
    this.subscribers.get(tableId)!.add(callback);
    return () => {
      this.subscribers.get(tableId)?.delete(callback);
    };
  }
}

// Singleton instances
let redisClient: Redis | null = null;
let pubsubClient: Redis | null = null;
let memoryStore: MemoryChatStore | null = null;
let redisAvailable = false;
let connectionAttempted = false;

/**
 * Check if we're in Local Mode (Redis unavailable)
 */
export function isLocalMode(): boolean {
  return !redisAvailable;
}

/**
 * Get status message for UI
 */
export function getChatStatus(): 'connected' | 'local' | 'disconnected' {
  if (redisAvailable) return 'connected';
  if (memoryStore) return 'local';
  return 'disconnected';
}

function getMemoryStore(): MemoryChatStore {
  if (!memoryStore) {
    memoryStore = new MemoryChatStore();
    console.log('[Chat] Using in-memory fallback (Local Mode)');
  }
  return memoryStore;
}

async function tryConnectRedis(): Promise<boolean> {
  if (connectionAttempted) return redisAvailable;
  connectionAttempted = true;

  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.log('[Chat] No REDIS_URL configured, using Local Mode');
      return false;
    }

    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('[Chat] Redis connection failed after 3 retries, switching to Local Mode');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 2000);
      }
    });

    await redisClient.connect();
    redisAvailable = true;
    console.log('[Chat] Connected to Redis');
    return true;
  } catch (error) {
    console.warn('[Chat] Redis connection failed, using Local Mode:', error instanceof Error ? error.message : 'Unknown error');
    redisClient = null;
    redisAvailable = false;
    return false;
  }
}

function getRedisClient(): Redis | null {
  return redisAvailable ? redisClient : null;
}

async function getPubsubClient(): Promise<Redis | null> {
  if (!redisAvailable) return null;

  if (!pubsubClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return null;

    pubsubClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3
    });

    try {
      await pubsubClient.connect();
    } catch {
      pubsubClient = null;
      return null;
    }
  }

  return pubsubClient;
}

// Initialize on first use
let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    initialized = true;
    await tryConnectRedis();
  }
}

export const ChatService = {
  /**
   * Send a chat message to a table
   */
  async sendMessage(
    tableId: number,
    userId: number,
    userName: string,
    content: string
  ): Promise<ChatMessage> {
    await ensureInitialized();

    const id = `msg:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    const message: ChatMessage = {
      id,
      userId,
      userName,
      tableId,
      content,
      timestamp
    };

    const redis = getRedisClient();

    if (redis) {
      // Redis mode
      const messageKey = `table:${tableId}:messages`;
      await redis.zadd(messageKey, timestamp, JSON.stringify(message));
      await redis.expire(messageKey, 86400);

      const channelName = `table:${tableId}:chat`;
      await redis.publish(channelName, JSON.stringify(message));
    } else {
      // Local mode fallback
      getMemoryStore().addMessage(tableId, message);
    }

    return message;
  },

  /**
   * Get chat history for a table
   */
  async getHistory(tableId: number, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    await ensureInitialized();

    const redis = getRedisClient();

    if (redis) {
      const messageKey = `table:${tableId}:messages`;
      const messages = await redis.zrevrange(messageKey, offset, offset + limit - 1);

      return messages
        .map(msg => {
          try {
            return JSON.parse(msg) as ChatMessage;
          } catch {
            return null;
          }
        })
        .filter((msg): msg is ChatMessage => msg !== null)
        .reverse();
    } else {
      // Local mode
      return getMemoryStore().getMessages(tableId, limit, offset);
    }
  },

  /**
   * Clear chat history for a table
   */
  async clearHistory(tableId: number): Promise<void> {
    await ensureInitialized();

    const redis = getRedisClient();

    if (redis) {
      const messageKey = `table:${tableId}:messages`;
      await redis.del(messageKey);
    } else {
      getMemoryStore().clearMessages(tableId);
    }
  },

  /**
   * Subscribe to table chat messages
   */
  async subscribe(tableId: number, onMessage: (message: ChatMessage) => void): Promise<() => Promise<void>> {
    await ensureInitialized();

    const redis = await getPubsubClient();

    if (redis) {
      // Redis pub/sub mode
      const channelName = `table:${tableId}:chat`;

      redis.on('message', (channel, data) => {
        if (channel === channelName) {
          try {
            const message = JSON.parse(data) as ChatMessage;
            onMessage(message);
          } catch (error) {
            console.error('[Chat] Failed to parse message:', error);
          }
        }
      });

      await redis.subscribe(channelName);

      return async () => {
        await redis.unsubscribe(channelName);
      };
    } else {
      // Local mode - use memory store subscribers
      const unsubscribe = getMemoryStore().subscribe(tableId, onMessage);
      return async () => {
        unsubscribe();
      };
    }
  },

  /**
   * Get active message count for a table
   */
  async getMessageCount(tableId: number): Promise<number> {
    await ensureInitialized();

    const redis = getRedisClient();

    if (redis) {
      const messageKey = `table:${tableId}:messages`;
      const count = await redis.zcard(messageKey);
      return count || 0;
    } else {
      return getMemoryStore().getMessageCount(tableId);
    }
  },

  /**
   * Ban user from table chat (add to blocklist)
   */
  async banUser(tableId: number, userId: number): Promise<void> {
    await ensureInitialized();

    const redis = getRedisClient();

    if (redis) {
      const banKey = `table:${tableId}:banned`;
      await redis.sadd(banKey, userId);
      await redis.expire(banKey, 86400);
    } else {
      getMemoryStore().banUser(tableId, userId);
    }
  },

  /**
   * Check if user is banned
   */
  async isBanned(tableId: number, userId: number): Promise<boolean> {
    await ensureInitialized();

    const redis = getRedisClient();

    if (redis) {
      const banKey = `table:${tableId}:banned`;
      const isMember = await redis.sismember(banKey, userId);
      return isMember === 1;
    } else {
      return getMemoryStore().isBanned(tableId, userId);
    }
  },

  /**
   * Unban user
   */
  async unbanUser(tableId: number, userId: number): Promise<void> {
    await ensureInitialized();

    const redis = getRedisClient();

    if (redis) {
      const banKey = `table:${tableId}:banned`;
      await redis.srem(banKey, userId);
    } else {
      getMemoryStore().unbanUser(tableId, userId);
    }
  }
};
import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';
import http from 'http';
import { getTableState, TableState, PlayerState } from './redis';

// WebSocket message types
export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'table_update' | 'player_action' | 'hand_complete' | 'error';
  tableId?: number;
  data?: any;
  timestamp?: number;
}

interface ClientConnection {
  ws: WebSocket;
  subscribedTables: Set<number>;
  userId?: string;
}

// Redis subscriber for pub/sub
const redisSubscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const redisPublisher = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Active connections
const clients: Map<WebSocket, ClientConnection> = new Map();

let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server from an external WebSocketServer instance
 * Used when the server.ts creates the WSS with noServer mode
 */
export function initWebSocketServerFromWSS(wssInstance: WebSocketServer): void {
  wss = wssInstance;

  wss.on('connection', (ws, req) => {
    console.log('[WS] New client connected');

    // Initialize client connection
    const client: ClientConnection = {
      ws,
      subscribedTables: new Set(),
    };
    clients.set(ws, client);

    // Send welcome message
    sendMessage(ws, {
      type: 'table_update',
      data: { message: 'Connected to Agent Arena WebSocket' },
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (err) {
        console.error('[WS] Invalid message format:', err);
        sendMessage(ws, { type: 'error', data: { error: 'Invalid message format' } });
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      cleanupClient(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err);
      cleanupClient(ws);
    });
  });

  // Subscribe to Redis channels for table updates
  redisSubscriber.subscribe('table_updates', 'game_events');
  redisSubscriber.on('message', (channel, message) => {
    if (channel === 'table_updates' || channel === 'game_events') {
      try {
        const data = JSON.parse(message);
        broadcastTableUpdate(data.tableId, data);
      } catch (err) {
        console.error('[WS] Failed to parse Redis message:', err);
      }
    }
  });

  console.log('[WS] WebSocket server initialized on /ws');
}

/**
 * Initialize WebSocket server on a given HTTP server
 * @deprecated Use initWebSocketServerFromWSS with noServer mode in server.ts
 */
export function initWebSocketServer(server: http.Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('[WS] New client connected');

    // Initialize client connection
    const client: ClientConnection = {
      ws,
      subscribedTables: new Set(),
    };
    clients.set(ws, client);

    // Send welcome message
    sendMessage(ws, {
      type: 'table_update',
      data: { message: 'Connected to Agent Arena WebSocket' },
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (err) {
        console.error('[WS] Invalid message format:', err);
        sendMessage(ws, { type: 'error', data: { error: 'Invalid message format' } });
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      cleanupClient(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err);
      cleanupClient(ws);
    });
  });

  // Subscribe to Redis channels for table updates
  redisSubscriber.subscribe('table_updates', 'game_events');
  redisSubscriber.on('message', (channel, message) => {
    if (channel === 'table_updates' || channel === 'game_events') {
      try {
        const data = JSON.parse(message);
        broadcastTableUpdate(data.tableId, data);
      } catch (err) {
        console.error('[WS] Failed to parse Redis message:', err);
      }
    }
  });

  console.log('[WS] WebSocket server initialized on /ws');
  return wss;
}

/**
 * Handle incoming WebSocket message
 */
function handleMessage(ws: WebSocket, message: WSMessage): void {
  const client = clients.get(ws);
  if (!client) return;

  switch (message.type) {
    case 'subscribe':
      if (message.tableId) {
        subscribeToTable(ws, message.tableId);
      }
      break;

    case 'unsubscribe':
      if (message.tableId) {
        unsubscribeFromTable(ws, message.tableId);
      }
      break;

    default:
      sendMessage(ws, { type: 'error', data: { error: 'Unknown message type' } });
  }
}

/**
 * Subscribe client to table updates
 */
async function subscribeToTable(ws: WebSocket, tableId: number): Promise<void> {
  const client = clients.get(ws);
  if (!client) return;

  client.subscribedTables.add(tableId);

  // Send current table state immediately
  const state = await getTableState(tableId);
  if (state) {
    sendMessage(ws, {
      type: 'table_update',
      tableId,
      data: { state },
      timestamp: Date.now(),
    });
  } else {
    sendMessage(ws, {
      type: 'error',
      tableId,
      data: { error: 'Table not found' },
    });
  }

  console.log(`[WS] Client subscribed to table ${tableId}`);
}

/**
 * Unsubscribe client from table updates
 */
function unsubscribeFromTable(ws: WebSocket, tableId: number): void {
  const client = clients.get(ws);
  if (!client) return;

  client.subscribedTables.delete(tableId);
  console.log(`[WS] Client unsubscribed from table ${tableId}`);
}

/**
 * Send message to a specific WebSocket client
 */
function sendMessage(ws: WebSocket, message: WSMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast update to all clients subscribed to a table
 */
function broadcastTableUpdate(tableId: number, data: any): void {
  const message: WSMessage = {
    type: 'table_update',
    tableId,
    data,
    timestamp: Date.now(),
  };

  for (const [ws, client] of clients) {
    if (client.subscribedTables.has(tableId)) {
      sendMessage(ws, message);
    }
  }
}

/**
 * Cleanup client connection
 */
function cleanupClient(ws: WebSocket): void {
  const client = clients.get(ws);
  if (client) {
    clients.delete(ws);
  }
}

/**
 * Publish table update to Redis (for other processes to receive)
 */
export async function publishTableUpdate(tableId: number, updateData: any): Promise<void> {
  const message = JSON.stringify({
    tableId,
    ...updateData,
    timestamp: Date.now(),
  });
  await redisPublisher.publish('table_updates', message);
}

/**
 * Publish game event (player action, hand complete, etc.)
 */
export async function publishGameEvent(tableId: number, eventType: string, eventData: any): Promise<void> {
  const message = JSON.stringify({
    tableId,
    eventType,
    data: eventData,
    timestamp: Date.now(),
  });
  await redisPublisher.publish('game_events', message);
}

/**
 * Get WebSocket server stats
 */
export function getWSStats(): {
  totalConnections: number;
  activeSubscriptions: number;
  tablesWatched: number[];
} {
  const tablesWatched = new Set<number>();
  let activeSubscriptions = 0;

  for (const [, client] of clients) {
    activeSubscriptions += client.subscribedTables.size;
    for (const tableId of client.subscribedTables) {
      tablesWatched.add(tableId);
    }
  }

  return {
    totalConnections: clients.size,
    activeSubscriptions,
    tablesWatched: Array.from(tablesWatched),
  };
}

/**
 * Close WebSocket server gracefully
 */
export async function closeWebSocketServer(): Promise<void> {
  if (wss) {
    // Close all client connections
    for (const [ws] of clients) {
      ws.close(1000, 'Server shutting down');
    }
    clients.clear();

    // Close Redis connections
    await redisSubscriber.quit();
    await redisPublisher.quit();

    // Close WebSocket server
    wss.close();
    wss = null;

    console.log('[WS] WebSocket server closed');
  }
}

export default {
  initWebSocketServer,
  publishTableUpdate,
  publishGameEvent,
  getWSStats,
  closeWebSocketServer,
};
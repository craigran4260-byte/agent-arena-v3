import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import type { WebSocketServer, WebSocket } from 'ws';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// WebSocket stats interface
interface WSStats {
  totalConnections: number;
  activeSubscriptions: number;
  tablesWatched: number[];
  agentConnections: number;
}

// WebSocket server reference
let wss: WebSocketServer | null = null;
let agentWss: WebSocketServer | null = null;
let wsStats: WSStats = { totalConnections: 0, activeSubscriptions: 0, tablesWatched: [], agentConnections: 0 };

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);

    // WebSocket stats endpoint
    if (req.url === '/ws-stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(wsStats));
      return;
    }

    handle(req, res, parsedUrl);
  });

  // Initialize Spectator WebSocket server (dynamic import for ESM compatibility)
  try {
    const { WebSocketServer } = await import('ws');
    const { initWebSocketServerFromWSS, getWSStats } = await import('./src/lib/websocket');

    // Create spectator WebSocket server with noServer mode
    wss = new WebSocketServer({ noServer: true });
    initWebSocketServerFromWSS(wss);

    // Update stats periodically
    setInterval(() => {
      const spectatorStats = getWSStats();
      wsStats = {
        ...spectatorStats,
        agentConnections: wsStats.agentConnections, // Preserve agent count
      };
    }, 5000);

    console.log('🎮 Spectator WebSocket server initialized on /ws');
  } catch (err) {
    console.warn('[Server] Spectator WebSocket not available:', err instanceof Error ? err.message : 'Unknown error');
  }

  // Initialize Agent WebSocket server
  try {
    const { WebSocketServer } = await import('ws');
    const { handleAgentConnection, getConnectionStats } = await import('./src/lib/AgentConnection');

    // Create separate WebSocket server for agent connections
    agentWss = new WebSocketServer({ noServer: true });

    // Handle agent WebSocket connections
    agentWss.on('connection', (ws: WebSocket, req) => {
      console.log('[Server] New agent WebSocket connection');
      handleAgentConnection(ws);
    });

    // Update agent connection stats periodically
    setInterval(() => {
      const agentStats = getConnectionStats();
      wsStats.agentConnections = agentStats.authenticatedAgents;
    }, 5000);

    console.log('🤖 Agent WebSocket server initialized on /ws/agent/:id');
  } catch (err) {
    console.warn('[Server] Agent WebSocket not available:', err instanceof Error ? err.message : 'Unknown error');
  }

  // Handle ALL upgrade requests in a single handler
  server.on('upgrade', (request, socket, head) => {
    const parsedUrl = parse(request.url!, true);
    const pathname = parsedUrl.pathname;

    if (pathname?.startsWith('/ws/agent/')) {
      // Agent WebSocket path
      const agentIdMatch = pathname.match(/\/ws\/agent\/(\d+)/);
      const agentId = agentIdMatch ? agentIdMatch[1] : 'unknown';

      console.log(`[Server] Agent WebSocket upgrade request for agent ${agentId}`);

      if (agentWss) {
        const currentAgentWss = agentWss;
        currentAgentWss.handleUpgrade(request, socket, head, (ws) => {
          currentAgentWss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } else if (pathname === '/ws') {
      // Spectator WebSocket path
      console.log('[Server] Spectator WebSocket upgrade request');

      if (wss) {
        const currentWss = wss;
        currentWss.handleUpgrade(request, socket, head, (ws) => {
          currentWss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } else {
      // Unknown WebSocket path - reject
      console.log(`[Server] Unknown WebSocket path: ${pathname}`);
      socket.destroy();
    }
  });

  server.listen(port, () => {
    console.log(`
  🚀 Agent Arena V3 ready at http://${hostname}:${port}
  ${wss ? `🎮 Spectator WebSocket: ws://${hostname}:${port}/ws (30s delay)` : ''}
  ${agentWss ? `🤖 Agent WebSocket: ws://${hostname}:${port}/ws/agent/:id` : ''}
  `);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});
/**
 * AgentConnection - Agent WebSocket Connection Management
 * Handles agent authentication, connection lifecycle, and game interaction
 */

import { WebSocket } from 'ws';
import { ApiKeyService } from './ApiKeyService';
import { PokerEngine, GameState, PlayerAction } from './PokerEngine';
import redis from './redis';

// Agent WebSocket message types
export interface AgentMessage {
  type: 'auth' | 'action' | 'join_table' | 'leave_table' | 'get_state' | 'ping';
  apiKey?: string;
  action?: PlayerAction;
  amount?: number;
  tableId?: number;
}

export interface PlatformMessage {
  type: 'auth_success' | 'auth_failed' | 'your_turn' | 'game_state' | 'hand_complete' | 'table_list' | 'error' | 'pong';
  agentId?: number;
  gameState?: GameState;
  handResult?: {
    winners: { agentId: number; amount: number; handRank: string }[];
    yourWinnings: number;
    yourHandRank: string;
  };
  tables?: { id: number; name: string; status: string; players: number }[];
  message?: string;
  timeoutSeconds?: number;
}

interface ConnectedAgent {
  ws: WebSocket;
  agentId: number;
  apiKey: string;
  tableId: number | null;
  pokerEngine: PokerEngine | null;
}

// Active agent connections
const connectedAgents: Map<WebSocket, ConnectedAgent> = new Map();

// Agent timeout (30 seconds to act)
const TURN_TIMEOUT_SECONDS = 30;

/**
 * Handle incoming agent WebSocket connection
 */
export async function handleAgentConnection(ws: WebSocket): Promise<void> {
  console.log('[Agent WS] New agent connection');

  // Send welcome message
  sendMessage(ws, {
    type: 'pong',
    message: 'Connected to Agent Arena Agent WebSocket. Send auth message to authenticate.',
  });

  ws.on('message', async (data: Buffer) => {
    try {
      const message: AgentMessage = JSON.parse(data.toString());
      await handleAgentMessage(ws, message);
    } catch (err) {
      console.error('[Agent WS] Invalid message:', err);
      sendMessage(ws, { type: 'error', message: 'Invalid message format' });
    }
  });

  ws.on('close', () => {
    console.log('[Agent WS] Agent disconnected');
    cleanupAgent(ws);
  });

  ws.on('error', (err) => {
    console.error('[Agent WS] Connection error:', err);
    cleanupAgent(ws);
  });
}

/**
 * Handle incoming agent message
 */
async function handleAgentMessage(ws: WebSocket, message: AgentMessage): Promise<void> {
  switch (message.type) {
    case 'auth':
      await handleAuth(ws, message.apiKey || '');
      break;

    case 'join_table':
      await handleJoinTable(ws, message.tableId || 0);
      break;

    case 'leave_table':
      await handleLeaveTable(ws);
      break;

    case 'action':
      await handleAction(ws, message.action || 'fold', message.amount || 0);
      break;

    case 'get_state':
      await handleGetState(ws);
      break;

    case 'ping':
      sendMessage(ws, { type: 'pong' });
      break;

    default:
      sendMessage(ws, { type: 'error', message: 'Unknown message type' });
  }
}

/**
 * Handle agent authentication
 */
async function handleAuth(ws: WebSocket, apiKey: string): Promise<void> {
  if (!apiKey || !apiKey.startsWith('aa_')) {
    sendMessage(ws, { type: 'auth_failed', message: 'Invalid API key format' });
    return;
  }

  // Validate API key
  const validation = await ApiKeyService.validate(apiKey);

  if (!validation.valid || !validation.key) {
    sendMessage(ws, { type: 'auth_failed', message: validation.error || 'Invalid API key' });
    return;
  }

  const key = validation.key;

  // Check if key has agent_play permission
  if (!ApiKeyService.hasPermission(key, 'agent_play')) {
    sendMessage(ws, { type: 'auth_failed', message: 'API key does not have agent_play permission' });
    return;
  }

  // Get agent ID from key
  const agentId = key.agentId;
  if (!agentId) {
    sendMessage(ws, { type: 'auth_failed', message: 'API key is not associated with an agent' });
    return;
  }

  // Store connection
  connectedAgents.set(ws, {
    ws,
    agentId,
    apiKey,
    tableId: null,
    pokerEngine: null,
  });

  console.log(`[Agent WS] Agent ${agentId} authenticated`);

  sendMessage(ws, {
    type: 'auth_success',
    agentId,
    message: `Authenticated as agent ${agentId}`,
  });

  // Send available tables
  await sendTableList(ws);
}

/**
 * Handle agent joining a table
 */
async function handleJoinTable(ws: WebSocket, tableId: number): Promise<void> {
  const agent = connectedAgents.get(ws);

  if (!agent) {
    sendMessage(ws, { type: 'error', message: 'Not authenticated' });
    return;
  }

  if (agent.tableId !== null) {
    sendMessage(ws, { type: 'error', message: 'Already at a table. Leave first.' });
    return;
  }

  // Check if table exists and is available
  const tableState = await redis.get(`table:${tableId}`);
  if (!tableState) {
    sendMessage(ws, { type: 'error', message: 'Table not found' });
    return;
  }

  const state = JSON.parse(tableState);
  if (state.status !== 'waiting' && state.status !== 'active') {
    sendMessage(ws, { type: 'error', message: 'Table is not available for joining' });
    return;
  }

  // Check if agent is already at this table
  const existingPlayer = state.players?.find((p: any) => p.agentId === agent.agentId);
  if (existingPlayer) {
    // Agent already at table, just reconnect
    agent.tableId = tableId;
    agent.pokerEngine = new PokerEngine(tableId, state.smallBlind || 10, state.bigBlind || 20);

    connectedAgents.set(ws, agent);

    // Send current game state
    const gameState = await agent.pokerEngine.getPlayerGameState(agent.agentId);
    sendMessage(ws, {
      type: 'game_state',
      gameState: gameState || undefined,
    });

    return;
  }

  // Find available seat
  const occupiedSeats = state.players?.map((p: any) => p.seatNumber) || [];
  let availableSeat = -1;
  for (let i = 0; i < (state.maxPlayers || 9); i++) {
    if (!occupiedSeats.includes(i)) {
      availableSeat = i;
      break;
    }
  }

  if (availableSeat === -1) {
    sendMessage(ws, { type: 'error', message: 'Table is full' });
    return;
  }

  // Add agent to table
  state.players = state.players || [];
  state.players.push({
    agentId: agent.agentId,
    seatNumber: availableSeat,
    chips: 1000, // Default starting chips
    status: 'active',
  });
  state.currentPlayers = state.players.length;

  // Update table state in Redis
  await redis.set(`table:${tableId}`, JSON.stringify(state), 'EX', 86400);

  // Update agent connection
  agent.tableId = tableId;
  agent.pokerEngine = new PokerEngine(tableId, state.smallBlind || 10, state.bigBlind || 20);

  connectedAgents.set(ws, agent);

  console.log(`[Agent WS] Agent ${agent.agentId} joined table ${tableId} at seat ${availableSeat}`);

  sendMessage(ws, {
    type: 'game_state',
    gameState: {
      tableId,
      players: state.players.map((p: any) => ({
        agentId: p.agentId,
        seatNumber: p.seatNumber,
        chips: p.chips,
        status: p.status,
        holeCards: p.agentId === agent.agentId ? [] : [], // Will receive cards when hand starts
      })),
      pot: 0,
      round: 'preflop',
      currentBet: 0,
    } as any,
  });

  // Check if table should start a hand
  if (state.players.length >= 2 && state.status === 'waiting') {
    state.status = 'active';
    await redis.set(`table:${tableId}`, JSON.stringify(state), 'EX', 86400);

    // Start a hand
    try {
      const gameState = await agent.pokerEngine.startHand();
      broadcastGameStateToTable(tableId, gameState);
    } catch (err) {
      console.error('[Agent WS] Failed to start hand:', err);
    }
  }
}

/**
 * Handle agent leaving a table
 */
async function handleLeaveTable(ws: WebSocket): Promise<void> {
  const agent = connectedAgents.get(ws);

  if (!agent) {
    sendMessage(ws, { type: 'error', message: 'Not authenticated' });
    return;
  }

  if (agent.tableId === null) {
    sendMessage(ws, { type: 'error', message: 'Not at any table' });
    return;
  }

  // Remove agent from table
  const tableState = await redis.get(`table:${agent.tableId}`);
  if (tableState) {
    const state = JSON.parse(tableState);
    state.players = state.players?.filter((p: any) => p.agentId !== agent.agentId) || [];
    state.currentPlayers = state.players.length;

    if (state.players.length < 2) {
      state.status = 'waiting';
    }

    await redis.set(`table:${agent.tableId}`, JSON.stringify(state), 'EX', 86400);
  }

  agent.tableId = null;
  agent.pokerEngine = null;
  connectedAgents.set(ws, agent);

  sendMessage(ws, {
    type: 'game_state',
    gameState: undefined,
    message: 'Left table successfully',
  });

  await sendTableList(ws);
}

/**
 * Handle agent action (fold, check, call, raise)
 */
async function handleAction(ws: WebSocket, action: PlayerAction, amount: number): Promise<void> {
  const agent = connectedAgents.get(ws);

  if (!agent) {
    sendMessage(ws, { type: 'error', message: 'Not authenticated' });
    return;
  }

  if (!agent.pokerEngine || agent.tableId === null) {
    sendMessage(ws, { type: 'error', message: 'Not at a table' });
    return;
  }

  // Process action
  const result = await agent.pokerEngine.processAction(agent.agentId, action, amount);

  if (!result.success) {
    sendMessage(ws, { type: 'error', message: result.error || 'Action failed' });
    return;
  }

  // Broadcast updated game state to all agents at table
  if (result.gameState) {
    broadcastGameStateToTable(agent.tableId, result.gameState);

    // If hand is complete, notify all agents
    if (result.isHandComplete) {
      broadcastHandComplete(agent.tableId, result.gameState);

      // Complete the hand and start new one if players remain
      await agent.pokerEngine.completeHand();

      // Check if we should start a new hand
      const tableState = await redis.get(`table:${agent.tableId}`);
      if (tableState) {
        const state = JSON.parse(tableState);
        const activePlayers = state.players?.filter((p: any) => p.status === 'active' && p.chips > 0);

        if (activePlayers?.length >= 2) {
          // Start new hand after a short delay
          setTimeout(async () => {
            try {
              const newEngine = new PokerEngine(agent.tableId!, state.smallBlind || 10, state.bigBlind || 20);
              const newGameState = await newEngine.startHand();
              broadcastGameStateToTable(agent.tableId!, newGameState);
            } catch (err) {
              console.error('[Agent WS] Failed to start new hand:', err);
            }
          }, 3000);
        }
      }
    }
  }
}

/**
 * Handle get state request
 */
async function handleGetState(ws: WebSocket): Promise<void> {
  const agent = connectedAgents.get(ws);

  if (!agent) {
    sendMessage(ws, { type: 'error', message: 'Not authenticated' });
    return;
  }

  if (!agent.pokerEngine || agent.tableId === null) {
    sendMessage(ws, { type: 'error', message: 'Not at a table' });
    return;
  }

  const gameState = await agent.pokerEngine.getPlayerGameState(agent.agentId);
  sendMessage(ws, { type: 'game_state', gameState: gameState || undefined });
}

/**
 * Send table list to agent
 */
async function sendTableList(ws: WebSocket): Promise<void> {
  // Get all active/waiting tables from Redis
  const keys = await redis.keys('table:*');
  const tables: { id: number; name: string; status: string; players: number }[] = [];

  for (const key of keys) {
    const data = await redis.get(key);
    if (!data) continue;

    const state = JSON.parse(data);
    if (state.status === 'waiting' || state.status === 'active') {
      tables.push({
        id: state.id,
        name: state.name || `Table ${state.id}`,
        status: state.status,
        players: state.players?.length || 0,
      });
    }
  }

  sendMessage(ws, { type: 'table_list', tables });
}

/**
 * Send message to agent WebSocket
 */
function sendMessage(ws: WebSocket, message: PlatformMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast game state to all agents at a table
 */
function broadcastGameStateToTable(tableId: number, gameState: GameState): void {
  for (const [ws, agent] of connectedAgents) {
    if (agent.tableId === tableId && ws.readyState === WebSocket.OPEN) {
      // Send player-specific view (their hole cards visible)
      const playerView = {
        ...gameState,
        players: gameState.players.map(p => ({
          ...p,
          holeCards: p.agentId === agent.agentId ? p.holeCards : [],
        })),
      };

      // Check if it's this agent's turn
      const isYourTurn = gameState.players.find(
        p => p.agentId === agent.agentId && p.seatNumber === gameState.currentPlayerSeat
      );

      if (isYourTurn) {
        sendMessage(ws, {
          type: 'your_turn',
          gameState: playerView,
          timeoutSeconds: TURN_TIMEOUT_SECONDS,
        });
      } else {
        sendMessage(ws, {
          type: 'game_state',
          gameState: playerView,
        });
      }
    }
  }
}

/**
 * Broadcast hand complete to all agents at a table
 */
function broadcastHandComplete(tableId: number, gameState: GameState): void {
  for (const [ws, agent] of connectedAgents) {
    if (agent.tableId === tableId && ws.readyState === WebSocket.OPEN) {
      const winner = gameState.winners?.find(w => w.agentId === agent.agentId);
      const playerHand = gameState.players.find(p => p.agentId === agent.agentId);

      sendMessage(ws, {
        type: 'hand_complete',
        handResult: {
          winners: gameState.winners || [],
          yourWinnings: winner?.amount || 0,
          yourHandRank: winner?.handRank || (playerHand ? 'Did not win' : 'Folded'),
        },
      });
    }
  }
}

/**
 * Cleanup agent connection
 */
function cleanupAgent(ws: WebSocket): void {
  const agent = connectedAgents.get(ws);

  if (agent && agent.tableId !== null) {
    // Mark agent as sitting_out at table
    handleLeaveTable(ws).catch(err => {
      console.error('[Agent WS] Error during cleanup:', err);
    });
  }

  connectedAgents.delete(ws);
}

/**
 * Get connected agent info
 */
export function getConnectedAgent(ws: WebSocket): ConnectedAgent | null {
  return connectedAgents.get(ws) || null;
}

/**
 * Get all agents at a table
 */
export function getAgentsAtTable(tableId: number): ConnectedAgent[] {
  return Array.from(connectedAgents.values()).filter(a => a.tableId === tableId);
}

/**
 * Check if agent is connected
 */
export function isAgentConnected(agentId: number): boolean {
  return Array.from(connectedAgents.values()).some(a => a.agentId === agentId);
}

/**
 * Get connection stats
 */
export function getConnectionStats(): {
  totalConnections: number;
  authenticatedAgents: number;
  agentsAtTables: number;
} {
  const agents = Array.from(connectedAgents.values());
  return {
    totalConnections: connectedAgents.size,
    authenticatedAgents: agents.filter(a => a.agentId !== 0).length,
    agentsAtTables: agents.filter(a => a.tableId !== null).length,
  };
}

export const AgentConnection = {
  handleAgentConnection,
  sendMessage,
  broadcastGameStateToTable,
  broadcastHandComplete,
  getConnectedAgent,
  getAgentsAtTable,
  isAgentConnected,
  getConnectionStats,
};

export default AgentConnection;
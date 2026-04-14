/**
 * Agent Arena MCP Server
 * Model Context Protocol server for Hermes Agent integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ARENA_MCP_TOOLS } from './tools.js';
import { ARENA_MCP_RESOURCES } from './resources.js';
import { ApiKeyService } from '../lib/ApiKeyService.js';
import { PokerEngine } from '../lib/PokerEngine.js';
import redis from '../lib/redis.js';
import db from '../lib/db.js';

// Environment variables
const ARENA_API_KEY = process.env.ARENA_API_KEY;
const ARENA_WS_URL = process.env.ARENA_WS_URL || 'ws://localhost:3000/ws/agent';

// Server instance
const server = new Server(
  {
    name: 'agent-arena-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Current agent context (set after authentication)
let currentAgentId: number | null = null;
let currentTableId: number | null = null;

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'arena_auth':
        return await handleAuth(args?.apiKey as string);

      case 'arena_join_table':
        return await handleJoinTable(args?.tableId as number);

      case 'arena_leave_table':
        return await handleLeaveTable();

      case 'arena_submit_action':
        return await handleSubmitAction(
          args?.action as string,
          args?.amount as number | undefined
        );

      case 'arena_get_game_state':
        return await handleGetGameState();

      case 'arena_list_tables':
        return await handleListTables();

      case 'arena_get_my_cards':
        return await handleGetMyCards();

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
});

/**
 * Handle auth tool call
 */
async function handleAuth(apiKey: string) {
  if (!apiKey) {
    return {
      content: [{ type: 'text', text: 'Error: apiKey is required' }],
      isError: true,
    };
  }

  const validation = await ApiKeyService.validate(apiKey);

  if (!validation.valid || !validation.key) {
    return {
      content: [{ type: 'text', text: `Authentication failed: ${validation.error || 'Invalid API key'}` }],
      isError: true,
    };
  }

  if (!validation.key.agentId) {
    return {
      content: [{ type: 'text', text: 'Error: API key is not associated with an agent' }],
      isError: true,
    };
  }

  currentAgentId = validation.key.agentId;

  // Get agent info
  const agent = db.prepare('SELECT id, name, wins, losses FROM agents WHERE id = ?').get(currentAgentId) as any;

  return {
    content: [{
      type: 'text',
      text: `Authenticated as agent "${agent?.name || 'Unknown'}" (ID: ${currentAgentId})\n\nWebSocket endpoint: ${ARENA_WS_URL}/${currentAgentId}\nUse arena_join_table to join a game.`
    }],
  };
}

/**
 * Handle join table tool call
 */
async function handleJoinTable(tableId: number) {
  if (!currentAgentId) {
    return {
      content: [{ type: 'text', text: 'Error: Not authenticated. Call arena_auth first.' }],
      isError: true,
    };
  }

  if (!tableId) {
    return {
      content: [{ type: 'text', text: 'Error: tableId is required' }],
      isError: true,
    };
  }

  // Get table state
  const tableData = await redis.get(`table:${tableId}`);
  if (!tableData) {
    return {
      content: [{ type: 'text', text: `Error: Table ${tableId} not found` }],
      isError: true,
    };
  }

  const tableState = JSON.parse(tableData);

  if (tableState.status !== 'waiting' && tableState.status !== 'active') {
    return {
      content: [{ type: 'text', text: `Error: Table ${tableId} is not available (status: ${tableState.status})` }],
      isError: true,
    };
  }

  // Check if already at this table
  const existingPlayer = tableState.players?.find((p: any) => p.agentId === currentAgentId);
  if (existingPlayer) {
    currentTableId = tableId;
    return {
      content: [{ type: 'text', text: `Already at table ${tableId} at seat ${existingPlayer.seatNumber}. Use arena_get_game_state to see current state.` }],
    };
  }

  // Find available seat
  const occupiedSeats = tableState.players?.map((p: any) => p.seatNumber) || [];
  let availableSeat = -1;
  for (let i = 0; i < (tableState.maxPlayers || 9); i++) {
    if (!occupiedSeats.includes(i)) {
      availableSeat = i;
      break;
    }
  }

  if (availableSeat === -1) {
    return {
      content: [{ type: 'text', text: `Error: Table ${tableId} is full` }],
      isError: true,
    };
  }

  // Add agent to table
  tableState.players = tableState.players || [];
  tableState.players.push({
    agentId: currentAgentId,
    seatNumber: availableSeat,
    chips: 1000,
    status: 'active',
  });
  tableState.currentPlayers = tableState.players.length;

  // Update table state
  await redis.set(`table:${tableId}`, JSON.stringify(tableState), 'EX', 86400);

  currentTableId = tableId;

  // Check if we should start a hand
  if (tableState.players.length >= 2 && tableState.status === 'waiting') {
    tableState.status = 'active';
    await redis.set(`table:${tableId}`, JSON.stringify(tableState), 'EX', 86400);

    // Start a hand
    try {
      const engine = new PokerEngine(tableId, tableState.smallBlind || 10, tableState.bigBlind || 20);
      await engine.startHand();
    } catch (err) {
      console.error('Failed to start hand:', err);
    }
  }

  return {
    content: [{
      type: 'text',
      text: `Joined table ${tableId} at seat ${availableSeat} with 1000 chips.\n\n${tableState.players.length >= 2 ? 'Game is starting!' : 'Waiting for more players...'}\n\nUse arena_get_game_state to see the current state.`
    }],
  };
}

/**
 * Handle leave table tool call
 */
async function handleLeaveTable() {
  if (!currentAgentId) {
    return {
      content: [{ type: 'text', text: 'Error: Not authenticated' }],
      isError: true,
    };
  }

  if (!currentTableId) {
    return {
      content: [{ type: 'text', text: 'Error: Not at any table' }],
      isError: true,
    };
  }

  // Remove agent from table
  const tableData = await redis.get(`table:${currentTableId}`);
  if (tableData) {
    const tableState = JSON.parse(tableData);
    tableState.players = tableState.players?.filter((p: any) => p.agentId !== currentAgentId) || [];
    tableState.currentPlayers = tableState.players.length;

    if (tableState.players.length < 2) {
      tableState.status = 'waiting';
    }

    await redis.set(`table:${currentTableId}`, JSON.stringify(tableState), 'EX', 86400);
  }

  currentTableId = null;

  return {
    content: [{ type: 'text', text: 'Left the table successfully. Use arena_list_tables to find another game.' }],
  };
}

/**
 * Handle submit action tool call
 */
async function handleSubmitAction(action: string, amount?: number) {
  if (!currentAgentId) {
    return {
      content: [{ type: 'text', text: 'Error: Not authenticated' }],
      isError: true,
    };
  }

  if (!currentTableId) {
    return {
      content: [{ type: 'text', text: 'Error: Not at any table' }],
      isError: true,
    };
  }

  const validActions = ['fold', 'check', 'call', 'raise', 'all_in'];
  if (!validActions.includes(action)) {
    return {
      content: [{ type: 'text', text: `Error: Invalid action "${action}". Must be one of: ${validActions.join(', ')}` }],
      isError: true,
    };
  }

  if (action === 'raise' && !amount) {
    return {
      content: [{ type: 'text', text: 'Error: amount is required for raise action' }],
      isError: true,
    };
  }

  // Process action
  const engine = new PokerEngine(currentTableId);
  const result = await engine.processAction(currentAgentId, action as any, amount || 0);

  if (!result.success) {
    return {
      content: [{ type: 'text', text: `Error: ${result.error || 'Action failed'}` }],
      isError: true,
    };
  }

  if (result.isHandComplete) {
    await engine.completeHand();
    const winner = result.gameState?.winners?.find(w => w.agentId === currentAgentId);

    return {
      content: [{
        type: 'text',
        text: `Hand complete!\n\n${winner ? `You won ${winner.amount} chips with ${winner.handRank}!` : 'You did not win this hand.'}\n\n${result.gameState?.winners?.map(w => `Agent ${w.agentId}: ${w.amount} chips (${w.handRank})`).join('\n') || ''}`
      }],
    };
  }

  return {
    content: [{
      type: 'text',
      text: `Action "${action}" submitted successfully.\n\nCurrent round: ${result.gameState?.round}\nPot: ${result.gameState?.pot}\n${result.gameState?.currentPlayerSeat ? `Next to act: seat ${result.gameState?.currentPlayerSeat}` : ''}\n\nUse arena_get_game_state for full details.`
    }],
  };
}

/**
 * Handle get game state tool call
 */
async function handleGetGameState() {
  if (!currentAgentId) {
    return {
      content: [{ type: 'text', text: 'Error: Not authenticated' }],
      isError: true,
    };
  }

  if (!currentTableId) {
    return {
      content: [{ type: 'text', text: 'Error: Not at any table. Use arena_join_table first.' }],
      isError: true,
    };
  }

  const engine = new PokerEngine(currentTableId);
  const gameState = await engine.getPlayerGameState(currentAgentId);

  if (!gameState) {
    return {
      content: [{ type: 'text', text: 'No active hand. Waiting for game to start...' }],
    };
  }

  // Find current player
  const currentPlayer = gameState.players.find(p => p.seatNumber === gameState.currentPlayerSeat);
  const isYourTurn = currentPlayer?.agentId === currentAgentId;

  // Build state description
  const stateText = [
    `Table: ${currentTableId}`,
    `Hand #${gameState.handNumber}`,
    `Round: ${gameState.round}`,
    `Pot: ${gameState.pot}`,
    `Current Bet: ${gameState.currentBet}`,
    '',
    'Players:',
    ...gameState.players.map(p => {
      const isYou = p.agentId === currentAgentId;
      const turnIndicator = p.seatNumber === gameState.currentPlayerSeat ? ' [YOUR TURN]' : '';
      return `- Seat ${p.seatNumber}: ${p.chips} chips, bet ${p.currentBet}, ${p.status}${turnIndicator}${isYou ? ' (YOU)' : ''}`;
    }),
    '',
    `Community Cards: ${gameState.communityCards.length > 0 ? gameState.communityCards.map(c => `${c.rank}${c.suit === 'hearts' ? '♥' : c.suit === 'diamonds' ? '♦' : c.suit === 'clubs' ? '♣' : '♠'}`).join(' ') : 'None'}`,
  ];

  // Add your cards
  const yourPlayer = gameState.players.find(p => p.agentId === currentAgentId);
  if (yourPlayer && yourPlayer.holeCards.length > 0) {
    stateText.push('', `Your Cards: ${yourPlayer.holeCards.map(c => `${c.rank}${c.suit === 'hearts' ? '♥' : c.suit === 'diamonds' ? '♦' : c.suit === 'clubs' ? '♣' : '♠'}`).join(' ')}`);
  }

  if (isYourTurn) {
    stateText.push('', '**YOUR TURN!** Submit an action:', '- arena_submit_action: fold', '- arena_submit_action: check (if no bet to call)', '- arena_submit_action: call', '- arena_submit_action: raise with amount');
  }

  return {
    content: [{ type: 'text', text: stateText.join('\n') }],
  };
}

/**
 * Handle list tables tool call
 */
async function handleListTables() {
  const keys = await redis.keys('table:*');
  const tables: any[] = [];

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
        maxPlayers: state.maxPlayers || 9,
        buyIn: state.buyIn || 1000,
      });
    }
  }

  if (tables.length === 0) {
    return {
      content: [{ type: 'text', text: 'No tables available. Create one via the web UI at http://localhost:3000/lobby' }],
    };
  }

  const tableText = tables.map(t =>
    `- Table ${t.id}: ${t.name} (${t.status}, ${t.players}/${t.maxPlayers} players)`
  ).join('\n');

  return {
    content: [{ type: 'text', text: `Available Tables:\n\n${tableText}\n\nUse arena_join_table with tableId to join.` }],
  };
}

/**
 * Handle get my cards tool call
 */
async function handleGetMyCards() {
  if (!currentAgentId) {
    return {
      content: [{ type: 'text', text: 'Error: Not authenticated' }],
      isError: true,
    };
  }

  if (!currentTableId) {
    return {
      content: [{ type: 'text', text: 'Error: Not at any table' }],
      isError: true,
    };
  }

  const engine = new PokerEngine(currentTableId);
  const gameState = await engine.getPlayerGameState(currentAgentId);

  if (!gameState) {
    return {
      content: [{ type: 'text', text: 'No active hand' }],
    };
  }

  const yourPlayer = gameState.players.find(p => p.agentId === currentAgentId);
  if (!yourPlayer || yourPlayer.holeCards.length === 0) {
    return {
      content: [{ type: 'text', text: 'You have not been dealt cards yet' }],
    };
  }

  const cardsText = yourPlayer.holeCards.map(c =>
    `${c.rank}${c.suit === 'hearts' ? '♥' : c.suit === 'diamonds' ? '♦' : c.suit === 'clubs' ? '♣' : '♠'}`
  ).join(' ');

  return {
    content: [{ type: 'text', text: `Your hole cards: ${cardsText}` }],
  };
}

/**
 * Handle list tools request
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: ARENA_MCP_TOOLS };
});

/**
 * Handle list resources request
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: ARENA_MCP_RESOURCES };
});

/**
 * Handle read resource request
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'arena://your_turn') {
    if (!currentAgentId || !currentTableId) {
      return {
        contents: [{
          uri,
          mimeType: 'text/plain',
          text: 'Not authenticated or not at a table',
        }],
      };
    }

    const engine = new PokerEngine(currentTableId);
    const gameState = await engine.getPlayerGameState(currentAgentId);
    const currentPlayer = gameState?.players.find(p => p.seatNumber === gameState?.currentPlayerSeat);
    const isYourTurn = currentPlayer?.agentId === currentAgentId;

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          isYourTurn,
          gameState: isYourTurn ? gameState : null,
          timeoutSeconds: 30,
        }),
      }],
    };
  }

  if (uri === 'arena://game_state') {
    if (!currentAgentId || !currentTableId) {
      return {
        contents: [{
          uri,
          mimeType: 'text/plain',
          text: 'Not authenticated or not at a table',
        }],
      };
    }

    const engine = new PokerEngine(currentTableId);
    const gameState = await engine.getPlayerGameState(currentAgentId);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(gameState || { status: 'no_active_hand' }),
      }],
    };
  }

  return {
    contents: [{
      uri,
      mimeType: 'text/plain',
      text: `Unknown resource: ${uri}`,
    }],
  };
});

/**
 * Start the MCP server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Agent Arena MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error in main:', error);
  process.exit(1);
});
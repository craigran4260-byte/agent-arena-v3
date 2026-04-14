/**
 * MCP Tools Definition for Agent Arena
 * Defines all available tools for Hermes Agent integration
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const ARENA_MCP_TOOLS: Tool[] = [
  {
    name: 'arena_auth',
    description: 'Authenticate with Agent Arena using your API key. This must be called first before any other arena tools. Returns your agent ID and WebSocket endpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'Your Agent Arena API key (format: aa_live_xxx or aa_test_xxx)',
        },
      },
      required: ['apiKey'],
    },
  },
  {
    name: 'arena_join_table',
    description: 'Join a poker table to start playing. You will be seated at an available seat with 1000 starting chips. If enough players join, a hand will automatically start.',
    inputSchema: {
      type: 'object',
      properties: {
        tableId: {
          type: 'number',
          description: 'The ID of the table to join',
        },
      },
      required: ['tableId'],
    },
  },
  {
    name: 'arena_leave_table',
    description: 'Leave the current poker table. Your chips will be preserved for the next session.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'arena_submit_action',
    description: 'Submit a poker action during your turn. Valid actions are: fold, check, call, raise, all_in. For raise, you must specify the amount.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['fold', 'check', 'call', 'raise', 'all_in'],
          description: 'The poker action to take',
        },
        amount: {
          type: 'number',
          description: 'The amount to raise (required for raise action)',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'arena_get_game_state',
    description: 'Get the current game state including your hole cards, community cards, pot, current bet, and all player positions. Use this to understand the current situation before making a decision.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'arena_list_tables',
    description: 'List all available poker tables that you can join. Shows table ID, name, status, and player count.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'arena_get_my_cards',
    description: 'Get your current hole cards (the 2 cards dealt to you). Use this when you need to quickly check your hand.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
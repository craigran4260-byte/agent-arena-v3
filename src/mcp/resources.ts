/**
 * MCP Resources Definition for Agent Arena
 * Defines all available resources for Hermes Agent integration
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';

export const ARENA_MCP_RESOURCES: Resource[] = [
  {
    uri: 'arena://your_turn',
    name: 'Your Turn Notification',
    description: 'Real-time notification when it is your turn to act. Includes full game state, timeout information, and your hole cards.',
    mimeType: 'application/json',
  },
  {
    uri: 'arena://game_state',
    name: 'Current Game State',
    description: 'Live game state updates including community cards, pot, player positions, and betting information. Updated after every action.',
    mimeType: 'application/json',
  },
  {
    uri: 'arena://tables',
    name: 'Available Tables',
    description: 'List of all available poker tables. Includes table ID, name, status, player count, and buy-in amount.',
    mimeType: 'application/json',
  },
  {
    uri: 'arena://agent_info',
    name: 'Agent Information',
    description: 'Your agent profile including ID, name, wins, losses, and connection status.',
    mimeType: 'application/json',
  },
];
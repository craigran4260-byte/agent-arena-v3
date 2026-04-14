/**
 * Agent Arena MCP Server Module
 * Export all MCP-related components for external use
 */

export { ARENA_MCP_TOOLS } from './tools.js';
export { ARENA_MCP_RESOURCES } from './resources.js';

// Re-export server creation function for custom configurations
export function createArenaMCPServer() {
  // Import dynamically to avoid circular dependencies
  return import('./arena-mcp-server.js');
}
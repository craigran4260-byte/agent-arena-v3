/**
 * TurnManager - Poker Turn Timeout Management
 * Handles turn timers and automatic timeout actions
 */

import { AgentConnection } from './AgentConnection';
import { PokerEngine } from './PokerEngine';
import redis from './redis';

// Default turn timeout in seconds
const DEFAULT_TURN_TIMEOUT = 30;

// Active turn timers
const activeTimers: Map<number, NodeJS.Timeout> = new Map(); // agentId -> timer

// Turn start times
const turnStartTimes: Map<number, number> = new Map(); // agentId -> timestamp

interface TurnTimerOptions {
  tableId: number;
  agentId: number;
  timeoutSeconds?: number;
  onTimeout?: (agentId: number, tableId: number) => void;
}

/**
 * Start a turn timer for an agent
 */
export function startTurnTimer(options: TurnTimerOptions): void {
  const { tableId, agentId, timeoutSeconds = DEFAULT_TURN_TIMEOUT, onTimeout } = options;

  // Clear any existing timer for this agent
  clearTurnTimer(agentId);

  // Record start time
  turnStartTimes.set(agentId, Date.now());

  console.log(`[TurnManager] Starting ${timeoutSeconds}s timer for agent ${agentId} at table ${tableId}`);

  // Create timeout timer
  const timer = setTimeout(async () => {
    console.log(`[TurnManager] Agent ${agentId} timed out after ${timeoutSeconds}s`);

    // Record timeout in Redis for analytics
    await redis.lpush(`turn_timeouts:${tableId}`, JSON.stringify({
      agentId,
      tableId,
      timeoutAt: Date.now(),
      timeoutSeconds,
    }));

    // Execute timeout action (auto-fold)
    await handleTimeout(agentId, tableId);

    // Call custom onTimeout callback
    if (onTimeout) {
      onTimeout(agentId, tableId);
    }
  }, timeoutSeconds * 1000);

  activeTimers.set(agentId, timer);
}

/**
 * Clear a turn timer for an agent
 */
export function clearTurnTimer(agentId: number): void {
  const timer = activeTimers.get(agentId);

  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(agentId);
    turnStartTimes.delete(agentId);
    console.log(`[TurnManager] Cleared timer for agent ${agentId}`);
  }
}

/**
 * Handle agent timeout - auto fold
 */
async function handleTimeout(agentId: number, tableId: number): Promise<void> {
  try {
    // Get poker engine for this table
    const engine = new PokerEngine(tableId);

    // Process timeout action (fold)
    const result = await engine.processAction(agentId, 'fold', 0);

    if (!result.success) {
      console.error(`[TurnManager] Failed to process timeout fold for agent ${agentId}:`, result.error);
      return;
    }

    // Broadcast new game state
    if (result.gameState) {
      AgentConnection.broadcastGameStateToTable(tableId, result.gameState);

      // If hand complete, broadcast that too
      if (result.isHandComplete) {
        AgentConnection.broadcastHandComplete(tableId, result.gameState);
        await engine.completeHand();
      }
    }
  } catch (err) {
    console.error(`[TurnManager] Error handling timeout:`, err);
  }
}

/**
 * Get remaining time for an agent's turn
 */
export function getRemainingTime(agentId: number): number {
  const startTime = turnStartTimes.get(agentId);

  if (!startTime) {
    return 0;
  }

  const elapsed = (Date.now() - startTime) / 1000;
  const remaining = DEFAULT_TURN_TIMEOUT - elapsed;

  return Math.max(0, Math.round(remaining));
}

/**
 * Check if an agent has an active timer
 */
export function hasActiveTimer(agentId: number): boolean {
  return activeTimers.has(agentId);
}

/**
 * Pause turn timer (for disconnections)
 */
export function pauseTurnTimer(agentId: number): number | null {
  const timer = activeTimers.get(agentId);

  if (!timer) {
    return null;
  }

  clearTimeout(timer);
  activeTimers.delete(agentId);

  // Return remaining time
  return getRemainingTime(agentId);
}

/**
 * Resume turn timer (for reconnects)
 */
export function resumeTurnTimer(agentId: number, tableId: number, remainingSeconds: number): void {
  if (remainingSeconds <= 0) {
    // No time left, immediate timeout
    handleTimeout(agentId, tableId);
    return;
  }

  // Record start time adjusted for remaining time
  const virtualStartTime = Date.now() - ((DEFAULT_TURN_TIMEOUT - remainingSeconds) * 1000);
  turnStartTimes.set(agentId, virtualStartTime);

  // Create shortened timer
  const timer = setTimeout(async () => {
    await handleTimeout(agentId, tableId);
  }, remainingSeconds * 1000);

  activeTimers.set(agentId, timer);
  console.log(`[TurnManager] Resumed timer for agent ${agentId} with ${remainingSeconds}s remaining`);
}

/**
 * Clear all timers for a table
 */
export function clearTableTimers(tableId: number): void {
  // Get all agents at this table and clear their timers
  const agentsAtTable = AgentConnection.getAgentsAtTable(tableId);

  for (const agent of agentsAtTable) {
    clearTurnTimer(agent.agentId);
  }

  console.log(`[TurnManager] Cleared all timers for table ${tableId}`);
}

/**
 * Get timer stats
 */
export function getTimerStats(): {
  activeTimers: number;
  timers: { agentId: number; remainingSeconds: number }[];
} {
  const timers = Array.from(activeTimers.keys()).map(agentId => ({
    agentId,
    remainingSeconds: getRemainingTime(agentId),
  }));

  return {
    activeTimers: activeTimers.size,
    timers,
  };
}

/**
 * Extend turn timer (for special circumstances)
 */
export function extendTurnTimer(agentId: number, additionalSeconds: number): boolean {
  const remaining = getRemainingTime(agentId);

  if (remaining <= 0) {
    return false; // Timer already expired
  }

  // Clear existing timer
  clearTurnTimer(agentId);

  // Start new timer with extended time
  const newTimeout = remaining + additionalSeconds;
  const startTime = Date.now() - ((DEFAULT_TURN_TIMEOUT - newTimeout) * 1000);
  turnStartTimes.set(agentId, startTime);

  const timer = setTimeout(async () => {
    // Need to get tableId from context - this would be enhanced
    console.log(`[TurnManager] Extended timer expired for agent ${agentId}`);
  }, newTimeout * 1000);

  activeTimers.set(agentId, timer);
  console.log(`[TurnManager] Extended timer for agent ${agentId} by ${additionalSeconds}s`);

  return true;
}

export const TurnManager = {
  startTurnTimer,
  clearTurnTimer,
  getRemainingTime,
  hasActiveTimer,
  pauseTurnTimer,
  resumeTurnTimer,
  clearTableTimers,
  getTimerStats,
  extendTurnTimer,
  DEFAULT_TURN_TIMEOUT,
};

export default TurnManager;
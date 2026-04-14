/**
 * Hand Action Service (V3)
 * Handles real-time game actions with 30-second spectator delay
 * For anti-cheat purposes, human spectators see actions delayed
 */

import db from './db';

// 30-second delay for spectators (anti-cheat)
const SPECTATOR_DELAY_MS = 30 * 1000;

export interface HandAction {
  id: number;
  handId: number;
  agentId: number;
  actionType: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'small_blind' | 'big_blind';
  amount: number;
  round: 'preflop' | 'flop' | 'turn' | 'river';
  seatNumber: number;
  createdAt: Date;
}

export interface DelayedActionState {
  handId: number;
  actions: HandAction[];
  currentRound: string;
  communityCards: string[];
  potSize: number;
  currentBets: Map<number, number>; // seatNumber -> current bet amount
  delayedUntil: Date;
}

// Poker position names based on seat relative to dealer
const POSITION_NAMES: Record<string, string> = {
  BTN: 'BTN',   // Dealer/Button
  SB: 'SB',     // Small Blind
  BB: 'BB',     // Big Blind
  UTG: 'UTG',   // Under the Gun (first to act preflop)
  'UTG+1': 'UTG+1',
  'UTG+2': 'UTG+2',
  MP: 'MP',     // Middle Position
  HJ: 'HJ',     // Hijack
  CO: 'CO',     // Cutoff
};

/**
 * Calculate position name based on seat number relative to dealer
 * In 9-max: Dealer (BTN) acts last preflop, first postflop
 * Positions go clockwise from dealer
 */
export function getPositionName(seatNumber: number, dealerSeat: number, totalSeats: number = 9): string {
  // Calculate position relative to dealer (clockwise)
  const positionIndex = (seatNumber - dealerSeat + totalSeats) % totalSeats;

  // Position mapping for 9-max (0 = BTN, clockwise)
  const positionMap9Max: string[] = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO', ''];

  // Adjust for actual number of players
  const activePositions = positionMap9Max.slice(0, totalSeats);

  return activePositions[positionIndex] || `Seat ${seatNumber}`;
}

export const HandActionService = {
  /**
   * Record a new hand action
   */
  async recordAction(
    handId: number,
    agentId: number,
    actionType: HandAction['actionType'],
    amount: number,
    round: HandAction['round'],
    seatNumber: number
  ): Promise<HandAction> {
    const stmt = db.prepare(`
      INSERT INTO hand_actions
      (hand_id, agent_id, action_type, amount, round, seat_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(handId, agentId, actionType, amount, round, seatNumber);

    return {
      id: result.lastInsertRowid as number,
      handId,
      agentId,
      actionType,
      amount,
      round,
      seatNumber,
      createdAt: new Date()
    };
  },

  /**
   * Get actions for a hand, optionally with delay for spectators
   */
  async getHandActions(
    handId: number,
    includeDelay: boolean = false
  ): Promise<HandAction[]> {
    const stmt = db.prepare(`
      SELECT * FROM hand_actions
      WHERE hand_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(handId) as any[];

    let actions = rows.map(row => ({
      id: row.id,
      handId: row.hand_id,
      agentId: row.agent_id,
      actionType: row.action_type as HandAction['actionType'],
      amount: row.amount,
      round: row.round as HandAction['round'],
      seatNumber: row.seat_number,
      createdAt: new Date(row.created_at)
    }));

    // Apply 30-second delay for spectators
    if (includeDelay) {
      const cutoffTime = new Date(Date.now() - SPECTATOR_DELAY_MS);
      actions = actions.filter(a => a.createdAt <= cutoffTime);
    }

    return actions;
  },

  /**
   * Get delayed action state for a hand (spectator view)
   * Returns the state as it was 30 seconds ago
   */
  async getDelayedState(handId: number): Promise<DelayedActionState | null> {
    // Get hand info
    const handStmt = db.prepare(`
      SELECT * FROM hands WHERE id = ?
    `);
    const hand = handStmt.get(handId) as any;

    if (!hand) return null;

    // Get delayed actions
    const actions = await this.getHandActions(handId, true);

    // Calculate current bets per seat
    const currentBets = new Map<number, number>();
    for (const action of actions) {
      if (action.actionType !== 'fold' && action.actionType !== 'check') {
        const currentBet = currentBets.get(action.seatNumber) || 0;
        currentBets.set(action.seatNumber, currentBet + action.amount);
      }
    }

    // Parse community cards
    let communityCards: string[] = [];
    if (hand.community_cards) {
      try {
        communityCards = JSON.parse(hand.community_cards);
      } catch {
        communityCards = hand.community_cards.split(',');
      }
    }

    // Determine current round based on actions
    const rounds = ['preflop', 'flop', 'turn', 'river'];
    let currentRound = hand.current_round || 'preflop';

    // Calculate pot size from actions
    let potSize = 0;
    for (const action of actions) {
      if (action.actionType !== 'fold' && action.actionType !== 'check') {
        potSize += action.amount;
      }
    }

    return {
      handId,
      actions,
      currentRound,
      communityCards,
      potSize,
      currentBets,
      delayedUntil: new Date(Date.now() - SPECTATOR_DELAY_MS)
    };
  },

  /**
   * Get real-time action state (for agents/admins - no delay)
   */
  async getRealTimeState(handId: number): Promise<DelayedActionState | null> {
    const handStmt = db.prepare(`
      SELECT * FROM hands WHERE id = ?
    `);
    const hand = handStmt.get(handId) as any;

    if (!hand) return null;

    const actions = await this.getHandActions(handId, false);

    const currentBets = new Map<number, number>();
    for (const action of actions) {
      if (action.actionType !== 'fold' && action.actionType !== 'check') {
        const currentBet = currentBets.get(action.seatNumber) || 0;
        currentBets.set(action.seatNumber, currentBet + action.amount);
      }
    }

    let communityCards: string[] = [];
    if (hand.community_cards) {
      try {
        communityCards = JSON.parse(hand.community_cards);
      } catch {
        communityCards = hand.community_cards.split(',');
      }
    }

    let potSize = 0;
    for (const action of actions) {
      if (action.actionType !== 'fold' && action.actionType !== 'check') {
        potSize += action.amount;
      }
    }

    return {
      handId,
      actions,
      currentRound: hand.current_round || 'preflop',
      communityCards,
      potSize,
      currentBets,
      delayedUntil: new Date()
    };
  },

  /**
   * Clear actions for a hand (when hand completes)
   */
  async clearHandActions(handId: number): Promise<void> {
    // Keep actions for replay purposes, but mark hand as completed
    db.prepare(`
      UPDATE hands SET completed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(handId);
  },

  /**
   * Get time until spectator sees an action
   */
  getDelayRemaining(actionCreatedAt: Date): number {
    const visibleAt = new Date(actionCreatedAt.getTime() + SPECTATOR_DELAY_MS);
    const remaining = visibleAt.getTime() - Date.now();
    return Math.max(0, remaining);
  },

  /**
   * Check if action is visible to spectators
   */
  isActionVisibleToSpectators(actionCreatedAt: Date): boolean {
    return Date.now() >= actionCreatedAt.getTime() + SPECTATOR_DELAY_MS;
  }
};
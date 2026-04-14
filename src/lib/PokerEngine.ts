/**
 * PokerEngine - Texas Hold'em Game Engine
 * Core game logic for running poker hands
 */

import db from './db';
import redis, { getTableState, setTableState, TableState, PlayerState } from './redis';
import { Card, createShuffledDeck, dealCards, cardsToCodes, parseCardCodes } from './CardDeck';
import { evaluateHand, findWinners, HandEvaluation, HandRank } from './HandEvaluator';

export type Round = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all_in';
export type PlayerStatus = 'active' | 'folded' | 'all_in' | 'eliminated' | 'sitting_out';

export interface GameState {
  tableId: number;
  handId: number;
  handNumber: number;
  round: Round;
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  minBet: number;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentPlayerSeat: number;
  lastActionSeat: number | null;
  players: PlayerGameState[];
  deck: Card[];
  smallBlind: number;
  bigBlind: number;
  isHandComplete: boolean;
  winners: WinnerInfo[] | null;
}

export interface PlayerGameState {
  agentId: number;
  seatNumber: number;
  chips: number;
  holeCards: Card[];
  currentBet: number;
  totalBetThisHand: number;
  status: PlayerStatus;
  lastAction: PlayerAction | null;
}

export interface SidePot {
  amount: number;
  eligiblePlayers: number[]; // agentIds
}

export interface WinnerInfo {
  agentId: number;
  amount: number;
  handRank: string;
  cards: string[];
}

export interface ActionResult {
  success: boolean;
  error?: string;
  gameState?: GameState;
  nextPlayerSeat?: number;
  isRoundComplete?: boolean;
  isHandComplete?: boolean;
}

/**
 * PokerEngine class for managing game state
 */
export class PokerEngine {
  private tableId: number;
  private smallBlind: number;
  private bigBlind: number;

  constructor(tableId: number, smallBlind: number = 10, bigBlind: number = 20) {
    this.tableId = tableId;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
  }

  /**
   * Start a new hand
   */
  async startHand(): Promise<GameState> {
    const tableState = await getTableState(this.tableId);
    if (!tableState) {
      throw new Error('Table not found');
    }

    if (tableState.status !== 'active') {
      throw new Error('Table is not active');
    }

    if (tableState.players.length < 2) {
      throw new Error('Need at least 2 players to start a hand');
    }

    // Get active players (not eliminated or sitting out)
    const activePlayers = tableState.players.filter(
      p => p.status === 'active' && p.chips > 0
    );

    if (activePlayers.length < 2) {
      throw new Error('Need at least 2 active players with chips');
    }

    // Create new hand in database
    const handNumber = (tableState.currentHand || 0) + 1;
    const result = db.prepare(`
      INSERT INTO hands (table_id, hand_number, dealer_seat, small_blind_seat, big_blind_seat,
                         small_blind, big_blind, current_round, pot_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'preflop', 0)
    `).run(
      this.tableId,
      handNumber,
      tableState.dealerSeat,
      this.getNextSeat(tableState.dealerSeat, activePlayers),
      this.getNextSeat(this.getNextSeat(tableState.dealerSeat, activePlayers), activePlayers),
      this.smallBlind,
      this.bigBlind
    );

    const handId = result.lastInsertRowid as number;

    // Create shuffled deck
    const deck = createShuffledDeck();

    // Deal hole cards to each player
    const { dealt: holeCardsAll, remaining: remainingDeck } = dealCards(deck, activePlayers.length * 2);

    // Initialize player states
    const players: PlayerGameState[] = activePlayers.map((p, idx) => ({
      agentId: p.agentId,
      seatNumber: p.seatNumber,
      chips: p.chips,
      holeCards: [holeCardsAll[idx * 2], holeCardsAll[idx * 2 + 1]],
      currentBet: 0,
      totalBetThisHand: 0,
      status: 'active',
      lastAction: null,
    }));

    // Calculate blind positions
    const smallBlindSeat = this.getNextSeat(tableState.dealerSeat, activePlayers);
    const bigBlindSeat = this.getNextSeat(smallBlindSeat, activePlayers);

    // Post blinds
    const sbPlayer = players.find(p => p.seatNumber === smallBlindSeat);
    const bbPlayer = players.find(p => p.seatNumber === bigBlindSeat);

    if (sbPlayer) {
      const sbAmount = Math.min(this.smallBlind, sbPlayer.chips);
      sbPlayer.currentBet = sbAmount;
      sbPlayer.totalBetThisHand = sbAmount;
      sbPlayer.chips -= sbAmount;
      if (sbPlayer.chips === 0) sbPlayer.status = 'all_in';
    }

    if (bbPlayer) {
      const bbAmount = Math.min(this.bigBlind, bbPlayer.chips);
      bbPlayer.currentBet = bbAmount;
      bbPlayer.totalBetThisHand = bbAmount;
      bbPlayer.chips -= bbAmount;
      if (bbPlayer.chips === 0) bbPlayer.status = 'all_in';
    }

    // First to act preflop is UTG (seat after big blind)
    const utgSeat = this.getNextSeat(bigBlindSeat, activePlayers);

    // Create initial game state
    const gameState: GameState = {
      tableId: this.tableId,
      handId,
      handNumber,
      round: 'preflop',
      communityCards: [],
      pot: (sbPlayer?.currentBet || 0) + (bbPlayer?.currentBet || 0),
      sidePots: [],
      currentBet: this.bigBlind,
      minBet: this.bigBlind,
      dealerSeat: tableState.dealerSeat,
      smallBlindSeat,
      bigBlindSeat,
      currentPlayerSeat: utgSeat,
      lastActionSeat: null,
      players,
      deck: remainingDeck,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      isHandComplete: false,
      winners: null,
    };

    // Store game state in Redis
    await this.saveGameState(gameState);

    // Update table state
    tableState.currentHand = handNumber;
    await setTableState(this.tableId, tableState);

    return gameState;
  }

  /**
   * Process a player action
   */
  async processAction(agentId: number, action: PlayerAction, amount: number = 0): Promise<ActionResult> {
    const gameState = await this.loadGameState();
    if (!gameState) {
      return { success: false, error: 'No active hand' };
    }

    // Find the player
    const player = gameState.players.find(p => p.agentId === agentId);
    if (!player) {
      return { success: false, error: 'Player not in this hand' };
    }

    // Check if it's this player's turn
    if (player.seatNumber !== gameState.currentPlayerSeat) {
      return { success: false, error: 'Not your turn' };
    }

    // Check if player can act
    if (player.status === 'folded' || player.status === 'all_in' || player.status === 'eliminated') {
      return { success: false, error: 'Player cannot act' };
    }

    // Validate and execute action
    const validationResult = this.validateAction(player, gameState, action, amount);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }

    // Execute the action
    const newGameState = this.executeAction(gameState, player, action, amount);

    // Check if round is complete
    const roundComplete = this.isRoundComplete(newGameState);

    // If round complete, advance to next round
    if (roundComplete) {
      this.advanceRound(newGameState);
    } else {
      // Move to next player
      newGameState.currentPlayerSeat = this.getNextActiveSeat(newGameState);
    }

    // Save updated state
    await this.saveGameState(newGameState);

    // Record action in database
    db.prepare(`
      INSERT INTO hand_actions (hand_id, agent_id, action_type, amount, round, seat_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      gameState.handId,
      agentId,
      action,
      amount,
      gameState.round,
      player.seatNumber
    );

    return {
      success: true,
      gameState: newGameState,
      nextPlayerSeat: newGameState.currentPlayerSeat,
      isRoundComplete: roundComplete,
      isHandComplete: newGameState.isHandComplete,
    };
  }

  /**
   * Validate a player action
   */
  private validateAction(
    player: PlayerGameState,
    state: GameState,
    action: PlayerAction,
    amount: number
  ): { valid: boolean; error?: string } {
    switch (action) {
      case 'fold':
        return { valid: true };

      case 'check':
        if (player.currentBet < state.currentBet) {
          return { valid: false, error: 'Cannot check when there is a bet to call' };
        }
        return { valid: true };

      case 'call':
        const callAmount = state.currentBet - player.currentBet;
        if (callAmount <= 0) {
          return { valid: false, error: 'No bet to call' };
        }
        if (player.chips < callAmount) {
          // Can still call all-in with less chips
          return { valid: true };
        }
        return { valid: true };

      case 'raise':
        if (amount < state.minBet) {
          return { valid: false, error: `Raise must be at least ${state.minBet}` };
        }
        const totalRaiseAmount = state.currentBet - player.currentBet + amount;
        if (player.chips < totalRaiseAmount) {
          // Can still raise all-in with less chips
          return { valid: true };
        }
        return { valid: true };

      case 'all_in':
        return { valid: true };

      default:
        return { valid: false, error: 'Unknown action' };
    }
  }

  /**
   * Execute a player action
   */
  private executeAction(
    state: GameState,
    player: PlayerGameState,
    action: PlayerAction,
    amount: number
  ): GameState {
    const newState = { ...state };
    const playerIndex = newState.players.findIndex(p => p.agentId === player.agentId);
    const newPlayer = { ...newState.players[playerIndex] };

    switch (action) {
      case 'fold':
        newPlayer.status = 'folded';
        newPlayer.lastAction = 'fold';
        break;

      case 'check':
        newPlayer.lastAction = 'check';
        break;

      case 'call':
        const callAmount = Math.min(state.currentBet - player.currentBet, player.chips);
        newPlayer.currentBet += callAmount;
        newPlayer.totalBetThisHand += callAmount;
        newPlayer.chips -= callAmount;
        newPlayer.lastAction = 'call';
        if (newPlayer.chips === 0) newPlayer.status = 'all_in';
        newState.pot += callAmount;
        break;

      case 'raise':
        const totalRaiseAmount = Math.min(state.currentBet - player.currentBet + amount, player.chips);
        const raiseBy = totalRaiseAmount - (state.currentBet - player.currentBet);
        newPlayer.currentBet += totalRaiseAmount;
        newPlayer.totalBetThisHand += totalRaiseAmount;
        newPlayer.chips -= totalRaiseAmount;
        newPlayer.lastAction = 'raise';
        if (newPlayer.chips === 0) newPlayer.status = 'all_in';
        newState.pot += totalRaiseAmount;
        newState.currentBet = newPlayer.currentBet;
        newState.minBet = Math.max(state.minBet, raiseBy);
        newState.lastActionSeat = player.seatNumber;
        break;

      case 'all_in':
        const allInAmount = player.chips;
        newPlayer.currentBet += allInAmount;
        newPlayer.totalBetThisHand += allInAmount;
        newPlayer.chips = 0;
        newPlayer.status = 'all_in';
        newPlayer.lastAction = 'all_in';
        newState.pot += allInAmount;
        if (newPlayer.currentBet > newState.currentBet) {
          newState.currentBet = newPlayer.currentBet;
          newState.lastActionSeat = player.seatNumber;
        }
        // Handle side pots if needed
        this.calculateSidePots(newState);
        break;
    }

    newState.players[playerIndex] = newPlayer;
    return newState;
  }

  /**
   * Check if the current betting round is complete
   */
  private isRoundComplete(state: GameState): boolean {
    // Get active players (not folded, not all-in, or need to act)
    const activePlayers = state.players.filter(p =>
      p.status !== 'folded' && p.status !== 'eliminated'
    );

    // If only one player left, hand is complete
    if (activePlayers.filter(p => p.status !== 'folded').length <= 1) {
      return true;
    }

    // Check if all players have acted and bets are equal
    const playersNeedToAct = activePlayers.filter(p =>
      p.status === 'active' && (p.currentBet < state.currentBet || p.lastAction === null)
    );

    // Check if betting has come back to the last raiser
    const allMatchedBet = activePlayers.every(p =>
      p.status === 'all_in' || p.status === 'folded' || p.currentBet === state.currentBet
    );

    const allHaveActed = activePlayers.every(p =>
      p.status === 'all_in' || p.status === 'folded' || p.lastAction !== null
    );

    return playersNeedToAct.length === 0 && allMatchedBet && allHaveActed;
  }

  /**
   * Advance to the next round
   */
  private advanceRound(state: GameState): void {
    const activePlayers = state.players.filter(p => p.status !== 'folded');

    // Reset bets for new round
    state.players.forEach(p => {
      p.currentBet = 0;
      if (p.status === 'active') {
        p.lastAction = null;
      }
    });
    state.currentBet = 0;
    state.minBet = this.bigBlind;
    state.lastActionSeat = null;

    switch (state.round) {
      case 'preflop':
        state.round = 'flop';
        // Deal 3 community cards
        const { dealt: flopCards, remaining: afterFlop } = dealCards(state.deck, 3);
        state.communityCards = flopCards;
        state.deck = afterFlop;
        break;

      case 'flop':
        state.round = 'turn';
        // Deal 1 community card
        const { dealt: turnCard, remaining: afterTurn } = dealCards(state.deck, 1);
        state.communityCards.push(...turnCard);
        state.deck = afterTurn;
        break;

      case 'turn':
        state.round = 'river';
        // Deal 1 community card
        const { dealt: riverCard, remaining: afterRiver } = dealCards(state.deck, 1);
        state.communityCards.push(...riverCard);
        state.deck = afterRiver;
        break;

      case 'river':
        state.round = 'showdown';
        this.determineWinner(state);
        break;
    }

    // Set first to act for new round (first active player after dealer)
    if (state.round !== 'showdown') {
      state.currentPlayerSeat = this.getNextActiveSeat(state);
    }
  }

  /**
   * Get the next active player's seat
   */
  private getNextActiveSeat(state: GameState): number {
    const activePlayers = state.players.filter(p =>
      p.status === 'active' && p.chips > 0
    );

    if (activePlayers.length === 0) {
      return -1;
    }

    // Start from current player or dealer for new round
    const startSeat = state.currentPlayerSeat !== state.lastActionSeat
      ? state.currentPlayerSeat
      : state.dealerSeat;

    return this.getNextSeat(startSeat, activePlayers);
  }

  /**
   * Get the next seat number from a starting seat
   */
  private getNextSeat(fromSeat: number, players: PlayerGameState[] | PlayerState[]): number {
    const seats = players.map(p => p.seatNumber).sort((a, b) => a - b);

    // Find next seat greater than fromSeat
    const nextSeat = seats.find(s => s > fromSeat);

    // Wrap around to first seat if none found
    return nextSeat !== undefined ? nextSeat : seats[0];
  }

  /**
   * Calculate side pots for all-in situations
   */
  private calculateSidePots(state: GameState): void {
    // Simplified side pot calculation
    // In a full implementation, this would be more complex
    const allInPlayers = state.players.filter(p => p.status === 'all_in');

    if (allInPlayers.length === 0) {
      state.sidePots = [];
      return;
    }

    // Create main pot and side pot for excess bets
    const minAllIn = Math.min(...allInPlayers.map(p => p.totalBetThisHand));

    state.sidePots = [{
      amount: state.pot,
      eligiblePlayers: state.players.filter(p => p.status !== 'folded').map(p => p.agentId),
    }];
  }

  /**
   * Determine the winner at showdown
   */
  private determineWinner(state: GameState): void {
    const activePlayers = state.players.filter(p => p.status !== 'folded');

    if (activePlayers.length === 1) {
      // Only one player left - they win
      const winner = activePlayers[0];
      state.winners = [{
        agentId: winner.agentId,
        amount: state.pot,
        handRank: 'Last player remaining',
        cards: [],
      }];
      state.isHandComplete = true;
      return;
    }

    // Evaluate all hands
    const handEvaluations = new Map<number, HandEvaluation>();

    for (const player of activePlayers) {
      const evaluation = evaluateHand(player.holeCards, state.communityCards);
      handEvaluations.set(player.agentId, evaluation);
    }

    // Find winners
    const { winners, isSplit } = findWinners(handEvaluations);

    // Calculate winnings
    const winnerAmount = isSplit ? Math.floor(state.pot / winners.length) : state.pot;

    state.winners = winners.map(agentId => {
      const evaluation = handEvaluations.get(agentId)!;
      return {
        agentId,
        amount: winnerAmount,
        handRank: evaluation.name,
        cards: cardsToCodes(evaluation.cards),
      };
    });

    state.isHandComplete = true;
  }

  /**
   * Complete the hand and distribute winnings
   */
  async completeHand(): Promise<void> {
    const gameState = await this.loadGameState();
    if (!gameState || !gameState.isHandComplete) {
      return;
    }

    // Update player chips
    for (const winner of gameState.winners || []) {
      const playerIndex = gameState.players.findIndex(p => p.agentId === winner.agentId);
      if (playerIndex >= 0) {
        gameState.players[playerIndex].chips += winner.amount;
      }

      // Update database
      db.prepare(`
        UPDATE table_players SET chips = chips + ? WHERE table_id = ? AND agent_id = ?
      `).run(winner.amount, this.tableId, winner.agentId);
    }

    // Update hand record
    const winnerAgentIds = (gameState.winners || []).map(w => w.agentId);
    db.prepare(`
      UPDATE hands SET
        community_cards = ?,
        hole_cards_json = ?,
        winner_agent_id = ?,
        pot_size = ?,
        current_round = 'showdown',
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      JSON.stringify(cardsToCodes(gameState.communityCards)),
      JSON.stringify(gameState.players.map(p => ({ agentId: p.agentId, cards: cardsToCodes(p.holeCards) }))),
      winnerAgentIds.length === 1 ? winnerAgentIds[0] : null,
      gameState.pot,
      gameState.handId
    );

    // Update table state in Redis
    const tableState = await getTableState(this.tableId);
    if (tableState) {
      // Update player chips in table state
      for (const player of gameState.players) {
        const tablePlayerIndex = tableState.players.findIndex(p => p.agentId === player.agentId);
        if (tablePlayerIndex >= 0) {
          tableState.players[tablePlayerIndex].chips = player.chips;
          if (player.chips === 0) {
            tableState.players[tablePlayerIndex].status = 'eliminated';
          }
        }
      }

      // Move dealer seat
      const activePlayers = tableState.players.filter(p => p.status === 'active' && p.chips > 0);
      if (activePlayers.length > 0) {
        tableState.dealerSeat = this.getNextSeat(tableState.dealerSeat, activePlayers);
      }

      await setTableState(this.tableId, tableState);
    }

    // Clear game state from Redis
    await redis.del(`game:${this.tableId}`);
  }

  /**
   * Get game state for a player (their view)
   */
  async getPlayerGameState(agentId: number): Promise<GameState | null> {
    const gameState = await this.loadGameState();
    if (!gameState) return null;

    // Create player-specific view (their hole cards visible, others hidden)
    const playerState = { ...gameState };
    playerState.players = gameState.players.map(p => ({
      ...p,
      holeCards: p.agentId === agentId ? p.holeCards : [], // Hide other players' cards
    }));

    return playerState;
  }

  /**
   * Save game state to Redis
   */
  private async saveGameState(state: GameState): Promise<void> {
    await redis.set(`game:${this.tableId}`, JSON.stringify(state), 'EX', 3600);
  }

  /**
   * Load game state from Redis
   */
  private async loadGameState(): Promise<GameState | null> {
    const data = await redis.get(`game:${this.tableId}`);
    if (!data) return null;

    const state = JSON.parse(data) as GameState;

    // Parse cards back to Card objects
    state.communityCards = parseCardCodes(
      (state.communityCards as any[]).map(c => c.code || c)
    );
    state.players.forEach(p => {
      p.holeCards = parseCardCodes(
        (p.holeCards as any[]).map(c => c.code || c)
      );
    });
    state.deck = parseCardCodes(
      (state.deck as any[]).map(c => c.code || c)
    );

    return state;
  }

  /**
   * Check if a hand is currently running
   */
  async hasActiveHand(): Promise<boolean> {
    const state = await this.loadGameState();
    return state !== null && !state.isHandComplete;
  }

  /**
   * Get current game state (for spectators)
   */
  async getGameState(): Promise<GameState | null> {
    return this.loadGameState();
  }
}

export default PokerEngine;
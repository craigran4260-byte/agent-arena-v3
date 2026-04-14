/**
 * HandEvaluator - Texas Hold'em Hand Evaluation
 * Evaluates poker hands and determines winners
 */

import { Card, Suit, Rank, get5CardCombinations } from './CardDeck';

// Hand rankings from highest to lowest
export enum HandRank {
  RoyalFlush = 10,
  StraightFlush = 9,
  FourOfAKind = 8,
  FullHouse = 7,
  Flush = 6,
  Straight = 5,
  ThreeOfAKind = 4,
  TwoPair = 3,
  OnePair = 2,
  HighCard = 1,
}

export interface HandEvaluation {
  rank: HandRank;
  score: number; // Higher score = better hand
  name: string; // Display name
  cards: Card[]; // The 5 cards that make the hand
  kickers: Rank[]; // Kicker cards for tie-breaking
}

// Rank values for comparison
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

// Ace-low rank values for straights (A-2-3-4-5)
const RANK_VALUES_LOW: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 1,
};

/**
 * Get the numeric value of a rank
 */
function getRankValue(rank: Rank, aceLow: boolean = false): number {
  return aceLow ? RANK_VALUES_LOW[rank] : RANK_VALUES[rank];
}

/**
 * Sort cards by rank value (descending)
 */
function sortCardsByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
}

/**
 * Count cards by rank
 */
function countByRank(cards: Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  }
  return counts;
}

/**
 * Count cards by suit
 */
function countBySuit(cards: Card[]): Map<Suit, number> {
  const counts = new Map<Suit, number>();
  for (const card of cards) {
    counts.set(card.suit, (counts.get(card.suit) || 0) + 1);
  }
  return counts;
}

/**
 * Check if cards are all the same suit (flush)
 */
function isFlush(cards: Card[]): boolean {
  const suitCounts = countBySuit(cards);
  return suitCounts.size === 1;
}

/**
 * Check if cards form a straight
 */
function isStraight(cards: Card[]): { isStraight: boolean; highCard: Rank; aceLow: boolean } {
  const sorted = sortCardsByRank(cards);
  const values = sorted.map(c => getRankValue(c.rank));

  // Check normal straight (A high)
  let consecutive = true;
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] - 1) {
      consecutive = false;
      break;
    }
  }

  if (consecutive) {
    return { isStraight: true, highCard: sorted[0].rank, aceLow: false };
  }

  // Check ace-low straight (A-2-3-4-5, also known as "wheel")
  const lowValues = sorted.map(c => getRankValue(c.rank, true));
  lowValues.sort((a, b) => b - a);

  consecutive = true;
  for (let i = 1; i < lowValues.length; i++) {
    if (lowValues[i] !== lowValues[i - 1] - 1) {
      consecutive = false;
      break;
    }
  }

  if (consecutive && lowValues.includes(1) && lowValues.includes(5)) {
    return { isStraight: true, highCard: '5', aceLow: true };
  }

  return { isStraight: false, highCard: sorted[0].rank, aceLow: false };
}

/**
 * Evaluate a 5-card hand
 */
function evaluate5CardHand(cards: Card[]): HandEvaluation {
  const rankCounts = countByRank(cards);
  const flush = isFlush(cards);
  const straight = isStraight(cards);

  const sortedByRank = sortCardsByRank(cards);
  const rankValues = sortedByRank.map(c => getRankValue(c.rank, straight.aceLow));

  // Royal Flush: A-K-Q-J-10 of same suit
  if (flush && straight.isStraight && straight.highCard === 'A' && !straight.aceLow) {
    return {
      rank: HandRank.RoyalFlush,
      score: HandRank.RoyalFlush * 1000000,
      name: 'Royal Flush',
      cards: sortedByRank,
      kickers: [],
    };
  }

  // Straight Flush: 5 consecutive cards of same suit
  if (flush && straight.isStraight) {
    const highValue = getRankValue(straight.highCard, straight.aceLow);
    return {
      rank: HandRank.StraightFlush,
      score: HandRank.StraightFlush * 1000000 + highValue * 1000,
      name: 'Straight Flush',
      cards: sortedByRank,
      kickers: [],
    };
  }

  // Four of a Kind
  const fourOfKind = findRankWithCount(rankCounts, 4);
  if (fourOfKind) {
    const kicker = sortedByRank.find(c => c.rank !== fourOfKind)?.rank || 'A';
    return {
      rank: HandRank.FourOfAKind,
      score: HandRank.FourOfAKind * 1000000 + getRankValue(fourOfKind) * 10000 + getRankValue(kicker),
      name: `Four of a Kind (${fourOfKind}s)`,
      cards: sortedByRank,
      kickers: [kicker],
    };
  }

  // Full House: 3 of a kind + pair
  const threeOfKind = findRankWithCount(rankCounts, 3);
  const pair = findRankWithCount(rankCounts, 2);
  if (threeOfKind && pair && rankCounts.size === 2) {
    return {
      rank: HandRank.FullHouse,
      score: HandRank.FullHouse * 1000000 + getRankValue(threeOfKind) * 10000 + getRankValue(pair) * 100,
      name: `Full House (${threeOfKind}s over ${pair}s)`,
      cards: sortedByRank,
      kickers: [],
    };
  }

  // Flush
  if (flush) {
    return {
      rank: HandRank.Flush,
      score: HandRank.Flush * 1000000 + calculateKickerScore(rankValues),
      name: 'Flush',
      cards: sortedByRank,
      kickers: sortedByRank.map(c => c.rank),
    };
  }

  // Straight
  if (straight.isStraight) {
    const highValue = getRankValue(straight.highCard, straight.aceLow);
    return {
      rank: HandRank.Straight,
      score: HandRank.Straight * 1000000 + highValue * 1000,
      name: `Straight (${straight.highCard} high)`,
      cards: sortedByRank,
      kickers: [],
    };
  }

  // Three of a Kind
  if (threeOfKind) {
    const kickers = sortedByRank.filter(c => c.rank !== threeOfKind).map(c => c.rank);
    return {
      rank: HandRank.ThreeOfAKind,
      score: HandRank.ThreeOfAKind * 1000000 + getRankValue(threeOfKind) * 10000 + calculateKickerScore(kickers.map(r => getRankValue(r))),
      name: `Three of a Kind (${threeOfKind}s)`,
      cards: sortedByRank,
      kickers,
    };
  }

  // Two Pair
  const pairs = findAllRanksWithCount(rankCounts, 2);
  if (pairs.length === 2) {
    const sortedPairs = pairs.sort((a, b) => getRankValue(b) - getRankValue(a));
    const kicker = sortedByRank.find(c => !pairs.includes(c.rank))?.rank || 'A';
    return {
      rank: HandRank.TwoPair,
      score: HandRank.TwoPair * 1000000 + getRankValue(sortedPairs[0]) * 10000 + getRankValue(sortedPairs[1]) * 1000 + getRankValue(kicker),
      name: `Two Pair (${sortedPairs[0]}s and ${sortedPairs[1]}s)`,
      cards: sortedByRank,
      kickers: [kicker],
    };
  }

  // One Pair
  if (pair) {
    const kickers = sortedByRank.filter(c => c.rank !== pair).map(c => c.rank);
    return {
      rank: HandRank.OnePair,
      score: HandRank.OnePair * 1000000 + getRankValue(pair) * 10000 + calculateKickerScore(kickers.map(r => getRankValue(r))),
      name: `Pair of ${pair}s`,
      cards: sortedByRank,
      kickers,
    };
  }

  // High Card
  return {
    rank: HandRank.HighCard,
    score: HandRank.HighCard * 1000000 + calculateKickerScore(rankValues),
    name: `High Card (${sortedByRank[0].rank})`,
    cards: sortedByRank,
    kickers: sortedByRank.map(c => c.rank),
  };
}

/**
 * Find a rank with a specific count
 */
function findRankWithCount(rankCounts: Map<Rank, number>, count: number): Rank | null {
  for (const [rank, c] of rankCounts) {
    if (c === count) return rank;
  }
  return null;
}

/**
 * Find all ranks with a specific count
 */
function findAllRanksWithCount(rankCounts: Map<Rank, number>, count: number): Rank[] {
  const ranks: Rank[] = [];
  for (const [rank, c] of rankCounts) {
    if (c === count) ranks.push(rank);
  }
  return ranks;
}

/**
 * Calculate kicker score for tie-breaking
 */
function calculateKickerScore(values: number[]): number {
  let score = 0;
  for (let i = 0; i < values.length; i++) {
    score += values[i] * Math.pow(10, values.length - i - 1);
  }
  return score;
}

/**
 * Evaluate the best hand from 7 cards (2 hole + 5 community)
 * Returns the best 5-card combination
 */
export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandEvaluation {
  const allCards = [...holeCards, ...communityCards];

  if (allCards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate a hand');
  }

  // Get all possible 5-card combinations
  const combinations = get5CardCombinations(allCards);

  // Evaluate each combination and find the best
  let bestHand: HandEvaluation | null = null;

  for (const combo of combinations) {
    const evaluation = evaluate5CardHand(combo);
    if (!bestHand || evaluation.score > bestHand.score) {
      bestHand = evaluation;
    }
  }

  return bestHand!;
}

/**
 * Compare two hands and determine which is better
 * Returns: 1 if hand1 is better, -1 if hand2 is better, 0 if tie
 */
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  if (hand1.score > hand2.score) return 1;
  if (hand1.score < hand2.score) return -1;
  return 0;
}

/**
 * Find the winner(s) among multiple hands
 * Handles ties (split pot)
 */
export function findWinners(
  playerHands: Map<number, HandEvaluation> // agentId -> hand evaluation
): { winners: number[]; isSplit: boolean } {
  const entries = Array.from(playerHands.entries());

  if (entries.length === 0) {
    return { winners: [], isSplit: false };
  }

  // Sort by hand score descending
  entries.sort((a, b) => b[1].score - a[1].score);

  const bestScore = entries[0][1].score;
  const winners = entries.filter(e => e[1].score === bestScore).map(e => e[0]);

  return {
    winners,
    isSplit: winners.length > 1,
  };
}

/**
 * Get a readable description of a hand
 */
export function getHandDescription(evaluation: HandEvaluation): string {
  const cardsDisplay = evaluation.cards.map(c => `${c.rank}${c.suit === 'hearts' ? '♥' : c.suit === 'diamonds' ? '♦' : c.suit === 'clubs' ? '♣' : '♠'}`).join(' ');
  return `${evaluation.name} [${cardsDisplay}]`;
}

export const HandEvaluator = {
  evaluateHand,
  evaluate5CardHand,
  compareHands,
  findWinners,
  getHandDescription,
  HandRank,
};

export default HandEvaluator;
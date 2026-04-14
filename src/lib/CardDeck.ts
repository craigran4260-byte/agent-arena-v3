/**
 * CardDeck - Texas Hold'em Card Deck
 * Handles deck creation, shuffling, and card dealing
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  // String representation for storage/transmission: "Ah" = Ace of hearts, "Td" = Ten of diamonds
  code: string;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Suit symbols for display
const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

// Rank codes (short representation)
const RANK_CODES: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', '10': 'T', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

// Suit codes
const SUIT_CODES: Record<Suit, string> = {
  hearts: 'h',
  diamonds: 'd',
  clubs: 'c',
  spades: 's',
};

/**
 * Create a standard 52-card deck
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        code: `${RANK_CODES[rank]}${SUIT_CODES[suit]}`,
      });
    }
  }

  return deck;
}

/**
 * Shuffle deck using Fisher-Yates algorithm
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Deal n cards from the top of the deck
 * Returns dealt cards and remaining deck
 */
export function dealCards(deck: Card[], count: number): { dealt: Card[]; remaining: Card[] } {
  const dealt = deck.slice(0, count);
  const remaining = deck.slice(count);

  return { dealt, remaining };
}

/**
 * Parse card code string to Card object
 * Example: "Ah" -> { suit: 'hearts', rank: 'A', code: 'Ah' }
 */
export function parseCardCode(code: string): Card | null {
  if (code.length < 2 || code.length > 3) return null;

  const rankPart = code.length === 3 ? code.slice(0, 2) : code[0];
  const suitPart = code.length === 3 ? code[2] : code[1];

  // Map rank code back to rank
  const rankMap: Record<string, Rank> = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
    '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
  };

  const suitMap: Record<string, Suit> = {
    'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades',
  };

  const rank = rankMap[rankPart];
  const suit = suitMap[suitPart];

  if (!rank || !suit) return null;

  return { suit, rank, code };
}

/**
 * Parse multiple card codes
 */
export function parseCardCodes(codes: string[]): Card[] {
  return codes.map(parseCardCode).filter((c): c is Card => c !== null);
}

/**
 * Get display string for a card
 * Example: { suit: 'hearts', rank: 'A' } -> "A♥"
 */
export function cardDisplay(card: Card): string {
  return `${card.rank === '10' ? '10' : card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

/**
 * Get display strings for multiple cards
 */
export function cardsDisplay(cards: Card[]): string[] {
  return cards.map(cardDisplay);
}

/**
 * Convert cards to code strings for storage
 */
export function cardsToCodes(cards: Card[]): string[] {
  return cards.map(c => c.code);
}

/**
 * Create and shuffle a new deck ready for dealing
 */
export function createShuffledDeck(): Card[] {
  return shuffleDeck(createDeck());
}

/**
 * Get all possible 5-card combinations from 7 cards
 * Used for Texas Hold'em hand evaluation (2 hole cards + 5 community cards)
 */
export function get5CardCombinations(cards: Card[]): Card[][] {
  if (cards.length < 5) return [];
  if (cards.length === 5) return [cards];

  const combinations: Card[][] = [];
  const n = cards.length;

  // Generate all combinations of 5 cards from n cards
  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            combinations.push([cards[i], cards[j], cards[k], cards[l], cards[m]]);
          }
        }
      }
    }
  }

  return combinations;
}

export const CardDeck = {
  createDeck,
  shuffleDeck,
  dealCards,
  parseCardCode,
  parseCardCodes,
  cardDisplay,
  cardsDisplay,
  cardsToCodes,
  createShuffledDeck,
  get5CardCombinations,
};

export default CardDeck;
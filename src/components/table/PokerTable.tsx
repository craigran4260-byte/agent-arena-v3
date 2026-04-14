'use client';

import { PlayerPosition } from './PlayerPosition';
import { PlayingCard } from './PlayingCard';
import styles from './PokerTable.module.css';

interface Player {
  seatNumber: number;
  agentName?: string;
  agentId?: number;
  chips: number;
  action?: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  isActive?: boolean;
  avatarUrl?: string;
  currentBet?: number;
  cards?: { suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'; rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' }[];
  isWinner?: boolean;
  isEliminated?: boolean;
}

interface CommunityCard {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
}

interface PokerTableProps {
  players: Player[];
  dealerButton?: number;
  smallBlindSeat?: number;
  bigBlindSeat?: number;
  potTotal?: number;
  communityCards?: CommunityCard[];
  currentRound?: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  animateChips?: boolean;
  winnerSeat?: number;
  showDelayIndicator?: boolean;
  delaySeconds?: number;
}

// Chip colors based on value
const CHIP_COLORS: Record<number, string> = {
  1: 'white',
  5: 'red',
  10: 'blue',
  25: 'green',
  100: 'gold',
};

export const PokerTable = ({
  players,
  dealerButton,
  smallBlindSeat,
  bigBlindSeat,
  potTotal = 0,
  communityCards = [],
  currentRound = 'preflop',
  animateChips = false,
  winnerSeat,
  showDelayIndicator = false,
  delaySeconds = 30,
}: PokerTableProps) => {
  // Get player at specific seat
  const getPlayerAtSeat = (seatNumber: number) => {
    return players.find(p => p.seatNumber === seatNumber);
  };

  // Generate chip pile representation for pot
  const generateChipsForPot = (amount: number) => {
    const chips: { value: number; color: string }[] = [];
    let remaining = amount;
    const chipValues = [100, 25, 10, 5, 1];

    for (const value of chipValues) {
      while (remaining >= value) {
        chips.push({ value, color: CHIP_COLORS[value] || 'gold' });
        remaining -= value;
        if (chips.length >= 15) break; // Limit visual chips
      }
    }

    return chips;
  };

  // Calculate chip fly direction based on seat position
  const getChipFlyDirection = (seatNumber: number): number => {
    // Map seat numbers to X offset for animation
    const directions: Record<number, number> = {
      1: 0,    // Bottom center - no offset
      2: 80,   // Bottom right - fly from right
      3: 100,  // Right side
      4: 60,   // Upper right
      5: 30,   // Top right
      6: -30,  // Top left
      7: -60,  // Upper left
      8: -100, // Left side
      9: -80,  // Bottom left - fly from left
    };
    return directions[seatNumber] || 0;
  };

  const potChips = generateChipsForPot(potTotal);
  const isPotLarge = potTotal >= 5000;

  // Determine card animation type based on round
  const getCardAnimationType = (index: number): 'deal' | 'flip' | 'reveal' => {
    if (currentRound === 'showdown') return 'reveal';
    if (currentRound === 'flop' && index < 3) return 'deal';
    return 'flip';
  };

  // Seat positions around table (1-9, clockwise from dealer)
  const seatPositions = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className={styles.container}>
      <div className={styles.tableWrapper}>
        <div className={styles.table}>
          {/* Delay indicator for spectator mode */}
          {showDelayIndicator && (
            <div className={styles.delayIndicator}>
              <span className={styles.delayClock}>⏱</span>
              <span>{delaySeconds}s delay</span>
            </div>
          )}

          {/* Pot display at center */}
          <div className={`${styles.potDisplay} ${isPotLarge ? styles.potLarge : ''}`}>
            <div className={styles.potLabel}>Pot</div>
            <div className={styles.potValue}>{potTotal.toLocaleString()}</div>
            {/* Chip pile visualization */}
            {potTotal > 0 && (
              <div className={styles.chipPile}>
                {potChips.map((chip, index) => {
                  // Find the player who bet most recently for animation direction
                  const lastBettingPlayer = players.find(p => (p.currentBet ?? 0) > 0);
                  const flyX = lastBettingPlayer ? getChipFlyDirection(lastBettingPlayer.seatNumber) : 0;

                  return (
                    <div
                      key={index}
                      className={`${styles.chip} ${styles[chip.color]} ${animateChips ? styles.chipFlyIn : ''}`}
                      style={{
                        animationDelay: `${index * 60}ms`,
                        // CSS custom property for fly direction
                        ...(animateChips && { '--chip-start-x': `${flyX}px` } as React.CSSProperties),
                      }}
                    >
                      {chip.value >= 100 ? chip.value : ''}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Community cards */}
          {communityCards.length > 0 && (
            <div className={styles.communityCards}>
              {communityCards.map((card, index) => (
                <div
                  key={index}
                  className={styles.cardSlot}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <PlayingCard
                    suit={card.suit}
                    rank={card.rank}
                    size="sm"
                    animate={true}
                    animationType={getCardAnimationType(index)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Round indicator */}
          {currentRound !== 'preflop' && (
            <div className={styles.roundIndicator}>
              {currentRound.toUpperCase()}
            </div>
          )}

          {/* Player positions around the table */}
          {seatPositions.map(seat => {
            const player = getPlayerAtSeat(seat);
            const isDealerButton = dealerButton === seat;
            const isSmallBlind = smallBlindSeat === seat;
            const isBigBlind = bigBlindSeat === seat;
            const isWinner = winnerSeat === seat || player?.isWinner;

            return (
              <div
                key={seat}
                className={`${styles.playerSlot} ${styles[`seat${seat}`]}`}
              >
                {player ? (
                  <PlayerPosition
                    agentName={player.agentName || `Agent ${player.seatNumber}`}
                    chips={player.chips}
                    action={player.action}
                    isActive={player.isActive}
                    isDealerButton={isDealerButton}
                    isSmallBlind={isSmallBlind}
                    isBigBlind={isBigBlind}
                    avatarUrl={player.avatarUrl}
                    currentBet={player.currentBet}
                    cards={player.cards}
                    animateBet={animateChips && (player.currentBet ?? 0) > 0}
                    isWinner={isWinner}
                    isEliminated={player.isEliminated}
                    flyDirection={getChipFlyDirection(seat)}
                  />
                ) : (
                  <div className={styles.emptySlot}>
                    <div className={styles.seatNumber}>Seat {seat}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
'use client';

import { Avatar } from '@/components/ui';
import { ShieldIcon } from '@/components/icons';
import { PlayingCard } from './PlayingCard';
import styles from './PlayerPosition.module.css';

interface PlayerPositionProps {
  agentName: string;
  chips: number;
  action?: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  isActive?: boolean;
  isDealerButton?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  avatarUrl?: string;
  currentBet?: number;
  cards?: { suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'; rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' }[];
  animateBet?: boolean;
  isWinner?: boolean;
  isEliminated?: boolean;
  flyDirection?: number;
}

export const PlayerPosition = ({
  agentName,
  chips,
  action,
  isActive,
  isDealerButton,
  isSmallBlind,
  isBigBlind,
  avatarUrl,
  currentBet = 0,
  cards,
  animateBet = false,
  isWinner = false,
  isEliminated = false,
  flyDirection = 0,
}: PlayerPositionProps) => {
  const getActionColor = () => {
    switch (action) {
      case 'fold':
        return styles.actionFold;
      case 'check':
        return styles.actionCheck;
      case 'call':
        return styles.actionCall;
      case 'raise':
        return styles.actionRaise;
      case 'all-in':
        return styles.actionAllIn;
      default:
        return '';
    }
  };

  // Determine container class based on state
  const getContainerClass = () => {
    const classes = [styles.container];
    if (isActive) classes.push(styles.active);
    if (isWinner) classes.push(styles.winner);
    if (isEliminated) classes.push(styles.eliminated);
    return classes.join(' ');
  };

  return (
    <div className={getContainerClass()}>
      {/* Dealer Button */}
      {isDealerButton && (
        <div className={styles.dealerButton}>D</div>
      )}

      {/* Blind Indicator */}
      {(isSmallBlind || isBigBlind) && (
        <div className={`${styles.blindBadge} ${isBigBlind ? styles.bigBlind : styles.smallBlind}`}>
          {isBigBlind ? 'BB' : 'SB'}
        </div>
      )}

      {/* Player Avatar and Info */}
      <div className={styles.playerInfo}>
        <Avatar
          name={agentName}
          src={avatarUrl}
          size="md"
        />
        <div className={styles.nameSection}>
          <div className={styles.name}>{agentName}</div>
          <div
            className={`${styles.chips} ${isWinner ? styles.chipsChange : ''} ${isEliminated ? styles.chipsDecrease : ''}`}
          >
            {chips.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Player cards */}
      {cards && cards.length > 0 && (
        <div className={styles.playerCards}>
          {cards.map((card, index) => (
            <div
              key={index}
              className={`${styles.cardWrapper} ${isWinner ? styles.cardWinnerWrapper : ''}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <PlayingCard
                suit={card.suit}
                rank={card.rank}
                size="sm"
                animate={true}
                animationType={isWinner ? 'reveal' : 'deal'}
              />
            </div>
          ))}
        </div>
      )}

      {/* Current Bet Display with fly animation */}
      {currentBet > 0 && (
        <div
          className={`${styles.betDisplay} ${animateBet ? styles.betAnimating : ''}`}
          style={{
            ...(animateBet && { '--fly-x': `${flyDirection}px` } as React.CSSProperties),
          }}
        >
          <span className={styles.betLabel}>Bet</span>
          <span className={styles.betValue}>{currentBet.toLocaleString()}</span>
          {/* Animated bet chips */}
          {animateBet && (
            <div className={styles.betChipsAnimation}>
              {[5, 10, 25].slice(0, Math.min(3, Math.ceil(currentBet / 100))).map((val, i) => (
                <div
                  key={i}
                  className={styles.betChipFly}
                  style={{
                    '--fly-x': `${flyDirection}px`,
                    animationDelay: `${i * 100}ms`,
                  } as React.CSSProperties}
                >
                  💰
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Label */}
      {action && (
        <div className={`${styles.actionLabel} ${getActionColor()}`}>
          {action === 'all-in' ? (
            <>
              <ShieldIcon size={12} />
              All-In
            </>
          ) : (
            action.charAt(0).toUpperCase() + action.slice(1)
          )}
        </div>
      )}

      {/* Active Indicator */}
      {isActive && !isWinner && (
        <div className={styles.activeIndicator} />
      )}

      {/* Winner Trophy */}
      {isWinner && (
        <div className={styles.winnerTrophy}>🏆</div>
      )}
    </div>
  );
};
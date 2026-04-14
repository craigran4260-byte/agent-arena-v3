'use client';

import { Avatar } from '@/components/ui';
import { ChipIcon, ShieldIcon } from '@/components/icons';
import styles from './PlayerPosition.module.css';

interface PlayerPositionProps {
  agentName: string;
  chips: number;
  currentBet?: number; // V3: Current round bet amount
  action?: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  isActive?: boolean;
  isDealerButton?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  positionName?: string; // V3: Poker position (BTN, SB, BB, UTG, etc.)
  avatarUrl?: string;
  isFolded?: boolean;
  isAllIn?: boolean;
}

export const PlayerPosition = ({
  agentName,
  chips,
  currentBet = 0,
  action,
  isActive,
  isDealerButton,
  isSmallBlind,
  isBigBlind,
  positionName,
  avatarUrl,
  isFolded,
  isAllIn,
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

  // Determine position badge to show
  const getPositionBadge = () => {
    // Show explicit position name first (V3)
    if (positionName) {
      return positionName;
    }
    // Fall back to blind/dealer indicators
    if (isDealerButton) return 'BTN';
    if (isSmallBlind) return 'SB';
    if (isBigBlind) return 'BB';
    return null;
  };

  const positionBadge = getPositionBadge();

  return (
    <div className={`${styles.container} ${isActive ? styles.active : ''} ${isFolded ? styles.folded : ''}`}>
      {/* Position Badge (BTN, SB, BB, UTG, etc.) */}
      {positionBadge && (
        <div className={`${styles.positionBadge} ${isDealerButton ? styles.button : ''} ${isSmallBlind ? styles.smallBlind : ''} ${isBigBlind ? styles.bigBlind : ''}`}>
          {positionBadge}
        </div>
      )}

      {/* Dealer Button Chip */}
      {isDealerButton && (
        <div className={styles.dealerChip}>
          D
        </div>
      )}

      {/* Player Avatar and Info */}
      <div className={styles.playerInfo}>
        <Avatar
          name={agentName}
          src={avatarUrl}
          size="md"
          className={isFolded ? styles.avatarFolded : ''}
        />
        <div className={styles.nameSection}>
          <div className={styles.name}>{agentName}</div>
          <div className={styles.chipsRow}>
            <ChipIcon size={14} />
            <span className={styles.chips}>{chips.toLocaleString()}</span>
          </div>
          {/* V3: Current bet amount */}
          {currentBet > 0 && !isFolded && (
            <div className={styles.currentBet}>
              Bet: {currentBet.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Action Label */}
      {action && !isFolded && (
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

      {/* All-in indicator */}
      {isAllIn && (
        <div className={styles.allInBadge}>
          ALL IN
        </div>
      )}

      {/* Active Indicator */}
      {isActive && !isFolded && (
        <div className={styles.activeIndicator} />
      )}

      {/* Folded overlay */}
      {isFolded && (
        <div className={styles.foldedOverlay}>
          FOLDED
        </div>
      )}
    </div>
  );
};
'use client';

import styles from './PlayingCard.module.css';

interface PlayingCardProps {
  suit?: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank?: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  animationType?: 'deal' | 'flip' | 'reveal';
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  hearts: '#EF4444',
  diamonds: '#EF4444',
  clubs: '#000',
  spades: '#000',
};

export const PlayingCard = ({
  suit = 'spades',
  rank = 'A',
  faceDown = false,
  size = 'md',
  animate = false,
  animationType = 'deal',
}: PlayingCardProps) => {
  const suitSymbol = SUIT_SYMBOLS[suit];
  const suitColor = SUIT_COLORS[suit];

  const getAnimationClass = () => {
    if (!animate) return '';
    switch (animationType) {
      case 'deal':
        return styles.dealAnimation;
      case 'flip':
        return styles.flipAnimation;
      case 'reveal':
        return styles.revealAnimation;
      default:
        return styles.dealAnimation;
    }
  };

  return (
    <div className={`${styles.card} ${styles[size]} ${faceDown ? styles.faceDown : ''} ${getAnimationClass()}`}>
      {faceDown ? (
        <div className={styles.cardBack}>
          <div className={styles.backPattern} />
        </div>
      ) : (
        <div className={styles.cardFront}>
          {/* Top-left corner */}
          <div className={styles.corner} style={{ color: suitColor }}>
            <div className={styles.rank}>{rank}</div>
            <div className={styles.suit}>{suitSymbol}</div>
          </div>

          {/* Center - Large suit symbol */}
          <div className={styles.centerSuit} style={{ color: suitColor }}>
            {suitSymbol}
          </div>

          {/* Bottom-right corner (rotated) */}
          <div className={styles.cornerFlipped} style={{ color: suitColor }}>
            <div className={styles.rank}>{rank}</div>
            <div className={styles.suit}>{suitSymbol}</div>
          </div>
        </div>
      )}
    </div>
  );
};

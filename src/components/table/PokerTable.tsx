'use client';

import { useMemo } from 'react';
import { PlayerPosition } from './PlayerPosition';
import { getPositionName } from '@/lib/HandActionService';
import styles from './PokerTable.module.css';

interface Player {
  seatNumber: number;
  agentName?: string;
  agentId?: number;
  chips: number;
  currentBet?: number; // V3: Current round bet
  action?: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  isActive?: boolean;
  avatarUrl?: string;
  isFolded?: boolean;
  isAllIn?: boolean;
}

interface PokerTableProps {
  players: Player[];
  dealerButton?: number;
  smallBlindSeat?: number;
  bigBlindSeat?: number;
  potTotal?: number;
  totalSeats?: number; // V3: Number of seats (default 9)
}

export const PokerTable = ({
  players,
  dealerButton,
  smallBlindSeat,
  bigBlindSeat,
  potTotal = 0,
  totalSeats = 9,
}: PokerTableProps) => {
  // Calculate poker position names for each player
  const playersWithPositions = useMemo(() => {
    if (!dealerButton) return players;

    return players.map(player => ({
      ...player,
      positionName: getPositionName(player.seatNumber, dealerButton, totalSeats)
    }));
  }, [players, dealerButton, totalSeats]);

  // Get player at specific seat
  const getPlayerAtSeat = (seatNumber: number) => {
    return playersWithPositions.find(p => p.seatNumber === seatNumber);
  };

  // Seat positions around table (1-9, clockwise from dealer)
  const seatPositions = Array.from({ length: totalSeats }, (_, i) => i + 1);

  // Check if a seat is folded
  const isSeatFolded = (seat: number) => {
    const player = getPlayerAtSeat(seat);
    return player?.action === 'fold' || player?.isFolded;
  };

  return (
    <div className={styles.container}>
      <div className={styles.tableWrapper}>
        <div className={styles.table}>
          {/* Pot display at center */}
          <div className={styles.potDisplay}>
            <div className={styles.potLabel}>Pot</div>
            <div className={styles.potValue}>{potTotal.toLocaleString()}</div>
          </div>

          {/* Delay indicator for spectators */}
          <div className={styles.delayIndicator}>
            <span className={styles.delayBadge}>30s Delay</span>
            <span className={styles.delayText}>Anti-cheat spectator mode</span>
          </div>

          {/* Player positions around the table */}
          {seatPositions.map(seat => {
            const player = getPlayerAtSeat(seat);
            const isDealerButton = dealerButton === seat;
            const isSmallBlind = smallBlindSeat === seat;
            const isBigBlind = bigBlindSeat === seat;

            return (
              <div
                key={seat}
                className={`${styles.playerSlot} ${styles[`seat${seat}`]} ${isSeatFolded(seat) ? styles.seatFolded : ''}`}
              >
                {player ? (
                  <PlayerPosition
                    agentName={player.agentName || `Agent ${player.seatNumber}`}
                    chips={player.chips}
                    currentBet={player.currentBet}
                    action={player.action}
                    isActive={player.isActive}
                    isDealerButton={isDealerButton}
                    isSmallBlind={isSmallBlind}
                    isBigBlind={isBigBlind}
                    positionName={player.positionName}
                    avatarUrl={player.avatarUrl}
                    isFolded={player.isFolded || player.action === 'fold'}
                    isAllIn={player.isAllIn || player.action === 'all-in'}
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
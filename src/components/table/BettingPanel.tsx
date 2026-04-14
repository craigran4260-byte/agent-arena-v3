'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { ChipIcon } from '@/components/icons';
import styles from './BettingPanel.module.css';

interface BettingPanelProps {
  spectatorChips: number;
  onPlaceBet?: (amount: number) => Promise<void>;
  isLoading?: boolean;
  minBet?: number;
  maxBet?: number;
}

export const BettingPanel = ({
  spectatorChips,
  onPlaceBet,
  isLoading = false,
  minBet = 10,
  maxBet = 1000,
}: BettingPanelProps) => {
  const [betAmount, setBetAmount] = useState(minBet.toString());
  const [betError, setBetError] = useState('');

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBetAmount(e.target.value);
    setBetError('');
  };

  const placeBet = async () => {
    const amount = parseInt(betAmount, 10);

    if (isNaN(amount) || amount < minBet) {
      setBetError(`Minimum bet is ${minBet}`);
      return;
    }

    if (amount > maxBet) {
      setBetError(`Maximum bet is ${maxBet}`);
      return;
    }

    if (amount > spectatorChips) {
      setBetError('Insufficient chips');
      return;
    }

    try {
      await onPlaceBet?.(amount);
      setBetAmount(minBet.toString());
      setBetError('');
    } catch (error) {
      setBetError('Failed to place bet');
    }
  };

  const handleQuickBet = (percentage: number) => {
    const amount = Math.floor(spectatorChips * percentage);
    setBetAmount(Math.min(amount, maxBet).toString());
    setBetError('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ChipIcon size={20} />
        <h3 className={styles.title}>Betting Panel</h3>
      </div>

      <div className={styles.content}>
        {/* Spectator Chips Balance */}
        <div className={styles.balanceSection}>
          <span className={styles.balanceLabel}>Your Chips</span>
          <div className={styles.balanceValue}>
            {spectatorChips.toLocaleString()}
          </div>
        </div>

        {/* Bet Amount Input */}
        <Input
          label="Bet Amount"
          type="number"
          value={betAmount}
          onChange={handleBetChange}
          min={minBet}
          max={maxBet}
          error={betError}
        />

        {/* Quick Bet Buttons */}
        <div className={styles.quickBets}>
          <button
            className={styles.quickBetBtn}
            onClick={() => handleQuickBet(0.25)}
          >
            25%
          </button>
          <button
            className={styles.quickBetBtn}
            onClick={() => handleQuickBet(0.5)}
          >
            50%
          </button>
          <button
            className={styles.quickBetBtn}
            onClick={() => handleQuickBet(0.75)}
          >
            75%
          </button>
          <button
            className={styles.quickBetBtn}
            onClick={() => handleQuickBet(1)}
          >
            All In
          </button>
        </div>

        {/* Bet Stats */}
        <div className={styles.betStats}>
          <div className={styles.statRow}>
            <span>Potential Payout</span>
            <span className={styles.statValue}>
              {(parseInt(betAmount || '0', 10) * 2).toLocaleString()}
            </span>
          </div>
          <div className={styles.statRow}>
            <span>Remaining Chips</span>
            <span className={styles.statValue}>
              {Math.max(0, spectatorChips - parseInt(betAmount || '0', 10)).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Place Bet Button */}
        <Button
          variant="primary"
          fullWidth
          loading={isLoading}
          onClick={placeBet}
        >
          Place Bet
        </Button>
      </div>
    </div>
  );
};

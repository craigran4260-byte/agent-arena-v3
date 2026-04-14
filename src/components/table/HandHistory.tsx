'use client';

import { ChartIcon } from '@/components/icons';
import styles from './HandHistory.module.css';

interface Action {
  timestamp: number;
  playerName: string;
  action: string;
  amount?: number;
}

interface HandHistoryProps {
  actions: Action[];
  isLoading?: boolean;
}

export const HandHistory = ({ actions, isLoading = false }: HandHistoryProps) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return '';
    return amount.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <ChartIcon size={20} />
          <h3 className={styles.title}>Hand History</h3>
        </div>
        <div className={styles.loading}>Loading actions...</div>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <ChartIcon size={20} />
          <h3 className={styles.title}>Hand History</h3>
        </div>
        <div className={styles.empty}>
          <p>No actions yet in this hand</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ChartIcon size={20} />
        <h3 className={styles.title}>Hand History</h3>
      </div>

      <div className={styles.actionsList}>
        {actions.map((action, idx) => (
          <div key={idx} className={styles.actionItem}>
            <div className={styles.timestamp}>
              {formatTime(action.timestamp)}
            </div>
            <div className={styles.actionText}>
              <span className={styles.playerName}>{action.playerName}</span>
              <span className={styles.actionName}>{action.action}</span>
              {action.amount && (
                <span className={styles.amount}>
                  {formatAmount(action.amount)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

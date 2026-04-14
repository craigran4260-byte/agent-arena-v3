'use client';

import { Card } from '@/components/ui';
import { ChartIcon, TrophyIcon } from '@/components/icons';
import styles from './PerformanceStats.module.css';

interface PerformanceStatsProps {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  avgChipsPerGame?: number;
  longestWinStreak?: number;
}

export const PerformanceStats = ({
  totalGames,
  totalWins,
  totalLosses,
  winRate,
  avgChipsPerGame = 0,
  longestWinStreak = 0,
}: PerformanceStatsProps) => {
  const stats = [
    {
      label: 'Total Games',
      value: totalGames.toLocaleString(),
      icon: <ChartIcon size={20} />,
      color: 'primary',
    },
    {
      label: 'Total Wins',
      value: totalWins.toLocaleString(),
      icon: <TrophyIcon size={20} />,
      color: 'success',
    },
    {
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      icon: <ChartIcon size={20} />,
      color: 'gold',
    },
    {
      label: 'Total Losses',
      value: totalLosses.toLocaleString(),
      icon: <ChartIcon size={20} />,
      color: 'default',
    },
    {
      label: 'Avg Chips/Game',
      value: avgChipsPerGame.toLocaleString(),
      icon: <ChartIcon size={20} />,
      color: 'default',
    },
    {
      label: 'Best Streak',
      value: longestWinStreak.toString(),
      icon: <TrophyIcon size={20} />,
      color: 'gold',
    },
  ];

  return (
    <Card variant="glass" padding="lg" className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Performance Stats</h2>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={`${styles.stat} ${styles[stat.color]}`}>
            <div className={styles.iconWrapper}>{stat.icon}</div>
            <div className={styles.label}>{stat.label}</div>
            <div className={styles.value}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Win/Loss Ratio</span>
          <span className={styles.ratio}>
            {totalWins}:{totalLosses}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span>Games This Month</span>
          <span className={styles.monthGames}>
            {Math.floor(totalGames / 4)} (avg per week)
          </span>
        </div>
      </div>
    </Card>
  );
};

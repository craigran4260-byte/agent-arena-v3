'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { TrophyIcon, ChartIcon } from '@/components/icons';
import styles from './ComparePanel.module.css';

interface Agent {
  id: number;
  name: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
}

interface ComparePanelProps {
  agent1: Agent;
  agent2: Agent;
  onClose?: () => void;
}

export const ComparePanel = ({ agent1, agent2, onClose }: ComparePanelProps) => {
  const getWinnerClass = (value1: number, value2: number) => {
    if (value1 > value2) return styles.winner;
    if (value1 < value2) return styles.loser;
    return '';
  };

  const stats = [
    {
      label: 'Win Rate',
      agent1: `${agent1.winRate}%`,
      agent2: `${agent2.winRate}%`,
      value1: agent1.winRate,
      value2: agent2.winRate,
    },
    {
      label: 'Total Wins',
      agent1: agent1.wins.toLocaleString(),
      agent2: agent2.wins.toLocaleString(),
      value1: agent1.wins,
      value2: agent2.wins,
    },
    {
      label: 'Games Played',
      agent1: agent1.gamesPlayed.toLocaleString(),
      agent2: agent2.gamesPlayed.toLocaleString(),
      value1: agent1.gamesPlayed,
      value2: agent2.gamesPlayed,
    },
    {
      label: 'Total Losses',
      agent1: agent1.losses.toLocaleString(),
      agent2: agent2.losses.toLocaleString(),
      value1: agent1.losses,
      value2: agent2.losses,
      inverse: true,
    },
  ];

  return (
    <Card variant="glass" padding="lg" className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Agent Comparison</h2>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        )}
      </div>

      {/* Agent Names */}
      <div className={styles.agentNames}>
        <div className={styles.agentName1}>{agent1.name}</div>
        <div className={styles.vs}>VS</div>
        <div className={styles.agentName2}>{agent2.name}</div>
      </div>

      {/* Stats Comparison */}
      <div className={styles.statsContainer}>
        {stats.map((stat) => {
          const winner1 = stat.inverse
            ? stat.value1 < stat.value2
            : stat.value1 > stat.value2;
          const winner2 = stat.inverse
            ? stat.value1 > stat.value2
            : stat.value1 < stat.value2;

          return (
            <div key={stat.label} className={styles.statRow}>
              <div className={`${styles.statValue} ${winner1 ? styles.winner : ''}`}>
                <span className={styles.value}>{stat.agent1}</span>
              </div>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={`${styles.statValue} ${winner2 ? styles.winner : ''}`}>
                <span className={styles.value}>{stat.agent2}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <ChartIcon size={16} />
          <span>
            {agent1.winRate > agent2.winRate
              ? `${agent1.name} has better win rate`
              : agent1.winRate < agent2.winRate
              ? `${agent2.name} has better win rate`
              : 'Equal win rates'}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <TrophyIcon size={16} />
          <span>
            {agent1.wins > agent2.wins
              ? `${agent1.name} has more wins`
              : agent1.wins < agent2.wins
              ? `${agent2.name} has more wins`
              : 'Equal wins'}
          </span>
        </div>
      </div>
    </Card>
  );
};

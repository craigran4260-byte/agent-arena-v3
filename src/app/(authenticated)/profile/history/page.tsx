'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { Card, Button, DataTable, Skeleton, useToast } from '@/components/ui';
import { ChartIcon } from '@/components/icons';
import styles from './page.module.css';

interface GameHistory {
  id: number;
  tableId: number;
  agentName: string;
  result: 'win' | 'loss' | 'fold';
  chipsWon: number;
  chipsLost: number;
  duration: number; // in seconds
  createdAt: string;
}

export default function GameHistoryPage() {
  const { addToast } = useToast();
  const [games, setGames] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'win' | 'loss'>('all');

  useEffect(() => {
    fetchGameHistory();
  }, [filter]);

  const fetchGameHistory = async () => {
    try {
      setLoading(true);
      const query = filter !== 'all' ? `?result=${filter}` : '';
      const res = await fetch(`/api/users/history${query}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setGames(data);
    } catch (error: any) {
      addToast('Failed to load game history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredGames = games.filter(g => filter === 'all' || g.result === filter);

  const columns = [
    {
      key: 'createdAt',
      label: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'agentName',
      label: 'Agent',
      render: (value: string) => <span className={styles.agentName}>{value}</span>,
    },
    {
      key: 'result',
      label: 'Result',
      render: (value: 'win' | 'loss' | 'fold') => (
        <span className={`${styles.result} ${styles[value]}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'chipsWon',
      label: 'Chips Won',
      render: (value: number) => (
        <span className={styles.chipsWon}>{value.toLocaleString()}</span>
      ),
    },
    {
      key: 'chipsLost',
      label: 'Chips Lost',
      render: (value: number) => (
        <span className={styles.chipsLost}>{value.toLocaleString()}</span>
      ),
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (value: number) => {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${minutes}m ${seconds}s`;
      },
    },
  ];

  if (loading && games.length === 0) {
    return (
      <>
        <Header title="Game History" showBackButton />
        <div className={styles.container}>
          <Skeleton width="100%" height="400px" variant="rect" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Game History"
        subtitle={`Total games: ${games.length}`}
        showBackButton
      />

      <div className={styles.container}>
        {/* Filter Buttons */}
        <div className={styles.filters}>
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            onClick={() => setFilter('all')}
          >
            All Games ({games.length})
          </Button>
          <Button
            variant={filter === 'win' ? 'primary' : 'secondary'}
            onClick={() => setFilter('win')}
          >
            Wins ({games.filter(g => g.result === 'win').length})
          </Button>
          <Button
            variant={filter === 'loss' ? 'primary' : 'secondary'}
            onClick={() => setFilter('loss')}
          >
            Losses ({games.filter(g => g.result === 'loss').length})
          </Button>
        </div>

        {/* Game History Table */}
        <Card variant="glass" padding="lg">
          {filteredGames.length === 0 ? (
            <div className={styles.emptyState}>
              <ChartIcon size={48} />
              <p>No games yet</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredGames}
              loading={loading}
            />
          )}
        </Card>

        {/* Stats Summary */}
        {games.length > 0 && (
          <div className={styles.summary}>
            <Card variant="glass" padding="lg">
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Total Chips Won</div>
                  <div className={styles.summaryValue}>
                    {games.reduce((sum, g) => sum + g.chipsWon, 0).toLocaleString()}
                  </div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Total Chips Lost</div>
                  <div className={styles.summaryValue}>
                    {games.reduce((sum, g) => sum + g.chipsLost, 0).toLocaleString()}
                  </div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Net Chips</div>
                  <div className={`${styles.summaryValue} ${styles.net}`}>
                    {(games.reduce((sum, g) => sum + g.chipsWon - g.chipsLost, 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

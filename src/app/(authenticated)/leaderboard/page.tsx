'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout';
import { Card, DataTable, Input, useToast, Skeleton, Button } from '@/components/ui';
import { ComparePanel } from '@/components/leaderboard';
import { TrophyIcon } from '@/components/icons';
import styles from './page.module.css';

interface LeaderboardEntry {
  id: number;
  rank: number;
  name: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
}

type SortBy = 'winRate' | 'gamesPlayed' | 'wins';

export default function LeaderboardPage() {
  const { addToast } = useToast();
  const [agents, setAgents] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('winRate');
  const [compareAgents, setCompareAgents] = useState<[number, number] | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leaderboard?sortBy=${sortBy}&limit=100`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAgents(data);
    } catch (error: any) {
      addToast('Failed to load leaderboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      try {
        const res = await fetch(`/api/leaderboard?search=${encodeURIComponent(value)}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setAgents(data);
      } catch (error: any) {
        addToast('Search failed', 'error');
      }
    } else {
      fetchLeaderboard();
    }
  };

  const handleCompareClick = (agentId: number) => {
    const newSelected = selectedForCompare.includes(agentId)
      ? selectedForCompare.filter(id => id !== agentId)
      : [...selectedForCompare, agentId];

    setSelectedForCompare(newSelected);

    if (newSelected.length === 2) {
      setCompareAgents([newSelected[0], newSelected[1]]);
      setSelectedForCompare([]);
    } else if (newSelected.length === 0) {
      setCompareAgents(null);
    }
  };

  const columns = [
    {
      key: 'rank',
      label: 'Rank',
      render: (value: number) => (
        <div className={styles.rankCell}>
          {value === 1 && <span className={styles.medal}>🥇</span>}
          {value === 2 && <span className={styles.medal}>🥈</span>}
          {value === 3 && <span className={styles.medal}>🥉</span>}
          {value > 3 && <span className={styles.rank}># {value}</span>}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Agent Name',
      render: (value: string) => <span className={styles.agentName}>{value}</span>,
    },
    {
      key: 'winRate',
      label: 'Win Rate',
      render: (value: number) => <span className={styles.winRate}>{value.toFixed(1)}%</span>,
    },
    {
      key: 'wins',
      label: 'Wins',
      render: (value: number) => <span className={styles.wins}>{value.toLocaleString()}</span>,
    },
    {
      key: 'losses',
      label: 'Losses',
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: 'gamesPlayed',
      label: 'Games',
      render: (value: number) => value.toLocaleString(),
    },
    {
      key: 'id',
      label: 'Action',
      render: (value: number) => (
        <Button
          variant={selectedForCompare.includes(value) ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => handleCompareClick(value)}
        >
          {selectedForCompare.includes(value) ? '✓' : 'Compare'}
        </Button>
      ),
    },
  ];

  if (loading && agents.length === 0) {
    return (
      <>
        <Header title="Agent Leaderboard" showBackButton />
        <div className={styles.container}>
          <Skeleton width="100%" height="120px" variant="rect" />
          <Skeleton width="100%" height="400px" variant="rect" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Agent Leaderboard" showBackButton />

      <div className={styles.container}>
        {/* Controls */}
        <div className={styles.controls}>
          <Input
            placeholder="Search agents by name..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <div className={styles.sortButtons}>
            <Button
              variant={sortBy === 'winRate' ? 'primary' : 'secondary'}
              onClick={() => setSortBy('winRate')}
            >
              By Win Rate
            </Button>
            <Button
              variant={sortBy === 'wins' ? 'primary' : 'secondary'}
              onClick={() => setSortBy('wins')}
            >
              By Wins
            </Button>
            <Button
              variant={sortBy === 'gamesPlayed' ? 'primary' : 'secondary'}
              onClick={() => setSortBy('gamesPlayed')}
            >
              By Games
            </Button>
          </div>
        </div>

        {/* Leaderboard */}
        <Card variant="glass" padding="lg">
          {agents.length === 0 ? (
            <div className={styles.emptyState}>
              <TrophyIcon size={48} />
              <p>No agents found</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={agents}
              loading={loading}
            />
          )}
        </Card>

        {/* Compare Panel */}
        {compareAgents && (
          <div className={styles.compareSection}>
            <ComparePanel
              agent1={agents.find(a => a.id === compareAgents[0])!}
              agent2={agents.find(a => a.id === compareAgents[1])!}
              onClose={() => setCompareAgents(null)}
            />
          </div>
        )}
      </div>
    </>
  );
}

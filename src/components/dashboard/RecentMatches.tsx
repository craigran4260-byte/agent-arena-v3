'use client';

import Link from 'next/link';
import { Card, DataTable, Badge } from '@/components/ui';
import styles from './RecentMatches.module.css';

interface Match {
  id: number;
  agent_name: string;
  result: 'win' | 'loss' | 'neutral';
  chips: number;
  date: string;
}

export interface RecentMatchesProps {
  matches: Match[];
  loading?: boolean;
}

export const RecentMatches = ({ matches, loading = false }: RecentMatchesProps) => {
  const columns = [
    {
      key: 'agent_name' as const,
      label: 'Agent',
      render: (value: string) => <span className={styles.agentName}>{value}</span>,
    },
    {
      key: 'result' as const,
      label: 'Result',
      render: (value: string) => (
        <Badge
          variant={value === 'win' ? 'success' : value === 'loss' ? 'danger' : 'default'}
          size="sm"
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'chips' as const,
      label: 'Chips',
      render: (value: number) => (
        <span className={`${styles.chips} ${value > 0 ? styles.positive : styles.negative}`}>
          {value > 0 ? '+' : ''}{value}
        </span>
      ),
    },
    {
      key: 'date' as const,
      label: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <Card variant="glass" padding="lg">
      <div className={styles.header}>
        <h2 className={styles.title}>Recent Matches</h2>
        <Link href="/profile/history" className={styles.link}>
          View all
        </Link>
      </div>

      <DataTable columns={columns} data={matches} loading={loading} emptyMessage="No matches yet" />
    </Card>
  );
};

RecentMatches.displayName = 'RecentMatches';

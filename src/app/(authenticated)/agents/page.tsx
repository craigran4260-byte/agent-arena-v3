'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { SubmitAgentModal } from '@/components/agents/SubmitAgentModal';
import { Button, DataTable, Skeleton, useToast } from '@/components/ui';
import styles from './page.module.css';

interface Agent {
  id: number;
  name: string;
  wins: number;
  losses: number;
  created_at: string;
}

export default function AgentsPage() {
  const { addToast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAgents(data || []);
    } catch (error) {
      addToast('Failed to load agents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'name' as const,
      label: 'Agent Name',
      render: (value: string, row: Agent) => (
        <Link href={`/agents/${row.id}`} className={styles.link}>
          {value}
        </Link>
      ),
    },
    { key: 'wins' as const, label: 'Wins' },
    { key: 'losses' as const, label: 'Losses' },
    {
      key: 'created_at' as const,
      label: 'Submitted',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <>
      <Header
        title="Your Agents"
        subtitle="Manage and monitor your AI agents"
        showBackButton
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Submit Agent
          </Button>
        }
      />

      <div className={styles.container}>
        {loading ? (
          <>
            <Skeleton width="100%" height="40px" variant="rect" />
            <Skeleton width="100%" height="300px" variant="rect" />
          </>
        ) : (
          <DataTable columns={columns} data={agents} emptyMessage="No agents yet. Submit one to get started!" />
        )}
      </div>

      <SubmitAgentModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchAgents} />
    </>
  );
}

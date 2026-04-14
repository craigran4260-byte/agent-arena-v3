'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout';
import { Card, Button, DataTable, Input, useToast, Skeleton } from '@/components/ui';
import { CreateTableDialog, JoinTableDialog } from '@/components/lobby';
import styles from './page.module.css';

interface Table {
  id: number;
  name: string;
  buyIn: number;
  maxPlayers: number;
  currentPlayers: number;
  createdAt: string;
}

export default function LobbyPage() {
  const { addToast } = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // Fetch tables on mount and set up auto-refresh
  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables');
      if (!res.ok) throw new Error('Failed to fetch tables');
      const data = await res.json();
      setTables(data);
    } catch (error: any) {
      addToast('Failed to load tables', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = (tableId: number) => {
    setSelectedTable(tableId);
    setShowJoinDialog(true);
  };

  const filteredTables = tables.filter(table =>
    (table.name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tableColumns = [
    {
      key: 'name',
      label: 'Table Name',
      render: (value: string) => <span className={styles.tableName}>{value}</span>,
    },
    {
      key: 'buyIn',
      label: 'Buy-in',
      render: (value: number) => `${value.toLocaleString()} chips`,
    },
    {
      key: 'currentPlayers',
      label: 'Players',
      render: (value: number, row: Table) => `${value}/${row.maxPlayers}`,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value: string) => new Date(value).toLocaleTimeString(),
    },
    {
      key: 'id',
      label: 'Action',
      render: (value: number, row: Table) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleJoinClick(value)}
          disabled={row.currentPlayers >= row.maxPlayers}
        >
          {row.currentPlayers >= row.maxPlayers ? 'Full' : 'Join'}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <>
        <Header title="Lobby" />
        <div className={styles.container}>
          <Skeleton width="100%" height="120px" variant="rect" />
          <Skeleton width="100%" height="400px" variant="rect" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Poker Lobby" />

      <div className={styles.container}>
        {/* Controls */}
        <div className={styles.controlsSection}>
          <Input
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon="search"
          />
          <Button
            variant="primary"
            onClick={() => setShowCreateDialog(true)}
          >
            Create Table
          </Button>
        </div>

        {/* Stats Section */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active Tables</div>
            <div className={styles.statValue}>{tables.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Players</div>
            <div className={styles.statValue}>
              {tables.reduce((sum, t) => sum + t.currentPlayers, 0)}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Available Seats</div>
            <div className={styles.statValue}>
              {tables.reduce((sum, t) => sum + (t.maxPlayers - t.currentPlayers), 0)}
            </div>
          </div>
        </div>

        {/* Tables List */}
        <Card variant="glass" padding="lg">
          {filteredTables.length === 0 ? (
            <div className={styles.emptyState}>
              <p>
                {searchTerm
                  ? 'No tables match your search'
                  : 'No active tables. Create one to get started!'}
              </p>
              {!searchTerm && (
                <Button
                  variant="primary"
                  onClick={() => setShowCreateDialog(true)}
                >
                  Create First Table
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={tableColumns}
              data={filteredTables}
              loading={false}
            />
          )}
        </Card>

        {/* Auto-refresh indicator */}
        <div className={styles.refreshNote}>
          <span>🔄 Tables refresh every 10 seconds</span>
        </div>
      </div>

      {/* Dialogs */}
      <CreateTableDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={fetchTables}
      />

      {selectedTable && (
        <JoinTableDialog
          isOpen={showJoinDialog}
          onClose={() => {
            setShowJoinDialog(false);
            setSelectedTable(null);
          }}
          tableId={selectedTable}
          onSuccess={fetchTables}
        />
      )}
    </>
  );
}

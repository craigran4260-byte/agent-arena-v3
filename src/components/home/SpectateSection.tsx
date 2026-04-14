'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Skeleton } from '@/components/ui';
import { PokerTable } from '@/components/table/PokerTable';
import { CardsIcon, ChipIcon, PlayIcon } from '@/components/icons';
import styles from './SpectateSection.module.css';

interface TableInfo {
  id: number;
  name: string;
  status: string;
  currentPlayers: number;
  maxPlayers: number;
  buyIn: number;
  potTotal?: number;
  players: any[];
}

export const SpectateSection = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);

  useEffect(() => {
    fetchTables();
    // Refresh every 10 seconds
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTables(data || []);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeTables = tables.filter(t => t.status === 'active');
  const waitingTables = tables.filter(t => t.status === 'waiting');

  if (loading) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Live Games</h2>
        <div className={styles.tableGrid}>
          <Skeleton width="100%" height="200px" variant="rect" />
          <Skeleton width="100%" height="200px" variant="rect" />
          <Skeleton width="100%" height="200px" variant="rect" />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Live Games</h2>
        <div className={styles.tableCount}>
          <Badge variant="success">{activeTables.length} Active</Badge>
          <Badge variant="warning">{waitingTables.length} Waiting</Badge>
        </div>
      </div>

      {tables.length === 0 ? (
        <Card variant="glass" padding="lg" className={styles.emptyState}>
          <CardsIcon size={48} className={styles.emptyIcon} />
          <h3>No Active Games</h3>
          <p>Games will appear here when agents are playing. Check back soon!</p>
        </Card>
      ) : (
        <div className={styles.tableGrid}>
          {tables.map(table => (
            <Card
              key={table.id}
              variant="glass"
              padding="md"
              hover
              className={`${styles.tableCard} ${selectedTable?.id === table.id ? styles.selected : ''}`}
              onClick={() => setSelectedTable(selectedTable?.id === table.id ? null : table)}
            >
              <div className={styles.tableHeader}>
                <div className={styles.tableName}>{table.name || `Table #${table.id}`}</div>
                <Badge variant={table.status === 'active' ? 'success' : 'warning'}>
                  {table.status}
                </Badge>
              </div>

              <div className={styles.tableInfo}>
                <div className={styles.infoItem}>
                  <CardsIcon size={16} />
                  <span>{table.currentPlayers}/{table.maxPlayers} players</span>
                </div>
                <div className={styles.infoItem}>
                  <ChipIcon size={16} />
                  <span>{table.buyIn.toLocaleString()} buy-in</span>
                </div>
              </div>

              {/* Mini table preview */}
              {table.status === 'active' && table.players && (
                <div className={styles.tablePreview}>
                  <PokerTable
                    players={table.players.map((p: any, i: number) => ({
                      seatNumber: i + 1,
                      agentName: p.name || `Player ${i + 1}`,
                      chips: p.chips || 1000,
                      isActive: i === 0,
                    }))}
                    potTotal={table.potTotal || 0}
                    animateChips={false}
                  />
                </div>
              )}

              <div className={styles.watchBtn}>
                <PlayIcon size={16} />
                <span>Click to preview</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Expanded table view */}
      {selectedTable && (
        <div className={styles.expandedView}>
          <Card variant="glass" padding="lg">
            <div className={styles.expandedHeader}>
              <h3>{selectedTable.name || `Table #${selectedTable.id}`}</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedTable(null)}
              >
                ✕
              </button>
            </div>

            {selectedTable.players && selectedTable.players.length > 0 ? (
              <PokerTable
                players={selectedTable.players.map((p: any, i: number) => ({
                  seatNumber: i + 1,
                  agentName: p.name || `Player ${i + 1}`,
                  chips: p.chips || 1000,
                  isActive: i === 0,
                }))}
                potTotal={selectedTable.potTotal || 0}
                animateChips={true}
                showDelayIndicator
                delaySeconds={30}
              />
            ) : (
              <div className={styles.noPlayers}>
                <p>Waiting for players to join...</p>
              </div>
            )}

            <div className={styles.joinNote}>
              <p>💡 Sign up to watch full games with live updates and place bets!</p>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
};

SpectateSection.displayName = 'SpectateSection';
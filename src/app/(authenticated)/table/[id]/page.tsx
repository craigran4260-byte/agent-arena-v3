'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { Card, Button, Skeleton } from '@/components/ui';
import { PokerTable, HandHistory, BettingPanel } from '@/components/table';
import { ChatPanel } from '@/components/chat';
import { useChat } from '@/hooks/useChat';
import styles from './page.module.css';

interface Player {
  seatNumber: number;
  agentName: string;
  agentId: number;
  chips: number;
  action?: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  isActive?: boolean;
  avatarUrl?: string;
}

interface Action {
  timestamp: number;
  playerName: string;
  action: string;
  amount?: number;
}

interface TableData {
  id: number;
  name: string;
  buyIn: number;
  maxPlayers: number;
  currentPlayers: number;
  potTotal: number;
  players: Player[];
  dealerButton?: number;
  smallBlindSeat?: number;
  bigBlindSeat?: number;
  actions: Action[];
  createdAt: string;
}

export default function SpectateTablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [table, setTable] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [spectatorChips, setSpectatorChips] = useState(5000);
  const tableId = parseInt(id);
  const { messages, isConnected, error: chatError, sendMessage } = useChat(tableId);

  useEffect(() => {
    fetchTableData();
    // Refresh table data every 2 seconds for live updates
    const interval = setInterval(fetchTableData, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchTableData = async () => {
    try {
      const res = await fetch(`/api/tables/${id}`);
      if (!res.ok) throw new Error('Failed to fetch table');
      const data = await res.json();
      const t = data.table ?? data;
      const players = (data.players ?? []).map((p: any) => ({
        seatNumber: p.seat_number,
        agentName: p.agent_name ?? `Agent ${p.agent_id}`,
        agentId: p.agent_id,
        chips: p.chips,
        action: p.last_action,
        isActive: p.status === 'active',
      }));
      setTable({
        id: t.id,
        name: t.name ?? `Table ${t.id}`,
        buyIn: t.buy_in ?? 1000,
        maxPlayers: t.max_players ?? 9,
        currentPlayers: t.current_players ?? players.length,
        potTotal: t.pot_total ?? 0,
        players,
        dealerButton: t.dealer_seat,
        smallBlindSeat: t.small_blind_seat,
        bigBlindSeat: t.big_blind_seat,
        actions: data.actions ?? [],
        createdAt: t.created_at,
      });
    } catch (error) {
      console.error('Failed to fetch table:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBet = async (amount: number) => {
    try {
      const res = await fetch(`/api/tables/${id}/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) throw new Error('Failed to place bet');

      setSpectatorChips(prev => prev - amount);
      await fetchTableData();
    } catch (error) {
      console.error('Failed to place bet:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Loading Table..." />
        <div className={styles.container}>
          <Skeleton width="100%" height="500px" variant="rect" />
        </div>
      </>
    );
  }

  if (!table) {
    return (
      <>
        <Header title="Table Not Found" />
        <div className={styles.container}>
          <Card padding="lg">
            <p>This table could not be found.</p>
            <Link href="/lobby">
              <Button variant="primary">Back to Lobby</Button>
            </Link>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title={table.name}
        subtitle={`Buy-in: ${table.buyIn.toLocaleString()} | Players: ${table.currentPlayers}/${table.maxPlayers}`}
        actions={
          <Link href="/lobby">
            <Button variant="secondary">Back to Lobby</Button>
          </Link>
        }
      />

      <div className={styles.container}>
        <div className={styles.mainContent}>
          {/* Poker Table */}
          <div className={styles.tableSection}>
            <PokerTable
              players={table.players}
              dealerButton={table.dealerButton}
              smallBlindSeat={table.smallBlindSeat}
              bigBlindSeat={table.bigBlindSeat}
              potTotal={table.potTotal}
            />
          </div>

          {/* Hand History */}
          <div className={styles.historySection}>
            <HandHistory
              actions={table.actions}
              isLoading={false}
            />
          </div>
        </div>

        {/* Betting Panel + Chat Sidebar */}
        <div className={styles.sidebar}>
          <BettingPanel
            spectatorChips={spectatorChips}
            onPlaceBet={handlePlaceBet}
            minBet={10}
            maxBet={5000}
          />
          <div className={styles.chatSection}>
            <ChatPanel
              messages={messages}
              onSendMessage={async (content) => { await sendMessage(content); }}
              isConnected={isConnected}
              error={chatError}
            />
          </div>
        </div>
      </div>
    </>
  );
}

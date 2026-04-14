'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout';
import { BackButton } from '@/components/ui';
import styles from './page.module.css';

interface AdminStats {
  timestamp: string;
  stats: {
    users: { total_users: number; new_users_week: number; active_users_today: number };
    agents: { total_agents: number; active_agents: number; total_wins: number; total_losses: number };
    tables: { total_tables: number; active_tables: number; waiting_tables: number; completed_tables: number };
    tournaments: { total_tournaments: number; active_tournaments: number; upcoming_tournaments: number };
    tokens: { total_tokens_held: number; bonuses_claimed: number; purchases: number };
    gameSessions: { total_sessions: number; active_sessions: number; completed_sessions: number };
  };
  infrastructure: {
    redis: { connected: boolean; memory: string };
    websocket: { totalConnections: number; activeSubscriptions: number; tablesWatched: number[] } | null;
  };
  recentActivity: Array<{
    type: string;
    id: number;
    timestamp: string;
    table_id: number;
    winner_name: string;
    pot_size: number;
  }>;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin');
      if (!res.ok) {
        if (res.status === 401) {
          setError('Unauthorized - Admin access required');
        } else {
          setError('Failed to fetch stats');
        }
        return;
      }
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Header title="Admin Dashboard" showBackButton />
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Header title="Admin Dashboard" showBackButton />
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={styles.container}>
        <Header title="Admin Dashboard" showBackButton />
        <div className={styles.error}>No data available</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header title="Admin Dashboard" showBackButton />

      <div className={styles.grid}>
        {/* User Stats */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Users</h3>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total</span>
              <span className={styles.statValue}>{stats.stats.users.total_users}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>New (7 days)</span>
              <span className={styles.statValue}>{stats.stats.users.new_users_week}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Active Today</span>
              <span className={styles.statValue}>{stats.stats.users.active_users_today}</span>
            </div>
          </div>
        </div>

        {/* Agent Stats */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Agents</h3>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total</span>
              <span className={styles.statValue}>{stats.stats.agents.total_agents}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Active</span>
              <span className={styles.statValue}>{stats.stats.agents.active_agents}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Win/Loss</span>
              <span className={styles.statValue}>{stats.stats.agents.total_wins}/{stats.stats.agents.total_losses}</span>
            </div>
          </div>
        </div>

        {/* Table Stats */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Tables</h3>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total</span>
              <span className={styles.statValue}>{stats.stats.tables.total_tables}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Active</span>
              <span className={styles.statValue + ' ' + styles.active}>{stats.stats.tables.active_tables}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Waiting</span>
              <span className={styles.statValue + ' ' + styles.waiting}>{stats.stats.tables.waiting_tables}</span>
            </div>
          </div>
        </div>

        {/* Tournament Stats */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Tournaments</h3>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total</span>
              <span className={styles.statValue}>{stats.stats.tournaments.total_tournaments}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Active</span>
              <span className={styles.statValue + ' ' + styles.active}>{stats.stats.tournaments.active_tournaments}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Upcoming</span>
              <span className={styles.statValue}>{stats.stats.tournaments.upcoming_tournaments}</span>
            </div>
          </div>
        </div>

        {/* Infrastructure */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Infrastructure</h3>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Redis</span>
              <span className={styles.statValue + ' ' + (stats.infrastructure.redis.connected ? styles.connected : styles.disconnected)}>
                {stats.infrastructure.redis.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Redis Memory</span>
              <span className={styles.statValue}>{stats.infrastructure.redis.memory}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>WS Connections</span>
              <span className={styles.statValue}>{stats.infrastructure.websocket?.totalConnections || 0}</span>
            </div>
          </div>
        </div>

        {/* Tokens */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Token Economy</h3>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total Held</span>
              <span className={styles.statValue + ' ' + styles.gold}>{stats.stats.tokens.total_tokens_held?.toLocaleString() || 0}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Bonuses Claimed</span>
              <span className={styles.statValue}>{stats.stats.tokens.bonuses_claimed || 0}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Purchases</span>
              <span className={styles.statValue}>{stats.stats.tokens.purchases || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.activitySection}>
        <h3 className={styles.sectionTitle}>Recent Activity</h3>
        <div className={styles.activityList}>
          {stats.recentActivity.length === 0 ? (
            <div className={styles.noActivity}>No recent activity</div>
          ) : (
            stats.recentActivity.map((activity) => (
              <div key={activity.id} className={styles.activityItem}>
                <span className={styles.activityType}>Hand #{activity.id}</span>
                <span className={styles.activityTable}>Table {activity.table_id}</span>
                <span className={styles.activityWinner}>
                  {activity.winner_name ? `Winner: ${activity.winner_name}` : 'No winner'}
                </span>
                <span className={styles.activityPot}>{activity.pot_size?.toLocaleString()} chips</span>
                <span className={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span>Last updated: {new Date(stats.timestamp).toLocaleString()}</span>
        <button onClick={fetchStats} className={styles.refreshBtn}>
          Refresh
        </button>
      </div>
    </div>
  );
}
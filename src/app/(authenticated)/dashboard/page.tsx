'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout';
import { StatCard, RecentMatches, QuickActions } from '@/components/dashboard';
import { Skeleton, useToast } from '@/components/ui';
import { AgentIcon, TrophyIcon, WalletIcon, ChartIcon } from '@/components/icons';
import { useTranslation } from '@/contexts/LanguageContext';
import styles from './page.module.css';

interface DashboardData {
  stats: {
    agents: number;
    wins: number;
    losses: number;
    tokens: number;
  };
  recentMatches: Array<{
    id: number;
    agent_name: string;
    result: string;
    chips: number;
    date: string;
  }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to fetch data');
        const dashboardData = await res.json();
        setData(dashboardData);
      } catch (error) {
        addToast(t('common.error'), 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [addToast, t]);

  const welcomeText = session?.user?.name
    ? t('dashboard.welcomeBack', { name: session.user.name })
    : t('dashboard.welcomeDefault');

  return (
    <>
      <Header
        title={t('dashboard.title')}
        subtitle={welcomeText}
      />

      <div className={`${styles.container} page-enter`}>
        {/* Stats Grid */}
        <section className={styles.statsGrid}>
          {loading ? (
            <>
              <Skeleton width="100%" height="140px" variant="rect" />
              <Skeleton width="100%" height="140px" variant="rect" />
              <Skeleton width="100%" height="140px" variant="rect" />
              <Skeleton width="100%" height="140px" variant="rect" />
            </>
          ) : data ? (
            <>
              <StatCard
                title={t('dashboard.stats.yourAgents')}
                value={data.stats.agents}
                icon={<AgentIcon size={24} />}
                description={t('dashboard.stats.activeAgents')}
              />
              <StatCard
                title={t('dashboard.stats.totalWins')}
                value={data.stats.wins}
                icon={<TrophyIcon size={24} />}
                trend="up"
                trendValue="+12%"
              />
              <StatCard
                title={t('dashboard.stats.tokenBalance')}
                value={data.stats.tokens}
                icon={<WalletIcon size={24} />}
                description={t('dashboard.stats.playChips')}
              />
              <StatCard
                title={t('dashboard.stats.winRate')}
                value={`${data.stats.wins + data.stats.losses > 0 ? Math.round((data.stats.wins / (data.stats.wins + data.stats.losses)) * 100) : 0}%`}
                icon={<ChartIcon size={24} />}
                trend={data.stats.wins > data.stats.losses ? 'up' : 'down'}
              />
            </>
          ) : null}
        </section>

        {/* Quick Actions */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('dashboard.quickActions.title')}</h2>
          <QuickActions />
        </section>

        {/* Recent Matches */}
        <section className={styles.section}>
          <RecentMatches
            matches={
              data?.recentMatches?.map((m) => ({
                ...m,
                result: (m.result as 'win' | 'loss' | 'neutral') || 'neutral',
              })) || []
            }
            loading={loading}
          />
        </section>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Reward, RewardService } from '@/lib/RewardService';
import { RewardCard } from '@/components/rewards/RewardCard';
import { Button, BackButton } from '@/components/ui';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { TrophyIcon } from '@/components/icons/TrophyIcon';
import { ChipIcon } from '@/components/icons/ChipIcon';
import styles from './page.module.css';

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState<'unclaimed' | 'history'>('unclaimed');
  const [unclaimedRewards, setUnclaimedRewards] = useState<Reward[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [unclaimedStats, setUnclaimedStats] = useState({ count: 0, total: 0 });

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      setLoading(true);
      const [unclaimed, claimed, stats] = await Promise.all([
        fetch('/api/rewards?claimed=false').then(r => r.json()),
        fetch('/api/rewards?claimed=true').then(r => r.json()),
        fetch('/api/rewards/stats').then(r => r.json()).catch(() => ({ count: 0, total: 0 }))
      ]);

      setUnclaimedRewards(unclaimed);
      setClaimedRewards(claimed);
      setUnclaimedStats(stats);
    } catch (error) {
      console.error('Failed to load rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (rewardId: number) => {
    try {
      setClaimingId(rewardId);
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', rewardId })
      });

      if (!response.ok) {
        throw new Error('Failed to claim reward');
      }

      // Refresh rewards
      await loadRewards();
    } catch (error) {
      console.error('Failed to claim reward:', error);
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimAll = async () => {
    try {
      setClaimingId(-1); // Special value for claim all
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim-all' })
      });

      if (!response.ok) {
        throw new Error('Failed to claim all rewards');
      }

      // Refresh rewards
      await loadRewards();
    } catch (error) {
      console.error('Failed to claim all rewards:', error);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <BackButton />
        <div className={styles.titleSection}>
          <TrophyIcon size={32} className={styles.titleIcon} />
          <h1>Rewards</h1>
        </div>
        <p className={styles.subtitle}>Claim your earned rewards and bonuses</p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className={styles.statsGrid}>
          <Skeleton width="100%" height={120} variant="rect" />
          <Skeleton width="100%" height={120} variant="rect" />
        </div>
      ) : (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Unclaimed Rewards</div>
            <div className={styles.statValue}>{unclaimedStats.count}</div>
            <div className={styles.statSubtitle}>Awaiting claim</div>
          </div>

          <div className={styles.statCard}>
            <ChipIcon size={24} className={styles.statIcon} />
            <div className={styles.statLabel}>Total Available</div>
            <div className={styles.statValue}>+{unclaimedStats.total.toLocaleString()}</div>
            <div className={styles.statSubtitle}>Tokens</div>
          </div>
        </div>
      )}

      {/* Claim All Button */}
      {unclaimedStats.count > 0 && !loading && (
        <div className={styles.claimAllSection}>
          <Button
            variant="primary"
            size="md"
            onClick={handleClaimAll}
            loading={claimingId === -1}
          >
            Claim All Rewards ({unclaimedStats.count})
          </Button>
        </div>
      )}

      {/* Tabs */}
      {!loading && (
        <Tabs
          tabs={[
            {
              id: 'unclaimed',
              label: `Unclaimed (${unclaimedRewards.length})`,
              content: null
            },
            {
              id: 'history',
              label: `History (${claimedRewards.length})`,
              content: null
            }
          ]}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as any)}
        />
      )}

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.gridCards}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} width="100%" height={240} variant="rect" />
            ))}
          </div>
        ) : activeTab === 'unclaimed' ? (
          <>
            {unclaimedRewards.length > 0 ? (
              <div className={styles.gridCards}>
                {unclaimedRewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    onClaim={handleClaim}
                    loading={claimingId === reward.id}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <TrophyIcon size={48} className={styles.emptyIcon} />
                <h3>No Unclaimed Rewards</h3>
                <p>Complete matches and achievements to earn rewards</p>
              </div>
            )}
          </>
        ) : (
          <>
            {claimedRewards.length > 0 ? (
              <div className={styles.gridCards}>
                {claimedRewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <TrophyIcon size={48} className={styles.emptyIcon} />
                <h3>No Reward History</h3>
                <p>Claimed rewards will appear here</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

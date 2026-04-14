'use client';

import { Reward } from '@/lib/RewardService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChipIcon } from '@/components/icons/ChipIcon';
import styles from './RewardCard.module.css';

interface RewardCardProps {
  reward: Reward;
  onClaim?: (rewardId: number) => void;
  loading?: boolean;
}

const reasonLabels: Record<string, string> = {
  settlement_payout: 'Settlement Payout',
  bet_winning: 'Winning Bet',
  bonus: 'Bonus',
  challenge_reward: 'Challenge Reward'
};

const reasonVariants: Record<string, 'success' | 'warning' | 'gold' | 'default'> = {
  settlement_payout: 'success',
  bet_winning: 'success',
  bonus: 'gold',
  challenge_reward: 'warning'
};

export function RewardCard({ reward, onClaim, loading = false }: RewardCardProps) {
  const handleClaim = () => {
    if (onClaim && !reward.claimed) {
      onClaim(reward.id);
    }
  };

  const createdDate = new Date(reward.created_at);
  const claimedDate = reward.claimed_at ? new Date(reward.claimed_at) : null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>
          <ChipIcon size={20} className={styles.icon} />
          <span>{reward.description || reasonLabels[reward.reason]}</span>
        </div>
        <Badge
          variant={reward.claimed ? 'default' : 'success'}
          size="sm"
        >
          {reward.claimed ? 'Claimed' : 'Unclaimed'}
        </Badge>
      </div>

      <div className={styles.content}>
        <div className={styles.amount}>
          <span className={styles.label}>Reward Amount</span>
          <span className={styles.value}>+{reward.amount.toLocaleString()} Tokens</span>
        </div>

        <div className={styles.reason}>
          <Badge variant={reasonVariants[reward.reason]} size="sm">
            {reasonLabels[reward.reason]}
          </Badge>
        </div>

        <div className={styles.dates}>
          <div className={styles.dateItem}>
            <span className={styles.label}>Earned</span>
            <span>{createdDate.toLocaleDateString()}</span>
          </div>
          {claimedDate && (
            <div className={styles.dateItem}>
              <span className={styles.label}>Claimed</span>
              <span>{claimedDate.toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {!reward.claimed && (
        <div className={styles.footer}>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={handleClaim}
            loading={loading}
          >
            Claim Reward
          </Button>
        </div>
      )}
    </div>
  );
}

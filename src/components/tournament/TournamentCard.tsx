'use client';

import { Tournament } from '@/lib/TournamentService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TournamentIcon } from '@/components/icons/TournamentIcon';
import Link from 'next/link';
import styles from './TournamentCard.module.css';

interface TournamentCardProps {
  tournament: Tournament;
  onRegister?: () => void;
}

const statusVariants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  upcoming: 'warning',
  active: 'success',
  completed: 'default'
};

const statusLabels: Record<string, string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed'
};

export function TournamentCard({ tournament, onRegister }: TournamentCardProps) {
  const startsAt = new Date(tournament.starts_at);
  const participantPercentage = (tournament.current_participants / tournament.max_participants) * 100;
  const isFull = tournament.current_participants >= tournament.max_participants;

  return (
    <Link href={`/tournament/${tournament.id}`}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <TournamentIcon size={24} className={styles.icon} />
            <h3>{tournament.name}</h3>
          </div>
          <Badge variant={statusVariants[tournament.status]} size="sm">
            {statusLabels[tournament.status]}
          </Badge>
        </div>

        {tournament.description && (
          <p className={styles.description}>{tournament.description}</p>
        )}

        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Participants</span>
            <span className={styles.value}>
              {tournament.current_participants}/{tournament.max_participants}
            </span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.label}>Format</span>
            <span className={styles.value}>{tournament.tournament_type}</span>
          </div>

          {tournament.entry_fee > 0 && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Entry Fee</span>
              <span className={styles.value}>{tournament.entry_fee} Tokens</span>
            </div>
          )}

          {tournament.prize_pool > 0 && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Prize Pool</span>
              <span className={styles.goldValue}>{tournament.prize_pool} Tokens</span>
            </div>
          )}
        </div>

        <div className={styles.progressSection}>
          <div className={styles.progressLabel}>
            <span>Participants</span>
            <span>{participantPercentage.toFixed(0)}%</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(participantPercentage, 100)}%` }}
            />
          </div>
        </div>

        <div className={styles.startTime}>
          <span>Starts: {startsAt.toLocaleDateString()} at {startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {tournament.status === 'upcoming' && !isFull && (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={(e) => {
              e.preventDefault();
              onRegister?.();
            }}
          >
            Register Agent
          </Button>
        )}

        {isFull && (
          <div className={styles.fullBadge}>Tournament Full</div>
        )}
      </div>
    </Link>
  );
}

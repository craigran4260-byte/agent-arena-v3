'use client';

import { useState, useEffect } from 'react';
import { Tournament, TournamentEntry, TournamentMatch, TournamentReplay } from '@/lib/TournamentService';
import { Bracket, RegisterDialog } from '@/components/tournament';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { TournamentIcon, PlayIcon } from '@/components/icons';
import styles from './page.module.css';

interface TournamentDetail {
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
  standings: any[];
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [agentNames, setAgentNames] = useState<Map<number, string>>(new Map());
  const [replays, setReplays] = useState<TournamentReplay[]>([]);
  const [selectedReplay, setSelectedReplay] = useState<TournamentReplay | null>(null);

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      loadTournamentData(p.id);
    });
  }, [params]);

  const loadTournamentData = async (tournamentId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournaments/${tournamentId}`);
      if (!response.ok) throw new Error('Tournament not found');

      const detail = await response.json() as TournamentDetail;
      setData(detail);

      // Build agent name map
      const names = new Map<number, string>();
      detail.entries.forEach(entry => {
        if (entry.agent_id) {
          names.set(entry.agent_id, `Agent ${entry.agent_id}`);
        }
      });
      setAgentNames(names);

      // Load replays if tournament is completed
      if (detail.tournament.status === 'completed') {
        loadReplays(tournamentId);
      }
    } catch (error) {
      console.error('Failed to load tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReplays = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/replay`);
      if (response.ok) {
        const replayData = await response.json();
        setReplays(replayData.replays || []);
      }
    } catch (error) {
      console.error('Failed to load replays:', error);
    }
  };

  const handleRegister = async (agentId: number) => {
    if (!id) return;

    try {
      const response = await fetch(`/api/tournaments/${id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action: 'register' })
      });

      if (!response.ok) throw new Error('Failed to register');

      // Refresh data
      await loadTournamentData(id);
      setRegisterDialogOpen(false);
    } catch (error) {
      console.error('Failed to register:', error);
      throw error;
    }
  };

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <Skeleton width="100%" height={200} variant="rect" />
        <Skeleton width="100%" height={400} variant="rect" />
      </div>
    );
  }

  const tournament = data.tournament;
  const startsAt = new Date(tournament.starts_at);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <TournamentIcon size={32} className={styles.titleIcon} />
          <div>
            <h1>{tournament.name}</h1>
            <p className={styles.subtitle}>{tournament.description}</p>
          </div>
        </div>
        <Badge variant="success" size="md">
          {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
        </Badge>
      </div>

      {/* Details Grid */}
      <div className={styles.detailsGrid}>
        <div className={styles.detailCard}>
          <span className={styles.detailLabel}>Format</span>
          <span className={styles.detailValue}>{tournament.tournament_type}</span>
        </div>
        <div className={styles.detailCard}>
          <span className={styles.detailLabel}>Participants</span>
          <span className={styles.detailValue}>
            {tournament.current_participants}/{tournament.max_participants}
          </span>
        </div>
        {/* V3: Blind configuration */}
        {(tournament.small_blind || tournament.big_blind) && (
          <div className={styles.detailCard}>
            <span className={styles.detailLabel}>Blinds</span>
            <span className={styles.detailValue}>
              {tournament.small_blind || 10}/{tournament.big_blind || 20}
            </span>
          </div>
        )}
        <div className={styles.detailCard}>
          <span className={styles.detailLabel}>Starts</span>
          <span className={styles.detailValue}>
            {startsAt.toLocaleDateString()}
          </span>
        </div>
        {tournament.prize_pool > 0 && (
          <div className={styles.detailCard}>
            <span className={styles.detailLabel}>Prize Pool</span>
            <span className={styles.detailValue}>{tournament.prize_pool} Tokens</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      {tournament.status === 'upcoming' && (
        <div className={styles.actionSection}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setRegisterDialogOpen(true)}
            disabled={tournament.current_participants >= tournament.max_participants}
          >
            {tournament.current_participants >= tournament.max_participants
              ? 'Tournament Full'
              : 'Register Agent'}
          </Button>
        </div>
      )}

      {/* Bracket */}
      {data.matches && data.matches.length > 0 && (
        <div className={styles.section}>
          <h2>Tournament Bracket</h2>
          <Bracket matches={data.matches} agentNames={agentNames} />
        </div>
      )}

      {/* Standings */}
      {data.standings && data.standings.length > 0 && (
        <div className={styles.section}>
          <h2>Standings</h2>
          <DataTable
            columns={[
              { key: 'rank', label: 'Rank', sortable: true },
              { key: 'agent_name', label: 'Agent', sortable: true },
              { key: 'wins', label: 'Wins', sortable: true },
              { key: 'losses', label: 'Losses', sortable: true },
              { key: 'status', label: 'Status', sortable: true }
            ]}
            data={data.standings.map((s, i) => ({
              ...s,
              rank: i + 1
            }))}
            loading={false}
          />
        </div>
      )}

      {/* V3: Replays Section */}
      {tournament.status === 'completed' && replays.length > 0 && (
        <div className={styles.section}>
          <h2>Match Replays</h2>
          <div className={styles.replaysGrid}>
            {replays.map(replay => (
              <div
                key={replay.matchId}
                className={styles.replayCard}
                onClick={() => setSelectedReplay(replay)}
              >
                <div className={styles.replayHeader}>
                  <span className={styles.replayRound}>Round {replay.roundNumber}</span>
                  <span className={styles.replayMatch}>Match {replay.matchNumber}</span>
                </div>
                <div className={styles.replayPlayers}>
                  <span>{replay.agent1Name}</span>
                  <span className={styles.vs}>vs</span>
                  <span>{replay.agent2Name}</span>
                </div>
                <div className={styles.replayWinner}>
                  Winner: {replay.winnerName}
                </div>
                <div className={styles.replayHands}>
                  {replay.hands.length} hands played
                </div>
                <Button variant="ghost" size="sm">
                  <PlayIcon size={16} />
                  Watch Replay
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Register Dialog */}
      {id && (
        <RegisterDialog
          isOpen={registerDialogOpen}
          onClose={() => setRegisterDialogOpen(false)}
          tournamentId={parseInt(id)}
          onRegister={handleRegister}
        />
      )}
    </div>
  );
}

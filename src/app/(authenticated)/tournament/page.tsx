'use client';

import { useState, useEffect } from 'react';
import { Tournament } from '@/lib/TournamentService';
import { TournamentCard, RegisterDialog } from '@/components/tournament';
import { Button, BackButton } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { TournamentIcon } from '@/components/icons/TournamentIcon';
import styles from './page.module.css';

export default function TournamentsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'completed'>('upcoming');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    loadTournaments();
  }, [activeTab]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournaments?status=${activeTab}`);
      if (!response.ok) throw new Error('Failed to load tournaments');

      const data = await response.json();
      setTournaments(data.data || []);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setRegisterDialogOpen(true);
  };

  const handleRegister = async (agentId: number) => {
    if (!selectedTournament) return;

    try {
      const response = await fetch(`/api/tournaments/${selectedTournament.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action: 'register' })
      });

      if (!response.ok) throw new Error('Failed to register');

      // Refresh tournaments
      await loadTournaments();
    } catch (error) {
      console.error('Failed to register:', error);
      throw error;
    }
  };

  const upcomingCount = tournaments.filter(t => t.status === 'upcoming').length;
  const activeCount = tournaments.filter(t => t.status === 'active').length;
  const completedCount = tournaments.filter(t => t.status === 'completed').length;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <BackButton />
        <div className={styles.titleSection}>
          <TournamentIcon size={32} className={styles.titleIcon} />
          <h1>Tournaments</h1>
        </div>
        <p className={styles.subtitle}>Compete in tournaments to earn rewards</p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'upcoming', label: `Upcoming (${upcomingCount})`, content: null },
          { id: 'active', label: `Active (${activeCount})`, content: null },
          { id: 'completed', label: `Completed (${completedCount})`, content: null }
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
      />

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.grid}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} width="100%" height={320} variant="rect" />
            ))}
          </div>
        ) : tournaments.length > 0 ? (
          <div className={styles.grid}>
            {tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onRegister={() => handleRegisterClick(tournament)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <TournamentIcon size={48} className={styles.emptyIcon} />
            <h3>No Tournaments</h3>
            <p>
              {activeTab === 'upcoming' && 'No upcoming tournaments. Check back soon!'}
              {activeTab === 'active' && 'No active tournaments at the moment.'}
              {activeTab === 'completed' && 'No completed tournaments yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Register Dialog */}
      {selectedTournament && (
        <RegisterDialog
          isOpen={registerDialogOpen}
          onClose={() => setRegisterDialogOpen(false)}
          tournamentId={selectedTournament.id}
          onRegister={handleRegister}
        />
      )}
    </div>
  );
}

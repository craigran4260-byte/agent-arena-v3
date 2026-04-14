'use client';

import { TournamentMatch } from '@/lib/TournamentService';
import styles from './Bracket.module.css';

interface BracketProps {
  matches: TournamentMatch[];
  agentNames: Map<number, string>;
  onMatchClick?: (matchId: number) => void;
}

export function Bracket({ matches, agentNames, onMatchClick }: BracketProps) {
  if (!matches || matches.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No matches scheduled yet</p>
      </div>
    );
  }

  // Group matches by round
  const matchesByRound = new Map<number, TournamentMatch[]>();
  matches.forEach((match) => {
    const round = match.round_number;
    if (!matchesByRound.has(round)) {
      matchesByRound.set(round, []);
    }
    matchesByRound.get(round)!.push(match);
  });

  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);

  return (
    <div className={styles.bracket}>
      <div className={styles.container}>
        {rounds.map((round) => (
          <div key={round} className={styles.round}>
            <h4 className={styles.roundTitle}>Round {round}</h4>
            <div className={styles.matches}>
              {matchesByRound.get(round)?.map((match) => (
                <div
                  key={match.id}
                  className={`${styles.match} ${styles[match.status]}`}
                  onClick={() => onMatchClick?.(match.id)}
                >
                  <div className={styles.matchContent}>
                    {/* Agent 1 */}
                    <div
                      className={`${styles.team} ${
                        match.winner_agent_id === match.agent1_id ? styles.winner : ''
                      }`}
                    >
                      <span className={styles.agentName}>
                        {match.agent1_id ? agentNames.get(match.agent1_id) || `Agent ${match.agent1_id}` : 'TBD'}
                      </span>
                      {match.status === 'completed' && match.agent1_id && (
                        <span className={styles.result}>
                          {match.winner_agent_id === match.agent1_id ? '✓' : '✗'}
                        </span>
                      )}
                    </div>

                    {/* VS */}
                    <div className={styles.vs}>VS</div>

                    {/* Agent 2 */}
                    <div
                      className={`${styles.team} ${
                        match.winner_agent_id === match.agent2_id ? styles.winner : ''
                      }`}
                    >
                      <span className={styles.agentName}>
                        {match.agent2_id ? agentNames.get(match.agent2_id) || `Agent ${match.agent2_id}` : 'TBD'}
                      </span>
                      {match.status === 'completed' && match.agent2_id && (
                        <span className={styles.result}>
                          {match.winner_agent_id === match.agent2_id ? '✓' : '✗'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status indicator */}
                  {match.status !== 'pending' && (
                    <div className={styles.statusBadge}>
                      {match.status === 'completed' ? '✓ Done' : 'In Progress'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

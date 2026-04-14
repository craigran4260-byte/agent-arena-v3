import db from './db';

interface Agent {
  id: number;
  name: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
  createdAt: string;
}

interface LeaderboardEntry extends Agent {
  rank: number;
}

export class AgentService {
  /**
   * Get all agents with leaderboard stats
   */
  static getLeaderboard(
    limit: number = 100,
    offset: number = 0,
    sortBy: 'winRate' | 'gamesPlayed' | 'wins' = 'winRate'
  ): LeaderboardEntry[] {
    let orderColumn = 'wins';
    if (sortBy === 'winRate') {
      orderColumn = 'CASE WHEN (wins + losses) > 0 THEN (wins * 100.0 / (wins + losses)) ELSE 0 END DESC, wins';
    } else if (sortBy === 'gamesPlayed') {
      orderColumn = '(wins + losses) DESC';
    } else {
      orderColumn = 'wins DESC';
    }

    const agents = db
      .prepare(
        `SELECT
          id,
          name,
          wins,
          losses,
          (wins + losses) as games_played,
          CASE WHEN (wins + losses) > 0 THEN ROUND(wins * 100.0 / (wins + losses), 1) ELSE 0 END as win_rate,
          created_at
         FROM agents
         ORDER BY ${orderColumn}
         LIMIT ? OFFSET ?`
      )
      .all(limit, offset) as any[];

    return agents.map((agent, index) => ({
      id: agent.id,
      name: agent.name,
      wins: agent.wins,
      losses: agent.losses,
      gamesPlayed: agent.games_played,
      winRate: agent.win_rate,
      createdAt: agent.created_at,
      rank: offset + index + 1,
    }));
  }

  /**
   * Get a single agent by ID
   */
  static getAgent(agentId: number): Agent | null {
    const agent = db
      .prepare(
        `SELECT
          id,
          name,
          wins,
          losses,
          (wins + losses) as games_played,
          CASE WHEN (wins + losses) > 0 THEN ROUND(wins * 100.0 / (wins + losses), 1) ELSE 0 END as win_rate,
          created_at
         FROM agents
         WHERE id = ?`
      )
      .get(agentId) as any;

    if (!agent) return null;

    return {
      id: agent.id,
      name: agent.name,
      wins: agent.wins,
      losses: agent.losses,
      gamesPlayed: agent.games_played,
      winRate: agent.win_rate,
      createdAt: agent.created_at,
    };
  }

  /**
   * Search agents by name
   */
  static searchAgents(searchTerm: string, limit: number = 50): Agent[] {
    const agents = db
      .prepare(
        `SELECT
          id,
          name,
          wins,
          losses,
          (wins + losses) as games_played,
          CASE WHEN (wins + losses) > 0 THEN ROUND(wins * 100.0 / (wins + losses), 1) ELSE 0 END as win_rate,
          created_at
         FROM agents
         WHERE name LIKE ?
         ORDER BY wins DESC
         LIMIT ?`
      )
      .all(`%${searchTerm}%`, limit) as any[];

    return agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      wins: agent.wins,
      losses: agent.losses,
      gamesPlayed: agent.games_played,
      winRate: agent.win_rate,
      createdAt: agent.created_at,
    }));
  }

  /**
   * Get agent rank in leaderboard
   */
  static getAgentRank(agentId: number): number | null {
    const result = db
      .prepare(
        `SELECT COUNT(*) + 1 as rank
         FROM agents a
         WHERE (
           CASE WHEN (a.wins + a.losses) > 0
             THEN (a.wins * 100.0 / (a.wins + a.losses))
             ELSE 0
           END
         ) > (
           SELECT CASE WHEN (b.wins + b.losses) > 0
             THEN (b.wins * 100.0 / (b.wins + b.losses))
             ELSE 0
           END
           FROM agents b
           WHERE b.id = ?
         )
         OR (
           CASE WHEN (a.wins + a.losses) > 0
             THEN (a.wins * 100.0 / (a.wins + a.losses))
             ELSE 0
           END
         ) = (
           SELECT CASE WHEN (b.wins + b.losses) > 0
             THEN (b.wins * 100.0 / (b.wins + b.losses))
             ELSE 0
           END
           FROM agents b
           WHERE b.id = ?
         ) AND a.id < ?`
      )
      .get(agentId, agentId, agentId) as any;

    return result?.rank || null;
  }

  /**
   * Get head-to-head stats between two agents
   */
  static getHeadToHead(agent1Id: number, agent2Id: number) {
    const agent1 = this.getAgent(agent1Id);
    const agent2 = this.getAgent(agent2Id);

    if (!agent1 || !agent2) return null;

    return {
      agent1,
      agent2,
      comparisonStats: {
        winRateDiff: agent1.winRate - agent2.winRate,
        gamesPlayedDiff: agent1.gamesPlayed - agent2.gamesPlayed,
        totalWinsDiff: agent1.wins - agent2.wins,
      },
    };
  }
}

import db from './db';
import { UserService } from './UserService';

export interface Reward {
  id: number;
  user_id: number;
  amount: number;
  description?: string;
  reason: 'settlement_payout' | 'bet_winning' | 'bonus' | 'challenge_reward';
  claimed: boolean;
  created_at: string;
  claimed_at?: string;
}

export const RewardService = {
  /**
   * Create a new reward for a user
   */
  async create(
    userId: number,
    amount: number,
    description: string | null,
    reason: 'settlement_payout' | 'bet_winning' | 'bonus' | 'challenge_reward'
  ): Promise<Reward> {
    if (amount <= 0) {
      throw new Error('Reward amount must be positive');
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO rewards (user_id, amount, description, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, amount, description, reason, now);

    const reward = this.findById(result.lastInsertRowid as number);
    if (!reward) throw new Error('Failed to create reward');
    return reward;
  },

  /**
   * Find reward by ID
   */
  findById(id: number): Reward | null {
    const reward = db.prepare('SELECT * FROM rewards WHERE id = ?').get(id) as Reward | undefined;
    return reward || null;
  },

  /**
   * List all rewards for a user
   */
  list(userId: number, claimed?: boolean): Reward[] {
    let query = 'SELECT * FROM rewards WHERE user_id = ?';
    const params: any[] = [userId];

    if (claimed !== undefined) {
      query += ' AND claimed = ?';
      params.push(claimed ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    const rewards = db.prepare(query).all(...params) as Reward[];
    return rewards;
  },

  /**
   * Get unclaimed rewards count and total amount
   */
  getUnclaimedStats(userId: number): { count: number; total: number } {
    const result = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM rewards
      WHERE user_id = ? AND claimed = FALSE
    `).get(userId) as { count: number; total: number };
    return result;
  },

  /**
   * Claim a single reward
   */
  async claim(rewardId: number, userId: number): Promise<Reward | null> {
    const reward = this.findById(rewardId);
    if (!reward) {
      throw new Error('Reward not found');
    }

    if (reward.user_id !== userId) {
      throw new Error('Reward does not belong to this user');
    }

    if (reward.claimed) {
      throw new Error('Reward already claimed');
    }

    const now = new Date().toISOString();

    // Update reward as claimed
    db.prepare(`
      UPDATE rewards
      SET claimed = TRUE, claimed_at = ?
      WHERE id = ?
    `).run(now, rewardId);

    // Update user token balance
    const user = UserService.updateTokenBalance(userId, reward.amount);
    if (!user) {
      throw new Error('Failed to update user balance');
    }

    return this.findById(rewardId);
  },

  /**
   * Claim all unclaimed rewards for a user
   */
  async claimAll(userId: number): Promise<{ claimedCount: number; totalAmount: number }> {
    const unclaimedRewards = this.list(userId, false);
    if (unclaimedRewards.length === 0) {
      return { claimedCount: 0, totalAmount: 0 };
    }

    const now = new Date().toISOString();
    const totalAmount = unclaimedRewards.reduce((sum, r) => sum + r.amount, 0);

    // Claim all rewards in transaction
    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE rewards
        SET claimed = TRUE, claimed_at = ?
        WHERE user_id = ? AND claimed = FALSE
      `).run(now, userId);

      UserService.updateTokenBalance(userId, totalAmount);
    });

    transaction();

    return {
      claimedCount: unclaimedRewards.length,
      totalAmount
    };
  },

  /**
   * Get claimed reward history
   */
  getHistory(userId: number, limit: number = 50, offset: number = 0): Reward[] {
    const rewards = db.prepare(`
      SELECT * FROM rewards
      WHERE user_id = ? AND claimed = TRUE
      ORDER BY claimed_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset) as Reward[];
    return rewards;
  }
};

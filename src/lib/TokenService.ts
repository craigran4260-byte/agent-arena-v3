/**
 * Token Service (V3)
 * Handles token economy: balance, transactions, daily bonus, redemption
 */

import db from './db';

// Transaction types matching schema enum
export type TransactionType =
  | 'purchase'
  | 'daily_bonus'
  | 'reward'
  | 'redemption'
  | 'bet_placed'
  | 'bet_won'
  | 'bet_lost'
  | 'refund';

export interface TokenTransaction {
  id: number;
  userId: number;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: number | null;
  referenceType: string | null;
  description: string | null;
  createdAt: Date;
}

export interface TokenBalance {
  balance: number;
  lastDailyBonusAt: Date | null;
  canClaimDaily: boolean;
}

// Daily bonus amount
const DAILY_BONUS_AMOUNT = 100;
const DAILY_BONUS_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const TokenService = {
  /**
   * Get user's token balance and daily bonus status
   */
  async getBalance(userId: number): Promise<TokenBalance> {
    const stmt = db.prepare(`
      SELECT token_balance, daily_bonus_claimed_at FROM users WHERE id = ?
    `);

    const row = stmt.get(userId) as any;

    if (!row) {
      return { balance: 0, lastDailyBonusAt: null, canClaimDaily: false };
    }

    const balance = row.token_balance || 0;
    const lastDailyBonusAt = row.daily_bonus_claimed_at
      ? new Date(row.daily_bonus_claimed_at)
      : null;

    const canClaimDaily = !lastDailyBonusAt ||
      (Date.now() - lastDailyBonusAt.getTime()) >= DAILY_BONUS_INTERVAL_MS;

    return {
      balance,
      lastDailyBonusAt,
      canClaimDaily
    };
  },

  /**
   * Claim daily bonus
   */
  async claimDailyBonus(userId: number): Promise<{ success: boolean; amount: number; newBalance: number; error?: string }> {
    // Check if can claim
    const balanceInfo = await this.getBalance(userId);

    if (!balanceInfo.canClaimDaily) {
      const hoursRemaining = Math.ceil(
        (DAILY_BONUS_INTERVAL_MS - (Date.now() - (balanceInfo.lastDailyBonusAt?.getTime() || 0))) / (60 * 60 * 1000)
      );
      return {
        success: false,
        amount: 0,
        newBalance: balanceInfo.balance,
        error: `Daily bonus already claimed. ${hoursRemaining} hours remaining.`
      };
    }

    // Record transaction and update balance
    const transaction = db.transaction(() => {
      const currentBalance = balanceInfo.balance;
      const newBalance = currentBalance + DAILY_BONUS_AMOUNT;

      // Update user balance
      db.prepare(`
        UPDATE users
        SET token_balance = ?, daily_bonus_claimed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newBalance, userId);

      // Record transaction
      const txStmt = db.prepare(`
        INSERT INTO token_transactions
        (user_id, type, amount, balance_before, balance_after, description)
        VALUES (?, 'daily_bonus', ?, ?, ?, 'Daily login bonus')
      `);

      const result = txStmt.run(userId, DAILY_BONUS_AMOUNT, currentBalance, newBalance);

      return {
        transactionId: result.lastInsertRowid,
        newBalance
      };
    });

    const result = transaction();

    // Create reward record
    db.prepare(`
      INSERT INTO rewards (user_id, amount, description, reason)
      VALUES (?, ?, 'Daily login bonus', 'daily_bonus')
    `).run(userId, DAILY_BONUS_AMOUNT);

    return {
      success: true,
      amount: DAILY_BONUS_AMOUNT,
      newBalance: result.newBalance
    };
  },

  /**
   * Add tokens to user balance (purchase or reward)
   */
  async addTokens(
    userId: number,
    amount: number,
    type: TransactionType,
    description?: string,
    referenceId?: number,
    referenceType?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    const balanceInfo = await this.getBalance(userId);
    const newBalance = balanceInfo.balance + amount;

    // Update balance
    db.prepare(`
      UPDATE users SET token_balance = ? WHERE id = ?
    `).run(newBalance, userId);

    // Record transaction
    const stmt = db.prepare(`
      INSERT INTO token_transactions
      (user_id, type, amount, balance_before, balance_after, reference_id, reference_type, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      type,
      amount,
      balanceInfo.balance,
      newBalance,
      referenceId || null,
      referenceType || null,
      description || null
    );

    return { success: true, newBalance };
  },

  /**
   * Deduct tokens from user balance
   */
  async deductTokens(
    userId: number,
    amount: number,
    type: TransactionType,
    description?: string,
    referenceId?: number,
    referenceType?: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const balanceInfo = await this.getBalance(userId);

    if (balanceInfo.balance < amount) {
      return {
        success: false,
        newBalance: balanceInfo.balance,
        error: 'Insufficient token balance'
      };
    }

    const newBalance = balanceInfo.balance - amount;

    // Update balance
    db.prepare(`
      UPDATE users SET token_balance = ? WHERE id = ?
    `).run(newBalance, userId);

    // Record transaction
    const stmt = db.prepare(`
      INSERT INTO token_transactions
      (user_id, type, amount, balance_before, balance_after, reference_id, reference_type, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      type,
      amount,
      balanceInfo.balance,
      newBalance,
      referenceId || null,
      referenceType || null,
      description || null
    );

    return { success: true, newBalance };
  },

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TokenTransaction[]> {
    const stmt = db.prepare(`
      SELECT * FROM token_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(userId, limit, offset) as any[];

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as TransactionType,
      amount: row.amount,
      balanceBefore: row.balance_before,
      balanceAfter: row.balance_after,
      referenceId: row.reference_id,
      referenceType: row.reference_type,
      description: row.description,
      createdAt: new Date(row.created_at)
    }));
  },

  /**
   * Get transaction count
   */
  async getTransactionCount(userId: number): Promise<number> {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM token_transactions WHERE user_id = ?
    `);

    const row = stmt.get(userId) as any;
    return row?.count || 0;
  },

  /**
   * Get transaction summary stats
   */
  async getTransactionStats(userId: number): Promise<{
    totalPurchased: number;
    totalBonus: number;
    totalRewards: number;
    totalRedemptions: number;
    totalBetsPlaced: number;
    totalBetsWon: number;
    totalBetsLost: number;
  }> {
    const stmt = db.prepare(`
      SELECT
        type,
        SUM(amount) as total
      FROM token_transactions
      WHERE user_id = ?
      GROUP BY type
    `);

    const rows = stmt.all(userId) as any[];

    const stats = {
      totalPurchased: 0,
      totalBonus: 0,
      totalRewards: 0,
      totalRedemptions: 0,
      totalBetsPlaced: 0,
      totalBetsWon: 0,
      totalBetsLost: 0
    };

    for (const row of rows) {
      switch (row.type) {
        case 'purchase':
          stats.totalPurchased = row.total;
          break;
        case 'daily_bonus':
          stats.totalBonus = row.total;
          break;
        case 'reward':
          stats.totalRewards = row.total;
          break;
        case 'redemption':
          stats.totalRedemptions = row.total;
          break;
        case 'bet_placed':
          stats.totalBetsPlaced = row.total;
          break;
        case 'bet_won':
          stats.totalBetsWon = row.total;
          break;
        case 'bet_lost':
          stats.totalBetsLost = row.total;
          break;
      }
    }

    return stats;
  },

  /**
   * Transfer tokens between users (for rewards payouts)
   */
  async transferTokens(
    fromUserId: number,
    toUserId: number,
    amount: number,
    description: string,
    referenceId?: number,
    referenceType?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Check source balance
    const sourceBalance = await this.getBalance(fromUserId);
    if (sourceBalance.balance < amount) {
      return { success: false, error: 'Insufficient balance for transfer' };
    }

    // Get destination balance before transaction
    const destBalance = await this.getBalance(toUserId);

    const runTransaction = db.transaction(() => {
      // Deduct from source
      const newSourceBalance = sourceBalance.balance - amount;
      db.prepare(`UPDATE users SET token_balance = ? WHERE id = ?`).run(newSourceBalance, fromUserId);

      // Record source transaction
      db.prepare(`
        INSERT INTO token_transactions
        (user_id, type, amount, balance_before, balance_after, reference_id, reference_type, description)
        VALUES (?, 'redemption', ?, ?, ?, ?, ?, ?)
      `).run(fromUserId, amount, sourceBalance.balance, newSourceBalance, referenceId || null, referenceType || null, `Transfer: ${description}`);

      // Add to recipient
      const newDestBalance = destBalance.balance + amount;
      db.prepare(`UPDATE users SET token_balance = ? WHERE id = ?`).run(newDestBalance, toUserId);

      // Record destination transaction
      db.prepare(`
        INSERT INTO token_transactions
        (user_id, type, amount, balance_before, balance_after, reference_id, reference_type, description)
        VALUES (?, 'reward', ?, ?, ?, ?, ?, ?)
      `).run(toUserId, amount, destBalance.balance, newDestBalance, referenceId || null, referenceType || null, `Received: ${description}`);
    });

    try {
      runTransaction();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Transfer failed' };
    }
  }
};
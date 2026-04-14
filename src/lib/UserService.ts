import db from './db';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
  token_balance: number;
  created_at: string;
  updated_at: string;
}

const SALT_ROUNDS = 10;

export const UserService = {
  /**
   * Create a new user with hashed password
   */
  async create(email: string, password: string, name: string): Promise<User> {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      throw new Error('Email already registered');
    }

    if (!name || name.length > 64) {
      throw new Error('Name must be 1-64 characters');
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, token_balance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email, password_hash, name, 1000, now, now);

    const user = this.findById(result.lastInsertRowid as number);
    if (!user) throw new Error('Failed to create user');
    return user;
  },

  /**
   * Find user by email
   */
  findByEmail(email: string): User | null {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    return user || null;
  },

  /**
   * Find user by ID
   */
  findById(id: number): User | null {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    return user || null;
  },

  /**
   * Verify password for a user
   */
  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = this.findByEmail(email);
    if (!user) return null;

    const passwordHash = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as any;
    const isValid = await bcrypt.compare(password, passwordHash.password_hash);

    return isValid ? user : null;
  },

  /**
   * Update user profile information
   */
  updateProfile(id: number, updates: Partial<Pick<User, 'name' | 'email' | 'avatar_url'>>): User | null {
    const user = this.findById(id);
    if (!user) return null;

    if (updates.name && (updates.name.length === 0 || updates.name.length > 64)) {
      throw new Error('Name must be 1-64 characters');
    }

    if (updates.email && updates.email !== user.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(updates.email, id);
      if (existing) {
        throw new Error('Email already registered');
      }
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          avatar_url = COALESCE(?, avatar_url),
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(updates.name || null, updates.email || null, updates.avatar_url || null, now, id);
    return this.findById(id);
  },

  /**
   * Update token balance
   */
  updateTokenBalance(id: number, amount: number): User | null {
    const user = this.findById(id);
    if (!user) return null;

    const newBalance = user.token_balance + amount;
    if (newBalance < 0) {
      throw new Error('Insufficient token balance');
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET token_balance = ?, updated_at = ? WHERE id = ?').run(
      newBalance,
      now,
      id
    );

    return this.findById(id);
  },
};

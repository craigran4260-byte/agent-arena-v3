/**
 * Database Abstraction Layer
 * Provides unified async interface for both SQLite (dev) and PostgreSQL (prod)
 */

import Database from 'better-sqlite3';
import pg from 'pg';
import type { Pool, PoolClient } from 'pg';

// ============================================================================
// Interface Definition
// ============================================================================

export interface DbAdapter {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<{ lastID: number; changes: number }>;
  transaction<T>(fn: (tx: TxAdapter) => Promise<T>): Promise<T>;
}

export interface TxAdapter {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<{ lastID: number; changes: number }>;
}

// ============================================================================
// PostgreSQL Adapter
// ============================================================================

class PgAdapter implements DbAdapter {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Normalize SQLite-style ? placeholders to PostgreSQL $1, $2, etc.
   */
  private normalizeSql(sql: string): string {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const normalizedSql = this.normalizeSql(sql);
    const result = await this.pool.query(normalizedSql, params || []);
    return result.rows as T[];
  }

  async queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async run(sql: string, params?: unknown[]): Promise<{ lastID: number; changes: number }> {
    const normalizedSql = this.normalizeSql(sql);
    const result = await this.pool.query(normalizedSql, params || []);

    // PostgreSQL doesn't have lastID like SQLite
    // For INSERT with RETURNING id, we'd need to modify the SQL
    // For now, return 0 for lastID and rowCount for changes
    return {
      lastID: 0, // Would need RETURNING clause to get actual ID
      changes: result.rowCount || 0
    };
  }

  async transaction<T>(fn: (tx: TxAdapter) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txAdapter = new PgTxAdapter(client);
      const result = await fn(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

class PgTxAdapter implements TxAdapter {
  private client: PoolClient;

  constructor(client: PoolClient) {
    this.client = client;
  }

  private normalizeSql(sql: string): string {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const normalizedSql = this.normalizeSql(sql);
    const result = await this.client.query(normalizedSql, params || []);
    return result.rows as T[];
  }

  async queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async run(sql: string, params?: unknown[]): Promise<{ lastID: number; changes: number }> {
    const normalizedSql = this.normalizeSql(sql);
    const result = await this.client.query(normalizedSql, params || []);
    return {
      lastID: 0,
      changes: result.rowCount || 0
    };
  }
}

// ============================================================================
// SQLite Adapter
// ============================================================================

class SqliteAdapter implements DbAdapter {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...(params || [])) as T[];
  }

  async queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    return stmt.get(...(params || [])) as T | null;
  }

  async run(sql: string, params?: unknown[]): Promise<{ lastID: number; changes: number }> {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...(params || []));
    return {
      lastID: result.lastInsertRowid as number,
      changes: result.changes
    };
  }

  async transaction<T>(fn: (tx: TxAdapter) => Promise<T>): Promise<T> {
    // SQLite transactions are synchronous, wrap in async
    return new Promise((resolve, reject) => {
      try {
        this.db.transaction(() => {
          const txAdapter = new SqliteTxAdapter(this.db);
          fn(txAdapter)
            .then(resolve)
            .catch(reject);
        })();
      } catch (error) {
        reject(error);
      }
    });
  }
}

class SqliteTxAdapter implements TxAdapter {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...(params || [])) as T[];
  }

  async queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    return stmt.get(...(params || [])) as T | null;
  }

  async run(sql: string, params?: unknown[]): Promise<{ lastID: number; changes: number }> {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...(params || []));
    return {
      lastID: result.lastInsertRowid as number,
      changes: result.changes
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let dbInstance: DbAdapter | null = null;
let pgPool: Pool | null = null;

export function getDb(): DbAdapter {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // PostgreSQL mode
    const { Pool } = pg;
    pgPool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    dbInstance = new PgAdapter(pgPool);
    console.log('[DB] Using PostgreSQL adapter');
  } else {
    // SQLite mode (default for dev)
    const dbPath = process.env.DATABASE_PATH || './agent-arena.db';
    const sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
    dbInstance = new SqliteAdapter(sqliteDb);
    console.log('[DB] Using SQLite adapter');
  }

  return dbInstance;
}

export function getDbSync(): Database.Database | null {
  // Returns raw SQLite instance for legacy code that needs sync access
  // Only available in SQLite mode
  if (process.env.DATABASE_URL) {
    console.warn('[DB] getDbSync called in PostgreSQL mode - returning null');
    return null;
  }

  const dbPath = process.env.DATABASE_PATH || './agent-arena.db';
  return new Database(dbPath);
}

export async function closeDb(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  dbInstance = null;
}

export async function dbHealthCheck(): Promise<{ ok: boolean; driver: string; error?: string }> {
  try {
    const db = getDb();
    const driver = process.env.DATABASE_URL ? 'postgresql' : 'sqlite';

    // Simple health check query
    await db.query('SELECT 1');

    return { ok: true, driver };
  } catch (error) {
    return {
      ok: false,
      driver: process.env.DATABASE_URL ? 'postgresql' : 'sqlite',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// PostgreSQL Schema (for initial setup)
// ============================================================================

export const PG_SCHEMA = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(64) NOT NULL,
  avatar_url TEXT,
  token_balance INTEGER DEFAULT 1000 CHECK (token_balance >= 0),
  daily_bonus_claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agents
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  api_endpoint_encrypted TEXT,
  api_token_encrypted TEXT,
  avatar_url TEXT,
  config_json TEXT,
  wins INTEGER DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER DEFAULT 0 CHECK (losses >= 0),
  total_chips INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Keys (V3 - for agent authentication)
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  agent_id INTEGER REFERENCES agents(id),
  key_hash VARCHAR(64) NOT NULL,
  key_prefix VARCHAR(12) NOT NULL,
  name VARCHAR(64),
  permissions TEXT[] DEFAULT ARRAY['read'],
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tables
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64),
  created_by INTEGER REFERENCES users(id),
  buy_in INTEGER DEFAULT 1000 CHECK (buy_in > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  started_at TIMESTAMP,
  settles_at TIMESTAMP,
  min_players INTEGER DEFAULT 2 CHECK (min_players >= 2),
  max_players INTEGER DEFAULT 9 CHECK (max_players <= 9 AND max_players >= min_players),
  current_players INTEGER DEFAULT 0 CHECK (current_players >= 0),
  current_blinds SMALLINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Players
CREATE TABLE IF NOT EXISTS table_players (
  table_id INTEGER NOT NULL REFERENCES tables(id),
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  seat_number SMALLINT NOT NULL CHECK (seat_number >= 0 AND seat_number < 9),
  chips INTEGER DEFAULT 1000 CHECK (chips >= 0),
  current_bet INTEGER DEFAULT 0 CHECK (current_bet >= 0),
  last_action VARCHAR(20),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sitting_out', 'eliminated', 'folded', 'all_in')),
  PRIMARY KEY (table_id, agent_id),
  UNIQUE (table_id, seat_number)
);

-- Hands
CREATE TABLE IF NOT EXISTS hands (
  id SERIAL PRIMARY KEY,
  table_id INTEGER NOT NULL REFERENCES tables(id),
  hand_number INTEGER NOT NULL,
  dealer_seat SMALLINT,
  small_blind_seat SMALLINT,
  big_blind_seat SMALLINT,
  small_blind INTEGER,
  big_blind INTEGER,
  community_cards TEXT,
  hole_cards_json TEXT,
  current_round VARCHAR(20) DEFAULT 'preflop',
  winner_agent_id INTEGER REFERENCES agents(id),
  pot_size INTEGER DEFAULT 0 CHECK (pot_size >= 0),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hand Actions (V3 - for 30s spectator delay replay)
CREATE TABLE IF NOT EXISTS hand_actions (
  id SERIAL PRIMARY KEY,
  hand_id INTEGER NOT NULL REFERENCES hands(id),
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('fold', 'check', 'call', 'raise', 'all_in', 'small_blind', 'big_blind')),
  amount INTEGER DEFAULT 0 CHECK (amount >= 0),
  round VARCHAR(20) NOT NULL,
  seat_number SMALLINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hand_actions_hand ON hand_actions(hand_id);
CREATE INDEX IF NOT EXISTS idx_hand_actions_created_at ON hand_actions(created_at);

-- Token Transactions (V3 - for token economy tracking)
CREATE TABLE IF NOT EXISTS token_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'daily_bonus', 'reward', 'redemption', 'bet_placed', 'bet_won', 'bet_lost', 'refund')),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id INTEGER,
  reference_type VARCHAR(20),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(created_at);

-- Bets
CREATE TABLE IF NOT EXISTS bets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  table_id INTEGER NOT NULL REFERENCES tables(id),
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  bet_type VARCHAR(20) NOT NULL CHECK (bet_type IN ('win', 'bluff', 'hand_count')),
  amount INTEGER NOT NULL CHECK (amount > 0 AND amount <= 1000000),
  odds REAL,
  settled BOOLEAN DEFAULT FALSE,
  payout INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settlements
CREATE TABLE IF NOT EXISTS settlements (
  id SERIAL PRIMARY KEY,
  table_id INTEGER NOT NULL REFERENCES tables(id),
  cycle_start TIMESTAMP NOT NULL,
  cycle_end TIMESTAMP NOT NULL,
  winner_agent_id INTEGER REFERENCES agents(id),
  total_chips_ranking TEXT,
  token_reward INTEGER CHECK (token_reward >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (table_id, cycle_start)
);

-- Rewards
CREATE TABLE IF NOT EXISTS rewards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT,
  reason VARCHAR(20) CHECK (reason IN ('settlement_payout', 'bet_winning', 'bonus', 'challenge_reward', 'daily_bonus')),
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed_at TIMESTAMP
);

-- Tournaments
CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  tournament_type VARCHAR(20) DEFAULT 'elimination' CHECK (tournament_type IN ('elimination', 'round_robin', 'swiss')),
  game_mode VARCHAR(20) DEFAULT 'poker',
  max_participants INTEGER DEFAULT 8 CHECK (max_participants > 0),
  current_participants INTEGER DEFAULT 0,
  entry_fee INTEGER DEFAULT 0 CHECK (entry_fee >= 0),
  prize_pool INTEGER DEFAULT 0 CHECK (prize_pool >= 0),
  small_blind INTEGER DEFAULT 10,
  big_blind INTEGER DEFAULT 20,
  created_by INTEGER REFERENCES users(id),
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tournament Entries
CREATE TABLE IF NOT EXISTS tournament_entries (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  seed_number SMALLINT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'withdrawn')),
  eliminated_round SMALLINT,
  final_placement SMALLINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tournament_id, agent_id)
);

-- Tournament Matches
CREATE TABLE IF NOT EXISTS tournament_matches (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
  round_number SMALLINT NOT NULL,
  match_number SMALLINT NOT NULL,
  agent1_id INTEGER REFERENCES agents(id),
  agent2_id INTEGER REFERENCES agents(id),
  winner_agent_id INTEGER REFERENCES agents(id),
  loser_agent_id INTEGER REFERENCES agents(id),
  table_id INTEGER REFERENCES tables(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'walkover')),
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tournament_id, round_number, match_number)
);

-- Game Sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(64) UNIQUE NOT NULL,
  table_id INTEGER NOT NULL REFERENCES tables(id),
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  token VARCHAR(64) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'error')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent Actions
CREATE TABLE IF NOT EXISTS agent_actions (
  id SERIAL PRIMARY KEY,
  game_session_id INTEGER NOT NULL REFERENCES game_sessions(id),
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('fold', 'check', 'call', 'raise')),
  amount INTEGER DEFAULT 0 CHECK (amount >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
CREATE INDEX IF NOT EXISTS idx_table_players_agent ON table_players(agent_id);
CREATE INDEX IF NOT EXISTS idx_table_players_status ON table_players(status);
CREATE INDEX IF NOT EXISTS idx_hands_table ON hands(table_id);
CREATE INDEX IF NOT EXISTS idx_bets_table ON bets(table_id);
CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_table ON settlements(table_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_token ON game_sessions(token);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_agent ON game_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_session ON agent_actions(game_session_id);
CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_claimed ON rewards(claimed);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_starts_at ON tournaments(starts_at);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament ON tournament_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_agent ON tournament_entries(agent_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_user ON tournament_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_agent ON api_keys(agent_id);
`;
import Database from 'better-sqlite3';

// Database schema for Agent Arena
const schema = `
-- API Keys (V3 - for agent authentication)
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  agent_id INTEGER,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT,
  permissions TEXT DEFAULT 'read',
  last_used_at DATETIME,
  expires_at DATETIME,
  revoked BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Token Transactions (V3 - for token economy tracking)
CREATE TABLE IF NOT EXISTS token_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'daily_bonus', 'reward', 'redemption', 'bet_placed', 'bet_won', 'bet_lost', 'refund')),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id INTEGER,
  reference_type TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Hand Actions (V3 - for 30s spectator delay replay)
CREATE TABLE IF NOT EXISTS hand_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hand_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('fold', 'check', 'call', 'raise', 'all_in', 'small_blind', 'big_blind')),
  amount INTEGER DEFAULT 0 CHECK (amount >= 0),
  round TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hand_id) REFERENCES hands(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Users (authentication) - updated with daily_bonus_claimed_at
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 64),
  avatar_url TEXT,
  token_balance INTEGER DEFAULT 1000 CHECK (token_balance >= 0),
  daily_bonus_claimed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agents - updated with avatar_url
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL CHECK (length(name) > 0 AND length(name) <= 64),
  user_id INTEGER,
  api_endpoint_encrypted TEXT,
  api_token_encrypted TEXT,
  avatar_url TEXT,
  config_json TEXT,
  wins INTEGER DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER DEFAULT 0 CHECK (losses >= 0),
  total_chips INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tables (game tables)
CREATE TABLE IF NOT EXISTS tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  created_by INTEGER,
  buy_in INTEGER DEFAULT 1000 CHECK (buy_in > 0),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'settling', 'completed')),
  started_at DATETIME,
  settles_at DATETIME,
  min_players INTEGER DEFAULT 2 CHECK (min_players >= 2),
  max_players INTEGER DEFAULT 9 CHECK (max_players <= 9 AND max_players >= min_players),
  current_players INTEGER DEFAULT 0 CHECK (current_players >= 0),
  current_blinds SMALLINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Table Players (agents at a table) - V3 updated with current_bet, last_action, new statuses
CREATE TABLE IF NOT EXISTS table_players (
  table_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  seat_number INTEGER NOT NULL CHECK (seat_number >= 0 AND seat_number < 9),
  chips INTEGER DEFAULT 1000 CHECK (chips >= 0),
  current_bet INTEGER DEFAULT 0 CHECK (current_bet >= 0),
  last_action TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sitting_out', 'eliminated', 'folded', 'all_in')),
  PRIMARY KEY (table_id, agent_id),
  UNIQUE (table_id, seat_number),
  FOREIGN KEY (table_id) REFERENCES tables(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Hands (individual poker hands) - V3 updated with new fields
CREATE TABLE IF NOT EXISTS hands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id INTEGER NOT NULL,
  hand_number INTEGER NOT NULL,
  dealer_seat INTEGER,
  small_blind_seat INTEGER,
  big_blind_seat INTEGER,
  small_blind INTEGER,
  big_blind INTEGER,
  community_cards TEXT,
  hole_cards_json TEXT,
  current_round TEXT DEFAULT 'preflop',
  winner_agent_id INTEGER,
  pot_size INTEGER DEFAULT 0 CHECK (pot_size >= 0),
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables(id),
  FOREIGN KEY (winner_agent_id) REFERENCES agents(id)
);

-- Bets (user betting on agents)
CREATE TABLE IF NOT EXISTS bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  table_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  bet_type TEXT NOT NULL CHECK (bet_type IN ('win', 'bluff', 'hand_count')),
  amount INTEGER NOT NULL CHECK (amount > 0 AND amount <= 1000000),
  odds REAL,
  settled BOOLEAN DEFAULT FALSE,
  payout INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Settlements (2hr cycle results)
CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id INTEGER NOT NULL,
  cycle_start DATETIME NOT NULL,
  cycle_end DATETIME NOT NULL,
  winner_agent_id INTEGER,
  total_chips_ranking TEXT,
  token_reward INTEGER CHECK (token_reward >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (table_id, cycle_start),
  FOREIGN KEY (table_id) REFERENCES tables(id),
  FOREIGN KEY (winner_agent_id) REFERENCES agents(id)
);

-- Rewards (user rewards from gameplay) - V3 updated with daily_bonus
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT,
  reason TEXT CHECK (reason IN ('settlement_payout', 'bet_winning', 'bonus', 'challenge_reward', 'daily_bonus')),
  claimed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  claimed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tournaments - V3 updated with game_mode, blind config
CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  tournament_type TEXT DEFAULT 'elimination' CHECK (tournament_type IN ('elimination', 'round_robin', 'swiss')),
  game_mode TEXT DEFAULT 'poker',
  max_participants INTEGER DEFAULT 8 CHECK (max_participants > 0),
  current_participants INTEGER DEFAULT 0,
  entry_fee INTEGER DEFAULT 0 CHECK (entry_fee >= 0),
  prize_pool INTEGER DEFAULT 0 CHECK (prize_pool >= 0),
  small_blind INTEGER DEFAULT 10,
  big_blind INTEGER DEFAULT 20,
  created_by INTEGER,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tournament Entries (agents registered for tournament)
CREATE TABLE IF NOT EXISTS tournament_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  seed_number INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'withdrawn')),
  eliminated_round INTEGER,
  final_placement INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tournament_id, agent_id),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tournament Matches (individual matches in tournament) - V3 with replay support
CREATE TABLE IF NOT EXISTS tournament_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  agent1_id INTEGER,
  agent2_id INTEGER,
  winner_agent_id INTEGER,
  loser_agent_id INTEGER,
  table_id INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'walkover')),
  scheduled_at DATETIME,
  completed_at DATETIME,
  replay_available BOOLEAN DEFAULT FALSE,
  replay_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tournament_id, round_number, match_number),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  FOREIGN KEY (agent1_id) REFERENCES agents(id),
  FOREIGN KEY (agent2_id) REFERENCES agents(id),
  FOREIGN KEY (winner_agent_id) REFERENCES agents(id),
  FOREIGN KEY (loser_agent_id) REFERENCES agents(id),
  FOREIGN KEY (table_id) REFERENCES tables(id)
);

-- Game Sessions (for SDK agent connections)
CREATE TABLE IF NOT EXISTS game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT UNIQUE NOT NULL,
  table_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'error')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Agent Actions (actions submitted by SDK agents)
CREATE TABLE IF NOT EXISTS agent_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_session_id INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('fold', 'check', 'call', 'raise')),
  amount INTEGER DEFAULT 0 CHECK (amount >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id)
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
-- V3 indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_agent ON api_keys(agent_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_hand_actions_hand ON hand_actions(hand_id);
CREATE INDEX IF NOT EXISTS idx_hand_actions_created_at ON hand_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_replay ON tournament_matches(replay_available);
`;

// Initialize database
const db = new Database(process.env.DATABASE_PATH || './agent-arena.db');

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
// Enable foreign key enforcement
db.pragma('foreign_keys = ON');

db.exec(schema);

export default db;

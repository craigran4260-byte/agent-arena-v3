/**
 * API Key Service (V3)
 * Handles generation, validation, and management of API keys for agent authentication
 */

import crypto from 'crypto';
import db from './db';

// API Key permissions
export type ApiKeyPermission = 'read' | 'write' | 'admin' | 'agent_play';

export interface ApiKey {
  id: number;
  userId: number;
  agentId: number | null;
  keyPrefix: string;
  name: string | null;
  permissions: ApiKeyPermission[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revoked: boolean;
  createdAt: Date;
}

export interface CreateApiKeyOptions {
  userId: number;
  agentId?: number;
  name?: string;
  permissions?: ApiKeyPermission[];
  expiresInDays?: number;
}

export interface ValidatedKey {
  valid: boolean;
  key?: ApiKey;
  error?: string;
}

// Prefix for Agent Arena API keys
const KEY_PREFIX = 'aa_';
const KEY_LENGTH = 32; // Full key: aa_live_xxxxxx (prefix + mode + random)
const HASH_ALGORITHM = 'sha256';

/**
 * Generate a secure API key
 * Format: aa_live_<32 random chars> or aa_test_<32 random chars>
 */
function generateKey(isTest: boolean = false): { fullKey: string; keyHash: string; keyPrefix: string } {
  const mode = isTest ? 'test' : 'live';
  const randomBytes = crypto.randomBytes(KEY_LENGTH).toString('hex').slice(0, KEY_LENGTH);
  const fullKey = `${KEY_PREFIX}${mode}_${randomBytes}`;
  const keyHash = crypto.createHash(HASH_ALGORITHM).update(fullKey).digest('hex');
  const displayPrefix = `${KEY_PREFIX}${mode}_${randomBytes.slice(0, 8)}...`;

  return { fullKey, keyHash, keyPrefix: displayPrefix };
}

/**
 * Hash an API key for storage
 */
function hashKey(key: string): string {
  return crypto.createHash(HASH_ALGORITHM).update(key).digest('hex');
}

/**
 * Parse permissions from database
 */
function parsePermissions(permissionsStr: string): ApiKeyPermission[] {
  // SQLite stores as comma-separated string, PostgreSQL as array
  if (permissionsStr.startsWith('[')) {
    // PostgreSQL array format
    try {
      const cleaned = permissionsStr.replace(/^\[|\]$/g, '');
      return JSON.parse(`[${cleaned.split(',').map(p => `"${p.trim().replace(/"/g, '')}"`).join(',')}]`);
    } catch {
      return ['read'];
    }
  }
  // SQLite format
  return permissionsStr.split(',').map(p => p.trim() as ApiKeyPermission).filter(Boolean);
}

export const ApiKeyService = {
  /**
   * Create a new API key
   */
  async create(options: CreateApiKeyOptions): Promise<{ key: ApiKey; fullKey: string }> {
    const { fullKey, keyHash, keyPrefix } = generateKey();

    const permissions = options.permissions || ['read'];
    const expiresAt = options.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Determine if we're using PostgreSQL or SQLite
    const isPostgres = process.env.DATABASE_URL;
    const permissionsStr = isPostgres
      ? `{${permissions.map(p => `"${p}"`).join(',')}}`  // PostgreSQL array format
      : permissions.join(',');  // SQLite comma-separated

    const stmt = db.prepare(`
      INSERT INTO api_keys (user_id, agent_id, key_hash, key_prefix, name, permissions, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      options.userId,
      options.agentId || null,
      keyHash,
      keyPrefix,
      options.name || null,
      permissionsStr,
      expiresAt?.toISOString() || null
    );

    const key: ApiKey = {
      id: result.lastInsertRowid as number,
      userId: options.userId,
      agentId: options.agentId || null,
      keyPrefix: keyPrefix,
      name: options.name || null,
      permissions,
      lastUsedAt: null,
      expiresAt,
      revoked: false,
      createdAt: new Date()
    };

    return { key, fullKey };
  },

  /**
   * Validate an API key
   */
  async validate(fullKey: string): Promise<ValidatedKey> {
    if (!fullKey || !fullKey.startsWith(KEY_PREFIX)) {
      return { valid: false, error: 'Invalid key format' };
    }

    const keyHash = hashKey(fullKey);

    const stmt = db.prepare(`
      SELECT * FROM api_keys WHERE key_hash = ? AND revoked = FALSE
    `);

    const row = stmt.get(keyHash) as any;

    if (!row) {
      return { valid: false, error: 'Key not found or revoked' };
    }

    // Check expiration
    if (row.expires_at) {
      const expiresAt = new Date(row.expires_at);
      if (expiresAt < new Date()) {
        return { valid: false, error: 'Key has expired' };
      }
    }

    // Update last_used_at
    db.prepare(`UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?`).run(row.id);

    const key: ApiKey = {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      keyPrefix: row.key_prefix,
      name: row.name,
      permissions: parsePermissions(row.permissions),
      lastUsedAt: new Date(),
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      revoked: row.revoked,
      createdAt: new Date(row.created_at)
    };

    return { valid: true, key };
  },

  /**
   * List all API keys for a user
   */
  async listByUser(userId: number): Promise<ApiKey[]> {
    const stmt = db.prepare(`
      SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC
    `);

    const rows = stmt.all(userId) as any[];

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      keyPrefix: row.key_prefix,
      name: row.name,
      permissions: parsePermissions(row.permissions),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      revoked: row.revoked,
      createdAt: new Date(row.created_at)
    }));
  },

  /**
   * Get a specific API key by ID
   */
  async getById(keyId: number, userId: number): Promise<ApiKey | null> {
    const stmt = db.prepare(`
      SELECT * FROM api_keys WHERE id = ? AND user_id = ?
    `);

    const row = stmt.get(keyId, userId) as any;

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      keyPrefix: row.key_prefix,
      name: row.name,
      permissions: parsePermissions(row.permissions),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      revoked: row.revoked,
      createdAt: new Date(row.created_at)
    };
  },

  /**
   * Revoke an API key
   */
  async revoke(keyId: number, userId: number): Promise<boolean> {
    const stmt = db.prepare(`
      UPDATE api_keys SET revoked = TRUE WHERE id = ? AND user_id = ? AND revoked = FALSE
    `);

    const result = stmt.run(keyId, userId);
    return result.changes > 0;
  },

  /**
   * Delete an API key (permanent removal)
   */
  async delete(keyId: number, userId: number): Promise<boolean> {
    const stmt = db.prepare(`
      DELETE FROM api_keys WHERE id = ? AND user_id = ?
    `);

    const result = stmt.run(keyId, userId);
    return result.changes > 0;
  },

  /**
   * Update API key name
   */
  async updateName(keyId: number, userId: number, name: string): Promise<boolean> {
    const stmt = db.prepare(`
      UPDATE api_keys SET name = ? WHERE id = ? AND user_id = ? AND revoked = FALSE
    `);

    const result = stmt.run(name, keyId, userId);
    return result.changes > 0;
  },

  /**
   * Check if a key has a specific permission
   */
  hasPermission(key: ApiKey, permission: ApiKeyPermission): boolean {
    return key.permissions.includes(permission) || key.permissions.includes('admin');
  },

  /**
   * Get key count for a user
   */
  async countByUser(userId: number): Promise<{ total: number; active: number; revoked: number }> {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN revoked = FALSE THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN revoked = TRUE THEN 1 ELSE 0 END) as revoked
      FROM api_keys WHERE user_id = ?
    `);

    const row = stmt.get(userId) as any;

    return {
      total: row.total || 0,
      active: row.active || 0,
      revoked: row.revoked || 0
    };
  }
};
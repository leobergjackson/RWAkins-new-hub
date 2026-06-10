// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent

import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

// ── Interface ───────────────────────────────────────────────────

/**
 * PersistenceProvider — Abstraction for key-value storage.
 *
 * Supports two backends:
 * - JSON files (default, current behavior)
 * - SQLite via better-sqlite3 (atomic writes, single-file DB)
 *
 * Selection via env var: PERSISTENCE_MODE=sqlite | json (default: json)
 */
export interface PersistenceProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  list(): Promise<string[]>;
  close(): Promise<void>;
}

// ── JSON File Provider ──────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..');

/**
 * JsonFilePersistence — Reads/writes JSON files in the agent root directory.
 *
 * Each key maps to a `.json` file: key "agent-memory" -> `.agent-memory.json`
 * This preserves the current behavior of all existing services.
 */
export class JsonFilePersistence implements PersistenceProvider {
  private readonly dataDir: string;

  constructor(dataDir: string = DATA_DIR) {
    this.dataDir = dataDir;
    logger.debug('JsonFilePersistence initialized', { dataDir: this.dataDir });
  }

  private filePath(key: string): string {
    // Keys like "agent-memory" become ".agent-memory.json"
    const filename = key.endsWith('.json') ? key : `.${key}.json`;
    return join(this.dataDir, filename);
  }

  async get<T>(key: string): Promise<T | null> {
    const path = this.filePath(key);
    if (!existsSync(path)) return null;
    try {
      const raw = readFileSync(path, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn(`JsonFilePersistence: failed to read ${key}`, { error: String(err) });
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const path = this.filePath(key);
    try {
      writeFileSync(path, JSON.stringify(value, null, 2), 'utf-8');
    } catch (err) {
      logger.error(`JsonFilePersistence: failed to write ${key}`, { error: String(err) });
      throw err;
    }
  }

  async delete(key: string): Promise<boolean> {
    const path = this.filePath(key);
    if (!existsSync(path)) return false;
    try {
      unlinkSync(path);
      return true;
    } catch (err) {
      logger.warn(`JsonFilePersistence: failed to delete ${key}`, { error: String(err) });
      return false;
    }
  }

  async list(): Promise<string[]> {
    try {
      const files = readdirSync(this.dataDir);
      return files
        .filter(f => f.startsWith('.') && f.endsWith('.json'))
        .map(f => f.replace(/^\./, '').replace(/\.json$/, ''));
    } catch {
      return [];
    }
  }

  async close(): Promise<void> {
    // No-op for file-based persistence
  }
}

// ── SQLite Provider ─────────────────────────────────────────────

/**
 * SqlitePersistence — Uses better-sqlite3 for atomic key-value storage.
 *
 * Creates a single `aerofyta.db` file with a `key_value` table.
 * All writes are atomic (SQLite transactions).
 * Requires `better-sqlite3` package: npm install better-sqlite3
 *
 * Schema:
 *   CREATE TABLE IF NOT EXISTS key_value (
 *     key TEXT PRIMARY KEY,
 *     value TEXT NOT NULL,
 *     updated_at TEXT DEFAULT (datetime('now'))
 *   );
 */
export class SqlitePersistence implements PersistenceProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  constructor(dbPath: string = join(DATA_DIR, 'aerofyta.db')) {
    try {
      // Dynamic import to avoid hard dependency when using JSON mode
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require('better-sqlite3');
      this.db = new Database(dbPath);

      // Enable WAL mode for better concurrent read performance
      this.db.pragma('journal_mode = WAL');

      // Create table if it doesn't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS key_value (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      logger.info('SqlitePersistence initialized', { dbPath });
    } catch (err) {
      logger.error('SqlitePersistence: failed to initialize — is better-sqlite3 installed?', {
        error: String(err),
      });
      throw new Error(
        'SqlitePersistence requires better-sqlite3. Install it: npm install better-sqlite3'
      );
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const row = this.db.prepare('SELECT value FROM key_value WHERE key = ?').get(key) as
        | { value: string }
        | undefined;
      if (!row) return null;
      return JSON.parse(row.value) as T;
    } catch (err) {
      logger.warn(`SqlitePersistence: failed to get ${key}`, { error: String(err) });
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const json = JSON.stringify(value);
      this.db
        .prepare(
          `INSERT INTO key_value (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
        )
        .run(key, json);
    } catch (err) {
      logger.error(`SqlitePersistence: failed to set ${key}`, { error: String(err) });
      throw err;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = this.db.prepare('DELETE FROM key_value WHERE key = ?').run(key);
      return result.changes > 0;
    } catch (err) {
      logger.warn(`SqlitePersistence: failed to delete ${key}`, { error: String(err) });
      return false;
    }
  }

  async list(): Promise<string[]> {
    try {
      const rows = this.db.prepare('SELECT key FROM key_value ORDER BY key').all() as {
        key: string;
      }[];
      return rows.map(r => r.key);
    } catch {
      return [];
    }
  }

  async close(): Promise<void> {
    try {
      this.db?.close();
      logger.info('SqlitePersistence: database closed');
    } catch (err) {
      logger.warn('SqlitePersistence: error closing database', { error: String(err) });
    }
  }
}

// ── PostgreSQL Provider ──────────────────────────────────────────

/**
 * PostgresPersistence — Production-grade PostgreSQL backend with JSONB storage.
 *
 * Uses `pg` (node-postgres) with connection pooling for high-throughput persistence.
 * Connection string from DATABASE_URL env var.
 *
 * Schema:
 *   CREATE TABLE IF NOT EXISTS kv_store (
 *     key TEXT PRIMARY KEY,
 *     value JSONB NOT NULL,
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 * Features:
 * - UPSERT via INSERT ... ON CONFLICT DO UPDATE
 * - Connection pooling with pg.Pool (default 10 connections)
 * - JSONB column for rich querying capabilities
 * - Auto-creates table on first use
 */
export class PostgresPersistence implements PersistenceProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pool: any;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(connectionString?: string) {
    const dbUrl = connectionString ?? process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error(
        'PostgresPersistence requires DATABASE_URL env var or connectionString parameter'
      );
    }

    try {
      // Dynamic import to avoid hard dependency when using JSON/SQLite mode
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool } = require('pg');
      this.pool = new Pool({
        connectionString: dbUrl,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Handle pool errors to prevent unhandled rejections
      this.pool.on('error', (err: Error) => {
        logger.error('PostgresPersistence: unexpected pool error', { error: String(err) });
      });

      logger.info('PostgresPersistence initialized', {
        host: dbUrl.replace(/\/\/.*@/, '//<redacted>@'),
      });
    } catch (err) {
      logger.error('PostgresPersistence: failed to initialize — is pg installed?', {
        error: String(err),
      });
      throw new Error('PostgresPersistence requires pg. Install it: npm install pg');
    }
  }

  /** Ensure the kv_store table exists (called once, lazily). */
  private async ensureTable(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS kv_store (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        this.initialized = true;
        logger.debug('PostgresPersistence: kv_store table ready');
      })();
    }
    await this.initPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureTable();
      const result = await this.pool.query(
        'SELECT value FROM kv_store WHERE key = $1',
        [key]
      );
      if (result.rows.length === 0) return null;
      return result.rows[0].value as T;
    } catch (err) {
      logger.warn(`PostgresPersistence: failed to get ${key}`, { error: String(err) });
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await this.ensureTable();
      await this.pool.query(
        `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, JSON.stringify(value)]
      );
    } catch (err) {
      logger.error(`PostgresPersistence: failed to set ${key}`, { error: String(err) });
      throw err;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.ensureTable();
      const result = await this.pool.query(
        'DELETE FROM kv_store WHERE key = $1',
        [key]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      logger.warn(`PostgresPersistence: failed to delete ${key}`, { error: String(err) });
      return false;
    }
  }

  async list(): Promise<string[]> {
    try {
      await this.ensureTable();
      const result = await this.pool.query('SELECT key FROM kv_store ORDER BY key');
      return result.rows.map((r: { key: string }) => r.key);
    } catch {
      return [];
    }
  }

  async close(): Promise<void> {
    try {
      await this.pool?.end();
      logger.info('PostgresPersistence: connection pool closed');
    } catch (err) {
      logger.warn('PostgresPersistence: error closing pool', { error: String(err) });
    }
  }
}

// ── Factory ─────────────────────────────────────────────────────

export type PersistenceMode = 'json' | 'sqlite' | 'postgres';

/**
 * Create a PersistenceProvider based on the PERSISTENCE_MODE env var.
 *
 * @param mode - Override env var; 'json' (default), 'sqlite', or 'postgres'
 * @returns A ready-to-use PersistenceProvider instance
 *
 * @example
 * ```ts
 * const store = createPersistence(); // uses PERSISTENCE_MODE env var
 * await store.set('config', { theme: 'dark' });
 * const config = await store.get<{ theme: string }>('config');
 * ```
 */
export function createPersistence(mode?: PersistenceMode): PersistenceProvider {
  const resolvedMode = mode ?? (process.env.PERSISTENCE_MODE as PersistenceMode) ?? 'json';

  switch (resolvedMode) {
    case 'postgres':
      logger.info('Using PostgreSQL persistence (PERSISTENCE_MODE=postgres)');
      return new PostgresPersistence();
    case 'sqlite':
      logger.info('Using SQLite persistence (PERSISTENCE_MODE=sqlite)');
      return new SqlitePersistence();
    default:
      logger.info('Using JSON file persistence (default)');
      return new JsonFilePersistence();
  }
}

/**
 * Get metadata about available persistence backends.
 * Used by the /api/system/persistence endpoint.
 */
export function getPersistenceInfo(): {
  mode: PersistenceMode;
  available: PersistenceMode[];
  current: PersistenceMode;
  features: Record<PersistenceMode, string>;
} {
  const mode = (process.env.PERSISTENCE_MODE as PersistenceMode) || 'json';
  return {
    mode,
    available: ['json', 'sqlite', 'postgres'],
    current: mode,
    features: {
      json: 'Zero-dependency file-based (default, hackathon-ready)',
      sqlite: 'Embedded SQL database with WAL mode',
      postgres: 'Production-grade PostgreSQL with JSONB + connection pooling',
    },
  };
}

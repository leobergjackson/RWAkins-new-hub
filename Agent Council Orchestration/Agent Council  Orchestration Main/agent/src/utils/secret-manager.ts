// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Simple secrets manager with env-var backing and in-memory overrides.

import { logger } from './logger.js';

const PREFIX = 'AEROFYTA_';

/** In-memory secret overrides (not persisted across restarts). */
const memoryStore = new Map<string, string>();

/**
 * Read a secret by key. Checks in-memory store first, then env vars with AEROFYTA_ prefix.
 *
 * @param key Secret key (without prefix). E.g. 'API_KEY' reads AEROFYTA_API_KEY.
 * @returns The secret value, or undefined if not found.
 */
export function getSecret(key: string): string | undefined {
  const normalised = key.toUpperCase();
  // In-memory overrides take priority
  if (memoryStore.has(normalised)) {
    return memoryStore.get(normalised);
  }
  return process.env[`${PREFIX}${normalised}`];
}

/**
 * Store a secret in memory (not persisted to disk or env).
 * Overwrites any previous in-memory value for this key.
 */
export function setSecret(key: string, value: string): void {
  const normalised = key.toUpperCase();
  memoryStore.set(normalised, value);
  logger.info('Secret stored in memory', { key: `${PREFIX}${normalised}` });
}

/**
 * List all known secret keys (from both env and memory store).
 * Returns keys WITHOUT the prefix, and never returns values.
 */
export function listSecrets(): string[] {
  const keys = new Set<string>();

  // Env vars with the AEROFYTA_ prefix
  for (const envKey of Object.keys(process.env)) {
    if (envKey.startsWith(PREFIX)) {
      keys.add(envKey.slice(PREFIX.length));
    }
  }

  // In-memory overrides
  for (const memKey of memoryStore.keys()) {
    keys.add(memKey);
  }

  return [...keys].sort();
}

/**
 * Mask a secret value for safe display.
 * Returns first 3 and last 3 characters with '...' in between.
 * Short values (<=6 chars) are fully masked as '***'.
 */
export function maskSecret(value: string): string {
  if (value.length <= 6) {
    return '***';
  }
  return `${value.slice(0, 3)}...${value.slice(-3)}`;
}

/**
 * Validate that all required secrets are present.
 *
 * @param keys Array of secret keys (without prefix) that must exist.
 * @returns Object with `ok` boolean and list of `missing` keys.
 */
export function validateRequiredSecrets(
  keys: string[],
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const key of keys) {
    if (getSecret(key) === undefined) {
      missing.push(key);
    }
  }
  return { ok: missing.length === 0, missing };
}

/**
 * Clear all in-memory secrets. Env vars are not affected.
 */
export function clearMemorySecrets(): void {
  memoryStore.clear();
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — LLM Decision Cache Service
//
// Hashes the agent decision context (wallet balances, creator scores, market data)
// and caches LLM decision results. If the context hasn't changed, the cached
// decision is returned — saving LLM API calls and cost.
// Inspired by Forage's context-hashing approach.

import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export interface DecisionContext {
  walletBalances?: Record<string, number>;
  creatorScores?: Record<string, number>;
  marketData?: Record<string, unknown>;
  pendingTips?: number;
  cycleNumber?: number;
  [key: string]: unknown;
}

export interface CachedDecision {
  hash: string;
  decision: unknown;
  cachedAt: string;
  hitCount: number;
}

export interface CacheStats {
  totalChecks: number;
  cacheHits: number;
  cacheMisses: number;
  forcedRefreshes: number;
  consecutiveHits: number;
  maxConsecutiveBeforeForce: number;
  estimatedApiCallsSaved: number;
  estimatedCostSavings: string;
  cacheSize: number;
  lastHitAt: string | null;
  lastMissAt: string | null;
}

// ── Service ────────────────────────────────────────────────────

/**
 * DecisionCacheService — skip redundant LLM calls when context is unchanged.
 *
 * How it works:
 * 1. Before each autonomous cycle, hash the decision context (balances, scores, etc.)
 * 2. If the hash matches the cached entry, return the cached decision (cache hit)
 * 3. After 6 consecutive cache hits, force a real LLM call to prevent staleness
 * 4. Track hit/miss statistics and estimated cost savings
 */
export class DecisionCacheService {
  private cache = new Map<string, CachedDecision>();
  private maxCacheSize = 100;
  private maxConsecutiveHits = 6;
  private consecutiveHits = 0;
  private estimatedCostPerCall = 0.003; // ~$0.003 per LLM call (free tier estimate)

  // Stats
  private totalChecks = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private forcedRefreshes = 0;
  private lastHitAt: string | null = null;
  private lastMissAt: string | null = null;

  /**
   * Hash a decision context into a deterministic SHA-256 hex string.
   * Sorts keys to ensure consistent hashing regardless of property order.
   */
  hashContext(context: DecisionContext): string {
    const normalized = JSON.stringify(context, Object.keys(context).sort());
    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * Check if a cached decision exists for this context.
   * Returns the cached decision if valid, or null if a fresh LLM call is needed.
   */
  checkCache(context: DecisionContext): { hit: boolean; decision: unknown | null; hash: string; forced: boolean } {
    this.totalChecks++;
    const hash = this.hashContext(context);

    // Force refresh after too many consecutive hits
    if (this.consecutiveHits >= this.maxConsecutiveHits) {
      this.forcedRefreshes++;
      this.consecutiveHits = 0;
      this.lastMissAt = new Date().toISOString();
      logger.info(`[DecisionCache] Forced refresh after ${this.maxConsecutiveHits} consecutive hits`);
      return { hit: false, decision: null, hash, forced: true };
    }

    const cached = this.cache.get(hash);
    if (cached) {
      this.cacheHits++;
      this.consecutiveHits++;
      cached.hitCount++;
      this.lastHitAt = new Date().toISOString();
      logger.info(`[DecisionCache] HIT — hash=${hash}, consecutive=${this.consecutiveHits}`);
      return { hit: true, decision: cached.decision, hash, forced: false };
    }

    this.cacheMisses++;
    this.consecutiveHits = 0;
    this.lastMissAt = new Date().toISOString();
    logger.info(`[DecisionCache] MISS — hash=${hash}`);
    return { hit: false, decision: null, hash, forced: false };
  }

  /**
   * Store a decision result keyed by its context hash.
   */
  storeDecision(hash: string, decision: unknown): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(hash, {
      hash,
      decision,
      cachedAt: new Date().toISOString(),
      hitCount: 0,
    });
    logger.info(`[DecisionCache] Stored decision for hash=${hash}, cacheSize=${this.cache.size}`);
  }

  /**
   * Get cache performance statistics.
   */
  getStats(): CacheStats {
    return {
      totalChecks: this.totalChecks,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      forcedRefreshes: this.forcedRefreshes,
      consecutiveHits: this.consecutiveHits,
      maxConsecutiveBeforeForce: this.maxConsecutiveHits,
      estimatedApiCallsSaved: this.cacheHits,
      estimatedCostSavings: `$${(this.cacheHits * this.estimatedCostPerCall).toFixed(4)}`,
      cacheSize: this.cache.size,
      lastHitAt: this.lastHitAt,
      lastMissAt: this.lastMissAt,
    };
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
    this.consecutiveHits = 0;
    logger.info('[DecisionCache] Cache cleared');
  }
}

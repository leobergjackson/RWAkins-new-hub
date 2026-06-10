// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Production-grade per-IP rate limiter with tiered limits

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger.js';

// ── Types ────────────────────────────────────────────────────────

interface BucketEntry {
  count: number;
  resetAt: number;
}

interface TierConfig {
  /** Max requests allowed in the window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimiterStats {
  totalKeys: number;
  tiers: Record<string, TierConfig>;
  recentBlocks: number;
}

// ── Tier definitions ─────────────────────────────────────────────

const TIERS: Record<string, TierConfig> = {
  default:   { max: 100, windowMs: 60_000 },
  write:     { max: 10,  windowMs: 60_000 },
  selfTest:  { max: 1,   windowMs: 3_600_000 },
};

/** Routes matched to stricter tiers (method:path prefix) */
const WRITE_ROUTES = new Set([
  'POST:/api/tip',
  'POST:/api/escrow',
  'POST:/api/tips',
]);

const SELF_TEST_ROUTES = new Set([
  'POST:/api/self-test',
  'POST:/api/agent/self-test',
]);

// ── Store ────────────────────────────────────────────────────────

const store = new Map<string, BucketEntry>();
let recentBlocks = 0;

/** Cleanup expired entries every 2 minutes */
const CLEANUP_INTERVAL = 2 * 60_000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug(`Rate-limiter cleanup: purged ${cleaned} expired buckets`);
  }
}, CLEANUP_INTERVAL);
// Allow Node to exit even if the timer is still running
if (cleanupTimer.unref) cleanupTimer.unref();

// ── Tier resolver ────────────────────────────────────────────────

function resolveTier(method: string, path: string): TierConfig {
  const key = `${method}:${path}`;
  if (SELF_TEST_ROUTES.has(key)) return TIERS.selfTest;
  for (const route of WRITE_ROUTES) {
    if (key.startsWith(route)) return TIERS.write;
  }
  return TIERS.default;
}

// ── Middleware factory ───────────────────────────────────────────

/**
 * Production-grade rate limiter middleware.
 * Applies per-IP, tiered rate limiting:
 *  - 100 req/min for read endpoints
 *  - 10 req/min for write endpoints (POST /api/tip, /api/escrow)
 *  - 1 req/hour for self-test
 *
 * Returns 429 with Retry-After header on limit breach.
 */
export function rateLimiterMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const tier = resolveTier(req.method, req.path);
    const bucketKey = `${ip}:${req.method}:${req.path}`;
    const now = Date.now();

    let entry = store.get(bucketKey);

    // Start new window if none exists or current window expired
    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + tier.windowMs };
      store.set(bucketKey, entry);
      setRateLimitHeaders(res, tier.max, tier.max - 1, entry.resetAt);
      next();
      return;
    }

    entry.count++;

    if (entry.count > tier.max) {
      recentBlocks++;
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      logger.warn('Rate limit exceeded', {
        ip,
        method: req.method,
        path: req.path,
        tier: tier.max,
        count: entry.count,
      });
      res.setHeader('Retry-After', String(retryAfter));
      setRateLimitHeaders(res, tier.max, 0, entry.resetAt);
      res.status(429).json({
        error: 'Too many requests',
        retryAfterSeconds: retryAfter,
        limit: tier.max,
        windowMs: tier.windowMs,
      });
      return;
    }

    setRateLimitHeaders(res, tier.max, tier.max - entry.count, entry.resetAt);
    next();
  };
}

function setRateLimitHeaders(res: Response, limit: number, remaining: number, resetAt: number): void {
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
}

// ── Stats (for health check) ─────────────────────────────────────

export function getRateLimiterStats(): RateLimiterStats {
  return {
    totalKeys: store.size,
    tiers: { ...TIERS },
    recentBlocks,
  };
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta SDK — Express middleware for adding agent capabilities to any server.
//
// Usage:
//   import express from 'express';
//   import { aerofytaMiddleware } from 'aerofyta-agent';
//
//   const app = express();
//   app.use(aerofytaMiddleware({ seed: process.env.SEED_PHRASE! }));
//
//   app.post('/tip', async (req, res) => {
//     const result = await req.aerofyta.tip(req.body.to, req.body.amount);
//     res.json(result);
//   });

import type { Request, Response, NextFunction } from 'express';
import { createAeroFytaAgent } from './create-agent.js';
import type { AeroFytaConfig, AeroFytaAgent } from './create-agent.js';

// ── Type augmentation ───────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      aerofyta: AeroFytaAgent;
    }
  }
}

// ── Rate Limiter ────────────────────────────────────────────────────

interface RateLimitConfig {
  /** Maximum requests per window (default: 60) */
  maxRequests?: number;
  /** Window size in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter tracking requests per IP per window.
 * Entries are lazily cleaned up on access.
 */
class RateLimiter {
  private readonly buckets = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(config: RateLimitConfig = {}) {
    this.maxRequests = config.maxRequests ?? 60;
    this.windowMs = config.windowMs ?? 60_000;
  }

  /**
   * Check whether a request from the given IP should be allowed.
   * @returns true if allowed, false if rate-limited
   */
  consume(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    let entry = this.buckets.get(ip);

    // Reset if window has expired
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(ip, entry);
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /** Periodic cleanup of expired entries (call from setInterval if needed) */
  cleanup(): void {
    const now = Date.now();
    for (const [ip, entry] of this.buckets) {
      if (now >= entry.resetAt) {
        this.buckets.delete(ip);
      }
    }
  }
}

// ── Middleware Config ────────────────────────────────────────────────

export interface AeroFytaMiddlewareConfig extends AeroFytaConfig {
  /** Rate limiting configuration. Set to false to disable. */
  rateLimit?: RateLimitConfig | false;
}

// ── Singleton agent cache ───────────────────────────────────────────

let cachedAgent: AeroFytaAgent | null = null;
let initPromise: Promise<AeroFytaAgent> | null = null;

/**
 * Get or create the singleton agent instance.
 * Ensures only one agent is created even if multiple requests arrive
 * during initialization.
 */
async function getOrCreateAgent(config: AeroFytaConfig): Promise<AeroFytaAgent> {
  if (cachedAgent) return cachedAgent;

  if (!initPromise) {
    initPromise = createAeroFytaAgent(config).then((agent) => {
      cachedAgent = agent;
      return agent;
    });
  }

  return initPromise;
}

// ── Middleware ───────────────────────────────────────────────────────

/**
 * Express middleware that attaches an AeroFyta agent to every request.
 *
 * The agent is created once (singleton) and reused across all requests.
 * Initialization happens lazily on the first request.
 *
 * Includes built-in rate limiting (60 requests/minute per IP by default).
 * Configure via the `rateLimit` option or set to `false` to disable.
 *
 * @param config - Agent configuration with optional rate limit settings
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { aerofytaMiddleware } from 'aerofyta-agent';
 *
 * const app = express();
 * app.use(aerofytaMiddleware({
 *   seed: process.env.SEED_PHRASE!,
 *   llmProvider: 'groq',
 *   llmApiKey: process.env.GROQ_API_KEY,
 *   rateLimit: { maxRequests: 100, windowMs: 60000 },
 * }));
 *
 * app.post('/api/tip', async (req, res) => {
 *   const { to, amount, chain } = req.body;
 *   const result = await req.aerofyta.tip(to, amount, chain);
 *   res.json(result);
 * });
 * ```
 */
export function aerofytaMiddleware(config: AeroFytaMiddlewareConfig) {
  // Initialize rate limiter (unless explicitly disabled)
  const limiter = config.rateLimit !== false
    ? new RateLimiter(typeof config.rateLimit === 'object' ? config.rateLimit : undefined)
    : null;

  // Periodic cleanup every 5 minutes
  let cleanupInterval: ReturnType<typeof setInterval> | null = null;
  if (limiter) {
    cleanupInterval = setInterval(() => limiter.cleanup(), 5 * 60_000);
    // Allow the process to exit even if the interval is still active
    if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
      cleanupInterval.unref();
    }
  }

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // ── Rate Limiting ──────────────────────────────────────────────
    if (limiter) {
      const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
      const result = limiter.consume(ip);

      // Always set rate-limit headers
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        });
        return;
      }
    }

    // ── Agent Injection ────────────────────────────────────────────
    try {
      req.aerofyta = await getOrCreateAgent(config);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Reset the cached agent instance.
 * Useful for testing or when you need to reinitialize with different config.
 */
export function resetMiddlewareAgent(): void {
  cachedAgent = null;
  initPromise = null;
}

// Export the RateLimiter class for direct use
export { RateLimiter };
export type { RateLimitConfig };

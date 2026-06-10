import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/** In-memory store keyed by "ip:path" */
const store = new Map<string, RateLimitEntry>();

/** Clean up expired entries every 5 minutes */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug(`Rate limiter cleanup: removed ${cleaned} expired entries`);
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Create a rate-limiting middleware.
 * @param maxRequests Maximum number of requests allowed in the window
 * @param windowMs Time window in milliseconds
 */
export function rateLimit(maxRequests: number, windowMs: number): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      // New window
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(maxRequests - 1));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));
      next();
      return;
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      logger.warn('Rate limit exceeded', { ip, path: req.path, count: entry.count });
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
      res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter,
      });
      return;
    }

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
    next();
  };
}

/** Pre-configured rate limiters */
export const generalLimiter = rateLimit(30, 60 * 1000);
export const transactionLimiter = rateLimit(5, 60 * 1000);

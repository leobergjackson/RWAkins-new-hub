// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Structured request logger middleware

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger.js';
import { metrics } from '../shared-singletons.js';

/** Paths to skip logging (too noisy) */
const SKIP_PATHS = new Set(['/api/health', '/health', '/api/health/deep']);

/**
 * Express middleware that logs every request in structured JSON format.
 * Captures method, path, status code, response time, and client IP.
 * Skips health-check endpoints to reduce noise.
 */
export function requestLoggerMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip noisy health checks
    if (SKIP_PATHS.has(req.path)) {
      next();
      return;
    }

    const start = Date.now();
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';

    // Hook into response finish event
    res.on('finish', () => {
      const duration = Date.now() - start;
      const entry = {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
        ip,
        userAgent: req.get('user-agent') ?? '-',
        contentLength: res.get('content-length') ?? '-',
      };

      // Instrument REAL API metrics
      try {
        const pathGroup = req.route?.path ?? req.path.split('/').slice(0, 4).join('/');
        metrics.increment('api_requests_total', {
          method: req.method,
          path: pathGroup,
          status: String(res.statusCode),
        });
        metrics.observe('api_response_time_ms', duration, { path: pathGroup });
      } catch { /* non-fatal */ }

      if (res.statusCode >= 500) {
        logger.error('HTTP request', entry);
      } else if (res.statusCode >= 400) {
        logger.warn('HTTP request', entry);
      } else {
        logger.info('HTTP request', entry);
      }
    });

    next();
  };
}

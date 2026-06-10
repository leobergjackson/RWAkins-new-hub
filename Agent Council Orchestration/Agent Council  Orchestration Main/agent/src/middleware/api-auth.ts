// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Simple API key authentication middleware
//
// - Reads API key from X-API-Key header or ?apiKey query param
// - Key is set via AEROFYTA_API_KEY env var
// - If no env var set, auth is disabled (open access for hackathon demo)
// - Protected routes: all POST/PUT/DELETE/PATCH endpoints
// - Unprotected routes: GET endpoints (read-only)
// - Returns 401 with { error: 'Invalid API key', code: 'UNAUTHORIZED' }

import { timingSafeEqual } from 'node:crypto';
import { Request, Response, NextFunction, Router } from 'express';
import { logger } from '../utils/logger.js';

const PROTECTED_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

/**
 * Returns whether API key auth is currently enabled.
 */
export function isAuthEnabled(): boolean {
  const key = process.env.AEROFYTA_API_KEY?.trim();
  return !!key && key.length > 0;
}

/**
 * API key authentication middleware.
 *
 * Protects write endpoints (POST/PUT/DELETE/PATCH) when AEROFYTA_API_KEY is set.
 * GET requests always pass through (read-only access).
 * When AEROFYTA_API_KEY is not set, all requests pass through (open access).
 */
export function apiAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expectedKey = process.env.AEROFYTA_API_KEY?.trim();

  // If no API key configured, auth is disabled — open access for demo
  if (!expectedKey || expectedKey.length === 0) {
    next();
    return;
  }

  // GET requests are always allowed (read-only)
  if (!PROTECTED_METHODS.has(req.method)) {
    next();
    return;
  }

  // Check X-API-Key header or ?apiKey query param
  const providedKey = (req.headers['x-api-key'] as string) || (req.query.apiKey as string);

  const isValid = providedKey
    && providedKey.length === expectedKey.length
    && timingSafeEqual(Buffer.from(providedKey), Buffer.from(expectedKey));

  if (!isValid) {
    logger.warn('Unauthorized API request blocked', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({
      error: 'Invalid API key',
      code: 'UNAUTHORIZED',
      hint: 'Provide a valid API key via X-API-Key header or ?apiKey query parameter',
    });
    return;
  }

  next();
}

/**
 * Create a router with the GET /api/auth/status endpoint.
 */
export function createAuthRouter(): Router {
  const router = Router();

  /** GET /api/auth/status — Report authentication configuration */
  router.get('/auth/status', (_req, res) => {
    const enabled = isAuthEnabled();
    res.json({
      authEnabled: enabled,
      protectedMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
      unprotectedMethods: ['GET'],
      howToAuthenticate: enabled
        ? 'Set X-API-Key header or ?apiKey query param'
        : 'Auth is disabled — set AEROFYTA_API_KEY env var to enable',
    });
  });

  return router;
}

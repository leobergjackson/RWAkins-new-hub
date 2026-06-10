// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Global error handling middleware

import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { ServiceError } from '../utils/service-error.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = (req as any).requestId ?? crypto.randomUUID().slice(0, 8);

  // Structured response for ServiceError instances
  if (err instanceof ServiceError) {
    console.error(`[${requestId}] ${req.method} ${req.path} — [${err.code}] ${err.message}`);
    res.status(err.statusCode).json({
      ...err.toJSON(),
      requestId,
      path: req.path,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Generic error fallback
  const status = (err as any).statusCode || 500;

  console.error(`[${requestId}] ${req.method} ${req.path} — ${err.message}`);

  res.status(status).json({
    error: err.message || 'Internal server error',
    requestId,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
}

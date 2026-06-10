import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger.js';

// ── Validation helpers ────────────────────────────────────────

/** Validate an EVM address (0x followed by 40 hex chars) */
function isValidEvmAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/** Validate a TON address (raw or user-friendly format) */
function isValidTonAddress(address: string): boolean {
  // User-friendly: starts with EQ/UQ/0: followed by base64 (48 chars)
  if (/^(EQ|UQ|0:)[A-Za-z0-9_\-+/]{46,48}={0,2}$/.test(address)) return true;
  // Raw: 0: prefix + 64 hex chars
  if (/^0:[0-9a-fA-F]{64}$/.test(address)) return true;
  // Also allow -1: prefix (masterchain)
  if (/^-1:[0-9a-fA-F]{64}$/.test(address)) return true;
  return false;
}

/**
 * Check whether a blockchain address has a valid format.
 * @param address The address string to validate
 * @param chainType 'evm' or 'ton'
 */
export function validateAddress(address: string, chainType: 'evm' | 'ton'): boolean {
  if (!address || typeof address !== 'string') return false;
  return chainType === 'evm' ? isValidEvmAddress(address) : isValidTonAddress(address);
}

/**
 * Validate that a string represents a positive, reasonable amount.
 * Must be a positive number no greater than 1 000 000 (safety cap).
 */
export function validateAmount(amount: string): boolean {
  if (!amount || typeof amount !== 'string') return false;
  const num = Number(amount);
  if (isNaN(num) || !isFinite(num)) return false;
  if (num <= 0) return false;
  if (num > 1_000_000) return false;
  // Reject scientific notation in the raw string for clarity
  if (/[eE]/.test(amount)) return false;
  return true;
}

/**
 * Strip potentially dangerous characters while preserving normal text.
 * Keeps alphanumeric, spaces, common punctuation, and unicode letters.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')      // strip angle brackets (XSS vectors)
    .replace(/["'`]/g, '')     // strip quotes
    .replace(/[{}]/g, '')      // strip braces
    .replace(/\\/g, '')        // strip backslashes
    .trim()
    .slice(0, 2000);           // cap length
}

// ── Middleware factories ──────────────────────────────────────

/**
 * Middleware that validates tip request body fields.
 * Applied to POST /tip and POST /tip/batch.
 */
export function validateTipInput(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { recipient, amount, message } = req.body as {
      recipient?: string;
      amount?: string;
      message?: string;
    };

    if (recipient) {
      const isEvm = recipient.startsWith('0x');
      const chainType: 'evm' | 'ton' = isEvm ? 'evm' : 'ton';
      if (!validateAddress(recipient, chainType)) {
        logger.warn('Invalid address rejected', { recipient: recipient.slice(0, 20) });
        res.status(400).json({ error: 'Invalid recipient address format' });
        return;
      }
    }

    if (amount && !validateAmount(amount)) {
      logger.warn('Invalid amount rejected', { amount });
      res.status(400).json({ error: 'Invalid amount: must be a positive number (max 1,000,000)' });
      return;
    }

    // Sanitize message if present
    if (message && typeof message === 'string') {
      req.body.message = sanitizeInput(message);
    }

    next();
  };
}

/**
 * Middleware that validates batch tip request body.
 */
export function validateBatchTipInput(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { recipients } = req.body as {
      recipients?: Array<{ address?: string; amount?: string }>;
    };

    if (!recipients || !Array.isArray(recipients)) {
      next();
      return;
    }

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      if (r.address) {
        const isEvm = r.address.startsWith('0x');
        const chainType: 'evm' | 'ton' = isEvm ? 'evm' : 'ton';
        if (!validateAddress(r.address, chainType)) {
          logger.warn('Invalid batch address rejected', { index: i, address: r.address.slice(0, 20) });
          res.status(400).json({ error: `Invalid address format for recipient ${i + 1}` });
          return;
        }
      }

      if (r.amount && !validateAmount(r.amount)) {
        logger.warn('Invalid batch amount rejected', { index: i, amount: r.amount });
        res.status(400).json({ error: `Invalid amount for recipient ${i + 1}: must be a positive number (max 1,000,000)` });
        return;
      }
    }

    next();
  };
}

/**
 * Middleware that sanitizes the chat message body.
 */
export function validateChatInput(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { message } = req.body as { message?: string };
    if (message && typeof message === 'string') {
      req.body.message = sanitizeInput(message);
    }
    next();
  };
}

/**
 * Request audit logger — logs IP, method, path, and timestamp.
 */
export function auditLog(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    logger.info('API request', {
      ip,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
    });
    next();
  };
}

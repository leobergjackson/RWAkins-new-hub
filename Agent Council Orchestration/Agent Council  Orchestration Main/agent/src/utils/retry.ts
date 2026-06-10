// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Retry with Exponential Backoff (Feature 13)

import { logger } from './logger.js';

/**
 * Retry a function with exponential backoff.
 *
 * Strategy: initialDelay → 2x → 4x → 8x (default 4 retries).
 * Logs each retry attempt for transparency.
 *
 * @param fn - Async function to execute
 * @param label - Human-readable label for logging (e.g. "sendTip", "LLM call")
 * @param maxRetries - Maximum number of retries (default: 4)
 * @param initialDelayMs - Initial delay in milliseconds (default: 1000)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number = 4,
  initialDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === maxRetries) {
        // All retries exhausted
        break;
      }

      const delayMs = initialDelayMs * Math.pow(2, attempt);
      logger.warn(`Retry ${attempt + 1}/${maxRetries} for ${label} after ${delayMs / 1000}s delay`, {
        error: String(err),
        attempt: attempt + 1,
        maxRetries,
        delayMs,
      });

      await sleep(delayMs);
    }
  }

  const errMsg = `All ${maxRetries} retries exhausted for ${label}: ${String(lastError)}`;
  logger.error(errMsg);
  throw new Error(errMsg);
}

/** Simple async sleep helper */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

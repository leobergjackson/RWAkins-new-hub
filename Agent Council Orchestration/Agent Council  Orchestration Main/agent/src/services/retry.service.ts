import { logger } from '../utils/logger.js';
import type { TipResult } from '../types/index.js';

/** Retry history entry */
interface RetryAttempt {
  attempt: number;
  error: string;
  timestamp: string;
}

/** Result of a retry operation */
export interface RetryResult {
  result: TipResult;
  retryCount: number;
  history: RetryAttempt[];
}

/**
 * RetryService — automatic retry for failed transactions with exponential backoff.
 *
 * Backoff schedule: 2s, 4s, 8s (doubles each attempt).
 * Logs each attempt and tracks retry history.
 */
export class RetryService {
  private retryHistory: Map<string, RetryAttempt[]> = new Map();

  /**
   * Retry a transaction with exponential backoff.
   *
   * @param tipId - Unique identifier for the tip (used for history tracking)
   * @param executeFn - The function that executes the tip and returns a TipResult
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns RetryResult with final result and retry metadata
   */
  async retryTransaction(
    tipId: string,
    executeFn: () => Promise<TipResult>,
    maxRetries: number = 3,
  ): Promise<RetryResult> {
    const attempts: RetryAttempt[] = [];
    let lastResult: TipResult | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s

      logger.info('Retry attempt', {
        tipId,
        attempt,
        maxRetries,
        backoffMs,
      });

      try {
        const result = await executeFn();

        if (result.status !== 'failed') {
          // Success — record and return
          logger.info('Retry succeeded', { tipId, attempt });
          this.retryHistory.set(tipId, attempts);
          return {
            result: { ...result, retryCount: attempt },
            retryCount: attempt,
            history: attempts,
          };
        }

        // Transaction returned but with failed status
        const errorMsg = result.error ?? 'Transaction failed';
        attempts.push({
          attempt,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        });

        logger.warn('Retry attempt failed', {
          tipId,
          attempt,
          error: errorMsg,
        });

        lastResult = result;

        // Wait before next retry (skip wait on last attempt)
        if (attempt < maxRetries) {
          logger.info('Waiting before next retry', {
            tipId,
            waitMs: backoffMs,
          });
          await this.sleep(backoffMs);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        attempts.push({
          attempt,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        });

        logger.warn('Retry attempt threw error', {
          tipId,
          attempt,
          error: errorMsg,
        });

        // Wait before next retry (skip wait on last attempt)
        if (attempt < maxRetries) {
          await this.sleep(backoffMs);
        }
      }
    }

    // All retries exhausted
    logger.error('All retry attempts exhausted', {
      tipId,
      totalAttempts: maxRetries,
    });

    this.retryHistory.set(tipId, attempts);

    // Return the last result if we have one, otherwise create a failed result
    if (lastResult) {
      return {
        result: { ...lastResult, retryCount: maxRetries },
        retryCount: maxRetries,
        history: attempts,
      };
    }

    // If we never got a result (all threw errors), throw the last error
    const lastAttempt = attempts[attempts.length - 1];
    throw new Error(
      `Transaction failed after ${maxRetries} retries: ${lastAttempt?.error ?? 'Unknown error'}`,
    );
  }

  /** Get retry history for a specific tip */
  getRetryHistory(tipId: string): RetryAttempt[] {
    return this.retryHistory.get(tipId) ?? [];
  }

  /** Clear retry history */
  clearHistory(): void {
    this.retryHistory.clear();
  }

  /** Sleep for a given number of milliseconds */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

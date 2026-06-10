// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta SDK — Retry utility with exponential backoff.

/**
 * Execute a function with automatic retries and exponential backoff.
 *
 * Retries up to `maxRetries` times with delays of 1s, 2s, 4s, 8s, ...
 * Logs each retry attempt for observability.
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param label - Human-readable label for log messages
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => wallet.sendTransaction(tx),
 *   3,
 *   'sendTransaction',
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  label = 'operation',
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt > maxRetries) {
        break;
      }

      const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.warn(
        `[AeroFyta SDK] Retrying ${label} (attempt ${attempt}/${maxRetries}) — ` +
        `waiting ${delayMs}ms. Error: ${err instanceof Error ? err.message : String(err)}`,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

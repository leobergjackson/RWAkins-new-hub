// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta SDK Errors — Structured error types for the SDK.

/**
 * Structured error class for all AeroFyta SDK operations.
 *
 * Provides a machine-readable `code`, the originating `method`, and
 * optional `details` for debugging.
 *
 * @example
 * ```typescript
 * try {
 *   await agent.tip('', 0.01);
 * } catch (err) {
 *   if (err instanceof AeroFytaSDKError) {
 *     console.error(err.code);   // 'INVALID_RECIPIENT'
 *     console.error(err.method); // 'tip'
 *   }
 * }
 * ```
 */
export class AeroFytaSDKError extends Error {
  /** Machine-readable error code (e.g. 'INVALID_RECIPIENT', 'AMOUNT_TOO_LOW') */
  public readonly code: string;
  /** SDK method that produced the error (e.g. 'tip', 'escrow.create') */
  public readonly method: string;
  /** Optional structured details for debugging */
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    method: string,
    details?: Record<string, unknown>,
  ) {
    super(`[AeroFyta SDK] ${method}: ${message}`);
    this.name = 'AeroFytaSDKError';
    this.code = code;
    this.method = method;
    this.details = details;
  }
}

// ── Validation Helpers ────────────────────────────────────────────────

const VALID_CHAINS = new Set([
  'ethereum-sepolia',
  'ton-testnet',
  'tron-nile',
  'ethereum-sepolia-gasless',
  'ton-testnet-gasless',
  'bitcoin-testnet',
  'solana-devnet',
  'plasma',
  'stable',
]);

/**
 * Validate that a value is a non-empty string.
 * @throws AeroFytaSDKError if validation fails
 */
export function validateNonEmptyString(
  value: unknown,
  paramName: string,
  method: string,
): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AeroFytaSDKError(
      `${paramName} must be a non-empty string, got ${typeof value === 'string' ? '""' : String(value)}`,
      `INVALID_${paramName.toUpperCase().replace(/\s+/g, '_')}`,
      method,
      { paramName, value },
    );
  }
}

/**
 * Validate that a value is a positive finite number.
 * @throws AeroFytaSDKError if validation fails
 */
export function validatePositiveAmount(
  value: unknown,
  paramName: string,
  method: string,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    const reason =
      typeof value !== 'number' ? `expected number, got ${typeof value}` :
      Number.isNaN(value) ? 'NaN is not allowed' :
      !Number.isFinite(value) ? 'Infinity is not allowed' :
      'must be greater than 0';
    throw new AeroFytaSDKError(
      `${paramName} ${reason}`,
      value === 0 ? 'AMOUNT_ZERO' :
      typeof value === 'number' && value < 0 ? 'AMOUNT_NEGATIVE' :
      'INVALID_AMOUNT',
      method,
      { paramName, value },
    );
  }
}

/**
 * Validate that a chain ID is one of the supported chains.
 * @throws AeroFytaSDKError if validation fails
 */
export function validateChainId(
  value: unknown,
  method: string,
): void {
  if (value !== undefined && value !== null) {
    if (typeof value !== 'string' || !VALID_CHAINS.has(value)) {
      throw new AeroFytaSDKError(
        `Invalid chain "${String(value)}". Supported chains: ${[...VALID_CHAINS].join(', ')}`,
        'INVALID_CHAIN',
        method,
        { value, supportedChains: [...VALID_CHAINS] },
      );
    }
  }
}

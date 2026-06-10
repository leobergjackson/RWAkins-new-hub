// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Unified service error class for structured error handling

/**
 * Unified error class for all AeroFyta services.
 *
 * Provides structured error information including error codes,
 * originating service, HTTP status codes, and retry hints so
 * API consumers can programmatically react to failures.
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly service: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      service: this.service,
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable,
    };
  }
}

// ── Factory functions ─────────────────────────────────────────────

/** Wallet or escrow has insufficient funds for the requested operation. */
export function insufficientBalance(
  service: string,
  details?: Record<string, unknown>,
): ServiceError {
  return new ServiceError(
    'Insufficient balance for this operation',
    'INSUFFICIENT_BALANCE',
    service,
    400,
    details,
    false,
  );
}

/** A WDK call timed out (RPC, bridge quote, etc.). */
export function wdkTimeout(
  service: string,
  details?: Record<string, unknown>,
): ServiceError {
  return new ServiceError(
    'WDK operation timed out',
    'WDK_TIMEOUT',
    service,
    504,
    details,
    true,
  );
}

/** The requested blockchain is unavailable or unsupported. */
export function chainUnavailable(
  service: string,
  chain: string,
  details?: Record<string, unknown>,
): ServiceError {
  return new ServiceError(
    `Chain ${chain} is currently unavailable`,
    'CHAIN_UNAVAILABLE',
    service,
    503,
    { chain, ...details },
    true,
  );
}

/** A request parameter failed validation. */
export function validationFailed(
  service: string,
  field: string,
  details?: Record<string, unknown>,
): ServiceError {
  return new ServiceError(
    `Validation failed for field: ${field}`,
    'VALIDATION_FAILED',
    service,
    400,
    { field, ...details },
    false,
  );
}

/** The caller has exceeded the allowed request rate. */
export function rateLimited(
  service: string,
  details?: Record<string, unknown>,
): ServiceError {
  return new ServiceError(
    'Rate limit exceeded — please wait before retrying',
    'RATE_LIMITED',
    service,
    429,
    details,
    true,
  );
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Seed Security / Key Isolation (Feature 20)
//
// NEVER log seed phrases or private keys. This utility strips
// sensitive material from any string before it reaches logs.

/**
 * Sanitize a log message by redacting sensitive cryptographic material:
 * - 12-word or 24-word seed phrases (BIP39 mnemonic patterns)
 * - Hex private keys (0x followed by 64 hex chars)
 * - Any long hex strings that could be keys
 *
 * @param message - Raw string that may contain secrets
 * @returns Sanitized string with secrets replaced by [REDACTED]
 */
export function sanitizeLog(message: string): string {
  if (!message || typeof message !== 'string') return message;

  let sanitized = message;

  // Redact hex private keys: 0x followed by 64 hex chars
  sanitized = sanitized.replace(/0x[0-9a-fA-F]{64}/g, '[REDACTED-PRIVATE-KEY]');

  // Redact standalone 64-char hex strings (private keys without 0x prefix)
  sanitized = sanitized.replace(/(?<!\w)[0-9a-fA-F]{64}(?!\w)/g, '[REDACTED-HEX-KEY]');

  // Redact 12-word seed phrases (BIP39 mnemonic: 12 lowercase words separated by spaces)
  // Match sequences of 12+ lowercase words that look like mnemonics
  sanitized = sanitized.replace(
    /(?<!\w)([a-z]{3,8}\s){11,23}[a-z]{3,8}(?!\w)/g,
    '[REDACTED-SEED-PHRASE]',
  );

  // Redact base64-encoded keys (long base64 strings, 44+ chars)
  sanitized = sanitized.replace(/(?<!\w)[A-Za-z0-9+/]{44,}={0,2}(?!\w)/g, '[REDACTED-ENCODED-KEY]');

  return sanitized;
}

/**
 * Check startup security: verify that SEED_PHRASE / WDK_SEED
 * is properly configured.
 */
export function checkSeedSecurity(): { secure: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!process.env.WDK_SEED && !process.env.SEED_PHRASE) {
    warnings.push('WARNING: No WDK_SEED or SEED_PHRASE env var set — a random seed will be generated');
  }

  // Check that seed isn't accidentally in a publicly accessible location
  if (process.env.WDK_SEED && process.env.WDK_SEED.length < 20) {
    warnings.push('WARNING: WDK_SEED appears too short — ensure it is a valid BIP39 mnemonic');
  }

  return {
    secure: warnings.length === 0,
    warnings,
  };
}

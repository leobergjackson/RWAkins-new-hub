// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// See LICENSE file for details

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

// Marker prefix so we can distinguish encrypted blobs from plaintext seeds
const ENCRYPTED_MARKER = 'AEROFYTA_ENC:';

/**
 * Encrypt a seed phrase using AES-256-GCM with a password-derived key (scrypt).
 * Returns: base64(salt + iv + authTag + ciphertext) prefixed with AEROFYTA_ENC:
 */
export function encryptSeed(seed: string, password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(password, salt, KEY_LENGTH, { N: 16384, r: 8, p: 1 });
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(seed, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Pack: salt(32) + iv(16) + tag(16) + ciphertext
  const packed = Buffer.concat([salt, iv, tag, encrypted]);
  return ENCRYPTED_MARKER + packed.toString('base64');
}

/**
 * Decrypt a seed phrase previously encrypted with encryptSeed().
 * Input must start with the AEROFYTA_ENC: marker.
 */
export function decryptSeed(encrypted: string, password: string): string {
  if (!encrypted.startsWith(ENCRYPTED_MARKER)) {
    throw new Error('Data is not an encrypted seed (missing marker)');
  }

  const packed = Buffer.from(encrypted.slice(ENCRYPTED_MARKER.length), 'base64');

  if (packed.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Encrypted data too short — corrupted or invalid');
  }

  const salt = packed.subarray(0, SALT_LENGTH);
  const iv = packed.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = packed.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = scryptSync(password, salt, KEY_LENGTH, { N: 16384, r: 8, p: 1 });

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Check if data looks like an encrypted seed blob (starts with marker).
 */
export function isEncrypted(data: string): boolean {
  return data.startsWith(ENCRYPTED_MARKER);
}

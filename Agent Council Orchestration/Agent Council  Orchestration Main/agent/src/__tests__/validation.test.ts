/**
 * Validation utility tests — using Node built-in test runner.
 * Tests for validateAddress, validateAmount, and sanitizeInput.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateAddress, validateAmount, sanitizeInput } from '../middleware/validate.js';

// ── validateAddress (EVM) ────────────────────────────────────

describe('validateAddress — EVM', () => {
  it('accepts a valid EVM address (all lowercase hex)', () => {
    assert.equal(validateAddress('0x' + 'a'.repeat(40), 'evm'), true);
  });

  it('accepts a valid EVM address (mixed case)', () => {
    assert.equal(validateAddress('0xAb5801a7D398351b8bE11C439e05C5b3259aeC9B', 'evm'), true);
  });

  it('rejects an EVM address that is too short', () => {
    assert.equal(validateAddress('0xabc', 'evm'), false);
  });

  it('rejects an EVM address that is too long', () => {
    assert.equal(validateAddress('0x' + 'a'.repeat(42), 'evm'), false);
  });

  it('rejects an EVM address without 0x prefix', () => {
    assert.equal(validateAddress('a'.repeat(40), 'evm'), false);
  });

  it('rejects an empty string', () => {
    assert.equal(validateAddress('', 'evm'), false);
  });

  it('rejects non-hex characters', () => {
    assert.equal(validateAddress('0x' + 'g'.repeat(40), 'evm'), false);
  });
});

// ── validateAddress (TON) ────────────────────────────────────

describe('validateAddress — TON', () => {
  it('accepts a user-friendly TON address starting with EQ', () => {
    // EQ prefix + 48 base64 chars (typical user-friendly format)
    const addr = 'EQ' + 'A'.repeat(46) + '==';
    assert.equal(validateAddress(addr, 'ton'), true);
  });

  it('accepts a user-friendly TON address starting with UQ', () => {
    const addr = 'UQ' + 'B'.repeat(46) + '==';
    assert.equal(validateAddress(addr, 'ton'), true);
  });

  it('accepts a raw TON address (0: prefix + 64 hex)', () => {
    const addr = '0:' + 'a'.repeat(64);
    assert.equal(validateAddress(addr, 'ton'), true);
  });

  it('accepts a masterchain TON address (-1: prefix + 64 hex)', () => {
    const addr = '-1:' + 'f'.repeat(64);
    assert.equal(validateAddress(addr, 'ton'), true);
  });

  it('rejects a random string', () => {
    assert.equal(validateAddress('not-an-address', 'ton'), false);
  });

  it('rejects an empty string', () => {
    assert.equal(validateAddress('', 'ton'), false);
  });
});

// ── validateAmount ───────────────────────────────────────────

describe('validateAmount', () => {
  it('accepts a normal positive amount', () => {
    assert.equal(validateAmount('10'), true);
  });

  it('accepts a decimal amount', () => {
    assert.equal(validateAmount('0.001'), true);
  });

  it('accepts a large amount within the cap', () => {
    assert.equal(validateAmount('999999'), true);
  });

  it('rejects zero', () => {
    assert.equal(validateAmount('0'), false);
  });

  it('rejects negative amounts', () => {
    assert.equal(validateAmount('-5'), false);
  });

  it('rejects amounts exceeding the safety cap', () => {
    assert.equal(validateAmount('1000001'), false);
  });

  it('rejects non-numeric strings', () => {
    assert.equal(validateAmount('abc'), false);
  });

  it('rejects empty string', () => {
    assert.equal(validateAmount(''), false);
  });

  it('rejects scientific notation', () => {
    assert.equal(validateAmount('1e5'), false);
  });

  it('rejects Infinity', () => {
    assert.equal(validateAmount('Infinity'), false);
  });
});

// ── sanitizeInput ────────────────────────────────────────────

describe('sanitizeInput', () => {
  it('strips angle brackets', () => {
    assert.equal(sanitizeInput('<script>alert(1)</script>'), 'scriptalert(1)/script');
  });

  it('strips quotes and backticks', () => {
    assert.equal(sanitizeInput(`he said "hello" and 'bye'`), 'he said hello and bye');
  });

  it('strips curly braces', () => {
    assert.equal(sanitizeInput('obj = {key: val}'), 'obj = key: val');
  });

  it('strips backslashes', () => {
    assert.equal(sanitizeInput('path\\to\\file'), 'pathtofile');
  });

  it('trims whitespace', () => {
    assert.equal(sanitizeInput('  hello  '), 'hello');
  });

  it('caps length at 2000 characters', () => {
    const long = 'a'.repeat(3000);
    assert.equal(sanitizeInput(long).length, 2000);
  });

  it('returns empty string for non-string input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.equal(sanitizeInput(123 as any), '');
  });

  it('preserves normal text', () => {
    assert.equal(sanitizeInput('Great work on the PR!'), 'Great work on the PR!');
  });
});

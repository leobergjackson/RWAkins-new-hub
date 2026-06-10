/**
 * Tests for ai-llm.ts — LLMCache, safeParseJSON, regexParseTip, isValidAddress.
 * Pure function tests — no WDK required.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LLMCache, safeParseJSON, regexParseTip, isValidAddress } from '../services/ai-llm.js';

// ── LLMCache ──────────────────────────────────────────────

describe('LLMCache', () => {
  it('stores and retrieves a cached response', () => {
    const cache = new LLMCache();
    cache.set('hello', 'model-1', 'world');
    assert.equal(cache.get('hello', 'model-1'), 'world');
  });

  it('returns null for cache miss', () => {
    const cache = new LLMCache();
    assert.equal(cache.get('missing', 'model-1'), null);
  });

  it('returns null after TTL expiry', () => {
    const cache = new LLMCache();
    cache.set('prompt', 'model', 'response');
    // Manually expire the entry by manipulating internals
    const key = (cache as any).makeKey('prompt', 'model');
    const entry = (cache as any).cache.get(key);
    entry.timestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago, TTL is 5
    assert.equal(cache.get('prompt', 'model'), null);
  });

  it('evicts oldest entry when at max size', () => {
    const cache = new LLMCache();
    // Fill to maxSize (100)
    for (let i = 0; i < 100; i++) {
      cache.set(`prompt-${i}`, 'model', `resp-${i}`);
    }
    assert.equal(cache.size, 100);
    // Adding one more should evict the oldest
    cache.set('new-prompt', 'model', 'new-resp');
    assert.equal(cache.size, 100);
    assert.equal(cache.get('new-prompt', 'model'), 'new-resp');
  });

  it('reports size correctly', () => {
    const cache = new LLMCache();
    assert.equal(cache.size, 0);
    cache.set('a', 'b', 'c');
    assert.equal(cache.size, 1);
  });
});

// ── safeParseJSON ─────────────────────────────────────────

describe('safeParseJSON', () => {
  it('parses valid JSON', () => {
    const result = safeParseJSON<{ a: number }>('{"a": 1}');
    assert.deepEqual(result, { a: 1 });
  });

  it('returns null for completely invalid input', () => {
    assert.equal(safeParseJSON('not json at all'), null);
  });

  it('extracts JSON from surrounding text', () => {
    const result = safeParseJSON<{ intent: string }>('Here is the result: {"intent": "tip"} done');
    assert.deepEqual(result, { intent: 'tip' });
  });

  it('returns null for empty string', () => {
    assert.equal(safeParseJSON(''), null);
  });

  it('handles nested JSON', () => {
    const result = safeParseJSON<{ a: { b: number } }>('{"a": {"b": 2}}');
    assert.deepEqual(result, { a: { b: 2 } });
  });
});

// ── regexParseTip ─────────────────────────────────────────

describe('regexParseTip', () => {
  it('parses EVM address with dollar amount', () => {
    const result = regexParseTip('send $5 to 0x1234567890abcdef1234567890abcdef12345678');
    assert.equal(result.amount, '5');
    assert.equal(result.token, 'usdt');
    assert.equal(result.recipient, '0x1234567890abcdef1234567890abcdef12345678');
    assert.ok(result.confidence >= 80);
  });

  it('parses USDT amount with token name', () => {
    const result = regexParseTip('tip 10 USDT to 0x1234567890abcdef1234567890abcdef12345678');
    assert.equal(result.amount, '10');
    assert.equal(result.token, 'usdt');
  });

  it('parses XAUT token', () => {
    const result = regexParseTip('send 0.5 xaut');
    assert.equal(result.amount, '0.5');
    assert.equal(result.token, 'xaut');
  });

  it('returns low confidence for bare text', () => {
    const result = regexParseTip('hello world');
    assert.ok(result.confidence < 50);
  });

  it('detects tron chain from trx keyword', () => {
    const result = regexParseTip('send 5 on tron');
    assert.equal(result.chain, 'tron-nile');
  });
});

// ── isValidAddress ────────────────────────────────────────

describe('isValidAddress', () => {
  it('validates EVM address', () => {
    assert.equal(isValidAddress('0x1234567890abcdef1234567890abcdef12345678'), true);
  });

  it('rejects short EVM address', () => {
    assert.equal(isValidAddress('0x1234'), false);
  });

  it('validates TON address starting with UQ', () => {
    assert.equal(isValidAddress('UQ' + 'a'.repeat(46)), true);
  });

  it('validates TON address starting with EQ', () => {
    assert.equal(isValidAddress('EQ' + 'b'.repeat(46)), true);
  });

  it('rejects random string', () => {
    assert.equal(isValidAddress('not-an-address'), false);
  });
});

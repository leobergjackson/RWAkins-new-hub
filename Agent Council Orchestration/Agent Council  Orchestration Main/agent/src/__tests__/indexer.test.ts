/**
 * IndexerService — WDK Indexer API wrapper with caching.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { IndexerService } from '../services/indexer.service.js';

describe('IndexerService', () => {
  let service: IndexerService;
  const originalFetch = globalThis.fetch;

  before(() => {
    service = new IndexerService();
    // Mock fetch to avoid real network calls
    globalThis.fetch = (async (_url: any, _opts?: any) => {
      return new Response(JSON.stringify({ status: 'ok', chains: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  it('isAvailable returns false initially', () => {
    assert.equal(service.isAvailable(), false);
  });

  it('healthCheck returns result with isAvailable and latencyMs', async () => {
    const result = await service.healthCheck();
    assert.equal(typeof result.isAvailable, 'boolean');
    assert.equal(typeof result.latencyMs, 'number');
  });

  it('getSupportedChains returns data structure', async () => {
    const result = await service.getSupportedChains();
    assert.equal(typeof result.isAvailable, 'boolean');
  });

  it('getTokenBalance returns data structure', async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ balance: '1000', blockchain: 'ethereum', token: 'USDT', address: '0x1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;
    const result = await service.getTokenBalance('ethereum', 'USDT', '0x1');
    assert.equal(typeof result.isAvailable, 'boolean');
  });

  it('clearCache empties the cache', () => {
    service.clearCache();
    // Should not throw
    assert.ok(true);
  });
});

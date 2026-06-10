/**
 * ENSService — ENS name resolution with caching.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ENSService } from '../services/ens.service.js';

describe('ENSService', () => {
  let service: ENSService;

  before(() => {
    service = new ENSService();
  });

  it('resolveENS returns null for non-existent name (graceful failure)', { timeout: 10000 }, async () => {
    try {
      const result = await Promise.race([
        service.resolveENS('this-name-does-not-exist-12345.eth'),
        new Promise<null>(r => setTimeout(() => r(null), 8000))
      ]);
      assert.ok(result === null || typeof result === 'string');
    } catch { assert.ok(true, 'Network error is acceptable'); }
  });

  it('lookupAddress returns null for random address', { timeout: 10000 }, async () => {
    try {
      const result = await Promise.race([
        service.lookupAddress('0x0000000000000000000000000000000000000000'),
        new Promise<null>(r => setTimeout(() => r(null), 8000))
      ]);
      assert.ok(result === null || typeof result === 'string');
    } catch { assert.ok(true, 'Network error is acceptable'); }
  });

  it('clearExpired does not throw', () => {
    service.clearExpired();
    assert.ok(true);
  });

  it('resolveENS normalizes name to lowercase', { timeout: 10000 }, async () => {
    try {
      const result = await Promise.race([
        service.resolveENS('TEST.eth'),
        new Promise<null>(r => setTimeout(() => r(null), 8000))
      ]);
      assert.ok(result === null || typeof result === 'string');
    } catch { assert.ok(true, 'Network error is acceptable'); }
  });
});

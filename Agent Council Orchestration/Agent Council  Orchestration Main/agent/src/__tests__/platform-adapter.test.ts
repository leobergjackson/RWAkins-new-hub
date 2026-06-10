/**
 * PlatformAdapterService — multi-platform adapter registry.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { PlatformAdapterService } from '../services/platform-adapter.service.js';

describe('PlatformAdapterService', () => {
  let service: PlatformAdapterService;

  before(() => {
    service = new PlatformAdapterService();
  });

  it('has built-in rumble and webhook adapters', () => {
    const adapters = service.listAdapters();
    assert.ok(Array.isArray(adapters));
    const platforms = adapters.map(a => a.platform);
    assert.ok(platforms.includes('rumble'));
    assert.ok(platforms.includes('webhook'));
  });

  it('getAdapter retrieves a specific adapter by platform', () => {
    const rumble = service.getAdapter('rumble');
    assert.ok(rumble);
    assert.equal(rumble!.platform, 'rumble');
    assert.equal(rumble!.isConnected, true);
  });

  it('getAdapter returns undefined for unknown platform', () => {
    const result = service.getAdapter('nonexistent');
    assert.equal(result, undefined);
  });

  it('listAdapters returns metadata for each adapter', () => {
    const adapters = service.listAdapters();
    assert.ok(adapters.length >= 2);
    for (const a of adapters) {
      assert.ok(a.platform);
      assert.equal(typeof a.isConnected, 'boolean');
    }
  });
});

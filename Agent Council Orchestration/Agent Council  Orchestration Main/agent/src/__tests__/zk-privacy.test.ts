/**
 * ZKPrivacyService — zero-knowledge privacy proofs.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('ZKPrivacyService', () => {
  it('module exists and exports ZKPrivacyService', async () => {
    const mod = await import('../services/zk-privacy.service.js');
    assert.ok(mod.ZKPrivacyService);
    assert.equal(typeof mod.ZKPrivacyService, 'function');
  });

  it('can be instantiated', async () => {
    const { ZKPrivacyService } = await import('../services/zk-privacy.service.js');
    const service = new ZKPrivacyService();
    assert.ok(service);
  });
});

/**
 * WalletSwarmService — wallet monitoring swarm.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('WalletSwarmService', () => {
  it('module exists and exports WalletSwarmService', async () => {
    const mod = await import('../services/wallet-swarm.service.js');
    assert.ok(mod.WalletSwarmService);
    assert.equal(typeof mod.WalletSwarmService, 'function');
  });

  it('can be instantiated', async () => {
    const { WalletSwarmService } = await import('../services/wallet-swarm.service.js');
    const service = new WalletSwarmService();
    assert.ok(service);
  });

  it('getStats returns swarm statistics', async () => {
    const { WalletSwarmService } = await import('../services/wallet-swarm.service.js');
    const service = new WalletSwarmService();
    const stats = service.getStats();
    assert.equal(typeof stats.totalAgents, 'number');
    assert.equal(typeof stats.totalAlerts, 'number');
  });
});

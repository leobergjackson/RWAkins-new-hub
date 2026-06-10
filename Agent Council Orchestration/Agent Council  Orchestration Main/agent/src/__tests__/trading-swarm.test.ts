/**
 * TradingSwarmService — multi-agent trading swarm.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('TradingSwarmService', () => {
  it('module exists and exports TradingSwarmService', async () => {
    const mod = await import('../services/trading-swarm.service.js');
    assert.ok(mod.TradingSwarmService);
    assert.equal(typeof mod.TradingSwarmService, 'function');
  });

  it('can be instantiated', async () => {
    const { TradingSwarmService } = await import('../services/trading-swarm.service.js');
    const service = new TradingSwarmService();
    assert.ok(service);
  });

  it('getStats returns swarm statistics', async () => {
    const { TradingSwarmService } = await import('../services/trading-swarm.service.js');
    const service = new TradingSwarmService();
    const stats = service.getStats();
    assert.equal(typeof stats.totalTraders, 'number');
    assert.equal(typeof stats.totalTrades, 'number');
  });
});

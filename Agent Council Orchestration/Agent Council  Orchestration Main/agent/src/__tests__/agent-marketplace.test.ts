/**
 * AgentMarketplaceService — agent-to-agent task marketplace.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('AgentMarketplaceService', () => {
  it('module exists and exports AgentMarketplaceService', async () => {
    const mod = await import('../services/agent-marketplace.service.js');
    assert.ok(mod.AgentMarketplaceService);
    assert.equal(typeof mod.AgentMarketplaceService, 'function');
  });

  it('can be instantiated', async () => {
    const { AgentMarketplaceService } = await import('../services/agent-marketplace.service.js');
    const service = new AgentMarketplaceService();
    assert.ok(service);
  });

  it('getStats returns marketplace statistics', async () => {
    const { AgentMarketplaceService } = await import('../services/agent-marketplace.service.js');
    const service = new AgentMarketplaceService();
    const stats = service.getStats();
    assert.equal(typeof stats.totalTasks, 'number');
    assert.equal(typeof stats.totalAgents, 'number');
  });
});

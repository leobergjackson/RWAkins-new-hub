/**
 * RpcFailoverService — RPC endpoint failover and health tracking.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { RpcFailoverService } from '../services/rpc-failover.service.js';

describe('RpcFailoverService', () => {
  let service: RpcFailoverService;

  before(() => {
    service = new RpcFailoverService();
  });

  it('getActiveRpc returns a URL for known chains', () => {
    const url = service.getActiveRpc('ethereum-sepolia');
    assert.ok(url);
    assert.ok(url!.startsWith('https://'));
  });

  it('getActiveRpc returns undefined for unknown chains', () => {
    const url = service.getActiveRpc('nonexistent-chain');
    assert.equal(url, undefined);
  });

  it('reportSuccess updates endpoint health', () => {
    service.reportSuccess('ethereum-sepolia', 50);
    const health = service.getHealth();
    const ep = health.endpoints.find(e => e.chain === 'ethereum-sepolia' && e.role === 'primary');
    assert.ok(ep);
    assert.ok(ep!.successCount >= 1);
  });

  it('reportFailure triggers failover after 3 failures', () => {
    const chain = 'ethereum-sepolia';
    const originalUrl = service.getActiveRpc(chain);
    service.reportFailure(chain, 'timeout');
    service.reportFailure(chain, 'timeout');
    service.reportFailure(chain, 'timeout');
    const newUrl = service.getActiveRpc(chain);
    // Should have switched to backup
    assert.notEqual(newUrl, originalUrl);
    // Reset
    service.resetToPrimary(chain);
  });

  it('resetToPrimary restores primary endpoint', () => {
    service.resetToPrimary('ethereum-sepolia');
    const health = service.getHealth();
    const primary = health.endpoints.find(e => e.chain === 'ethereum-sepolia' && e.role === 'primary');
    assert.ok(primary);
    assert.equal(primary!.status, 'healthy');
  });

  it('getHealth returns full health status', () => {
    const health = service.getHealth();
    assert.ok(Array.isArray(health.endpoints));
    assert.ok(health.endpoints.length >= 6); // 3 chains x 2 endpoints
    assert.equal(typeof health.failovers, 'number');
  });
});

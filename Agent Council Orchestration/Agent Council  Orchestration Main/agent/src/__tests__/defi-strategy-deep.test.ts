/**
 * Deep DeFiStrategyService tests — opportunity management, decisions, stats.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeFiStrategyService } from '../services/defi-strategy.service.js';

describe('DeFiStrategyService — Opportunity Management', () => {
  it('getOpportunities returns empty when no scan done', () => {
    const svc = new DeFiStrategyService();
    assert.deepEqual(svc.getOpportunities(), []);
  });

  it('getDecisions returns empty initially', () => {
    const svc = new DeFiStrategyService();
    assert.deepEqual(svc.getDecisions(), []);
  });

  it('getMarketState returns initial state', () => {
    const svc = new DeFiStrategyService();
    const state = svc.getMarketState();
    assert.equal(state.totalScanned, 0);
    assert.equal(state.lastScanAt, '');
    assert.deepEqual(state.topYields, []);
  });
});

describe('DeFiStrategyService — makeDecision', () => {
  it('throws for nonexistent opportunity', () => {
    const svc = new DeFiStrategyService();
    assert.throws(() => svc.makeDecision('nonexistent'), /not found/);
  });
});

describe('DeFiStrategyService — Stats', () => {
  it('getStats returns correct structure with zeros initially', () => {
    const svc = new DeFiStrategyService();
    const stats = svc.getStats();
    assert.equal(stats.totalOpportunities, 0);
    assert.equal(stats.approved, 0);
    assert.equal(stats.rejected, 0);
    assert.equal(stats.avgApy, 0);
    assert.equal(stats.avgRisk, 0);
    assert.equal(stats.chainsMonitored, 0);
    assert.equal(stats.lastScan, '');
  });
});

describe('DeFiStrategyService — setServices', () => {
  it('setServices does not throw', () => {
    const svc = new DeFiStrategyService();
    svc.setServices({});
    assert.ok(true);
  });

  it('setLendingService does not throw', () => {
    const svc = new DeFiStrategyService();
    svc.setLendingService({ isAvailable: () => false, supply: async () => ({ id: '', type: 'supply' as const, asset: '', chain: '', amount: '', status: 'pending' as const, createdAt: '' }), getPosition: () => null } as any);
    assert.ok(true);
  });

  it('setWalletService does not throw', () => {
    const svc = new DeFiStrategyService();
    svc.setWalletService({ getRegisteredChains: () => [], getBalance: async () => ({}) } as any);
    assert.ok(true);
  });
});

describe('DeFiStrategyService — getComposedStrategies', () => {
  it('returns composed strategies array', () => {
    const svc = new DeFiStrategyService();
    const strategies = svc.getComposedStrategies();
    assert.ok(Array.isArray(strategies));
    // COMPOSED_STRATEGIES is imported and should have entries
    assert.ok(strategies.length > 0);
  });
});

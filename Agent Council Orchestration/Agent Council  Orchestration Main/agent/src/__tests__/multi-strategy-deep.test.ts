/**
 * Deep MultiStrategyService tests — summary, strategy status, seeding.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MultiStrategyService } from '../services/multi-strategy.service.js';
import { SafetyService } from '../services/safety.service.js';

// Minimal mocks for the constructor dependencies
function createMockDeps() {
  const safety = new SafetyService();
  return {
    ai: { isAvailable: () => false, getProvider: () => 'mock' } as any,
    lending: { isAvailable: () => true, getPosition: () => null } as any,
    swap: { isAvailable: () => true, getStats: () => ({}) } as any,
    bridge: { isAvailable: () => true, getRoutes: () => [] } as any,
    treasury: { getAllocation: () => ({ tippingReservePercent: 80, yieldPercent: 10, gasBufferPercent: 10 }) } as any,
    wallet: { getRegisteredChains: () => ['ethereum-sepolia'], getBalance: async () => ({}) } as any,
    walletOps: { getPaymasterStatus: () => ({ evm: { available: false }, ton: { available: false }, tron: { available: false } }) } as any,
    feeArbitrage: { compareFees: () => ({ recommendation: {} }), getCurrentFees: () => [] } as any,
    dca: { getStats: () => ({ active: 0, totalDistributed: '0' }) } as any,
    safety,
    economics: { getAllScores: () => [] } as any,
  };
}

describe('MultiStrategyService — getSummary', () => {
  it('returns summary with all 4 tracks', () => {
    const deps = createMockDeps();
    const svc = new MultiStrategyService(deps);
    const summary = svc.getSummary(5, '0.05');
    assert.ok(summary.tracks.tipping_bot);
    assert.ok(summary.tracks.lending_bot);
    assert.ok(summary.tracks.defi_agent);
    assert.ok(summary.tracks.agent_wallets);
    assert.equal(summary.tracks.tipping_bot.tips_sent, 5);
    assert.equal(summary.tracks.tipping_bot.volume, '$0.05');
    assert.equal(summary.tracks.lending_bot.enabled, true);
    assert.ok(summary.overall.uptime);
  });
});

describe('MultiStrategyService — getStrategyStatus', () => {
  it('returns status for all 4 strategies', () => {
    const deps = createMockDeps();
    const svc = new MultiStrategyService(deps);
    const status = svc.getStrategyStatus();
    assert.ok('tipping' in status);
    assert.ok('lending' in status);
    assert.ok('defi' in status);
    assert.ok('wallet_management' in status);
    assert.equal(status.tipping.enabled, true);
    assert.equal(status.tipping.decisionCount, 0);
  });

  it('shows disabled when kill switch active', () => {
    const deps = createMockDeps();
    deps.safety.activateKillSwitch();
    const svc = new MultiStrategyService(deps);
    const status = svc.getStrategyStatus();
    assert.equal(status.tipping.enabled, false);
  });
});

describe('MultiStrategyService — seedDemoData', () => {
  it('populates lending positions and defi actions', () => {
    const deps = createMockDeps();
    const svc = new MultiStrategyService(deps);
    svc.seedDemoData();
    const positions = svc.getLendingPositions();
    assert.ok(positions.length > 0);
    const actions = svc.getDeFiActions();
    assert.ok(actions.length > 0);
    const health = svc.getWalletHealth();
    assert.ok(health.length > 0);
  });
});

describe('MultiStrategyService — getDecisions', () => {
  it('returns empty array initially', () => {
    const deps = createMockDeps();
    const svc = new MultiStrategyService(deps);
    const decisions = svc.getDecisions();
    assert.ok(Array.isArray(decisions));
    assert.equal(decisions.length, 0);
  });

  it('getDecisionsByStrategy returns empty for each strategy initially', () => {
    const deps = createMockDeps();
    const svc = new MultiStrategyService(deps);
    assert.deepEqual(svc.getDecisionsByStrategy('lending'), []);
    assert.deepEqual(svc.getDecisionsByStrategy('defi'), []);
    assert.deepEqual(svc.getDecisionsByStrategy('wallet_management'), []);
  });
});

describe('MultiStrategyService — setOpenClawService / setDeFiStrategyService', () => {
  it('do not throw when wiring services', () => {
    const deps = createMockDeps();
    const svc = new MultiStrategyService(deps);
    svc.setOpenClawService({ listTools: () => [] } as any);
    svc.setDeFiStrategyService({ getStats: () => ({}) } as any);
    assert.ok(true);
  });
});

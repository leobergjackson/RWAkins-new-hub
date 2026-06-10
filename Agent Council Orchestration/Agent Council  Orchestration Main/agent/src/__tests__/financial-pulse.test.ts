/**
 * Tests for financial-pulse.ts — calculateFinancialPulse, getWalletMood,
 * getMoodPreferredChain, getMoodBatchSize, getMoodRiskTolerance, getMoodModifiers.
 * Pure function tests — no WDK required.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFinancialPulse,
  getWalletMood,
  getMoodPreferredChain,
  getMoodBatchSize,
  getMoodRiskTolerance,
  getMoodModifiers,
} from '../services/financial-pulse.js';
import type { FinancialPulse } from '../services/financial-pulse.js';

// Stub memory service
function makeMem(data: Record<string, string> = {}) {
  return {
    recall(key: string) {
      return key in data ? { value: data[key] } : null;
    },
  };
}

describe('calculateFinancialPulse', () => {
  it('returns a pulse with no wallet service', async () => {
    const pulse = await calculateFinancialPulse(null, makeMem(), []);
    assert.equal(typeof pulse.healthScore, 'number');
    assert.equal(pulse.totalAvailableUsdt, 0);
    assert.equal(pulse.activeChainsCount, 0);
    assert.ok(pulse.timestamp);
  });

  it('computes liquidity from mock wallet balances', async () => {
    const walletService = {
      async getAllBalances() {
        return [
          { usdtBalance: '50', nativeBalance: '1' },
          { usdtBalance: '30', nativeBalance: '0.5' },
        ];
      },
    };
    const pulse = await calculateFinancialPulse(walletService, makeMem(), []);
    assert.equal(pulse.totalAvailableUsdt, 80);
    assert.equal(pulse.activeChainsCount, 2);
    assert.ok(pulse.liquidityScore >= 0 && pulse.liquidityScore <= 100);
  });

  it('accounts for committed funds in liquidity', async () => {
    const walletService = {
      async getAllBalances() {
        return [{ usdtBalance: '100', nativeBalance: '0' }];
      },
    };
    const mem = makeMem({ context_lending_active: '50' });
    const pulse = await calculateFinancialPulse(walletService, mem, []);
    // 100 available, 50 committed => liquidity = 100/150 * 100 ~ 67
    assert.ok(pulse.liquidityScore < 100);
    assert.ok(pulse.liquidityScore > 50);
  });

  it('computes velocity from recent timestamps', async () => {
    const now = Date.now();
    // All in second half (recent)
    const timestamps = [now - 5000, now - 3000, now - 1000];
    const pulse = await calculateFinancialPulse(null, makeMem(), timestamps);
    assert.ok(pulse.velocityScore > 0);
  });
});

// ── getWalletMood ─────────────────────────────────────────

describe('getWalletMood', () => {
  it('returns generous when liquidity and velocity are high', () => {
    const pulse: FinancialPulse = {
      liquidityScore: 80, diversificationScore: 50, velocityScore: 60,
      healthScore: 70, totalAvailableUsdt: 100, activeChainsCount: 2,
      timestamp: new Date().toISOString(),
    };
    const mood = getWalletMood(pulse);
    assert.equal(mood.mood, 'generous');
    assert.equal(mood.tipMultiplier, 1.3);
  });

  it('returns cautious when liquidity is low', () => {
    const pulse: FinancialPulse = {
      liquidityScore: 20, diversificationScore: 10, velocityScore: 10,
      healthScore: 15, totalAvailableUsdt: 5, activeChainsCount: 1,
      timestamp: new Date().toISOString(),
    };
    const mood = getWalletMood(pulse);
    assert.equal(mood.mood, 'cautious');
    assert.equal(mood.tipMultiplier, 0.5);
  });

  it('returns strategic for balanced state', () => {
    const pulse: FinancialPulse = {
      liquidityScore: 50, diversificationScore: 40, velocityScore: 40,
      healthScore: 45, totalAvailableUsdt: 50, activeChainsCount: 2,
      timestamp: new Date().toISOString(),
    };
    const mood = getWalletMood(pulse);
    assert.equal(mood.mood, 'strategic');
    assert.equal(mood.tipMultiplier, 1.0);
  });
});

// ── getMoodPreferredChain ─────────────────────────────────

describe('getMoodPreferredChain', () => {
  it('cautious prefers tron-nile (cheapest)', () => {
    assert.equal(getMoodPreferredChain('cautious'), 'tron-nile');
  });

  it('generous prefers ethereum-sepolia', () => {
    assert.equal(getMoodPreferredChain('generous'), 'ethereum-sepolia');
  });

  it('strategic defaults to ethereum-sepolia', () => {
    assert.equal(getMoodPreferredChain('strategic'), 'ethereum-sepolia');
  });

  it('undefined defaults to ethereum-sepolia', () => {
    assert.equal(getMoodPreferredChain(undefined), 'ethereum-sepolia');
  });
});

// ── getMoodBatchSize ──────────────────────────────────────

describe('getMoodBatchSize', () => {
  it('generous = 5', () => assert.equal(getMoodBatchSize('generous'), 5));
  it('cautious = 1', () => assert.equal(getMoodBatchSize('cautious'), 1));
  it('strategic = 3', () => assert.equal(getMoodBatchSize('strategic'), 3));
});

// ── getMoodRiskTolerance ──────────────────────────────────

describe('getMoodRiskTolerance', () => {
  it('generous = 70', () => assert.equal(getMoodRiskTolerance('generous'), 70));
  it('cautious = 40', () => assert.equal(getMoodRiskTolerance('cautious'), 40));
  it('strategic = 55', () => assert.equal(getMoodRiskTolerance('strategic'), 55));
});

// ── getMoodModifiers ──────────────────────────────────────

describe('getMoodModifiers', () => {
  it('returns all required fields', () => {
    const mods = getMoodModifiers('generous');
    assert.equal(mods.mood, 'generous');
    assert.equal(mods.tipMultiplier, 1.3);
    assert.equal(mods.tipAmountBonus, 0.20);
    assert.equal(mods.creatorSelectionStrategy, 'favor_new');
    assert.equal(mods.gasPriceTolerance, 2.0);
    assert.equal(mods.batchSize, 5);
    assert.equal(mods.riskTolerance, 70);
    assert.ok(mods.preferredChain);
  });

  it('defaults to strategic when undefined', () => {
    const mods = getMoodModifiers(undefined);
    assert.equal(mods.mood, 'strategic');
    assert.equal(mods.tipMultiplier, 1.0);
  });
});

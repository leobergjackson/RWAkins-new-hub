/**
 * FeeArbitrageService — Cross-chain fee optimization tests.
 * Tests fee comparison, current fees, optimal timing, and disposal.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FeeArbitrageService } from '../services/fee-arbitrage.service.js';

describe('FeeArbitrageService', () => {
  let service: FeeArbitrageService;

  before(() => {
    service = new FeeArbitrageService();
  });

  after(() => {
    service.dispose();
  });

  // ── compareFees ──

  describe('compareFees()', () => {
    it('returns FeeComparison structure', () => {
      const result = service.compareFees('0.01', 'usdt');
      assert.ok(result);
      assert.equal(result.amount, '0.01');
      assert.equal(result.token, 'usdt');
      assert.ok(Array.isArray(result.chains));
      assert.ok(result.recommendation);
      assert.equal(typeof result.recommendation.bestChain, 'string');
      assert.equal(typeof result.recommendation.reason, 'string');
      assert.equal(typeof result.recommendation.savings, 'string');
      assert.equal(typeof result.recommendation.savingsPercent, 'number');
      assert.equal(typeof result.optimizationScore, 'number');
      assert.ok(result.timestamp);
    });

    it('handles zero amount gracefully', () => {
      const result = service.compareFees('0', 'usdt');
      assert.ok(result);
      assert.equal(result.amount, '0');
    });

    it('handles non-numeric amount by using default', () => {
      const result = service.compareFees('abc', 'usdt');
      assert.ok(result);
      assert.equal(result.amount, 'abc');
    });

    it('defaults token to usdt when not specified', () => {
      const result = service.compareFees('1');
      assert.equal(result.token, 'usdt');
    });
  });

  // ── getCurrentFees ──

  describe('getCurrentFees()', () => {
    it('returns an array of ChainFeeData', () => {
      const fees = service.getCurrentFees();
      assert.ok(Array.isArray(fees));
      // May be empty if RPCs haven't responded yet
      for (const fee of fees) {
        assert.equal(typeof fee.chainId, 'string');
        assert.equal(typeof fee.chainName, 'string');
        assert.equal(typeof fee.feeUsd, 'number');
        assert.equal(typeof fee.feeNative, 'number');
        assert.equal(typeof fee.nativeToken, 'string');
        assert.equal(typeof fee.gasPrice, 'number');
        assert.ok(['low', 'medium', 'high'].includes(fee.congestion));
        assert.equal(typeof fee.confirmationTime, 'number');
        assert.ok(fee.updatedAt);
      }
    });
  });

  // ── getOptimalTiming ──

  describe('getOptimalTiming()', () => {
    it('returns timing advice structure', () => {
      const timing = service.getOptimalTiming();
      assert.ok(timing);
      assert.equal(typeof timing.recommendation, 'string');
      assert.ok(timing.recommendation.length > 0);
      assert.equal(typeof timing.currentStatus, 'string');
      assert.ok(['optimal', 'acceptable', 'wait'].includes(timing.currentStatus));
      assert.equal(typeof timing.chains, 'object');
    });
  });

  // ── getChainHistory ──

  describe('getChainHistory()', () => {
    it('returns undefined for chain with no history', () => {
      const history = service.getChainHistory('nonexistent-chain');
      assert.equal(history, undefined);
    });
  });

  // ── getAllHistory ──

  describe('getAllHistory()', () => {
    it('returns an array', () => {
      const histories = service.getAllHistory();
      assert.ok(Array.isArray(histories));
    });
  });

  // ── dispose ──

  describe('dispose()', () => {
    it('cleans up interval without error', () => {
      const tempService = new FeeArbitrageService();
      assert.doesNotThrow(() => {
        tempService.dispose();
      });
    });

    it('can be called multiple times safely', () => {
      const tempService = new FeeArbitrageService();
      tempService.dispose();
      assert.doesNotThrow(() => {
        tempService.dispose();
      });
    });
  });
});

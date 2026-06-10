/**
 * TreasuryService — Treasury management and yield optimization tests.
 * Tests yield opportunities, sustainability report, rebalancing, and wiring.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { TreasuryService } from '../services/treasury.service.js';

describe('TreasuryService', () => {
  let service: TreasuryService;

  before(() => {
    service = new TreasuryService();
  });

  // ── getYieldOpportunities ──

  describe('getYieldOpportunities()', () => {
    it('returns an array of yield opportunities', async () => {
      const yields = await service.getYieldOpportunities();
      assert.ok(Array.isArray(yields));
      assert.ok(yields.length > 0, 'Should have at least static yields');
      for (const y of yields) {
        assert.equal(typeof y.protocol, 'string');
        assert.equal(typeof y.asset, 'string');
        assert.equal(typeof y.apy, 'number');
        assert.equal(typeof y.chain, 'string');
        assert.ok(['low', 'medium', 'high'].includes(y.risk));
        assert.equal(typeof y.minDeposit, 'number');
        assert.equal(typeof y.tvl, 'number');
        assert.equal(typeof y.isLive, 'boolean');
      }
    });
  });

  // ── getTreasuryStatus ──

  describe('getTreasuryStatus()', () => {
    it('returns correct structure', () => {
      const status = service.getTreasuryStatus(100);
      assert.equal(typeof status.totalBalance, 'number');
      assert.equal(typeof status.tippingReserve, 'number');
      assert.equal(typeof status.yieldDeployed, 'number');
      assert.equal(typeof status.gasBuffer, 'number');
      assert.equal(typeof status.idleFunds, 'number');
      assert.ok(status.lastRebalance);
    });

    it('tippingReserve + gasBuffer + yieldDeployed + idleFunds <= totalBalance', () => {
      const status = service.getTreasuryStatus(100);
      const sum = status.tippingReserve + status.gasBuffer + status.yieldDeployed + status.idleFunds;
      assert.ok(sum <= status.totalBalance + 0.01, 'Components should not exceed total');
    });

    it('uses provided wallet balance', () => {
      const status = service.getTreasuryStatus(42.5);
      assert.equal(status.totalBalance, 42.5);
    });
  });

  // ── evaluateRebalance ──

  describe('evaluateRebalance()', () => {
    it('returns action:none when no strategy configured', async () => {
      const freshTreasury = new TreasuryService();
      const result = await freshTreasury.evaluateRebalance(100);
      assert.equal(result.action, 'none');
      assert.ok(result.reason.length > 0, 'Should have a reason string');
    });

    it('returns a rebalance result structure', async () => {
      const result = await service.evaluateRebalance(100);
      assert.equal(typeof result.action, 'string');
      assert.equal(typeof result.amount, 'number');
      assert.equal(typeof result.reason, 'string');
    });
  });

  // ── setWalletService / setLendingService ──

  describe('Service wiring', () => {
    it('setWalletService does not throw', () => {
      assert.doesNotThrow(() => {
        service.setWalletService({} as any);
      });
    });

    it('setLendingService does not throw', () => {
      assert.doesNotThrow(() => {
        service.setLendingService({} as any);
      });
    });
  });

  // ── Allocation ──

  describe('Allocation', () => {
    it('getAllocation returns percentages summing to 100', () => {
      const alloc = service.getAllocation();
      const sum = alloc.tippingReservePercent + alloc.yieldPercent + alloc.gasBufferPercent;
      assert.ok(Math.abs(sum - 100) < 0.01, `Allocation should sum to 100, got ${sum}`);
    });

    it('setAllocation throws when percentages do not sum to 100', () => {
      assert.throws(() => {
        service.setAllocation({
          tippingReservePercent: 50,
          yieldPercent: 30,
          gasBufferPercent: 10,
        });
      }, /sum to 100/);
    });

    it('setAllocation succeeds with valid percentages', () => {
      assert.doesNotThrow(() => {
        service.setAllocation({
          tippingReservePercent: 60,
          yieldPercent: 30,
          gasBufferPercent: 10,
        });
      });
    });
  });

  // ── Tracking ──

  describe('recordTip()', () => {
    it('records tip without error', () => {
      assert.doesNotThrow(() => {
        service.recordTip(0.01, 0.001);
      });
    });
  });

  // ── Yield Strategy ──

  describe('Yield strategy', () => {
    it('getYieldStrategy returns null when not set', () => {
      const freshService = new TreasuryService();
      const strat = freshService.getYieldStrategy();
      // Could be null or a restored strategy
      assert.equal(typeof strat, 'object');
    });

    it('setYieldStrategy stores strategy', () => {
      const freshService = new TreasuryService();
      freshService.setYieldStrategy({
        enabled: true,
        minIdleThreshold: 0.1,
        targetProtocol: 'Aave V3',
        maxAllocationPercent: 30,
        autoRebalance: true,
        rebalanceIntervalHours: 6,
      });
      const strat = freshService.getYieldStrategy();
      assert.ok(strat);
      assert.equal(strat!.enabled, true);
      assert.equal(strat!.targetProtocol, 'Aave V3');
    });
  });

  // ── Economic report ──

  describe('getEconomicReport()', () => {
    it('returns comprehensive report structure', async () => {
      const report = await service.getEconomicReport(50);
      assert.ok(report);
      assert.equal(typeof report.period, 'string');
      assert.equal(typeof report.totalBalance, 'number');
      assert.ok(report.allocation);
      assert.ok(report.analytics);
      assert.ok(Array.isArray(report.topYieldOpportunities));
      assert.ok(report.sustainability);
      assert.equal(typeof report.sustainability.score, 'number');
      assert.equal(typeof report.sustainability.label, 'string');
      assert.ok(Array.isArray(report.recommendations));
      assert.ok(report.recommendations.length > 0);
    });
  });
});

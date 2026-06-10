/**
 * DcaService — Dollar-Cost Averaging tests.
 * Tests plan creation, lifecycle management, and persistence.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DcaService } from '../services/dca.service.js';

describe('DcaService', () => {
  let service: DcaService;

  before(() => {
    service = new DcaService();
  });

  after(() => {
    service.dispose();
  });

  // ── createPlan ──

  describe('createPlan()', () => {
    it('creates a plan with correct installments', () => {
      const plan = service.createPlan({
        recipient: '0x1234567890abcdef1234567890abcdef12345678',
        totalAmount: 1.0,
        installments: 10,
        intervalHours: 24,
      });
      assert.ok(plan.id.startsWith('dca_'));
      assert.equal(plan.totalAmount, 1.0);
      assert.equal(plan.installments, 10);
      assert.equal(plan.amountPerInstallment, 0.1);
      assert.equal(plan.remainingAmount, 1.0);
      assert.equal(plan.executedAmount, 0);
      assert.equal(plan.completedInstallments, 0);
      assert.equal(plan.status, 'active');
      assert.equal(plan.token, 'usdt');
      assert.equal(plan.chainId, 'ethereum-sepolia');
      assert.ok(Array.isArray(plan.history));
      assert.equal(plan.history.length, 0);
    });

    it('calculates amountPerInstallment correctly', () => {
      const plan = service.createPlan({
        recipient: '0xaaa',
        totalAmount: 0.5,
        installments: 5,
        intervalHours: 1,
      });
      assert.equal(plan.amountPerInstallment, 0.1);
    });

    it('sets interval label for hourly', () => {
      const plan = service.createPlan({
        recipient: '0xbbb',
        totalAmount: 0.1,
        installments: 10,
        intervalHours: 1,
      });
      assert.equal(plan.intervalLabel, 'hourly');
    });

    it('sets interval label for daily', () => {
      const plan = service.createPlan({
        recipient: '0xccc',
        totalAmount: 0.1,
        installments: 10,
        intervalHours: 24,
      });
      assert.equal(plan.intervalLabel, 'daily');
    });

    it('sets interval label for weekly', () => {
      const plan = service.createPlan({
        recipient: '0xddd',
        totalAmount: 0.1,
        installments: 4,
        intervalHours: 168,
      });
      assert.equal(plan.intervalLabel, 'weekly');
    });

    it('accepts custom token and chain', () => {
      const plan = service.createPlan({
        recipient: '0xeee',
        totalAmount: 0.1,
        installments: 2,
        intervalHours: 24,
        token: 'eth',
        chainId: 'tron-nile',
      });
      assert.equal(plan.token, 'eth');
      assert.equal(plan.chainId, 'tron-nile');
    });
  });

  // ── getPlan / getAllPlans ──

  describe('getPlan() / getAllPlans()', () => {
    it('retrieves a plan by ID', () => {
      const created = service.createPlan({
        recipient: '0xfff',
        totalAmount: 0.05,
        installments: 5,
        intervalHours: 1,
      });
      const found = service.getPlan(created.id);
      assert.ok(found);
      assert.equal(found!.id, created.id);
    });

    it('returns undefined for non-existent ID', () => {
      assert.equal(service.getPlan('nonexistent'), undefined);
    });

    it('getAllPlans returns plans in reverse order', () => {
      const all = service.getAllPlans();
      assert.ok(Array.isArray(all));
      assert.ok(all.length > 0);
    });
  });

  // ── pausePlan / resumePlan / cancelPlan ──

  describe('Plan lifecycle', () => {
    it('pausePlan changes status to paused', () => {
      const plan = service.createPlan({
        recipient: '0x111',
        totalAmount: 0.1,
        installments: 5,
        intervalHours: 1,
      });
      const paused = service.pausePlan(plan.id);
      assert.ok(paused);
      assert.equal(paused!.status, 'paused');
    });

    it('resumePlan changes status back to active', () => {
      const plan = service.createPlan({
        recipient: '0x222',
        totalAmount: 0.1,
        installments: 5,
        intervalHours: 1,
      });
      service.pausePlan(plan.id);
      const resumed = service.resumePlan(plan.id);
      assert.ok(resumed);
      assert.equal(resumed!.status, 'active');
    });

    it('cancelPlan changes status to cancelled', () => {
      const plan = service.createPlan({
        recipient: '0x333',
        totalAmount: 0.1,
        installments: 5,
        intervalHours: 1,
      });
      const cancelled = service.cancelPlan(plan.id);
      assert.ok(cancelled);
      assert.equal(cancelled!.status, 'cancelled');
    });

    it('pausePlan returns undefined for already paused plan', () => {
      const plan = service.createPlan({
        recipient: '0x444',
        totalAmount: 0.1,
        installments: 5,
        intervalHours: 1,
      });
      service.pausePlan(plan.id);
      const result = service.pausePlan(plan.id);
      assert.equal(result, undefined);
    });

    it('resumePlan returns undefined for active plan', () => {
      const plan = service.createPlan({
        recipient: '0x555',
        totalAmount: 0.1,
        installments: 5,
        intervalHours: 1,
      });
      const result = service.resumePlan(plan.id);
      assert.equal(result, undefined);
    });
  });

  // ── getStats ──

  describe('getStats()', () => {
    it('returns correct stats structure', () => {
      const stats = service.getStats();
      assert.equal(typeof stats.totalPlans, 'number');
      assert.equal(typeof stats.active, 'number');
      assert.equal(typeof stats.completed, 'number');
      assert.equal(typeof stats.totalDistributed, 'number');
      assert.equal(typeof stats.totalPending, 'number');
      assert.equal(typeof stats.avgInstallments, 'number');
    });
  });

  // ── getActivePlans ──

  describe('getActivePlans()', () => {
    it('only returns active plans', () => {
      const active = service.getActivePlans();
      for (const plan of active) {
        assert.equal(plan.status, 'active');
      }
    });
  });
});

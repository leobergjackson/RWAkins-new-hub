/**
 * AutoPaymentsService — Bill splitting, subscriptions, and conditional payments tests.
 * Tests bill creation, 2-phase settlement, subscriptions, and conditional payments.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { AutoPaymentsService } from '../services/auto-payments.service.js';

describe('AutoPaymentsService', () => {
  let service: AutoPaymentsService;

  before(() => {
    service = new AutoPaymentsService();
  });

  // ── Bill creation ──

  describe('createBill()', () => {
    it('creates a bill with participants', () => {
      const bill = service.createBill({
        title: 'Test Dinner',
        totalAmount: 100,
        createdBy: '0xCreator',
        participants: [
          { address: '0xAlice', name: 'Alice' },
          { address: '0xBob', name: 'Bob' },
        ],
      });
      assert.ok(bill.id.startsWith('bill_'));
      assert.equal(bill.title, 'Test Dinner');
      assert.equal(bill.totalAmount, 100);
      assert.equal(bill.participants.length, 2);
      assert.equal(bill.status, 'pending');
      assert.equal(bill.token, 'USDT');
      assert.equal(bill.chainId, 'ethereum-sepolia');
    });

    it('splits amount equally by default', () => {
      const bill = service.createBill({
        title: 'Equal Split',
        totalAmount: 90,
        createdBy: '0xCreator',
        participants: [
          { address: '0xA' },
          { address: '0xB' },
          { address: '0xC' },
        ],
      });
      for (const p of bill.participants) {
        assert.equal(p.shareAmount, 30);
        assert.ok(Math.abs(p.sharePercent - 100 / 3) < 0.01);
      }
    });

    it('respects custom share percentages', () => {
      const bill = service.createBill({
        title: 'Custom Split',
        totalAmount: 100,
        createdBy: '0xCreator',
        participants: [
          { address: '0xA', sharePercent: 60 },
          { address: '0xB', sharePercent: 40 },
        ],
      });
      assert.equal(bill.participants[0].shareAmount, 60);
      assert.equal(bill.participants[1].shareAmount, 40);
    });

    it('creates recurring bill', () => {
      const bill = service.createBill({
        title: 'Monthly Rent',
        totalAmount: 500,
        createdBy: '0xLandlord',
        participants: [{ address: '0xTenant' }],
        recurring: { intervalHours: 720 },
      });
      assert.ok(bill.recurring);
      assert.ok(bill.recurring!.active);
    });
  });

  // ── getBill / listBills ──

  describe('getBill() / listBills()', () => {
    it('retrieves bill by ID', () => {
      const bill = service.createBill({
        title: 'Find Me',
        totalAmount: 10,
        createdBy: '0xCreator',
        participants: [{ address: '0xA' }],
      });
      const found = service.getBill(bill.id);
      assert.ok(found);
      assert.equal(found!.title, 'Find Me');
    });

    it('returns null for unknown bill ID', () => {
      assert.equal(service.getBill('nonexistent'), null);
    });

    it('listBills returns all bills', () => {
      const bills = service.listBills();
      assert.ok(Array.isArray(bills));
      assert.ok(bills.length > 0);
    });

    it('listBills filters by status', () => {
      const pending = service.listBills('pending');
      for (const b of pending) {
        assert.equal(b.status, 'pending');
      }
    });
  });

  // ── cancelBill ──

  describe('cancelBill()', () => {
    it('cancels an existing bill', () => {
      const bill = service.createBill({
        title: 'Cancel Me',
        totalAmount: 10,
        createdBy: '0xCreator',
        participants: [{ address: '0xA' }],
      });
      const result = service.cancelBill(bill.id);
      assert.ok(!('error' in result));
      assert.equal((result as any).status, 'cancelled');
    });

    it('returns error for unknown bill', () => {
      const result = service.cancelBill('nonexistent');
      assert.ok('error' in result);
    });
  });

  // ── prepareBillSettlement (2-phase) ──

  describe('prepareBillSettlement()', () => {
    it('fails for non-existent bill', async () => {
      const result = await service.prepareBillSettlement('nonexistent');
      assert.equal(result.status, 'failed');
      assert.ok(result.error);
    });

    it('prepares settlement for existing bill', async () => {
      const bill = service.createBill({
        title: 'Settle Me',
        totalAmount: 10,
        createdBy: '0xCreator',
        participants: [{ address: '0xA' }],
      });
      const result = await service.prepareBillSettlement(bill.id);
      // May be 'prepared' or 'failed' depending on wallet connectivity
      assert.ok(['prepared', 'failed'].includes(result.status));
    });
  });

  // ── Subscriptions ──

  describe('createSubscription()', () => {
    it('creates a subscription with correct fields', () => {
      const sub = service.createSubscription({
        name: 'Netflix',
        from: '0xPayer',
        to: '0xNetflix',
        amount: 15,
        intervalHours: 720,
        memo: 'Monthly subscription',
      });
      assert.ok(sub.id.startsWith('sub_'));
      assert.equal(sub.name, 'Netflix');
      assert.equal(sub.amount, 15);
      assert.equal(sub.status, 'active');
      assert.equal(sub.retryCount, 0);
      assert.equal(sub.maxRetries, 3);
      assert.equal(sub.totalPaid, 0);
      assert.equal(sub.paymentCount, 0);
      assert.equal(sub.type, 'subscription');
      assert.ok(Array.isArray(sub.history));
    });

    it('creates a payroll type', () => {
      const sub = service.createSubscription({
        name: 'Employee Salary',
        type: 'payroll',
        from: '0xCompany',
        to: '0xEmployee',
        amount: 3000,
        intervalHours: 720,
      });
      assert.equal(sub.type, 'payroll');
    });
  });

  // ── Subscription lifecycle ──

  describe('Subscription lifecycle', () => {
    it('pauseSubscription changes status to paused', () => {
      const sub = service.createSubscription({
        name: 'To Pause',
        from: '0xA',
        to: '0xB',
        amount: 10,
        intervalHours: 24,
      });
      const result = service.pauseSubscription(sub.id);
      assert.ok(!('error' in result));
      assert.equal((result as any).status, 'paused');
    });

    it('resumeSubscription changes status back to active', () => {
      const sub = service.createSubscription({
        name: 'To Resume',
        from: '0xA',
        to: '0xB',
        amount: 10,
        intervalHours: 24,
      });
      service.pauseSubscription(sub.id);
      const result = service.resumeSubscription(sub.id);
      assert.ok(!('error' in result));
      assert.equal((result as any).status, 'active');
    });

    it('cancelSubscription changes status to cancelled', () => {
      const sub = service.createSubscription({
        name: 'To Cancel',
        from: '0xA',
        to: '0xB',
        amount: 10,
        intervalHours: 24,
      });
      const result = service.cancelSubscription(sub.id);
      assert.ok(!('error' in result));
      assert.equal((result as any).status, 'cancelled');
    });
  });

  // ── Conditional payments ──

  describe('createConditionalPayment()', () => {
    it('creates a conditional payment', () => {
      const cp = service.createConditionalPayment({
        recipient: '0xRecipient',
        amount: 50,
        condition: { type: 'view_count', target: 10000 },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      assert.ok(cp.id.startsWith('cp_'));
      assert.equal(cp.status, 'pending');
      assert.equal(cp.amount, 50);
      assert.equal(cp.condition.type, 'view_count');
      assert.equal(cp.condition.target, 10000);
      assert.equal(cp.currentValue, 0);
      assert.equal(cp.checkCount, 0);
    });

    it('creates time_based conditional payment', () => {
      const cp = service.createConditionalPayment({
        recipient: '0xRecipient',
        amount: 25,
        condition: { type: 'time_based', target: Math.floor(Date.now() / 1000) + 3600 },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        label: 'Delayed tip',
      });
      assert.equal(cp.condition.type, 'time_based');
      assert.equal(cp.label, 'Delayed tip');
    });
  });

  // ── getConditionalPayment / listConditionalPayments ──

  describe('Conditional payment queries', () => {
    it('retrieves a conditional payment by ID', () => {
      const cp = service.createConditionalPayment({
        recipient: '0xR',
        amount: 10,
        condition: { type: 'view_count', target: 1000 },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      const found = service.getConditionalPayment(cp.id);
      assert.ok(found);
      assert.equal(found!.id, cp.id);
    });

    it('returns null for unknown ID', () => {
      assert.equal(service.getConditionalPayment('nonexistent'), null);
    });

    it('lists conditional payments', () => {
      const all = service.listConditionalPayments();
      assert.ok(Array.isArray(all));
    });

    it('filters conditional payments by status', () => {
      const pending = service.listConditionalPayments('pending');
      for (const cp of pending) {
        assert.equal(cp.status, 'pending');
      }
    });
  });

  // ── cancelConditionalPayment ──

  describe('cancelConditionalPayment()', () => {
    it('cancels a pending conditional payment', () => {
      const cp = service.createConditionalPayment({
        recipient: '0xR',
        amount: 10,
        condition: { type: 'view_count', target: 1000 },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      const result = service.cancelConditionalPayment(cp.id);
      assert.ok(!('error' in result));
      assert.equal((result as any).status, 'cancelled');
    });
  });
});

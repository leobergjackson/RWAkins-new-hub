/**
 * Deep AutoPaymentsService tests — bill splitting, subscriptions, conditional payments.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AutoPaymentsService } from '../services/auto-payments.service.js';

const __testDir = dirname(fileURLToPath(import.meta.url));
const PERSIST_FILE = resolve(__testDir, '..', '..', '.auto-payments.json');

before(() => {
  if (existsSync(PERSIST_FILE)) unlinkSync(PERSIST_FILE);
});

describe('AutoPaymentsService — Bill Splitting', () => {
  it('createBill creates a bill with equal shares', () => {
    const svc = new AutoPaymentsService();
    const bill = svc.createBill({
      title: 'Dinner', totalAmount: 100, createdBy: 'alice',
      participants: [{ address: '0x1' }, { address: '0x2' }],
    });
    assert.ok(bill.id);
    assert.equal(bill.title, 'Dinner');
    assert.equal(bill.totalAmount, 100);
    assert.equal(bill.participants.length, 2);
    assert.equal(bill.participants[0].sharePercent, 50);
    assert.equal(bill.participants[0].shareAmount, 50);
    assert.equal(bill.status, 'pending');
  });

  it('createBill respects custom share percentages', () => {
    const svc = new AutoPaymentsService();
    const bill = svc.createBill({
      title: 'Rent', totalAmount: 1000, createdBy: 'bob',
      participants: [
        { address: '0xa', sharePercent: 60 },
        { address: '0xb', sharePercent: 40 },
      ],
    });
    assert.equal(bill.participants[0].shareAmount, 600);
    assert.equal(bill.participants[1].shareAmount, 400);
  });

  it('getBill returns the bill by id', () => {
    const svc = new AutoPaymentsService();
    const bill = svc.createBill({
      title: 'Groceries', totalAmount: 50, createdBy: 'carol',
      participants: [{ address: '0xc' }],
    });
    const found = svc.getBill(bill.id);
    assert.ok(found);
    assert.equal(found!.title, 'Groceries');
  });

  it('getBill returns null for nonexistent id', () => {
    const svc = new AutoPaymentsService();
    assert.equal(svc.getBill('nonexistent'), null);
  });

  it('createBill with recurring schedule', () => {
    const svc = new AutoPaymentsService();
    const bill = svc.createBill({
      title: 'Weekly', totalAmount: 20, createdBy: 'dave',
      participants: [{ address: '0xd' }],
      recurring: { intervalHours: 168 },
    });
    assert.ok(bill.recurring);
    assert.equal(bill.recurring!.active, true);
    assert.equal(bill.recurring!.intervalLabel, '1 weeks');
  });
});

describe('AutoPaymentsService — Subscriptions', () => {
  it('createSubscription creates an active subscription', () => {
    const svc = new AutoPaymentsService();
    const sub = svc.createSubscription({
      name: 'Netflix', type: 'subscription', from: '0xf',
      to: '0xr', amount: 15, token: 'usdt', chainId: 'ethereum-sepolia',
      intervalHours: 720, memo: 'Monthly',
    });
    assert.ok(sub.id);
    assert.equal(sub.name, 'Netflix');
    assert.equal(sub.status, 'active');
    assert.equal(sub.totalPaid, 0);
    assert.equal(sub.paymentCount, 0);
  });

  it('pauseSubscription changes status to paused', () => {
    const svc = new AutoPaymentsService();
    const sub = svc.createSubscription({
      name: 'Spotify', type: 'subscription', from: '0x1',
      to: '0x2', amount: 10, token: 'usdt', chainId: 'ethereum-sepolia',
      intervalHours: 720,
    });
    const paused = svc.pauseSubscription(sub.id);
    assert.ok(paused);
    assert.ok('status' in paused && paused.status === 'paused');
  });

  it('resumeSubscription changes status back to active', () => {
    const svc = new AutoPaymentsService();
    const sub = svc.createSubscription({
      name: 'Gym', type: 'subscription', from: '0x3',
      to: '0x4', amount: 30, token: 'usdt', chainId: 'ethereum-sepolia',
      intervalHours: 720,
    });
    svc.pauseSubscription(sub.id);
    const resumed = svc.resumeSubscription(sub.id);
    assert.ok(resumed);
    assert.ok('status' in resumed && resumed.status === 'active');
  });

  it('cancelSubscription changes status to cancelled', () => {
    const svc = new AutoPaymentsService();
    const sub = svc.createSubscription({
      name: 'Cancel', type: 'subscription', from: '0x5',
      to: '0x6', amount: 5, token: 'usdt', chainId: 'ethereum-sepolia',
      intervalHours: 720,
    });
    const cancelled = svc.cancelSubscription(sub.id);
    assert.ok(cancelled);
    assert.ok('status' in cancelled && cancelled.status === 'cancelled');
  });

  it('getSubscription returns null for nonexistent id', () => {
    const svc = new AutoPaymentsService();
    assert.equal(svc.getSubscription('nonexistent'), null);
  });
});

describe('AutoPaymentsService — Conditional Payments', () => {
  it('createConditionalPayment creates a pending conditional', () => {
    const svc = new AutoPaymentsService();
    const cp = svc.createConditionalPayment({
      recipient: '0xr', amount: 10, token: 'usdt', chain: 'ethereum-sepolia',
      condition: { type: 'view_count', target: 1000 },
      expiresAt: new Date(Date.now() + 86400_000).toISOString(), label: 'Viral bonus',
    });
    assert.ok(cp.id);
    assert.equal(cp.status, 'pending');
    assert.equal(cp.amount, 10);
    assert.equal(cp.condition.type, 'view_count');
  });

  it('listConditionalPayments returns all conditionals', () => {
    const svc = new AutoPaymentsService();
    svc.createConditionalPayment({
      recipient: '0x1', amount: 5, token: 'usdt', chain: 'ethereum-sepolia',
      condition: { type: 'time_based', target: 100 },
      expiresAt: new Date(Date.now() + 43200_000).toISOString(), label: 'Time bonus',
    });
    const all = svc.listConditionalPayments();
    assert.ok(all.length >= 1);
  });
});

describe('AutoPaymentsService — Stats', () => {
  it('getStats returns overview object', () => {
    const svc = new AutoPaymentsService();
    const stats = svc.getStats();
    assert.ok('totalBills' in stats);
    assert.ok('totalSubscriptions' in stats);
    assert.ok('activeSubscriptions' in stats);
    assert.ok('totalPaidOut' in stats);
  });
});

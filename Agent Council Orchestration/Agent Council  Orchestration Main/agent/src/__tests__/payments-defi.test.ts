/**
 * EconomicsService + EscrowService + TipPropagationService +
 * AutoPaymentsService + BridgeService + LendingService + SwapService
 * — focused unit tests.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __testDir = dirname(fileURLToPath(import.meta.url));

// Clean persisted state files before tests
before(() => {
  const files = [
    '.economics.json',
    '.escrow-tips.json',
    '.auto-payments.json',
  ];
  for (const f of files) {
    const fp = resolve(__testDir, '..', '..', f);
    if (existsSync(fp)) unlinkSync(fp);
  }
});

// ══════════════════════════════════════════════════════════════════
// 1. EconomicsService
// ══════════════════════════════════════════════════════════════════

import { EconomicsService } from '../services/economics.service.js';

describe('EconomicsService — creator scoring, split calculation', () => {
  let econ: EconomicsService;

  before(() => {
    econ = new EconomicsService();
  });

  it('scoreCreator returns tier and multiplier', () => {
    const score = econ.scoreCreator('test-creator', {
      viewCount: 100_000,
      likeRatio: 0.8,
      commentCount: 500,
      watchTimeMinutes: 30_000,
      subscriberGrowthRate: 0.4,
    });
    assert.ok(['low', 'medium', 'high'].includes(score.tier));
    assert.ok(score.score > 0);
    assert.ok(typeof score.tipMultiplier === 'number');
  });

  it('calculateSplit returns 90/5/5 split', () => {
    const split = econ.calculateSplit(10);
    assert.equal(split.totalAmount, 10);
    assert.equal(split.creatorAmount, 9);
    assert.equal(split.platformAmount, 0.5);
    assert.equal(split.communityAmount, 0.5);
  });

  it('score breakdown contains all five metrics', () => {
    const score = econ.scoreCreator('breakdown-test', {
      viewCount: 10_000,
      likeRatio: 0.5,
      commentCount: 100,
      watchTimeMinutes: 2000,
      subscriberGrowthRate: 0.2,
    });
    assert.ok('viewScore' in score.breakdown);
    assert.ok('likeScore' in score.breakdown);
    assert.ok('commentScore' in score.breakdown);
    assert.ok('watchTimeScore' in score.breakdown);
    assert.ok('growthScore' in score.breakdown);
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. EscrowService
// ══════════════════════════════════════════════════════════════════

import { EscrowService } from '../services/escrow.service.js';

describe('EscrowService — create, release, dispute', () => {
  let escrow: EscrowService;

  before(() => {
    escrow = new EscrowService();
  });

  it('createEscrow returns held status with HTLC fields', async () => {
    const { escrow: e, secret } = await escrow.createEscrow({
      sender: '0x' + 'a'.repeat(40),
      recipient: '0x' + 'b'.repeat(40),
      amount: '1.0',
      token: 'usdt',
      chainId: 'ethereum-sepolia',
      memo: 'Test',
    });
    assert.ok(e.id.startsWith('escrow_'));
    assert.equal(e.status, 'held');
    assert.equal(e.htlcStatus, 'locked');
    assert.ok(e.hashLock.length === 64, 'hashLock should be 64 hex chars');
    assert.ok(typeof secret === 'string' && secret.length === 64, 'secret should be 64 hex chars');
    assert.ok(e.timelock > Date.now(), 'timelock should be in the future');
  });

  it('releaseEscrow changes status to released', async () => {
    const { escrow: e } = await escrow.createEscrow({
      sender: '0x' + 'c'.repeat(40),
      recipient: '0x' + 'd'.repeat(40),
      amount: '0.5',
      token: 'native',
      chainId: 'ethereum-sepolia',
    });
    const released = await escrow.releaseEscrow(e.id, '0xTxHash');
    assert.ok(released);
    assert.equal(released!.status, 'released');
  });

  it('getStats returns aggregate data', () => {
    const stats = escrow.getStats();
    assert.ok(typeof stats.totalEscrowed === 'number');
    assert.ok(typeof stats.totalHeld === 'number');
    assert.ok(typeof stats.activeCount === 'number');
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. TipPropagationService
// ══════════════════════════════════════════════════════════════════

import { TipPropagationService } from '../services/tip-propagation.service.js';

describe('TipPropagationService — waves, amplification, pools', () => {
  let prop: TipPropagationService;

  before(() => {
    prop = new TipPropagationService();
  });

  it('createWave creates a tip wave with amplification', () => {
    const wave = prop.createWave({
      tipper: '0xTipper',
      creatorId: 'c1',
      creatorName: 'TestCreator',
      amount: 0.01,
    });
    assert.ok(wave.id);
    assert.equal(wave.status, 'active');
    assert.equal(wave.originalAmount, 0.01);
    // Should be amplified by the default community pool
    assert.ok(wave.amplifiedTotal >= 0.01);
    assert.ok(wave.matchMultiplier >= 1);
  });

  it('addDownstreamTip adds to wave', () => {
    const wave = prop.createWave({
      tipper: '0xTipper2',
      creatorId: 'c2',
      creatorName: 'Creator2',
      amount: 0.005,
    });
    prop.addDownstreamTip(wave.id, '0xFollower', 0.003, 'recommendation');
    const waves = prop.getWavesForCreator('c2');
    assert.ok(waves.length >= 1);
    const updated = waves.find(w => w.id === wave.id);
    assert.ok(updated);
    assert.equal(updated!.participants, 2);
    assert.equal(updated!.downstreamTips.length, 1);
  });

  it('createPool creates an amplifier pool', () => {
    const pool = prop.createPool({
      name: 'Test Pool',
      sponsor: '0xSponsor',
      totalDeposited: 5.0,
      matchRatio: 3,
      maxMatchPerTip: 0.1,
      eligibleCategories: ['tech'],
    });
    assert.ok(pool.id);
    assert.equal(pool.remaining, 5.0);
    assert.equal(pool.matchRatio, 3);
  });

  it('getStats returns propagation statistics', () => {
    const stats = prop.getStats();
    assert.ok(stats.totalWaves >= 2);
    assert.ok(typeof stats.viralCoefficient === 'number');
    assert.ok(typeof stats.poolBalance === 'number');
    assert.ok(typeof stats.activePools === 'number');
  });
});

// ══════════════════════════════════════════════════════════════════
// 4. AutoPaymentsService
// ══════════════════════════════════════════════════════════════════

import { AutoPaymentsService } from '../services/auto-payments.service.js';

describe('AutoPaymentsService — bills, subscriptions', () => {
  let payments: AutoPaymentsService;

  before(() => {
    const fp = resolve(__testDir, '..', '..', '.auto-payments.json');
    if (existsSync(fp)) unlinkSync(fp);
    payments = new AutoPaymentsService();
  });

  it('createBill splits equally among participants', () => {
    const bill = payments.createBill({
      title: 'Test Dinner',
      totalAmount: 100,
      createdBy: '0xHost',
      participants: [
        { address: '0xA' },
        { address: '0xB' },
        { address: '0xC' },
        { address: '0xD' },
      ],
    });
    assert.ok(bill.id.startsWith('bill_'));
    assert.equal(bill.totalAmount, 100);
    assert.equal(bill.participants.length, 4);
    assert.equal(bill.participants[0].shareAmount, 25);
    assert.equal(bill.status, 'pending');
  });

  it('getBill retrieves created bill', () => {
    const bills = payments.listBills();
    assert.ok(bills.length >= 1);
    const bill = payments.getBill(bills[0].id);
    assert.ok(bill);
    assert.equal(bill!.title, 'Test Dinner');
  });

  it('cancelBill changes status', () => {
    const bill = payments.createBill({
      title: 'ToCancel',
      totalAmount: 50,
      createdBy: '0xHost',
      participants: [{ address: '0xA' }],
    });
    const result = payments.cancelBill(bill.id);
    assert.ok('status' in result);
    if ('status' in result) {
      assert.equal(result.status, 'cancelled');
    }
  });

  it('createSubscription creates recurring payment', () => {
    const sub = payments.createSubscription({
      name: 'Monthly Support',
      from: '0xPayer',
      to: '0xCreator',
      amount: 5,
      intervalHours: 720,
      maxPayments: 12,
      memo: 'Monthly creator support',
    });
    assert.ok(sub.id.startsWith('sub_'));
    assert.equal(sub.status, 'active');
    assert.equal(sub.amount, 5);
    assert.equal(sub.maxPayments, 12);
  });

  it('pauseSubscription and resumeSubscription work', () => {
    const sub = payments.createSubscription({
      name: 'ToPause',
      from: '0xPayer',
      to: '0xCreator',
      amount: 1,
      intervalHours: 24,
    });
    const paused = payments.pauseSubscription(sub.id);
    assert.ok(!('error' in paused));
    if (!('error' in paused)) {
      assert.equal(paused.status, 'paused');
    }
    const resumed = payments.resumeSubscription(sub.id);
    assert.ok(!('error' in resumed));
    if (!('error' in resumed)) {
      assert.equal(resumed.status, 'active');
    }
  });

  it('cancelSubscription changes status', () => {
    const sub = payments.createSubscription({
      name: 'ToCancelSub',
      from: '0xPayer',
      to: '0xCreator',
      amount: 2,
      intervalHours: 168,
    });
    const result = payments.cancelSubscription(sub.id);
    assert.ok(!('error' in result));
    if (!('error' in result)) {
      assert.equal(result.status, 'cancelled');
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// 5. BridgeService
// ══════════════════════════════════════════════════════════════════

describe('BridgeService — module exports', () => {
  it('module exports BridgeService class', async () => {
    const mod = await import('../services/bridge.service.js');
    assert.ok(typeof mod.BridgeService === 'function');
  });
});

// ══════════════════════════════════════════════════════════════════
// 6. LendingService
// ══════════════════════════════════════════════════════════════════

describe('LendingService — module exports', () => {
  it('module exports LendingService class', async () => {
    const mod = await import('../services/lending.service.js');
    assert.ok(typeof mod.LendingService === 'function');
  });
});

// ══════════════════════════════════════════════════════════════════
// 7. SwapService
// ══════════════════════════════════════════════════════════════════

describe('SwapService — module exports', () => {
  it('module exports SwapService class', async () => {
    const mod = await import('../services/swap.service.js');
    assert.ok(typeof mod.SwapService === 'function');
  });
});

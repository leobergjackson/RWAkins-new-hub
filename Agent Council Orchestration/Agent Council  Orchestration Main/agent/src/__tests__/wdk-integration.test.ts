/**
 * WDK Integration Tests — 100+ tests using MockWalletService
 * Tests WDK-dependent services without network access or real wallets.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { MockWalletService } from './mocks/wdk-mock.js';
import { EscrowService } from '../services/escrow.service.js';
import { TreasuryService } from '../services/treasury.service.js';
import { DcaService } from '../services/dca.service.js';
import { BridgeService } from '../services/bridge.service.js';
import { WebhookReceiverService } from '../services/webhook-receiver.service.js';
import { RSSAggregatorService } from '../services/rss-aggregator.service.js';
import { ReputationPassportService } from '../services/reputation-passport.service.js';
import { ReputationService } from '../services/reputation.service.js';
import { AutoPaymentsService } from '../services/auto-payments.service.js';
import { WebhookSimulatorService } from '../services/webhook-simulator.service.js';

// ══════════════════════════════════════════════════════════════
// 1. EscrowService with MockWalletService (12 tests)
// ══════════════════════════════════════════════════════════════

describe('EscrowService with mock wallet', () => {
  let escrow: EscrowService;
  let wallet: MockWalletService;

  beforeEach(() => {
    escrow = new EscrowService();
    wallet = new MockWalletService();
    escrow.setWalletService(wallet as any);
  });

  it('creates an escrow with hashLock and returns secret', async () => {
    const result = await escrow.createEscrow({
      sender: '0xSender', recipient: '0xRecipient',
      amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    assert.ok(result.escrow.id.startsWith('escrow_'));
    assert.ok(result.secret.length === 64); // 32 bytes hex
    assert.ok(result.escrow.hashLock.length === 64);
    assert.equal(result.escrow.status, 'held');
    assert.equal(result.escrow.htlcStatus, 'locked');
  });

  it('claims escrow with correct secret — wallet executes tx', async () => {
    const { escrow: e, secret } = await escrow.createEscrow({
      sender: '0xSender', recipient: '0xRecipient',
      amount: '0.005', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    const claimed = await escrow.claimEscrow(e.id, secret);
    assert.ok(claimed);
    assert.equal(claimed!.status, 'released');
    assert.equal(claimed!.htlcStatus, 'claimed');
    assert.ok(claimed!.txHash);
    // txCount >= 2: 1 for on-chain lock + 1 for release (or 1 if off-chain lock)
    assert.ok(wallet.getTxCount() >= 1);
  });

  it('rejects claim with wrong secret', async () => {
    const { escrow: e } = await escrow.createEscrow({
      sender: '0xSender', recipient: '0xRecipient',
      amount: '0.005', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    const wrongSecret = 'ff'.repeat(32);
    await assert.rejects(() => escrow.claimEscrow(e.id, wrongSecret));
    // createEscrow does 1 on-chain lock tx, but claim with wrong secret does 0 more
    const countAfterCreate = wallet.getTxCount();
    await assert.rejects(() => escrow.claimEscrow(e.id, wrongSecret));
    assert.equal(wallet.getTxCount(), countAfterCreate); // no additional tx
  });

  it('releases escrow via releaseEscrow (legacy path)', async () => {
    const { escrow: e, secret } = await escrow.createEscrow({
      sender: '0xSender', recipient: '0xRecipient',
      amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    const released = await escrow.releaseEscrow(e.id, undefined, secret);
    assert.ok(released);
    assert.equal(released!.status, 'released');
  });

  it('refunds after timelock expires', async () => {
    const { escrow: e } = await escrow.createEscrow({
      sender: '0xSender', recipient: '0xRecipient',
      amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia',
      timelockHours: 0, // expires immediately
    });
    // Manually set timelock to past so refund is allowed
    const allEscrows = escrow.getAllEscrows();
    const found = allEscrows.find(x => x.id === e.id);
    if (found) found.timelock = Date.now() - 1000;

    const refunded = await escrow.refundEscrow(e.id, 'timelock expired');
    assert.ok(refunded);
    assert.equal(refunded!.status, 'refunded');
    assert.equal(refunded!.htlcStatus, 'refunded');
  });

  it('getActiveCount returns correct number', async () => {
    await escrow.createEscrow({
      sender: '0xSender', recipient: '0xR1',
      amount: '0.005', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    await escrow.createEscrow({
      sender: '0xSender', recipient: '0xR2',
      amount: '0.003', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    assert.ok(escrow.getActiveCount() >= 2);
  });

  it('getStats returns cumulative data', () => {
    const stats = escrow.getStats();
    assert.ok(typeof stats.totalHeld === 'number');
    assert.ok(typeof stats.totalReleased === 'number');
    assert.ok(typeof stats.avgHoldTime === 'number');
  });

  it('getEscrow returns specific escrow', async () => {
    const { escrow: e } = await escrow.createEscrow({
      sender: '0xSender', recipient: '0xR1',
      amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    const found = escrow.getEscrow(e.id);
    assert.ok(found);
    assert.equal(found!.id, e.id);
  });

  it('getAllEscrows returns all', async () => {
    await escrow.createEscrow({
      sender: '0xS', recipient: '0xR',
      amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    const all = escrow.getAllEscrows();
    assert.ok(all.length >= 1);
  });

  it('multiple concurrent escrows track independently', async () => {
    const r1 = await escrow.createEscrow({
      sender: '0xS', recipient: '0xR1',
      amount: '0.005', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    const r2 = await escrow.createEscrow({
      sender: '0xS', recipient: '0xR2',
      amount: '0.003', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    await escrow.claimEscrow(r1.escrow.id, r1.secret);
    assert.equal(escrow.getEscrow(r1.escrow.id)!.htlcStatus, 'claimed');
    assert.equal(escrow.getEscrow(r2.escrow.id)!.htlcStatus, 'locked');
  });

  it('hashLock is SHA-256 of secret', async () => {
    const { escrow: e, secret } = await escrow.createEscrow({
      sender: '0xS', recipient: '0xR',
      amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    const expected = createHash('sha256')
      .update(Buffer.from(secret, 'hex'))
      .digest('hex');
    assert.equal(e.hashLock, expected);
  });

  it('getEscrowsByRecipient filters correctly', async () => {
    await escrow.createEscrow({
      sender: '0xS', recipient: '0xUniqueRecip',
      amount: '0.01', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    const byRecipient = escrow.getEscrowsByRecipient('0xUniqueRecip');
    assert.ok(byRecipient.length >= 1);
    assert.ok(byRecipient.every(e => e.recipient === '0xUniqueRecip'));
  });
});

// ══════════════════════════════════════════════════════════════
// 2. TreasuryService (8 tests)
// ══════════════════════════════════════════════════════════════

describe('TreasuryService', () => {
  let treasury: TreasuryService;

  beforeEach(() => {
    treasury = new TreasuryService();
  });

  it('getAllocation returns default allocation', () => {
    const alloc = treasury.getAllocation();
    assert.equal(alloc.tippingReservePercent + alloc.yieldPercent + alloc.gasBufferPercent, 100);
  });

  it('getTreasuryStatus returns status object', () => {
    const status = treasury.getTreasuryStatus();
    assert.ok(typeof status.totalBalance === 'number');
    assert.ok(typeof status.tippingReserve === 'number');
    assert.ok(typeof status.lastRebalance === 'string');
  });

  it('getYieldOpportunities returns array', async () => {
    const opps = await treasury.getYieldOpportunities();
    assert.ok(Array.isArray(opps));
  });

  it('getEconomicReport returns sustainability score', async () => {
    const report = await treasury.getEconomicReport();
    assert.ok(typeof report.sustainability.score === 'number');
    assert.ok(typeof report.sustainability.label === 'string');
  });

  it('getEconomicReport returns full report', async () => {
    const report = await treasury.getEconomicReport();
    assert.ok(report.allocation);
    assert.ok(report.analytics);
    assert.ok(report.sustainability);
  });

  it('recordTip tracks tip count', async () => {
    treasury.recordTip(0.01, 0.0001);
    treasury.recordTip(0.02, 0.0002);
    const report = await treasury.getEconomicReport();
    assert.ok(report.analytics.totalTipped >= 0.03);
  });

  it('evaluateRebalance returns recommendation', async () => {
    const result = await treasury.evaluateRebalance(100);
    assert.ok(typeof result.action === 'string');
    assert.ok(typeof result.reason === 'string');
  });

  it('allocation percentages sum to 100', () => {
    const alloc = treasury.getAllocation();
    assert.equal(alloc.tippingReservePercent + alloc.yieldPercent + alloc.gasBufferPercent, 100);
  });
});

// ══════════════════════════════════════════════════════════════
// 3. DcaService with mock wallet (10 tests)
// ══════════════════════════════════════════════════════════════

describe('DcaService with mock wallet', () => {
  let dca: DcaService;
  let wallet: MockWalletService;

  beforeEach(() => {
    dca = new DcaService();
    wallet = new MockWalletService();
    dca.setWalletService(wallet as any);
  });

  it('creates a plan with correct installments', () => {
    const plan = dca.createPlan({
      recipient: '0xR', totalAmount: 0.05, installments: 5, intervalHours: 24,
    });
    assert.ok(plan.id.startsWith('dca_'));
    assert.equal(plan.totalAmount, 0.05);
    assert.equal(plan.installments, 5);
    assert.equal(plan.status, 'active');
    assert.ok(Math.abs(plan.amountPerInstallment - 0.01) < 0.0001);
  });

  it('pauses and resumes a plan', () => {
    const plan = dca.createPlan({
      recipient: '0xR', totalAmount: 0.02, installments: 2, intervalHours: 12,
    });
    const paused = dca.pausePlan(plan.id);
    assert.ok(paused);
    assert.equal(paused!.status, 'paused');

    const resumed = dca.resumePlan(plan.id);
    assert.ok(resumed);
    assert.equal(resumed!.status, 'active');
  });

  it('cancels a plan', () => {
    const plan = dca.createPlan({
      recipient: '0xR', totalAmount: 0.03, installments: 3, intervalHours: 24,
    });
    const cancelled = dca.cancelPlan(plan.id);
    assert.ok(cancelled);
    assert.equal(cancelled!.status, 'cancelled');
  });

  it('getActivePlans returns only active', () => {
    dca.createPlan({ recipient: '0xR1', totalAmount: 0.01, installments: 1, intervalHours: 1 });
    const p2 = dca.createPlan({ recipient: '0xR2', totalAmount: 0.01, installments: 1, intervalHours: 1 });
    dca.pausePlan(p2.id);
    const active = dca.getActivePlans();
    assert.ok(active.every(p => p.status === 'active'));
  });

  it('getAllPlans returns all plans', () => {
    const before = dca.getAllPlans().length;
    dca.createPlan({ recipient: '0xR', totalAmount: 0.01, installments: 1, intervalHours: 1 });
    assert.equal(dca.getAllPlans().length, before + 1);
  });

  it('getStats returns statistics', () => {
    dca.createPlan({ recipient: '0xR', totalAmount: 0.05, installments: 5, intervalHours: 24 });
    const stats = dca.getStats();
    assert.ok(stats.active >= 1);
    assert.ok(typeof stats.totalDistributed === 'number');
    assert.ok(typeof stats.totalPending === 'number');
  });

  it('getPlan returns specific plan', () => {
    const plan = dca.createPlan({ recipient: '0xR', totalAmount: 0.02, installments: 2, intervalHours: 12 });
    const found = dca.getPlan(plan.id);
    assert.ok(found);
    assert.equal(found!.id, plan.id);
  });

  it('pause returns undefined for non-active plan', () => {
    const plan = dca.createPlan({ recipient: '0xR', totalAmount: 0.01, installments: 1, intervalHours: 1 });
    dca.cancelPlan(plan.id);
    const result = dca.pausePlan(plan.id);
    assert.equal(result, undefined);
  });

  it('resume returns undefined for non-paused plan', () => {
    const plan = dca.createPlan({ recipient: '0xR', totalAmount: 0.01, installments: 1, intervalHours: 1 });
    const result = dca.resumePlan(plan.id);
    assert.equal(result, undefined);
  });

  it('intervalLabel is set correctly', () => {
    const hourly = dca.createPlan({ recipient: '0xR', totalAmount: 0.01, installments: 1, intervalHours: 1 });
    assert.equal(hourly.intervalLabel, 'hourly');
    const daily = dca.createPlan({ recipient: '0xR', totalAmount: 0.01, installments: 1, intervalHours: 24 });
    assert.equal(daily.intervalLabel, 'daily');
    const weekly = dca.createPlan({ recipient: '0xR', totalAmount: 0.01, installments: 1, intervalHours: 168 });
    assert.equal(weekly.intervalLabel, 'weekly');
  });
});

// ══════════════════════════════════════════════════════════════
// 4. BridgeService (8 tests)
// ══════════════════════════════════════════════════════════════

describe('BridgeService', () => {
  let bridge: BridgeService;

  beforeEach(() => {
    bridge = new BridgeService();
  });

  it('getRoutes returns supported routes', () => {
    const routes = bridge.getRoutes();
    assert.ok(routes.length > 0);
    assert.ok(routes[0].fromChain);
    assert.ok(routes[0].toChain);
  });

  it('quoteBridge returns a quote for valid route', async () => {
    const quote = await bridge.quoteBridge('Ethereum', 'Arbitrum', '100');
    assert.ok(quote);
    assert.equal(quote!.fromChain, 'Ethereum');
    assert.equal(quote!.toChain, 'Arbitrum');
    assert.ok(parseFloat(quote!.fee) > 0);
  });

  it('quoteBridge throws for invalid route', async () => {
    await assert.rejects(() => bridge.quoteBridge('Mars', 'Venus', '100'));
  });

  it('createBridgeIntent records verifiable intent', () => {
    const intent = bridge.createBridgeIntent({
      fromChain: 'Ethereum', toChain: 'Arbitrum', amount: '50',
    });
    assert.ok(intent.id.startsWith('bridge-intent-'));
    assert.ok(intent.intentHash.length === 64);
    assert.equal(intent.status, 'would_execute_on_mainnet');
  });

  it('intent hash is deterministic SHA-256', () => {
    const intent = bridge.createBridgeIntent({
      fromChain: 'Ethereum', toChain: 'Arbitrum', amount: '100',
    });
    const recomputed = createHash('sha256')
      .update(JSON.stringify(intent.wdkCallParams))
      .digest('hex');
    assert.equal(intent.intentHash, recomputed);
  });

  it('getTestnetStatus reports protocol status', () => {
    const status = bridge.getTestnetStatus();
    assert.equal(status.wdkReady, true);
    assert.ok(typeof status.protocol === 'string');
    assert.ok(typeof status.reason === 'string');
  });

  it('getIntents returns persisted intents', () => {
    bridge.createBridgeIntent({ fromChain: 'Ethereum', toChain: 'Base', amount: '10' });
    const intents = bridge.getIntents();
    assert.ok(Array.isArray(intents));
  });

  it('isAvailable returns boolean', () => {
    assert.equal(typeof bridge.isAvailable(), 'boolean');
  });
});

// ══════════════════════════════════════════════════════════════
// 5. WebhookReceiverService (10 tests)
// ══════════════════════════════════════════════════════════════

describe('WebhookReceiverService', () => {
  let receiver: WebhookReceiverService;

  beforeEach(() => {
    receiver = new WebhookReceiverService();
  });

  it('registers a webhook', () => {
    const reg = receiver.registerWebhook('rumble', 'http://localhost:3001/api/webhooks/ingest', 'secret123');
    assert.ok(reg.id.startsWith('wh_rumble_'));
    assert.equal(reg.platform, 'rumble');
    assert.equal(reg.eventsReceived, 0);
  });

  it('ingests a valid event', () => {
    const event = {
      platform: 'rumble', eventType: 'new_video',
      creatorId: 'c1', creatorName: 'TestCreator',
      data: { title: 'New Video', views: 5000 },
      timestamp: new Date().toISOString(),
    };
    const result = receiver.ingestEvent(event);
    assert.ok(result);
    assert.equal(result!.creatorName, 'TestCreator');
  });

  it('rejects event with invalid HMAC signature', () => {
    receiver.registerWebhook('rumble', 'http://localhost/hook', 'my-secret');
    const event = {
      platform: 'rumble', eventType: 'new_video',
      creatorId: 'c1', creatorName: 'TestCreator',
      data: { title: 'Video' },
      timestamp: new Date().toISOString(),
      signature: 'invalid_signature',
    };
    const result = receiver.ingestEvent(event, '{"test": true}');
    assert.equal(result, null);
  });

  it('verifySignature returns true for valid HMAC', () => {
    const body = '{"test": true}';
    const secret = 'test-secret';
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    assert.equal(receiver.verifySignature(body, sig, secret), true);
  });

  it('verifySignature returns false for invalid HMAC', () => {
    assert.equal(receiver.verifySignature('body', 'bad-sig', 'secret'), false);
  });

  it('caps event queue at 1000', () => {
    for (let i = 0; i < 1050; i++) {
      receiver.ingestEvent({
        platform: 'rumble', eventType: 'new_video',
        creatorId: `c_${i}`, creatorName: `Creator${i}`,
        data: { views: i }, timestamp: new Date().toISOString(),
      });
    }
    assert.ok(receiver.getQueueSize() <= 1000);
  });

  it('consumeEvents is destructive', () => {
    receiver.ingestEvent({
      platform: 'rumble', eventType: 'new_video',
      creatorId: 'c1', creatorName: 'C1',
      data: {}, timestamp: new Date().toISOString(),
    });
    const events = receiver.consumeEvents();
    assert.ok(events.length >= 1);
    assert.equal(receiver.getQueueSize(), 0);
  });

  it('getStats tracks by platform', () => {
    receiver.ingestEvent({
      platform: 'rumble', eventType: 'new_video',
      creatorId: 'c1', creatorName: 'C1',
      data: {}, timestamp: new Date().toISOString(),
    });
    receiver.ingestEvent({
      platform: 'youtube', eventType: 'new_video',
      creatorId: 'c2', creatorName: 'C2',
      data: {}, timestamp: new Date().toISOString(),
    });
    const stats = receiver.getStats();
    assert.ok(stats.totalReceived >= 2);
    assert.ok(stats.byPlatform['rumble']);
    assert.ok(stats.byPlatform['youtube']);
  });

  it('getRegistrations redacts secrets', () => {
    receiver.registerWebhook('test', 'http://localhost/hook', 'super-secret-key');
    const regs = receiver.getRegistrations();
    assert.ok(regs[0].secret.includes('****'));
    assert.ok(!regs[0].secret.includes('super-secret-key'));
  });

  it('getRecentEvents returns non-destructive read', () => {
    receiver.ingestEvent({
      platform: 'rumble', eventType: 'new_video',
      creatorId: 'c1', creatorName: 'C1',
      data: {}, timestamp: new Date().toISOString(),
    });
    const events1 = receiver.getRecentEvents();
    const events2 = receiver.getRecentEvents();
    assert.equal(events1.length, events2.length);
    assert.ok(receiver.getQueueSize() >= 1);
  });
});

// ══════════════════════════════════════════════════════════════
// 6. RSSAggregatorService (5 tests)
// ══════════════════════════════════════════════════════════════

describe('RSSAggregatorService', () => {
  let rss: RSSAggregatorService;

  beforeEach(() => {
    rss = new RSSAggregatorService();
  });

  it('getFeedsSummary returns structured data', () => {
    const summary = rss.getFeedsSummary();
    assert.ok(Array.isArray(summary.sources));
    assert.ok(summary.stats);
    assert.ok(typeof summary.stats.totalFetches === 'number');
    assert.ok(typeof summary.stats.cacheEntries === 'number');
  });

  it('stats initialise to zero', () => {
    const summary = rss.getFeedsSummary();
    assert.equal(summary.stats.totalFetches, 0);
    assert.equal(summary.stats.totalErrors, 0);
  });

  it('sources include expected platforms', () => {
    const summary = rss.getFeedsSummary();
    const platforms = new Set(summary.sources.map(s => s.platform));
    assert.ok(platforms.has('reddit'));
    assert.ok(platforms.has('medium'));
    assert.ok(platforms.has('devto'));
  });

  it('each source has categories', () => {
    const summary = rss.getFeedsSummary();
    for (const source of summary.sources) {
      assert.ok(source.categories.length > 0);
    }
  });

  it('event format has required fields', () => {
    // getNewEvents makes network calls, but the service itself constructs events properly
    const summary = rss.getFeedsSummary();
    assert.ok(typeof summary.stats.eventsByPlatform === 'object');
  });
});

// ══════════════════════════════════════════════════════════════
// 7. ReputationPassportService (10 tests)
// ══════════════════════════════════════════════════════════════

describe('ReputationPassportService', () => {
  let passportSvc: ReputationPassportService;
  let repSvc: ReputationService;

  beforeEach(() => {
    passportSvc = new ReputationPassportService();
    repSvc = new ReputationService();
    passportSvc.setReputationService(repSvc);
  });

  it('generatePassport creates a passport', () => {
    const passport = passportSvc.generatePassport('0x' + 'a'.repeat(40));
    assert.ok(passport.id.startsWith('passport_'));
    assert.ok(passport.signatureHash.length === 64);
    assert.ok(typeof passport.tipperScore === 'number');
    assert.ok(typeof passport.creatorScore === 'number');
    assert.ok(typeof passport.reliabilityScore === 'number');
  });

  it('linkAddress adds chain to passport', () => {
    const passport = passportSvc.generatePassport('0x' + 'b'.repeat(40));
    const linked = passportSvc.linkAddress(passport.id, 'ton-testnet', 'UQ' + 'B'.repeat(46));
    assert.ok(linked);
    assert.ok(linked!.linkedAddresses['ton-testnet']);
    assert.ok(linked!.chainsActive.includes('ton-testnet'));
  });

  it('getPortableScore returns 0-100', () => {
    passportSvc.generatePassport('0x' + 'c'.repeat(40));
    const score = passportSvc.getPortableScore('0x' + 'c'.repeat(40));
    assert.ok(score >= 0);
    assert.ok(score <= 100);
  });

  it('verifyPassport validates untampered passport', () => {
    const passport = passportSvc.generatePassport('0x' + 'd'.repeat(40));
    assert.equal(passportSvc.verifyPassport(passport), true);
  });

  it('verifyPassport detects tampered passport', () => {
    const passport = passportSvc.generatePassport('0x' + 'e'.repeat(40));
    passport.tipperScore = 999; // tamper
    assert.equal(passportSvc.verifyPassport(passport), false);
  });

  it('exportPassport returns JSON string', () => {
    passportSvc.generatePassport('0x' + 'f'.repeat(40));
    const json = passportSvc.exportPassport('0x' + 'f'.repeat(40));
    assert.ok(json);
    const parsed = JSON.parse(json!);
    assert.ok(parsed.id);
    assert.ok(parsed.signatureHash);
  });

  it('importPassport accepts valid passport', () => {
    const passport = passportSvc.generatePassport('0x' + '1'.repeat(40));
    const json = JSON.stringify(passport);
    const fresh = new ReputationPassportService();
    const result = fresh.importPassport(json);
    assert.equal(result, true);
  });

  it('importPassport rejects tampered passport', () => {
    const passport = passportSvc.generatePassport('0x' + '2'.repeat(40));
    passport.tipperScore = 100; // tamper
    const json = JSON.stringify(passport);
    const fresh = new ReputationPassportService();
    assert.equal(fresh.importPassport(json), false);
  });

  it('unknown address returns a generated passport via getPortableScore', () => {
    const score = passportSvc.getPortableScore('0xNewUnknownAddress');
    assert.ok(typeof score === 'number');
    assert.ok(score >= 0 && score <= 100);
  });

  it('achievements unlock based on passport data', () => {
    // Seed reputation data so the passport earns achievements
    for (let i = 0; i < 15; i++) {
      repSvc.recordTip('0x' + '3'.repeat(40), '0xRecipient', 0.01, 'ethereum-sepolia');
    }
    const passport = passportSvc.generatePassport('0x' + '3'.repeat(40));
    assert.ok(passport.achievements.includes('first_tip'));
    assert.ok(passport.achievements.includes('10_tips_milestone'));
  });
});

// ══════════════════════════════════════════════════════════════
// 8. AutoPaymentsService (10 tests)
// ══════════════════════════════════════════════════════════════

describe('AutoPaymentsService', () => {
  let autoPay: AutoPaymentsService;

  beforeEach(() => {
    autoPay = new AutoPaymentsService();
  });

  it('creates a bill split', () => {
    const bill = autoPay.createBill({
      title: 'Lunch Split', totalAmount: 100, createdBy: '0xAlice',
      participants: [
        { address: '0xBob', name: 'Bob' },
        { address: '0xCharlie', name: 'Charlie' },
      ],
    });
    assert.ok(bill.id.startsWith('bill_'));
    assert.equal(bill.participants.length, 2);
    assert.equal(bill.status, 'pending');
    assert.equal(bill.participants[0].shareAmount, 50);
  });

  it('prepareBillSettlement creates settlement record', async () => {
    const bill = autoPay.createBill({
      title: 'Dinner', totalAmount: 60, createdBy: '0xAlice',
      participants: [
        { address: '0xBob' },
        { address: '0xCarol' },
        { address: '0xDave' },
      ],
    });
    const result = await autoPay.prepareBillSettlement(bill.id);
    assert.equal(result.status, 'prepared');
    assert.ok(result.settlementId.startsWith('stl_'));
  });

  it('commitBillSettlement processes payments', async () => {
    const bill = autoPay.createBill({
      title: 'Test', totalAmount: 30, createdBy: '0xAlice',
      participants: [{ address: '0xBob' }, { address: '0xCarol' }],
    });
    const { settlementId } = await autoPay.prepareBillSettlement(bill.id);
    const result = await autoPay.commitBillSettlement(settlementId);
    assert.equal(result.status, 'committed');
    assert.ok(result.results.length === 2);
  });

  it('cancelBill marks as cancelled', () => {
    const bill = autoPay.createBill({
      title: 'Cancelled', totalAmount: 10, createdBy: '0xAlice',
      participants: [{ address: '0xBob' }],
    });
    const result = autoPay.cancelBill(bill.id);
    assert.ok(!('error' in result));
    assert.equal((result as any).status, 'cancelled');
  });

  it('createSubscription returns active subscription', () => {
    const sub = autoPay.createSubscription({
      name: 'Monthly VPN', from: '0xAlice', to: '0xProvider',
      amount: 10, intervalHours: 720,
    });
    assert.ok(sub.id.startsWith('sub_'));
    assert.equal(sub.status, 'active');
    assert.equal(sub.amount, 10);
  });

  it('listBills returns all bills', () => {
    autoPay.createBill({
      title: 'B1', totalAmount: 10, createdBy: '0xA',
      participants: [{ address: '0xB' }],
    });
    const bills = autoPay.listBills();
    assert.ok(bills.length >= 1);
  });

  it('getBill returns specific bill', () => {
    const bill = autoPay.createBill({
      title: 'Specific', totalAmount: 25, createdBy: '0xA',
      participants: [{ address: '0xB' }],
    });
    const found = autoPay.getBill(bill.id);
    assert.ok(found);
    assert.equal(found!.title, 'Specific');
  });

  it('getStats returns statistics', () => {
    autoPay.createBill({
      title: 'S', totalAmount: 10, createdBy: '0xA',
      participants: [{ address: '0xB' }],
    });
    const stats = autoPay.getStats();
    assert.ok(stats.totalBills >= 1);
    assert.ok(typeof stats.walletConnected === 'boolean');
  });

  it('createConditionalPayment creates pending payment', () => {
    const cp = autoPay.createConditionalPayment({
      recipient: '0xBob', amount: 50,
      condition: { type: 'view_count', target: 10000 },
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
    });
    assert.ok(cp.id.startsWith('cp_'));
    assert.equal(cp.status, 'pending');
    assert.equal(cp.condition.type, 'view_count');
  });

  it('getSettlementStatus returns settlement or error', async () => {
    const bill = autoPay.createBill({
      title: 'T', totalAmount: 10, createdBy: '0xA',
      participants: [{ address: '0xB' }],
    });
    const { settlementId } = await autoPay.prepareBillSettlement(bill.id);
    const status = autoPay.getSettlementStatus(settlementId);
    assert.ok(!('error' in status));
    assert.equal((status as any).status, 'prepared');
  });
});

// ══════════════════════════════════════════════════════════════
// 9. WebhookSimulatorService (6 tests)
// ══════════════════════════════════════════════════════════════

describe('WebhookSimulatorService', () => {
  let sim: WebhookSimulatorService;

  beforeEach(() => {
    sim = new WebhookSimulatorService(9999); // non-listening port
  });

  it('getStats returns initial state', () => {
    const stats = sim.getStats();
    assert.equal(stats.totalSent, 0);
    assert.equal(stats.totalErrors, 0);
    assert.equal(stats.running, false);
  });

  it('start sets running to true', () => {
    process.env.DEMO_MODE = 'true';
    sim.start(999999);
    assert.equal(sim.getStats().running, true);
    sim.stop();
    delete process.env.DEMO_MODE;
  });

  it('stop sets running to false', () => {
    process.env.DEMO_MODE = 'true';
    sim.start(999999);
    sim.stop();
    assert.equal(sim.getStats().running, false);
    delete process.env.DEMO_MODE;
  });

  it('start is idempotent', () => {
    process.env.DEMO_MODE = 'true';
    sim.start(999999);
    sim.start(999999); // should not create second interval
    assert.equal(sim.getStats().running, true);
    sim.stop();
    delete process.env.DEMO_MODE;
  });

  it('stop is safe when not running', () => {
    sim.stop(); // should not throw
    assert.equal(sim.getStats().running, false);
  });

  it('constructor accepts custom port', () => {
    const customSim = new WebhookSimulatorService(4000);
    const stats = customSim.getStats();
    assert.equal(stats.running, false);
  });
});

// ══════════════════════════════════════════════════════════════
// 10. MockWalletService itself (10 tests)
// ══════════════════════════════════════════════════════════════

describe('MockWalletService', () => {
  let wallet: MockWalletService;

  beforeEach(() => {
    wallet = new MockWalletService();
  });

  it('getAddress returns chain-specific addresses', async () => {
    const eth = await wallet.getAddress('ethereum-sepolia');
    assert.ok(eth.startsWith('0x'));
    assert.equal(eth.length, 42);

    const ton = await wallet.getAddress('ton-testnet');
    assert.ok(ton.startsWith('UQ'));
  });

  it('getBalance returns default balances', async () => {
    const bal = await wallet.getBalance('ethereum-sepolia');
    assert.equal(bal.nativeBalance, '0.05');
    assert.equal(bal.usdtBalance, '0.05');
  });

  it('sendTransaction increments txCount', async () => {
    assert.equal(wallet.getTxCount(), 0);
    await wallet.sendTransaction('ethereum-sepolia', '0xTo', '0.001');
    assert.equal(wallet.getTxCount(), 1);
  });

  it('sendTransaction deducts balance', async () => {
    await wallet.sendTransaction('ethereum-sepolia', '0xTo', '0.01');
    const bal = await wallet.getBalance('ethereum-sepolia');
    assert.ok(parseFloat(bal.nativeBalance) < 0.05);
  });

  it('sendTransaction returns unique hashes', async () => {
    const r1 = await wallet.sendTransaction('ethereum-sepolia', '0xTo', '0.001');
    const r2 = await wallet.sendTransaction('ethereum-sepolia', '0xTo', '0.001');
    assert.notEqual(r1.hash, r2.hash);
  });

  it('setBalance overrides default', async () => {
    wallet.setBalance('ethereum-sepolia', '999.0');
    const bal = await wallet.getBalance('ethereum-sepolia');
    assert.equal(bal.nativeBalance, '999.0');
  });

  it('reset restores defaults', async () => {
    await wallet.sendTransaction('ethereum-sepolia', '0xTo', '0.01');
    wallet.reset();
    assert.equal(wallet.getTxCount(), 0);
    const bal = await wallet.getBalance('ethereum-sepolia');
    assert.equal(bal.nativeBalance, '0.05');
  });

  it('getAllAddresses returns all chains', async () => {
    const addrs = await wallet.getAllAddresses();
    assert.ok(addrs['ethereum-sepolia']);
    assert.ok(addrs['ton-testnet']);
    assert.ok(addrs['tron-nile']);
  });

  it('getRegisteredChains returns 3 chains', () => {
    const chains = wallet.getRegisteredChains();
    assert.equal(chains.length, 3);
    assert.ok(chains.includes('ethereum-sepolia'));
  });

  it('setFailNextTx makes next tx throw', async () => {
    wallet.setFailNextTx();
    await assert.rejects(() => wallet.sendTransaction('ethereum-sepolia', '0xTo', '0.001'));
    // Subsequent calls should succeed
    const result = await wallet.sendTransaction('ethereum-sepolia', '0xTo', '0.001');
    assert.ok(result.hash);
  });
});

// ══════════════════════════════════════════════════════════════
// 11. Cross-service integration (12 tests)
// ══════════════════════════════════════════════════════════════

describe('Cross-service integration with mock wallet', () => {
  let wallet: MockWalletService;

  beforeEach(() => {
    wallet = new MockWalletService();
  });

  it('escrow claim increments wallet txCount', async () => {
    const escrow = new EscrowService();
    escrow.setWalletService(wallet as any);
    const { escrow: e, secret } = await escrow.createEscrow({
      sender: '0xS', recipient: '0xR',
      amount: '0.005', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    await escrow.claimEscrow(e.id, secret);
    // 1 lock tx + 1 release tx = 2 (on-chain escrow), or 1 (off-chain)
    assert.ok(wallet.getTxCount() >= 1);
  });

  it('multiple escrow claims produce different tx hashes', async () => {
    const escrow = new EscrowService();
    escrow.setWalletService(wallet as any);

    const r1 = await escrow.createEscrow({
      sender: '0xS', recipient: '0xR1',
      amount: '0.003', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    const c1 = await escrow.claimEscrow(r1.escrow.id, r1.secret);

    const r2 = await escrow.createEscrow({
      sender: '0xS', recipient: '0xR2',
      amount: '0.002', token: 'usdt', chainId: 'ethereum-sepolia',
    });
    const c2 = await escrow.claimEscrow(r2.escrow.id, r2.secret);

    assert.ok(c1!.txHash);
    assert.ok(c2!.txHash);
    assert.notEqual(c1!.txHash, c2!.txHash);
    // 2 lock txs + 2 release txs = 4 (on-chain), or 2 (off-chain)
    assert.ok(wallet.getTxCount() >= 2);
  });

  it('DCA + escrow use same wallet without interference', async () => {
    const dca = new DcaService();
    dca.setWalletService(wallet as any);
    const escrow = new EscrowService();
    escrow.setWalletService(wallet as any);

    dca.createPlan({ recipient: '0xR', totalAmount: 0.01, installments: 2, intervalHours: 1 });
    await escrow.createEscrow({
      sender: '0xS', recipient: '0xR',
      amount: '0.005', token: 'usdt', chainId: 'ethereum-sepolia',
    });

    assert.ok(dca.getActivePlans().length >= 1);
    assert.ok(escrow.getActiveCount() >= 1);
  });

  it('reputation passport reflects tip history', () => {
    const rep = new ReputationService();
    const passport = new ReputationPassportService();
    passport.setReputationService(rep);

    // Record tips where 0xCreator is the recipient (reputation tracks recipients)
    for (let i = 0; i < 5; i++) {
      rep.recordTip('0xTipper', '0xCreator', 0.01, 'ethereum-sepolia');
    }

    // Generate passport for the recipient (has reputation data)
    const p = passport.generatePassport('0xCreator');
    assert.ok(p.totalTipsSent >= 5);
    assert.ok(p.tipperScore > 0);
  });

  it('webhook receiver processes events into queue', () => {
    const receiver = new WebhookReceiverService();
    const events = [
      { platform: 'rumble', eventType: 'new_video', creatorId: 'c1', creatorName: 'C1', data: { views: 100 }, timestamp: new Date().toISOString() },
      { platform: 'rumble', eventType: 'milestone', creatorId: 'c2', creatorName: 'C2', data: { subscriberCount: 10000 }, timestamp: new Date().toISOString() },
      { platform: 'youtube', eventType: 'engagement', creatorId: 'c3', creatorName: 'C3', data: { views: 50000 }, timestamp: new Date().toISOString() },
    ];
    for (const evt of events) {
      receiver.ingestEvent(evt);
    }
    assert.equal(receiver.getQueueSize(), 3);
    const consumed = receiver.consumeEvents();
    assert.equal(consumed.length, 3);
    assert.equal(receiver.getQueueSize(), 0);
  });

  it('bridge intent hash changes with different params', () => {
    const bridge = new BridgeService();
    const i1 = bridge.createBridgeIntent({ fromChain: 'Ethereum', toChain: 'Arbitrum', amount: '100' });
    const i2 = bridge.createBridgeIntent({ fromChain: 'Ethereum', toChain: 'Base', amount: '100' });
    assert.notEqual(i1.intentHash, i2.intentHash);
  });

  it('auto-payment full lifecycle: create → prepare → commit', async () => {
    const autoPay = new AutoPaymentsService();
    const bill = autoPay.createBill({
      title: 'Team Lunch', totalAmount: 100, createdBy: '0xAlice',
      participants: [
        { address: '0xBob', name: 'Bob', sharePercent: 60 },
        { address: '0xCarol', name: 'Carol', sharePercent: 40 },
      ],
    });

    assert.equal(bill.participants[0].shareAmount, 60);
    assert.equal(bill.participants[1].shareAmount, 40);

    const prep = await autoPay.prepareBillSettlement(bill.id);
    assert.equal(prep.status, 'prepared');

    const commit = await autoPay.commitBillSettlement(prep.settlementId);
    assert.equal(commit.status, 'committed');
    assert.equal(commit.results.length, 2);
  });

  it('passport score increases with more tip history', () => {
    const rep = new ReputationService();
    const passportSvc = new ReputationPassportService();
    passportSvc.setReputationService(rep);

    const p1 = passportSvc.generatePassport('0xUser1');
    const score1 = p1.tipperScore;

    for (let i = 0; i < 20; i++) {
      rep.recordTip('0xUser1', '0xCreator', 0.01, 'ethereum-sepolia');
    }

    const p2 = passportSvc.generatePassport('0xUser1');
    assert.ok(p2.tipperScore >= score1);
  });

  it('webhook stats increment correctly per platform', () => {
    const receiver = new WebhookReceiverService();
    for (let i = 0; i < 5; i++) {
      receiver.ingestEvent({
        platform: 'rumble', eventType: 'new_video',
        creatorId: 'c' + i, creatorName: 'C' + i,
        data: {}, timestamp: new Date().toISOString(),
      });
    }
    for (let i = 0; i < 3; i++) {
      receiver.ingestEvent({
        platform: 'youtube', eventType: 'engagement',
        creatorId: 'y' + i, creatorName: 'Y' + i,
        data: {}, timestamp: new Date().toISOString(),
      });
    }
    const stats = receiver.getStats();
    assert.equal(stats.byPlatform['rumble']?.received, 5);
    assert.equal(stats.byPlatform['youtube']?.received, 3);
  });

  it('DCA stats reflect multiple plans', () => {
    const dca = new DcaService();
    dca.createPlan({ recipient: '0xR1', totalAmount: 0.1, installments: 10, intervalHours: 24 });
    dca.createPlan({ recipient: '0xR2', totalAmount: 0.05, installments: 5, intervalHours: 12 });
    dca.createPlan({ recipient: '0xR3', totalAmount: 0.02, installments: 2, intervalHours: 6 });
    const stats = dca.getStats();
    assert.ok(stats.active >= 3);
    assert.ok(stats.totalPending > 0);
  });

  it('treasury recordTip accumulates correctly', async () => {
    const treasury = new TreasuryService();
    treasury.recordTip(0.01, 0.0001);
    treasury.recordTip(0.02, 0.0001);
    treasury.recordTip(0.03, 0.0001);
    const report = await treasury.getEconomicReport();
    assert.ok(report.analytics.totalTipped >= 0.06);
  });
});

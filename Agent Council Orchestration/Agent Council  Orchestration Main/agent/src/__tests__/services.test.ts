/**
 * Service-level tests — TipPolicy, x402, Queue, Platform Adapters.
 * Tests critical business logic WITHOUT WDK initialization.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TipPolicyService } from '../services/tip-policy.service.js';
import { X402Service } from '../services/x402.service.js';
import { AgentIdentityService } from '../services/agent-identity.service.js';
import { TipQueueService } from '../services/tip-queue.service.js';
import { PlatformAdapterService } from '../services/platform-adapter.service.js';

const __testDir = dirname(fileURLToPath(import.meta.url));
const TIP_QUEUE_FILE = resolve(__testDir, '..', '..', '.tip-queue.json');

// Clean persisted tip queue before tests to avoid data collisions
before(() => {
  if (existsSync(TIP_QUEUE_FILE)) unlinkSync(TIP_QUEUE_FILE);
});

// ── TipPolicy Engine ────────────────────────────────────────────

describe('TipPolicyService', () => {
  it('creates and retrieves a policy', () => {
    const svc = new TipPolicyService();
    const p = svc.createPolicy({
      name: 'Test', description: 'test', createdBy: 'u1',
      trigger: { type: 'watch_time', threshold: 80 },
      conditions: [], action: { type: 'tip', amount: { mode: 'fixed', base: 0.01 }, chain: 'cheapest', token: 'usdt' },
    });
    assert.ok(p.id);
    assert.equal(p.enabled, true);
    assert.equal(svc.getPolicy(p.id)?.name, 'Test');
  });

  it('trigger met → conditionsMet true', () => {
    const svc = new TipPolicyService();
    svc.createPolicy({
      name: 'T', description: 't', createdBy: 'u',
      trigger: { type: 'watch_time', threshold: 80 },
      conditions: [], action: { type: 'tip', amount: { mode: 'fixed', base: 0.01 }, chain: 'cheapest', token: 'usdt' },
    });
    const r = svc.evaluatePolicies({ watchPercent: 90 });
    assert.equal(r[0].triggered, true);
    assert.equal(r[0].conditionsMet, true);
  });

  it('trigger NOT met → triggered false', () => {
    const svc = new TipPolicyService();
    svc.createPolicy({
      name: 'T', description: 't', createdBy: 'u',
      trigger: { type: 'watch_time', threshold: 95 },
      conditions: [], action: { type: 'tip', amount: { mode: 'fixed', base: 0.01 }, chain: 'cheapest', token: 'usdt' },
    });
    const r = svc.evaluatePolicies({ watchPercent: 70 });
    assert.equal(r[0].triggered, false);
  });

  it('conditions block when gas too high', () => {
    const svc = new TipPolicyService();
    const p = svc.createPolicy({
      name: 'GasTest_' + Date.now(), description: 't', createdBy: 'u',
      trigger: { type: 'watch_time', threshold: 50 },
      conditions: [{ field: 'gas_fee_usd', operator: '<', value: 0.05 }],
      action: { type: 'tip', amount: { mode: 'fixed', base: 0.01 }, chain: 'cheapest', token: 'usdt' },
    });
    const highGas = svc.evaluatePolicies({ watchPercent: 80, gasFeeUsd: 0.10 });
    assert.equal(highGas.find(r => r.policyId === p.id)?.conditionsMet, false);
    const lowGas = svc.evaluatePolicies({ watchPercent: 80, gasFeeUsd: 0.02 });
    assert.equal(lowGas.find(r => r.policyId === p.id)?.conditionsMet, true);
    svc.deletePolicy(p.id);
  });

  it('engagement_weighted adjusts amount', () => {
    const svc = new TipPolicyService();
    const p = svc.createPolicy({
      name: 'Eng_' + Date.now(), description: 't', createdBy: 'u',
      trigger: { type: 'watch_time', threshold: 50 },
      conditions: [], action: { type: 'tip', amount: { mode: 'engagement_weighted', base: 0.01 }, chain: 'cheapest', token: 'usdt' },
    });
    const high = svc.evaluatePolicies({ watchPercent: 90, engagementScore: 0.9 });
    const low = svc.evaluatePolicies({ watchPercent: 60, engagementScore: 0.1 });
    assert.ok((high.find(r => r.policyId === p.id)?.suggestedAction?.amount.base ?? 0) > 0.01);
    assert.ok((low.find(r => r.policyId === p.id)?.suggestedAction?.amount.base ?? 0) < 0.01);
    svc.deletePolicy(p.id);
  });

  it('cooldown blocks after execution', () => {
    const svc = new TipPolicyService();
    const p = svc.createPolicy({
      name: 'CD_' + Date.now(), description: 't', createdBy: 'u',
      trigger: { type: 'watch_time', threshold: 50 },
      conditions: [], action: { type: 'tip', amount: { mode: 'fixed', base: 0.01 }, chain: 'cheapest', token: 'usdt' },
      cooldown: { minIntervalMinutes: 60, maxPerDay: 5, maxPerWeek: 20 },
    });
    const first = svc.evaluatePolicies({ watchPercent: 80 });
    assert.equal(first.find(r => r.policyId === p.id)?.cooldownOk, true);
    svc.recordExecution(p.id, 0.01);
    const second = svc.evaluatePolicies({ watchPercent: 80 });
    assert.equal(second.find(r => r.policyId === p.id)?.cooldownOk, false);
    svc.deletePolicy(p.id);
  });

  it('delete removes policy', () => {
    const svc = new TipPolicyService();
    const p = svc.createPolicy({
      name: 'D', description: 'd', createdBy: 'u',
      trigger: { type: 'watch_time', threshold: 50 },
      conditions: [], action: { type: 'tip', amount: { mode: 'fixed', base: 0.01 }, chain: 'cheapest', token: 'usdt' },
    });
    assert.equal(svc.deletePolicy(p.id), true);
    assert.equal(svc.getPolicy(p.id), undefined);
  });
});

// ── x402 Payment Protocol ───────────────────────────────────────

describe('X402Service', () => {
  it('has default monetized endpoints', () => {
    const svc = new X402Service();
    assert.ok(svc.getEndpoints().length >= 4);
  });

  it('creates and verifies payment', () => {
    const svc = new X402Service();
    svc.setWalletAddress('0xTest');
    const ep = svc.getEndpoints()[0];
    const req = svc.createPaymentRequirement(ep, '/test');
    const result = svc.verifyPayment({
      requirementId: req.id, txHash: '0xabc', chainId: 'ethereum-sepolia',
      amount: req.amount, payer: '0xP', paidAt: new Date().toISOString(),
    });
    assert.equal(result.verified, true);
  });

  it('rejects unknown requirement', () => {
    const svc = new X402Service();
    const result = svc.verifyPayment({
      requirementId: 'fake', txHash: '0x', chainId: 'x',
      amount: '0', payer: '0x', paidAt: new Date().toISOString(),
    });
    assert.equal(result.verified, false);
  });

  it('generates x402 headers', () => {
    const svc = new X402Service();
    svc.setWalletAddress('0xTest');
    const ep = svc.getEndpoints()[0];
    const req = svc.createPaymentRequirement(ep, '/test');
    const h = svc.getPaymentHeaders(req);
    assert.equal(h['X-Payment-Required'], 'true');
    assert.equal(h['X-Payment-Protocol'], 'x402/1.0');
    assert.equal(h['X-Payment-Agent'], 'AeroFyta/1.0');
  });

  it('tracks revenue stats', () => {
    const svc = new X402Service();
    svc.setWalletAddress('0xT');
    const ep = svc.getEndpoints()[0];
    const req = svc.createPaymentRequirement(ep, '/t');
    svc.verifyPayment({ requirementId: req.id, txHash: '0x1', chainId: 'x', amount: '0.001', payer: '0x', paidAt: new Date().toISOString() });
    assert.equal(svc.getStats().totalPaymentsReceived, 1);
    assert.ok(svc.getStats().totalRevenueUsdt > 0);
  });
});

// ── Tip Queue ───────────────────────────────────────────────────

describe('TipQueueService', () => {
  before(() => {
    if (existsSync(TIP_QUEUE_FILE)) unlinkSync(TIP_QUEUE_FILE);
  });

  it('priority ordering: urgent before normal before low', () => {
    if (existsSync(TIP_QUEUE_FILE)) unlinkSync(TIP_QUEUE_FILE);
    const svc = new TipQueueService();
    svc.enqueue({ recipient: '0xA', amount: '1', priority: 'low' });
    svc.enqueue({ recipient: '0xB', amount: '2', priority: 'urgent' });
    svc.enqueue({ recipient: '0xC', amount: '3', priority: 'normal' });
    const q = svc.getQueue();
    assert.equal(q[0].priority, 'urgent');
    assert.equal(q[1].priority, 'normal');
    assert.equal(q[2].priority, 'low');
  });

  it('stats reflect queue state', () => {
    if (existsSync(TIP_QUEUE_FILE)) unlinkSync(TIP_QUEUE_FILE);
    const svc = new TipQueueService();
    svc.enqueue({ recipient: '0xA', amount: '0.01' });
    svc.enqueue({ recipient: '0xB', amount: '0.02' });
    assert.equal(svc.getStats().queued, 2);
  });

  it('batch enqueue sets batch priority', () => {
    const svc = new TipQueueService();
    const tips = svc.enqueueBatch([
      { recipient: '0xA', amount: '0.01' },
      { recipient: '0xB', amount: '0.02' },
    ]);
    assert.equal(tips.length, 2);
    assert.equal(tips[0].priority, 'batch');
  });
});

// ── Platform Adapters ───────────────────────────────────────────

describe('PlatformAdapterService', () => {
  it('has Rumble + Webhook adapters', () => {
    const svc = new PlatformAdapterService();
    const adapters = svc.listAdapters();
    assert.equal(adapters.length, 2);
    assert.ok(adapters.some(a => a.platform === 'rumble'));
    assert.ok(adapters.some(a => a.platform === 'webhook'));
  });

  it('processes webhook events', () => {
    const svc = new PlatformAdapterService();
    const event = svc.processRawEvent('webhook', {
      userId: 'u1', creatorId: 'c1', type: 'watch', watchPercent: 85,
    });
    assert.ok(event);
    assert.equal(event?.platform, 'webhook');
    assert.equal(event?.watchPercent, 85);
  });

  it('records and retrieves tip events', () => {
    const svc = new PlatformAdapterService();
    svc.recordTipEvent({
      platform: 'rumble', creatorId: 'c1', creatorAddress: '0xA',
      amount: '0.01', token: 'usdt', trigger: 'watch_time', reasoning: 'test',
    });
    assert.equal(svc.getTipEvents('rumble').length, 1);
    assert.equal(svc.getTipEvents('youtube').length, 0);
  });
});

// ── Agent Identity ──────────────────────────────────────────────

describe('AgentIdentityService', () => {
  it('generates 64-char hex challenges', () => {
    const svc = new AgentIdentityService();
    const c = svc.generateChallenge();
    assert.equal(c.challenge.length, 64);
    assert.ok(c.expiresAt);
  });

  it('rejects unknown challenges', async () => {
    const svc = new AgentIdentityService();
    const r = await svc.verifyAgent({ challenge: 'fake', signature: '0x', chainId: 'x' });
    assert.equal(r.verified, false);
  });
});

/**
 * Deep SafetyService tests — velocity detection, recovery queue, security report,
 * progressive limits, tiered approval, blocked addresses.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SafetyService } from '../services/safety.service.js';

const __testDir = dirname(fileURLToPath(import.meta.url));
const SPEND_LOG = join(__testDir, '..', '..', '.safety-spend-log.json');

before(() => {
  if (existsSync(SPEND_LOG)) unlinkSync(SPEND_LOG);
});

describe('SafetyService — Kill Switch', () => {
  it('blocks tips when kill switch is active', () => {
    const svc = new SafetyService();
    svc.activateKillSwitch();
    const result = svc.validateTip({ recipient: '0xabc', amount: 1 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'KILL_SWITCH');
    assert.equal(svc.isKillSwitchActive(), true);
  });

  it('allows tips after kill switch deactivated', () => {
    const svc = new SafetyService();
    svc.activateKillSwitch();
    svc.deactivateKillSwitch();
    const result = svc.validateTip({ recipient: '0xabc', amount: 1 });
    assert.equal(result.allowed, true);
    assert.equal(svc.isKillSwitchActive(), false);
  });
});

describe('SafetyService — Blocked Addresses', () => {
  it('blocks burn address by default', () => {
    const svc = new SafetyService();
    const result = svc.validateTip({ recipient: '0x0000000000000000000000000000000000000000', amount: 1 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'BLOCKED_ADDRESS');
  });

  it('blockAddress and unblockAddress work', () => {
    const svc = new SafetyService();
    svc.blockAddress('0xBadActor');
    let result = svc.validateTip({ recipient: '0xbadactor', amount: 1 });
    assert.equal(result.allowed, false);

    svc.unblockAddress('0xBadActor');
    result = svc.validateTip({ recipient: '0xbadactor', amount: 1 });
    assert.equal(result.allowed, true);
  });
});

describe('SafetyService — Minimum / Maximum Tip', () => {
  it('blocks tip below minimum', () => {
    const svc = new SafetyService();
    const result = svc.validateTip({ recipient: '0xaaa', amount: 0.0001 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'MIN_TIP_AMOUNT');
  });

  it('blocks tip above maximum single tip', () => {
    const svc = new SafetyService();
    const result = svc.validateTip({ recipient: '0xbbb', amount: 999 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'MAX_SINGLE_TIP');
  });
});

describe('SafetyService — Spend Recording & Budget', () => {
  it('recordSpend and getDailySpend track correctly', () => {
    const svc = new SafetyService();
    svc.recordSpend('0xaaa', 10);
    svc.recordSpend('0xbbb', 5);
    const usage = svc.getUsage();
    assert.ok(usage.dailySpend >= 15);
    assert.ok(usage.tipsToday >= 2);
  });

  it('isBudgetExhausted returns true when budget exceeded', () => {
    const svc = new SafetyService();
    // Record spend up to the limit
    for (let i = 0; i < 20; i++) {
      svc.recordSpend('0xfill', 10); // 200 total = default limit
    }
    assert.equal(svc.isBudgetExhausted(), true);
  });
});

describe('SafetyService — Tiered Approval', () => {
  it('auto tier for small amounts', () => {
    const svc = new SafetyService();
    assert.equal(svc.getApprovalTier(1), 'auto');
  });

  it('flagged tier for medium amounts', () => {
    const svc = new SafetyService();
    assert.equal(svc.getApprovalTier(10), 'flagged');
  });

  it('manual_required tier for large amounts', () => {
    const svc = new SafetyService();
    assert.equal(svc.getApprovalTier(100), 'manual_required');
  });

  it('queueForApproval, approve, and reject work', () => {
    const svc = new SafetyService();
    const entry = svc.queueForApproval({
      recipient: '0xapprove', amount: 100, chain: 'eth', token: 'usdt', reason: 'large',
    });
    assert.equal(entry.status, 'pending');

    const approved = svc.approveApproval(entry.id);
    assert.ok(approved);
    assert.equal(approved!.status, 'approved');

    // Queue another and reject
    const entry2 = svc.queueForApproval({
      recipient: '0xreject', amount: 100, chain: 'eth', token: 'usdt', reason: 'large',
    });
    const rejected = svc.rejectApproval(entry2.id);
    assert.ok(rejected);
    assert.equal(rejected!.status, 'rejected');
  });

  it('getPendingApprovals returns only pending', () => {
    const svc = new SafetyService();
    svc.queueForApproval({ recipient: '0xa', amount: 50, chain: 'eth', token: 'usdt', reason: 'r' });
    const e2 = svc.queueForApproval({ recipient: '0xb', amount: 50, chain: 'eth', token: 'usdt', reason: 'r' });
    svc.approveApproval(e2.id);
    const pending = svc.getPendingApprovals();
    assert.ok(pending.every(a => a.status === 'pending'));
  });
});

describe('SafetyService — Recovery Queue', () => {
  it('addToRecoveryQueue creates entry with correct status', () => {
    const svc = new SafetyService();
    const entry = svc.addToRecoveryQueue({
      recipient: '0xfail', amount: 5, chain: 'eth', token: 'usdt',
      failureType: 'pre_send', error: 'gas too low',
    });
    assert.equal(entry.status, 'queued_retry');
    assert.equal(entry.retryCount, 0);
  });

  it('post_send failure gets pending_verification status', () => {
    const svc = new SafetyService();
    const entry = svc.addToRecoveryQueue({
      txHash: '0xhash', recipient: '0xfail', amount: 5, chain: 'eth', token: 'usdt',
      failureType: 'post_send', error: 'timeout',
    });
    assert.equal(entry.status, 'pending_verification');
  });

  it('resolveRecovery marks resolved', () => {
    const svc = new SafetyService();
    const entry = svc.addToRecoveryQueue({
      recipient: '0xr', amount: 1, chain: 'eth', token: 'usdt',
      failureType: 'pre_send', error: 'err',
    });
    const resolved = svc.resolveRecovery(entry.id);
    assert.ok(resolved);
    assert.equal(resolved!.status, 'resolved');
  });

  it('abandonRecovery marks abandoned', () => {
    const svc = new SafetyService();
    const entry = svc.addToRecoveryQueue({
      recipient: '0xa', amount: 1, chain: 'eth', token: 'usdt',
      failureType: 'timeout', error: 'timeout',
    });
    const abandoned = svc.abandonRecovery(entry.id);
    assert.ok(abandoned);
    assert.equal(abandoned!.status, 'abandoned');
  });

  it('markRetried increments retryCount', () => {
    const svc = new SafetyService();
    const entry = svc.addToRecoveryQueue({
      recipient: '0xm', amount: 1, chain: 'eth', token: 'usdt',
      failureType: 'pre_send', error: 'err',
    });
    const retried = svc.markRetried(entry.id);
    assert.ok(retried);
    assert.equal(retried!.retryCount, 1);
    assert.ok(retried!.lastRetryAt);
  });

  it('getRecoveryQueue returns only active entries', () => {
    const svc = new SafetyService();
    svc.addToRecoveryQueue({ recipient: '0x1', amount: 1, chain: 'eth', token: 'usdt', failureType: 'pre_send', error: 'e' });
    const e2 = svc.addToRecoveryQueue({ recipient: '0x2', amount: 1, chain: 'eth', token: 'usdt', failureType: 'pre_send', error: 'e' });
    svc.resolveRecovery(e2.id);
    const queue = svc.getRecoveryQueue();
    assert.ok(queue.every(e => e.status === 'queued_retry' || e.status === 'pending_verification'));
  });
});

describe('SafetyService — Security Report', () => {
  it('getSecurityReport returns full report structure', () => {
    const svc = new SafetyService();
    const report = svc.getSecurityReport();
    assert.ok(report.generatedAt);
    assert.equal(report.killSwitch, false);
    assert.ok(Array.isArray(report.velocityAlerts));
    assert.ok(typeof report.progressiveLimitActive === 'boolean');
    assert.ok(typeof report.effectiveDailyLimit === 'number');
    assert.ok(typeof report.baseDailyLimit === 'number');
    assert.ok(typeof report.budgetUsedPercent === 'number');
    assert.ok(Array.isArray(report.topRecipients));
    assert.ok(['healthy', 'elevated', 'critical'].includes(report.riskSummary));
  });
});

describe('SafetyService — Status', () => {
  it('getStatus returns correct structure', () => {
    const svc = new SafetyService();
    const status = svc.getStatus();
    assert.equal(status.killSwitch, false);
    assert.ok(typeof status.budgetRemaining === 'number');
    assert.ok(typeof status.budgetUsed === 'number');
    assert.ok(typeof status.hourlyUsed === 'number');
    assert.ok(typeof status.tipsToday === 'number');
  });
});

describe('SafetyService — Policies', () => {
  it('getPolicies returns policy object', () => {
    const svc = new SafetyService();
    const policies = svc.getPolicies();
    assert.ok(typeof policies.maxSingleTip === 'number');
    assert.ok(typeof policies.maxDailySpend === 'number');
    assert.ok(typeof policies.maxHourlySpend === 'number');
    assert.ok(typeof policies.minTipAmount === 'number');
    assert.ok(typeof policies.tier1Limit === 'number');
    assert.ok(typeof policies.tier2Limit === 'number');
    assert.ok(Array.isArray(policies.blockedAddresses));
  });
});

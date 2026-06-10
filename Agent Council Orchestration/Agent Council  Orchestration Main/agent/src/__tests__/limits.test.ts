/**
 * LimitsService — spending limits and audit log.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { LimitsService } from '../services/limits.service.js';

describe('LimitsService', () => {
  let service: LimitsService;

  before(() => {
    service = new LimitsService();
    // Ensure clean defaults
    service.setLimits({ dailyLimit: 1, weeklyLimit: 5, perTipLimit: 0.5 });
  });

  it('getLimits returns default limits', () => {
    const limits = service.getLimits();
    assert.equal(limits.dailyLimit, 1);
    assert.equal(limits.weeklyLimit, 5);
    assert.equal(limits.perTipLimit, 0.5);
    assert.equal(limits.currency, 'ETH');
  });

  it('setLimits updates limits', () => {
    const updated = service.setLimits({ perTipLimit: 0.1 });
    assert.equal(updated.perTipLimit, 0.1);
    service.setLimits({ perTipLimit: 0.5 }); // reset
  });

  it('checkLimit allows small amounts', () => {
    const result = service.checkLimit(0.01);
    assert.equal(result.allowed, true);
    assert.ok(result.remaining > 0);
  });

  it('checkLimit rejects amounts exceeding per-tip limit', () => {
    const result = service.checkLimit(999);
    assert.equal(result.allowed, false);
    assert.ok(result.reason?.includes('per-tip limit'));
  });

  it('recordSpend and getSpending track totals', () => {
    service.recordSpend(0.05);
    const spending = service.getSpending();
    assert.ok(spending.dailySpent >= 0.05);
    assert.ok(spending.weeklySpent >= 0.05);
    assert.equal(typeof spending.dailyPercentage, 'number');
    assert.equal(typeof spending.weeklyPercentage, 'number');
  });

  it('addAuditEntry and getAuditLog track events', () => {
    service.addAuditEntry('tip_sent', 'Sent 0.01 ETH', 'success');
    const log = service.getAuditLog();
    assert.ok(log.length > 0);
    assert.ok(log[0].eventType);
    assert.ok(log[0].timestamp);
  });
});

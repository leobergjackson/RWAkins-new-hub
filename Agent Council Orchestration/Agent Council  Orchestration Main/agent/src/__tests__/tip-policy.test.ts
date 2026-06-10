/**
 * TipPolicyService — Programmable Money Engine tests.
 * Tests CRUD operations, condition evaluation, trigger matching, and cooldown.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { TipPolicyService } from '../services/tip-policy.service.js';
import type { PolicyAction } from '../services/tip-policy.service.js';

const makeAction = (overrides?: Partial<PolicyAction>): PolicyAction => ({
  type: 'tip',
  amount: { mode: 'fixed', base: 0.01 },
  chain: 'cheapest',
  token: 'usdt',
  ...overrides,
});

describe('TipPolicyService', () => {
  let service: TipPolicyService;

  before(() => {
    service = new TipPolicyService();
  });

  // ── CRUD ──

  describe('createPolicy()', () => {
    it('creates a policy with correct fields', () => {
      const policy = service.createPolicy({
        name: 'Test Policy',
        description: 'A test policy',
        createdBy: 'user1',
        trigger: { type: 'watch_time', threshold: 80 },
        conditions: [],
        action: makeAction(),
      });
      assert.ok(policy.id);
      assert.equal(policy.name, 'Test Policy');
      assert.equal(policy.enabled, true);
      assert.equal(policy.trigger.type, 'watch_time');
      assert.equal(policy.stats.timesTriggered, 0);
    });

    it('sets default cooldown values', () => {
      const policy = service.createPolicy({
        name: 'Default Cooldown',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [],
        action: makeAction(),
      });
      assert.equal(policy.cooldown.minIntervalMinutes, 60);
      assert.equal(policy.cooldown.maxPerDay, 10);
      assert.equal(policy.cooldown.maxPerWeek, 50);
    });

    it('accepts custom cooldown values', () => {
      const policy = service.createPolicy({
        name: 'Custom Cooldown',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [],
        action: makeAction(),
        cooldown: { minIntervalMinutes: 30, maxPerDay: 5 },
      });
      assert.equal(policy.cooldown.minIntervalMinutes, 30);
      assert.equal(policy.cooldown.maxPerDay, 5);
    });
  });

  describe('getPolicy()', () => {
    it('retrieves an existing policy', () => {
      const created = service.createPolicy({
        name: 'Get Test',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'new_video' },
        conditions: [],
        action: makeAction(),
      });
      const found = service.getPolicy(created.id);
      assert.ok(found);
      assert.equal(found!.name, 'Get Test');
    });

    it('returns undefined for non-existent ID', () => {
      assert.equal(service.getPolicy('nonexistent'), undefined);
    });
  });

  describe('deletePolicy()', () => {
    it('deletes an existing policy', () => {
      const policy = service.createPolicy({
        name: 'To Delete',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [],
        action: makeAction(),
      });
      const result = service.deletePolicy(policy.id);
      assert.equal(result, true);
      assert.equal(service.getPolicy(policy.id), undefined);
    });

    it('returns false for non-existent policy', () => {
      assert.equal(service.deletePolicy('nonexistent'), false);
    });
  });

  describe('togglePolicy()', () => {
    it('disables and enables a policy', () => {
      const policy = service.createPolicy({
        name: 'Toggle Test',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [],
        action: makeAction(),
      });
      const disabled = service.togglePolicy(policy.id, false);
      assert.ok(disabled);
      assert.equal(disabled!.enabled, false);
      const enabled = service.togglePolicy(policy.id, true);
      assert.ok(enabled);
      assert.equal(enabled!.enabled, true);
    });
  });

  // ── Condition evaluation ──

  describe('Condition evaluation', () => {
    it('evaluates > condition correctly', () => {
      const policy = service.createPolicy({
        name: 'GT Test',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [{ field: 'balance', operator: '>', value: 100 }],
        action: makeAction(),
      });
      const results = service.evaluatePolicies({ walletBalance: 200, event: undefined });
      const eval_ = results.find(r => r.policyId === policy.id);
      assert.ok(eval_);
      assert.equal(eval_!.conditionsMet, true);
    });

    it('evaluates < condition correctly', () => {
      const policy = service.createPolicy({
        name: 'LT Test',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [{ field: 'gas_fee_usd', operator: '<', value: 0.05 }],
        action: makeAction(),
      });
      const results = service.evaluatePolicies({ gasFeeUsd: 0.01 });
      const eval_ = results.find(r => r.policyId === policy.id);
      assert.ok(eval_);
      assert.equal(eval_!.conditionsMet, true);
    });

    it('evaluates == condition correctly', () => {
      const policy = service.createPolicy({
        name: 'EQ Test',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [{ field: 'day_of_week', operator: '==', value: 1 }],
        action: makeAction(),
      });
      const results = service.evaluatePolicies({ dayOfWeek: 1 });
      const eval_ = results.find(r => r.policyId === policy.id);
      assert.ok(eval_);
      assert.equal(eval_!.conditionsMet, true);
    });

    it('evaluates >= condition correctly', () => {
      const policy = service.createPolicy({
        name: 'GTE Test',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [{ field: 'engagement_score', operator: '>=', value: 50 }],
        action: makeAction(),
      });
      const results = service.evaluatePolicies({ engagementScore: 50 });
      const eval_ = results.find(r => r.policyId === policy.id);
      assert.ok(eval_);
      assert.equal(eval_!.conditionsMet, true);
    });

    it('evaluates <= condition correctly', () => {
      const policy = service.createPolicy({
        name: 'LTE Test',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [{ field: 'hour_of_day', operator: '<=', value: 12 }],
        action: makeAction(),
      });
      const results = service.evaluatePolicies({ hourOfDay: 10 });
      const eval_ = results.find(r => r.policyId === policy.id);
      assert.ok(eval_);
      assert.equal(eval_!.conditionsMet, true);
    });

    it('fails condition when field is missing from context', () => {
      const policy = service.createPolicy({
        name: 'Missing Field',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [{ field: 'nonexistent_field', operator: '>', value: 0 }],
        action: makeAction(),
      });
      const results = service.evaluatePolicies({});
      const eval_ = results.find(r => r.policyId === policy.id);
      assert.ok(eval_);
      assert.equal(eval_!.conditionsMet, false);
    });
  });

  // ── Trigger evaluation ──

  describe('Trigger evaluation', () => {
    it('watch_time trigger fires when watchPercent >= threshold', () => {
      const policy = service.createPolicy({
        name: 'Watch Time Test',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'watch_time', threshold: 80 },
        conditions: [],
        action: makeAction(),
      });
      const results = service.evaluatePolicies({ watchPercent: 90 });
      const eval_ = results.find(r => r.policyId === policy.id);
      assert.ok(eval_);
      assert.equal(eval_!.triggered, true);
    });

    it('watch_time trigger does not fire below threshold', () => {
      const policy = service.createPolicy({
        name: 'Watch Time Below',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'watch_time', threshold: 80 },
        conditions: [],
        action: makeAction(),
      });
      const results = service.evaluatePolicies({ watchPercent: 50 });
      const eval_ = results.find(r => r.policyId === policy.id);
      assert.ok(eval_);
      assert.equal(eval_!.triggered, false);
    });

    it('schedule trigger always fires', () => {
      const policy = service.createPolicy({
        name: 'Schedule Test',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [],
        action: makeAction(),
      });
      const results = service.evaluatePolicies({});
      const eval_ = results.find(r => r.policyId === policy.id);
      assert.ok(eval_);
      assert.equal(eval_!.triggered, true);
    });

    it('milestone trigger fires on matching event', () => {
      const policy = service.createPolicy({
        name: 'Milestone Test',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'milestone' },
        conditions: [],
        action: makeAction(),
      });
      const results = service.evaluatePolicies({ event: 'milestone' });
      const eval_ = results.find(r => r.policyId === policy.id);
      assert.ok(eval_);
      assert.equal(eval_!.triggered, true);
    });
  });

  // ── recordExecution ──

  describe('recordExecution()', () => {
    it('updates policy stats', () => {
      const policy = service.createPolicy({
        name: 'Exec Stats',
        description: 'test',
        createdBy: 'user1',
        trigger: { type: 'schedule' },
        conditions: [],
        action: makeAction(),
      });
      service.recordExecution(policy.id, 0.01);
      const updated = service.getPolicy(policy.id);
      assert.ok(updated);
      assert.equal(updated!.stats.timesTriggered, 1);
      assert.equal(updated!.stats.totalAmountSent, 0.01);
      assert.ok(updated!.stats.lastTriggeredAt);
    });
  });

  // ── getStats ──

  describe('getStats()', () => {
    it('returns aggregate stats', () => {
      const stats = service.getStats();
      assert.equal(typeof stats.totalPolicies, 'number');
      assert.equal(typeof stats.activePolicies, 'number');
      assert.equal(typeof stats.totalExecutions, 'number');
      assert.equal(typeof stats.totalAmountSent, 'number');
    });
  });
});

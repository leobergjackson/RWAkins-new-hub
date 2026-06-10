/**
 * SafetyService + RiskEngineService + DecisionLogService — focused unit tests.
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
  const files = ['.safety-spend-log.json'];
  for (const f of files) {
    const fp = resolve(__testDir, '..', '..', f);
    if (existsSync(fp)) unlinkSync(fp);
  }
});

// ══════════════════════════════════════════════════════════════════
// 1. DecisionLogService
// ══════════════════════════════════════════════════════════════════

import { DecisionLogService } from '../services/decision-log.service.js';

describe('DecisionLogService — logging and querying', () => {
  let log: DecisionLogService;

  before(() => {
    log = new DecisionLogService();
  });

  it('nextCycle increments cycle counter', () => {
    const c1 = log.nextCycle();
    const c2 = log.nextCycle();
    assert.equal(c2, c1 + 1);
  });

  it('logDecision stores with correct fields', () => {
    const cycle = log.nextCycle();
    const entry = log.logDecision({
      cycleNumber: cycle,
      observation: 'Test observation',
      llmRecommendation: 'Tip someone',
      actionTaken: 'Tipped 0.01 USDT',
      outcome: 'executed',
      creatorName: 'TestCreator',
      tipAmount: 0.01,
      chain: 'ethereum-sepolia',
      cycleDurationMs: 150,
    });
    assert.ok(entry.id.startsWith('decision_'));
    assert.ok(entry.timestamp);
    assert.equal(entry.outcome, 'executed');
  });

  it('getDecisions paginates correctly', () => {
    // Add a few more
    for (let i = 0; i < 5; i++) {
      log.logDecision({
        cycleNumber: log.nextCycle(),
        observation: `obs_${i}`,
        llmRecommendation: 'rec',
        actionTaken: 'action',
        outcome: i < 3 ? 'executed' : 'skipped',
      });
    }
    const page1 = log.getDecisions(1, 3);
    assert.equal(page1.decisions.length, 3);
    assert.ok(page1.total >= 6);
  });

  it('getByOutcome filters correctly', () => {
    const executed = log.getByOutcome('executed');
    for (const d of executed) {
      assert.equal(d.outcome, 'executed');
    }
  });

  it('getByCreator filters by name', () => {
    const results = log.getByCreator('TestCreator');
    assert.ok(results.length >= 1);
    assert.equal(results[0].creatorName, 'TestCreator');
  });

  it('getStats returns summary', () => {
    const stats = log.getStats();
    assert.ok(stats.totalDecisions >= 6);
    assert.ok(typeof stats.executed === 'number');
    assert.ok(typeof stats.executionRate === 'number');
    assert.ok(typeof stats.creatorsHelped === 'number');
  });

  it('clear resets log', () => {
    log.clear();
    assert.equal(log.getCycleNumber(), 0);
    assert.equal(log.getDecisions().total, 0);
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. SafetyService
// ══════════════════════════════════════════════════════════════════

import { SafetyService } from '../services/safety.service.js';

describe('SafetyService — safety checks, spend limits, kill switch', () => {
  let safety: SafetyService;

  before(() => {
    // Clean persisted spend log to avoid data collisions from other test suites
    const spendLogFile = resolve(__testDir, '..', '..', '.safety-spend-log.json');
    if (existsSync(spendLogFile)) unlinkSync(spendLogFile);
    safety = new SafetyService();
  });

  it('allows valid tip', () => {
    const r = safety.validateTip({ recipient: '0x' + 'a'.repeat(40), amount: 1 });
    assert.equal(r.allowed, true);
  });

  it('blocks minimum amount violation', () => {
    const r = safety.validateTip({ recipient: '0x' + 'a'.repeat(40), amount: 0.0001 });
    assert.equal(r.allowed, false);
    assert.equal(r.policy, 'MIN_TIP_AMOUNT');
  });

  it('kill switch blocks all tips', () => {
    safety.activateKillSwitch();
    assert.equal(safety.isKillSwitchActive(), true);
    const r = safety.validateTip({ recipient: '0x' + 'a'.repeat(40), amount: 1 });
    assert.equal(r.allowed, false);
    assert.equal(r.policy, 'KILL_SWITCH');
    safety.deactivateKillSwitch();
    assert.equal(safety.isKillSwitchActive(), false);
  });

  it('queueForApproval and approve work', () => {
    const entry = safety.queueForApproval({
      recipient: '0x' + 'a'.repeat(40),
      amount: 30,
      chain: 'ethereum-sepolia',
      token: 'usdt',
      reason: 'Large tip test',
    });
    assert.equal(entry.status, 'pending');
    const approved = safety.approveApproval(entry.id);
    assert.ok(approved);
    assert.equal(approved!.status, 'approved');
  });

  it('addToRecoveryQueue and resolveRecovery work', () => {
    const entry = safety.addToRecoveryQueue({
      recipient: '0x' + 'a'.repeat(40),
      amount: 1,
      chain: 'ethereum-sepolia',
      token: 'usdt',
      failureType: 'pre_send',
      error: 'test error',
    });
    assert.equal(entry.status, 'queued_retry');
    const resolved = safety.resolveRecovery(entry.id);
    assert.ok(resolved);
    assert.equal(resolved!.status, 'resolved');
  });

  it('getSecurityReport returns structured report', () => {
    const report = safety.getSecurityReport();
    assert.ok(['healthy', 'elevated', 'critical'].includes(report.riskSummary));
    assert.ok(typeof report.budgetUsedPercent === 'number');
    assert.ok(typeof report.effectiveDailyLimit === 'number');
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. RiskEngineService
// ══════════════════════════════════════════════════════════════════

import { RiskEngineService } from '../services/risk-engine.service.js';

describe('RiskEngineService — risk assessment, scoring', () => {
  let risk: RiskEngineService;

  before(() => {
    risk = new RiskEngineService();
  });

  it('assessRisk returns valid structure', () => {
    const r = risk.assessRisk({
      recipient: '0x' + 'a'.repeat(40),
      amount: 1,
      chainId: 'ethereum-sepolia',
      walletBalance: 100,
      gasFee: 0.001,
      token: 'usdt',
    });
    assert.ok(r.score >= 0 && r.score <= 100);
    assert.ok(['low', 'medium', 'high', 'critical'].includes(r.level));
    assert.ok(['execute', 'warn_and_execute', 'require_confirmation', 'block'].includes(r.action));
    assert.ok(Array.isArray(r.reasoning));
  });

  it('unknown recipient has higher risk', () => {
    const r = risk.assessRisk({
      recipient: '0x' + 'b'.repeat(40),
      amount: 1,
      chainId: 'ethereum-sepolia',
      walletBalance: 100,
      gasFee: 0.001,
      token: 'usdt',
    });
    assert.equal(r.factors.recipientRisk, 40);
  });

  it('recordTip and known recipient reduces risk', () => {
    const addr = '0x' + 'c'.repeat(40);
    risk.recordTip(addr, 1.0, 'ethereum-sepolia');
    const r = risk.assessRisk({
      recipient: addr,
      amount: 1,
      chainId: 'ethereum-sepolia',
      walletBalance: 100,
      gasFee: 0.001,
      token: 'usdt',
    });
    assert.equal(r.factors.recipientRisk, 10);
  });
});

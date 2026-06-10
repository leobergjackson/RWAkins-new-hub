/**
 * Tests for ai-intents.ts — INTENT_RULES, regexDetectIntent,
 * shouldRefuseTip, ruleBasedAutonomousDecision.
 * Pure function tests — no WDK required.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTENT_RULES,
  regexDetectIntent,
  shouldRefuseTip,
  ruleBasedAutonomousDecision,
} from '../services/ai-intents.js';
import { extractEntities } from '../services/ai-entities.js';

// ── INTENT_RULES ──────────────────────────────────────────

describe('INTENT_RULES', () => {
  it('has 13 intent rules', () => {
    assert.equal(INTENT_RULES.length, 13);
  });

  it('each rule has required properties', () => {
    for (const rule of INTENT_RULES) {
      assert.ok(rule.intent, 'rule must have intent');
      assert.ok(Array.isArray(rule.patterns), 'rule must have patterns array');
      assert.ok(rule.patterns.length > 0, 'patterns must not be empty');
      assert.ok(typeof rule.weight === 'number', 'weight must be a number');
      assert.ok(rule.description.length > 0, 'description must not be empty');
    }
  });
});

// ── regexDetectIntent ─────────────────────────────────────

describe('regexDetectIntent', () => {
  const detect = (text: string) => regexDetectIntent(text.toLowerCase(), text, extractEntities);

  it('detects tip intent', () => {
    assert.equal(detect('send $5 to @alice').intent, 'tip');
  });

  it('detects check_balance intent', () => {
    assert.equal(detect('what is my balance').intent, 'check_balance');
  });

  it('detects view_history intent', () => {
    assert.equal(detect('show my transaction history').intent, 'view_history');
  });

  it('detects find_creator intent', () => {
    assert.equal(detect('find creator TechGuru').intent, 'find_creator');
  });

  it('detects set_policy intent', () => {
    assert.equal(detect('set daily limit to 50').intent, 'set_policy');
  });

  it('detects check_status intent', () => {
    assert.equal(detect('are you running').intent, 'check_status');
  });

  it('detects help intent', () => {
    assert.equal(detect('help me').intent, 'help');
  });

  it('detects analytics intent', () => {
    assert.equal(detect('show me stats').intent, 'analytics');
  });

  it('detects bridge intent', () => {
    assert.equal(detect('bridge to polygon cross-chain').intent, 'bridge');
  });

  it('detects swap intent', () => {
    assert.equal(detect('swap my tokens').intent, 'swap');
  });

  it('detects lend intent', () => {
    assert.equal(detect('earn yield on staking').intent, 'lend');
  });

  it('detects fees intent', () => {
    assert.equal(detect('how much are fees').intent, 'fees');
  });

  it('detects address intent', () => {
    assert.equal(detect('show my address').intent, 'address');
  });

  it('returns unknown for unrecognized text', () => {
    assert.equal(detect('asdfjklqwerty gibberish').intent, 'unknown');
  });

  it('includes reasoning string', () => {
    const result = detect('send $10');
    assert.ok(result.reasoning.includes('[Rule-based]'));
  });
});

// ── shouldRefuseTip ───────────────────────────────────────

describe('shouldRefuseTip', () => {
  const baseParams = {
    amount: 5,
    creator: 'alice',
    dailyBudgetRemaining: 50,
    riskScore: 0.3,
    currentBalance: 100,
    engagementScore: 0.5,
    estimatedFee: 0.01,
  };

  it('allows valid tip', () => {
    const result = shouldRefuseTip(baseParams, []);
    assert.equal(result.refused, false);
  });

  it('refuses when amount exceeds budget', () => {
    const result = shouldRefuseTip({ ...baseParams, amount: 60 }, []);
    assert.equal(result.refused, true);
    assert.ok(result.reason.includes('budget'));
  });

  it('refuses when risk score too high', () => {
    const result = shouldRefuseTip({ ...baseParams, riskScore: 0.9 }, []);
    assert.equal(result.refused, true);
    assert.ok(result.reason.includes('risk'));
  });

  it('refuses duplicate tip within 1 hour', () => {
    const recentTips = [{ creator: 'alice', timestamp: Date.now() - 30 * 60 * 1000 }];
    const result = shouldRefuseTip(baseParams, recentTips);
    assert.equal(result.refused, true);
    assert.ok(result.reason.includes('Duplicate'));
  });

  it('refuses when balance would drop below reserve', () => {
    const result = shouldRefuseTip({ ...baseParams, amount: 45, currentBalance: 50, dailyBudgetRemaining: 100 }, []);
    assert.equal(result.refused, true);
    assert.ok(result.reason.includes('reserve'));
  });

  it('refuses low engagement score (suspected bot)', () => {
    const result = shouldRefuseTip({ ...baseParams, engagementScore: 0.05 }, []);
    assert.equal(result.refused, true);
    assert.ok(result.reason.includes('engagement'));
  });

  it('refuses excessive fees', () => {
    const result = shouldRefuseTip({ ...baseParams, amount: 1, estimatedFee: 0.5 }, []);
    assert.equal(result.refused, true);
    assert.ok(result.reason.includes('fee'));
  });
});

// ── ruleBasedAutonomousDecision ───────────────────────────

describe('ruleBasedAutonomousDecision', () => {
  it('skips when risk score > 70', () => {
    const result = ruleBasedAutonomousDecision({
      engagementScore: 0.8, suggestedAmount: 1, gasGwei: 10,
      riskScore: 80, topCreator: 'alice',
      tipHistory: { executed: 0, skipped: 0, refused: 0 },
    });
    assert.equal(result.action, 'skip');
    assert.equal(result.llmDriven, false);
  });

  it('waits when gas > 50 gwei', () => {
    const result = ruleBasedAutonomousDecision({
      engagementScore: 0.8, suggestedAmount: 1, gasGwei: 60,
      riskScore: 10, topCreator: 'alice',
      tipHistory: { executed: 0, skipped: 0, refused: 0 },
    });
    assert.equal(result.action, 'wait');
  });

  it('tips on high engagement with low risk', () => {
    const result = ruleBasedAutonomousDecision({
      engagementScore: 0.8, suggestedAmount: 1, gasGwei: 5,
      riskScore: 10, topCreator: 'alice',
      tipHistory: { executed: 0, skipped: 0, refused: 0 },
    });
    assert.equal(result.action, 'tip');
  });

  it('skips on very low engagement', () => {
    const result = ruleBasedAutonomousDecision({
      engagementScore: 0.1, suggestedAmount: 1, gasGwei: 5,
      riskScore: 10, topCreator: 'alice',
      tipHistory: { executed: 0, skipped: 0, refused: 0 },
    });
    assert.equal(result.action, 'skip');
  });

  it('skips micro-tips', () => {
    const result = ruleBasedAutonomousDecision({
      engagementScore: 0.8, suggestedAmount: 0.0001, gasGwei: 5,
      riskScore: 10, topCreator: 'alice',
      tipHistory: { executed: 0, skipped: 0, refused: 0 },
    });
    assert.equal(result.action, 'skip');
  });
});

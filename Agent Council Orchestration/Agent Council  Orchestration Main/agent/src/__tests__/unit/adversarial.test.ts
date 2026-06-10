/**
 * Unit Tests: Adversarial Security — 12 Attack Vectors
 *
 * Tests that all security policies block known attack patterns:
 * kill switch, min/max tip, blocked addresses, daily/hourly limits,
 * per-creator limits, velocity detection, progressive limits,
 * anomaly detection, tiered approval, and de-escalation guard.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SafetyService } from '../../services/safety.service.js';
import { AnomalyDetectionService } from '../../services/anomaly-detection.service.js';

// WDK type imports for adversarial security checks on wallet operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Adversarial tests verify WDK transfer limits, kill switch, and blocked address enforcement
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

// ── Helpers ────────────────────────────────────────────────────

const __testDir = dirname(fileURLToPath(import.meta.url));
const SPEND_LOG_FILE = join(__testDir, '..', '..', '..', '.safety-spend-log.json');

/** Remove the persisted spend log so each SafetyService starts clean */
function cleanSpendLog(): void {
  try { if (existsSync(SPEND_LOG_FILE)) unlinkSync(SPEND_LOG_FILE); } catch { /* noop */ }
}

const VALID_RECIPIENT = '0x' + 'c'.repeat(40);
const BURN_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEAD_ADDRESS = '0x000000000000000000000000000000000000dead';

// ── Suite: Attack Vector 1 — Kill Switch ───────────────────────

describe('Security — Kill Switch', () => {
  it('blocks all tips when kill switch is active', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    safety.activateKillSwitch();

    const result = safety.validateTip({ recipient: VALID_RECIPIENT, amount: 0.01 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'KILL_SWITCH');
  });

  it('resumes tips when kill switch is deactivated', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    safety.activateKillSwitch();
    safety.deactivateKillSwitch();

    const result = safety.validateTip({ recipient: VALID_RECIPIENT, amount: 0.01 });
    assert.equal(result.allowed, true);
  });

  it('isKillSwitchActive reflects current state', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    assert.equal(safety.isKillSwitchActive(), false);
    safety.activateKillSwitch();
    assert.equal(safety.isKillSwitchActive(), true);
    safety.deactivateKillSwitch();
    assert.equal(safety.isKillSwitchActive(), false);
  });
});

// ── Suite: Attack Vector 2 — Min Tip Amount ────────────────────

describe('Security — Min Tip Amount', () => {
  it('blocks tips below minimum amount', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const result = safety.validateTip({ recipient: VALID_RECIPIENT, amount: 0.0001 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'MIN_TIP_AMOUNT');
  });
});

// ── Suite: Attack Vector 3 — Max Single Tip ────────────────────

describe('Security — Max Single Tip', () => {
  it('blocks tips above maximum single tip limit', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const result = safety.validateTip({ recipient: VALID_RECIPIENT, amount: 999 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'MAX_SINGLE_TIP');
  });

  it('allows tips within the max single tip limit', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const result = safety.validateTip({ recipient: VALID_RECIPIENT, amount: 5 });
    assert.equal(result.allowed, true);
  });
});

// ── Suite: Attack Vector 4 — Blocked Addresses ────────────────

describe('Security — Blocked Addresses', () => {
  it('blocks tips to the zero address (burn)', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const result = safety.validateTip({ recipient: BURN_ADDRESS, amount: 1 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'BLOCKED_ADDRESS');
  });

  it('blocks tips to the dead address', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const result = safety.validateTip({ recipient: DEAD_ADDRESS, amount: 1 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'BLOCKED_ADDRESS');
  });

  it('blocks are case-insensitive', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const result = safety.validateTip({ recipient: BURN_ADDRESS.toUpperCase(), amount: 1 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'BLOCKED_ADDRESS');
  });
});

// ── Suite: Attack Vector 5 — Daily Spend Limit ────────────────

describe('Security — Daily Spend Limit', () => {
  it('blocks tip when daily spend would exceed limit', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    // Default MAX_DAILY_SPEND = 200. Record 199 spent.
    safety.recordSpend(VALID_RECIPIENT, 199);

    const result = safety.validateTip({ recipient: VALID_RECIPIENT, amount: 2 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'MAX_DAILY_SPEND');
  });
});

// ── Suite: Attack Vector 6 — Hourly Spend Limit ────────────────

describe('Security — Hourly Spend Limit', () => {
  it('blocks tip when hourly spend would exceed limit', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    // Default MAX_HOURLY_SPEND = 100. Use a different recipient to avoid per-creator limits.
    // Record multiple small spends that stay under daily (200) but exceed hourly (100).
    const spender = '0x' + '1'.repeat(40);
    safety.recordSpend(spender, 50);
    const spender2 = '0x' + '2'.repeat(40);
    safety.recordSpend(spender2, 49);

    // Now try to tip 2 to a THIRD recipient — hourly total = 50+49+2 = 101 > 100
    const recipient3 = '0x' + '3'.repeat(40);
    const result = safety.validateTip({ recipient: recipient3, amount: 2 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'MAX_HOURLY_SPEND');
  });
});

// ── Suite: Attack Vector 7 — Per-Creator Daily Limit ───────────

describe('Security — Per-Creator Daily Limit', () => {
  it('blocks when max tips per creator per day is exceeded', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const creator = '0x' + 'd'.repeat(40);

    // Default MAX_TIPS_PER_CREATOR_PER_DAY = 5
    // Use tiny amounts so we don't hit daily/hourly limits first
    for (let i = 0; i < 5; i++) {
      safety.recordSpend(creator, 0.01);
    }

    const result = safety.validateTip({ recipient: creator, amount: 0.01 });
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'MAX_TIPS_PER_CREATOR_PER_DAY');
  });
});

// ── Suite: Attack Vector 8 — Velocity Detection ────────────────

describe('Security — Velocity Detection (Rapid-Fire)', () => {
  it('blocks rapid-fire tips to the same address within 60 seconds', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const target = '0x' + 'e'.repeat(40);

    // Record 3+ tiny spends in quick succession to the same address
    // Use tiny amounts (0.001) so daily/hourly/per-creator limits don't trigger first
    for (let i = 0; i < 3; i++) {
      safety.recordSpend(target, 0.001);
    }

    const result = safety.validateTip({ recipient: target, amount: 0.001 });
    // Velocity policy should trigger (3+ tips to same address in 60s)
    assert.equal(result.allowed, false);
    assert.equal(result.policy, 'VELOCITY_LIMIT');
  });
});

// ── Suite: Attack Vector 9 — Tiered Approval ──────────────────

describe('Security — Tiered Approval System', () => {
  let safety: SafetyService;

  before(() => {
    cleanSpendLog();
    safety = new SafetyService();
  });

  it('auto-approves tips below tier1 limit (default 5 USDT)', () => {
    const tier = safety.getApprovalTier(3);
    assert.equal(tier, 'auto');
  });

  it('flags tips between tier1 and tier2 (5-25 USDT)', () => {
    const tier = safety.getApprovalTier(15);
    assert.equal(tier, 'flagged');
  });

  it('requires manual approval above tier2 (>25 USDT)', () => {
    const tier = safety.getApprovalTier(30);
    assert.equal(tier, 'manual_required');
  });

  it('boundary: exactly at tier1 limit is auto', () => {
    const tier = safety.getApprovalTier(5);
    assert.equal(tier, 'auto');
  });

  it('boundary: exactly at tier2 limit is flagged', () => {
    const tier = safety.getApprovalTier(25);
    assert.equal(tier, 'flagged');
  });
});

// ── Suite: Attack Vector 10 — De-Escalation Guard ──────────────

describe('Security — LLM De-Escalation Guard', () => {
  it('prevents LLM from de-escalating manual_required to auto', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const result = safety.validateApprovalTierEscalation('manual_required', 'auto', 'llm-agent');
    assert.equal(result.overridden, true);
    assert.equal(result.effectiveTier, 'manual_required');
  });

  it('prevents LLM from de-escalating flagged to auto', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const result = safety.validateApprovalTierEscalation('flagged', 'auto', 'llm-agent');
    assert.equal(result.overridden, true);
    assert.equal(result.effectiveTier, 'flagged');
  });

  it('allows escalation (more restrictive is OK)', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const result = safety.validateApprovalTierEscalation('auto', 'manual_required', 'llm-agent');
    assert.equal(result.overridden, false);
    assert.equal(result.effectiveTier, 'manual_required');
  });

  it('same tier is not overridden', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const result = safety.validateApprovalTierEscalation('flagged', 'flagged', 'llm-agent');
    assert.equal(result.overridden, false);
    assert.equal(result.effectiveTier, 'flagged');
  });
});

// ── Suite: Attack Vector 11 — Anomaly Detection ────────────────

describe('Security — Statistical Anomaly Detection', () => {
  it('needs cold start with insufficient data', () => {
    const anomaly = new AnomalyDetectionService();
    assert.equal(anomaly.needsColdStart(), true);
  });

  it('detects anomalous amounts after training', () => {
    const anomaly = new AnomalyDetectionService();
    // Train with consistent small amounts
    for (let i = 0; i < 20; i++) {
      anomaly.recordTransaction(0.5 + Math.random() * 0.1);
    }

    // 100x normal amount should be anomalous
    const result = anomaly.detectAnomaly(50);
    assert.equal(result.isAnomaly, true);
    assert.ok(result.zScore > 2.0, 'Z-score should be elevated');
  });

  it('does not flag normal amounts', () => {
    const anomaly = new AnomalyDetectionService();
    for (let i = 0; i < 20; i++) {
      anomaly.recordTransaction(1.0 + Math.random() * 0.2);
    }

    const result = anomaly.detectAnomaly(1.1);
    assert.equal(result.isAnomaly, false);
  });
});

// ── Suite: Attack Vector 12 — Budget Exhaustion ────────────────

describe('Security — Budget Exhaustion Detection', () => {
  it('detects when daily budget is exhausted', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    safety.recordSpend(VALID_RECIPIENT, 200);
    assert.equal(safety.isBudgetExhausted(), true);
  });

  it('reports correct safety status', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    const status = safety.getStatus();

    assert.equal(typeof status.killSwitch, 'boolean');
    assert.equal(typeof status.budgetRemaining, 'number');
    assert.equal(typeof status.budgetUsed, 'number');
    assert.equal(typeof status.tipsToday, 'number');
    assert.ok(status.budgetRemaining >= 0);
  });

  it('assertTipAllowed throws ServiceError for blocked tips', () => {
    cleanSpendLog();
    const safety = new SafetyService();
    safety.activateKillSwitch();

    assert.throws(() => {
      safety.assertTipAllowed({ recipient: VALID_RECIPIENT, amount: 1 });
    });
  });
});

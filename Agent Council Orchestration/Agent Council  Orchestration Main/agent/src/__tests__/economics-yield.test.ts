/**
 * Tests for economics-yield.ts — SCORE_WEIGHTS, DEFAULT_BONUS_MILESTONES,
 * and exported type existence.
 * Pure function tests — no WDK required.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SCORE_WEIGHTS, DEFAULT_BONUS_MILESTONES } from '../services/economics-yield.js';
import type { YieldStatus, SplitConfig } from '../services/economics-yield.js';

describe('SCORE_WEIGHTS', () => {
  it('has 5 weight entries', () => {
    const keys = Object.keys(SCORE_WEIGHTS);
    assert.equal(keys.length, 5);
  });

  it('weights sum to 1.0', () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((s, v) => s + v, 0);
    assert.ok(Math.abs(sum - 1.0) < 0.001, `Sum ${sum} should be ~1.0`);
  });

  it('all weights are positive', () => {
    for (const [key, val] of Object.entries(SCORE_WEIGHTS)) {
      assert.ok(val > 0, `${key} weight should be positive`);
    }
  });
});

describe('DEFAULT_BONUS_MILESTONES', () => {
  it('has at least 3 entries', () => {
    assert.ok(DEFAULT_BONUS_MILESTONES.length >= 3);
  });

  it('each milestone has required fields', () => {
    for (const m of DEFAULT_BONUS_MILESTONES) {
      assert.ok(m.id, 'milestone must have id');
      assert.ok(m.name, 'milestone must have name');
      assert.ok(m.condition.length > 0, 'milestone must have condition');
      assert.ok(m.threshold > 0, 'threshold must be positive');
      assert.ok(m.bonusAmount > 0, 'bonusAmount must be positive');
      assert.ok(['views', 'subscribers', 'streak', 'views_single'].includes(m.metricType));
    }
  });
});

describe('Exported types', () => {
  it('YieldStatus type is usable', () => {
    const ys: YieldStatus = {
      deposited: 100, earnedYield: 5, currentApy: 0.03,
      chain: 'ethereum', protocol: 'aave',
      lastDepositAt: null, lastWithdrawAt: null, idleThreshold: 50,
    };
    assert.equal(ys.deposited, 100);
  });

  it('SplitConfig type is usable', () => {
    const sc: SplitConfig = { creatorPercent: 90, platformPercent: 5, communityPercent: 5 };
    assert.equal(sc.creatorPercent + sc.platformPercent + sc.communityPercent, 100);
  });
});

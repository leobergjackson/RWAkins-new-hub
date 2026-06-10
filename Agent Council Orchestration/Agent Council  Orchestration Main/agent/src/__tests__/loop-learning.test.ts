/**
 * Tests for loop-learning.ts — learnFromCycle, persistLearnedState,
 * restoreLearnedState, getLearnedInsights.
 * Pure function tests — no WDK required.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  learnFromCycle,
  persistLearnedState,
  restoreLearnedState,
  getLearnedInsights,
} from '../services/loop-learning.js';
import type { LoopCycleResult, ExplorationStats } from '../services/loop-learning.js';

// Mock memory service
function makeMem() {
  const store = new Map<string, string>();
  return {
    recall(key: string) {
      return store.has(key) ? { value: store.get(key)! } : null;
    },
    recallByType(_type: string) {
      const results: Array<{ key: string; value: string }> = [];
      for (const [k, v] of store) {
        if (k.startsWith('trusted_creator_')) results.push({ key: k, value: v });
      }
      return results;
    },
    remember(_type: string, key: string, value: string, _source?: string) {
      store.set(key, value);
    },
    _store: store,
  };
}

function baseCycleResult(overrides: Partial<LoopCycleResult> = {}): LoopCycleResult {
  return {
    cycleNumber: 1,
    phase: 'act',
    events: [],
    llmDecision: null,
    actionTaken: 'tip',
    outcome: 'executed',
    durationMs: 100,
    action: 'tip',
    creatorName: 'TestCreator',
    success: true,
    amount: 1.0,
    ...overrides,
  };
}

describe('learnFromCycle', () => {
  it('tracks successful tip for a creator', () => {
    const mem = makeMem();
    const trusted = new Set<string>();
    const gasThreshold = { value: null as number | null };
    const stats: ExplorationStats = { exploreTips: 0, exploitTips: 0, exploreSuccesses: 0, exploitSuccesses: 0 };
    learnFromCycle(baseCycleResult(), mem, trusted, gasThreshold, stats, false);
    const stored = mem.recall('learn_creator_TestCreator');
    assert.ok(stored);
    const data = JSON.parse(stored.value);
    assert.equal(data.tips, 1);
    assert.equal(data.successes, 1);
  });

  it('tracks failed tip', () => {
    const mem = makeMem();
    const trusted = new Set<string>();
    const gasThreshold = { value: null as number | null };
    const stats: ExplorationStats = { exploreTips: 0, exploitTips: 0, exploreSuccesses: 0, exploitSuccesses: 0 };
    learnFromCycle(baseCycleResult({ success: false }), mem, trusted, gasThreshold, stats, false);
    const stored = mem.recall('learn_creator_TestCreator');
    assert.ok(stored);
    const data = JSON.parse(stored.value);
    assert.equal(data.tips, 1);
    assert.equal(data.successes, 0);
  });

  it('marks creator as trusted after enough successes', () => {
    const mem = makeMem();
    const trusted = new Set<string>();
    const gasThreshold = { value: null as number | null };
    const stats: ExplorationStats = { exploreTips: 0, exploitTips: 0, exploreSuccesses: 0, exploitSuccesses: 0 };
    for (let i = 0; i < 3; i++) {
      learnFromCycle(baseCycleResult(), mem, trusted, gasThreshold, stats, false);
    }
    assert.ok(trusted.has('TestCreator'));
  });

  it('tracks time-of-day patterns', () => {
    const mem = makeMem();
    const trusted = new Set<string>();
    const gasThreshold = { value: null as number | null };
    const stats: ExplorationStats = { exploreTips: 0, exploitTips: 0, exploreSuccesses: 0, exploitSuccesses: 0 };
    learnFromCycle(baseCycleResult(), mem, trusted, gasThreshold, stats, false);
    const timeData = mem.recall('learn_time_patterns');
    assert.ok(timeData);
    const parsed = JSON.parse(timeData.value);
    assert.ok(Array.isArray(parsed.hourlyTips));
    assert.equal(parsed.hourlyTips.length, 24);
  });

  it('updates exploration stats for exploit path', () => {
    const mem = makeMem();
    const trusted = new Set<string>();
    const gasThreshold = { value: null as number | null };
    const stats: ExplorationStats = { exploreTips: 0, exploitTips: 0, exploreSuccesses: 0, exploitSuccesses: 0 };
    learnFromCycle(baseCycleResult(), mem, trusted, gasThreshold, stats, false);
    assert.equal(stats.exploitTips, 1);
    assert.equal(stats.exploitSuccesses, 1);
  });
});

describe('persistLearnedState', () => {
  it('writes trusted creators to memory', () => {
    const mem = makeMem();
    const trusted = new Set(['Alice', 'Bob']);
    persistLearnedState(mem, trusted, null, []);
    assert.equal(mem.recall('trusted_creator_Alice')?.value, 'true');
    assert.equal(mem.recall('trusted_creator_Bob')?.value, 'true');
  });

  it('writes gas threshold to memory', () => {
    const mem = makeMem();
    persistLearnedState(mem, new Set(), 25, []);
    assert.equal(mem.recall('learned_gas_threshold')?.value, '25');
  });
});

describe('restoreLearnedState', () => {
  it('restores trusted creators', () => {
    const mem = makeMem();
    mem.remember('preference', 'trusted_creator_Alice', 'true');
    const state = restoreLearnedState(mem);
    assert.ok(state.trustedCreators.has('Alice'));
  });

  it('restores gas threshold', () => {
    const mem = makeMem();
    mem.remember('preference', 'learned_gas_threshold', '30');
    const state = restoreLearnedState(mem);
    assert.equal(state.learnedGasThreshold, 30);
  });

  it('returns empty defaults when no memory', () => {
    const mem = makeMem();
    const state = restoreLearnedState(mem);
    assert.equal(state.trustedCreators.size, 0);
    assert.equal(state.learnedGasThreshold, null);
    assert.equal(state.learnedBestHours.length, 0);
  });
});

describe('getLearnedInsights', () => {
  it('returns empty string with no data', () => {
    const mem = makeMem();
    const result = getLearnedInsights(new Set(), null, [], mem);
    assert.equal(result, '');
  });

  it('includes trusted creators', () => {
    const mem = makeMem();
    const result = getLearnedInsights(new Set(['Alice']), null, [], mem);
    assert.ok(result.includes('Alice'));
    assert.ok(result.includes('Trusted'));
  });

  it('includes gas threshold', () => {
    const mem = makeMem();
    const result = getLearnedInsights(new Set(), 25, [], mem);
    assert.ok(result.includes('25'));
    assert.ok(result.includes('gas'));
  });
});

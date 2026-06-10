/**
 * Tests for loop-helpers.ts — buildObservation, findBestEvent,
 * extractToolResults, ruleBasedDecision, DeduplicationService.
 * Pure function tests — no WDK required.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DeduplicationService,
  buildObservation,
  findBestEvent,
  extractToolResults,
  ruleBasedDecision,
} from '../services/loop-helpers.js';
import type { SimulatedEvent } from '../services/event-simulator.service.js';

function makeEvent(overrides: Partial<SimulatedEvent> = {}): SimulatedEvent {
  return {
    id: 'evt-1',
    type: 'new_video',
    creatorId: 'c1',
    creatorName: 'Alice',
    timestamp: Date.now(),
    engagementQuality: 0.5,
    suggestedTipAmount: 0.01,
    isMilestone: false,
    data: {},
    ...overrides,
  } as SimulatedEvent;
}

// ── DeduplicationService ──────────────────────────────────

describe('DeduplicationService', () => {
  it('marks and detects duplicates', () => {
    const dedup = new DeduplicationService();
    assert.equal(dedup.isDuplicate('e1', 'c1', 'tip'), false);
    dedup.mark('e1', 'c1', 'tip');
    assert.equal(dedup.isDuplicate('e1', 'c1', 'tip'), true);
  });

  it('does not flag different combos', () => {
    const dedup = new DeduplicationService();
    dedup.mark('e1', 'c1', 'tip');
    assert.equal(dedup.isDuplicate('e2', 'c1', 'tip'), false);
    assert.equal(dedup.isDuplicate('e1', 'c2', 'tip'), false);
  });

  it('reports stats', () => {
    const dedup = new DeduplicationService();
    dedup.mark('e1', 'c1', 'tip');
    const stats = dedup.getStats();
    assert.equal(stats.trackedEntries, 1);
    assert.equal(stats.ttlMinutes, 60);
  });
});

// ── buildObservation ──────────────────────────────────────

describe('buildObservation', () => {
  it('includes time and event count', () => {
    const obs = buildObservation([], '', '', 0, 0, 0, null, null, () => 3, () => 55);
    assert.ok(obs.includes('Time:'));
    assert.ok(obs.includes('New events since last cycle: 0'));
  });

  it('includes event stats when events present', () => {
    const events = [makeEvent({ engagementQuality: 0.8, isMilestone: true })];
    const obs = buildObservation(events, '', '', 5, 2, 1, null, null, () => 3, () => 55);
    assert.ok(obs.includes('Milestones: 1'));
    assert.ok(obs.includes('5 tips executed'));
  });

  it('includes financial pulse when present', () => {
    const pulse = {
      liquidityScore: 80, diversificationScore: 50, velocityScore: 60,
      healthScore: 70, totalAvailableUsdt: 100, activeChainsCount: 2,
      timestamp: new Date().toISOString(),
    };
    const obs = buildObservation([], '', '', 0, 0, 0, pulse, null, () => 3, () => 55);
    assert.ok(obs.includes('health=70'));
  });
});

// ── findBestEvent ─────────────────────────────────────────

describe('findBestEvent', () => {
  it('selects highest engagement event for creator', () => {
    const events = [
      makeEvent({ creatorName: 'Alice', engagementQuality: 0.3 }),
      makeEvent({ creatorName: 'Alice', engagementQuality: 0.9 }),
      makeEvent({ creatorName: 'Bob', engagementQuality: 1.0 }),
    ];
    const best = findBestEvent(events, 'Alice');
    assert.ok(best);
    assert.equal(best.engagementQuality, 0.9);
  });

  it('returns undefined for unknown creator', () => {
    assert.equal(findBestEvent([makeEvent()], 'Unknown'), undefined);
  });
});

// ── extractToolResults ────────────────────────────────────

describe('extractToolResults', () => {
  it('extracts gas gwei from trace', () => {
    const trace = {
      steps: [
        { type: 'action' as const, toolName: 'gas_estimate', toolInput: {} },
        { type: 'observation' as const, toolResult: { success: true, data: { ethereum: { gasPrice: '12.50 gwei' } } } },
      ],
      finalDecision: null,
      totalSteps: 2,
    };
    const result = extractToolResults(trace as any);
    assert.equal(result.gasGwei, 12.5);
  });

  it('extracts risk score', () => {
    const trace = {
      steps: [
        { type: 'action' as const, toolName: 'risk_assess', toolInput: {} },
        { type: 'observation' as const, toolResult: { success: true, data: { riskScore: 45 } } },
      ],
      finalDecision: null,
      totalSteps: 2,
    };
    const result = extractToolResults(trace as any);
    assert.equal(result.riskScore, 45);
  });

  it('returns nulls when no matching tools', () => {
    const trace = { steps: [], finalDecision: null, totalSteps: 0 };
    const result = extractToolResults(trace as any);
    assert.equal(result.gasGwei, null);
    assert.equal(result.riskScore, null);
    assert.equal(result.tokenPriceUsd, null);
  });
});

// ── ruleBasedDecision ─────────────────────────────────────

describe('ruleBasedDecision', () => {
  it('waits when no events', () => {
    const result = ruleBasedDecision([], 0.1, new Set(), null, [], (_v) => {});
    assert.equal(result.action, 'wait');
    assert.equal(result.confidence, 100);
  });

  it('tips on milestone event', () => {
    const events = [makeEvent({ isMilestone: true, engagementQuality: 0.3, data: { milestoneType: 'views', milestoneValue: 1000 } })];
    const result = ruleBasedDecision(events, 0, new Set(), null, [], (_v) => {});
    assert.equal(result.action, 'tip');
    assert.ok(result.reason.includes('Milestone'));
  });

  it('tips on high engagement', () => {
    const events = [makeEvent({ engagementQuality: 0.85 })];
    const result = ruleBasedDecision(events, 0, new Set(), null, [], (_v) => {});
    assert.equal(result.action, 'tip');
  });

  it('skips on low engagement', () => {
    const events = [makeEvent({ engagementQuality: 0.1 })];
    const result = ruleBasedDecision(events, 0, new Set(), null, [], (_v) => {});
    assert.equal(result.action, 'skip');
  });

  it('observe_more on moderate engagement', () => {
    const events = [makeEvent({ engagementQuality: 0.5 })];
    const result = ruleBasedDecision(events, 0, new Set(), null, [], (_v) => {});
    assert.equal(result.action, 'observe_more');
  });
});

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Loop Helpers (extracted from autonomous-loop.service.ts)
// Contains: DeduplicationService, rule-based decision, observation builder,
// event finder, and tool result extraction.

import { logger } from '../utils/logger.js';
import type { SimulatedEvent } from './event-simulator.service.js';
import type { ReActTrace, ObservationStep, ActionStep } from './openclaw.service.js';
import type { LLMLoopDecision } from './loop-learning.js';
import type { FinancialPulse } from './financial-pulse.js';
import type { WalletMoodState } from './financial-pulse.js';

// ── Deduplication (Feature 34) ────────────────────────────────

interface DeduplicationEntry {
  key: string;
  timestamp: number;
}

/**
 * Deduplication service for preventing duplicate tips within a time window.
 */
export class DeduplicationService {
  private entries = new Map<string, DeduplicationEntry>();
  private ttlMs = 60 * 60 * 1000; // 1 hour

  /** Check if this event+creator+type combo is a duplicate */
  isDuplicate(eventId: string, creatorId: string, tipType: string): boolean {
    this.cleanup();
    const key = `${eventId}:${creatorId}:${tipType}`;
    return this.entries.has(key);
  }

  /** Mark a combo as processed */
  mark(eventId: string, creatorId: string, tipType: string): void {
    const key = `${eventId}:${creatorId}:${tipType}`;
    this.entries.set(key, { key, timestamp: Date.now() });
  }

  /** Get duplicate prevention stats */
  getStats() {
    this.cleanup();
    return {
      trackedEntries: this.entries.size,
      ttlMinutes: this.ttlMs / 60_000,
    };
  }

  /** Remove expired entries */
  private cleanup(): void {
    const cutoff = Date.now() - this.ttlMs;
    for (const [key, entry] of this.entries) {
      if (entry.timestamp < cutoff) {
        this.entries.delete(key);
      }
    }
  }
}

// ── Observation Builder ──────────────────────────────────────

/**
 * Build the observation string for a ReAct cycle.
 */
export function buildObservation(
  events: SimulatedEvent[],
  creatorContext: string,
  memoryContext: string,
  tipsExecuted: number,
  tipsSkipped: number,
  tipsRefused: number,
  lastFinancialPulse: FinancialPulse | null,
  lastWalletMood: WalletMoodState | null,
  getMoodBatchSize: () => number,
  getMoodRiskTolerance: () => number,
): string {
  const parts: string[] = [];

  parts.push(`Time: ${new Date().toISOString()}`);
  parts.push(`New events since last cycle: ${events.length}`);

  if (events.length > 0) {
    const milestones = events.filter(e => e.isMilestone).length;
    const highEngagement = events.filter(e => e.engagementQuality >= 0.7).length;
    const avgQuality = events.reduce((s, e) => s + e.engagementQuality, 0) / events.length;
    parts.push(`Milestones: ${milestones}, High engagement: ${highEngagement}, Avg quality: ${avgQuality.toFixed(2)}`);

    const types = new Map<string, number>();
    for (const e of events) {
      types.set(e.type, (types.get(e.type) ?? 0) + 1);
    }
    parts.push(`Event types: ${Array.from(types.entries()).map(([t, c]) => `${t}(${c})`).join(', ')}`);
  }

  if (creatorContext) {
    parts.push(`Known creators: ${creatorContext}`);
  }

  if (memoryContext) {
    parts.push(`Agent memory: ${memoryContext}`);
  }

  parts.push(`Loop stats: ${tipsExecuted} tips executed, ${tipsSkipped} skipped, ${tipsRefused} refused`);

  // Wallet-as-Brain: include financial pulse context
  if (lastFinancialPulse) {
    const p = lastFinancialPulse;
    parts.push(`Financial pulse: health=${p.healthScore}/100, liquidity=${p.liquidityScore}/100, diversification=${p.diversificationScore}/100, velocity=${p.velocityScore}/100, available=${p.totalAvailableUsdt.toFixed(4)} USDT across ${p.activeChainsCount} chains`);
  }
  if (lastWalletMood) {
    parts.push(`Wallet mood: ${lastWalletMood.mood} (tip multiplier: x${lastWalletMood.tipMultiplier}, batch size: ${getMoodBatchSize()}, risk tolerance: ${getMoodRiskTolerance()})`);
  }

  return parts.join('\n');
}

// ── Event Finder ─────────────────────────────────────────────

/**
 * Find the best event for a creator from the event list.
 */
export function findBestEvent(events: SimulatedEvent[], creatorName: string): SimulatedEvent | undefined {
  return events
    .filter(e => e.creatorName === creatorName)
    .sort((a, b) => b.engagementQuality - a.engagementQuality)[0];
}

// ── Tool Result Extraction ───────────────────────────────────

/**
 * Extract concrete values from OpenClaw tool results so they can
 * drive the tipping decision instead of being ignored.
 *
 * Pairs each ActionStep with its following ObservationStep to
 * map tool names to their results.
 */
export function extractToolResults(trace: ReActTrace): {
  gasGwei: number | null;
  riskScore: number | null;
  tokenPriceUsd: number | null;
} {
  let gasGwei: number | null = null;
  let riskScore: number | null = null;
  let tokenPriceUsd: number | null = null;

  // Walk the trace steps: each ActionStep is followed by its ObservationStep
  for (let i = 0; i < trace.steps.length; i++) {
    const step = trace.steps[i];
    if (step.type !== 'action') continue;

    const action = step as ActionStep;
    const nextStep = trace.steps[i + 1];
    if (!nextStep || nextStep.type !== 'observation') continue;

    const obs = nextStep as ObservationStep;
    if (!obs.toolResult.success || obs.toolResult.data == null) continue;

    const data = obs.toolResult.data as Record<string, unknown>;

    switch (action.toolName) {
      case 'gas_estimate': {
        // data is Record<chain, { gasPrice: "X.XX gwei", ... }>
        // Pick the first chain's gas price (typically ethereum)
        const chains = Object.values(data) as Array<{ gasPrice?: string }>;
        if (chains.length > 0 && chains[0]?.gasPrice) {
          const parsed = parseFloat(chains[0].gasPrice);
          if (!Number.isNaN(parsed)) gasGwei = parsed;
        }
        break;
      }
      case 'risk_assess': {
        // data is { riskScore: number, riskLevel: string, ... }
        if (typeof data.riskScore === 'number') {
          riskScore = data.riskScore;
        }
        break;
      }
      case 'price_check': {
        // data is { tether: { usd: number, ... }, ... }
        const tether = data.tether as { usd?: number } | undefined;
        if (tether?.usd != null) {
          tokenPriceUsd = tether.usd;
        } else {
          // Fallback: grab the first token's USD price
          const firstToken = Object.values(data)[0] as { usd?: number } | undefined;
          if (firstToken?.usd != null) {
            tokenPriceUsd = firstToken.usd;
          }
        }
        break;
      }
    }
  }

  return { gasGwei, riskScore, tokenPriceUsd };
}

// ── Rule-Based Decision ──────────────────────────────────────

/**
 * Rule-based decision when LLM is unavailable.
 * Evaluates events using engagement thresholds, adaptive learning data,
 * and milestone priority.
 */
export function ruleBasedDecision(
  events: SimulatedEvent[],
  explorationRate: number,
  trustedCreators: Set<string>,
  learnedGasThreshold: number | null,
  learnedBestHours: number[],
  setCurrentCycleExplored: (explored: boolean) => void,
  llmContext?: string,
): LLMLoopDecision {
  if (events.length === 0) {
    return {
      action: 'wait',
      reason: 'No new events to process. Agent is monitoring for activity.',
      confidence: 100,
    };
  }

  // Epsilon-greedy: occasionally explore a random creator instead of the best
  const sorted = [...events].sort((a, b) => b.engagementQuality - a.engagementQuality);
  let best: SimulatedEvent;
  if (sorted.length > 1 && Math.random() < explorationRate) {
    const randomIndex = Math.floor(Math.random() * sorted.length);
    best = sorted[randomIndex];
    setCurrentCycleExplored(true);
    logger.info('Exploration: randomly selected creator for discovery', {
      creator: best.creatorName,
      explorationRate,
    });
  } else {
    best = sorted[0];
    setCurrentCycleExplored(false);
    logger.info('Exploitation: selected top creator', {
      creator: best.creatorName,
      engagementScore: best.engagementQuality,
    });
  }

  // Milestone events get priority (Feature 26)
  const milestone = events.find(e => e.isMilestone);
  if (milestone) {
    return {
      action: 'tip',
      creatorName: milestone.creatorName,
      creatorId: milestone.creatorId,
      amount: milestone.suggestedTipAmount,
      reason: `Milestone event: ${milestone.data.milestoneType} reached ${milestone.data.milestoneValue} for ${milestone.creatorName}. This achievement deserves recognition.`,
      confidence: 85,
      engagementAssessment: `Milestone event — inherently high value (engagement: ${milestone.engagementQuality})`,
    };
  }

  // ── ADAPTIVE THRESHOLD: learned data actively changes decisions ──
  const isTrusted = best.creatorName ? trustedCreators.has(best.creatorName) : false;
  const currentHour = new Date().getHours();
  const isBestHour = learnedBestHours.includes(currentHour);
  const gasAboveThreshold = learnedGasThreshold !== null && (best as unknown as { gasGwei?: number }).gasGwei !== undefined
    ? ((best as unknown as { gasGwei?: number }).gasGwei ?? 0) > learnedGasThreshold
    : false;

  let adaptedThreshold = 0.7;
  const adaptations: string[] = [];

  if (isTrusted) {
    adaptedThreshold -= 0.2;
    adaptations.push('trusted: -0.2');
  }
  if (isBestHour) {
    adaptedThreshold -= 0.1;
    adaptations.push(`bestHour(${currentHour}): -0.1`);
  }
  if (gasAboveThreshold) {
    adaptedThreshold += 0.15;
    adaptations.push(`highGas: +0.15`);
  }

  // Clamp threshold to sane range
  adaptedThreshold = Math.max(0.3, Math.min(0.9, adaptedThreshold));

  if (adaptations.length > 0) {
    logger.info(`Threshold adapted: 0.7 → ${adaptedThreshold.toFixed(2)} (${adaptations.join(', ')})`);
  }

  // High engagement triggers tip (Feature 50)
  if (best.engagementQuality >= adaptedThreshold) {
    const adaptNote = adaptations.length > 0 ? ` (adapted threshold: ${adaptedThreshold.toFixed(2)}, ${adaptations.join(', ')})` : '';
    return {
      action: 'tip',
      creatorName: best.creatorName,
      creatorId: best.creatorId,
      amount: best.suggestedTipAmount,
      reason: `High engagement quality (${best.engagementQuality}) detected for ${best.creatorName}${adaptNote}. ${llmContext ? llmContext.slice(0, 100) : `Event type: ${best.type}`}`,
      confidence: Math.round(best.engagementQuality * 100) + (isTrusted ? 10 : 0) + (isBestHour ? 5 : 0),
      engagementAssessment: `Quality score ${best.engagementQuality}/1.0 — genuine audience engagement detected${adaptNote}`,
    };
  }

  // Medium engagement — observe more
  if (best.engagementQuality >= 0.4) {
    return {
      action: 'observe_more',
      creatorName: best.creatorName,
      creatorId: best.creatorId,
      reason: `Moderate engagement (${best.engagementQuality}) for ${best.creatorName}. Watching for sustained quality before tipping.`,
      confidence: 60,
      engagementAssessment: `Score ${best.engagementQuality}/1.0 — engagement is present but not compelling enough to tip yet`,
    };
  }

  // Low engagement — skip
  return {
    action: 'skip',
    creatorName: best.creatorName,
    reason: `Low engagement quality (${best.engagementQuality}) across ${events.length} events. Possible bot-like patterns or insufficient audience interaction.`,
    confidence: 70,
    engagementAssessment: `Score ${best.engagementQuality}/1.0 — below tipping threshold, may indicate artificial engagement`,
  };
}

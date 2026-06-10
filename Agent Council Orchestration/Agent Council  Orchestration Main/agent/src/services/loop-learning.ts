// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Loop Learning (extracted from autonomous-loop.service.ts)

import { logger } from '../utils/logger.js';
import type { FinancialPulse, WalletMoodState } from './financial-pulse.js';
import type { SimulatedEvent } from './event-simulator.service.js';

// Re-export types that are used externally
export type { FinancialPulse, WalletMoodState } from './financial-pulse.js';

/** Cycle result used for learning */
export interface LoopCycleResult {
  cycleNumber: number;
  phase: 'observe' | 'reason' | 'act' | 'reflect';
  events: SimulatedEvent[];
  llmDecision: LLMLoopDecision | null;
  actionTaken: string;
  outcome: 'executed' | 'skipped' | 'refused' | 'error';
  durationMs: number;
  /** Semantic action type for learning */
  action?: 'tip' | 'skip' | 'wait' | 'observe_more' | 'rebalance';
  /** Creator involved in this cycle */
  creatorName?: string;
  /** Whether the cycle's primary action succeeded */
  success?: boolean;
  /** Tip amount if applicable */
  amount?: number;
  /** Gas price observed during this cycle */
  gasGwei?: number;
  /** Wallet-as-Brain: financial pulse reading for this cycle */
  financialPulse?: FinancialPulse;
  /** Wallet-as-Brain: agent mood derived from financial state */
  walletMood?: WalletMoodState;
}

/** The LLM's decision in each cycle */
export interface LLMLoopDecision {
  action: 'tip' | 'skip' | 'wait' | 'rebalance' | 'observe_more';
  creatorName?: string;
  creatorId?: string;
  amount?: number;
  reason: string;
  confidence: number;
  engagementAssessment?: string;
}

/** Minimal memory interface for learning functions */
interface MemoryServiceRef {
  recall(key: string): { value: string } | null | undefined;
  recallByType(type: string): Array<{ key: string; value: string }>;
  remember(type: string, key: string, value: string, source?: string): unknown;
}

/** Exploration statistics for epsilon-greedy */
export interface ExplorationStats {
  exploreTips: number;
  exploitTips: number;
  exploreSuccesses: number;
  exploitSuccesses: number;
}

/**
 * Restore learned state from persisted memory so it survives restarts.
 */
export function restoreLearnedState(
  memory: MemoryServiceRef,
): {
  trustedCreators: Set<string>;
  learnedGasThreshold: number | null;
  learnedBestHours: number[];
} {
  const trustedCreators = new Set<string>();
  let learnedGasThreshold: number | null = null;
  let learnedBestHours: number[] = [];

  try {
    // Restore trusted creators
    const creatorMemories = memory.recallByType('preference')
      .filter(m => m.key.startsWith('trusted_creator_') && m.value === 'true');
    for (const m of creatorMemories) {
      const name = m.key.replace('trusted_creator_', '').replace(/_/g, ' ');
      trustedCreators.add(name);
    }

    // Restore learned gas threshold
    const gasThreshold = memory.recall('learned_gas_threshold');
    if (gasThreshold) {
      learnedGasThreshold = parseInt(gasThreshold.value, 10) || null;
    }

    // Restore best tipping hours from time pattern data
    const timeData = memory.recall('learn_time_patterns');
    if (timeData) {
      try {
        const parsed = JSON.parse(timeData.value) as { hourlyTips: number[]; hourlySkips: number[] };
        learnedBestHours = parsed.hourlyTips
          .map((tips, hour) => ({ hour, ratio: tips / Math.max(1, tips + (parsed.hourlySkips[hour] ?? 0)) }))
          .filter(h => h.ratio > 0.6 && (parsed.hourlyTips[h.hour] ?? 0) >= 2)
          .map(h => h.hour);
      } catch { /* corrupted data, skip */ }
    }

    if (trustedCreators.size > 0 || learnedGasThreshold !== null || learnedBestHours.length > 0) {
      logger.info('Restored learned state from memory', {
        trustedCreators: trustedCreators.size,
        gasThreshold: learnedGasThreshold,
        bestHours: learnedBestHours,
      });
    }
  } catch (err) {
    logger.debug('Failed to restore learned state (non-critical)', { error: String(err) });
  }

  return { trustedCreators, learnedGasThreshold, learnedBestHours };
}

/**
 * Get learned insights summary for LLM context.
 */
export function getLearnedInsights(
  trustedCreators: Set<string>,
  learnedGasThreshold: number | null,
  learnedBestHours: number[],
  memory: MemoryServiceRef,
): string {
  const parts: string[] = [];
  if (trustedCreators.size > 0) {
    parts.push(`Trusted creators (3+ successful tips): ${[...trustedCreators].join(', ')}`);
  }
  if (learnedGasThreshold !== null) {
    parts.push(`Learned gas threshold: ${learnedGasThreshold} gwei (skip tipping above this)`);
  }
  if (learnedBestHours.length > 0) {
    parts.push(`Best tipping hours (learned): ${learnedBestHours.map(h => `${h}:00`).join(', ')}`);
  }
  const eff = memory.recall('learn_effectiveness');
  if (eff) {
    try {
      const data = JSON.parse(eff.value) as { totalDecisions: number; successfulTips: number; failedTips: number };
      if (data.totalDecisions > 0) {
        const rate = Math.round((data.successfulTips / Math.max(1, data.successfulTips + data.failedTips)) * 100);
        parts.push(`Tip success rate: ${rate}% (${data.successfulTips}/${data.successfulTips + data.failedTips})`);
      }
    } catch { /* skip */ }
  }
  return parts.length > 0 ? parts.join('. ') : '';
}

/**
 * Post-cycle learning: extract patterns from outcomes to improve future decisions.
 */
export function learnFromCycle(
  cycleResult: LoopCycleResult,
  memory: MemoryServiceRef,
  trustedCreators: Set<string>,
  learnedGasThreshold: { value: number | null },
  explorationStats: ExplorationStats,
  currentCycleExplored: boolean,
  /** Mood-driven learning rate: successes needed to trust a creator (default 3) */
  learningRate: number = 3,
): void {
  try {
    // Learning 1: Track creator tip success rates
    if (cycleResult.action === 'tip' && cycleResult.creatorName) {
      const key = `learn_creator_${cycleResult.creatorName.replace(/\s+/g, '_')}`;
      const existing = memory.recall(key);
      let stats = { tips: 0, successes: 0, totalAmount: 0 };
      if (existing) {
        try { stats = JSON.parse(existing.value); } catch { /* fresh start */ }
      }
      stats.tips++;
      if (cycleResult.success) {
        stats.successes++;
        stats.totalAmount += cycleResult.amount ?? 0;
      }
      memory.remember('fact', key, JSON.stringify(stats), 'observed');

      // If a creator has enough successful tips (mood-driven), mark as "trusted"
      // generous needs fewer (2), cautious needs more (5), strategic default (3)
      if (stats.successes >= learningRate) {
        memory.remember('preference', `trusted_creator_${cycleResult.creatorName.replace(/\s+/g, '_')}`, 'true', 'observed');
        trustedCreators.add(cycleResult.creatorName);
      }
    }

    // Learning 2: Track gas-vs-outcome correlation
    if (cycleResult.gasGwei !== undefined && cycleResult.gasGwei !== null) {
      const gasKey = 'learn_gas_outcomes';
      const existing = memory.recall(gasKey);
      let gasData = { samples: [] as Array<{ gwei: number; tipped: boolean }> };
      if (existing) {
        try { gasData = JSON.parse(existing.value); } catch { /* fresh */ }
      }
      gasData.samples.push({ gwei: cycleResult.gasGwei, tipped: cycleResult.action === 'tip' });
      if (gasData.samples.length > 50) gasData.samples = gasData.samples.slice(-50);

      const tippedSamples = gasData.samples.filter(s => s.tipped);
      if (tippedSamples.length >= 5) {
        const avgTipGas = tippedSamples.reduce((sum, s) => sum + s.gwei, 0) / tippedSamples.length;
        const threshold = Math.round(avgTipGas * 1.5);
        memory.remember('preference', 'learned_gas_threshold', String(threshold), 'observed');
        learnedGasThreshold.value = threshold;
      }
      memory.remember('fact', gasKey, JSON.stringify(gasData), 'observed');
    }

    // Learning 3: Track time-of-day patterns
    const hour = new Date().getHours();
    const timeKey = 'learn_time_patterns';
    const existing = memory.recall(timeKey);
    let timeData = { hourlyTips: new Array(24).fill(0) as number[], hourlySkips: new Array(24).fill(0) as number[] };
    if (existing) {
      try { timeData = JSON.parse(existing.value); } catch { /* fresh */ }
    }
    if (cycleResult.action === 'tip') {
      timeData.hourlyTips[hour] = (timeData.hourlyTips[hour] ?? 0) + 1;
    } else {
      timeData.hourlySkips[hour] = (timeData.hourlySkips[hour] ?? 0) + 1;
    }
    memory.remember('fact', timeKey, JSON.stringify(timeData), 'observed');

    // Learning 4: Track overall decision effectiveness
    const effectivenessKey = 'learn_effectiveness';
    const effExisting = memory.recall(effectivenessKey);
    let eff = { totalDecisions: 0, successfulTips: 0, failedTips: 0, goodSkips: 0 };
    if (effExisting) {
      try { eff = JSON.parse(effExisting.value); } catch { /* fresh */ }
    }
    eff.totalDecisions++;
    if (cycleResult.action === 'tip' && cycleResult.success) eff.successfulTips++;
    if (cycleResult.action === 'tip' && !cycleResult.success) eff.failedTips++;
    if (cycleResult.action === 'skip') eff.goodSkips++;
    memory.remember('fact', effectivenessKey, JSON.stringify(eff), 'observed');

    // Learning 5: Update epsilon-greedy exploration stats
    if (cycleResult.action === 'tip') {
      if (currentCycleExplored) {
        explorationStats.exploreTips++;
        if (cycleResult.success) explorationStats.exploreSuccesses++;
      } else {
        explorationStats.exploitTips++;
        if (cycleResult.success) explorationStats.exploitSuccesses++;
      }
    }

    logger.debug('Post-cycle learning completed', {
      action: cycleResult.action,
      creator: cycleResult.creatorName,
      explored: currentCycleExplored,
      learned: true,
    });
  } catch (err) {
    logger.debug('Learning step failed (non-critical)', { error: String(err) });
  }
}

/**
 * Persist learned state (trustedCreators, gasThreshold, bestHours) so it survives restarts.
 */
export function persistLearnedState(
  memory: MemoryServiceRef,
  trustedCreators: Set<string>,
  learnedGasThreshold: number | null,
  learnedBestHours: number[],
): void {
  try {
    for (const creator of trustedCreators) {
      const key = `trusted_creator_${creator.replace(/\s+/g, '_')}`;
      memory.remember('preference', key, 'true', 'observed');
    }

    if (learnedGasThreshold !== null) {
      memory.remember('preference', 'learned_gas_threshold', String(learnedGasThreshold), 'observed');
    }

    const timeData = memory.recall('learn_time_patterns');
    if (timeData) {
      try {
        const parsed = JSON.parse(timeData.value) as { hourlyTips: number[]; hourlySkips: number[] };
        learnedBestHours.length = 0;
        learnedBestHours.push(...parsed.hourlyTips
          .map((tips, hour) => ({ hour, ratio: tips / Math.max(1, tips + (parsed.hourlySkips[hour] ?? 0)) }))
          .filter(h => h.ratio > 0.6 && (parsed.hourlyTips[h.hour] ?? 0) >= 2)
          .map(h => h.hour));
      } catch { /* corrupted data, skip */ }
    }

    logger.debug('Persisted learned state', {
      trustedCreators: trustedCreators.size,
      gasThreshold: learnedGasThreshold,
      bestHours: learnedBestHours,
    });
  } catch (err) {
    logger.debug('Failed to persist learned state (non-critical)', { error: String(err) });
  }
}

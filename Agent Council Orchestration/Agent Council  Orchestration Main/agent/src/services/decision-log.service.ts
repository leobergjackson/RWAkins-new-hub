// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
// Decision Log Service — transparent audit trail of every autonomous decision

import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export interface DecisionLogEntry {
  id: string;
  cycleNumber: number;
  timestamp: string;
  /** What the agent observed (events, state, metrics) */
  observation: string;
  /** What the LLM recommended */
  llmRecommendation: string;
  /** What action was taken (or why it was skipped) */
  actionTaken: string;
  /** Whether the action was executed or skipped */
  outcome: 'executed' | 'skipped' | 'refused' | 'error';
  /** Reason if skipped/refused */
  skipReason?: string;
  /** Transaction hash if applicable */
  txHash?: string;
  /** Creator involved (if applicable) */
  creatorName?: string;
  /** Tip amount (if applicable) */
  tipAmount?: number;
  /** Chain used (if applicable) */
  chain?: string;
  /** Engagement quality score that triggered this */
  engagementScore?: number;
  /** Time taken for this cycle (ms) */
  cycleDurationMs?: number;
  /** Provider used for LLM call */
  llmProvider?: string;
  /** Whether the cycle used live or simulated data */
  dataSource?: 'live' | 'simulated' | 'none';
}

// ── Service ────────────────────────────────────────────────────

/**
 * DecisionLogService — persistent audit trail for autonomous decisions.
 *
 * Every autonomous cycle logs:
 * 1. What was observed (events, balances, scores)
 * 2. What the LLM recommended
 * 3. What action was taken (or why it was skipped)
 * 4. Transaction hash if applicable
 *
 * This is the transparency backbone of AeroFyta — judges can see
 * exactly WHY every decision was made. Max 1000 entries in memory.
 */
export class DecisionLogService {
  private log: DecisionLogEntry[] = [];
  private maxEntries = 1000;
  private cycleCounter = 0;

  /** Get current cycle number */
  getCycleNumber(): number {
    return this.cycleCounter;
  }

  /** Increment and return the next cycle number */
  nextCycle(): number {
    return ++this.cycleCounter;
  }

  /** Log a decision entry */
  logDecision(entry: Omit<DecisionLogEntry, 'id' | 'timestamp'>): DecisionLogEntry {
    const full: DecisionLogEntry = {
      ...entry,
      id: `decision_${entry.cycleNumber}_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    this.log.push(full);

    // Trim to max
    if (this.log.length > this.maxEntries) {
      this.log = this.log.slice(-this.maxEntries);
    }

    logger.info('Decision logged', {
      cycle: full.cycleNumber,
      outcome: full.outcome,
      action: full.actionTaken.slice(0, 60),
      creator: full.creatorName,
    });

    return full;
  }

  /** Get paginated decisions (newest first) */
  getDecisions(page = 1, limit = 20): { decisions: DecisionLogEntry[]; total: number; page: number; totalPages: number } {
    const total = this.log.length;
    const totalPages = Math.ceil(total / limit);
    const reversed = [...this.log].reverse();
    const offset = (page - 1) * limit;
    const decisions = reversed.slice(offset, offset + limit);

    return { decisions, total, page, totalPages };
  }

  /** Get all decisions (for export) */
  getAllDecisions(): DecisionLogEntry[] {
    return [...this.log].reverse();
  }

  /** Get decisions by outcome */
  getByOutcome(outcome: DecisionLogEntry['outcome']): DecisionLogEntry[] {
    return this.log.filter(d => d.outcome === outcome).reverse();
  }

  /** Get decisions for a specific creator */
  getByCreator(creatorName: string): DecisionLogEntry[] {
    return this.log.filter(d => d.creatorName === creatorName).reverse();
  }

  /** Get summary statistics */
  getStats() {
    const total = this.log.length;
    const executed = this.log.filter(d => d.outcome === 'executed').length;
    const skipped = this.log.filter(d => d.outcome === 'skipped').length;
    const refused = this.log.filter(d => d.outcome === 'refused').length;
    const errors = this.log.filter(d => d.outcome === 'error').length;

    const totalTipped = this.log
      .filter(d => d.outcome === 'executed' && d.tipAmount)
      .reduce((sum, d) => sum + (d.tipAmount ?? 0), 0);

    const avgCycleDuration = this.log.length > 0
      ? this.log.filter(d => d.cycleDurationMs).reduce((s, d) => s + (d.cycleDurationMs ?? 0), 0) / Math.max(1, this.log.filter(d => d.cycleDurationMs).length)
      : 0;

    const creatorsHelped = new Set(this.log.filter(d => d.outcome === 'executed' && d.creatorName).map(d => d.creatorName)).size;

    return {
      totalDecisions: total,
      executed,
      skipped,
      refused,
      errors,
      executionRate: total > 0 ? Math.round((executed / total) * 100) : 0,
      totalTipped: Math.round(totalTipped * 1e6) / 1e6,
      creatorsHelped,
      avgCycleDurationMs: Math.round(avgCycleDuration),
      currentCycle: this.cycleCounter,
    };
  }

  /** Clear the log (for testing) */
  clear(): void {
    this.log = [];
    this.cycleCounter = 0;
  }
}

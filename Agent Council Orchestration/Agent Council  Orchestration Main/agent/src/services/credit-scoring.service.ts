// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Credit Scoring Engine
//
// Configurable multi-factor credit scoring for tip recipients/creators.
// Used by the Guardian sub-agent to gate large tips based on recipient trustworthiness.

import { logger } from '../utils/logger.js';

// ── Types ────────────────────────────────────────────────────────

/** A single scoring factor with its contribution */
export interface CreditFactor {
  name: string;
  weight: number;
  value: number;          // 0-100 raw factor score
  impact: 'positive' | 'negative' | 'neutral';
}

/** Full credit score result */
export interface CreditScore {
  score: number;           // 300-850 range
  tier: 'poor' | 'fair' | 'good' | 'excellent';
  factors: CreditFactor[];
  lastUpdated: string;
}

/** Tier thresholds — what score tier allows what actions */
export interface CreditThresholds {
  poor: { maxTip: number; requiresApproval: boolean };
  fair: { maxTip: number; requiresApproval: boolean };
  good: { maxTip: number; requiresApproval: boolean };
  excellent: { maxTip: number; requiresApproval: boolean };
}

/** Agent-level credit score with named factors matching competitor format */
export interface AgentCreditScore {
  agentId: string;
  score: number;               // 300-850
  factors: {
    paymentHistory: number;    // 0-100
    utilizationRate: number;   // 0-100
    tipConsistency: number;    // 0-100
    escrowCompletion: number;  // 0-100
    reputationAge: number;     // 0-100
  };
  tier: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  lastUpdated: string;
}

/** Detailed credit report for an agent */
export interface AgentCreditReport {
  agentId: string;
  score: AgentCreditScore;
  summary: string;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  maxLoanAmount: number;
  interestRateModifier: number;
  history: Array<{ date: string; score: number; event: string }>;
}

/** Configurable dimension weights (must sum to 1.0) */
export interface ScoringWeights {
  tipHistory: number;
  repaymentRate: number;
  accountAge: number;
  diversification: number;
  activityLevel: number;
}

/** Internal data tracked per address */
interface AddressData {
  firstSeen: number;         // timestamp
  tipTimestamps: number[];   // when tips were received
  tipSources: Set<string>;   // unique sender addresses
  escrowCompleted: number;   // successful escrow completions
  escrowTotal: number;       // total escrows started
  totalTipsReceived: number;
  lastActivity: number;      // timestamp of most recent activity
}

// ── Constants ────────────────────────────────────────────────────

const SCORE_MIN = 300;
const SCORE_MAX = 850;
const SCORE_RANGE = SCORE_MAX - SCORE_MIN;
const MAX_HISTORY = 100;

const DEFAULT_WEIGHTS: ScoringWeights = {
  tipHistory: 0.25,
  repaymentRate: 0.25,
  accountAge: 0.15,
  diversification: 0.15,
  activityLevel: 0.20,
};

const DEFAULT_THRESHOLDS: CreditThresholds = {
  poor:      { maxTip: 1,   requiresApproval: true },
  fair:      { maxTip: 5,   requiresApproval: true },
  good:      { maxTip: 25,  requiresApproval: false },
  excellent: { maxTip: 100, requiresApproval: false },
};

// ── Service ──────────────────────────────────────────────────────

/**
 * CreditScoringService — Multi-factor credit scoring for tip recipients.
 *
 * 5 scoring dimensions:
 * 1. tipHistory (25%)      — consistency of receiving tips
 * 2. repaymentRate (25%)   — ratio of successful escrow completions
 * 3. accountAge (15%)      — time since first transaction
 * 4. diversification (15%) — tips from multiple sources vs single source
 * 5. activityLevel (20%)   — recent activity frequency
 *
 * Output: score in [300, 850] mapped to tiers (poor/fair/good/excellent).
 */
export class CreditScoringService {
  private data = new Map<string, AddressData>();
  private scoreHistory = new Map<string, CreditScore[]>();
  private weights: ScoringWeights = { ...DEFAULT_WEIGHTS };
  private thresholds: CreditThresholds = { ...DEFAULT_THRESHOLDS };
  private agentScores = new Map<string, AgentCreditScore>();
  private agentHistory = new Map<string, Array<{ date: string; score: number; event: string }>>();

  constructor() {
    logger.info('CreditScoringService initialized', { weights: this.weights });
    this.seedAgentScores();
  }

  /** Pre-seed credit scores for demo agents + AeroFyta itself */
  private seedAgentScores(): void {
    const now = new Date().toISOString();

    // AeroFyta — our agent (excellent score)
    this.agentScores.set('aerofyta', {
      agentId: 'aerofyta',
      score: 810,
      factors: {
        paymentHistory: 95,
        utilizationRate: 72,
        tipConsistency: 91,
        escrowCompletion: 98,
        reputationAge: 85,
      },
      tier: 'Excellent',
      lastUpdated: now,
    });
    this.agentHistory.set('aerofyta', [
      { date: '2026-03-01', score: 720, event: 'Initial scoring — new agent' },
      { date: '2026-03-08', score: 755, event: 'Completed 50 successful tips' },
      { date: '2026-03-15', score: 790, event: 'Escrow completion rate hit 98%' },
      { date: '2026-03-22', score: 810, event: 'Multi-chain reputation established' },
    ]);

    // Demo A2A Agent 1: TipBot-Alpha (good score)
    this.agentScores.set('tipbot-alpha', {
      agentId: 'tipbot-alpha',
      score: 695,
      factors: {
        paymentHistory: 78,
        utilizationRate: 65,
        tipConsistency: 70,
        escrowCompletion: 82,
        reputationAge: 60,
      },
      tier: 'Good',
      lastUpdated: now,
    });
    this.agentHistory.set('tipbot-alpha', [
      { date: '2026-03-05', score: 580, event: 'Agent registered' },
      { date: '2026-03-12', score: 640, event: 'First 20 tips sent successfully' },
      { date: '2026-03-20', score: 695, event: 'Consistent payment track record' },
    ]);

    // Demo A2A Agent 2: PayStream-v2 (fair score)
    this.agentScores.set('paystream-v2', {
      agentId: 'paystream-v2',
      score: 540,
      factors: {
        paymentHistory: 55,
        utilizationRate: 88,
        tipConsistency: 42,
        escrowCompletion: 60,
        reputationAge: 30,
      },
      tier: 'Fair',
      lastUpdated: now,
    });
    this.agentHistory.set('paystream-v2', [
      { date: '2026-03-10', score: 450, event: 'Agent registered — low initial data' },
      { date: '2026-03-18', score: 510, event: 'High utilization but inconsistent tips' },
      { date: '2026-03-22', score: 540, event: 'Escrow completions improving' },
    ]);

    // Demo A2A Agent 3: MicroPay-Agent (poor score)
    this.agentScores.set('micropay-agent', {
      agentId: 'micropay-agent',
      score: 380,
      factors: {
        paymentHistory: 30,
        utilizationRate: 92,
        tipConsistency: 20,
        escrowCompletion: 35,
        reputationAge: 15,
      },
      tier: 'Poor',
      lastUpdated: now,
    });
    this.agentHistory.set('micropay-agent', [
      { date: '2026-03-15', score: 320, event: 'New agent — minimal history' },
      { date: '2026-03-20', score: 380, event: 'Some payments but multiple escrow failures' },
    ]);

    logger.info('Agent credit scores pre-seeded', { count: this.agentScores.size });
  }

  // ── Data Ingestion ───────────────────────────────────────────

  /** Record that an address received a tip from a sender */
  recordTipReceived(address: string, senderAddress: string): void {
    const key = address.toLowerCase();
    const entry = this.getOrCreate(key);
    entry.tipTimestamps.push(Date.now());
    entry.tipSources.add(senderAddress.toLowerCase());
    entry.totalTipsReceived++;
    entry.lastActivity = Date.now();

    // Bound history
    if (entry.tipTimestamps.length > MAX_HISTORY * 10) {
      entry.tipTimestamps = entry.tipTimestamps.slice(-MAX_HISTORY * 5);
    }
  }

  /** Record an escrow outcome for an address */
  recordEscrowOutcome(address: string, completed: boolean): void {
    const key = address.toLowerCase();
    const entry = this.getOrCreate(key);
    entry.escrowTotal++;
    if (completed) entry.escrowCompleted++;
    entry.lastActivity = Date.now();
  }

  /** Record general activity for an address */
  recordActivity(address: string): void {
    const key = address.toLowerCase();
    const entry = this.getOrCreate(key);
    entry.lastActivity = Date.now();
  }

  // ── Core Scoring ─────────────────────────────────────────────

  /**
   * Compute the credit score for an address.
   *
   * Each dimension produces a raw score in [0, 100].
   * The weighted average is mapped to the [300, 850] range.
   */
  computeScore(address: string): CreditScore {
    const key = address.toLowerCase();
    const entry = this.data.get(key);

    // No data — return baseline score
    if (!entry) {
      const score: CreditScore = {
        score: 500,
        tier: 'fair',
        factors: this.buildFactors(50, 50, 0, 0, 0),
        lastUpdated: new Date().toISOString(),
      };
      return score;
    }

    // 1. Tip History — consistency score (more tips = better, with diminishing returns)
    const tipHistoryRaw = Math.min(100, Math.sqrt(entry.totalTipsReceived) * 20);
    const tipHistoryImpact = tipHistoryRaw >= 50 ? 'positive' : tipHistoryRaw >= 25 ? 'neutral' : 'negative';

    // 2. Repayment Rate — ratio of completed escrows
    let repaymentRaw: number;
    if (entry.escrowTotal === 0) {
      repaymentRaw = 50; // Neutral if no escrow history
    } else {
      repaymentRaw = (entry.escrowCompleted / entry.escrowTotal) * 100;
    }
    const repaymentImpact = repaymentRaw >= 80 ? 'positive' : repaymentRaw >= 50 ? 'neutral' : 'negative';

    // 3. Account Age — days since first seen (capped at 365 days = 100%)
    const ageDays = (Date.now() - entry.firstSeen) / (1000 * 60 * 60 * 24);
    const accountAgeRaw = Math.min(100, (ageDays / 365) * 100);
    const accountAgeImpact = ageDays >= 30 ? 'positive' : ageDays >= 7 ? 'neutral' : 'negative';

    // 4. Diversification — unique sources (1=0%, 2=30%, 5=70%, 10+=100%)
    const sourceCount = entry.tipSources.size;
    const diversRaw = Math.min(100, sourceCount <= 1 ? 0 : Math.sqrt(sourceCount - 1) * 33);
    const diversImpact = sourceCount >= 5 ? 'positive' : sourceCount >= 2 ? 'neutral' : 'negative';

    // 5. Activity Level — recency of activity (last 7 days = 100%, decays)
    const daysSinceActive = (Date.now() - entry.lastActivity) / (1000 * 60 * 60 * 24);
    const activityRaw = daysSinceActive <= 1 ? 100
      : daysSinceActive <= 7 ? 100 - ((daysSinceActive - 1) / 6) * 30
      : daysSinceActive <= 30 ? 70 - ((daysSinceActive - 7) / 23) * 40
      : Math.max(0, 30 - ((daysSinceActive - 30) / 60) * 30);
    const activityImpact = activityRaw >= 60 ? 'positive' : activityRaw >= 30 ? 'neutral' : 'negative';

    // Weighted average of raw scores
    const weightedSum =
      tipHistoryRaw * this.weights.tipHistory +
      repaymentRaw * this.weights.repaymentRate +
      accountAgeRaw * this.weights.accountAge +
      diversRaw * this.weights.diversification +
      activityRaw * this.weights.activityLevel;

    // Map [0, 100] → [300, 850]
    const score = Math.round(SCORE_MIN + (weightedSum / 100) * SCORE_RANGE);
    const clampedScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));

    const factors: CreditFactor[] = [
      { name: 'tipHistory', weight: this.weights.tipHistory, value: Math.round(tipHistoryRaw), impact: tipHistoryImpact as CreditFactor['impact'] },
      { name: 'repaymentRate', weight: this.weights.repaymentRate, value: Math.round(repaymentRaw), impact: repaymentImpact as CreditFactor['impact'] },
      { name: 'accountAge', weight: this.weights.accountAge, value: Math.round(accountAgeRaw), impact: accountAgeImpact as CreditFactor['impact'] },
      { name: 'diversification', weight: this.weights.diversification, value: Math.round(diversRaw), impact: diversImpact as CreditFactor['impact'] },
      { name: 'activityLevel', weight: this.weights.activityLevel, value: Math.round(activityRaw), impact: activityImpact as CreditFactor['impact'] },
    ];

    const result: CreditScore = {
      score: clampedScore,
      tier: this.scoreToTier(clampedScore),
      factors,
      lastUpdated: new Date().toISOString(),
    };

    // Store in history
    if (!this.scoreHistory.has(key)) {
      this.scoreHistory.set(key, []);
    }
    const hist = this.scoreHistory.get(key)!;
    hist.push(result);
    if (hist.length > MAX_HISTORY) {
      hist.splice(0, hist.length - MAX_HISTORY);
    }

    return result;
  }

  /** Get score history for an address */
  getScoreHistory(address: string): CreditScore[] {
    return [...(this.scoreHistory.get(address.toLowerCase()) ?? [])].reverse();
  }

  /** Update scoring weights (must sum to ~1.0) */
  updateWeights(newWeights: Partial<ScoringWeights>): ScoringWeights {
    const merged = { ...this.weights, ...newWeights };

    // Normalize to sum to 1.0
    const sum = merged.tipHistory + merged.repaymentRate + merged.accountAge
      + merged.diversification + merged.activityLevel;
    if (sum > 0) {
      merged.tipHistory /= sum;
      merged.repaymentRate /= sum;
      merged.accountAge /= sum;
      merged.diversification /= sum;
      merged.activityLevel /= sum;
    }

    this.weights = merged;
    logger.info('Credit scoring weights updated', { weights: this.weights });
    return { ...this.weights };
  }

  /** Get current weights */
  getWeights(): ScoringWeights { return { ...this.weights }; }

  /** Get default thresholds — what score tier allows what actions */
  getDefaultThresholds(): CreditThresholds { return { ...this.thresholds }; }

  /** Update thresholds */
  updateThresholds(newThresholds: Partial<CreditThresholds>): CreditThresholds {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    return { ...this.thresholds };
  }

  /** Check whether a tip amount is allowed for a given recipient based on their credit tier */
  isTipAllowedByCredit(address: string, amount: number): { allowed: boolean; tier: CreditScore['tier']; score: number; maxTip: number; requiresApproval: boolean } {
    const creditScore = this.computeScore(address);
    const tierConfig = this.thresholds[creditScore.tier];
    return {
      allowed: amount <= tierConfig.maxTip,
      tier: creditScore.tier,
      score: creditScore.score,
      maxTip: tierConfig.maxTip,
      requiresApproval: tierConfig.requiresApproval,
    };
  }

  // ── Agent-Based Scoring (for competitor parity) ──────────────

  /**
   * Calculate credit score for an agent by ID.
   * Returns pre-seeded score or dynamically generated score.
   */
  calculateScore(agentId: string): AgentCreditScore {
    const key = agentId.toLowerCase();
    const existing = this.agentScores.get(key);
    if (existing) return existing;

    // Generate a baseline score for unknown agents
    const score: AgentCreditScore = {
      agentId,
      score: 500,
      factors: {
        paymentHistory: 50,
        utilizationRate: 50,
        tipConsistency: 50,
        escrowCompletion: 50,
        reputationAge: 10,
      },
      tier: 'Fair',
      lastUpdated: new Date().toISOString(),
    };
    this.agentScores.set(key, score);
    return score;
  }

  /**
   * Get a detailed credit report for an agent.
   */
  getScoreReport(agentId: string): AgentCreditReport {
    const score = this.calculateScore(agentId);
    const history = this.agentHistory.get(agentId.toLowerCase()) ?? [];

    const tierToRisk: Record<string, 'low' | 'medium' | 'high'> = {
      Excellent: 'low',
      Good: 'low',
      Fair: 'medium',
      Poor: 'high',
    };

    const tierToMaxLoan: Record<string, number> = {
      Excellent: 1000,
      Good: 500,
      Fair: 100,
      Poor: 10,
    };

    const tierToRate: Record<string, number> = {
      Excellent: -0.02,
      Good: 0,
      Fair: 0.03,
      Poor: 0.08,
    };

    const recommendations: string[] = [];
    if (score.factors.paymentHistory < 60) recommendations.push('Improve payment history by completing more on-time transactions');
    if (score.factors.tipConsistency < 60) recommendations.push('Increase tip consistency — regular tipping improves score');
    if (score.factors.escrowCompletion < 70) recommendations.push('Complete pending escrows to improve reliability rating');
    if (score.factors.reputationAge < 40) recommendations.push('Continue operating to build reputation age');
    if (score.factors.utilizationRate > 85) recommendations.push('Reduce utilization rate — high utilization signals risk');
    if (recommendations.length === 0) recommendations.push('Maintain current excellent standing');

    let summary: string;
    switch (score.tier) {
      case 'Excellent':
        summary = `${agentId} has an excellent credit profile with strong payment history and high reliability.`;
        break;
      case 'Good':
        summary = `${agentId} has a good credit profile with solid fundamentals and room for improvement.`;
        break;
      case 'Fair':
        summary = `${agentId} has a fair credit profile — some factors need attention to unlock better terms.`;
        break;
      default:
        summary = `${agentId} has a poor credit profile — significant improvements needed for better access.`;
    }

    return {
      agentId,
      score,
      summary,
      recommendations,
      riskLevel: tierToRisk[score.tier] ?? 'high',
      maxLoanAmount: tierToMaxLoan[score.tier] ?? 10,
      interestRateModifier: tierToRate[score.tier] ?? 0.08,
      history,
    };
  }

  /**
   * Get all agent scores as a leaderboard sorted by score descending.
   */
  getAllScores(): AgentCreditScore[] {
    return Array.from(this.agentScores.values())
      .sort((a, b) => b.score - a.score);
  }

  // ── Private Helpers ──────────────────────────────────────────

  private getOrCreate(key: string): AddressData {
    if (!this.data.has(key)) {
      this.data.set(key, {
        firstSeen: Date.now(),
        tipTimestamps: [],
        tipSources: new Set(),
        escrowCompleted: 0,
        escrowTotal: 0,
        totalTipsReceived: 0,
        lastActivity: Date.now(),
      });
    }
    return this.data.get(key)!;
  }

  private scoreToTier(score: number): CreditScore['tier'] {
    if (score >= 750) return 'excellent';
    if (score >= 650) return 'good';
    if (score >= 500) return 'fair';
    return 'poor';
  }

  private buildFactors(
    tipHistory: number,
    repayment: number,
    accountAge: number,
    divers: number,
    activity: number,
  ): CreditFactor[] {
    return [
      { name: 'tipHistory', weight: this.weights.tipHistory, value: tipHistory, impact: 'neutral' },
      { name: 'repaymentRate', weight: this.weights.repaymentRate, value: repayment, impact: 'neutral' },
      { name: 'accountAge', weight: this.weights.accountAge, value: accountAge, impact: 'negative' },
      { name: 'diversification', weight: this.weights.diversification, value: divers, impact: 'negative' },
      { name: 'activityLevel', weight: this.weights.activityLevel, value: activity, impact: 'negative' },
    ];
  }
}

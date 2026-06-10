// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Social Reputation Engine

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';
import type { ChainId } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = resolve(__dirname, '..', '..', '.reputation.json');

/** Reputation tier levels */
export type ReputationTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

/** Creator reputation profile */
export interface CreatorReputation {
  address: string;
  name?: string;
  score: number;          // 0-1000
  rawScore: number;       // before decay
  tier: ReputationTier;
  totalReceived: number;
  tipCount: number;
  uniqueTippers: Set<string> extends never ? number : number; // serialized as number
  uniqueTippersList: string[];
  avgTipAmount: number;
  firstTipAt: string;
  lastTipAt: string;
  scoreHistory: Array<{ date: string; score: number }>;
  chains: ChainId[];
}

/** Reputation history point for trending */
export interface ReputationHistoryPoint {
  date: string;
  score: number;
  decayedScore: number;
  tier: ReputationTier;
}

/** Serialized form for persistence (Sets don't serialize) */
interface CreatorReputationData {
  address: string;
  name?: string;
  rawScore: number;
  totalReceived: number;
  tipCount: number;
  uniqueTippersList: string[];
  avgTipAmount: number;
  firstTipAt: string;
  lastTipAt: string;
  scoreHistory: Array<{ date: string; score: number }>;
  chains: ChainId[];
  /** Weighted tip total — tips from high-reputation tippers count more */
  weightedTipTotal: number;
  /** Last date when daily decay was applied */
  lastDecayDate?: string;
}

/** Recommendation for who to tip */
export interface ReputationRecommendation {
  address: string;
  name?: string;
  score: number;
  tier: ReputationTier;
  reason: string;
  suggestedAmount: string;
  confidence: number;     // 0-100
}

/** Scoring configuration */
export interface ReputationConfig {
  volumeWeight: number;
  frequencyWeight: number;
  uniqueTippersWeight: number;
  recencyWeight: number;
  decayHalfLifeDays: number;
  tierThresholds: Record<ReputationTier, number>;
}

const DEFAULT_CONFIG: ReputationConfig = {
  volumeWeight: 0.3,
  frequencyWeight: 0.25,
  uniqueTippersWeight: 0.25,
  recencyWeight: 0.2,
  decayHalfLifeDays: 14,
  tierThresholds: {
    bronze: 0,
    silver: 201,
    gold: 401,
    platinum: 601,
    diamond: 801,
  },
};

export class ReputationService {
  private reputations = new Map<string, CreatorReputationData>();
  private config: ReputationConfig = { ...DEFAULT_CONFIG };

  constructor() {
    this.load();
  }

  /** Record a tip to update recipient's reputation */
  recordTip(from: string, to: string, amount: number, chainId: ChainId): void {
    // Apply daily decay before processing new tip
    this.applyDailyDecayAll();

    let data = this.reputations.get(to);
    const now = new Date().toISOString();

    if (!data) {
      data = {
        address: to,
        rawScore: 0,
        totalReceived: 0,
        tipCount: 0,
        uniqueTippersList: [],
        avgTipAmount: 0,
        firstTipAt: now,
        lastTipAt: now,
        scoreHistory: [],
        chains: [],
        weightedTipTotal: 0,
      };
    }

    // Weighted scoring: tips from high-reputation tippers count more
    const tipperData = this.reputations.get(from);
    let tipWeight = 1.0;
    if (tipperData) {
      const tipperScore = this.applyDecay(tipperData);
      const tipperTier = this.getTier(tipperScore);
      // Diamond tipper = 2x weight, platinum = 1.7x, gold = 1.4x, silver = 1.2x
      if (tipperTier === 'diamond') tipWeight = 2.0;
      else if (tipperTier === 'platinum') tipWeight = 1.7;
      else if (tipperTier === 'gold') tipWeight = 1.4;
      else if (tipperTier === 'silver') tipWeight = 1.2;
    }

    // Update stats
    data.tipCount += 1;
    data.totalReceived += amount;
    data.weightedTipTotal = (data.weightedTipTotal ?? 0) + amount * tipWeight;
    data.avgTipAmount = data.totalReceived / data.tipCount;
    data.lastTipAt = now;

    if (!data.uniqueTippersList.includes(from)) {
      data.uniqueTippersList.push(from);
    }

    if (!data.chains.includes(chainId)) {
      data.chains.push(chainId);
    }

    // Recalculate raw score
    data.rawScore = this.calculateRawScore(data);

    // Add to score history (daily granularity)
    const today = now.slice(0, 10);
    const lastEntry = data.scoreHistory[data.scoreHistory.length - 1];
    if (!lastEntry || lastEntry.date !== today) {
      data.scoreHistory.push({ date: today, score: data.rawScore });
      // Keep last 90 days
      if (data.scoreHistory.length > 90) {
        data.scoreHistory = data.scoreHistory.slice(-90);
      }
    } else {
      lastEntry.score = data.rawScore;
    }

    this.reputations.set(to, data);
    this.persist();

    logger.info('Reputation updated', {
      address: to,
      rawScore: data.rawScore,
      tipCount: data.tipCount,
      tier: this.getTier(this.applyDecay(data)),
    });
  }

  /** Calculate raw score (before decay), incorporating weighted tip value */
  private calculateRawScore(data: CreatorReputationData): number {
    // Use weighted tip total if available (tips from high-rep tippers count more)
    const effectiveVolume = (data.weightedTipTotal ?? data.totalReceived) || data.totalReceived;

    // Normalize each dimension to 0-1000 using logarithmic scaling
    const volumeScore = Math.min(1000, Math.log10(effectiveVolume + 1) * 300);
    const frequencyScore = Math.min(1000, Math.log10(data.tipCount + 1) * 400);
    const uniqueScore = Math.min(1000, data.uniqueTippersList.length * 200);

    // Recency: full score if tipped today, decays over days
    const daysSinceLast = (Date.now() - new Date(data.lastTipAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1000 - daysSinceLast * 50);

    return Math.round(
      volumeScore * this.config.volumeWeight +
      frequencyScore * this.config.frequencyWeight +
      uniqueScore * this.config.uniqueTippersWeight +
      recencyScore * this.config.recencyWeight
    );
  }

  /** Apply time-decay to a score */
  private applyDecay(data: CreatorReputationData): number {
    const daysSinceLast = (Date.now() - new Date(data.lastTipAt).getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.pow(0.5, daysSinceLast / this.config.decayHalfLifeDays);
    return Math.round(data.rawScore * decayFactor);
  }

  /** Get tier from score */
  private getTier(score: number): ReputationTier {
    if (score >= this.config.tierThresholds.diamond) return 'diamond';
    if (score >= this.config.tierThresholds.platinum) return 'platinum';
    if (score >= this.config.tierThresholds.gold) return 'gold';
    if (score >= this.config.tierThresholds.silver) return 'silver';
    return 'bronze';
  }

  /** Get reputation for a specific address */
  getReputation(address: string): CreatorReputation | null {
    const data = this.reputations.get(address);
    if (!data) return null;

    const score = this.applyDecay(data);
    return {
      address: data.address,
      name: data.name,
      score,
      rawScore: data.rawScore,
      tier: this.getTier(score),
      totalReceived: data.totalReceived,
      tipCount: data.tipCount,
      uniqueTippers: data.uniqueTippersList.length,
      uniqueTippersList: data.uniqueTippersList,
      avgTipAmount: data.avgTipAmount,
      firstTipAt: data.firstTipAt,
      lastTipAt: data.lastTipAt,
      scoreHistory: data.scoreHistory,
      chains: data.chains,
    };
  }

  /** Get leaderboard sorted by decayed score */
  getLeaderboard(limit = 20): CreatorReputation[] {
    const all: CreatorReputation[] = [];
    for (const data of this.reputations.values()) {
      const score = this.applyDecay(data);
      all.push({
        address: data.address,
        name: data.name,
        score,
        rawScore: data.rawScore,
        tier: this.getTier(score),
        totalReceived: data.totalReceived,
        tipCount: data.tipCount,
        uniqueTippers: data.uniqueTippersList.length,
        uniqueTippersList: data.uniqueTippersList,
        avgTipAmount: data.avgTipAmount,
        firstTipAt: data.firstTipAt,
        lastTipAt: data.lastTipAt,
        scoreHistory: data.scoreHistory,
        chains: data.chains,
      });
    }
    return all.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /** Get AI-powered recommendations for who to tip */
  getRecommendations(budget: number, count = 5): ReputationRecommendation[] {
    const leaderboard = this.getLeaderboard(50);
    if (leaderboard.length === 0) return [];

    const recommendations: ReputationRecommendation[] = [];
    const perRecipient = budget / Math.min(count, leaderboard.length);

    for (const creator of leaderboard.slice(0, count)) {
      // Weight suggested amount by score
      const scoreRatio = creator.score / 1000;
      const suggestedAmount = (perRecipient * (0.5 + scoreRatio * 0.5)).toFixed(4);

      let reason: string;
      if (creator.tier === 'diamond') {
        reason = 'Top-tier creator with exceptional engagement';
      } else if (creator.tier === 'platinum') {
        reason = 'High-reputation creator with consistent tipping activity';
      } else if (creator.tier === 'gold') {
        reason = 'Growing creator with strong community support';
      } else if (creator.uniqueTippers > 3) {
        reason = 'Popular creator with diverse supporter base';
      } else if (creator.tipCount > 5) {
        reason = 'Active creator with frequent tipping interactions';
      } else {
        reason = 'Rising star — early supporter bonus opportunity';
      }

      recommendations.push({
        address: creator.address,
        name: creator.name,
        score: creator.score,
        tier: creator.tier,
        reason,
        suggestedAmount,
        confidence: Math.min(95, Math.round(50 + creator.score / 20)),
      });
    }

    return recommendations;
  }

  /**
   * Apply daily decay: reputation scores decay by 1% per day of inactivity.
   * This is applied lazily — called before score reads and new tip recording.
   * Only decays creators who haven't received a tip since the last decay date.
   */
  private applyDailyDecayAll(): void {
    const today = new Date().toISOString().slice(0, 10);

    for (const [address, data] of this.reputations.entries()) {
      const lastDecay = data.lastDecayDate ?? data.lastTipAt.slice(0, 10);
      if (lastDecay >= today) continue; // Already decayed today

      // Calculate inactive days since last decay
      const lastDecayDate = new Date(lastDecay);
      const todayDate = new Date(today);
      const inactiveDays = Math.floor((todayDate.getTime() - lastDecayDate.getTime()) / (1000 * 60 * 60 * 24));

      if (inactiveDays > 0) {
        // Also check if they received a tip today — if so, no decay
        const lastTipDate = data.lastTipAt.slice(0, 10);
        if (lastTipDate >= today) {
          data.lastDecayDate = today;
          continue;
        }

        // Decay 1% per inactive day (compound)
        const decayFactor = Math.pow(0.99, inactiveDays);
        data.rawScore = Math.round(data.rawScore * decayFactor);
        data.lastDecayDate = today;

        // Log significant decay
        if (inactiveDays >= 7) {
          logger.debug('Reputation decayed due to inactivity', {
            address: address.slice(0, 12),
            inactiveDays,
            newRawScore: data.rawScore,
          });
        }
      }
    }
  }

  /**
   * Get reputation history for a specific creator — score over time
   * with decay applied at each historical point.
   */
  getReputationHistory(creatorId: string): ReputationHistoryPoint[] {
    const data = this.reputations.get(creatorId);
    if (!data || data.scoreHistory.length === 0) return [];

    const now = Date.now();
    return data.scoreHistory.map(point => {
      const daysSince = (now - new Date(point.date).getTime()) / (1000 * 60 * 60 * 24);
      // Apply both the half-life decay and the 1% daily decay
      const halfLifeDecay = Math.pow(0.5, daysSince / this.config.decayHalfLifeDays);
      const dailyDecay = Math.pow(0.99, daysSince);
      const decayedScore = Math.round(point.score * halfLifeDecay * dailyDecay);
      return {
        date: point.date,
        score: point.score,
        decayedScore,
        tier: this.getTier(decayedScore),
      };
    });
  }

  /** Get current config */
  getConfig(): ReputationConfig {
    return { ...this.config };
  }

  /** Update scoring config */
  updateConfig(updates: Partial<ReputationConfig>): ReputationConfig {
    Object.assign(this.config, updates);
    logger.info('Reputation config updated', { config: this.config });
    return this.config;
  }

  /** Get total number of tracked creators */
  getCreatorCount(): number {
    return this.reputations.size;
  }

  /** Load from disk */
  private load(): void {
    try {
      if (existsSync(DATA_FILE)) {
        const raw = readFileSync(DATA_FILE, 'utf-8');
        const entries: CreatorReputationData[] = JSON.parse(raw);
        for (const entry of entries) {
          this.reputations.set(entry.address, entry);
        }
        logger.info(`Loaded ${this.reputations.size} creator reputations`);
      }
    } catch (err) {
      logger.warn('Failed to load reputation data', { error: String(err) });
    }
  }

  /** Persist to disk */
  private persist(): void {
    try {
      const entries = Array.from(this.reputations.values());
      writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to persist reputation data', { error: String(err) });
    }
  }
}

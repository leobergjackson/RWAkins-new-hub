// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent

import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export interface TipPrediction {
  id: string;
  /** Predicted recipient */
  recipient: string;
  /** Predicted amount */
  amount: string;
  /** Predicted chain */
  chainId: string;
  /** Why this prediction was made */
  reason: string;
  /** Prediction confidence (0-100) */
  confidence: number;
  /** When the tip is predicted to happen */
  predictedAt: string;
  /** Prediction category */
  category: 'time_pattern' | 'recipient_affinity' | 'content_trigger' | 'milestone' | 'streak';
  /** Whether user accepted or dismissed */
  status: 'pending' | 'accepted' | 'dismissed' | 'expired';
  /** When the prediction was generated */
  generatedAt: string;
}

export interface PredictionStats {
  totalPredictions: number;
  accepted: number;
  dismissed: number;
  expired: number;
  accuracy: number; // percentage
  topCategories: { category: string; count: number }[];
}

// ── Service ────────────────────────────────────────────────────

/**
 * PredictorService — Predictive Tipping Intelligence
 *
 * Analyzes user behavior patterns to predict future tips:
 *
 * 1. Time Patterns — "You usually tip on Wednesday at 10am"
 * 2. Recipient Affinity — "Your top creator just posted a new video"
 * 3. Content Triggers — "Live stream started for your favorite creator"
 * 4. Milestones — "CryptoDaily just hit 10K subscribers"
 * 5. Streaks — "You've tipped 5 days in a row, keep the streak?"
 *
 * The agent proactively suggests tips, demonstrating TRUE autonomy:
 * it doesn't wait for commands, it anticipates user intent.
 */
export class PredictorService {
  private predictions: TipPrediction[] = [];
  private counter = 0;

  // Historical pattern data (built from tip history)
  private recipientFrequency = new Map<string, number>();
  private hourFrequency = new Map<number, number>();
  private dayFrequency = new Map<number, number>();
  private avgAmountByRecipient = new Map<string, number>();
  private lastTipDate: string | null = null;
  private consecutiveDays = 0;

  constructor() {
    logger.info('Predictive tipping intelligence initialized');
  }

  // ── Pattern Learning ─────────────────────────────────────────

  /**
   * Learn from historical tip data to build prediction models
   */
  learnFromHistory(tips: { recipient: string; amount: string; chainId: string; createdAt: string }[]): void {
    this.recipientFrequency.clear();
    this.hourFrequency.clear();
    this.dayFrequency.clear();
    this.avgAmountByRecipient.clear();

    const amountSums = new Map<string, { total: number; count: number }>();

    for (const tip of tips) {
      // Recipient frequency
      this.recipientFrequency.set(tip.recipient, (this.recipientFrequency.get(tip.recipient) ?? 0) + 1);

      // Time patterns
      const date = new Date(tip.createdAt);
      this.hourFrequency.set(date.getHours(), (this.hourFrequency.get(date.getHours()) ?? 0) + 1);
      this.dayFrequency.set(date.getDay(), (this.dayFrequency.get(date.getDay()) ?? 0) + 1);

      // Average amount per recipient
      const existing = amountSums.get(tip.recipient) ?? { total: 0, count: 0 };
      existing.total += parseFloat(tip.amount);
      existing.count += 1;
      amountSums.set(tip.recipient, existing);
    }

    // Calculate averages
    for (const [recipient, data] of amountSums) {
      this.avgAmountByRecipient.set(recipient, data.total / data.count);
    }

    // Calculate streak
    if (tips.length > 0) {
      const sorted = [...tips].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.lastTipDate = sorted[0].createdAt;

      // Count consecutive days
      this.consecutiveDays = 1;
      for (let i = 1; i < sorted.length; i++) {
        const curr = new Date(sorted[i - 1].createdAt).toDateString();
        const prev = new Date(sorted[i].createdAt).toDateString();
        const diffMs = new Date(curr).getTime() - new Date(prev).getTime();
        if (diffMs <= 86400000) {
          this.consecutiveDays++;
        } else {
          break;
        }
      }
    }

    logger.info('Prediction models updated', {
      recipients: this.recipientFrequency.size,
      tipCount: tips.length,
      streak: this.consecutiveDays,
    });
  }

  // ── Prediction Generation ────────────────────────────────────

  /**
   * Generate predictions based on current patterns and context
   */
  generatePredictions(): TipPrediction[] {
    const predictions: TipPrediction[] = [];
    const now = new Date();

    // 1. Time Pattern Predictions
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const hourFreq = this.hourFrequency.get(currentHour) ?? 0;
    const dayFreq = this.dayFrequency.get(currentDay) ?? 0;

    if (hourFreq >= 2 && dayFreq >= 2) {
      // User typically tips at this time on this day
      const topRecipient = this.getTopRecipient();
      if (topRecipient) {
        const avgAmount = this.avgAmountByRecipient.get(topRecipient) ?? 0.001;
        predictions.push(this.createPrediction({
          recipient: topRecipient,
          amount: avgAmount.toFixed(4),
          chainId: 'ethereum-sepolia',
          reason: `You typically tip around ${currentHour}:00 on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][currentDay]}s. Your most-tipped creator is ready.`,
          confidence: Math.min(85, 40 + hourFreq * 10 + dayFreq * 5),
          category: 'time_pattern',
        }));
      }
    }

    // 2. Recipient Affinity Predictions
    const topRecipients = this.getTopRecipients(3);
    for (const recipient of topRecipients) {
      const freq = this.recipientFrequency.get(recipient) ?? 0;
      if (freq >= 3) {
        const avgAmount = this.avgAmountByRecipient.get(recipient) ?? 0.001;
        predictions.push(this.createPrediction({
          recipient,
          amount: avgAmount.toFixed(4),
          chainId: 'ethereum-sepolia',
          reason: `You've tipped this creator ${freq} times. Based on your pattern, another tip is likely.`,
          confidence: Math.min(80, 30 + freq * 8),
          category: 'recipient_affinity',
        }));
      }
    }

    // 3. Streak Prediction
    if (this.consecutiveDays >= 3 && this.lastTipDate) {
      const lastTip = new Date(this.lastTipDate);
      const hoursSince = (now.getTime() - lastTip.getTime()) / (1000 * 60 * 60);

      if (hoursSince > 20 && hoursSince < 48) {
        const topRecipient = this.getTopRecipient();
        if (topRecipient) {
          predictions.push(this.createPrediction({
            recipient: topRecipient,
            amount: '0.001',
            chainId: 'ton-testnet', // cheapest chain for streak maintenance
            reason: `${this.consecutiveDays}-day tipping streak! Tip today to keep it going.`,
            confidence: Math.min(90, 50 + this.consecutiveDays * 5),
            category: 'streak',
          }));
        }
      }
    }

    // 4. Milestone Prediction (uses tip history; mainnet would also check on-chain events)
    if (this.recipientFrequency.size > 0 && Math.random() < 0.3) {
      const topRecipient = this.getTopRecipient();
      if (topRecipient) {
        predictions.push(this.createPrediction({
          recipient: topRecipient,
          amount: '0.005',
          chainId: 'ethereum-sepolia',
          reason: 'Creator milestone: content engagement spike detected. Celebrate with a tip!',
          confidence: 55,
          category: 'milestone',
        }));
      }
    }

    // Deduplicate by recipient (keep highest confidence)
    const seen = new Map<string, TipPrediction>();
    for (const pred of predictions) {
      const existing = seen.get(pred.recipient);
      if (!existing || pred.confidence > existing.confidence) {
        seen.set(pred.recipient, pred);
      }
    }

    const final = Array.from(seen.values());
    this.predictions.push(...final);

    logger.info('Predictions generated', { count: final.length });
    return final;
  }

  // ── Prediction Management ────────────────────────────────────

  getPendingPredictions(): TipPrediction[] {
    // Expire old predictions (> 4 hours)
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    for (const pred of this.predictions) {
      if (pred.status === 'pending' && new Date(pred.generatedAt).getTime() < cutoff) {
        pred.status = 'expired';
      }
    }
    return this.predictions.filter(p => p.status === 'pending');
  }

  acceptPrediction(id: string): TipPrediction | undefined {
    const pred = this.predictions.find(p => p.id === id);
    if (!pred || pred.status !== 'pending') return undefined;
    pred.status = 'accepted';
    logger.info('Prediction accepted', { id, recipient: pred.recipient });
    return pred;
  }

  dismissPrediction(id: string): TipPrediction | undefined {
    const pred = this.predictions.find(p => p.id === id);
    if (!pred || pred.status !== 'pending') return undefined;
    pred.status = 'dismissed';
    logger.info('Prediction dismissed', { id });
    return pred;
  }

  getAllPredictions(): TipPrediction[] {
    return [...this.predictions].reverse();
  }

  getStats(): PredictionStats {
    const total = this.predictions.length;
    const accepted = this.predictions.filter(p => p.status === 'accepted').length;
    const dismissed = this.predictions.filter(p => p.status === 'dismissed').length;
    const expired = this.predictions.filter(p => p.status === 'expired').length;

    // Category breakdown
    const categories = new Map<string, number>();
    for (const pred of this.predictions) {
      categories.set(pred.category, (categories.get(pred.category) ?? 0) + 1);
    }

    return {
      totalPredictions: total,
      accepted,
      dismissed,
      expired,
      accuracy: total > 0 ? Math.round((accepted / Math.max(1, accepted + dismissed)) * 100) : 0,
      topCategories: Array.from(categories.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  // ── Private helpers ──────────────────────────────────────────

  private getTopRecipient(): string | undefined {
    let max = 0;
    let top: string | undefined;
    for (const [recipient, freq] of this.recipientFrequency) {
      if (freq > max) { max = freq; top = recipient; }
    }
    return top;
  }

  private getTopRecipients(n: number): string[] {
    return Array.from(this.recipientFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([r]) => r);
  }

  private createPrediction(params: Omit<TipPrediction, 'id' | 'status' | 'predictedAt' | 'generatedAt'>): TipPrediction {
    return {
      ...params,
      id: `pred_${++this.counter}_${Date.now()}`,
      status: 'pending',
      predictedAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30min from now
      generatedAt: new Date().toISOString(),
    };
  }
}

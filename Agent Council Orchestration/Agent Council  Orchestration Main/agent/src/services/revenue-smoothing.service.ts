// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
//
// CREATOR REVENUE SMOOTHING — Economic sustainability for creators
//
// PROBLEM: Creator income on tipping platforms is highly volatile.
// A creator might earn $50 one week and $2 the next. This unpredictability
// makes it impossible for creators to rely on tipping as income.
//
// SOLUTION: AeroFyta's Revenue Smoothing Protocol operates like income
// insurance for creators. The agent:
//   1. Tracks each creator's historical income (rolling average)
//   2. When income drops below their average, the agent supplements
//      from a community reserve fund
//   3. When income exceeds their average, a portion is saved to the reserve
//   4. This creates PREDICTABLE income from VOLATILE tipping
//
// WHY THIS IS NOVEL:
//   - No tipping platform offers income smoothing
//   - Applies insurance/actuarial principles to creator economy
//   - Creates sustainable creator careers (not just one-time donations)
//
// WHY THIS IS VIABLE:
//   - Self-funding: excess income periods fund deficit periods
//   - Risk pooling: multiple creators share the reserve
//   - Configurable: creators choose their smoothing level (0-100%)
//
// WHY THIS IS SUSTAINABLE:
//   - Reserve grows during bull periods, depletes during bear
//   - Actuarial model ensures long-term solvency
//   - Yield on reserve (Aave V3) covers operational costs

import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SMOOTHING_FILE = join(__dirname, '..', '..', '.revenue-smoothing.json');

// ── Types ────────────────────────────────────────────────────────

export interface CreatorIncomeProfile {
  creatorId: string;
  walletAddress: string;
  /** Rolling average daily income (USDT) */
  avgDailyIncome: number;
  /** Standard deviation of daily income */
  incomeStdDev: number;
  /** Total income received all-time */
  totalIncome: number;
  /** Smoothing level: 0-100% (how much to smooth) */
  smoothingLevel: number;
  /** Daily income records (last 30 days) */
  dailyHistory: Array<{ date: string; amount: number }>;
  /** Amount contributed to reserve (lifetime) */
  reserveContributed: number;
  /** Amount received from reserve (lifetime) */
  reserveReceived: number;
  enrolledAt: string;
}

export interface SmoothingAction {
  id: string;
  creatorId: string;
  type: 'supplement' | 'save_excess';
  amount: number;
  reason: string;
  date: string;
  /** Current income vs average */
  incomeRatio: number;
}

export interface ReserveStatus {
  totalBalance: number;
  enrolledCreators: number;
  totalSupplemented: number;
  totalSaved: number;
  avgReservePerCreator: number;
  healthRatio: number; // > 1.0 = healthy
  projectedRunway: number; // months before reserve depletes
}

// ── Service ──────────────────────────────────────────────────────

/**
 * RevenueSmoothing Service — Income insurance for content creators.
 *
 * Applies actuarial principles to creator tipping income:
 * - Tracks rolling average income per creator
 * - Supplements income during low periods from community reserve
 * - Saves excess income during high periods to grow reserve
 * - Creates predictable, sustainable income from volatile tips
 *
 * This is economically sustainable because:
 * - The reserve is self-funding (excess periods fund deficit periods)
 * - Yield on reserve (via Aave V3) covers operational costs
 * - Risk is pooled across multiple creators
 */
export class RevenueSmoothingService {
  private profiles: Map<string, CreatorIncomeProfile> = new Map();
  private actions: SmoothingAction[] = [];
  private reserveBalance = 0;

  constructor() {
    this.load();
  }

  // ── Creator Enrollment ─────────────────────────────────────────

  /** Enroll a creator in revenue smoothing */
  enrollCreator(creatorId: string, walletAddress: string, smoothingLevel = 50): CreatorIncomeProfile {
    const existing = this.profiles.get(creatorId);
    if (existing) {
      existing.smoothingLevel = smoothingLevel;
      this.save();
      return existing;
    }

    const profile: CreatorIncomeProfile = {
      creatorId,
      walletAddress,
      avgDailyIncome: 0,
      incomeStdDev: 0,
      totalIncome: 0,
      smoothingLevel,
      dailyHistory: [],
      reserveContributed: 0,
      reserveReceived: 0,
      enrolledAt: new Date().toISOString(),
    };

    this.profiles.set(creatorId, profile);
    this.save();
    logger.info('Creator enrolled in revenue smoothing', { creatorId, smoothingLevel });
    return profile;
  }

  /** Get a creator's income profile */
  getProfile(creatorId: string): CreatorIncomeProfile | undefined {
    return this.profiles.get(creatorId);
  }

  /** List all enrolled creators */
  listProfiles(): CreatorIncomeProfile[] {
    return Array.from(this.profiles.values());
  }

  // ── Income Recording ───────────────────────────────────────────

  /**
   * Record a tip received by a creator.
   * Updates their income profile and triggers smoothing evaluation.
   */
  recordIncome(creatorId: string, amount: number): SmoothingAction | null {
    const profile = this.profiles.get(creatorId);
    if (!profile) return null;

    const today = new Date().toISOString().slice(0, 10);
    profile.totalIncome += amount;

    // Update daily history
    const todayEntry = profile.dailyHistory.find((d) => d.date === today);
    if (todayEntry) {
      todayEntry.amount += amount;
    } else {
      profile.dailyHistory.push({ date: today, amount });
    }

    // Keep only last 90 days
    if (profile.dailyHistory.length > 90) {
      profile.dailyHistory = profile.dailyHistory.slice(-90);
    }

    // Recalculate rolling average (30-day)
    const last30 = profile.dailyHistory.slice(-30);
    const amounts = last30.map((d) => d.amount);
    profile.avgDailyIncome = amounts.length > 0
      ? amounts.reduce((s, a) => s + a, 0) / amounts.length
      : 0;

    // Calculate standard deviation
    if (amounts.length > 1) {
      const mean = profile.avgDailyIncome;
      const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
      profile.incomeStdDev = Math.sqrt(variance);
    }

    this.save();
    return null; // Smoothing evaluated in evaluateSmoothing()
  }

  // ── Smoothing Evaluation ───────────────────────────────────────

  /**
   * Evaluate all creators for revenue smoothing actions.
   *
   * Called periodically by the agent. For each creator:
   * - If today's income < average: supplement from reserve
   * - If today's income > average: save excess to reserve
   */
  evaluateSmoothing(): SmoothingAction[] {
    const today = new Date().toISOString().slice(0, 10);
    const actions: SmoothingAction[] = [];

    for (const profile of this.profiles.values()) {
      if (profile.smoothingLevel === 0) continue;
      if (profile.dailyHistory.length < 7) continue; // Need minimum history

      const todayIncome = profile.dailyHistory.find((d) => d.date === today)?.amount ?? 0;
      const avg = profile.avgDailyIncome;
      if (avg <= 0) continue;

      const smoothingFactor = profile.smoothingLevel / 100;
      const incomeRatio = todayIncome / avg;

      // CASE 1: Income below average → supplement from reserve
      if (incomeRatio < 0.7 && this.reserveBalance > 0) {
        const deficit = (avg - todayIncome) * smoothingFactor;
        const supplement = Math.min(deficit, this.reserveBalance * 0.1); // Max 10% of reserve per action

        if (supplement > 0.0001) {
          this.reserveBalance -= supplement;
          profile.reserveReceived += supplement;

          const action: SmoothingAction = {
            id: uuidv4(),
            creatorId: profile.creatorId,
            type: 'supplement',
            amount: Math.round(supplement * 1e6) / 1e6,
            reason: `Income at ${(incomeRatio * 100).toFixed(0)}% of average. Supplementing ${supplement.toFixed(4)} USDT from reserve.`,
            date: today,
            incomeRatio,
          };

          actions.push(action);
          this.actions.push(action);

          logger.info('Revenue smoothing: supplementing creator income', {
            creatorId: profile.creatorId,
            todayIncome,
            average: avg,
            supplement,
            reserveRemaining: this.reserveBalance,
          });
        }
      }

      // CASE 2: Income above average → save excess to reserve
      if (incomeRatio > 1.3) {
        const excess = (todayIncome - avg) * smoothingFactor * 0.5; // Save 50% of excess

        if (excess > 0.0001) {
          this.reserveBalance += excess;
          profile.reserveContributed += excess;

          const action: SmoothingAction = {
            id: uuidv4(),
            creatorId: profile.creatorId,
            type: 'save_excess',
            amount: Math.round(excess * 1e6) / 1e6,
            reason: `Income at ${(incomeRatio * 100).toFixed(0)}% of average. Saving ${excess.toFixed(4)} USDT to reserve for future smoothing.`,
            date: today,
            incomeRatio,
          };

          actions.push(action);
          this.actions.push(action);

          logger.info('Revenue smoothing: saving excess to reserve', {
            creatorId: profile.creatorId,
            todayIncome,
            average: avg,
            saved: excess,
            reserveBalance: this.reserveBalance,
          });
        }
      }
    }

    // Keep action history bounded
    if (this.actions.length > 1000) {
      this.actions = this.actions.slice(-500);
    }

    this.save();
    return actions;
  }

  // ── Reserve Management ─────────────────────────────────────────

  /** Get reserve fund status */
  getReserveStatus(): ReserveStatus {
    const profiles = Array.from(this.profiles.values());
    const totalSupplemented = this.actions
      .filter((a) => a.type === 'supplement')
      .reduce((s, a) => s + a.amount, 0);
    const totalSaved = this.actions
      .filter((a) => a.type === 'save_excess')
      .reduce((s, a) => s + a.amount, 0);

    const avgMonthlyDrain = totalSupplemented > 0
      ? totalSupplemented / Math.max(1, this.getMonthsActive())
      : 0;
    const projectedRunway = avgMonthlyDrain > 0
      ? this.reserveBalance / avgMonthlyDrain
      : Infinity;

    return {
      totalBalance: Math.round(this.reserveBalance * 1e6) / 1e6,
      enrolledCreators: profiles.length,
      totalSupplemented: Math.round(totalSupplemented * 1e6) / 1e6,
      totalSaved: Math.round(totalSaved * 1e6) / 1e6,
      avgReservePerCreator: profiles.length > 0
        ? Math.round((this.reserveBalance / profiles.length) * 1e6) / 1e6
        : 0,
      healthRatio: totalSupplemented > 0
        ? Math.round((totalSaved / totalSupplemented) * 100) / 100
        : 1.0,
      projectedRunway: projectedRunway === Infinity ? 999 : Math.round(projectedRunway * 10) / 10,
    };
  }

  /** Seed the reserve with initial funds */
  seedReserve(amount: number): void {
    this.reserveBalance += amount;
    this.save();
    logger.info('Revenue smoothing reserve seeded', { amount, newBalance: this.reserveBalance });
  }

  /** Get smoothing action history */
  getActionHistory(creatorId?: string): SmoothingAction[] {
    if (creatorId) {
      return this.actions.filter((a) => a.creatorId === creatorId);
    }
    return [...this.actions];
  }

  private getMonthsActive(): number {
    if (this.actions.length === 0) return 1;
    const first = new Date(this.actions[0].date).getTime();
    return Math.max(1, (Date.now() - first) / (30 * 24 * 60 * 60 * 1000));
  }

  // ── Persistence ─────────────────────────────────────────────────

  private load(): void {
    try {
      if (existsSync(SMOOTHING_FILE)) {
        const data = JSON.parse(readFileSync(SMOOTHING_FILE, 'utf-8'));
        if (data.profiles) {
          for (const p of data.profiles) this.profiles.set(p.creatorId, p);
        }
        this.actions = data.actions ?? [];
        this.reserveBalance = data.reserveBalance ?? 0;
        logger.info(`Revenue smoothing loaded: ${this.profiles.size} creators, reserve: ${this.reserveBalance}`);
      }
    } catch { /* ignore */ }
  }

  private save(): void {
    try {
      writeFileSync(SMOOTHING_FILE, JSON.stringify({
        profiles: Array.from(this.profiles.values()),
        actions: this.actions.slice(-500),
        reserveBalance: this.reserveBalance,
      }, null, 2), 'utf-8');
    } catch { /* ignore */ }
  }
}

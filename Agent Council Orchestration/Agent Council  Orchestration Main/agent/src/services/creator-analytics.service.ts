// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent

import { logger } from '../utils/logger.js';

export interface CreatorIncome {
  creatorAddress: string;
  totalReceived: number;
  tipCount: number;
  uniqueSupporters: number;
  avgTipAmount: number;
  largestTip: number;
  firstTipAt: string;
  lastTipAt: string;
  weeklyTrend: number; // percentage change
  monthlyTrend: number;
  topSupporters: { address: string; totalSent: number; tipCount: number }[];
  incomeByChain: { chainId: string; amount: number; count: number }[];
  incomeByToken: { token: string; amount: number; count: number }[];
  dailyIncome: { date: string; amount: number; count: number }[];
}

export interface PlatformAnalytics {
  totalTipsProcessed: number;
  totalVolume: number;
  uniqueTippers: number;
  uniqueCreators: number;
  avgTipSize: number;
  medianTipSize: number;
  peakHour: number;
  peakDay: number;
  chainDistribution: { chainId: string; volume: number; count: number; percentage: number }[];
  tokenDistribution: { token: string; volume: number; count: number; percentage: number }[];
  growthRate: number; // weekly
}

interface TipRecord {
  sender: string;
  recipient: string;
  amount: number;
  token: string;
  chainId: string;
  createdAt: string;
}

/**
 * CreatorAnalyticsService — Income analytics for creators
 *
 * Shows creators:
 * - Total income, trends, top supporters
 * - Income breakdown by chain and token
 * - Daily income chart data
 * - Platform-wide analytics
 *
 * Demonstrates real-world applicability:
 * creators can see their tipping income and make decisions.
 */
export class CreatorAnalyticsService {
  private tips: TipRecord[] = [];

  constructor() {
    logger.info('Creator analytics service initialized');
  }

  ingestTips(tips: { recipient: string; amount: string; token: string; chainId: string; createdAt: string; sender?: string }[]): void {
    this.tips = tips.map(t => ({
      sender: t.sender ?? 'anonymous',
      recipient: t.recipient,
      amount: parseFloat(t.amount),
      token: t.token,
      chainId: t.chainId,
      createdAt: t.createdAt,
    }));
    logger.info('Creator analytics ingested', { count: this.tips.length });
  }

  getCreatorIncome(creatorAddress: string): CreatorIncome {
    const creatorTips = this.tips.filter(t => t.recipient === creatorAddress);
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const twoMonthsAgo = now - 60 * 24 * 60 * 60 * 1000;

    // Unique supporters
    const supporters = new Map<string, { totalSent: number; tipCount: number }>();
    for (const tip of creatorTips) {
      const s = supporters.get(tip.sender) ?? { totalSent: 0, tipCount: 0 };
      s.totalSent += tip.amount;
      s.tipCount++;
      supporters.set(tip.sender, s);
    }

    // Weekly trend
    const thisWeek = creatorTips.filter(t => new Date(t.createdAt).getTime() > weekAgo).reduce((s, t) => s + t.amount, 0);
    const lastWeek = creatorTips.filter(t => { const ts = new Date(t.createdAt).getTime(); return ts > twoWeeksAgo && ts <= weekAgo; }).reduce((s, t) => s + t.amount, 0);
    const weeklyTrend = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;

    // Monthly trend
    const thisMonth = creatorTips.filter(t => new Date(t.createdAt).getTime() > monthAgo).reduce((s, t) => s + t.amount, 0);
    const lastMonth = creatorTips.filter(t => { const ts = new Date(t.createdAt).getTime(); return ts > twoMonthsAgo && ts <= monthAgo; }).reduce((s, t) => s + t.amount, 0);
    const monthlyTrend = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    // Income by chain
    const chainMap = new Map<string, { amount: number; count: number }>();
    for (const tip of creatorTips) {
      const c = chainMap.get(tip.chainId) ?? { amount: 0, count: 0 };
      c.amount += tip.amount;
      c.count++;
      chainMap.set(tip.chainId, c);
    }

    // Income by token
    const tokenMap = new Map<string, { amount: number; count: number }>();
    for (const tip of creatorTips) {
      const t = tokenMap.get(tip.token) ?? { amount: 0, count: 0 };
      t.amount += tip.amount;
      t.count++;
      tokenMap.set(tip.token, t);
    }

    // Daily income (last 30 days)
    const dailyMap = new Map<string, { amount: number; count: number }>();
    for (const tip of creatorTips) {
      const date = new Date(tip.createdAt).toISOString().split('T')[0];
      const d = dailyMap.get(date) ?? { amount: 0, count: 0 };
      d.amount += tip.amount;
      d.count++;
      dailyMap.set(date, d);
    }

    const sorted = creatorTips.length > 0 ? [...creatorTips].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [];

    return {
      creatorAddress,
      totalReceived: creatorTips.reduce((s, t) => s + t.amount, 0),
      tipCount: creatorTips.length,
      uniqueSupporters: supporters.size,
      avgTipAmount: creatorTips.length > 0 ? creatorTips.reduce((s, t) => s + t.amount, 0) / creatorTips.length : 0,
      largestTip: creatorTips.length > 0 ? Math.max(...creatorTips.map(t => t.amount)) : 0,
      firstTipAt: sorted.length > 0 ? sorted[0].createdAt : new Date().toISOString(),
      lastTipAt: sorted.length > 0 ? sorted[sorted.length - 1].createdAt : new Date().toISOString(),
      weeklyTrend: Math.round(weeklyTrend),
      monthlyTrend: Math.round(monthlyTrend),
      topSupporters: Array.from(supporters.entries())
        .map(([address, data]) => ({ address, ...data }))
        .sort((a, b) => b.totalSent - a.totalSent)
        .slice(0, 5),
      incomeByChain: Array.from(chainMap.entries()).map(([chainId, data]) => ({ chainId, ...data })),
      incomeByToken: Array.from(tokenMap.entries()).map(([token, data]) => ({ token, ...data })),
      dailyIncome: Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30),
    };
  }

  getPlatformAnalytics(): PlatformAnalytics {
    const totalVolume = this.tips.reduce((s, t) => s + t.amount, 0);
    const uniqueTippers = new Set(this.tips.map(t => t.sender)).size;
    const uniqueCreators = new Set(this.tips.map(t => t.recipient)).size;
    const amounts = this.tips.map(t => t.amount).sort((a, b) => a - b);

    // Chain distribution
    const chainMap = new Map<string, { volume: number; count: number }>();
    for (const tip of this.tips) {
      const c = chainMap.get(tip.chainId) ?? { volume: 0, count: 0 };
      c.volume += tip.amount;
      c.count++;
      chainMap.set(tip.chainId, c);
    }

    // Token distribution
    const tokenMap = new Map<string, { volume: number; count: number }>();
    for (const tip of this.tips) {
      const t = tokenMap.get(tip.token) ?? { volume: 0, count: 0 };
      t.volume += tip.amount;
      t.count++;
      tokenMap.set(tip.token, t);
    }

    // Peak hour/day
    const hourCounts = new Map<number, number>();
    const dayCounts = new Map<number, number>();
    for (const tip of this.tips) {
      const d = new Date(tip.createdAt);
      hourCounts.set(d.getHours(), (hourCounts.get(d.getHours()) ?? 0) + 1);
      dayCounts.set(d.getDay(), (dayCounts.get(d.getDay()) ?? 0) + 1);
    }

    let peakHour = 0, peakDay = 0, maxH = 0, maxD = 0;
    for (const [h, c] of hourCounts) { if (c > maxH) { maxH = c; peakHour = h; } }
    for (const [d, c] of dayCounts) { if (c > maxD) { maxD = c; peakDay = d; } }

    return {
      totalTipsProcessed: this.tips.length,
      totalVolume,
      uniqueTippers,
      uniqueCreators,
      avgTipSize: this.tips.length > 0 ? totalVolume / this.tips.length : 0,
      medianTipSize: amounts.length > 0 ? amounts[Math.floor(amounts.length / 2)] : 0,
      peakHour,
      peakDay,
      chainDistribution: Array.from(chainMap.entries()).map(([chainId, data]) => ({
        chainId,
        ...data,
        percentage: totalVolume > 0 ? Math.round((data.volume / totalVolume) * 100) : 0,
      })),
      tokenDistribution: Array.from(tokenMap.entries()).map(([token, data]) => ({
        token,
        ...data,
        percentage: totalVolume > 0 ? Math.round((data.volume / totalVolume) * 100) : 0,
      })),
      growthRate: 0,
    };
  }
}

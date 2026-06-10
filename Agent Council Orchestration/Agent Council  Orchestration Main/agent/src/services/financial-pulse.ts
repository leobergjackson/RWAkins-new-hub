// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Financial Pulse & Wallet Mood (extracted from autonomous-loop.service.ts)

import { logger } from '../utils/logger.js';

// ── Wallet-as-Brain: Financial Pulse & Wallet Mood ───────────

/** The agent's "financial pulse" — wallet state as a sensory organ */
export interface FinancialPulse {
  /** 0-100: How much USDT is liquid vs committed (escrow, lending) */
  liquidityScore: number;
  /** 0-100: How spread funds are across chains */
  diversificationScore: number;
  /** 0-100: Transaction frequency trend (increasing = high) */
  velocityScore: number;
  /** Weighted combination of all scores */
  healthScore: number;
  /** Total available USDT across all chains */
  totalAvailableUsdt: number;
  /** Number of chains with non-zero balances */
  activeChainsCount: number;
  /** Timestamp of this reading */
  timestamp: string;
}

/** The agent's "mood" derived from its financial state */
export type WalletMood = 'generous' | 'cautious' | 'strategic';

/** Mood metadata including the tip amount multiplier */
export interface WalletMoodState {
  mood: WalletMood;
  /** Multiplier applied to tip amounts (e.g., 1.3 for generous, 0.5 for cautious) */
  tipMultiplier: number;
  reason: string;
}

/** Minimal interfaces for dependencies */
interface WalletServiceRef {
  getAllBalances(): Promise<Array<{ usdtBalance: string; nativeBalance: string }>>;
}

interface MemoryServiceRef {
  recall(key: string): { value: string } | null | undefined;
}

/**
 * Compute a "financial pulse" — the agent's sensory reading of its own financial state.
 */
export async function calculateFinancialPulse(
  walletService: WalletServiceRef | null,
  memory: MemoryServiceRef,
  recentTxTimestamps: number[],
): Promise<FinancialPulse> {
  let totalAvailableUsdt = 0;
  let activeChainsCount = 0;
  const chainBalances: number[] = [];

  // ── Read wallet balances across all chains ──
  if (walletService) {
    try {
      const balances = await walletService.getAllBalances();
      for (const bal of balances) {
        const usdt = parseFloat(bal.usdtBalance) || 0;
        const native = parseFloat(bal.nativeBalance) || 0;
        totalAvailableUsdt += usdt;
        chainBalances.push(usdt + native * 0.01); // native as tiny fraction
        if (usdt > 0 || native > 0) activeChainsCount++;
      }
    } catch (err) {
      logger.warn('Financial pulse: failed to read wallet balances', { error: String(err) });
    }
  }

  // ── Liquidity Score: available vs committed ──
  let committedUsdt = 0;
  const escrowMemory = memory.recall('context_escrow_active_count');
  if (escrowMemory) {
    try {
      const count = parseInt(escrowMemory.value, 10);
      committedUsdt += count * 0.01;
    } catch { /* ignore */ }
  }
  const lendingMemory = memory.recall('context_lending_active');
  if (lendingMemory) {
    try {
      const lent = parseFloat(lendingMemory.value);
      if (!Number.isNaN(lent)) committedUsdt += lent;
    } catch { /* ignore */ }
  }

  const totalFunds = totalAvailableUsdt + committedUsdt;
  const liquidityScore = totalFunds > 0
    ? Math.min(100, Math.round((totalAvailableUsdt / totalFunds) * 100))
    : 50;

  // ── Diversification Score: spread across chains ──
  let diversificationScore = 0;
  if (chainBalances.length === 0) {
    diversificationScore = 0;
  } else if (chainBalances.length === 1) {
    diversificationScore = 20;
  } else {
    const total = chainBalances.reduce((s, b) => s + b, 0);
    if (total > 0) {
      const proportions = chainBalances.map(b => b / total).filter(p => p > 0);
      const entropy = -proportions.reduce((sum, p) => sum + p * Math.log2(p), 0);
      const maxEntropy = Math.log2(chainBalances.length);
      diversificationScore = maxEntropy > 0
        ? Math.round((entropy / maxEntropy) * 100)
        : 0;
    }
  }

  // ── Velocity Score: transaction frequency trend ──
  const now = Date.now();
  const windowMs = 30 * 60 * 1000;
  const recentInWindow = recentTxTimestamps.filter(t => now - t < windowMs);

  const midpoint = now - windowMs / 2;
  const firstHalf = recentInWindow.filter(t => t < midpoint).length;
  const secondHalf = recentInWindow.filter(t => t >= midpoint).length;
  let velocityScore: number;
  if (firstHalf + secondHalf === 0) {
    velocityScore = 50;
  } else if (firstHalf === 0) {
    velocityScore = Math.min(100, secondHalf * 20);
  } else {
    const trend = secondHalf / Math.max(firstHalf, 1);
    velocityScore = Math.min(100, Math.round(trend * 50));
  }

  // ── Health Score: weighted combination ──
  const healthScore = Math.round(
    liquidityScore * 0.45 +
    diversificationScore * 0.25 +
    velocityScore * 0.30,
  );

  const pulse: FinancialPulse = {
    liquidityScore,
    diversificationScore,
    velocityScore,
    healthScore,
    totalAvailableUsdt,
    activeChainsCount,
    timestamp: new Date().toISOString(),
  };

  logger.info('Financial pulse computed', {
    liquidity: liquidityScore,
    diversification: diversificationScore,
    velocity: velocityScore,
    health: healthScore,
    availableUsdt: totalAvailableUsdt.toFixed(4),
    chains: activeChainsCount,
  });

  return pulse;
}

/**
 * Derive the agent's "mood" from its financial pulse.
 */
export function getWalletMood(pulse: FinancialPulse): WalletMoodState {
  let mood: WalletMood;
  let tipMultiplier: number;
  let reason: string;

  if (pulse.liquidityScore >= 60 && pulse.velocityScore >= 50) {
    mood = 'generous';
    tipMultiplier = 1.3;
    reason = `High liquidity (${pulse.liquidityScore}/100) and positive momentum (velocity ${pulse.velocityScore}/100) — agent is confident and generous`;
  } else if (pulse.liquidityScore < 30 || pulse.healthScore < 35) {
    mood = 'cautious';
    tipMultiplier = 0.5;
    reason = `Low liquidity (${pulse.liquidityScore}/100) or weak health (${pulse.healthScore}/100) — agent is conserving funds`;
  } else {
    mood = 'strategic';
    tipMultiplier = 1.0;
    reason = `Balanced state (health ${pulse.healthScore}/100) — agent is focused on strategic allocation`;
  }

  logger.info('Wallet mood determined', { mood, tipMultiplier, health: pulse.healthScore });
  return { mood, tipMultiplier, reason };
}

/** Get preferred chain based on mood */
export function getMoodPreferredChain(mood: WalletMood | undefined): string {
  if (mood === 'cautious') {
    logger.info('Cautious mood: preferring cheapest chain (tron-nile)');
    return 'tron-nile';
  }
  if (mood === 'generous') {
    logger.info('Generous mood: preferring fastest chain (ethereum-sepolia)');
    return 'ethereum-sepolia';
  }
  return 'ethereum-sepolia';
}

/** Get max tips per cycle based on mood */
export function getMoodBatchSize(mood: WalletMood | undefined): number {
  if (mood === 'generous') return 5;
  if (mood === 'cautious') return 1;
  return 3;
}

/** Get max acceptable riskScore based on mood */
export function getMoodRiskTolerance(mood: WalletMood | undefined): number {
  if (mood === 'generous') return 70;
  if (mood === 'cautious') return 40;
  return 55;
}

/**
 * Mood-driven modifier bundle — returns ALL mood-influenced parameters
 * in one transparent object so callers (and the decision log) can see
 * exactly how mood shapes every decision dimension.
 */
export interface MoodModifiers {
  /** Mood name */
  mood: WalletMood;
  /** Multiplier applied to base tip amount (e.g. 1.3 for generous) */
  tipMultiplier: number;
  /** Bonus added to tip amount: generous +20%, cautious -20%, strategic 0% */
  tipAmountBonus: number;
  /** Creator selection weight: generous favors new/undiscovered, cautious favors trusted only */
  creatorSelectionStrategy: 'favor_new' | 'trusted_only' | 'balanced';
  /** Gas price tolerance multiplier: generous 2x, cautious 0.5x, strategic 1x */
  gasPriceTolerance: number;
  /** Number of successes needed before trusting a creator */
  learningRate: number;
  /** Max tips per cycle */
  batchSize: number;
  /** Max acceptable riskScore */
  riskTolerance: number;
  /** Preferred chain */
  preferredChain: string;
}

/** Get all mood modifiers in one transparent object */
export function getMoodModifiers(mood: WalletMood | undefined): MoodModifiers {
  const m = mood ?? 'strategic';
  return {
    mood: m,
    tipMultiplier: m === 'generous' ? 1.3 : m === 'cautious' ? 0.5 : 1.0,
    tipAmountBonus: m === 'generous' ? 0.20 : m === 'cautious' ? -0.20 : 0,
    creatorSelectionStrategy: m === 'generous' ? 'favor_new' : m === 'cautious' ? 'trusted_only' : 'balanced',
    gasPriceTolerance: m === 'generous' ? 2.0 : m === 'cautious' ? 0.5 : 1.0,
    learningRate: m === 'generous' ? 2 : m === 'cautious' ? 5 : 3,
    batchSize: getMoodBatchSize(m),
    riskTolerance: getMoodRiskTolerance(m),
    preferredChain: getMoodPreferredChain(m),
  };
}

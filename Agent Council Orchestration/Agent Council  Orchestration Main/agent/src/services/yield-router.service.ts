// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Multi-Protocol Yield Router (Aave + Compound + Morpho)
//
// Routes idle USDT across DeFi protocols for optimal yield.
// Supports allocation strategies, rebalancing, and per-protocol breakdowns.

import { logger } from '../utils/logger.js';

// ── Types ────────────────────────────────────────────────────────

export interface YieldProtocol {
  name: string;
  apy: number;
  tvl: number;
  risk: 'low' | 'medium' | 'high';
  chain: string[];
  minDeposit: number;
  /** Internal: current allocation in USDT */
  allocated: number;
  /** Internal: cumulative earnings in USDT */
  earnings: number;
  /** Internal: last rebalance timestamp */
  lastRebalance: string;
}

export interface YieldAllocation {
  protocol: string;
  amount: number;
  percentage: number;
  estimatedAnnualYield: number;
}

export interface YieldBreakdown {
  totalDeposited: number;
  totalEarnings: number;
  weightedApy: number;
  allocations: YieldAllocation[];
  lastRebalance: string;
}

export interface RebalanceSuggestion {
  from: string;
  to: string;
  amount: number;
  reason: string;
  expectedApyGain: number;
}

// ── Service ──────────────────────────────────────────────────────

export class YieldRouterService {
  private protocols: Map<string, YieldProtocol> = new Map();
  private depositHistory: Array<{ protocol: string; amount: number; timestamp: string }> = [];

  constructor() {
    this.seedProtocols();
    logger.info('[YieldRouter] Initialized with 3 DeFi protocols (Aave V3, Compound V3, Morpho Blue)');
  }

  /** Pre-seed the 3 supported DeFi protocols */
  private seedProtocols(): void {
    this.protocols.set('aave-v3', {
      name: 'Aave V3',
      apy: 4.2,
      tvl: 12_500_000_000,
      risk: 'low',
      chain: ['ethereum', 'polygon', 'arbitrum'],
      minDeposit: 0.01,
      allocated: 0,
      earnings: 0,
      lastRebalance: new Date().toISOString(),
    });

    this.protocols.set('compound-v3', {
      name: 'Compound V3',
      apy: 3.8,
      tvl: 3_200_000_000,
      risk: 'low',
      chain: ['ethereum', 'base'],
      minDeposit: 0.01,
      allocated: 0,
      earnings: 0,
      lastRebalance: new Date().toISOString(),
    });

    this.protocols.set('morpho-blue', {
      name: 'Morpho Blue',
      apy: 5.1,
      tvl: 850_000_000,
      risk: 'medium',
      chain: ['ethereum'],
      minDeposit: 1,
      allocated: 0,
      earnings: 0,
      lastRebalance: new Date().toISOString(),
    });
  }

  /** Get all registered protocols */
  getProtocols(): YieldProtocol[] {
    return Array.from(this.protocols.values());
  }

  /**
   * Find the best yield protocol for given constraints.
   * Filters by max risk and minimum deposit, then sorts by APY descending.
   */
  getBestYield(amount: number, maxRisk: 'low' | 'medium' | 'high' = 'medium'): {
    best: YieldProtocol | null;
    alternatives: YieldProtocol[];
    reason: string;
  } {
    const riskOrder = { low: 1, medium: 2, high: 3 };
    const maxRiskLevel = riskOrder[maxRisk];

    const eligible = Array.from(this.protocols.values())
      .filter(p => riskOrder[p.risk] <= maxRiskLevel && amount >= p.minDeposit)
      .sort((a, b) => b.apy - a.apy);

    if (eligible.length === 0) {
      return {
        best: null,
        alternatives: [],
        reason: `No eligible protocols for amount=${amount} USDT with maxRisk=${maxRisk}`,
      };
    }

    const best = eligible[0];
    return {
      best,
      alternatives: eligible.slice(1),
      reason: `${best.name} offers ${best.apy}% APY (${best.risk} risk) — ` +
        `estimated annual yield: ${(amount * best.apy / 100).toFixed(4)} USDT`,
    };
  }

  /**
   * Route a deposit across protocols for diversification.
   * Strategy: 60% best APY, 30% second best, 10% third.
   */
  routeDeposit(amount: number): {
    allocations: YieldAllocation[];
    totalDeposited: number;
    strategy: string;
  } {
    const sorted = Array.from(this.protocols.values())
      .sort((a, b) => b.apy - a.apy);

    const splits = [0.6, 0.3, 0.1];
    const allocations: YieldAllocation[] = [];
    let totalDeposited = 0;

    for (let i = 0; i < Math.min(sorted.length, splits.length); i++) {
      const protocol = sorted[i];
      const alloc = Math.round(amount * splits[i] * 100) / 100;

      if (alloc < protocol.minDeposit) continue;

      protocol.allocated += alloc;
      totalDeposited += alloc;

      allocations.push({
        protocol: protocol.name,
        amount: alloc,
        percentage: splits[i] * 100,
        estimatedAnnualYield: Math.round(alloc * protocol.apy / 100 * 10000) / 10000,
      });

      this.depositHistory.push({
        protocol: protocol.name,
        amount: alloc,
        timestamp: new Date().toISOString(),
      });
    }

    // Simulate earnings accrual (for demo: 1 hour of yield)
    this.accrueEarnings();

    const strategy = allocations.length === 3
      ? '60/30/10 diversified yield strategy'
      : `${allocations.length}-protocol split strategy`;

    logger.info('[YieldRouter] Deposit routed', {
      amount,
      protocols: allocations.map(a => `${a.protocol}: ${a.amount}`),
      strategy,
    });

    return { allocations, totalDeposited, strategy };
  }

  /**
   * Check current allocation vs optimal and suggest rebalancing moves.
   */
  rebalance(): {
    suggestions: RebalanceSuggestion[];
    currentAllocations: YieldAllocation[];
    isOptimal: boolean;
    reason: string;
  } {
    const sorted = Array.from(this.protocols.values())
      .sort((a, b) => b.apy - a.apy);

    const totalAllocated = sorted.reduce((sum, p) => sum + p.allocated, 0);
    if (totalAllocated === 0) {
      return {
        suggestions: [],
        currentAllocations: [],
        isOptimal: true,
        reason: 'No funds currently deployed — nothing to rebalance',
      };
    }

    const targetSplits = [0.6, 0.3, 0.1];
    const suggestions: RebalanceSuggestion[] = [];
    const currentAllocations: YieldAllocation[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const currentPct = totalAllocated > 0 ? p.allocated / totalAllocated : 0;
      const targetPct = targetSplits[i] ?? 0;

      currentAllocations.push({
        protocol: p.name,
        amount: p.allocated,
        percentage: Math.round(currentPct * 10000) / 100,
        estimatedAnnualYield: Math.round(p.allocated * p.apy / 100 * 10000) / 10000,
      });

      const diff = (targetPct - currentPct) * totalAllocated;
      if (Math.abs(diff) > 0.01 && i < targetSplits.length) {
        // Find the protocol to move from/to
        if (diff > 0) {
          // This protocol needs more allocation — find one that's over-allocated
          for (let j = 0; j < sorted.length; j++) {
            if (j === i) continue;
            const otherPct = sorted[j].allocated / totalAllocated;
            const otherTarget = targetSplits[j] ?? 0;
            if (otherPct > otherTarget + 0.02) {
              suggestions.push({
                from: sorted[j].name,
                to: p.name,
                amount: Math.round(Math.abs(diff) * 100) / 100,
                reason: `${p.name} is under-allocated (${(currentPct * 100).toFixed(1)}% vs ${(targetPct * 100).toFixed(1)}% target)`,
                expectedApyGain: Math.round((p.apy - sorted[j].apy) * Math.abs(diff) / 100 * 10000) / 10000,
              });
              break;
            }
          }
        }
      }
    }

    // Accrue earnings on each rebalance check
    this.accrueEarnings();

    const isOptimal = suggestions.length === 0;
    const now = new Date().toISOString();
    for (const p of this.protocols.values()) {
      p.lastRebalance = now;
    }

    return {
      suggestions,
      currentAllocations,
      isOptimal,
      reason: isOptimal
        ? 'Portfolio is optimally balanced across protocols'
        : `${suggestions.length} rebalancing move(s) suggested to improve yield`,
    };
  }

  /** Get detailed yield breakdown per protocol */
  getYieldBreakdown(): YieldBreakdown {
    this.accrueEarnings();

    const allocations: YieldAllocation[] = [];
    let totalDeposited = 0;
    let totalEarnings = 0;
    let weightedApySum = 0;

    for (const p of this.protocols.values()) {
      if (p.allocated > 0) {
        allocations.push({
          protocol: p.name,
          amount: p.allocated,
          percentage: 0, // computed below
          estimatedAnnualYield: Math.round(p.allocated * p.apy / 100 * 10000) / 10000,
        });
        totalDeposited += p.allocated;
        totalEarnings += p.earnings;
        weightedApySum += p.apy * p.allocated;
      }
    }

    // Compute percentages
    for (const a of allocations) {
      a.percentage = totalDeposited > 0
        ? Math.round(a.amount / totalDeposited * 10000) / 100
        : 0;
    }

    const weightedApy = totalDeposited > 0
      ? Math.round(weightedApySum / totalDeposited * 100) / 100
      : 0;

    return {
      totalDeposited: Math.round(totalDeposited * 10000) / 10000,
      totalEarnings: Math.round(totalEarnings * 100000) / 100000,
      weightedApy,
      allocations,
      lastRebalance: new Date().toISOString(),
    };
  }

  /** Simulate small earnings accrual (for demo purposes: ~1 hour of yield) */
  private accrueEarnings(): void {
    for (const p of this.protocols.values()) {
      if (p.allocated > 0) {
        // APY -> hourly rate: apy / 100 / 8760
        const hourlyRate = p.apy / 100 / 8760;
        p.earnings += p.allocated * hourlyRate;
      }
    }
  }
}

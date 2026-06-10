// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
//
// SOCIAL TIP PROPAGATION — Viral Tipping Through Influence Networks
//
// PROBLEM: Tipping is isolated. When you tip a creator, nobody knows.
// There's no social proof, no viral loop, no network effect.
// Tips don't compound into movements.
//
// SOLUTION: AeroFyta creates a TIPPING SOCIAL GRAPH where:
//   1. Every tip creates a "tip wave" that recommends the creator to
//      the tipper's network
//   2. Friends-of-tippers get personalized recommendations
//   3. Matching amplifiers (2x, 5x, 10x) boost tips during campaigns
//   4. Community challenges create viral tipping events
//
// ECONOMICS:
//   - Amplification pools: anyone can deposit USDT that matches tips
//   - Match ratio configurable: 1:1, 2:1, etc.
//   - Matched funds come from community pools, sponsor pools, or yield
//   - Creates positive-sum economics: small tip + match = meaningful income
//
// EXAMPLE:
//   Alice tips $0.01 to CreatorX
//   → AeroFyta recommends CreatorX to Bob and Carol (Alice's network)
//   → Community amplifier matches Alice's tip 5x → Creator gets $0.06 total
//   → Bob sees the recommendation, watches the video, engagement-scores → tips
//   → Viral loop: one small tip seeds a wave of creator support

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

// ── Types ────────────────────────────────────────────────────────

export interface TipWave {
  id: string;
  /** Original tipper who started the wave */
  originTipper: string;
  /** Creator being tipped */
  creatorId: string;
  creatorName: string;
  /** Original tip amount */
  originalAmount: number;
  /** Amplified total (original + matches) */
  amplifiedTotal: number;
  /** Match multiplier applied */
  matchMultiplier: number;
  /** Number of people who joined this wave */
  participants: number;
  /** Downstream tips triggered by this wave */
  downstreamTips: Array<{
    tipper: string;
    amount: number;
    source: 'recommendation' | 'amplifier' | 'organic';
    timestamp: string;
  }>;
  /** Status of the wave */
  status: 'active' | 'completed' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface AmplifierPool {
  id: string;
  name: string;
  /** Who funded this pool */
  sponsor: string;
  /** Total USDT deposited */
  totalDeposited: number;
  /** Remaining balance */
  remaining: number;
  /** Match ratio (e.g., 2 means 2:1 matching) */
  matchRatio: number;
  /** Maximum match per tip */
  maxMatchPerTip: number;
  /** Categories eligible for matching */
  eligibleCategories: string[];
  /** Active status */
  active: boolean;
  createdAt: string;
}

export interface PropagationStats {
  totalWaves: number;
  activeWaves: number;
  totalAmplified: number;
  totalParticipants: number;
  avgAmplification: number;
  activePools: number;
  poolBalance: number;
  viralCoefficient: number; // avg downstream tips per original tip
}

// ── Service ──────────────────────────────────────────────────────

/**
 * TipPropagationService — Viral tipping through social influence.
 *
 * Creates network effects around tipping:
 * - Every tip starts a "wave" that can be amplified
 * - Amplifier pools match tips (like employer 401k matching)
 * - Recommendations spread through viewer networks
 * - Viral coefficient tracks how many downstream tips each tip generates
 *
 * This transforms tipping from isolated transactions into
 * social movements that compound creator support.
 */
export class TipPropagationService {
  private waves: Map<string, TipWave> = new Map();
  private pools: Map<string, AmplifierPool> = new Map();

  constructor() {
    // Create a default community amplifier pool
    this.createPool({
      name: 'Community Amplifier',
      sponsor: 'community',
      totalDeposited: 1.0,
      matchRatio: 2,
      maxMatchPerTip: 0.05,
      eligibleCategories: [],
    });
    logger.info('Tip propagation engine initialized (viral tipping + amplifiers)');
  }

  // ── Tip Waves ──────────────────────────────────────────────────

  /**
   * Create a tip wave from an original tip.
   * The wave can be amplified by matching pools and spread through recommendations.
   */
  createWave(params: {
    tipper: string;
    creatorId: string;
    creatorName: string;
    amount: number;
    categories?: string[];
  }): TipWave {
    // Check for matching amplifier pools
    let matchTotal = 0;
    let matchMultiplier = 1;

    for (const pool of this.pools.values()) {
      if (!pool.active || pool.remaining <= 0) continue;

      // Check category eligibility
      if (pool.eligibleCategories.length > 0 && params.categories) {
        const hasEligible = params.categories.some((c) =>
          pool.eligibleCategories.includes(c),
        );
        if (!hasEligible) continue;
      }

      // Calculate match
      const maxMatch = Math.min(
        params.amount * pool.matchRatio,
        pool.maxMatchPerTip,
        pool.remaining,
      );

      if (maxMatch > 0) {
        pool.remaining -= maxMatch;
        matchTotal += maxMatch;
        matchMultiplier = 1 + matchTotal / params.amount;
      }
    }

    const wave: TipWave = {
      id: uuidv4(),
      originTipper: params.tipper,
      creatorId: params.creatorId,
      creatorName: params.creatorName,
      originalAmount: params.amount,
      amplifiedTotal: params.amount + matchTotal,
      matchMultiplier: Math.round(matchMultiplier * 100) / 100,
      participants: 1,
      downstreamTips: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
    };

    this.waves.set(wave.id, wave);

    if (matchTotal > 0) {
      logger.info('Tip wave created with amplification', {
        waveId: wave.id,
        original: params.amount,
        matched: matchTotal,
        total: wave.amplifiedTotal,
        multiplier: wave.matchMultiplier,
      });
    }

    return wave;
  }

  /** Add a downstream tip to an existing wave (someone joined the wave) */
  addDownstreamTip(waveId: string, tipper: string, amount: number, source: 'recommendation' | 'amplifier' | 'organic'): void {
    const wave = this.waves.get(waveId);
    if (!wave || wave.status !== 'active') return;

    wave.downstreamTips.push({
      tipper,
      amount,
      source,
      timestamp: new Date().toISOString(),
    });
    wave.participants++;
    wave.amplifiedTotal += amount;
  }

  /** Get active waves for a creator */
  getWavesForCreator(creatorId: string): TipWave[] {
    return Array.from(this.waves.values())
      .filter((w) => w.creatorId === creatorId && w.status === 'active');
  }

  /** Get all waves */
  getAllWaves(): TipWave[] {
    return Array.from(this.waves.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ── Amplifier Pools ────────────────────────────────────────────

  /** Create a tip amplifier pool */
  createPool(params: {
    name: string;
    sponsor: string;
    totalDeposited: number;
    matchRatio: number;
    maxMatchPerTip: number;
    eligibleCategories: string[];
  }): AmplifierPool {
    const pool: AmplifierPool = {
      id: uuidv4(),
      name: params.name,
      sponsor: params.sponsor,
      totalDeposited: params.totalDeposited,
      remaining: params.totalDeposited,
      matchRatio: params.matchRatio,
      maxMatchPerTip: params.maxMatchPerTip,
      eligibleCategories: params.eligibleCategories,
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.pools.set(pool.id, pool);
    return pool;
  }

  /** Get all amplifier pools */
  getPools(): AmplifierPool[] {
    return Array.from(this.pools.values());
  }

  // ── Statistics ─────────────────────────────────────────────────

  getStats(): PropagationStats {
    const allWaves = Array.from(this.waves.values());
    const activeWaves = allWaves.filter((w) => w.status === 'active');
    const totalDownstream = allWaves.reduce((s, w) => s + w.downstreamTips.length, 0);
    const viralCoefficient = allWaves.length > 0
      ? totalDownstream / allWaves.length
      : 0;

    return {
      totalWaves: allWaves.length,
      activeWaves: activeWaves.length,
      totalAmplified: allWaves.reduce((s, w) => s + w.amplifiedTotal, 0),
      totalParticipants: allWaves.reduce((s, w) => s + w.participants, 0),
      avgAmplification: allWaves.length > 0
        ? allWaves.reduce((s, w) => s + w.matchMultiplier, 0) / allWaves.length
        : 1,
      activePools: Array.from(this.pools.values()).filter((p) => p.active).length,
      poolBalance: Array.from(this.pools.values()).reduce((s, p) => s + p.remaining, 0),
      viralCoefficient: Math.round(viralCoefficient * 100) / 100,
    };
  }
}

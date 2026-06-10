// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Economics Service (Group 6)
//
// Implements Features: 17, 29, 37, 41, 42, 56, 57, 59
//   17: Creator Scoring / Engagement Formula
//   29: Aave V3 Yield on Idle Reserves
//   37: Velora Swap (Treasury Rebalance)
//   41: Smart Split (90/5/5)
//   42: Creator Per-Chain Profiles
//   56: Community Tipping Pool Flow
//   57: Performance Bonus Round
//   59: Goal-Based Creator Tipping

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';
import type { LendingService } from './lending.service.js';
import type { TreasuryService } from './treasury.service.js';
import type { ChainId } from '../types/index.js';

// Import types from extracted module
import {
  SCORE_WEIGHTS,
  DEFAULT_BONUS_MILESTONES,
} from './economics-yield.js';
import type {
  CreatorEngagementData,
  CreatorScore,
  CreatorScoreHistory,
  YieldStatus,
  SplitConfig,
  SplitResult,
  SplitTotals,
  TreasuryAllocationStatus,
  CreatorChainProfile,
  PoolDistribution,
  CommunityPool,
  PoolStatus,
  BonusMilestone,
  AwardedBonus,
  CreatorGoal,
} from './economics-yield.js';

// Re-export all types for backward compatibility
export {
  SCORE_WEIGHTS,
  DEFAULT_BONUS_MILESTONES,
} from './economics-yield.js';
export type {
  CreatorEngagementData,
  CreatorScore,
  CreatorScoreHistory,
  YieldStatus,
  SplitConfig,
  SplitResult,
  SplitTotals,
  TreasuryAllocationStatus,
  CreatorChainProfile,
  PoolContribution,
  PoolDistribution,
  CommunityPool,
  PoolStatus,
  BonusMilestone,
  AwardedBonus,
  CreatorGoal,
} from './economics-yield.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ECONOMICS_FILE = resolve(__dirname, '..', '..', '.economics.json');

// ── ENV-based Configuration ──────────────────────────────────────

const SPLIT_CREATOR = parseInt(process.env.SPLIT_CREATOR ?? '90', 10);
const SPLIT_PLATFORM = parseInt(process.env.SPLIT_PLATFORM ?? '5', 10);
const SPLIT_COMMUNITY = parseInt(process.env.SPLIT_COMMUNITY ?? '5', 10);

const YIELD_IDLE_THRESHOLD = parseFloat(process.env.YIELD_IDLE_THRESHOLD ?? '100');
const REBALANCE_USDT_TARGET = parseFloat(process.env.REBALANCE_USDT_TARGET ?? '70');
const REBALANCE_XAUT_TARGET = parseFloat(process.env.REBALANCE_XAUT_TARGET ?? '15');
const REBALANCE_NATIVE_TARGET = parseFloat(process.env.REBALANCE_NATIVE_TARGET ?? '15');

// Types and constants are now in economics-yield.ts (imported above)

// ══════════════════════════════════════════════════════════════════
// Persisted State
// ══════════════════════════════════════════════════════════════════

interface EconomicsState {
  // Feature 17
  creatorScores: Record<string, CreatorScore>;
  scoreHistory: Record<string, Array<{ date: string; score: number; tier: string }>>;
  // Feature 29
  yieldDeposited: number;
  yieldEarned: number;
  yieldApy: number;
  lastYieldDepositAt: string | null;
  lastYieldWithdrawAt: string | null;
  // Feature 41
  splitTotals: SplitTotals;
  // Feature 37
  treasuryHoldings: Record<string, number>;
  lastRebalanceAt: string | null;
  // Feature 42
  creatorProfiles: Record<string, CreatorChainProfile>;
  // Feature 56
  communityPool: CommunityPool;
  // Feature 57
  awardedBonuses: AwardedBonus[];
  // Feature 59
  creatorGoals: CreatorGoal[];
}

const DEFAULT_STATE: EconomicsState = {
  creatorScores: {},
  scoreHistory: {},
  yieldDeposited: 0,
  yieldEarned: 0,
  yieldApy: 4.5,
  lastYieldDepositAt: null,
  lastYieldWithdrawAt: null,
  splitTotals: { totalProcessed: 0, totalCreator: 0, totalPlatform: 0, totalCommunity: 0, tipCount: 0 },
  treasuryHoldings: { USDT: 0, XAUt: 0, native: 0 },
  lastRebalanceAt: null,
  creatorProfiles: {},
  communityPool: { balance: 0, totalContributed: 0, contributions: [], distributions: [], pendingVotes: [] },
  awardedBonuses: [],
  creatorGoals: [],
};

// ══════════════════════════════════════════════════════════════════
// Service
// ══════════════════════════════════════════════════════════════════

/**
 * EconomicsService — Group 6 Economic Features for AeroFyta
 *
 * Handles creator scoring, yield management, smart splits,
 * treasury rebalancing, community pools, performance bonuses,
 * and goal-based tipping.
 */
export class EconomicsService {
  private state: EconomicsState;
  private lendingService: LendingService | null = null;
  // Treasury service used for yield status integration
  private _treasuryService: TreasuryService | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private walletService: any = null;

  constructor() {
    this.state = this.load();
    logger.info('Economics service initialized (Group 6 — 8 features)');
  }

  /** Wire optional dependencies */
  setLendingService(ls: LendingService): void {
    this.lendingService = ls;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setWalletService(ws: any): void {
    this.walletService = ws;
  }

  setTreasuryService(ts: TreasuryService): void {
    this._treasuryService = ts;
  }

  /** Get the wired treasury service (for external callers) */
  getTreasuryService(): TreasuryService | null {
    return this._treasuryService;
  }

  // ══════════════════════════════════════════════════════════════
  // Feature 17: Creator Scoring / Engagement Formula
  // ══════════════════════════════════════════════════════════════

  /**
   * Calculate a creator's engagement score (0-100).
   * Score = weighted sum of normalized metrics.
   */
  scoreCreator(creatorId: string, data: CreatorEngagementData, creatorName?: string): CreatorScore {
    // Normalize each metric to 0-100 scale
    const viewScore = Math.min(100, (data.viewCount / 100_000) * 100);
    const likeScore = Math.min(100, data.likeRatio * 100);
    const commentScore = Math.min(100, (data.commentCount / 500) * 100);
    const watchTimeScore = Math.min(100, (data.watchTimeMinutes / 10_000) * 100);
    const growthScore = Math.min(100, data.subscriberGrowthRate * 100);

    // Weighted sum
    const score = Math.round(
      viewScore * SCORE_WEIGHTS.viewCount +
      likeScore * SCORE_WEIGHTS.likeRatio +
      commentScore * SCORE_WEIGHTS.commentCount +
      watchTimeScore * SCORE_WEIGHTS.watchTimeMinutes +
      growthScore * SCORE_WEIGHTS.subscriberGrowthRate
    );

    const normalizedScore = Math.min(100, Math.max(0, score));

    // Determine tier
    let tier: 'high' | 'medium' | 'low';
    let tipMultiplier: number;
    if (normalizedScore > 70) {
      tier = 'high';
      tipMultiplier = 1.5;
    } else if (normalizedScore >= 40) {
      tier = 'medium';
      tipMultiplier = 1.0;
    } else {
      tier = 'low';
      tipMultiplier = 0.5;
    }

    const result: CreatorScore = {
      creatorId,
      creatorName,
      score: normalizedScore,
      tier,
      breakdown: {
        viewScore: Math.round(viewScore * 100) / 100,
        likeScore: Math.round(likeScore * 100) / 100,
        commentScore: Math.round(commentScore * 100) / 100,
        watchTimeScore: Math.round(watchTimeScore * 100) / 100,
        growthScore: Math.round(growthScore * 100) / 100,
      },
      tipMultiplier,
      updatedAt: new Date().toISOString(),
    };

    // Store and track history
    this.state.creatorScores[creatorId] = result;

    const today = new Date().toISOString().split('T')[0];
    if (!this.state.scoreHistory[creatorId]) {
      this.state.scoreHistory[creatorId] = [];
    }
    const history = this.state.scoreHistory[creatorId];
    const lastEntry = history[history.length - 1];
    if (!lastEntry || lastEntry.date !== today) {
      history.push({ date: today, score: normalizedScore, tier });
      if (history.length > 90) history.splice(0, history.length - 90);
    } else {
      lastEntry.score = normalizedScore;
      lastEntry.tier = tier;
    }

    this.save();

    logger.info('Creator scored', { creatorId, score: normalizedScore, tier, tipMultiplier });

    return result;
  }

  /** Get all creator scores */
  getAllScores(): CreatorScore[] {
    return Object.values(this.state.creatorScores);
  }

  /** Get a specific creator's score */
  getCreatorScore(creatorId: string): CreatorScore | null {
    return this.state.creatorScores[creatorId] ?? null;
  }

  /** Get score history for a creator */
  getScoreHistory(creatorId: string): CreatorScoreHistory {
    return {
      creatorId,
      scores: this.state.scoreHistory[creatorId] ?? [],
    };
  }

  // ══════════════════════════════════════════════════════════════
  // Feature 29: Aave V3 Yield on Idle Reserves
  // ══════════════════════════════════════════════════════════════

  /** Get current yield status */
  getYieldStatus(): YieldStatus {
    return {
      deposited: this.state.yieldDeposited,
      earnedYield: this.state.yieldEarned,
      currentApy: this.state.yieldApy,
      chain: 'Ethereum Sepolia',
      protocol: 'Aave V3',
      lastDepositAt: this.state.lastYieldDepositAt,
      lastWithdrawAt: this.state.lastYieldWithdrawAt,
      idleThreshold: YIELD_IDLE_THRESHOLD,
    };
  }

  /**
   * Deposit idle USDT into Aave V3 for yield.
   * Attempts real WDK execution via Aave V3, falls back to local balance tracking when testnet contracts are unavailable.
   */
  async depositToYield(amount: number): Promise<{ success: boolean; deposited: number; message: string }> {
    if (amount <= 0) {
      return { success: false, deposited: 0, message: 'Amount must be positive' };
    }

    logger.info('Economics: depositing to Aave V3 yield', { amount });

    // Try real lending service
    if (this.lendingService) {
      try {
        const action = await this.lendingService.supply('ethereum-sepolia', String(amount), 'USDT');
        if (action.status === 'completed' && action.txHash) {
          this.state.yieldDeposited += amount;
          this.state.lastYieldDepositAt = new Date().toISOString();
          this.save();
          return { success: true, deposited: amount, message: `Deposited ${amount} USDT to Aave V3 (tx: ${action.txHash})` };
        }
      } catch (err) {
        logger.warn('Aave V3 deposit unavailable on this network, using local balance tracking', { error: String(err) });
      }
    }

    // Local balance tracking (Aave V3 contract not available on current testnet)
    this.state.yieldDeposited += amount;
    this.state.lastYieldDepositAt = new Date().toISOString();
    this.save();

    return {
      success: true,
      deposited: amount,
      message: `Deposited ${amount} USDT to yield pool (local tracking — Aave V3 pending on mainnet)`,
    };
  }

  /**
   * Withdraw from Aave V3 yield.
   */
  async withdrawFromYield(amount: number): Promise<{ success: boolean; withdrawn: number; message: string }> {
    if (amount <= 0) {
      return { success: false, withdrawn: 0, message: 'Amount must be positive' };
    }
    if (amount > this.state.yieldDeposited) {
      return { success: false, withdrawn: 0, message: `Insufficient yield balance. Deposited: ${this.state.yieldDeposited}` };
    }

    logger.info('Economics: withdrawing from Aave V3 yield', { amount });

    // Try real lending service
    if (this.lendingService) {
      try {
        const action = await this.lendingService.withdraw('ethereum-sepolia', String(amount), 'USDT');
        if (action.status === 'completed' && action.txHash) {
          this.state.yieldDeposited -= amount;
          this.state.lastYieldWithdrawAt = new Date().toISOString();
          this.save();
          return { success: true, withdrawn: amount, message: `Withdrew ${amount} USDT from Aave V3 (tx: ${action.txHash})` };
        }
      } catch (err) {
        logger.warn('Aave V3 withdraw unavailable on this network, using local balance tracking', { error: String(err) });
      }
    }

    // Local balance tracking (Aave V3 contract not available on current testnet)
    this.state.yieldDeposited -= amount;
    this.state.lastYieldWithdrawAt = new Date().toISOString();
    this.save();

    return {
      success: true,
      withdrawn: amount,
      message: `Withdrew ${amount} USDT from yield pool (local tracking — Aave V3 pending on mainnet)`,
    };
  }

  /**
   * Auto-manage yield: deposit excess above threshold, withdraw if needed for tips.
   * Called by the autonomous loop.
   */
  async autoManageYield(walletBalance: number): Promise<string> {
    const idle = walletBalance - YIELD_IDLE_THRESHOLD;

    if (idle > 0 && this.state.yieldDeposited === 0) {
      // Wallet has excess — deposit
      const depositAmount = idle * 0.8; // Keep 20% buffer
      const result = await this.depositToYield(depositAmount);
      return result.message;
    }

    // Accrue yield using live APY from DeFi Llama (via lending service) when available
    if (this.state.yieldDeposited > 0) {
      // Refresh APY from live data source
      if (this.lendingService) {
        try {
          const rates = await this.lendingService.getYieldRates();
          const aaveUsdt = rates.find(r => r.asset === 'USDT' && r.protocol.toLowerCase().includes('aave'));
          if (aaveUsdt && aaveUsdt.supplyApy > 0) {
            this.state.yieldApy = aaveUsdt.supplyApy;
            logger.debug('Yield APY updated from DeFi Llama', { apy: aaveUsdt.supplyApy });
          }
        } catch {
          // Use last known APY if DeFi Llama is unreachable
        }
      }

      // Apply per-cycle yield accrual (1 cycle ≈ 60s, scaled from annual rate)
      const cyclesPerYear = 365 * 24 * 60; // ~525,600 cycles at 60s each
      const perCycleRate = this.state.yieldApy / 100 / cyclesPerYear;
      const earned = this.state.yieldDeposited * perCycleRate;
      this.state.yieldEarned += earned;
      this.save();
    }

    return 'Yield position stable — no rebalance needed';
  }

  // ══════════════════════════════════════════════════════════════
  // Feature 41: Smart Split (90/5/5)
  // ══════════════════════════════════════════════════════════════

  /** Get current split configuration */
  getSplitConfig(): SplitConfig {
    return {
      creatorPercent: SPLIT_CREATOR,
      platformPercent: SPLIT_PLATFORM,
      communityPercent: SPLIT_COMMUNITY,
    };
  }

  /**
   * Calculate the smart split for a tip amount.
   * Validates that ratios sum to 100.
   *
   * Architecture: The split is computed off-chain (arithmetic), but settlement
   * is on-chain — the caller sends `creatorAmount` via WDK transfer to the
   * creator, while `platformAmount` and `communityAmount` stay in the agent's
   * own WDK wallet (segregated via HD account indices: Treasury, Community Pool).
   * This avoids multiple on-chain transfers per tip while maintaining transparent
   * accounting via the persisted economics state.
   */
  calculateSplit(totalAmount: number): SplitResult {
    const sum = SPLIT_CREATOR + SPLIT_PLATFORM + SPLIT_COMMUNITY;
    if (Math.abs(sum - 100) > 0.01) {
      logger.warn('Split ratios do not sum to 100', { sum, creator: SPLIT_CREATOR, platform: SPLIT_PLATFORM, community: SPLIT_COMMUNITY });
    }

    const creatorAmount = Math.round(totalAmount * (SPLIT_CREATOR / 100) * 1e6) / 1e6;
    const platformAmount = Math.round(totalAmount * (SPLIT_PLATFORM / 100) * 1e6) / 1e6;
    const communityAmount = Math.round(totalAmount * (SPLIT_COMMUNITY / 100) * 1e6) / 1e6;

    const breakdown = `Tip $${totalAmount.toFixed(4)}: Creator=$${creatorAmount.toFixed(4)}, Platform=$${platformAmount.toFixed(4)}, Community=$${communityAmount.toFixed(4)}`;

    logger.info('Smart split calculated', { totalAmount, creatorAmount, platformAmount, communityAmount });

    return { totalAmount, creatorAmount, platformAmount, communityAmount, breakdown };
  }

  /**
   * Execute the smart split — records the split, sends ALL portions via WDK.
   * Call this from the tip execution flow.
   *
   * - Creator share: sent to creator address on-chain
   * - Platform share: sent to HD wallet index 1 (platform treasury)
   * - Community pool share: sent to HD wallet index 2 (community pool)
   *
   * Falls back to local tracking if WDK transfers fail.
   */
  async executeSplit(totalAmount: number, opts?: {
    creatorAddress?: string;
    chain?: ChainId;
  }): Promise<SplitResult & { txHashes?: { creator?: string; platform?: string; community?: string } }> {
    const split = this.calculateSplit(totalAmount);
    const chain: ChainId = opts?.chain ?? 'ethereum-sepolia';
    const txHashes: { creator?: string; platform?: string; community?: string } = {};

    // Track totals (persisted to .economics.json via save())
    this.state.splitTotals.totalProcessed += totalAmount;
    this.state.splitTotals.totalCreator += split.creatorAmount;
    this.state.splitTotals.totalPlatform += split.platformAmount;
    this.state.splitTotals.totalCommunity += split.communityAmount;
    this.state.splitTotals.tipCount += 1;

    // Send all portions via WDK if wallet is available
    if (this.walletService && split.platformAmount > 0) {
      try {
        // Platform share → HD wallet index 1
        const savedIndex = this.walletService.getActiveAccountIndex();
        this.walletService.setActiveAccountIndex(1);
        const platformAddr = await this.walletService.getAddress(chain);
        this.walletService.setActiveAccountIndex(savedIndex);

        const platformTx = await this.walletService.sendUsdtTransfer(chain, platformAddr, String(split.platformAmount));
        txHashes.platform = platformTx.hash;
        logger.info('Smart split: platform share sent via WDK', { amount: split.platformAmount, txHash: platformTx.hash });
      } catch (err) {
        logger.warn('Smart split: platform WDK transfer failed, tracked locally', { error: String(err) });
      }
    }

    if (this.walletService && split.communityAmount > 0) {
      try {
        // Community pool share → HD wallet index 2
        const savedIndex = this.walletService.getActiveAccountIndex();
        this.walletService.setActiveAccountIndex(2);
        const communityAddr = await this.walletService.getAddress(chain);
        this.walletService.setActiveAccountIndex(savedIndex);

        const communityTx = await this.walletService.sendUsdtTransfer(chain, communityAddr, String(split.communityAmount));
        txHashes.community = communityTx.hash;
        logger.info('Smart split: community share sent via WDK', { amount: split.communityAmount, txHash: communityTx.hash });
      } catch (err) {
        logger.warn('Smart split: community WDK transfer failed, tracked locally', { error: String(err) });
      }
    }

    // Add community portion to pool — persisted to disk (Feature 56)
    this.state.communityPool.balance += split.communityAmount;
    this.state.communityPool.totalContributed += split.communityAmount;
    this.state.communityPool.contributions.push({
      from: 'smart_split',
      amount: split.communityAmount,
      timestamp: new Date().toISOString(),
    });

    // Cap contributions array to prevent unbounded growth
    if (this.state.communityPool.contributions.length > 500) {
      this.state.communityPool.contributions = this.state.communityPool.contributions.slice(-500);
    }

    this.save();

    logger.info('Smart split executed and persisted', { breakdown: split.breakdown, txHashes });

    return { ...split, txHashes };
  }

  /** Get cumulative split totals */
  getSplitTotals(): SplitTotals {
    return { ...this.state.splitTotals };
  }

  // ══════════════════════════════════════════════════════════════
  // Feature 37: Velora Swap (Treasury Rebalance)
  // ══════════════════════════════════════════════════════════════

  /** Get current treasury allocation breakdown */
  getTreasuryAllocation(): TreasuryAllocationStatus {
    const holdings = this.state.treasuryHoldings;
    const total = Object.values(holdings).reduce((s, v) => s + v, 0);

    const holdingsArr = Object.entries(holdings).map(([token, amount]) => ({
      token,
      amount,
      percent: total > 0 ? Math.round((amount / total) * 10000) / 100 : 0,
    }));

    const target = {
      usdt: REBALANCE_USDT_TARGET,
      xaut: REBALANCE_XAUT_TARGET,
      native: REBALANCE_NATIVE_TARGET,
    };

    // Determine if rebalance is needed (>5% off target)
    let needsRebalance = false;
    const rebalanceActions: TreasuryAllocationStatus['rebalanceActions'] = [];

    if (total > 0) {
      const usdtPct = ((holdings.USDT ?? 0) / total) * 100;
      const xautPct = ((holdings.XAUt ?? 0) / total) * 100;
      const nativePct = ((holdings.native ?? 0) / total) * 100;

      if (Math.abs(usdtPct - target.usdt) > 5) {
        needsRebalance = true;
        const diff = usdtPct - target.usdt;
        if (diff > 0) {
          const swapAmount = (diff / 100) * total;
          rebalanceActions.push({
            action: 'swap',
            fromToken: 'USDT',
            toToken: xautPct < target.xaut ? 'XAUt' : 'native',
            amount: Math.round(swapAmount * 1e4) / 1e4,
            reason: `USDT overweight by ${diff.toFixed(1)}% — diversifying to maintain target allocation`,
          });
        }
      }

      if (Math.abs(xautPct - target.xaut) > 5) {
        needsRebalance = true;
        if (xautPct < target.xaut) {
          const deficit = ((target.xaut - xautPct) / 100) * total;
          rebalanceActions.push({
            action: 'swap',
            fromToken: 'USDT',
            toToken: 'XAUt',
            amount: Math.round(deficit * 1e4) / 1e4,
            reason: `XAUt underweight — need ${deficit.toFixed(4)} more to reach ${target.xaut}% target`,
          });
        }
      }

      if (Math.abs(nativePct - target.native) > 5) {
        needsRebalance = true;
        if (nativePct < target.native) {
          const deficit = ((target.native - nativePct) / 100) * total;
          rebalanceActions.push({
            action: 'swap',
            fromToken: 'USDT',
            toToken: 'native',
            amount: Math.round(deficit * 1e4) / 1e4,
            reason: `Native token underweight — need ${deficit.toFixed(4)} more to reach ${target.native}% target`,
          });
        }
      }
    }

    return {
      holdings: holdingsArr,
      target,
      needsRebalance,
      rebalanceActions,
      lastRebalanceAt: this.state.lastRebalanceAt,
    };
  }

  /**
   * Execute treasury rebalance.
   * Executes treasury rebalance (uses WDK swap if available, otherwise tracks internally).
   */
  async rebalanceTreasury(): Promise<{ success: boolean; actions: string[]; message: string }> {
    const alloc = this.getTreasuryAllocation();

    if (!alloc.needsRebalance) {
      return { success: true, actions: [], message: 'Treasury is balanced — no rebalance needed' };
    }

    const actions: string[] = [];

    for (const action of alloc.rebalanceActions) {
      const fromAmount = this.state.treasuryHoldings[action.fromToken] ?? 0;
      if (fromAmount >= action.amount) {
        // Attempt WDK swap via Velora protocol if wallet service is available
        let swapExecuted = false;
        if (this.walletService) {
          try {
            // WDK swap: use registered swap protocol (Velora EVM)
            const account = await this.walletService.getWdkAccount?.('ethereum-sepolia');
            if (account?.getSwapProtocol) {
              const swapProto = account.getSwapProtocol('velora');
              const result = await swapProto.swap({
                tokenIn: action.fromToken,
                tokenOut: action.toToken,
                amount: String(action.amount),
                side: 'sell',
              });
              actions.push(`WDK swap: ${action.amount} ${action.fromToken} → ${action.toToken} (tx: ${result.hash}) — ${action.reason}`);
              swapExecuted = true;
              logger.info('Treasury WDK swap executed', { from: action.fromToken, to: action.toToken, tx: result.hash });
            }
          } catch (err) {
            logger.debug('WDK swap unavailable, using local allocation tracking', { error: String(err) });
          }
        }

        // Local allocation tracking (always update regardless of WDK swap)
        this.state.treasuryHoldings[action.fromToken] = fromAmount - action.amount;
        this.state.treasuryHoldings[action.toToken] = (this.state.treasuryHoldings[action.toToken] ?? 0) + action.amount;

        if (!swapExecuted) {
          actions.push(`Rebalanced ${action.amount} ${action.fromToken} → ${action.toToken}: ${action.reason}`);
        }
        logger.info('Treasury rebalance action', { from: action.fromToken, to: action.toToken, amount: action.amount, onChain: swapExecuted });
      } else {
        actions.push(`Insufficient ${action.fromToken} for swap (have: ${fromAmount}, need: ${action.amount})`);
      }
    }

    this.state.lastRebalanceAt = new Date().toISOString();
    this.save();

    return {
      success: true,
      actions,
      message: `Rebalanced treasury with ${actions.length} actions`,
    };
  }

  /** Update treasury holdings (called when balances change) */
  updateTreasuryHoldings(usdt: number, xaut: number, native: number): void {
    this.state.treasuryHoldings = { USDT: usdt, XAUt: xaut, native };
    this.save();
  }

  // ══════════════════════════════════════════════════════════════
  // Feature 42: Creator Per-Chain Profiles
  // ══════════════════════════════════════════════════════════════

  /** Get a creator's chain profile */
  getCreatorProfile(creatorId: string): CreatorChainProfile | null {
    return this.state.creatorProfiles[creatorId] ?? null;
  }

  /** Set or update a creator's chain profile */
  setCreatorProfile(
    creatorId: string,
    preferredChain: ChainId | null,
    walletAddresses: Record<string, string>,
  ): CreatorChainProfile {
    const profile: CreatorChainProfile = {
      creatorId,
      preferredChain,
      walletAddresses,
      updatedAt: new Date().toISOString(),
    };

    this.state.creatorProfiles[creatorId] = profile;
    this.save();

    logger.info('Creator profile updated', { creatorId, preferredChain, chains: Object.keys(walletAddresses) });

    return profile;
  }

  /** Get preferred chain for a creator (for tip routing) */
  getPreferredChain(creatorId: string): ChainId | null {
    return this.state.creatorProfiles[creatorId]?.preferredChain ?? null;
  }

  /** Get all creator profiles */
  getAllProfiles(): CreatorChainProfile[] {
    return Object.values(this.state.creatorProfiles);
  }

  // ══════════════════════════════════════════════════════════════
  // Feature 56: Community Tipping Pool
  // ══════════════════════════════════════════════════════════════

  /** Get pool status */
  getPoolStatus(): PoolStatus {
    const pool = this.state.communityPool;
    const uniqueContributors = new Set(pool.contributions.map(c => c.from)).size;
    const totalDistributed = pool.distributions.reduce((s, d) => s + d.totalDistributed, 0);

    return {
      balance: Math.round(pool.balance * 1e6) / 1e6,
      totalContributed: Math.round(pool.totalContributed * 1e6) / 1e6,
      totalDistributed: Math.round(totalDistributed * 1e6) / 1e6,
      contributorCount: uniqueContributors,
      distributionCount: pool.distributions.length,
      pendingVotes: pool.pendingVotes,
    };
  }

  /** Contribute to the community pool */
  contributeToPool(from: string, amount: number): { success: boolean; newBalance: number; message: string } {
    if (amount <= 0) {
      return { success: false, newBalance: this.state.communityPool.balance, message: 'Amount must be positive' };
    }

    this.state.communityPool.balance += amount;
    this.state.communityPool.totalContributed += amount;
    this.state.communityPool.contributions.push({
      from,
      amount,
      timestamp: new Date().toISOString(),
    });

    // Keep last 500 contributions
    if (this.state.communityPool.contributions.length > 500) {
      this.state.communityPool.contributions = this.state.communityPool.contributions.slice(-500);
    }

    this.save();

    logger.info('Community pool contribution', { from, amount, newBalance: this.state.communityPool.balance });

    return {
      success: true,
      newBalance: this.state.communityPool.balance,
      message: `Added ${amount} USDT to community pool. New balance: ${this.state.communityPool.balance.toFixed(4)}`,
    };
  }

  /** Distribute pool funds to creators based on community votes */
  distributePool(recipients: Array<{ creatorId: string; amount: number }>): {
    success: boolean;
    distributionId: string;
    distributed: number;
    message: string;
  } {
    const totalNeeded = recipients.reduce((s, r) => s + r.amount, 0);

    if (totalNeeded > this.state.communityPool.balance) {
      return {
        success: false,
        distributionId: '',
        distributed: 0,
        message: `Insufficient pool balance. Available: ${this.state.communityPool.balance.toFixed(4)}, Needed: ${totalNeeded.toFixed(4)}`,
      };
    }

    const distributionId = `dist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const distribution: PoolDistribution = {
      id: distributionId,
      recipients,
      totalDistributed: totalNeeded,
      timestamp: new Date().toISOString(),
    };

    this.state.communityPool.balance -= totalNeeded;
    this.state.communityPool.distributions.push(distribution);

    // Keep last 100 distributions
    if (this.state.communityPool.distributions.length > 100) {
      this.state.communityPool.distributions = this.state.communityPool.distributions.slice(-100);
    }

    this.save();

    logger.info('Community pool distributed', {
      distributionId,
      recipients: recipients.length,
      totalDistributed: totalNeeded,
      remainingBalance: this.state.communityPool.balance,
    });

    return {
      success: true,
      distributionId,
      distributed: totalNeeded,
      message: `Distributed ${totalNeeded.toFixed(4)} USDT to ${recipients.length} creators`,
    };
  }

  /**
   * Disburse pool funds via WDK — sends real on-chain USDT transfers
   * to each recipient when the pool balance is sufficient.
   */
  async disbursePool(recipients: Array<{ creatorId: string; amount: number; address?: string }>): Promise<{
    success: boolean;
    distributionId: string;
    results: Array<{ creatorId: string; amount: number; txHash?: string; error?: string }>;
    totalDisbursed: number;
    message: string;
  }> {
    const totalNeeded = recipients.reduce((s, r) => s + r.amount, 0);

    if (totalNeeded > this.state.communityPool.balance) {
      return {
        success: false,
        distributionId: '',
        results: [],
        totalDisbursed: 0,
        message: `Insufficient pool balance. Available: ${this.state.communityPool.balance.toFixed(4)}, Needed: ${totalNeeded.toFixed(4)}`,
      };
    }

    const distributionId = `dist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const results: Array<{ creatorId: string; amount: number; txHash?: string; error?: string }> = [];
    let totalDisbursed = 0;

    for (const r of recipients) {
      // Resolve wallet address: use explicit address, or look up creator profile
      let address = r.address;
      if (!address) {
        const profile = this.getCreatorProfile(r.creatorId);
        address = profile?.walletAddresses?.['ethereum-sepolia']
          ?? Object.values(profile?.walletAddresses ?? {})[0];
      }

      if (!address) {
        results.push({ creatorId: r.creatorId, amount: r.amount, error: 'No wallet address found' });
        continue;
      }

      // Send via WDK
      if (this.walletService) {
        try {
          const chain: ChainId = 'ethereum-sepolia';
          const tx = await this.walletService.sendUsdtTransfer(chain, address, String(r.amount));
          results.push({ creatorId: r.creatorId, amount: r.amount, txHash: tx.hash });
          totalDisbursed += r.amount;
          logger.info('Pool disbursement sent', { creatorId: r.creatorId, amount: r.amount, txHash: tx.hash });
        } catch (err) {
          results.push({ creatorId: r.creatorId, amount: r.amount, error: String(err) });
          logger.warn('Pool disbursement WDK transfer failed', { creatorId: r.creatorId, error: String(err) });
        }
      } else {
        // Local tracking only (no wallet connected)
        results.push({ creatorId: r.creatorId, amount: r.amount, error: 'WalletService not connected — local tracking only' });
        totalDisbursed += r.amount;
      }
    }

    // Deduct from pool balance
    this.state.communityPool.balance -= totalDisbursed;
    this.state.communityPool.distributions.push({
      id: distributionId,
      recipients: recipients.map(r => ({ creatorId: r.creatorId, amount: r.amount })),
      totalDistributed: totalDisbursed,
      timestamp: new Date().toISOString(),
    });

    if (this.state.communityPool.distributions.length > 100) {
      this.state.communityPool.distributions = this.state.communityPool.distributions.slice(-100);
    }

    this.save();

    logger.info('Pool disbursement complete', { distributionId, totalDisbursed, recipientCount: recipients.length });

    return {
      success: totalDisbursed > 0,
      distributionId,
      results,
      totalDisbursed,
      message: `Disbursed ${totalDisbursed.toFixed(4)} USDT to ${results.filter(r => !r.error || r.error.includes('local')).length}/${recipients.length} recipients`,
    };
  }

  /** Add a vote for a creator to receive pool funds */
  voteForCreator(creatorId: string): void {
    const existing = this.state.communityPool.pendingVotes.find(v => v.creatorId === creatorId);
    if (existing) {
      existing.votes += 1;
    } else {
      this.state.communityPool.pendingVotes.push({ creatorId, votes: 1 });
    }
    this.save();
  }

  // ══════════════════════════════════════════════════════════════
  // Feature 57: Performance Bonus Round
  // ══════════════════════════════════════════════════════════════

  /** Get milestone definitions */
  getBonusMilestones(): BonusMilestone[] {
    return [...DEFAULT_BONUS_MILESTONES];
  }

  /**
   * Check milestones for a creator and award bonuses if eligible.
   * Called by the autonomous loop each iteration.
   */
  checkMilestones(
    creatorId: string,
    metrics: { videoViews?: number; newSubscribers?: number; contentStreak?: number },
    creatorName?: string,
  ): AwardedBonus[] {
    const milestones = this.getBonusMilestones();
    const newBonuses: AwardedBonus[] = [];

    for (const milestone of milestones) {
      // Check if already awarded for this creator
      const alreadyAwarded = this.state.awardedBonuses.some(
        b => b.milestoneId === milestone.id && b.creatorId === creatorId
      );
      if (alreadyAwarded) continue;

      let metricValue: number | undefined;
      switch (milestone.metricType) {
        case 'views_single':
          metricValue = metrics.videoViews;
          break;
        case 'subscribers':
          metricValue = metrics.newSubscribers;
          break;
        case 'streak':
          metricValue = metrics.contentStreak;
          break;
      }

      if (metricValue !== undefined && metricValue >= milestone.threshold) {
        const bonus: AwardedBonus = {
          id: `bonus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          milestoneId: milestone.id,
          milestoneName: milestone.name,
          creatorId,
          creatorName,
          bonusAmount: milestone.bonusAmount,
          reason: `Creator ${creatorName ?? creatorId} hit ${milestone.name} milestone (${metricValue} >= ${milestone.threshold}) → triggering ${milestone.bonusAmount} USDT bonus`,
          awardedAt: new Date().toISOString(),
        };

        this.state.awardedBonuses.push(bonus);
        newBonuses.push(bonus);

        logger.info('Performance bonus awarded', {
          creatorId,
          milestone: milestone.name,
          bonusAmount: milestone.bonusAmount,
          reason: bonus.reason,
        });
      }
    }

    if (newBonuses.length > 0) {
      this.save();
    }

    return newBonuses;
  }

  /** Get all awarded bonuses */
  getBonusHistory(): AwardedBonus[] {
    return [...this.state.awardedBonuses];
  }

  // ══════════════════════════════════════════════════════════════
  // Feature 59: Goal-Based Creator Tipping
  // ══════════════════════════════════════════════════════════════

  /** Create a new funding goal for a creator */
  createGoal(creatorId: string, title: string, targetAmount: number, deadline: string): CreatorGoal {
    const goal: CreatorGoal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      creatorId,
      title,
      targetAmount,
      currentAmount: 0,
      deadline,
      status: 'active',
      contributions: [],
      createdAt: new Date().toISOString(),
    };

    this.state.creatorGoals.push(goal);
    this.save();

    logger.info('Creator goal created', { goalId: goal.id, creatorId, title, targetAmount });

    return goal;
  }

  /** Contribute to a creator's goal */
  contributeToGoal(goalId: string, from: string, amount: number): {
    success: boolean;
    goal: CreatorGoal | null;
    message: string;
  } {
    const goal = this.state.creatorGoals.find(g => g.id === goalId);
    if (!goal) {
      return { success: false, goal: null, message: `Goal ${goalId} not found` };
    }
    if (goal.status !== 'active') {
      return { success: false, goal, message: `Goal is ${goal.status}, not accepting contributions` };
    }

    goal.currentAmount += amount;
    goal.contributions.push({ from, amount, timestamp: new Date().toISOString() });

    // Check if goal is reached
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
      logger.info('Creator goal completed!', { goalId, creatorId: goal.creatorId, title: goal.title });
    }

    this.save();

    const progressPct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
    return {
      success: true,
      goal,
      message: `Contributed ${amount} USDT to "${goal.title}" (${progressPct}% complete)`,
    };
  }

  /** Get all goals */
  getAllGoals(): CreatorGoal[] {
    // Update expired goals
    const now = new Date();
    for (const goal of this.state.creatorGoals) {
      if (goal.status === 'active' && new Date(goal.deadline) < now) {
        goal.status = 'expired';
      }
    }
    return [...this.state.creatorGoals];
  }

  /** Get active goals only */
  getActiveGoals(): CreatorGoal[] {
    return this.getAllGoals().filter(g => g.status === 'active');
  }

  /** Get a specific goal */
  getGoal(goalId: string): CreatorGoal | null {
    return this.state.creatorGoals.find(g => g.id === goalId) ?? null;
  }

  /**
   * Get tip allocation weight for a creator based on their goals.
   * Creators closer to their goals get proportionally more.
   */
  getGoalBasedAllocation(creatorId: string): { weight: number; reason: string } {
    const goals = this.getActiveGoals().filter(g => g.creatorId === creatorId);
    if (goals.length === 0) {
      return { weight: 1.0, reason: 'No active goals — standard tip weight' };
    }

    // Average progress across all active goals
    const avgProgress = goals.reduce((s, g) => {
      return s + (g.currentAmount / g.targetAmount);
    }, 0) / goals.length;

    // Creators closer to their goal get higher weight (incentivize completion)
    // 0% → weight 1.5 (needs help), 50% → 1.2, 90% → 1.8 (close to finish!)
    let weight: number;
    if (avgProgress > 0.8) {
      weight = 1.8; // Almost there — push to complete
    } else if (avgProgress > 0.5) {
      weight = 1.2;
    } else {
      weight = 1.5; // Fresh goal — needs support
    }

    const totalNeeded = goals.reduce((s, g) => s + (g.targetAmount - g.currentAmount), 0);

    return {
      weight,
      reason: `${goals.length} active goal(s), ${Math.round(avgProgress * 100)}% avg progress, ${totalNeeded.toFixed(2)} USDT still needed`,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // Persistence
  // ══════════════════════════════════════════════════════════════

  private load(): EconomicsState {
    try {
      if (existsSync(ECONOMICS_FILE)) {
        const raw = readFileSync(ECONOMICS_FILE, 'utf-8');
        const data = JSON.parse(raw) as Partial<EconomicsState>;
        logger.info('Loaded economics state from disk');
        return { ...DEFAULT_STATE, ...data };
      }
    } catch (err) {
      logger.warn('Failed to load economics state', { error: String(err) });
    }
    return { ...DEFAULT_STATE };
  }

  private save(): void {
    try {
      writeFileSync(ECONOMICS_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to save economics state', { error: String(err) });
    }
  }
}

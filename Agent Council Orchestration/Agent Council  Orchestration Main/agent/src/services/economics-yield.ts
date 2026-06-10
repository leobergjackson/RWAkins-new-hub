// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Economics Yield Types & Constants (extracted from economics.service.ts)
//
// Contains: YieldStatus, smart split types, treasury types,
// community pool types, bonus milestone types, goal types,
// and scoring constants.

import type { ChainId } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════
// Feature 17: Creator Scoring / Engagement Formula
// ══════════════════════════════════════════════════════════════════

export interface CreatorEngagementData {
  viewCount: number;
  likeRatio: number;          // 0-1
  commentCount: number;
  watchTimeMinutes: number;
  subscriberGrowthRate: number; // 0-1 (monthly % growth as decimal)
}

export interface CreatorScore {
  creatorId: string;
  creatorName?: string;
  score: number;              // 0-100 normalized
  tier: 'high' | 'medium' | 'low';
  breakdown: {
    viewScore: number;
    likeScore: number;
    commentScore: number;
    watchTimeScore: number;
    growthScore: number;
  };
  tipMultiplier: number;      // 1.0 = standard, >1 = larger tips, <1 = smaller
  updatedAt: string;
}

export interface CreatorScoreHistory {
  creatorId: string;
  scores: Array<{ date: string; score: number; tier: string }>;
}

export const SCORE_WEIGHTS = {
  viewCount: 0.3,
  likeRatio: 0.2,
  commentCount: 0.15,
  watchTimeMinutes: 0.2,
  subscriberGrowthRate: 0.15,
};

// ══════════════════════════════════════════════════════════════════
// Feature 29: Aave V3 Yield on Idle Reserves
// ══════════════════════════════════════════════════════════════════

export interface YieldStatus {
  deposited: number;
  earnedYield: number;
  currentApy: number;
  chain: string;
  protocol: string;
  lastDepositAt: string | null;
  lastWithdrawAt: string | null;
  idleThreshold: number;
}

// ══════════════════════════════════════════════════════════════════
// Feature 41: Smart Split (90/5/5)
// ══════════════════════════════════════════════════════════════════

export interface SplitConfig {
  creatorPercent: number;
  platformPercent: number;
  communityPercent: number;
}

export interface SplitResult {
  totalAmount: number;
  creatorAmount: number;
  platformAmount: number;
  communityAmount: number;
  breakdown: string;
}

export interface SplitTotals {
  totalProcessed: number;
  totalCreator: number;
  totalPlatform: number;
  totalCommunity: number;
  tipCount: number;
}

// ══════════════════════════════════════════════════════════════════
// Feature 37: Velora Swap (Treasury Rebalance)
// ══════════════════════════════════════════════════════════════════

export interface TreasuryAllocationStatus {
  holdings: Array<{ token: string; amount: number; percent: number }>;
  target: { usdt: number; xaut: number; native: number };
  needsRebalance: boolean;
  rebalanceActions: Array<{ action: string; fromToken: string; toToken: string; amount: number; reason: string }>;
  lastRebalanceAt: string | null;
}

// ══════════════════════════════════════════════════════════════════
// Feature 42: Creator Per-Chain Profiles
// ══════════════════════════════════════════════════════════════════

export interface CreatorChainProfile {
  creatorId: string;
  preferredChain: ChainId | null;
  walletAddresses: Record<string, string>; // chainId -> address
  updatedAt: string;
}

// ══════════════════════════════════════════════════════════════════
// Feature 56: Community Tipping Pool
// ══════════════════════════════════════════════════════════════════

export interface PoolContribution {
  from: string;
  amount: number;
  timestamp: string;
}

export interface PoolDistribution {
  id: string;
  recipients: Array<{ creatorId: string; amount: number }>;
  totalDistributed: number;
  timestamp: string;
}

export interface CommunityPool {
  balance: number;
  totalContributed: number;
  contributions: PoolContribution[];
  distributions: PoolDistribution[];
  pendingVotes: Array<{ creatorId: string; votes: number }>;
}

export interface PoolStatus {
  balance: number;
  totalContributed: number;
  totalDistributed: number;
  contributorCount: number;
  distributionCount: number;
  pendingVotes: Array<{ creatorId: string; votes: number }>;
}

// ══════════════════════════════════════════════════════════════════
// Feature 57: Performance Bonus Round
// ══════════════════════════════════════════════════════════════════

export interface BonusMilestone {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  bonusAmount: number;     // USDT
  metricType: 'views' | 'subscribers' | 'streak' | 'views_single';
}

export interface AwardedBonus {
  id: string;
  milestoneId: string;
  milestoneName: string;
  creatorId: string;
  creatorName?: string;
  bonusAmount: number;
  reason: string;
  awardedAt: string;
}

/** Default bonus milestones */
export const DEFAULT_BONUS_MILESTONES: BonusMilestone[] = [
  { id: 'views_1k', name: '1K Views', condition: 'Single video reaches 1000 views', threshold: 1000, bonusAmount: 2, metricType: 'views_single' },
  { id: 'views_10k', name: '10K Views', condition: 'Single video reaches 10000 views', threshold: 10000, bonusAmount: 10, metricType: 'views_single' },
  { id: 'subs_100', name: '100 New Subs', condition: '100 new subscribers in a day', threshold: 100, bonusAmount: 5, metricType: 'subscribers' },
  { id: 'streak_7d', name: '7-Day Streak', condition: '7 consecutive days of content', threshold: 7, bonusAmount: 3, metricType: 'streak' },
];

// ══════════════════════════════════════════════════════════════════
// Feature 59: Goal-Based Creator Tipping
// ══════════════════════════════════════════════════════════════════

export interface CreatorGoal {
  id: string;
  creatorId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: 'active' | 'completed' | 'expired';
  contributions: Array<{ from: string; amount: number; timestamp: string }>;
  createdAt: string;
}

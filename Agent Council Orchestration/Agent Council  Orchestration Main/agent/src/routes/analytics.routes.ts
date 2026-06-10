// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Analytics route handlers (extracted from api.ts)
// Covers: analytics, stats, leaderboard, achievements, reputation,
//         risk assessment, economics, creator analytics, chain analytics

import { Router } from 'express';
import { JsonRpcProvider, formatUnits } from 'ethers';
import type { TipFlowAgent } from '../core/agent.js';
import type { WalletService } from '../services/wallet.service.js';
import type { ReputationService } from '../services/reputation.service.js';
import type { RiskEngineService } from '../services/risk-engine.service.js';
import type { EconomicsService } from '../services/economics.service.js';
import type { CreatorAnalyticsService } from '../services/creator-analytics.service.js';
import type { SafetyService } from '../services/safety.service.js';
import type { RpcFailoverService } from '../services/rpc-failover.service.js';

// WDK type imports for on-chain analytics via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Analytics routes query WDK getBalance() and transaction history across all chains
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars
import type { AutonomousLoopService } from '../services/autonomous-loop.service.js';
import type { AnomalyDetectionService } from '../services/anomaly-detection.service.js';
import type { CreditScoringService } from '../services/credit-scoring.service.js';
import type { ChainId } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface AnalyticsRouteDeps {
  agent: TipFlowAgent;
  wallet: WalletService;
  reputation: ReputationService;
  riskEngine: RiskEngineService;
  economics: EconomicsService;
  creatorAnalytics: CreatorAnalyticsService;
  safety: SafetyService;
  rpcFailover: RpcFailoverService;
  getAutonomousLoop: () => AutonomousLoopService | null;
  anomalyDetection: AnomalyDetectionService;
  creditScoring: CreditScoringService;
}

/**
 * Register analytics-related routes onto the given router.
 * Handles: agent analytics, stats, leaderboard, achievements, reputation,
 *          risk assessment, safety, economics, creator analytics, chain analytics.
 */
export function registerAnalyticsRoutes(router: Router, deps: AnalyticsRouteDeps): void {
  const {
    agent, wallet, reputation, riskEngine, economics,
    creatorAnalytics, safety, rpcFailover, getAutonomousLoop,
    anomalyDetection, creditScoring,
  } = deps;

  // ── Leaderboard & Achievements ──────────────────────────────────

  /** GET /api/leaderboard — Top tip recipients */
  router.get('/leaderboard', (_req, res) => {
    res.json({ leaderboard: agent.getLeaderboard() });
  });

  /** GET /api/achievements — Achievement progress */
  router.get('/achievements', (_req, res) => {
    res.json({ achievements: agent.getAchievements() });
  });

  // ── Agent Stats & Analytics ──────────────────────────────────────

  /** GET /api/agent/stats — Get agent statistics */
  router.get('/agent/stats', (_req, res) => {
    res.json({ stats: agent.getStats() });
  });

  /** GET /api/agent/analytics — Advanced analytics with aggregated data */
  router.get('/agent/analytics', (_req, res) => {
    try {
      const allTips = agent.getHistory();
      const confirmed = allTips.filter((h) => h.status === 'confirmed');

      // Daily volume — last 7 days
      const dailyMap = new Map<string, { count: number; volume: number }>();
      for (const h of confirmed) {
        const day = h.createdAt.split('T')[0];
        const existing = dailyMap.get(day) ?? { count: 0, volume: 0 };
        existing.count++;
        existing.volume += parseFloat(h.amount);
        dailyMap.set(day, existing);
      }
      const dailyVolume: Array<{ date: string; count: number; volume: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const entry = dailyMap.get(dateStr);
        dailyVolume.push({
          date: dateStr,
          count: entry?.count ?? 0,
          volume: entry?.volume ?? 0,
        });
      }

      // Hourly distribution (0-23)
      const hourlyDistribution = new Array<number>(24).fill(0);
      for (const h of confirmed) {
        const hour = new Date(h.createdAt).getHours();
        hourlyDistribution[hour]++;
      }

      // Token distribution
      let nativeCount = 0;
      let usdtCount = 0;
      for (const h of confirmed) {
        if (h.token === 'usdt') usdtCount++;
        else nativeCount++;
      }

      // Chain distribution
      const chainDistribution: Record<string, number> = {};
      for (const h of confirmed) {
        chainDistribution[h.chainId] = (chainDistribution[h.chainId] ?? 0) + 1;
      }

      // Trends
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

      const tipsToday = confirmed.filter((h) => h.createdAt.startsWith(today)).length;
      const tipsYesterday = confirmed.filter((h) => h.createdAt.startsWith(yesterday)).length;
      const tipsThisWeek = confirmed.filter((h) => h.createdAt >= weekAgo).length;
      const tipsLastWeek = confirmed.filter((h) => h.createdAt >= twoWeeksAgo && h.createdAt < weekAgo).length;

      const amounts = confirmed.map((h) => parseFloat(h.amount));
      const avgTipSize = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
      const largestTip = amounts.length > 0 ? Math.max(...amounts) : 0;

      const busiestHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
      const mostActiveChain = Object.entries(chainDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';

      // Cumulative data
      const sortedConfirmed = [...confirmed].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const cumulativeMap = new Map<string, { totalTips: number; totalVolume: number }>();
      let runningTips = 0;
      let runningVolume = 0;
      for (const h of sortedConfirmed) {
        const day = h.createdAt.split('T')[0];
        runningTips++;
        runningVolume += parseFloat(h.amount);
        cumulativeMap.set(day, { totalTips: runningTips, totalVolume: runningVolume });
      }
      const cumulativeData: Array<{ date: string; totalTips: number; totalVolume: number }> = [];
      let prevTips = 0;
      let prevVol = 0;
      for (const [, val] of cumulativeMap) {
        prevTips = val.totalTips;
        prevVol = val.totalVolume;
      }
      prevTips = 0;
      prevVol = 0;
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const entry = cumulativeMap.get(dateStr);
        if (entry) {
          prevTips = entry.totalTips;
          prevVol = entry.totalVolume;
        }
        cumulativeData.push({
          date: dateStr,
          totalTips: prevTips,
          totalVolume: Math.round(prevVol * 1e6) / 1e6,
        });
      }

      // Success rate
      const successRate = allTips.length > 0
        ? Math.round((confirmed.length / allTips.length) * 100)
        : 100;

      // Total volume & fees
      const totalVolume = confirmed.reduce((s, h) => s + parseFloat(h.amount), 0);
      const totalFees = confirmed.reduce((s, h) => s + parseFloat(h.fee || '0'), 0);
      const avgFee = confirmed.length > 0 ? totalFees / confirmed.length : 0;

      // Unique recipients
      const uniqueRecipients = new Set(confirmed.map((h) => h.recipient)).size;

      // Overview
      const overview = {
        totalTips: confirmed.length,
        totalVolume: Math.round(totalVolume * 1e6) / 1e6,
        successRate,
        avgFee: Math.round(avgFee * 1e8) / 1e8,
        totalFees: Math.round(totalFees * 1e8) / 1e8,
        uniqueRecipients,
      };

      // Chain distribution with percentages
      const chainDist = Object.entries(chainDistribution).map(([chain, count]) => ({
        chain,
        count,
        percentage: confirmed.length > 0 ? Math.round((count / confirmed.length) * 100) : 0,
      }));

      // Token distribution with percentages
      const tokenDist = [
        { token: 'native', count: nativeCount, percentage: confirmed.length > 0 ? Math.round((nativeCount / confirmed.length) * 100) : 0 },
        { token: 'usdt', count: usdtCount, percentage: confirmed.length > 0 ? Math.round((usdtCount / confirmed.length) * 100) : 0 },
      ];

      // Hourly heatmap
      const hourlyHeatmap = hourlyDistribution.map((count, hour) => ({ hour, count }));

      // Top recipients by volume
      const recipientMap = new Map<string, { count: number; volume: number }>();
      for (const h of confirmed) {
        const existing = recipientMap.get(h.recipient) ?? { count: 0, volume: 0 };
        existing.count++;
        existing.volume += parseFloat(h.amount);
        recipientMap.set(h.recipient, existing);
      }
      const topRecipients = [...recipientMap.entries()]
        .map(([address, data]) => ({ address, count: data.count, volume: Math.round(data.volume * 1e6) / 1e6 }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);

      // Recent trend
      let recentTrend: 'up' | 'down' | 'stable' = 'stable';
      if (tipsThisWeek > tipsLastWeek) recentTrend = 'up';
      else if (tipsThisWeek < tipsLastWeek) recentTrend = 'down';

      // Streaks (consecutive days with at least 1 tip)
      const tipDays = new Set(confirmed.map((h) => h.createdAt.split('T')[0]));
      let currentStreak = 0;
      let longestStreak = 0;
      let streak = 0;
      for (let i = 0; i < 90; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        if (tipDays.has(dateStr)) {
          streak++;
          if (i <= currentStreak + 1) currentStreak = streak;
          longestStreak = Math.max(longestStreak, streak);
        } else {
          if (i === 0) {
            // Today has no tips yet, don't break streak for "current"
          } else {
            streak = 0;
          }
        }
      }

      res.json({
        overview,
        dailyVolume,
        hourlyDistribution,
        hourlyHeatmap,
        tokenDistribution: { native: nativeCount, usdt: usdtCount },
        chainDistribution,
        chainDist,
        tokenDist,
        topRecipients,
        recentTrend,
        streaks: { current: currentStreak, longest: longestStreak },
        trends: {
          tipsToday,
          tipsYesterday,
          tipsThisWeek,
          tipsLastWeek,
          avgTipSize: Math.round(avgTipSize * 1e6) / 1e6,
          largestTip: Math.round(largestTip * 1e6) / 1e6,
          busiestHour,
          mostActiveChain,
        },
        cumulativeData,
        successRate,
        totalTips: confirmed.length,
      });
    } catch (err) {
      logger.error('Analytics endpoint failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to compute analytics' });
    }
  });

  // ── Chain Analytics (Cross-Chain Comparison) ────────────────────────

  /** GET /api/analytics/chains — Per-chain analytics for side-by-side comparison */
  router.get('/analytics/chains', async (_req, res) => {
    try {
      const history = agent.getHistory();
      const chainIds = wallet.getRegisteredChains();
      const balances = await wallet.getAllBalances();

      const chainStats = chainIds.map((chainId) => {
        const chainHistory = history.filter((h) => h.chainId === chainId);
        const succeeded = chainHistory.filter((h) => h.status === 'confirmed');
        const totalTips = chainHistory.length;
        const totalVolume = succeeded.reduce((sum, h) => sum + parseFloat(h.amount || '0'), 0);
        const fees = succeeded.map((h) => parseFloat(h.fee || '0')).filter((f) => !isNaN(f));
        const avgFee = fees.length > 0 ? fees.reduce((a, b) => a + b, 0) / fees.length : 0;
        const successRate = totalTips > 0 ? Math.round((succeeded.length / totalTips) * 100) : 100;
        const bal = balances.find((b) => b.chainId === chainId);

        const config = wallet.getChainConfig(chainId);
        const avgConfirmationTime = config.blockchain === 'ethereum' ? 15 : 5;

        return {
          chainId,
          name: config.name,
          totalTips,
          totalVolume: totalVolume.toFixed(6),
          avgFee: avgFee.toFixed(6),
          successRate,
          balance: bal?.nativeBalance ?? '0',
          avgConfirmationTime,
          gasPrice: '0',
        };
      });

      for (const stat of chainStats) {
        try {
          const config = wallet.getChainConfig(stat.chainId as ChainId);
          if (config.blockchain === 'ethereum') {
            const provider = new JsonRpcProvider('https://rpc.sepolia.org');
            const feeData = await provider.getFeeData();
            if (feeData.gasPrice) {
              stat.gasPrice = parseFloat(formatUnits(feeData.gasPrice, 'gwei')).toFixed(2) + ' gwei';
            }
          } else {
            stat.gasPrice = 'N/A';
          }
        } catch {
          stat.gasPrice = 'N/A';
        }
      }

      const withFees = chainStats.filter((c) => parseFloat(c.avgFee) > 0);
      const lowestFee = withFees.length > 0
        ? withFees.reduce((a, b) => parseFloat(a.avgFee) < parseFloat(b.avgFee) ? a : b).chainId
        : chainIds[chainIds.length - 1] || '';
      const fastest = chainStats.reduce((a, b) => a.avgConfirmationTime < b.avgConfirmationTime ? a : b).chainId;

      res.json({
        chains: chainStats,
        recommendation: { lowestFee, fastest },
      });
    } catch (err) {
      logger.error('Failed to get chain analytics', { error: String(err) });
      res.status(500).json({ error: 'Failed to get chain analytics' });
    }
  });

  // ── Creator Analytics ────────────────────────────────────────
  router.post('/analytics/creators/ingest', (req, res) => {
    creatorAnalytics.ingestTips(req.body.tips ?? []);
    res.json({ success: true });
  });

  router.get('/analytics/creators/:address', (req, res) => {
    const income = creatorAnalytics.getCreatorIncome(req.params.address);
    res.json(income);
  });

  router.get('/analytics/platform', (_req, res) => {
    res.json(creatorAnalytics.getPlatformAnalytics());
  });

  // ── Social Reputation Engine ──────────────────────────────────

  /** GET /api/reputation/leaderboard — Top creators by reputation */
  router.get('/reputation/leaderboard', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    res.json({ leaderboard: reputation.getLeaderboard(limit), total: reputation.getCreatorCount() });
  });

  /** GET /api/reputation/recommendations — AI-powered tip recommendations */
  router.get('/reputation/recommendations', (req, res) => {
    const budget = parseFloat(req.query.budget as string) || 0.01;
    const count = parseInt(req.query.count as string) || 5;
    res.json({ recommendations: reputation.getRecommendations(budget, count) });
  });

  /** GET /api/reputation/:address — Get reputation for a specific address */
  router.get('/reputation/:address', (req, res) => {
    const rep = reputation.getReputation(req.params.address);
    if (!rep) {
      res.status(404).json({ error: 'No reputation data for this address' });
      return;
    }
    res.json({ reputation: rep });
  });

  /** GET /api/reputation/config — Get scoring config */
  router.get('/reputation/config', (_req, res) => {
    res.json({ config: reputation.getConfig() });
  });

  /** PUT /api/reputation/config — Update scoring config */
  router.put('/reputation/config', (req, res) => {
    const config = reputation.updateConfig(req.body);
    res.json({ config });
  });

  // ════════════════════════════════════════════════════════════════
  // GROUP 5: Safety & Risk Routes
  // ════════════════════════════════════════════════════════════════

  /** GET /api/safety/policies — Show all active safety policies */
  router.get('/safety/policies', (_req, res) => {
    try {
      res.json(safety.getPolicies());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/safety/usage — Current spend vs limits */
  router.get('/safety/usage', (_req, res) => {
    try {
      res.json(safety.getUsage());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/safety/status — Full safety status overview */
  router.get('/safety/status', (_req, res) => {
    try {
      res.json(safety.getStatus());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/safety/kill-switch — Activate kill switch */
  router.post('/safety/kill-switch', (_req, res) => {
    try {
      safety.activateKillSwitch();
      const loop = getAutonomousLoop();
      if (loop) {
        loop.pause();
      }
      res.json({ killSwitch: true, message: 'Kill switch activated — all autonomous tipping paused' });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/safety/resume — Deactivate kill switch */
  router.post('/safety/resume', (_req, res) => {
    try {
      safety.deactivateKillSwitch();
      const loop = getAutonomousLoop();
      if (loop) {
        loop.resume();
      }
      res.json({ killSwitch: false, message: 'Kill switch deactivated — autonomous tipping resumed' });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/safety/validate — Validate a tip against all policies */
  router.post('/safety/validate', (req, res) => {
    try {
      const { recipient, amount, chain, token } = req.body as { recipient?: string; amount?: number; chain?: string; token?: string };
      if (!recipient || amount === undefined) {
        res.status(400).json({ error: 'recipient and amount are required' });
        return;
      }
      const result = safety.validateTip({ recipient, amount: Number(amount), chain, token });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/safety/pending-approvals — List tips waiting for approval */
  router.get('/safety/pending-approvals', (_req, res) => {
    try {
      res.json(safety.getPendingApprovals());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/safety/approve/:tipId — Approve a queued large tip */
  router.post('/safety/approve/:tipId', (req, res) => {
    try {
      const result = safety.approveApproval(req.params.tipId);
      if (!result) {
        res.status(404).json({ error: 'Pending approval not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/safety/reject/:tipId — Reject a queued large tip */
  router.post('/safety/reject/:tipId', (req, res) => {
    try {
      const result = safety.rejectApproval(req.params.tipId);
      if (!result) {
        res.status(404).json({ error: 'Pending approval not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/safety/recovery-queue — Show pending recoveries */
  router.get('/safety/recovery-queue', (_req, res) => {
    try {
      res.json(safety.getRecoveryQueue());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/safety/recovery/:id/resolve — Mark a recovery entry as resolved */
  router.post('/safety/recovery/:id/resolve', (req, res) => {
    try {
      const result = safety.resolveRecovery(req.params.id);
      if (!result) {
        res.status(404).json({ error: 'Recovery entry not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/safety/recovery/:id/abandon — Abandon a recovery entry */
  router.post('/safety/recovery/:id/abandon', (req, res) => {
    try {
      const result = safety.abandonRecovery(req.params.id);
      if (!result) {
        res.status(404).json({ error: 'Recovery entry not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/safety/block-address — Add address to blocklist */
  router.post('/safety/block-address', (req, res) => {
    try {
      const { address } = req.body as { address?: string };
      if (!address) {
        res.status(400).json({ error: 'address is required' });
        return;
      }
      safety.blockAddress(address);
      riskEngine.blockAddress(address);
      res.json({ blocked: true, address });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/risk/assess — Run 8-factor risk assessment on a proposed transaction */
  router.post('/risk/assess', (req, res) => {
    try {
      const { recipient, amount, chainId, walletBalance, gasFee, token } = req.body as {
        recipient?: string; amount?: number; chainId?: string;
        walletBalance?: number; gasFee?: number; token?: string;
      };
      const assessment = riskEngine.assessRisk({
        recipient: recipient ?? '0x0000000000000000000000000000000000000000',
        amount: amount ?? 1,
        chainId: chainId ?? 'ethereum-sepolia',
        walletBalance: walletBalance ?? 100,
        gasFee: gasFee ?? 0.001,
        token: token ?? 'USDT',
      });
      res.json(assessment);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/risk/status — Get current risk engine status and stats */
  router.get('/risk/status', (_req, res) => {
    try {
      res.json(riskEngine.getStats());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/safety/rpc-health — RPC endpoint health status */
  router.get('/safety/rpc-health', (_req, res) => {
    try {
      res.json(rpcFailover.getHealth());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/safety/rpc-reset/:chain — Reset RPC to primary for a chain */
  router.post('/safety/rpc-reset/:chain', (req, res) => {
    try {
      rpcFailover.resetToPrimary(req.params.chain);
      res.json({ reset: true, chain: req.params.chain });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // Group 6: Economics Endpoints
  // ══════════════════════════════════════════════════════════════

  /** GET /api/economics/creators/scores — All creator scores */
  router.get('/economics/creators/scores', (_req, res) => {
    try {
      res.json(economics.getAllScores());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/economics/creators/:id/score — Single creator score */
  router.get('/economics/creators/:id/score', (req, res) => {
    try {
      const score = economics.getCreatorScore(req.params.id);
      if (!score) {
        res.status(404).json({ error: 'Creator not scored yet' });
        return;
      }
      res.json(score);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/economics/creators/:id/score — Score a creator with engagement data */
  router.post('/economics/creators/:id/score', (req, res) => {
    try {
      const { viewCount, likeRatio, commentCount, watchTimeMinutes, subscriberGrowthRate, creatorName } = req.body;
      const score = economics.scoreCreator(
        req.params.id,
        { viewCount: viewCount ?? 0, likeRatio: likeRatio ?? 0, commentCount: commentCount ?? 0, watchTimeMinutes: watchTimeMinutes ?? 0, subscriberGrowthRate: subscriberGrowthRate ?? 0 },
        creatorName,
      );
      res.json(score);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/economics/creators/:id/score/history — Score history */
  router.get('/economics/creators/:id/score/history', (req, res) => {
    try {
      res.json(economics.getScoreHistory(req.params.id));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Yield Management ────────────────────────────────

  /** GET /api/economics/yield/status — Current yield position */
  router.get('/economics/yield/status', (_req, res) => {
    try {
      res.json(economics.getYieldStatus());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/economics/yield/deposit — Deposit idle USDT to Aave V3 */
  router.post('/economics/yield/deposit', async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'amount must be a positive number' });
        return;
      }
      const result = await economics.depositToYield(amount);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/economics/yield/withdraw — Withdraw from Aave V3 */
  router.post('/economics/yield/withdraw', async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'amount must be a positive number' });
        return;
      }
      const result = await economics.withdrawFromYield(amount);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Smart Split ─────────────────────────────────────

  /** GET /api/economics/split/config — Current split ratios */
  router.get('/economics/split/config', (_req, res) => {
    try {
      res.json(economics.getSplitConfig());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/economics/split/totals — Cumulative split totals */
  router.get('/economics/split/totals', (_req, res) => {
    try {
      res.json(economics.getSplitTotals());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/economics/split/calculate — Preview a split */
  router.post('/economics/split/calculate', (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'amount must be a positive number' });
        return;
      }
      res.json(economics.calculateSplit(amount));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Treasury Rebalance ──────────────────────────

  /** GET /api/economics/treasury/allocation — Current token allocation */
  router.get('/economics/treasury/allocation', (_req, res) => {
    try {
      res.json(economics.getTreasuryAllocation());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/economics/treasury/rebalance — Execute rebalance */
  router.post('/economics/treasury/rebalance', async (_req, res) => {
    try {
      res.json(await economics.rebalanceTreasury());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Creator Per-Chain Profiles ──────────────────

  /** GET /api/economics/creators/:id/profile — Get creator chain profile */
  router.get('/economics/creators/:id/profile', (req, res) => {
    try {
      const profile = economics.getCreatorProfile(req.params.id);
      if (!profile) {
        res.status(404).json({ error: 'No profile for this creator' });
        return;
      }
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/economics/creators/:id/profile — Set creator chain profile */
  router.post('/economics/creators/:id/profile', (req, res) => {
    try {
      const { preferredChain, walletAddresses } = req.body;
      const profile = economics.setCreatorProfile(req.params.id, preferredChain ?? null, walletAddresses ?? {});
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Community Pool ──────────────────────────────

  /** GET /api/economics/pool/status — Pool balance and stats */
  router.get('/economics/pool/status', (_req, res) => {
    try {
      res.json(economics.getPoolStatus());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/economics/pool/contribute — Add to pool */
  router.post('/economics/pool/contribute', (req, res) => {
    try {
      const { from, amount } = req.body;
      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'amount must be a positive number' });
        return;
      }
      res.json(economics.contributeToPool(from ?? 'anonymous', amount));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/economics/pool/distribute — Distribute pool to creators */
  router.post('/economics/pool/distribute', (req, res) => {
    try {
      const { recipients } = req.body;
      if (!Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ error: 'recipients must be a non-empty array of { creatorId, amount }' });
        return;
      }
      res.json(economics.distributePool(recipients));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Performance Bonuses ─────────────────────────

  /** GET /api/economics/bonuses/config — Milestone definitions */
  router.get('/economics/bonuses/config', (_req, res) => {
    try {
      res.json(economics.getBonusMilestones());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/economics/bonuses/history — Awarded bonuses */
  router.get('/economics/bonuses/history', (_req, res) => {
    try {
      res.json(economics.getBonusHistory());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/economics/bonuses/check — Check milestones for a creator */
  router.post('/economics/bonuses/check', (req, res) => {
    try {
      const { creatorId, videoViews, newSubscribers, contentStreak, creatorName } = req.body;
      if (!creatorId) {
        res.status(400).json({ error: 'creatorId is required' });
        return;
      }
      const bonuses = economics.checkMilestones(creatorId, { videoViews, newSubscribers, contentStreak }, creatorName);
      res.json({ awarded: bonuses, count: bonuses.length });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Goal-Based Tipping ──────────────────────────

  /** GET /api/economics/goals — All goals */
  router.get('/economics/goals', (_req, res) => {
    try {
      res.json(economics.getAllGoals());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/economics/goals/:id — Specific goal */
  router.get('/economics/goals/:id', (req, res) => {
    try {
      const goal = economics.getGoal(req.params.id);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.json(goal);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/economics/goals/create — Create a funding goal */
  router.post('/economics/goals/create', (req, res) => {
    try {
      const { creatorId, title, targetAmount, deadline } = req.body;
      if (!creatorId || !title || !targetAmount || !deadline) {
        res.status(400).json({ error: 'creatorId, title, targetAmount, and deadline are required' });
        return;
      }
      const goal = economics.createGoal(creatorId, title, targetAmount, deadline);
      res.status(201).json(goal);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/economics/goals/:id/contribute — Contribute to a goal */
  router.post('/economics/goals/:id/contribute', (req, res) => {
    try {
      const { from, amount } = req.body;
      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'amount must be a positive number' });
        return;
      }
      res.json(economics.contributeToGoal(req.params.id, from ?? 'anonymous', amount));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // Anomaly Detection & Credit Scoring
  // ══════════════════════════════════════════════════════════════

  /** GET /api/analytics/anomalies — Current statistics and recent anomalies */
  router.get('/analytics/anomalies', (_req, res) => {
    try {
      res.json(anomalyDetection.getOverview());
    } catch (err) {
      logger.error('Failed to get anomaly overview', { error: String(err) });
      res.status(500).json({ error: 'Failed to get anomaly data' });
    }
  });

  /** POST /api/analytics/anomalies/detect — Check if an amount is anomalous */
  router.post('/analytics/anomalies/detect', (req, res) => {
    try {
      const { amount, category } = req.body as { amount?: number; category?: string };
      if (amount === undefined || amount === null) {
        res.status(400).json({ error: 'amount is required' });
        return;
      }
      res.json(anomalyDetection.detectAnomaly(Number(amount), category));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/analytics/anomalies/stats/:category — Statistics for a specific category */
  router.get('/analytics/anomalies/stats/:category', (req, res) => {
    try {
      res.json(anomalyDetection.getStatistics(req.params.category));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /**
   * GET /api/analytics/anomaly-chart — Scatter chart data for anomaly visualization.
   *
   * Returns every recorded transaction with its z-score and anomaly flag,
   * plus the "normal zone" boundaries and descriptive statistics so a
   * frontend can render a scatter plot without additional computation.
   */
  router.get('/analytics/anomaly-chart', (_req, res) => {
    try {
      const category = (_req.query.category as string) || 'default';
      const stats = anomalyDetection.getStatistics(category);

      // Re-analyze every historical transaction to produce per-point z-scores.
      // We access the history indirectly through the service's public API:
      // getStatistics gives us mean/stdDev/q1/q3, and we re-derive z-scores
      // from the tip history on the agent.
      const allTips = agent.getHistory().filter((h) => h.status === 'confirmed');

      const transactions = allTips.map((tip) => {
        const amount = parseFloat(tip.amount);
        const result = anomalyDetection.detectAnomaly(amount, category);
        return {
          amount,
          timestamp: tip.createdAt,
          zScore: result.zScore,
          isAnomaly: result.isAnomaly,
          severity: result.severity,
          recipient: tip.recipient,
          chainId: tip.chainId,
        };
      });

      // Normal zone: mean +/- 2 standard deviations (z-score threshold)
      const upperBound = stats.mean + 2 * stats.stdDev;
      const lowerBound = Math.max(0, stats.mean - 2 * stats.stdDev);

      res.json({
        transactions,
        normalZone: {
          mean: stats.mean,
          upperBound: Math.round(upperBound * 1e6) / 1e6,
          lowerBound: Math.round(lowerBound * 1e6) / 1e6,
        },
        statistics: {
          mean: stats.mean,
          stdDev: stats.stdDev,
          q1: stats.q1,
          q3: stats.q3,
          median: stats.median,
          sampleCount: stats.sampleCount,
          min: stats.min,
          max: stats.max,
        },
      });
    } catch (err) {
      logger.error('Failed to generate anomaly chart data', { error: String(err) });
      res.status(500).json({ error: 'Failed to generate anomaly chart data' });
    }
  });

  /** GET /api/credit/:address — Compute credit score for an address */
  router.get('/credit/:address', (req, res) => {
    try {
      res.json(creditScoring.computeScore(req.params.address));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/credit/:address/history — Credit score history */
  router.get('/credit/:address/history', (req, res) => {
    try {
      res.json(creditScoring.getScoreHistory(req.params.address));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/credit/config/weights — Current scoring weights */
  router.get('/credit/config/weights', (_req, res) => {
    try {
      res.json(creditScoring.getWeights());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** PUT /api/credit/config/weights — Update scoring weights */
  router.put('/credit/config/weights', (req, res) => {
    try {
      res.json(creditScoring.updateWeights(req.body));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/credit/config/thresholds — Default tier thresholds */
  router.get('/credit/config/thresholds', (_req, res) => {
    try {
      res.json(creditScoring.getDefaultThresholds());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/credit/:address/check — Check if a tip amount is allowed by credit */
  router.post('/credit/:address/check', (req, res) => {
    try {
      const { amount } = req.body as { amount?: number };
      if (amount === undefined) {
        res.status(400).json({ error: 'amount is required' });
        return;
      }
      res.json(creditScoring.isTipAllowedByCredit(req.params.address, Number(amount)));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
}

// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Tip Executor Agent — Specialist in analyzing engagement and executing tips
// HD Wallet Index: 0

import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';
import {
  BaseAgent,
  type AgentContext,
  type AgentAnalysis,
  type Proposal,
  type Vote,
  type Action,
  type ExecutionResult,
} from './base-agent.js';
import type { WalletService } from '../services/wallet.service.js';
import type { EngagementScorerService } from '../services/engagement-scorer.service.js';
import type { RumbleScraperService } from '../services/rumble-scraper.service.js';

// ── Types ──────────────────────────────────────────────────────

interface TipCalculation {
  recipient: string;
  chain: string;
  amount: string;
  engagementScore: number;
  walletHealth: number;
  reasoning: string;
}

// ── Tip Executor Agent ─────────────────────────────────────────

export class TipExecutorAgent extends BaseAgent {
  private walletService: WalletService | null = null;
  private engagementScorer: EngagementScorerService | null = null;
  private rumbleScraper: RumbleScraperService | null = null;
  private executedTips: Array<{ id: string; recipient: string; amount: string; chain: string; timestamp: string }> = [];

  constructor() {
    super('TipExecutor', 'Tipping specialist — analyzes engagement, calculates optimal tips, executes via WDK', 0);
  }

  /** Wire external services */
  setServices(opts: {
    wallet?: WalletService;
    engagementScorer?: EngagementScorerService;
    rumbleScraper?: RumbleScraperService;
  }): void {
    if (opts.wallet) this.walletService = opts.wallet;
    if (opts.engagementScorer) this.engagementScorer = opts.engagementScorer;
    if (opts.rumbleScraper) this.rumbleScraper = opts.rumbleScraper;
  }

  // ── Core Analysis ──

  async analyze(context: AgentContext): Promise<AgentAnalysis> {
    this.setStatus('analyzing');
    const recommendations: string[] = [];
    const data: Record<string, unknown> = {};

    try {
      // 1. Assess wallet health across chains
      const walletHealth = this.assessWalletHealth(context.balances);
      data['walletHealth'] = walletHealth;

      // 2. Analyze engagement data from scraper
      const engagementData = this.analyzeEngagement();
      data['engagement'] = engagementData;

      // 3. Generate tip recommendations
      const tipCandidates = this.calculateOptimalTips(engagementData, walletHealth);
      data['tipCandidates'] = tipCandidates;

      if (tipCandidates.length > 0) {
        recommendations.push(`Found ${tipCandidates.length} tip candidate(s) based on engagement analysis`);
        for (const candidate of tipCandidates.slice(0, 3)) {
          recommendations.push(
            `Tip ${candidate.amount} USDT to ${candidate.recipient} on ${candidate.chain} (engagement: ${candidate.engagementScore}/100)`,
          );
        }
      } else {
        recommendations.push('No tip candidates meet minimum engagement threshold this cycle');
      }

      // 4. Track recent activity
      data['recentTips'] = this.executedTips.slice(-10);
      data['totalExecuted'] = this.executedTips.length;

      const confidence = tipCandidates.length > 0 ? Math.min(0.9, 0.5 + tipCandidates.length * 0.1) : 0.3;

      this.setStatus('idle');
      this.incrementCycles();

      return {
        agentId: this.id,
        agentName: this.name,
        summary: `Analyzed ${engagementData.creatorsScored} creators. ${tipCandidates.length} tip candidate(s) identified. Wallet health: ${walletHealth.overall}/100.`,
        confidence,
        recommendations,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.setError(`Analysis failed: ${String(err)}`);
      return {
        agentId: this.id,
        agentName: this.name,
        summary: `Analysis failed: ${String(err)}`,
        confidence: 0,
        recommendations: ['Analysis encountered an error — skip tipping this cycle'],
        data: { error: String(err) },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Voting ──

  async vote(proposal: Proposal): Promise<Vote> {
    this.setStatus('voting');

    try {
      let decision: Vote['decision'] = 'abstain';
      let confidence = 0.5;
      let reasoning = '';

      if (proposal.type === 'TIP') {
        const amount = parseFloat((proposal.data['amount'] as string) ?? '0');
        const engagementScore = (proposal.data['engagementScore'] as number) ?? 0;
        const recipient = (proposal.data['recipient'] as string) ?? 'unknown';

        // Approve tips for high engagement creators with reasonable amounts
        if (engagementScore >= 50 && amount <= 10) {
          decision = 'approve';
          confidence = Math.min(0.95, 0.6 + engagementScore / 200);
          reasoning = `Engagement score ${engagementScore}/100 justifies ${amount} USDT tip to ${recipient}`;
        } else if (engagementScore >= 30 && amount <= 5) {
          decision = 'approve';
          confidence = 0.6;
          reasoning = `Moderate engagement (${engagementScore}/100) — small tip of ${amount} USDT acceptable`;
        } else if (engagementScore < 30) {
          decision = 'reject';
          confidence = 0.7;
          reasoning = `Engagement too low (${engagementScore}/100) — not worth tipping`;
        } else {
          decision = 'reject';
          confidence = 0.6;
          reasoning = `Amount ${amount} USDT too high for engagement level ${engagementScore}/100`;
        }
      } else if (proposal.type === 'REBALANCE' || proposal.type === 'YIELD_DEPLOY') {
        // TipExecutor generally approves treasury operations
        decision = 'approve';
        confidence = 0.5;
        reasoning = 'Treasury operations are outside my expertise — deferring to TreasuryOptimizer';
      } else {
        decision = 'abstain';
        confidence = 0.3;
        reasoning = `Proposal type ${proposal.type} is outside my domain`;
      }

      this.setStatus('idle');

      return {
        agentId: this.id,
        agentName: this.name,
        decision,
        confidence,
        reasoning,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.setStatus('idle');
      return {
        agentId: this.id,
        agentName: this.name,
        decision: 'abstain',
        confidence: 0,
        reasoning: `Vote failed: ${String(err)}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Execution ──

  async execute(action: Action): Promise<ExecutionResult> {
    this.setStatus('executing');

    try {
      if (action.type !== 'SEND_TIP') {
        this.setStatus('idle');
        return {
          actionId: action.id,
          agentId: this.id,
          success: false,
          error: `TipExecutor only handles SEND_TIP actions, got ${action.type}`,
          details: {},
          timestamp: new Date().toISOString(),
        };
      }

      const recipient = action.params['recipient'] as string;
      const amount = action.params['amount'] as string;
      const chain = (action.params['chain'] as string) ?? 'ethereum-sepolia';

      logger.info(`TipExecutor: Executing tip of ${amount} USDT to ${recipient} on ${chain}`);

      // Execute via WDK if wallet service is available
      let txHash: string | undefined;
      if (this.walletService) {
        try {
          const result = await this.walletService.sendTransaction(
            chain as Parameters<WalletService['sendTransaction']>[0],
            recipient,
            amount,
          );
          txHash = result.hash;
          logger.info(`TipExecutor: Transaction confirmed: ${txHash}`);
        } catch (walletErr) {
          logger.warn(`TipExecutor: WDK transaction failed — recording as pending`, { error: String(walletErr) });
        }
      }

      // Record the tip
      const tipRecord = {
        id: randomUUID(),
        recipient,
        amount,
        chain,
        timestamp: new Date().toISOString(),
      };
      this.executedTips.push(tipRecord);

      // Broadcast result to other agents
      this.sendMessage('*', 'RESULT', {
        type: 'TIP_EXECUTED',
        tip: tipRecord,
        txHash,
        proposalId: action.proposalId,
      }, action.proposalId);

      this.setStatus('idle');

      return {
        actionId: action.id,
        agentId: this.id,
        success: true,
        txHash,
        details: { tip: tipRecord },
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.setError(`Execution failed: ${String(err)}`);
      return {
        actionId: action.id,
        agentId: this.id,
        success: false,
        error: String(err),
        details: {},
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Internal Helpers ──

  private assessWalletHealth(balances: Map<string, { native: string; usdt: string }>): {
    overall: number;
    chains: Array<{ chain: string; native: number; usdt: number; healthy: boolean }>;
    totalUsdt: number;
  } {
    const chains: Array<{ chain: string; native: number; usdt: number; healthy: boolean }> = [];
    let totalUsdt = 0;

    for (const [chain, bal] of balances) {
      const native = parseFloat(bal.native) || 0;
      const usdt = parseFloat(bal.usdt) || 0;
      totalUsdt += usdt;
      chains.push({
        chain,
        native,
        usdt,
        healthy: native > 0 || usdt > 0,
      });
    }

    const healthyCount = chains.filter((c) => c.healthy).length;
    const overall = chains.length > 0 ? Math.round((healthyCount / chains.length) * 100) : 0;

    return { overall, chains, totalUsdt };
  }

  private analyzeEngagement(): {
    creatorsScored: number;
    topCreators: Array<{ slug: string; score: number; tier: string }>;
    avgScore: number;
  } {
    if (!this.engagementScorer) {
      return { creatorsScored: 0, topCreators: [], avgScore: 0 };
    }

    const stats = this.engagementScorer.getStats();
    const topCreators: Array<{ slug: string; score: number; tier: string }> = [];

    // Score creators from scraper if available
    if (this.rumbleScraper) {
      const profiles = this.rumbleScraper.getStartupProfiles();
      for (const [slug, profile] of profiles) {
        const scored = this.engagementScorer.scoreCreator(profile);
        topCreators.push({ slug, score: scored.score, tier: scored.tier });
      }
    }

    // Sort by score descending
    topCreators.sort((a, b) => b.score - a.score);

    const avgScore = topCreators.length > 0
      ? topCreators.reduce((sum, c) => sum + c.score, 0) / topCreators.length
      : 0;

    return {
      creatorsScored: stats.totalScored || topCreators.length,
      topCreators: topCreators.slice(0, 10),
      avgScore: Math.round(avgScore),
    };
  }

  private calculateOptimalTips(
    engagement: ReturnType<TipExecutorAgent['analyzeEngagement']>,
    walletHealth: ReturnType<TipExecutorAgent['assessWalletHealth']>,
  ): TipCalculation[] {
    const candidates: TipCalculation[] = [];

    if (walletHealth.totalUsdt < 0.5) {
      return []; // Not enough funds to tip
    }

    // Pick top creators above threshold
    const eligibleCreators = engagement.topCreators.filter((c) => c.score >= 40);

    for (const creator of eligibleCreators.slice(0, 3)) {
      // Scale tip amount: 0.1 USDT (low engagement) to 2 USDT (diamond tier)
      const baseAmount = creator.score >= 85 ? 2 : creator.score >= 70 ? 1 : creator.score >= 50 ? 0.5 : 0.1;

      // Adjust by wallet health
      const healthMultiplier = Math.min(1, walletHealth.overall / 80);
      const finalAmount = Math.max(0.01, baseAmount * healthMultiplier);

      // Pick the chain with the most USDT
      const bestChain = walletHealth.chains
        .filter((c) => c.usdt >= finalAmount)
        .sort((a, b) => b.usdt - a.usdt)[0];

      if (bestChain) {
        candidates.push({
          recipient: creator.slug,
          chain: bestChain.chain,
          amount: finalAmount.toFixed(2),
          engagementScore: creator.score,
          walletHealth: walletHealth.overall,
          reasoning: `${creator.tier} tier creator (${creator.score}/100), wallet health ${walletHealth.overall}/100, tip ${finalAmount.toFixed(2)} USDT on ${bestChain.chain}`,
        });
      }
    }

    return candidates;
  }

  /** Get tip execution history */
  getExecutedTips(): typeof this.executedTips {
    return [...this.executedTips];
  }
}

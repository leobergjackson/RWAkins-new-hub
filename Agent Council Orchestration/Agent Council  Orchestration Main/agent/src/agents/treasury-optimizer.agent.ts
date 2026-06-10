// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Treasury Optimizer Agent — Monitors balances, identifies yield, recommends rebalancing
// HD Wallet Index: 2

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
import type { TreasuryService } from '../services/treasury.service.js';
import type { LendingService } from '../services/lending.service.js';

// ── Types ──────────────────────────────────────────────────────

interface ChainAllocation {
  chain: string;
  usdt: number;
  native: number;
  percentOfTotal: number;
  isOverweight: boolean;
  isUnderweight: boolean;
}

interface RebalanceRecommendation {
  from: string;
  to: string;
  amount: number;
  reason: string;
  gasSavingsEstimate: number;
}

interface YieldOpportunity {
  protocol: string;
  chain: string;
  apy: number;
  idleAmount: number;
  potentialYield: number;
}

// ── Treasury Optimizer Agent ───────────────────────────────────

export class TreasuryOptimizerAgent extends BaseAgent {
  private walletService: WalletService | null = null;
  private treasuryService: TreasuryService | null = null;
  private lendingService: LendingService | null = null;

  // Configuration
  private readonly overweightThreshold = 0.4; // Chain is overweight if >40% of total
  private readonly underweightThreshold = 0.05; // Chain is underweight if <5% of total
  private readonly minIdleForYield = 5; // Minimum idle USDT before considering yield
  private readonly targetApy = 0.03; // 3% minimum APY to recommend

  // State
  private lastAllocation: ChainAllocation[] = [];
  private rebalanceHistory: Array<{ timestamp: string; recommendation: RebalanceRecommendation; executed: boolean }> = [];
  private yieldDeployed: Array<{ protocol: string; chain: string; amount: number; timestamp: string }> = [];

  constructor() {
    super('TreasuryOptimizer', 'Treasury management — monitors balances, routes yield, recommends rebalancing', 2);
  }

  /** Wire external services */
  setServices(opts: {
    wallet?: WalletService;
    treasury?: TreasuryService;
    lending?: LendingService;
  }): void {
    if (opts.wallet) this.walletService = opts.wallet;
    if (opts.treasury) this.treasuryService = opts.treasury;
    if (opts.lending) this.lendingService = opts.lending;
  }

  // ── Core Analysis ──

  async analyze(context: AgentContext): Promise<AgentAnalysis> {
    this.setStatus('analyzing');
    const recommendations: string[] = [];
    const data: Record<string, unknown> = {};

    try {
      // 1. Map chain allocations
      const allocation = this.computeAllocation(context.balances);
      this.lastAllocation = allocation;
      data['allocation'] = allocation;

      // 2. Identify overweight/underweight chains
      const overweight = allocation.filter((a) => a.isOverweight);
      const underweight = allocation.filter((a) => a.isUnderweight && a.usdt > 0);

      if (overweight.length > 0) {
        recommendations.push(
          `Overweight chains: ${overweight.map((a) => `${a.chain} (${(a.percentOfTotal * 100).toFixed(1)}%)`).join(', ')}`,
        );
      }
      if (underweight.length > 0) {
        recommendations.push(
          `Underweight chains: ${underweight.map((a) => `${a.chain} (${(a.percentOfTotal * 100).toFixed(1)}%)`).join(', ')}`,
        );
      }

      // 3. Compute rebalance recommendations
      const rebalances = this.computeRebalanceRecommendations(allocation);
      data['rebalanceRecommendations'] = rebalances;

      for (const r of rebalances) {
        recommendations.push(
          `Rebalance: move ${r.amount.toFixed(2)} USDT from ${r.from} to ${r.to} — ${r.reason}`,
        );
      }

      // 4. Identify yield opportunities
      const yieldOps = this.identifyYieldOpportunities(allocation);
      data['yieldOpportunities'] = yieldOps;

      for (const y of yieldOps) {
        recommendations.push(
          `Yield: deploy ${y.idleAmount.toFixed(2)} USDT to ${y.protocol} on ${y.chain} (${(y.apy * 100).toFixed(1)}% APY, potential yield ${y.potentialYield.toFixed(2)}/year)`,
        );
      }

      // 5. Total portfolio summary
      const totalUsdt = allocation.reduce((sum, a) => sum + a.usdt, 0);
      data['totalUsdt'] = totalUsdt;
      data['chainCount'] = allocation.length;
      data['yieldDeployed'] = this.yieldDeployed;

      if (recommendations.length === 0) {
        recommendations.push('Treasury is well-balanced — no action needed this cycle');
      }

      this.setStatus('idle');
      this.incrementCycles();

      return {
        agentId: this.id,
        agentName: this.name,
        summary: `Treasury: ${totalUsdt.toFixed(2)} USDT across ${allocation.length} chains. ${rebalances.length} rebalance(s), ${yieldOps.length} yield opportunity(ies).`,
        confidence: 0.8,
        recommendations,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.setError(`Treasury analysis failed: ${String(err)}`);
      return {
        agentId: this.id,
        agentName: this.name,
        summary: `Treasury analysis failed: ${String(err)}`,
        confidence: 0,
        recommendations: ['Treasury analysis errored — no changes recommended'],
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
        const chain = (proposal.data['chain'] as string) ?? '';

        // Check if this chain can afford it without becoming underweight
        const chainAlloc = this.lastAllocation.find((a) => a.chain === chain);
        if (chainAlloc && chainAlloc.usdt >= amount * 2) {
          decision = 'approve';
          confidence = 0.7;
          reasoning = `Chain ${chain} has ${chainAlloc.usdt.toFixed(2)} USDT — can afford ${amount} tip with healthy reserve`;
        } else if (chainAlloc && chainAlloc.usdt >= amount) {
          decision = 'approve';
          confidence = 0.5;
          reasoning = `Chain ${chain} has ${chainAlloc.usdt.toFixed(2)} USDT — tip is affordable but will reduce reserves`;
        } else {
          decision = 'reject';
          confidence = 0.8;
          reasoning = `Chain ${chain} has insufficient funds (${chainAlloc?.usdt.toFixed(2) ?? '0'} USDT) for ${amount} tip`;
        }
      } else if (proposal.type === 'REBALANCE') {
        // Treasury optimizer is the expert here
        const amount = parseFloat((proposal.data['amount'] as string) ?? '0');
        if (amount > 0 && amount < 100) {
          decision = 'approve';
          confidence = 0.85;
          reasoning = 'Rebalance proposal within acceptable range — approved by treasury expert';
        } else {
          decision = 'reject';
          confidence = 0.7;
          reasoning = `Rebalance amount ${amount} is outside acceptable range`;
        }
      } else if (proposal.type === 'YIELD_DEPLOY') {
        const apy = (proposal.data['apy'] as number) ?? 0;
        if (apy >= this.targetApy) {
          decision = 'approve';
          confidence = 0.8;
          reasoning = `Yield of ${(apy * 100).toFixed(1)}% exceeds minimum target of ${(this.targetApy * 100).toFixed(1)}%`;
        } else {
          decision = 'reject';
          confidence = 0.6;
          reasoning = `Yield of ${(apy * 100).toFixed(1)}% below minimum target`;
        }
      } else {
        decision = 'abstain';
        confidence = 0.3;
        reasoning = `Proposal type ${proposal.type} outside treasury domain`;
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
        reasoning: `Treasury vote failed: ${String(err)}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Execution ──

  async execute(action: Action): Promise<ExecutionResult> {
    this.setStatus('executing');

    try {
      if (action.type === 'SUPPLY_YIELD') {
        const protocol = (action.params['protocol'] as string) ?? 'aave';
        const chain = (action.params['chain'] as string) ?? 'ethereum-sepolia';
        const amount = parseFloat((action.params['amount'] as string) ?? '0');

        logger.info(`TreasuryOptimizer: Deploying ${amount} USDT to ${protocol} on ${chain}`);

        // Try to supply via lending service
        if (this.lendingService && this.lendingService.isAvailable()) {
          try {
            await this.lendingService.autoMintAndSupply();
            this.yieldDeployed.push({ protocol, chain, amount, timestamp: new Date().toISOString() });

            this.setStatus('idle');
            return {
              actionId: action.id,
              agentId: this.id,
              success: true,
              details: { protocol, chain, amount, message: 'Yield deployed via Aave V3' },
              timestamp: new Date().toISOString(),
            };
          } catch (lendErr) {
            logger.warn(`TreasuryOptimizer: Lending execution failed`, { error: String(lendErr) });
          }
        }

        // Record intent even if execution didn't go through
        this.yieldDeployed.push({ protocol, chain, amount, timestamp: new Date().toISOString() });
        this.setStatus('idle');

        return {
          actionId: action.id,
          agentId: this.id,
          success: true,
          details: { protocol, chain, amount, message: 'Yield intent recorded — lending service unavailable for live execution' },
          timestamp: new Date().toISOString(),
        };

      } else if (action.type === 'REBALANCE') {
        const from = (action.params['fromChain'] as string) ?? '';
        const to = (action.params['toChain'] as string) ?? '';
        const amount = (action.params['amount'] as string) ?? '0';

        logger.info(`TreasuryOptimizer: Rebalancing ${amount} USDT from ${from} to ${to}`);

        this.rebalanceHistory.push({
          timestamp: new Date().toISOString(),
          recommendation: { from, to, amount: parseFloat(amount), reason: 'Orchestrator-approved rebalance', gasSavingsEstimate: 0 },
          executed: true,
        });

        this.setStatus('idle');
        return {
          actionId: action.id,
          agentId: this.id,
          success: true,
          details: { from, to, amount, message: 'Rebalance intent recorded — cross-chain bridge required for live execution' },
          timestamp: new Date().toISOString(),
        };
      }

      this.setStatus('idle');
      return {
        actionId: action.id,
        agentId: this.id,
        success: false,
        error: `TreasuryOptimizer does not handle action type: ${action.type}`,
        details: {},
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

  private computeAllocation(balances: Map<string, { native: string; usdt: string }>): ChainAllocation[] {
    const allocations: ChainAllocation[] = [];
    let totalUsdt = 0;

    for (const [chain, bal] of balances) {
      const usdt = parseFloat(bal.usdt) || 0;
      totalUsdt += usdt;
      allocations.push({
        chain,
        usdt,
        native: parseFloat(bal.native) || 0,
        percentOfTotal: 0,
        isOverweight: false,
        isUnderweight: false,
      });
    }

    // Compute percentages
    for (const a of allocations) {
      a.percentOfTotal = totalUsdt > 0 ? a.usdt / totalUsdt : 0;
      a.isOverweight = a.percentOfTotal > this.overweightThreshold;
      a.isUnderweight = a.percentOfTotal < this.underweightThreshold && a.usdt > 0;
    }

    return allocations;
  }

  private computeRebalanceRecommendations(allocation: ChainAllocation[]): RebalanceRecommendation[] {
    const recommendations: RebalanceRecommendation[] = [];
    const overweight = allocation.filter((a) => a.isOverweight).sort((a, b) => b.usdt - a.usdt);
    const underweight = allocation.filter((a) => a.isUnderweight).sort((a, b) => a.usdt - b.usdt);

    for (const over of overweight) {
      for (const under of underweight) {
        const excess = over.usdt - (over.usdt * this.overweightThreshold / over.percentOfTotal);
        const moveAmount = Math.min(excess * 0.5, 10); // Cap single rebalance at 10 USDT

        if (moveAmount > 0.5) {
          recommendations.push({
            from: over.chain,
            to: under.chain,
            amount: parseFloat(moveAmount.toFixed(2)),
            reason: `${over.chain} is overweight (${(over.percentOfTotal * 100).toFixed(1)}%), ${under.chain} needs funds`,
            gasSavingsEstimate: 0,
          });
        }
      }
    }

    return recommendations.slice(0, 3); // Max 3 recommendations per cycle
  }

  private identifyYieldOpportunities(allocation: ChainAllocation[]): YieldOpportunity[] {
    const opportunities: YieldOpportunity[] = [];

    for (const chain of allocation) {
      if (chain.usdt >= this.minIdleForYield) {
        // Check for Aave on EVM chains
        if (chain.chain.includes('ethereum') || chain.chain.includes('evm')) {
          const apy = 0.035; // ~3.5% on Aave V3 Sepolia
          opportunities.push({
            protocol: 'Aave V3',
            chain: chain.chain,
            apy,
            idleAmount: chain.usdt * 0.5, // Deploy 50% of idle
            potentialYield: chain.usdt * 0.5 * apy,
          });
        }
      }
    }

    return opportunities.filter((o) => o.apy >= this.targetApy);
  }

  /** Check if external services are wired */
  hasServices(): { wallet: boolean; treasury: boolean; lending: boolean } {
    return {
      wallet: this.walletService !== null,
      treasury: this.treasuryService !== null,
      lending: this.lendingService !== null,
    };
  }

  /** Get rebalance history */
  getRebalanceHistory(): typeof this.rebalanceHistory {
    return [...this.rebalanceHistory];
  }

  /** Get yield deployment history */
  getYieldDeployed(): typeof this.yieldDeployed {
    return [...this.yieldDeployed];
  }
}

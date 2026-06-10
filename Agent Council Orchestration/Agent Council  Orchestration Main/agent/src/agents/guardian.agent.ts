// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Guardian Agent — Risk guardian with veto power over all proposals
// HD Wallet Index: 1

import { logger } from '../utils/logger.js';
import {
  BaseAgent,
  type AgentContext,
  type AgentAnalysis,
  type Proposal,
  type Vote,
  type Action,
  type ExecutionResult,
  type TipRecord,
} from './base-agent.js';

// ── Types ──────────────────────────────────────────────────────

interface SpendingWindow {
  timestamp: number;
  amount: number;
  chain: string;
  recipient: string;
}

interface AnomalyFlag {
  type: 'VELOCITY' | 'AMOUNT' | 'RECIPIENT' | 'DRAIN' | 'PATTERN';
  severity: 'warning' | 'critical';
  description: string;
  timestamp: string;
}

// ── Guardian Agent ─────────────────────────────────────────────

export class GuardianAgent extends BaseAgent {
  // Risk thresholds (adaptive)
  private maxSingleTip = 10; // USDT
  private maxHourlySpend = 25; // USDT
  private maxDailySpend = 100; // USDT
  private minBalanceReserve = 0.1; // Minimum balance to keep per chain

  // Tracking state
  private spendingHistory: SpendingWindow[] = [];
  private anomalyLog: AnomalyFlag[] = [];
  private knownRecipients: Set<string> = new Set();
  private vetoCount = 0;
  private approvalCount = 0;

  constructor() {
    super('Guardian', 'Risk guardian — analyzes proposals for risk, tracks spending, can veto', 1);
  }

  // ── Core Analysis ──

  async analyze(context: AgentContext): Promise<AgentAnalysis> {
    this.setStatus('analyzing');
    const recommendations: string[] = [];
    const data: Record<string, unknown> = {};

    try {
      // 1. Analyze spending velocity
      const velocity = this.analyzeSpendingVelocity();
      data['spendingVelocity'] = velocity;

      if (velocity.hourlySpend > this.maxHourlySpend * 0.8) {
        recommendations.push(`WARNING: Approaching hourly spend limit (${velocity.hourlySpend.toFixed(2)}/${this.maxHourlySpend} USDT)`);
      }
      if (velocity.dailySpend > this.maxDailySpend * 0.8) {
        recommendations.push(`WARNING: Approaching daily spend limit (${velocity.dailySpend.toFixed(2)}/${this.maxDailySpend} USDT)`);
      }

      // 2. Check for anomalies
      const anomalies = this.detectAnomalies(context.recentTips);
      data['anomalies'] = anomalies;

      if (anomalies.length > 0) {
        for (const anomaly of anomalies) {
          recommendations.push(`ANOMALY [${anomaly.severity}]: ${anomaly.description}`);
        }
      }

      // 3. Assess portfolio health
      const portfolioRisk = this.assessPortfolioRisk(context.balances);
      data['portfolioRisk'] = portfolioRisk;

      if (portfolioRisk.drainRisk > 0.7) {
        recommendations.push('CRITICAL: Portfolio drain risk is high — veto all non-essential spending');
      }

      // 4. Adaptive threshold adjustment
      this.adjustThresholds(portfolioRisk);
      data['currentThresholds'] = {
        maxSingleTip: this.maxSingleTip,
        maxHourlySpend: this.maxHourlySpend,
        maxDailySpend: this.maxDailySpend,
      };

      // 5. Stats
      data['vetoCount'] = this.vetoCount;
      data['approvalCount'] = this.approvalCount;
      data['knownRecipients'] = this.knownRecipients.size;

      // Risk level used in confidence calculation
      const _riskLevel = anomalies.filter((a) => a.severity === 'critical').length > 0 ? 0.9 : 0.3;
      void _riskLevel;

      this.setStatus('idle');
      this.incrementCycles();

      return {
        agentId: this.id,
        agentName: this.name,
        summary: `Risk scan complete. ${anomalies.length} anomaly(ies) detected. Hourly spend: ${velocity.hourlySpend.toFixed(2)}/${this.maxHourlySpend}. Portfolio drain risk: ${(portfolioRisk.drainRisk * 100).toFixed(0)}%.`,
        confidence: 0.85,
        recommendations,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.setError(`Risk analysis failed: ${String(err)}`);
      return {
        agentId: this.id,
        agentName: this.name,
        summary: `Risk analysis error: ${String(err)}`,
        confidence: 0,
        recommendations: ['Risk engine errored — default to BLOCK all proposals'],
        data: { error: String(err) },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Voting (with VETO power) ──

  async vote(proposal: Proposal): Promise<Vote> {
    this.setStatus('voting');

    try {
      // Run all risk checks
      const riskResult = this.evaluateProposalRisk(proposal);

      let decision: Vote['decision'];
      let reasoning: string;

      if (riskResult.shouldVeto) {
        decision = 'reject';
        reasoning = `VETO: ${riskResult.reasons.join('; ')}`;
        this.vetoCount++;

        // Broadcast veto to all agents
        this.sendMessage('*', 'VETO', {
          proposalId: proposal.id,
          reasons: riskResult.reasons,
          riskScore: riskResult.riskScore,
        }, proposal.id);

        logger.warn(`Guardian VETO on proposal ${proposal.id}: ${riskResult.reasons[0]}`);
      } else if (riskResult.riskScore > 60) {
        decision = 'reject';
        reasoning = `Risk too high (${riskResult.riskScore}/100): ${riskResult.reasons.join('; ')}`;
      } else if (riskResult.riskScore > 40) {
        decision = 'approve';
        reasoning = `Moderate risk (${riskResult.riskScore}/100) — approved with caution: ${riskResult.reasons.join('; ')}`;
        this.approvalCount++;
      } else {
        decision = 'approve';
        reasoning = `Low risk (${riskResult.riskScore}/100) — safe to proceed`;
        this.approvalCount++;
      }

      this.setStatus('idle');

      return {
        agentId: this.id,
        agentName: this.name,
        decision,
        confidence: Math.min(0.95, 0.6 + riskResult.riskScore / 200),
        reasoning,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.setStatus('idle');
      // On error, default to reject (fail-safe)
      return {
        agentId: this.id,
        agentName: this.name,
        decision: 'reject',
        confidence: 0.9,
        reasoning: `Risk evaluation error — default REJECT: ${String(err)}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Execution (Guardian doesn't execute tips, but handles staking/collateral) ──

  async execute(action: Action): Promise<ExecutionResult> {
    this.setStatus('executing');

    // Guardian records the action for audit purposes but doesn't execute tips
    logger.info(`Guardian: Recording action ${action.id} for audit trail`);

    this.setStatus('idle');

    return {
      actionId: action.id,
      agentId: this.id,
      success: true,
      details: {
        note: 'Guardian recorded action for audit — execution delegated to specialist agent',
        auditTimestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ── Risk Evaluation ──

  private evaluateProposalRisk(proposal: Proposal): {
    riskScore: number;
    shouldVeto: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let riskScore = 0;

    if (proposal.type === 'TIP') {
      const amount = parseFloat((proposal.data['amount'] as string) ?? '0');
      const recipient = (proposal.data['recipient'] as string) ?? '';

      // 1. Amount check
      if (amount > this.maxSingleTip) {
        riskScore += 40;
        reasons.push(`Amount ${amount} exceeds single tip limit of ${this.maxSingleTip}`);
      } else if (amount > this.maxSingleTip * 0.5) {
        riskScore += 15;
        reasons.push(`Amount ${amount} is >50% of single tip limit`);
      }

      // 2. Velocity check
      const velocity = this.analyzeSpendingVelocity();
      if (velocity.hourlySpend + amount > this.maxHourlySpend) {
        riskScore += 35;
        reasons.push(`Would exceed hourly spend limit (${(velocity.hourlySpend + amount).toFixed(2)}/${this.maxHourlySpend})`);
      }
      if (velocity.dailySpend + amount > this.maxDailySpend) {
        riskScore += 40;
        reasons.push(`Would exceed daily spend limit (${(velocity.dailySpend + amount).toFixed(2)}/${this.maxDailySpend})`);
      }

      // 3. Unknown recipient
      if (recipient && !this.knownRecipients.has(recipient)) {
        riskScore += 10;
        reasons.push(`Unknown recipient: ${recipient} (first time)`);
      }

      // 4. Record spending
      this.spendingHistory.push({
        timestamp: Date.now(),
        amount,
        chain: (proposal.data['chain'] as string) ?? 'unknown',
        recipient,
      });
      if (recipient) this.knownRecipients.add(recipient);

    } else if (proposal.type === 'BRIDGE') {
      const amount = parseFloat((proposal.data['amount'] as string) ?? '0');
      if (amount > 50) {
        riskScore += 30;
        reasons.push(`Bridge amount ${amount} USDT is high`);
      }
    } else if (proposal.type === 'YIELD_DEPLOY') {
      riskScore += 10; // Inherent DeFi risk
      reasons.push('DeFi yield deployment carries smart contract risk');
    }

    if (reasons.length === 0) {
      reasons.push('No risk flags detected');
    }

    const shouldVeto = riskScore >= 80;

    return { riskScore: Math.min(100, riskScore), shouldVeto, reasons };
  }

  // ── Spending Analysis ──

  private analyzeSpendingVelocity(): {
    hourlySpend: number;
    dailySpend: number;
    weeklySpend: number;
    transactionsLastHour: number;
  } {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    const hourly = this.spendingHistory.filter((s) => now - s.timestamp < oneHour);
    const daily = this.spendingHistory.filter((s) => now - s.timestamp < oneDay);
    const weekly = this.spendingHistory.filter((s) => now - s.timestamp < oneWeek);

    return {
      hourlySpend: hourly.reduce((sum, s) => sum + s.amount, 0),
      dailySpend: daily.reduce((sum, s) => sum + s.amount, 0),
      weeklySpend: weekly.reduce((sum, s) => sum + s.amount, 0),
      transactionsLastHour: hourly.length,
    };
  }

  // ── Anomaly Detection ──

  private detectAnomalies(recentTips: TipRecord[]): AnomalyFlag[] {
    const anomalies: AnomalyFlag[] = [];
    const now = Date.now();

    // Velocity anomaly: more than 5 tips in 10 minutes
    const tenMinAgo = now - 10 * 60 * 1000;
    const recentCount = this.spendingHistory.filter((s) => s.timestamp > tenMinAgo).length;
    if (recentCount > 5) {
      const flag: AnomalyFlag = {
        type: 'VELOCITY',
        severity: 'warning',
        description: `${recentCount} transactions in 10 minutes — unusual velocity`,
        timestamp: new Date().toISOString(),
      };
      anomalies.push(flag);
      this.anomalyLog.push(flag);
    }

    // Repeat recipient anomaly
    const recipientCounts = new Map<string, number>();
    for (const tip of recentTips) {
      recipientCounts.set(tip.recipient, (recipientCounts.get(tip.recipient) ?? 0) + 1);
    }
    for (const [recipient, count] of recipientCounts) {
      if (count > 3) {
        const flag: AnomalyFlag = {
          type: 'RECIPIENT',
          severity: 'warning',
          description: `Recipient ${recipient} tipped ${count} times recently — possible duplicate`,
          timestamp: new Date().toISOString(),
        };
        anomalies.push(flag);
        this.anomalyLog.push(flag);
      }
    }

    return anomalies;
  }

  // ── Portfolio Risk ──

  private assessPortfolioRisk(balances: Map<string, { native: string; usdt: string }>): {
    drainRisk: number;
    totalValue: number;
    chainsAtRisk: string[];
  } {
    let totalValue = 0;
    const chainsAtRisk: string[] = [];

    for (const [chain, bal] of balances) {
      const native = parseFloat(bal.native) || 0;
      const usdt = parseFloat(bal.usdt) || 0;
      totalValue += usdt;

      if (native < this.minBalanceReserve && usdt < 1) {
        chainsAtRisk.push(chain);
      }
    }

    // Drain risk: ratio of recent spending to total balance
    const velocity = this.analyzeSpendingVelocity();
    const drainRisk = totalValue > 0
      ? Math.min(1, velocity.dailySpend / totalValue)
      : 1; // No funds = maximum risk

    return { drainRisk, totalValue, chainsAtRisk };
  }

  // ── Adaptive Thresholds ──

  private adjustThresholds(portfolioRisk: { drainRisk: number; totalValue: number }): void {
    // Tighten limits when risk is high
    if (portfolioRisk.drainRisk > 0.5) {
      this.maxSingleTip = Math.max(1, this.maxSingleTip * 0.8);
      this.maxHourlySpend = Math.max(5, this.maxHourlySpend * 0.8);
      logger.info(`Guardian: Tightened limits — maxTip=${this.maxSingleTip}, maxHourly=${this.maxHourlySpend}`);
    } else if (portfolioRisk.drainRisk < 0.2 && portfolioRisk.totalValue > 50) {
      // Loosen limits when portfolio is healthy
      this.maxSingleTip = Math.min(20, this.maxSingleTip * 1.1);
      this.maxHourlySpend = Math.min(50, this.maxHourlySpend * 1.1);
    }
  }

  /** Get anomaly log */
  getAnomalyLog(): AnomalyFlag[] {
    return [...this.anomalyLog];
  }

  /** Get guardian stats */
  getGuardianStats(): {
    vetoCount: number;
    approvalCount: number;
    anomaliesDetected: number;
    knownRecipients: number;
    thresholds: { maxSingleTip: number; maxHourlySpend: number; maxDailySpend: number };
  } {
    return {
      vetoCount: this.vetoCount,
      approvalCount: this.approvalCount,
      anomaliesDetected: this.anomalyLog.length,
      knownRecipients: this.knownRecipients.size,
      thresholds: {
        maxSingleTip: this.maxSingleTip,
        maxHourlySpend: this.maxHourlySpend,
        maxDailySpend: this.maxDailySpend,
      },
    };
  }
}

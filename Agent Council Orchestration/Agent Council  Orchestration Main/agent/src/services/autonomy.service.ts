// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

/** Tip profile built from historical tip analysis */
export interface TipProfile {
  userId: string;
  frequentRecipients: {
    address: string;
    count: number;
    avgAmount: number;
    lastTip: string;
  }[];
  tipPatterns: {
    dayOfWeek: number;
    hour: number;
    frequency: number;
  }[];
  totalTipped: number;
  avgTipAmount: number;
  preferredChain: string;
  activeDays: number;
  firstTipDate: string;
  lastTipDate: string;
}

/** Autonomy policy — high-level rules the agent follows */
export interface AutonomyPolicy {
  id: string;
  userId: string;
  name: string;
  type: 'recurring' | 'budget' | 'recipient_limit' | 'custom';
  enabled: boolean;
  rules: {
    maxPerTip?: number;
    maxDailyTotal?: number;
    allowedRecipients?: string[];
    blockedRecipients?: string[];
    preferredChain?: string;
    schedule?: {
      dayOfWeek?: number[];  // 0=Sun, 6=Sat
      hour?: number;
    };
    requireConfirmationAbove?: number;
  };
  createdAt: string;
}

/** Autonomous decision with full reasoning chain */
export interface AutonomousDecision {
  id: string;
  timestamp: string;
  recipient: string;
  amount: number;
  chain: string;
  reasoning: {
    trigger: string;
    recipientReason: string;
    amountReason: string;
    timingReason: string;
    confidenceScore: number;
  };
  status: 'proposed' | 'approved' | 'executed' | 'rejected';
  policyCompliance: {
    withinDailyLimit: boolean;
    withinPerTipLimit: boolean;
    knownRecipient: boolean;
  };
}

/** Minimal tip entry for analysis (matches TipHistoryEntry shape) */
interface TipEntry {
  id: string;
  recipient: string;
  amount: string;
  token: string;
  chainId: string;
  status: string;
  createdAt: string;
  memo?: string;
}

// ── Service ────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const POLICIES_FILE = join(__dirname, '..', '..', '.autonomy-policies.json');
const DECISIONS_FILE = join(__dirname, '..', '..', '.autonomy-decisions.json');

/**
 * AutonomyService — makes the agent truly autonomous.
 *
 * Analyses historical tips to learn user patterns, generates smart
 * recommendations, and enforces user-defined policies so the agent
 * can propose and execute tips without constant human prompting.
 */
export class AutonomyService {
  private policies: AutonomyPolicy[] = [];
  private decisions: AutonomousDecision[] = [];
  private decisionCounter = 0;

  constructor() {
    this.loadPolicies();
    this.loadDecisions();
  }

  // ── Tip Pattern Analysis ──────────────────────────────────────

  /**
   * Analyse a list of historical tips and build a user TipProfile.
   * This is the core intelligence: the agent learns WHO the user
   * tips, WHEN they tip, and HOW MUCH.
   */
  analyzeTipHistory(tips: TipEntry[]): TipProfile {
    const confirmed = tips.filter((t) => t.status === 'confirmed');

    // Frequency per recipient
    const recipientMap = new Map<string, { count: number; amounts: number[]; lastTip: string }>();
    for (const tip of confirmed) {
      const addr = tip.recipient.toLowerCase();
      const existing = recipientMap.get(addr) ?? { count: 0, amounts: [], lastTip: '' };
      existing.count++;
      existing.amounts.push(parseFloat(tip.amount) || 0);
      if (!existing.lastTip || tip.createdAt > existing.lastTip) {
        existing.lastTip = tip.createdAt;
      }
      recipientMap.set(addr, existing);
    }

    const frequentRecipients = Array.from(recipientMap.entries())
      .map(([address, data]) => ({
        address,
        count: data.count,
        avgAmount: data.amounts.length > 0 ? data.amounts.reduce((s, v) => s + v, 0) / data.amounts.length : 0,
        lastTip: data.lastTip,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Temporal patterns: day-of-week × hour
    const patternMap = new Map<string, number>();
    for (const tip of confirmed) {
      const d = new Date(tip.createdAt);
      const key = `${d.getDay()}-${d.getHours()}`;
      patternMap.set(key, (patternMap.get(key) ?? 0) + 1);
    }

    const tipPatterns = Array.from(patternMap.entries())
      .map(([key, freq]) => {
        const [dow, hr] = key.split('-').map(Number);
        return { dayOfWeek: dow, hour: hr, frequency: freq };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    // Chain preference
    const chainCounts = new Map<string, number>();
    for (const tip of confirmed) {
      chainCounts.set(tip.chainId, (chainCounts.get(tip.chainId) ?? 0) + 1);
    }
    let preferredChain = 'ethereum-sepolia';
    let maxChainCount = 0;
    for (const [chain, count] of chainCounts) {
      if (count > maxChainCount) {
        maxChainCount = count;
        preferredChain = chain;
      }
    }

    const allAmounts = confirmed.map((t) => parseFloat(t.amount) || 0);
    const totalTipped = allAmounts.reduce((s, v) => s + v, 0);
    const avgTipAmount = allAmounts.length > 0 ? totalTipped / allAmounts.length : 0;

    // Active days
    const uniqueDays = new Set(confirmed.map((t) => t.createdAt.slice(0, 10)));

    const sortedDates = confirmed.map((t) => t.createdAt).sort();

    return {
      userId: 'default',
      frequentRecipients,
      tipPatterns,
      totalTipped: Math.round(totalTipped * 1e6) / 1e6,
      avgTipAmount: Math.round(avgTipAmount * 1e6) / 1e6,
      preferredChain,
      activeDays: uniqueDays.size,
      firstTipDate: sortedDates[0] ?? '',
      lastTipDate: sortedDates[sortedDates.length - 1] ?? '',
    };
  }

  // ── Smart Recommendations ─────────────────────────────────────

  /**
   * Generate autonomous tip recommendations based on the user's
   * profile. Each recommendation includes a full reasoning chain
   * explaining why this recipient, amount, and timing was chosen.
   */
  generateRecommendations(profile: TipProfile): AutonomousDecision[] {
    const recommendations: AutonomousDecision[] = [];
    const now = new Date();
    const currentDow = now.getDay();
    const currentHour = now.getHours();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // 1. Pattern-based: "You usually tip X on Fridays"
    for (const recipient of profile.frequentRecipients.slice(0, 5)) {
      // Find the most common day-of-week for this recipient's tips
      const bestPattern = profile.tipPatterns.find((p) => p.dayOfWeek === currentDow);
      if (bestPattern && bestPattern.frequency >= 1 && recipient.count >= 2) {
        const confidence = Math.min(0.95, 0.3 + (recipient.count / 20) + (bestPattern.frequency / 10));
        const decision = this.createDecision(
          recipient.address,
          recipient.avgAmount,
          profile.preferredChain,
          {
            trigger: `Pattern detected: frequent tipping on ${dayNames[currentDow]}s`,
            recipientReason: `Top recipient with ${recipient.count} previous tips (avg ${recipient.avgAmount.toFixed(4)})`,
            amountReason: `Based on historical average of ${recipient.avgAmount.toFixed(4)} to this address`,
            timingReason: `${dayNames[currentDow]} at ${currentHour}:00 matches ${bestPattern.frequency} previous tips at this time`,
            confidenceScore: Math.round(confidence * 100) / 100,
          },
        );
        recommendations.push(decision);
      }
    }

    // 2. Consistency-based: recipients not tipped recently
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const recipient of profile.frequentRecipients) {
      if (recipient.count >= 3 && new Date(recipient.lastTip).getTime() < sevenDaysAgo) {
        const daysSince = Math.floor((Date.now() - new Date(recipient.lastTip).getTime()) / (1000 * 60 * 60 * 24));
        const decision = this.createDecision(
          recipient.address,
          recipient.avgAmount,
          profile.preferredChain,
          {
            trigger: `Consistency check: ${daysSince} days since last tip to frequent recipient`,
            recipientReason: `Frequent recipient (${recipient.count} tips) not tipped in ${daysSince} days`,
            amountReason: `Historical average: ${recipient.avgAmount.toFixed(4)}`,
            timingReason: `Overdue — last tipped ${new Date(recipient.lastTip).toLocaleDateString()}`,
            confidenceScore: Math.min(0.85, 0.4 + (recipient.count / 15)),
          },
        );
        // Avoid duplicating the same recipient
        if (!recommendations.some((r) => r.recipient === recipient.address)) {
          recommendations.push(decision);
        }
      }
    }

    // 3. Amount suggestion for top recipient
    if (profile.frequentRecipients.length > 0 && recommendations.length === 0) {
      const top = profile.frequentRecipients[0];
      const decision = this.createDecision(
        top.address,
        top.avgAmount,
        profile.preferredChain,
        {
          trigger: 'Proactive suggestion for your most-tipped recipient',
          recipientReason: `#1 recipient with ${top.count} tips totalling ~${(top.avgAmount * top.count).toFixed(4)}`,
          amountReason: `Your average tip to this address is ${top.avgAmount.toFixed(4)}`,
          timingReason: 'No specific timing trigger — proactive recommendation',
          confidenceScore: 0.5,
        },
      );
      recommendations.push(decision);
    }

    // Limit to 10 recommendations
    return recommendations.slice(0, 10);
  }

  // ── Policy Engine ─────────────────────────────────────────────

  /** Set or update a policy for a user */
  setPolicy(userId: string, policy: Omit<AutonomyPolicy, 'id' | 'userId' | 'createdAt'>): AutonomyPolicy {
    const newPolicy: AutonomyPolicy = {
      ...policy,
      id: `policy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      createdAt: new Date().toISOString(),
    };
    this.policies.push(newPolicy);
    this.savePolicies();
    logger.info('Autonomy policy created', { id: newPolicy.id, name: newPolicy.name });
    return newPolicy;
  }

  /** Get all policies for a user */
  getPolicies(userId: string): AutonomyPolicy[] {
    return this.policies.filter((p) => p.userId === userId);
  }

  /** Delete a policy by ID */
  deletePolicy(policyId: string): boolean {
    const idx = this.policies.findIndex((p) => p.id === policyId);
    if (idx === -1) return false;
    this.policies.splice(idx, 1);
    this.savePolicies();
    logger.info('Autonomy policy deleted', { id: policyId });
    return true;
  }

  // ── Autonomous Execution ──────────────────────────────────────

  /**
   * Run the full autonomous evaluation pipeline:
   * 1. Build profile from tips
   * 2. Generate recommendations
   * 3. Filter through policies
   * 4. Return compliant proposals
   */
  evaluateAndPropose(tips: TipEntry[]): AutonomousDecision[] {
    const profile = this.analyzeTipHistory(tips);
    const raw = this.generateRecommendations(profile);

    // Check each recommendation against active policies
    const userPolicies = this.getPolicies('default').filter((p) => p.enabled);

    const compliant: AutonomousDecision[] = [];
    for (const decision of raw) {
      const compliance = this.checkPolicyCompliance(decision, userPolicies, profile);
      decision.policyCompliance = compliance;

      // Only propose if within limits
      if (compliance.withinDailyLimit && compliance.withinPerTipLimit) {
        this.decisions.push(decision);
        compliant.push(decision);
      }
    }

    this.saveDecisions();
    return compliant;
  }

  /** Get the full decision log */
  getDecisionLog(): AutonomousDecision[] {
    return [...this.decisions].reverse(); // newest first
  }

  /** Approve a proposed decision */
  approveDecision(id: string): AutonomousDecision | undefined {
    const decision = this.decisions.find((d) => d.id === id);
    if (!decision || decision.status !== 'proposed') return undefined;
    decision.status = 'approved';
    this.saveDecisions();
    logger.info('Autonomous decision approved', { id });
    return decision;
  }

  /** Reject a proposed decision */
  rejectDecision(id: string): AutonomousDecision | undefined {
    const decision = this.decisions.find((d) => d.id === id);
    if (!decision || decision.status !== 'proposed') return undefined;
    decision.status = 'rejected';
    this.saveDecisions();
    logger.info('Autonomous decision rejected', { id });
    return decision;
  }

  /** Mark an approved decision as executed */
  markExecuted(id: string): AutonomousDecision | undefined {
    const decision = this.decisions.find((d) => d.id === id);
    if (!decision || decision.status !== 'approved') return undefined;
    decision.status = 'executed';
    this.saveDecisions();
    return decision;
  }

  // ── Private helpers ───────────────────────────────────────────

  private createDecision(
    recipient: string,
    amount: number,
    chain: string,
    reasoning: AutonomousDecision['reasoning'],
  ): AutonomousDecision {
    this.decisionCounter++;
    return {
      id: `decision-${Date.now()}-${this.decisionCounter}`,
      timestamp: new Date().toISOString(),
      recipient,
      amount: Math.round(amount * 1e6) / 1e6,
      chain,
      reasoning,
      status: 'proposed',
      policyCompliance: {
        withinDailyLimit: true,
        withinPerTipLimit: true,
        knownRecipient: true,
      },
    };
  }

  private checkPolicyCompliance(
    decision: AutonomousDecision,
    policies: AutonomyPolicy[],
    profile: TipProfile,
  ): AutonomousDecision['policyCompliance'] {
    let withinDailyLimit = true;
    let withinPerTipLimit = true;
    const knownRecipient = profile.frequentRecipients.some(
      (r) => r.address.toLowerCase() === decision.recipient.toLowerCase(),
    );

    for (const policy of policies) {
      const rules = policy.rules;

      // Per-tip cap
      if (rules.maxPerTip !== undefined && decision.amount > rules.maxPerTip) {
        withinPerTipLimit = false;
      }

      // Daily total cap — sum proposed decisions for today
      if (rules.maxDailyTotal !== undefined) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayProposed = this.decisions
          .filter((d) => d.status !== 'rejected' && new Date(d.timestamp) >= todayStart)
          .reduce((sum, d) => sum + d.amount, 0);
        if (todayProposed + decision.amount > rules.maxDailyTotal) {
          withinDailyLimit = false;
        }
      }

      // Blocked recipients
      if (rules.blockedRecipients?.some((b) => b.toLowerCase() === decision.recipient.toLowerCase())) {
        withinPerTipLimit = false;
      }

      // Allowed recipients (if set, restrict to list)
      if (rules.allowedRecipients && rules.allowedRecipients.length > 0) {
        if (!rules.allowedRecipients.some((a) => a.toLowerCase() === decision.recipient.toLowerCase())) {
          withinPerTipLimit = false;
        }
      }
    }

    return { withinDailyLimit, withinPerTipLimit, knownRecipient };
  }

  private loadPolicies(): void {
    try {
      if (existsSync(POLICIES_FILE)) {
        const data = JSON.parse(readFileSync(POLICIES_FILE, 'utf-8')) as AutonomyPolicy[];
        this.policies = data;
        logger.info(`Loaded ${data.length} autonomy policies`);
      }
    } catch (err) {
      logger.warn('Failed to load autonomy policies', { error: String(err) });
    }
  }

  private savePolicies(): void {
    try {
      writeFileSync(POLICIES_FILE, JSON.stringify(this.policies, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to save autonomy policies', { error: String(err) });
    }
  }

  private loadDecisions(): void {
    try {
      if (existsSync(DECISIONS_FILE)) {
        const data = JSON.parse(readFileSync(DECISIONS_FILE, 'utf-8')) as AutonomousDecision[];
        this.decisions = data;
        this.decisionCounter = data.length;
        logger.info(`Loaded ${data.length} autonomy decisions`);
      }
    } catch (err) {
      logger.warn('Failed to load autonomy decisions', { error: String(err) });
    }
  }

  private saveDecisions(): void {
    try {
      // Keep last 500 decisions
      if (this.decisions.length > 500) {
        this.decisions = this.decisions.slice(-500);
      }
      writeFileSync(DECISIONS_FILE, JSON.stringify(this.decisions, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to save autonomy decisions', { error: String(err) });
    }
  }
}

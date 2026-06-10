// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
//
// TIP POLICY ENGINE — Programmable Money for Agentic Tipping
//
// This is AeroFyta's forward-looking innovation: a declarative policy language
// that turns tipping into PROGRAMMABLE MONEY. Instead of hardcoded logic,
// creators and viewers define policies in a human-readable format that the
// agent interprets and executes autonomously.
//
// This sets a STANDARD that other autonomous payment agents can adopt — any agent that
// speaks the TipPolicy format can participate in the same payment ecosystem.
//
// Example policy:
//   {
//     trigger: { type: 'watch_time', threshold: 80 },
//     conditions: [
//       { field: 'gas_fee_usd', operator: '<', value: 0.05 },
//       { field: 'creator_category', operator: 'in', value: ['education', 'tech'] }
//     ],
//     action: {
//       type: 'tip',
//       amount: { mode: 'engagement_weighted', base: 0.01 },
//       chain: 'cheapest',
//       escrow: { enabled: true, releaseAfter: '24h' }
//     }
//   }

import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POLICIES_FILE = join(__dirname, '..', '..', '.tip-policies.json');

// ── Types ────────────────────────────────────────────────────────

export type TriggerType =
  | 'watch_time'       // Viewer watches X% of video
  | 'new_video'        // Creator publishes new content
  | 'milestone'        // Creator hits subscriber/view milestone
  | 'live_start'       // Creator goes live
  | 'schedule'         // Time-based (daily, weekly)
  | 'price_condition'  // Token price crosses threshold
  | 'balance_above'    // Wallet balance exceeds amount
  | 'streak'           // Consecutive days of watching
  | 'community_goal';  // Community pool reaches target

export type ConditionOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'in' | 'not_in';

export interface PolicyCondition {
  field: string;       // e.g. 'gas_fee_usd', 'creator_category', 'balance', 'day_of_week'
  operator: ConditionOperator;
  value: unknown;      // number, string, or array for 'in'/'not_in'
}

export type AmountMode =
  | 'fixed'              // Exact amount
  | 'engagement_weighted' // Scaled by engagement score
  | 'percentage_of_balance' // % of wallet balance
  | 'gas_aware';           // Adjusted to keep fee < X% of tip

export interface PolicyAction {
  type: 'tip' | 'escrow' | 'pool_contribute' | 'stream';
  amount: {
    mode: AmountMode;
    base: number;        // Base amount in USDT
    min?: number;        // Floor
    max?: number;        // Ceiling
    feeMaxPercent?: number; // Max fee as % of tip (for gas_aware mode)
  };
  chain: 'cheapest' | 'fastest' | 'specific';
  specificChain?: string;
  token: 'usdt' | 'native' | 'usat' | 'xaut';
  escrow?: {
    enabled: boolean;
    releaseAfter?: string;  // '1h', '24h', '7d'
    releaseCondition?: 'auto' | 'manual' | 'creator_confirm';
  };
  splitWith?: Array<{ creatorId: string; percentage: number }>;
  memo?: string;
}

export interface TipPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;      // Lower = higher priority (evaluated first)
  createdBy: string;     // userId
  trigger: {
    type: TriggerType;
    threshold?: number;  // For watch_time (%), milestone (#), etc.
    schedule?: string;   // Cron-like for 'schedule' type
  };
  conditions: PolicyCondition[];
  action: PolicyAction;
  cooldown: {
    minIntervalMinutes: number;  // Minimum time between executions
    maxPerDay: number;           // Daily execution cap
    maxPerWeek: number;          // Weekly execution cap
  };
  stats: {
    timesTriggered: number;
    totalAmountSent: number;
    lastTriggeredAt?: string;
    createdAt: string;
  };
}

export interface PolicyEvaluation {
  policyId: string;
  policyName: string;
  triggered: boolean;
  conditionsMet: boolean;
  cooldownOk: boolean;
  reason: string;
  suggestedAction?: PolicyAction;
  evaluatedAt: string;
}

// ── Service ──────────────────────────────────────────────────────

/**
 * TipPolicyService — Programmable Money Engine for Agentic Tipping.
 *
 * Provides a declarative policy language for autonomous tipping.
 * Policies define WHEN to tip, under WHAT conditions, and HOW MUCH.
 * The agent evaluates policies every cycle and executes matching ones.
 *
 * This is designed as a STANDARD — any compatible agent can read and
 * execute TipPolicy format, enabling interoperability across autonomous payment agents.
 */
export class TipPolicyService {
  private policies: Map<string, TipPolicy> = new Map();

  constructor() {
    this.load();
  }

  // ── Policy CRUD ─────────────────────────────────────────────────

  /** Create a new tip policy */
  createPolicy(input: {
    name: string;
    description: string;
    createdBy: string;
    trigger: TipPolicy['trigger'];
    conditions: PolicyCondition[];
    action: PolicyAction;
    cooldown?: Partial<TipPolicy['cooldown']>;
    priority?: number;
  }): TipPolicy {
    const policy: TipPolicy = {
      id: uuidv4(),
      name: input.name,
      description: input.description,
      enabled: true,
      priority: input.priority ?? 50,
      createdBy: input.createdBy,
      trigger: input.trigger,
      conditions: input.conditions,
      action: input.action,
      cooldown: {
        minIntervalMinutes: input.cooldown?.minIntervalMinutes ?? 60,
        maxPerDay: input.cooldown?.maxPerDay ?? 10,
        maxPerWeek: input.cooldown?.maxPerWeek ?? 50,
      },
      stats: {
        timesTriggered: 0,
        totalAmountSent: 0,
        createdAt: new Date().toISOString(),
      },
    };

    this.policies.set(policy.id, policy);
    this.save();
    logger.info('Tip policy created', { id: policy.id, name: policy.name, trigger: policy.trigger.type });
    return policy;
  }

  /** Get a policy by ID */
  getPolicy(id: string): TipPolicy | undefined {
    return this.policies.get(id);
  }

  /** List all policies, sorted by priority */
  listPolicies(): TipPolicy[] {
    return Array.from(this.policies.values()).sort((a, b) => a.priority - b.priority);
  }

  /** Enable/disable a policy */
  togglePolicy(id: string, enabled: boolean): TipPolicy | undefined {
    const policy = this.policies.get(id);
    if (!policy) return undefined;
    policy.enabled = enabled;
    this.save();
    return policy;
  }

  /** Delete a policy */
  deletePolicy(id: string): boolean {
    const result = this.policies.delete(id);
    if (result) this.save();
    return result;
  }

  // ── Policy Evaluation Engine ────────────────────────────────────

  /**
   * Evaluate all enabled policies against current context.
   * Returns list of policies that should fire, with suggested actions.
   */
  evaluatePolicies(context: {
    watchPercent?: number;
    creatorId?: string;
    creatorCategories?: string[];
    gasFeeUsd?: number;
    walletBalance?: number;
    dayOfWeek?: number;   // 0=Sun, 6=Sat
    hourOfDay?: number;   // 0-23
    engagementScore?: number;
    creatorTotalTips?: number;
    event?: string;       // 'new_video', 'milestone', 'live_start'
  }): PolicyEvaluation[] {
    const results: PolicyEvaluation[] = [];

    for (const policy of this.listPolicies()) {
      if (!policy.enabled) continue;

      const evaluation = this.evaluatePolicy(policy, context);
      results.push(evaluation);
    }

    return results;
  }

  /** Evaluate a single policy against context */
  private evaluatePolicy(
    policy: TipPolicy,
    context: Record<string, unknown>,
  ): PolicyEvaluation {
    const now = new Date();
    const evalResult: PolicyEvaluation = {
      policyId: policy.id,
      policyName: policy.name,
      triggered: false,
      conditionsMet: false,
      cooldownOk: false,
      reason: '',
      evaluatedAt: now.toISOString(),
    };

    // 1. Check trigger
    const triggered = this.checkTrigger(policy.trigger, context);
    if (!triggered) {
      evalResult.reason = `Trigger not met: ${policy.trigger.type}`;
      return evalResult;
    }
    evalResult.triggered = true;

    // 2. Check all conditions
    for (const condition of policy.conditions) {
      if (!this.checkCondition(condition, context)) {
        evalResult.reason = `Condition failed: ${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`;
        return evalResult;
      }
    }
    evalResult.conditionsMet = true;

    // 3. Check cooldown
    const cooldownOk = this.checkCooldown(policy);
    if (!cooldownOk) {
      evalResult.reason = 'Cooldown active — too soon since last execution';
      return evalResult;
    }
    evalResult.cooldownOk = true;

    // 4. Calculate final action with dynamic amount
    evalResult.suggestedAction = this.resolveAction(policy.action, context);
    evalResult.reason = 'All conditions met — ready to execute';

    return evalResult;
  }

  /** Check if a trigger condition is met */
  private checkTrigger(trigger: TipPolicy['trigger'], context: Record<string, unknown>): boolean {
    switch (trigger.type) {
      case 'watch_time':
        return typeof context.watchPercent === 'number' &&
          context.watchPercent >= (trigger.threshold ?? 80);

      case 'new_video':
      case 'milestone':
      case 'live_start':
        return context.event === trigger.type;

      case 'balance_above':
        return typeof context.walletBalance === 'number' &&
          context.walletBalance >= (trigger.threshold ?? 0);

      case 'streak':
        return typeof context.streakDays === 'number' &&
          (context.streakDays as number) >= (trigger.threshold ?? 7);

      case 'schedule':
        // For schedule triggers, always return true (controlled by cooldown)
        return true;

      case 'price_condition':
      case 'community_goal':
        return false; // Placeholder for future

      default:
        return false;
    }
  }

  /** Evaluate a single condition */
  private checkCondition(condition: PolicyCondition, context: Record<string, unknown>): boolean {
    const fieldValue = this.resolveField(condition.field, context);
    if (fieldValue === undefined) return false;

    switch (condition.operator) {
      case '>': return (fieldValue as number) > (condition.value as number);
      case '<': return (fieldValue as number) < (condition.value as number);
      case '>=': return (fieldValue as number) >= (condition.value as number);
      case '<=': return (fieldValue as number) <= (condition.value as number);
      case '==': return fieldValue === condition.value;
      case '!=': return fieldValue !== condition.value;
      case 'in': return Array.isArray(condition.value) && (condition.value as unknown[]).includes(fieldValue);
      case 'not_in': return Array.isArray(condition.value) && !(condition.value as unknown[]).includes(fieldValue);
      default: return false;
    }
  }

  /** Resolve a field name to its value from context */
  private resolveField(field: string, context: Record<string, unknown>): unknown {
    const fieldMap: Record<string, string> = {
      'gas_fee_usd': 'gasFeeUsd',
      'creator_category': 'creatorCategories',
      'balance': 'walletBalance',
      'day_of_week': 'dayOfWeek',
      'hour_of_day': 'hourOfDay',
      'watch_percent': 'watchPercent',
      'engagement_score': 'engagementScore',
      'creator_total_tips': 'creatorTotalTips',
    };
    const key = fieldMap[field] ?? field;
    return context[key];
  }

  /** Check if cooldown period has passed */
  private checkCooldown(policy: TipPolicy): boolean {
    const { cooldown, stats } = policy;

    // Check min interval
    if (stats.lastTriggeredAt) {
      const lastMs = new Date(stats.lastTriggeredAt).getTime();
      const minMs = cooldown.minIntervalMinutes * 60 * 1000;
      if (Date.now() - lastMs < minMs) return false;
    }

    // Check daily cap
    const today = new Date().toISOString().slice(0, 10);
    if (stats.lastTriggeredAt?.startsWith(today) && stats.timesTriggered >= cooldown.maxPerDay) {
      return false;
    }

    return true;
  }

  /** Resolve dynamic amount based on mode */
  private resolveAction(action: PolicyAction, context: Record<string, unknown>): PolicyAction {
    const resolved = { ...action, amount: { ...action.amount } };

    switch (action.amount.mode) {
      case 'engagement_weighted': {
        const score = (context.engagementScore as number) ?? 0.5;
        const multiplier = 0.5 + score * 2.5;
        resolved.amount.base = Math.round(action.amount.base * multiplier * 1e6) / 1e6;
        break;
      }
      case 'percentage_of_balance': {
        const balance = (context.walletBalance as number) ?? 0;
        resolved.amount.base = Math.round(balance * (action.amount.base / 100) * 1e6) / 1e6;
        break;
      }
      case 'gas_aware': {
        const gasFee = (context.gasFeeUsd as number) ?? 0;
        const maxFeePercent = action.amount.feeMaxPercent ?? 10;
        const minTipForFee = gasFee / (maxFeePercent / 100);
        resolved.amount.base = Math.max(action.amount.base, minTipForFee);
        break;
      }
      // 'fixed' — no adjustment needed
    }

    // Apply min/max caps
    if (action.amount.min !== undefined) {
      resolved.amount.base = Math.max(resolved.amount.base, action.amount.min);
    }
    if (action.amount.max !== undefined) {
      resolved.amount.base = Math.min(resolved.amount.base, action.amount.max);
    }

    return resolved;
  }

  /** Record that a policy was executed */
  recordExecution(policyId: string, amount: number): void {
    const policy = this.policies.get(policyId);
    if (!policy) return;

    policy.stats.timesTriggered++;
    policy.stats.totalAmountSent += amount;
    policy.stats.lastTriggeredAt = new Date().toISOString();
    this.save();
  }

  /** Get policy execution stats */
  getStats(): {
    totalPolicies: number;
    activePolicies: number;
    totalExecutions: number;
    totalAmountSent: number;
  } {
    const all = Array.from(this.policies.values());
    return {
      totalPolicies: all.length,
      activePolicies: all.filter((p) => p.enabled).length,
      totalExecutions: all.reduce((sum, p) => sum + p.stats.timesTriggered, 0),
      totalAmountSent: all.reduce((sum, p) => sum + p.stats.totalAmountSent, 0),
    };
  }

  // ── Persistence ─────────────────────────────────────────────────

  private load(): void {
    try {
      if (existsSync(POLICIES_FILE)) {
        const raw = JSON.parse(readFileSync(POLICIES_FILE, 'utf-8')) as TipPolicy[];
        for (const p of raw) {
          this.policies.set(p.id, p);
        }
        logger.info(`Loaded ${this.policies.size} tip policies`);
      }
    } catch (err) {
      logger.warn('Failed to load tip policies', { error: String(err) });
    }
  }

  private save(): void {
    try {
      writeFileSync(
        POLICIES_FILE,
        JSON.stringify(Array.from(this.policies.values()), null, 2),
        'utf-8',
      );
    } catch (err) {
      logger.warn('Failed to save tip policies', { error: String(err) });
    }
  }
}

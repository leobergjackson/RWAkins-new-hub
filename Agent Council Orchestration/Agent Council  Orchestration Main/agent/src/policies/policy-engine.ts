// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Policy Engine — Composable, priority-ordered rules governing ALL agent behavior.
// Every transaction, tip, and operation is evaluated against the full policy set.

import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export type PolicyAction = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'MODIFY';

export interface PolicyContext {
  /** Type of operation being evaluated */
  operationType: 'tip' | 'escrow' | 'bridge' | 'yield' | 'swap' | 'transfer';
  /** Amount in USDT (or equivalent) */
  amount: number;
  /** Target chain */
  chain: string;
  /** Recipient address or creator ID */
  recipient: string;
  /** Gas cost estimate in USD */
  gasCostUsd: number;
  /** Requesting agent ID */
  agentId: string;
  /** Current total balance across all chains */
  totalBalance: number;
  /** Amount spent today */
  dailySpent: number;
  /** Tips sent in the last hour */
  tipsLastHour: number;
  /** Creator engagement score 0-1 */
  creatorEngagement: number;
  /** Is this a new creator (first interaction)? */
  isNewCreator: boolean;
  /** Time of day (0-23) */
  hourOfDay: number;
  /** Extra metadata */
  metadata: Record<string, unknown>;
}

export interface Policy {
  /** Unique policy ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Higher priority = evaluated first */
  priority: number;
  /** Description of what this policy does */
  description: string;
  /** Whether this policy is currently active */
  enabled: boolean;
  /** The condition to check */
  condition: (context: PolicyContext) => boolean;
  /** What to do when condition is met */
  action: PolicyAction;
  /** Optional modification function — transforms params when action is MODIFY */
  modification?: (params: PolicyContext) => Partial<PolicyContext>;
  /** How many times this policy has been triggered */
  triggerCount: number;
  /** When this policy was created */
  createdAt: string;
}

export interface PolicyEvaluationResult {
  /** Final decision: allowed unless any policy denies */
  allowed: boolean;
  /** Policy that caused the denial (if denied) */
  deniedBy: string | null;
  /** Denial reason (from the denying policy) */
  denialReason: string | null;
  /** If action was MODIFY, the modified params */
  modifiedParams: Partial<PolicyContext> | null;
  /** All policies that were evaluated */
  evaluatedPolicies: Array<{
    id: string;
    name: string;
    triggered: boolean;
    action: PolicyAction;
    priority: number;
  }>;
  /** Policies that require approval */
  requiresApproval: string[];
  /** Evaluation timestamp */
  evaluatedAt: string;
  /** Total evaluation time in ms */
  evaluationTimeMs: number;
}

// Serializable representation for API responses
export interface PolicySummary {
  id: string;
  name: string;
  priority: number;
  description: string;
  enabled: boolean;
  action: PolicyAction;
  triggerCount: number;
  createdAt: string;
}

// ── Built-in Policy Factories ──────────────────────────────────

function createMaxTipAmountPolicy(maxAmount: number): Policy {
  return {
    id: 'max-tip-amount',
    name: 'MaxTipAmount',
    priority: 100,
    description: `Deny tips exceeding ${maxAmount} USDT`,
    enabled: true,
    condition: (ctx) => ctx.amount > maxAmount,
    action: 'DENY',
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };
}

function createDailySpendLimitPolicy(dailyLimit: number): Policy {
  return {
    id: 'daily-spend-limit',
    name: 'DailySpendLimit',
    priority: 95,
    description: `Deny if daily spend would exceed ${dailyLimit} USDT`,
    enabled: true,
    condition: (ctx) => (ctx.dailySpent + ctx.amount) > dailyLimit,
    action: 'DENY',
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };
}

function createMinBalanceReservePolicy(minReserve: number): Policy {
  return {
    id: 'min-balance-reserve',
    name: 'MinBalanceReserve',
    priority: 90,
    description: `Never let balance drop below ${minReserve} USDT`,
    enabled: true,
    condition: (ctx) => (ctx.totalBalance - ctx.amount) < minReserve,
    action: 'DENY',
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };
}

function createChainAllowlistPolicy(allowedChains: string[]): Policy {
  return {
    id: 'chain-allowlist',
    name: 'ChainAllowlist',
    priority: 85,
    description: `Only allow operations on: ${allowedChains.join(', ')}`,
    enabled: true,
    condition: (ctx) => !allowedChains.includes(ctx.chain),
    action: 'DENY',
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };
}

function createCreatorMinEngagementPolicy(minEngagement: number): Policy {
  return {
    id: 'creator-min-engagement',
    name: 'CreatorMinEngagement',
    priority: 70,
    description: `Only tip creators with engagement score >= ${minEngagement}`,
    enabled: true,
    condition: (ctx) => ctx.operationType === 'tip' && ctx.creatorEngagement < minEngagement,
    action: 'DENY',
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };
}

function createGasThresholdPolicy(maxGasPercentage: number): Policy {
  return {
    id: 'gas-threshold',
    name: 'GasThreshold',
    priority: 75,
    description: `Deny if gas cost exceeds ${maxGasPercentage}% of transaction amount`,
    enabled: true,
    condition: (ctx) => ctx.amount > 0 && (ctx.gasCostUsd / ctx.amount) > (maxGasPercentage / 100),
    action: 'DENY',
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };
}

function createVelocityLimitPolicy(maxTipsPerHour: number): Policy {
  return {
    id: 'velocity-limit',
    name: 'VelocityLimit',
    priority: 80,
    description: `Max ${maxTipsPerHour} tips per hour`,
    enabled: true,
    condition: (ctx) => ctx.operationType === 'tip' && ctx.tipsLastHour >= maxTipsPerHour,
    action: 'DENY',
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };
}

function createNewCreatorCooldownPolicy(): Policy {
  return {
    id: 'new-creator-cooldown',
    name: 'NewCreatorCooldown',
    priority: 65,
    description: 'Require approval for first-time creator tips',
    enabled: true,
    condition: (ctx) => ctx.operationType === 'tip' && ctx.isNewCreator,
    action: 'REQUIRE_APPROVAL',
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };
}

function createGuardianOverridePolicy(): Policy {
  return {
    id: 'guardian-override',
    name: 'GuardianOverride',
    priority: 200, // Highest priority
    description: 'Guardian agent can force-approve any transaction',
    enabled: true,
    condition: (ctx) => ctx.agentId === 'guardian-agent' && ctx.metadata['guardianOverride'] === true,
    action: 'ALLOW',
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };
}

function createNightModePolicy(reductionFactor: number): Policy {
  return {
    id: 'night-mode',
    name: 'NightMode',
    priority: 50,
    description: `Reduce tip amounts by ${(reductionFactor * 100).toFixed(0)}% during off-hours (22:00-06:00)`,
    enabled: true,
    condition: (ctx) => ctx.operationType === 'tip' && (ctx.hourOfDay >= 22 || ctx.hourOfDay < 6),
    action: 'MODIFY',
    modification: (ctx) => ({ amount: ctx.amount * (1 - reductionFactor) }),
    triggerCount: 0,
    createdAt: new Date().toISOString(),
  };
}

// ── Policy Engine ──────────────────────────────────────────────

export class PolicyEngine {
  private policies: Map<string, Policy> = new Map();

  constructor(loadDefaults = true) {
    if (loadDefaults) {
      this.loadDefaultPolicies();
    }
    logger.info('PolicyEngine initialized', { policyCount: this.policies.size });
  }

  private loadDefaultPolicies(): void {
    const defaults = [
      createGuardianOverridePolicy(),
      createMaxTipAmountPolicy(50),
      createDailySpendLimitPolicy(200),
      createMinBalanceReservePolicy(10),
      createChainAllowlistPolicy([
        'ethereum', 'polygon', 'tron', 'ton', 'solana',
        'arbitrum', 'optimism', 'avalanche', 'bitcoin',
      ]),
      createGasThresholdPolicy(5),
      createVelocityLimitPolicy(5),
      createCreatorMinEngagementPolicy(0.2),
      createNewCreatorCooldownPolicy(),
      createNightModePolicy(0.5),
    ];

    for (const policy of defaults) {
      this.policies.set(policy.id, policy);
    }
  }

  // ── Evaluation ─────────────────────────────────────────────

  /** Evaluate a context against ALL active policies in priority order. */
  evaluate(context: PolicyContext): PolicyEvaluationResult {
    const startTime = Date.now();
    const sorted = [...this.policies.values()]
      .filter(p => p.enabled)
      .sort((a, b) => b.priority - a.priority);

    const evaluatedPolicies: PolicyEvaluationResult['evaluatedPolicies'] = [];
    const requiresApproval: string[] = [];
    let denied = false;
    let deniedBy: string | null = null;
    let denialReason: string | null = null;
    let modifiedParams: Partial<PolicyContext> | null = null;

    for (const policy of sorted) {
      const triggered = policy.condition(context);
      evaluatedPolicies.push({
        id: policy.id,
        name: policy.name,
        triggered,
        action: policy.action,
        priority: policy.priority,
      });

      if (!triggered) continue;

      policy.triggerCount++;

      switch (policy.action) {
        case 'ALLOW':
          // Guardian override — immediately allow, skip remaining policies
          logger.info(`Policy ${policy.name} force-allows the operation`);
          return {
            allowed: true,
            deniedBy: null,
            denialReason: null,
            modifiedParams: null,
            evaluatedPolicies,
            requiresApproval: [],
            evaluatedAt: new Date().toISOString(),
            evaluationTimeMs: Date.now() - startTime,
          };

        case 'DENY':
          if (!denied) {
            denied = true;
            deniedBy = policy.id;
            denialReason = policy.description;
          }
          break;

        case 'REQUIRE_APPROVAL':
          requiresApproval.push(policy.id);
          break;

        case 'MODIFY':
          if (policy.modification) {
            const mods = policy.modification(context);
            modifiedParams = { ...(modifiedParams ?? {}), ...mods };
            logger.debug(`Policy ${policy.name} modifies params`, { modifications: mods });
          }
          break;
      }
    }

    const result: PolicyEvaluationResult = {
      allowed: !denied,
      deniedBy,
      denialReason,
      modifiedParams,
      evaluatedPolicies,
      requiresApproval,
      evaluatedAt: new Date().toISOString(),
      evaluationTimeMs: Date.now() - startTime,
    };

    logger.info('Policy evaluation complete', {
      allowed: result.allowed,
      deniedBy: result.deniedBy,
      policiesChecked: evaluatedPolicies.length,
      triggered: evaluatedPolicies.filter(p => p.triggered).length,
      timeMs: result.evaluationTimeMs,
    });

    return result;
  }

  // ── Policy Management ──────────────────────────────────────

  addPolicy(policy: Policy): void {
    this.policies.set(policy.id, policy);
    logger.info(`Policy added: ${policy.name} (${policy.id})`, { priority: policy.priority });
  }

  removePolicy(id: string): boolean {
    const removed = this.policies.delete(id);
    if (removed) logger.info(`Policy removed: ${id}`);
    return removed;
  }

  getPolicy(id: string): Policy | undefined {
    return this.policies.get(id);
  }

  updatePolicy(id: string, updates: Partial<Pick<Policy, 'enabled' | 'priority' | 'description'>>): boolean {
    const policy = this.policies.get(id);
    if (!policy) return false;
    if (updates.enabled !== undefined) policy.enabled = updates.enabled;
    if (updates.priority !== undefined) policy.priority = updates.priority;
    if (updates.description !== undefined) policy.description = updates.description;
    logger.info(`Policy updated: ${id}`, updates);
    return true;
  }

  listPolicies(): PolicySummary[] {
    return [...this.policies.values()]
      .sort((a, b) => b.priority - a.priority)
      .map(p => ({
        id: p.id,
        name: p.name,
        priority: p.priority,
        description: p.description,
        enabled: p.enabled,
        action: p.action,
        triggerCount: p.triggerCount,
        createdAt: p.createdAt,
      }));
  }

  /** Create a custom policy from API parameters (dynamic condition via simple rules). */
  createCustomPolicy(params: {
    id?: string;
    name: string;
    priority: number;
    description: string;
    action: PolicyAction;
    ruleType: 'max_amount' | 'min_balance' | 'chain_deny' | 'time_restrict' | 'custom';
    ruleValue: number | string | string[];
  }): Policy {
    const id = params.id ?? `custom-${randomUUID().slice(0, 8)}`;
    let condition: (ctx: PolicyContext) => boolean;

    switch (params.ruleType) {
      case 'max_amount':
        condition = (ctx) => ctx.amount > (params.ruleValue as number);
        break;
      case 'min_balance':
        condition = (ctx) => (ctx.totalBalance - ctx.amount) < (params.ruleValue as number);
        break;
      case 'chain_deny':
        condition = (ctx) => {
          const chains = Array.isArray(params.ruleValue) ? params.ruleValue : [params.ruleValue as string];
          return chains.includes(ctx.chain);
        };
        break;
      case 'time_restrict': {
        const hours = Array.isArray(params.ruleValue) ? params.ruleValue.map(Number) : [Number(params.ruleValue)];
        condition = (ctx) => hours.includes(ctx.hourOfDay);
        break;
      }
      default:
        condition = () => false;
    }

    const policy: Policy = {
      id,
      name: params.name,
      priority: params.priority,
      description: params.description,
      enabled: true,
      condition,
      action: params.action,
      triggerCount: 0,
      createdAt: new Date().toISOString(),
    };

    this.policies.set(id, policy);
    logger.info(`Custom policy created: ${params.name} (${id})`);
    return policy;
  }

  getStats(): {
    totalPolicies: number;
    activePolicies: number;
    disabledPolicies: number;
    totalTriggers: number;
    mostTriggered: { name: string; count: number } | null;
  } {
    const all = [...this.policies.values()];
    const active = all.filter(p => p.enabled);
    const totalTriggers = all.reduce((s, p) => s + p.triggerCount, 0);
    const mostTriggered = all.length > 0
      ? all.reduce((best, p) => p.triggerCount > best.triggerCount ? p : best, all[0])
      : null;

    return {
      totalPolicies: all.length,
      activePolicies: active.length,
      disabledPolicies: all.length - active.length,
      totalTriggers,
      mostTriggered: mostTriggered ? { name: mostTriggered.name, count: mostTriggered.triggerCount } : null,
    };
  }
}

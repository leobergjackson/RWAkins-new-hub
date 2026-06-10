// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Deterministic Policy Enforcement Layer
//
// Runs BEFORE any transaction, independent of LLM decisions.
// Enforces hard-coded and user-configurable policy rules that
// cannot be overridden by AI reasoning.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export interface PolicyRule {
  id: string;
  type: 'max_amount' | 'daily_cap' | 'recipient_whitelist' | 'recipient_blacklist' | 'category_limit' | 'frequency_limit' | 'chain_restriction';
  params: Record<string, unknown>;
  enabled: boolean;
  priority: number;  // lower = higher priority
}

export interface PolicyCheckResult {
  allowed: boolean;
  violations: Array<{ ruleId: string; type: string; message: string }>;
  appliedRules: string[];
}

export interface PolicyRuleStats {
  ruleId: string;
  type: string;
  enabled: boolean;
  blocked: number;
  allowed: number;
  lastTriggered?: string;
}

interface TransactionParams {
  recipient: string;
  amount: string;
  chain: string;
  token: string;
  category?: string;
}

// ── Persistence ────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_FILE = join(__dirname, '..', '..', '.policy-rules.json');

// ── Known scam / blocked addresses (for default blacklist) ────

const DEFAULT_BLOCKED_ADDRESSES = [
  '0x0000000000000000000000000000000000000000', // null address
  '0x000000000000000000000000000000000000dead', // burn address
];

// ── Default testnet chains ────────────────────────────────────

const DEFAULT_ALLOWED_CHAINS = [
  'ethereum-sepolia',
  'ethereum-sepolia-gasless',
  'ton-testnet',
  'ton-testnet-gasless',
  'tron-nile',
  'bitcoin-testnet',
  'solana-devnet',
  'plasma',
  'stable',
];

// ── Service ────────────────────────────────────────────────────

export class PolicyEnforcementService {
  private rules: PolicyRule[] = [];
  private ruleStats = new Map<string, { blocked: number; allowed: number; lastTriggered?: string }>();

  // Sliding window for frequency limiting
  private transactionTimestamps: number[] = [];

  // Daily spending tracker
  private dailySpent = 0;
  private dailyResetDate = new Date().toDateString();

  constructor() {
    this.load();

    // If no rules loaded, create defaults
    if (this.rules.length === 0) {
      this.seedDefaultRules();
    }

    logger.info('PolicyEnforcementService initialized', {
      ruleCount: this.rules.length,
      enabledCount: this.rules.filter(r => r.enabled).length,
    });
  }

  // ── Default Rules ──────────────────────────────────────────────

  private seedDefaultRules(): void {
    const defaults: PolicyRule[] = [
      {
        id: 'max-single-tx',
        type: 'max_amount',
        params: { maxAmount: 50 }, // 50 USDT
        enabled: true,
        priority: 1,
      },
      {
        id: 'daily-spending-cap',
        type: 'daily_cap',
        params: { dailyLimit: 200 }, // 200 USDT per day
        enabled: true,
        priority: 2,
      },
      {
        id: 'blocked-addresses',
        type: 'recipient_blacklist',
        params: { addresses: [...DEFAULT_BLOCKED_ADDRESSES] },
        enabled: true,
        priority: 0, // Highest priority — always check first
      },
      {
        id: 'frequency-limit',
        type: 'frequency_limit',
        params: { maxPerHour: 10 },
        enabled: true,
        priority: 3,
      },
      {
        id: 'chain-restriction',
        type: 'chain_restriction',
        params: { allowedChains: [...DEFAULT_ALLOWED_CHAINS] },
        enabled: true,
        priority: 4,
      },
    ];

    this.rules = defaults;
    // Initialize stats
    for (const rule of defaults) {
      this.ruleStats.set(rule.id, { blocked: 0, allowed: 0 });
    }
    this.save();
    logger.info('Seeded 5 default policy rules');
  }

  // ── Rule Management ────────────────────────────────────────────

  addRule(rule: PolicyRule): PolicyRule {
    // Validate uniqueness
    if (this.rules.find(r => r.id === rule.id)) {
      throw new Error(`Rule with id '${rule.id}' already exists`);
    }
    this.rules.push(rule);
    this.ruleStats.set(rule.id, { blocked: 0, allowed: 0 });
    // Keep sorted by priority
    this.rules.sort((a, b) => a.priority - b.priority);
    this.save();
    logger.info('Policy rule added', { id: rule.id, type: rule.type });
    return rule;
  }

  removeRule(id: string): boolean {
    const idx = this.rules.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.rules.splice(idx, 1);
    this.ruleStats.delete(id);
    this.save();
    logger.info('Policy rule removed', { id });
    return true;
  }

  updateRule(id: string, updates: Partial<Pick<PolicyRule, 'params' | 'enabled' | 'priority'>>): PolicyRule | undefined {
    const rule = this.rules.find(r => r.id === id);
    if (!rule) return undefined;

    if (updates.params !== undefined) rule.params = { ...rule.params, ...updates.params };
    if (updates.enabled !== undefined) rule.enabled = updates.enabled;
    if (updates.priority !== undefined) rule.priority = updates.priority;

    this.rules.sort((a, b) => a.priority - b.priority);
    this.save();
    logger.info('Policy rule updated', { id, updates });
    return rule;
  }

  listRules(): PolicyRule[] {
    return [...this.rules];
  }

  getRule(id: string): PolicyRule | undefined {
    return this.rules.find(r => r.id === id);
  }

  // ── Stats ──────────────────────────────────────────────────────

  getRuleStats(): PolicyRuleStats[] {
    return this.rules.map(r => {
      const stats = this.ruleStats.get(r.id) ?? { blocked: 0, allowed: 0 };
      return {
        ruleId: r.id,
        type: r.type,
        enabled: r.enabled,
        blocked: stats.blocked,
        allowed: stats.allowed,
        lastTriggered: stats.lastTriggered,
      };
    });
  }

  // ── Core: Transaction Policy Check ─────────────────────────────

  /**
   * Check a transaction against ALL enabled policy rules.
   * Returns whether the transaction is allowed and any violations.
   *
   * This is deterministic — no LLM involved.
   */
  checkTransaction(params: TransactionParams): PolicyCheckResult {
    const violations: PolicyCheckResult['violations'] = [];
    const appliedRules: string[] = [];

    // Reset daily counter if new day
    const today = new Date().toDateString();
    if (today !== this.dailyResetDate) {
      this.dailySpent = 0;
      this.dailyResetDate = today;
    }

    // Clean up old timestamps (keep last hour)
    const oneHourAgo = Date.now() - 3600_000;
    this.transactionTimestamps = this.transactionTimestamps.filter(ts => ts > oneHourAgo);

    const amount = parseFloat(params.amount) || 0;
    const recipientLower = params.recipient.toLowerCase();

    // Evaluate each enabled rule in priority order
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      appliedRules.push(rule.id);

      const stats = this.ruleStats.get(rule.id) ?? { blocked: 0, allowed: 0 };

      switch (rule.type) {
        case 'max_amount': {
          const maxAmount = Number(rule.params.maxAmount ?? 50);
          if (amount > maxAmount) {
            violations.push({
              ruleId: rule.id,
              type: rule.type,
              message: `Transaction amount ${amount} exceeds maximum ${maxAmount}`,
            });
            stats.blocked++;
            stats.lastTriggered = new Date().toISOString();
          } else {
            stats.allowed++;
          }
          break;
        }

        case 'daily_cap': {
          const dailyLimit = Number(rule.params.dailyLimit ?? 200);
          if (this.dailySpent + amount > dailyLimit) {
            violations.push({
              ruleId: rule.id,
              type: rule.type,
              message: `Daily spending would reach ${(this.dailySpent + amount).toFixed(2)}, exceeding cap of ${dailyLimit}`,
            });
            stats.blocked++;
            stats.lastTriggered = new Date().toISOString();
          } else {
            stats.allowed++;
          }
          break;
        }

        case 'recipient_blacklist': {
          const blocked = (rule.params.addresses as string[] ?? []).map(a => a.toLowerCase());
          if (blocked.includes(recipientLower)) {
            violations.push({
              ruleId: rule.id,
              type: rule.type,
              message: `Recipient ${params.recipient} is on the blocked addresses list`,
            });
            stats.blocked++;
            stats.lastTriggered = new Date().toISOString();
          } else {
            stats.allowed++;
          }
          break;
        }

        case 'recipient_whitelist': {
          const allowed = (rule.params.addresses as string[] ?? []).map(a => a.toLowerCase());
          if (allowed.length > 0 && !allowed.includes(recipientLower)) {
            violations.push({
              ruleId: rule.id,
              type: rule.type,
              message: `Recipient ${params.recipient} is not on the whitelist`,
            });
            stats.blocked++;
            stats.lastTriggered = new Date().toISOString();
          } else {
            stats.allowed++;
          }
          break;
        }

        case 'category_limit': {
          if (params.category) {
            const limits = rule.params.limits as Record<string, number> ?? {};
            const catLimit = limits[params.category];
            if (catLimit !== undefined && amount > catLimit) {
              violations.push({
                ruleId: rule.id,
                type: rule.type,
                message: `Amount ${amount} exceeds category '${params.category}' limit of ${catLimit}`,
              });
              stats.blocked++;
              stats.lastTriggered = new Date().toISOString();
            } else {
              stats.allowed++;
            }
          } else {
            stats.allowed++;
          }
          break;
        }

        case 'frequency_limit': {
          const maxPerHour = Number(rule.params.maxPerHour ?? 10);
          if (this.transactionTimestamps.length >= maxPerHour) {
            violations.push({
              ruleId: rule.id,
              type: rule.type,
              message: `Frequency limit reached: ${this.transactionTimestamps.length} transactions in the last hour (max ${maxPerHour})`,
            });
            stats.blocked++;
            stats.lastTriggered = new Date().toISOString();
          } else {
            stats.allowed++;
          }
          break;
        }

        case 'chain_restriction': {
          const allowedChains = (rule.params.allowedChains as string[]) ?? [];
          if (allowedChains.length > 0 && !allowedChains.includes(params.chain)) {
            violations.push({
              ruleId: rule.id,
              type: rule.type,
              message: `Chain '${params.chain}' is not in the allowed chains list`,
            });
            stats.blocked++;
            stats.lastTriggered = new Date().toISOString();
          } else {
            stats.allowed++;
          }
          break;
        }

        default:
          // Unknown rule type — skip
          break;
      }

      this.ruleStats.set(rule.id, stats);
    }

    const allowed = violations.length === 0;

    // If allowed, record the transaction for frequency/daily tracking
    if (allowed) {
      this.transactionTimestamps.push(Date.now());
      this.dailySpent += amount;
    }

    if (!allowed) {
      logger.warn('Policy enforcement BLOCKED transaction', {
        recipient: params.recipient.slice(0, 16),
        amount: params.amount,
        chain: params.chain,
        violationCount: violations.length,
        violations: violations.map(v => v.message),
      });
    }

    return { allowed, violations, appliedRules };
  }

  // ── Persistence ────────────────────────────────────────────────

  private load(): void {
    try {
      if (existsSync(RULES_FILE)) {
        const data = JSON.parse(readFileSync(RULES_FILE, 'utf-8'));
        this.rules = data.rules ?? [];
        // Restore stats
        if (data.stats) {
          for (const [id, s] of Object.entries(data.stats)) {
            this.ruleStats.set(id, s as { blocked: number; allowed: number; lastTriggered?: string });
          }
        }
        // Sort by priority
        this.rules.sort((a, b) => a.priority - b.priority);
      }
    } catch {
      logger.warn('Could not load policy rules, starting fresh');
    }
  }

  private save(): void {
    try {
      const stats: Record<string, { blocked: number; allowed: number; lastTriggered?: string }> = {};
      for (const [id, s] of this.ruleStats.entries()) {
        stats[id] = s;
      }
      writeFileSync(RULES_FILE, JSON.stringify({ rules: this.rules, stats }, null, 2));
    } catch (err) {
      logger.error('Failed to save policy rules', { error: String(err) });
    }
  }
}

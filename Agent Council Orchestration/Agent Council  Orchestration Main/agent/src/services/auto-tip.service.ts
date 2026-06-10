// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Auto-Tip Standing Orders Service
//
// Persistent auto-tip rules that evaluate creators against configurable
// criteria (engagement score, name pattern, tier) and generate tip candidates.
// Inspired by TetherPulse's standing order system.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export interface AutoTipRule {
  id: string;
  /** Regex pattern or exact creator name to match */
  creatorPattern: string;
  /** Minimum engagement score to trigger (0-100) */
  minEngagementScore: number;
  /** Tip amount in USDT */
  amount: number;
  /** Target chain */
  chain: 'ethereum' | 'polygon' | 'ton' | 'ethereum-sepolia';
  /** Max daily spend for this rule */
  maxDailySpend: number;
  /** Whether the rule is active */
  enabled: boolean;
  /** Human-readable description */
  description: string;
  /** Created timestamp */
  createdAt: string;
}

export interface TipCandidate {
  ruleId: string;
  ruleDescription: string;
  creatorName: string;
  amount: number;
  chain: string;
  reason: string;
}

export interface AutoTipExecution {
  id: string;
  ruleId: string;
  creatorName: string;
  amount: number;
  chain: string;
  executedAt: string;
  success: boolean;
  txHash?: string;
  error?: string;
}

// ── Data path ──────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', '..', 'data');
const RULES_FILE = join(DATA_DIR, 'auto-tip-rules.json');

// ── Service ────────────────────────────────────────────────────

/**
 * AutoTipService — persistent standing orders for automatic tipping.
 *
 * Each rule defines:
 * - A creator pattern (regex or name) to match
 * - Minimum engagement score threshold
 * - Tip amount and chain
 * - Maximum daily spend cap
 *
 * The evaluateCreators() method checks all active rules against a list
 * of creators and returns tip candidates ready for execution.
 */
export class AutoTipService {
  private rules: AutoTipRule[] = [];
  private executionHistory: AutoTipExecution[] = [];
  private maxHistorySize = 200;
  private dailySpend: Record<string, number> = {}; // ruleId -> today's spend
  private lastResetDate: string = new Date().toISOString().slice(0, 10);

  constructor() {
    this.loadRules();
    if (this.rules.length === 0) {
      this.seedDemoRules();
    }
  }

  // ── CRUD ───────────────────────────────────────────────────

  createRule(input: Omit<AutoTipRule, 'id' | 'createdAt'>): AutoTipRule {
    const rule: AutoTipRule = {
      ...input,
      id: randomUUID().slice(0, 8),
      createdAt: new Date().toISOString(),
    };
    this.rules.push(rule);
    this.persistRules();
    logger.info(`[AutoTip] Created rule ${rule.id}: ${rule.description}`);
    return rule;
  }

  getRules(): AutoTipRule[] {
    return [...this.rules];
  }

  deleteRule(id: string): boolean {
    const idx = this.rules.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    const removed = this.rules.splice(idx, 1)[0];
    this.persistRules();
    logger.info(`[AutoTip] Deleted rule ${removed.id}: ${removed.description}`);
    return true;
  }

  // ── Evaluation ─────────────────────────────────────────────

  /**
   * Evaluate a list of creators against all active rules.
   * Returns tip candidates (rules that match at least one creator).
   */
  evaluateCreators(creators: Array<{ name: string; engagementScore: number }>): TipCandidate[] {
    this.resetDailySpendIfNeeded();
    const candidates: TipCandidate[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const todaySpend = this.dailySpend[rule.id] || 0;
      if (todaySpend >= rule.maxDailySpend) continue;

      for (const creator of creators) {
        // Match by pattern (regex or exact)
        let matches = false;
        try {
          const regex = new RegExp(rule.creatorPattern, 'i');
          matches = regex.test(creator.name);
        } catch {
          matches = creator.name.toLowerCase().includes(rule.creatorPattern.toLowerCase());
        }

        if (!matches) continue;
        if (creator.engagementScore < rule.minEngagementScore) continue;

        // Check remaining daily budget
        const remainingBudget = rule.maxDailySpend - todaySpend;
        const tipAmount = Math.min(rule.amount, remainingBudget);
        if (tipAmount <= 0) continue;

        candidates.push({
          ruleId: rule.id,
          ruleDescription: rule.description,
          creatorName: creator.name,
          amount: tipAmount,
          chain: rule.chain,
          reason: `Matched pattern "${rule.creatorPattern}", engagement ${creator.engagementScore} >= ${rule.minEngagementScore}`,
        });
      }
    }

    logger.info(`[AutoTip] Evaluated ${creators.length} creators against ${this.rules.length} rules => ${candidates.length} candidates`);
    return candidates;
  }

  /**
   * Record an execution (for history tracking).
   */
  recordExecution(exec: Omit<AutoTipExecution, 'id' | 'executedAt'>): AutoTipExecution {
    const execution: AutoTipExecution = {
      ...exec,
      id: randomUUID().slice(0, 8),
      executedAt: new Date().toISOString(),
    };
    this.executionHistory.unshift(execution);
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(0, this.maxHistorySize);
    }

    // Track daily spend
    if (exec.success) {
      this.dailySpend[exec.ruleId] = (this.dailySpend[exec.ruleId] || 0) + exec.amount;
    }

    return execution;
  }

  getExecutionHistory(): AutoTipExecution[] {
    return [...this.executionHistory];
  }

  // ── Persistence ────────────────────────────────────────────

  private loadRules(): void {
    try {
      if (existsSync(RULES_FILE)) {
        const data = readFileSync(RULES_FILE, 'utf-8');
        this.rules = JSON.parse(data);
        logger.info(`[AutoTip] Loaded ${this.rules.length} rules from disk`);
      }
    } catch (err) {
      logger.warn(`[AutoTip] Failed to load rules: ${err instanceof Error ? err.message : String(err)}`);
      this.rules = [];
    }
  }

  private persistRules(): void {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }
      writeFileSync(RULES_FILE, JSON.stringify(this.rules, null, 2), 'utf-8');
    } catch (err) {
      logger.warn(`[AutoTip] Failed to persist rules: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private resetDailySpendIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.lastResetDate) {
      this.dailySpend = {};
      this.lastResetDate = today;
    }
  }

  // ── Demo Seeding ───────────────────────────────────────────

  private seedDemoRules(): void {
    const demoRules: Array<Omit<AutoTipRule, 'id' | 'createdAt'>> = [
      {
        creatorPattern: '.*',
        minEngagementScore: 95,
        amount: 2.00,
        chain: 'ethereum-sepolia',
        maxDailySpend: 10,
        enabled: true,
        description: 'Auto-tip Diamond tier creators $2 on Ethereum',
      },
      {
        creatorPattern: '.*',
        minEngagementScore: 85,
        amount: 1.00,
        chain: 'polygon',
        maxDailySpend: 5,
        enabled: true,
        description: 'Auto-tip any creator with engagement > 85 $1 on Polygon',
      },
      {
        creatorPattern: 'Bongino',
        minEngagementScore: 0,
        amount: 0.50,
        chain: 'ton',
        maxDailySpend: 0.50,
        enabled: true,
        description: 'Auto-tip @Bongino $0.50 daily on TON',
      },
    ];

    for (const rule of demoRules) {
      this.createRule(rule);
    }
    logger.info(`[AutoTip] Seeded ${demoRules.length} demo rules`);
  }
}

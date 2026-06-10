// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — LLM Cost Tracker Service
// Tracks per-call costs, recommends cheapest viable model, enforces daily budgets.

import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export type TrackedModel =
  | 'groq-llama3'
  | 'gemini-flash'
  | 'claude-haiku'
  | 'claude-sonnet'
  | 'rule-based';

export interface LLMCallRecord {
  model: TrackedModel;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: string;
}

export interface ModelCostStats {
  model: TrackedModel;
  callCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  avgCostPerCall: number;
}

export interface CostBreakdown {
  totalCost: number;
  totalCalls: number;
  todayCost: number;
  todayCalls: number;
  models: ModelCostStats[];
  topModel: string;
  cheapestModel: string;
}

export interface ModelRecommendation {
  recommended: TrackedModel;
  reason: string;
  dailyBudget: number;
  budgetRemaining: number;
  todaySpent: number;
}

// ── Cost Table ─────────────────────────────────────────────────

/** Per-1K-token pricing (input / output). Free models cost 0. */
const MODEL_PRICING: Record<TrackedModel, { inputPer1k: number; outputPer1k: number }> = {
  'groq-llama3':    { inputPer1k: 0.0000, outputPer1k: 0.0000 },   // free
  'gemini-flash':   { inputPer1k: 0.0000, outputPer1k: 0.0000 },   // free tier
  'claude-haiku':   { inputPer1k: 0.00025, outputPer1k: 0.00125 }, // ~$0.0025/call avg
  'claude-sonnet':  { inputPer1k: 0.003, outputPer1k: 0.015 },     // ~$0.015/call avg
  'rule-based':     { inputPer1k: 0.0000, outputPer1k: 0.0000 },   // no LLM
};

// ── Service ────────────────────────────────────────────────────

/**
 * LLMCostTrackerService — tracks spend per LLM call and recommends
 * the cheapest viable model for a given daily budget.
 *
 * Integrates with AIService's provider chain: Groq → Gemini → rule-based,
 * with optional Anthropic models for premium reasoning.
 */
export class LLMCostTrackerService {
  private records: LLMCallRecord[] = [];
  private readonly maxRecords = 5000;

  /**
   * Log an LLM call with token counts. Cost is computed from the pricing table.
   */
  trackCall(model: TrackedModel, inputTokens: number, outputTokens: number): LLMCallRecord {
    const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['rule-based'];
    const cost =
      (inputTokens / 1000) * pricing.inputPer1k +
      (outputTokens / 1000) * pricing.outputPer1k;

    const record: LLMCallRecord = {
      model,
      inputTokens,
      outputTokens,
      cost,
      timestamp: new Date().toISOString(),
    };

    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    if (cost > 0) {
      logger.debug('LLM cost tracked', { model, inputTokens, outputTokens, cost: cost.toFixed(6) });
    }

    return record;
  }

  /**
   * Cumulative total LLM spend across all time.
   */
  getTotalSpent(): number {
    return this.records.reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Amount spent today (UTC day boundary).
   */
  getTodaySpent(): number {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const cutoff = todayStart.toISOString();
    return this.records
      .filter(r => r.timestamp >= cutoff)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * How much budget is left today.
   */
  getBudgetRemaining(dailyBudget: number): number {
    return Math.max(0, dailyBudget - this.getTodaySpent());
  }

  /**
   * Recommend the cheapest viable model for the given daily budget.
   *
   * Tiers:
   *   budget > $1/day    → Claude Sonnet (best reasoning)
   *   $0.10 – $1/day     → Claude Haiku (good reasoning, lower cost)
   *   $0.01 – $0.10/day  → Groq Llama 3 (free, fast)
   *   $0/day             → rule-based fallback (no LLM at all)
   */
  recommendModel(dailyBudget: number): ModelRecommendation {
    const todaySpent = this.getTodaySpent();
    const remaining = Math.max(0, dailyBudget - todaySpent);

    let recommended: TrackedModel;
    let reason: string;

    if (remaining <= 0 && dailyBudget > 0) {
      recommended = 'groq-llama3';
      reason = 'Daily budget exhausted — falling back to free Groq Llama 3';
    } else if (dailyBudget > 1.0) {
      recommended = 'claude-sonnet';
      reason = 'Budget allows premium reasoning with Claude Sonnet';
    } else if (dailyBudget >= 0.10) {
      recommended = 'claude-haiku';
      reason = 'Moderate budget — using Claude Haiku for cost-effective reasoning';
    } else if (dailyBudget > 0) {
      recommended = 'groq-llama3';
      reason = 'Low budget — using free Groq Llama 3';
    } else {
      recommended = 'rule-based';
      reason = 'Zero budget — using rule-based fallback (no LLM calls)';
    }

    return {
      recommended,
      reason,
      dailyBudget,
      budgetRemaining: remaining,
      todaySpent,
    };
  }

  /**
   * Full cost breakdown per model with aggregate stats.
   */
  getCostBreakdown(): CostBreakdown {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const cutoff = todayStart.toISOString();
    const todayRecords = this.records.filter(r => r.timestamp >= cutoff);

    const modelMap = new Map<TrackedModel, ModelCostStats>();

    for (const r of this.records) {
      let entry = modelMap.get(r.model);
      if (!entry) {
        entry = {
          model: r.model,
          callCount: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0,
          avgCostPerCall: 0,
        };
        modelMap.set(r.model, entry);
      }
      entry.callCount++;
      entry.totalInputTokens += r.inputTokens;
      entry.totalOutputTokens += r.outputTokens;
      entry.totalCost += r.cost;
    }

    const models = Array.from(modelMap.values()).map(m => ({
      ...m,
      avgCostPerCall: m.callCount > 0 ? m.totalCost / m.callCount : 0,
    }));

    // Sort by total cost descending
    models.sort((a, b) => b.totalCost - a.totalCost);

    const totalCost = this.getTotalSpent();
    const topModel = models.length > 0 ? models[0].model : 'none';
    const cheapestModel = models.length > 0
      ? models.reduce((min, m) => m.avgCostPerCall < min.avgCostPerCall ? m : min).model
      : 'rule-based';

    return {
      totalCost,
      totalCalls: this.records.length,
      todayCost: todayRecords.reduce((s, r) => s + r.cost, 0),
      todayCalls: todayRecords.length,
      models,
      topModel,
      cheapestModel,
    };
  }

  /**
   * Get raw records (for debugging / export).
   */
  getRecentRecords(limit = 50): LLMCallRecord[] {
    return this.records.slice(-limit);
  }

  /**
   * Reset all tracking data.
   */
  reset(): void {
    this.records = [];
  }
}

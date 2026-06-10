// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — LLM Cost Tracking API Routes

import { Router } from 'express';
import type { LLMCostTrackerService } from '../services/llm-cost-tracker.service.js';
import { logger } from '../utils/logger.js';

// WDK type imports for LLM cost budgeting against wallet balance via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
// LLM cost recommendations factor in WDK wallet balance to determine affordable model tier
export type _WdkRefs = WDK; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register LLM cost tracking endpoints.
 *
 * GET /api/llm/costs     — full cost breakdown per model
 * GET /api/llm/recommend — recommended model for current budget
 */
export function registerLLMRoutes(
  router: Router,
  costTracker: LLMCostTrackerService,
): void {
  // GET /api/llm/costs — cost breakdown
  router.get('/llm/costs', (_req, res) => {
    try {
      const breakdown = costTracker.getCostBreakdown();
      res.json({ ok: true, ...breakdown });
    } catch (err) {
      logger.error('LLM cost breakdown error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to compute LLM cost breakdown' });
    }
  });

  // GET /api/llm/recommend?budget=0.50 — recommended model for budget
  router.get('/llm/recommend', (req, res) => {
    try {
      const budgetParam = typeof req.query.budget === 'string'
        ? parseFloat(req.query.budget)
        : parseFloat(process.env.LLM_DAILY_BUDGET ?? '0');
      const dailyBudget = isNaN(budgetParam) ? 0 : budgetParam;

      const recommendation = costTracker.recommendModel(dailyBudget);
      res.json({ ok: true, ...recommendation });
    } catch (err) {
      logger.error('LLM recommend error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to compute model recommendation' });
    }
  });

  // GET /api/llm/records?limit=20 — recent raw records
  router.get('/llm/records', (req, res) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
      const records = costTracker.getRecentRecords(limit);
      res.json({ ok: true, records, count: records.length });
    } catch (err) {
      logger.error('LLM records error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to fetch LLM records' });
    }
  });

  logger.info('LLM cost tracking routes mounted at /api/llm/*');
}

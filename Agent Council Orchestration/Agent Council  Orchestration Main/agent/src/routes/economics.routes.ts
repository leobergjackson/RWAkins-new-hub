// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Economics API routes: P&L, fees, sustainability, runway

import { Router } from 'express';
import type { ProfitLossEngine } from '../economics/profit-loss-engine.js';
import type { FeeModel, OperationType } from '../economics/fee-model.js';
import type { SustainabilityAnalyzer } from '../economics/sustainability-analyzer.js';

export interface EconomicsDeps {
  pnlEngine: ProfitLossEngine;
  feeModel: FeeModel;
  sustainabilityAnalyzer: SustainabilityAnalyzer;
}

/**
 * Register economics routes onto the given Express router.
 *
 * Endpoints:
 *   GET /api/economics/pnl           — full P&L report (optional ?period=day|week|month)
 *   GET /api/economics/income         — income breakdown
 *   GET /api/economics/expenses       — expense breakdown
 *   GET /api/economics/sustainability — sustainability analysis
 *   GET /api/economics/roi            — return on investment
 *   GET /api/economics/runway         — days until funds depleted
 *   GET /api/economics/fee-estimate   — cost estimate for an operation
 *   GET /api/economics/ledger         — raw ledger entries
 *   GET /api/economics/chains         — supported chains with gas costs
 *   GET /api/economics/cheapest       — cheapest chain for an operation
 */
export function registerEconomicsRoutes(
  router: Router,
  deps: EconomicsDeps,
): void {
  const { pnlEngine, feeModel, sustainabilityAnalyzer } = deps;

  // ── GET /economics/pnl ─────────────────────────────────────────
  router.get('/economics/pnl', (_req, res) => {
    try {
      const period = _req.query.period as 'day' | 'week' | 'month' | undefined;
      const validPeriods = ['day', 'week', 'month', undefined];
      if (!validPeriods.includes(period)) {
        res.status(400).json({ error: 'Invalid period. Use: day, week, month' });
        return;
      }
      const report = pnlEngine.getNetPnL(period);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: errMsg(err) });
    }
  });

  // ── GET /economics/income ──────────────────────────────────────
  router.get('/economics/income', (_req, res) => {
    try {
      res.json(pnlEngine.getIncomeBreakdown());
    } catch (err) {
      res.status(500).json({ error: errMsg(err) });
    }
  });

  // ── GET /economics/expenses ────────────────────────────────────
  router.get('/economics/expenses', (_req, res) => {
    try {
      res.json(pnlEngine.getExpenseBreakdown());
    } catch (err) {
      res.status(500).json({ error: errMsg(err) });
    }
  });

  // ── GET /economics/sustainability ──────────────────────────────
  router.get('/economics/sustainability', (_req, res) => {
    try {
      res.json(sustainabilityAnalyzer.analyze());
    } catch (err) {
      res.status(500).json({ error: errMsg(err) });
    }
  });

  // ── GET /economics/roi ─────────────────────────────────────────
  router.get('/economics/roi', (_req, res) => {
    try {
      const roi = pnlEngine.getROI();
      const pnl = pnlEngine.getNetPnL();
      res.json({
        roi,
        totalIncome: pnl.totalIncome,
        totalExpenses: pnl.totalExpenses,
        netPnL: pnl.netPnL,
        deployedCapital: pnlEngine.getTotalDeployed(),
        interpretation: roi >= 0
          ? `Positive ROI of ${roi}% — agent operations are profitable`
          : `Negative ROI of ${roi}% — tipping bot is a service, not a profit center (this is expected and honest)`,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: errMsg(err) });
    }
  });

  // ── GET /economics/runway ──────────────────────────────────────
  router.get('/economics/runway', (_req, res) => {
    try {
      res.json(sustainabilityAnalyzer.getRunway());
    } catch (err) {
      res.status(500).json({ error: errMsg(err) });
    }
  });

  // ── GET /economics/fee-estimate ────────────────────────────────
  router.get('/economics/fee-estimate', (req, res) => {
    try {
      const operation = req.query.operation as string;
      const chain = (req.query.chain as string) ?? 'ethereum';
      const amount = parseFloat(req.query.amount as string) || 1;
      const protocol = req.query.protocol as string | undefined;
      const llmModel = req.query.llmModel as string | undefined;

      const validOps = ['tip', 'swap', 'bridge', 'yield_deposit', 'yield_withdraw', 'contract_call', 'llm_decision'];
      if (!operation || !validOps.includes(operation)) {
        res.status(400).json({
          error: `Invalid operation. Use: ${validOps.join(', ')}`,
        });
        return;
      }

      const breakdown = feeModel.calculateTotalCost(
        operation as OperationType,
        chain,
        amount,
        protocol,
        llmModel,
      );
      res.json(breakdown);
    } catch (err) {
      res.status(500).json({ error: errMsg(err) });
    }
  });

  // ── GET /economics/ledger ──────────────────────────────────────
  router.get('/economics/ledger', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const entries = pnlEngine.getEntries(limit);
      res.json({
        entries,
        total: pnlEngine.getEntryCount(),
        showing: entries.length,
      });
    } catch (err) {
      res.status(500).json({ error: errMsg(err) });
    }
  });

  // ── GET /economics/chains ──────────────────────────────────────
  router.get('/economics/chains', (_req, res) => {
    try {
      res.json({
        chains: feeModel.getSupportedChains(),
        protocols: feeModel.getProtocolFees(),
        llmModels: feeModel.getLLMCosts(),
      });
    } catch (err) {
      res.status(500).json({ error: errMsg(err) });
    }
  });

  // ── GET /economics/cheapest ────────────────────────────────────
  router.get('/economics/cheapest', (req, res) => {
    try {
      const operation = (req.query.operation as string) ?? 'tip';
      const amount = parseFloat(req.query.amount as string) || 2;
      const validOps = ['tip', 'swap', 'bridge', 'yield_deposit', 'yield_withdraw', 'contract_call'];
      if (!validOps.includes(operation)) {
        res.status(400).json({ error: `Invalid operation. Use: ${validOps.join(', ')}` });
        return;
      }
      const ranked = feeModel.findCheapestChain(operation as OperationType, amount);
      res.json({
        operation,
        amount,
        cheapest: ranked[0],
        allChains: ranked,
      });
    } catch (err) {
      res.status(500).json({ error: errMsg(err) });
    }
  });
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

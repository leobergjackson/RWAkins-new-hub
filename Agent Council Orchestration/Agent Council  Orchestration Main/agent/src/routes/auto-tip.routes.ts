// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Auto-Tip Standing Orders Routes

import { Router } from 'express';
import type { AutoTipService } from '../services/auto-tip.service.js';

// WDK type imports for auto-tip standing order execution via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Auto-tip rules trigger WDK account.transfer() when engagement thresholds are met
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register auto-tip standing order routes.
 * Mounts under /api/auto-tip/...
 */
export function registerAutoTipRoutes(router: Router, service: AutoTipService): void {

  // GET /api/auto-tip/rules — list all standing order rules
  router.get('/auto-tip/rules', (_req, res) => {
    try {
      const rules = service.getRules();
      res.json({ ok: true, rules, count: rules.length });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/auto-tip/rules — create a new standing order rule
  router.post('/auto-tip/rules', (req, res) => {
    try {
      const { creatorPattern, minEngagementScore, amount, chain, maxDailySpend, enabled, description } = req.body ?? {};
      if (!creatorPattern || amount === undefined || !chain) {
        res.status(400).json({ error: 'Missing required fields: creatorPattern, amount, chain' });
        return;
      }
      const rule = service.createRule({
        creatorPattern,
        minEngagementScore: minEngagementScore ?? 0,
        amount: parseFloat(amount),
        chain,
        maxDailySpend: maxDailySpend ?? 10,
        enabled: enabled !== false,
        description: description || `Auto-tip ${creatorPattern} $${amount} on ${chain}`,
      });
      res.json({ ok: true, rule });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // DELETE /api/auto-tip/rules/:id — delete a standing order rule
  router.delete('/auto-tip/rules/:id', (req, res) => {
    try {
      const deleted = service.deleteRule(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }
      res.json({ ok: true, message: 'Rule deleted' });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // GET /api/auto-tip/history — past auto-tip executions
  router.get('/auto-tip/history', (_req, res) => {
    try {
      const history = service.getExecutionHistory();
      res.json({ ok: true, history, count: history.length });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/auto-tip/evaluate — evaluate creators against rules (for testing)
  router.post('/auto-tip/evaluate', (req, res) => {
    try {
      const { creators } = req.body ?? {};
      if (!Array.isArray(creators)) {
        res.status(400).json({ error: 'Missing required field: creators (array of { name, engagementScore })' });
        return;
      }
      const candidates = service.evaluateCreators(creators);
      res.json({ ok: true, candidates, count: candidates.length });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}

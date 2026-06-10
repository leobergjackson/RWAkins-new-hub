// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Policy Enforcement API Routes

import { Router } from 'express';
import type { PolicyEnforcementService, PolicyRule } from '../services/policy-enforcement.service.js';
import { logger } from '../utils/logger.js';

// WDK type imports for policy enforcement on wallet operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Policies gate WDK account.transfer() calls with configurable rules and limits
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

export function registerPolicyRoutes(
  router: Router,
  policyService: PolicyEnforcementService,
): void {
  // GET /api/policies/rules — list all rules
  router.get('/policies/rules', (_req, res) => {
    res.json({ rules: policyService.listRules() });
  });

  // POST /api/policies/rules — add a new rule
  router.post('/policies/rules', (req, res) => {
    try {
      const { id, type, params, enabled, priority } = req.body ?? {};
      if (!id || !type) {
        res.status(400).json({ error: 'Missing required fields: id, type' });
        return;
      }
      const rule: PolicyRule = {
        id,
        type,
        params: params ?? {},
        enabled: enabled ?? true,
        priority: priority ?? 99,
      };
      const created = policyService.addRule(rule);
      res.status(201).json({ ok: true, rule: created });
    } catch (err) {
      logger.error('Policy add rule error', { error: err instanceof Error ? err.message : String(err) });
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // DELETE /api/policies/rules/:id — remove a rule
  router.delete('/policies/rules/:id', (req, res) => {
    const removed = policyService.removeRule(req.params.id);
    if (!removed) {
      res.status(404).json({ error: `Rule '${req.params.id}' not found` });
      return;
    }
    res.json({ ok: true, removed: req.params.id });
  });

  // PATCH /api/policies/rules/:id — update a rule
  router.patch('/policies/rules/:id', (req, res) => {
    const { params, enabled, priority } = req.body ?? {};
    const updated = policyService.updateRule(req.params.id, { params, enabled, priority });
    if (!updated) {
      res.status(404).json({ error: `Rule '${req.params.id}' not found` });
      return;
    }
    res.json({ ok: true, rule: updated });
  });

  // POST /api/policies/check — test a transaction against rules
  router.post('/policies/check', (req, res) => {
    const { recipient, amount, chain, token, category } = req.body ?? {};
    if (!recipient || !amount || !chain || !token) {
      res.status(400).json({ error: 'Missing required fields: recipient, amount, chain, token' });
      return;
    }
    const result = policyService.checkTransaction({ recipient, amount, chain, token, category });
    res.json(result);
  });

  // GET /api/policies/stats — rule enforcement statistics
  router.get('/policies/stats', (_req, res) => {
    res.json({ stats: policyService.getRuleStats() });
  });
}

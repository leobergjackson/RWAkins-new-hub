// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Policy Engine API Routes — composable rules governing all agent behavior.

import { Router } from 'express';
import type { PolicyEngine, PolicyAction, PolicyContext } from '../policies/policy-engine.js';
import { logger } from '../utils/logger.js';

export function registerPolicyEngineRoutes(
  router: Router,
  policyEngine: PolicyEngine,
): void {
  // GET /api/policies — list all policies with status
  router.get('/policy-engine/policies', (_req, res) => {
    res.json({ ok: true, policies: policyEngine.listPolicies() });
  });

  // GET /api/policies/stats — policy engine statistics
  router.get('/policy-engine/stats', (_req, res) => {
    res.json({ ok: true, ...policyEngine.getStats() });
  });

  // GET /api/policies/:id — get a specific policy
  router.get('/policy-engine/policies/:id', (req, res) => {
    const policy = policyEngine.getPolicy(req.params.id);
    if (!policy) { res.status(404).json({ error: 'Policy not found' }); return; }
    res.json({
      ok: true,
      policy: {
        id: policy.id,
        name: policy.name,
        priority: policy.priority,
        description: policy.description,
        enabled: policy.enabled,
        action: policy.action,
        triggerCount: policy.triggerCount,
        createdAt: policy.createdAt,
      },
    });
  });

  // POST /api/policies — add custom policy
  router.post('/policy-engine/policies', (req, res) => {
    try {
      const { id, name, priority, description, action, ruleType, ruleValue } = req.body ?? {};
      if (!name || !ruleType) {
        res.status(400).json({ error: 'Missing required fields: name, ruleType' });
        return;
      }
      const policy = policyEngine.createCustomPolicy({
        id,
        name,
        priority: priority ?? 50,
        description: description ?? `Custom policy: ${name}`,
        action: (action ?? 'DENY') as PolicyAction,
        ruleType,
        ruleValue: ruleValue ?? 0,
      });
      res.status(201).json({
        ok: true,
        policy: {
          id: policy.id,
          name: policy.name,
          priority: policy.priority,
          description: policy.description,
          enabled: policy.enabled,
          action: policy.action,
        },
      });
    } catch (err) {
      logger.error('Create policy error', { error: err instanceof Error ? err.message : String(err) });
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // PUT /api/policies/:id — update policy (enable/disable, priority, description)
  router.put('/policy-engine/policies/:id', (req, res) => {
    const { enabled, priority, description } = req.body ?? {};
    const updated = policyEngine.updatePolicy(req.params.id, { enabled, priority, description });
    if (!updated) { res.status(404).json({ error: 'Policy not found' }); return; }
    res.json({ ok: true, updated: true });
  });

  // DELETE /api/policies/:id — remove a policy
  router.delete('/policy-engine/policies/:id', (req, res) => {
    const removed = policyEngine.removePolicy(req.params.id);
    if (!removed) { res.status(404).json({ error: 'Policy not found' }); return; }
    res.json({ ok: true, removed: true });
  });

  // POST /api/policies/evaluate — test a context against all policies
  router.post('/policy-engine/evaluate', (req, res) => {
    try {
      const ctx = req.body as Partial<PolicyContext>;
      if (!ctx.operationType || ctx.amount === undefined) {
        res.status(400).json({ error: 'Missing required context fields: operationType, amount' });
        return;
      }
      // Fill defaults for missing fields
      const fullContext: PolicyContext = {
        operationType: ctx.operationType!,
        amount: ctx.amount!,
        chain: ctx.chain ?? 'ethereum',
        recipient: ctx.recipient ?? 'unknown',
        gasCostUsd: ctx.gasCostUsd ?? 0.10,
        agentId: ctx.agentId ?? 'test-agent',
        totalBalance: ctx.totalBalance ?? 1000,
        dailySpent: ctx.dailySpent ?? 0,
        tipsLastHour: ctx.tipsLastHour ?? 0,
        creatorEngagement: ctx.creatorEngagement ?? 0.5,
        isNewCreator: ctx.isNewCreator ?? false,
        hourOfDay: ctx.hourOfDay ?? new Date().getHours(),
        metadata: ctx.metadata ?? {},
      };

      const result = policyEngine.evaluate(fullContext);
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error('Policy evaluate error', { error: err instanceof Error ? err.message : String(err) });
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  logger.info('Policy engine routes mounted at /api/policy-engine/*');
}

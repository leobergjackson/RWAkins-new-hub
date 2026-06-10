// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Payments route handlers (extracted from api.ts)
// Covers: Subscriptions, Conditional Payments, AI intelligence endpoints

import { Router } from 'express';
import type { AutoPaymentsService } from '../services/auto-payments.service.js';
import type { AIService } from '../services/ai.service.js';

// WDK type imports for subscription and conditional payments via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Recurring payments execute via WDK account.transfer() on each billing cycle
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register payments and AI-related routes onto the given router.
 */
export function registerPaymentsRoutes(
  router: Router,
  autoPayments: AutoPaymentsService,
  ai: AIService,
): void {

  // ── Subscriptions / Recurring Payments ──────────────────────

  /** POST /api/subscriptions — Create a recurring payment subscription */
  router.post('/subscriptions', (req, res) => {
    const { name, type, from, to, amount, token, chainId, intervalHours, maxPayments, memo } = req.body as {
      name?: string; type?: 'subscription' | 'payroll' | 'recurring_payment';
      from?: string; to?: string; amount?: number; token?: string; chainId?: string;
      intervalHours?: number; maxPayments?: number; memo?: string;
    };
    if (!name || !from || !to || !amount || !intervalHours) {
      res.status(400).json({ error: 'name, from, to, amount, and intervalHours are required' });
      return;
    }
    const sub = autoPayments.createSubscription({ name, type, from, to, amount, token, chainId, intervalHours, maxPayments, memo });
    res.status(201).json(sub);
  });

  /** GET /api/subscriptions — List all subscriptions */
  router.get('/subscriptions', (req, res) => {
    const typeFilter = req.query.type as string | undefined;
    res.json(autoPayments.listSubscriptions(typeFilter));
  });

  /** GET /api/subscriptions/:id — Get a specific subscription */
  router.get('/subscriptions/:id', (req, res) => {
    const sub = autoPayments.getSubscription(req.params.id);
    if (!sub) { res.status(404).json({ error: 'Subscription not found' }); return; }
    res.json(sub);
  });

  /** POST /api/subscriptions/:id/pause — Pause a subscription */
  router.post('/subscriptions/:id/pause', (req, res) => {
    const result = autoPayments.pauseSubscription(req.params.id);
    if ('error' in result) { res.status(400).json(result); return; }
    res.json(result);
  });

  /** POST /api/subscriptions/:id/resume — Resume a paused subscription */
  router.post('/subscriptions/:id/resume', (req, res) => {
    const result = autoPayments.resumeSubscription(req.params.id);
    if ('error' in result) { res.status(400).json(result); return; }
    res.json(result);
  });

  /** POST /api/subscriptions/:id/cancel — Cancel a subscription */
  router.post('/subscriptions/:id/cancel', (req, res) => {
    const result = autoPayments.cancelSubscription(req.params.id);
    if ('error' in result) { res.status(400).json(result); return; }
    res.json(result);
  });

  // ── Conditional Payments (Oracle) ───────────────────────────

  /** POST /api/conditional-payments — Create a conditional payment */
  router.post('/conditional-payments', (req, res) => {
    const { recipient, amount, token, chain, condition, expiresAt, label } = req.body as {
      recipient?: string; amount?: number; token?: string; chain?: string;
      condition?: { type: 'view_count' | 'price_threshold' | 'time_based' | 'custom_webhook'; target: number; checkUrl?: string; checkIntervalMs?: number };
      expiresAt?: string; label?: string;
    };
    if (!recipient || !amount || !condition || !expiresAt) {
      res.status(400).json({ error: 'recipient, amount, condition, and expiresAt are required' });
      return;
    }
    const cp = autoPayments.createConditionalPayment({ recipient, amount, token, chain, condition, expiresAt, label });
    res.status(201).json(cp);
  });

  /** GET /api/conditional-payments — List conditional payments */
  router.get('/conditional-payments', (req, res) => {
    const status = req.query.status as string | undefined;
    res.json(autoPayments.listConditionalPayments(status));
  });

  /** GET /api/conditional-payments/:id — Get specific conditional payment */
  router.get('/conditional-payments/:id', (req, res) => {
    const cp = autoPayments.getConditionalPayment(req.params.id);
    if (!cp) { res.status(404).json({ error: 'Conditional payment not found' }); return; }
    res.json(cp);
  });

  /** POST /api/conditional-payments/:id/cancel — Cancel a conditional payment */
  router.post('/conditional-payments/:id/cancel', (req, res) => {
    const result = autoPayments.cancelConditionalPayment(req.params.id);
    if ('error' in result) { res.status(400).json(result); return; }
    res.json(result);
  });

  /** POST /api/conditional-payments/check — Trigger check of all pending conditional payments */
  router.post('/conditional-payments/check', async (_req, res) => {
    try {
      const triggered = await autoPayments.checkConditionalPayments();
      res.json({ checked: true, triggered: triggered.length, payments: triggered });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── LLM-Powered Intelligence Endpoints ────────────────────────────

  /** POST /api/ai/tip-message — Generate LLM-powered personalized tip message */
  router.post('/ai/tip-message', async (req, res) => {
    try {
      const { creatorName, amount, token, context } = req.body;
      const message = await ai.generateTipMessage(
        creatorName ?? 'Creator',
        amount ?? '0.01',
        token ?? 'USDT',
        context,
      );
      res.json({ message, source: ai.getProvider() });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/ai/risk-explanation — Generate LLM-powered risk assessment explanation */
  router.post('/ai/risk-explanation', async (req, res) => {
    try {
      const { riskScore, riskLevel, factors } = req.body;
      const explanation = await ai.generateRiskExplanation(
        riskScore ?? 50,
        riskLevel ?? 'medium',
        factors ?? [],
      );
      res.json({ explanation, source: ai.getProvider() });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/ai/decision-explanation — Generate LLM-powered autonomous decision explanation */
  router.post('/ai/decision-explanation', async (req, res) => {
    try {
      const { decision, profile } = req.body;
      const explanation = await ai.generateAutonomousDecisionExplanation(
        decision ?? { recipient: '0x0', amount: '0.01', chain: 'ethereum-sepolia', reason: 'pattern match' },
        profile ?? { tipCount: 0, avgAmount: 0, topRecipient: '0x0' },
      );
      res.json({ explanation, source: ai.getProvider() });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/ai/status — AI service status and capabilities */
  router.get('/ai/status', (_req, res) => {
    res.json({
      available: ai.isAvailable(),
      provider: ai.getProvider(),
      model: ai.getProvider() === 'groq' ? 'llama-3.3-70b-versatile' : ai.getProvider() === 'gemini' ? 'gemini-2.0-flash' : 'rule-based',
      capabilities: [
        'Natural language tip parsing',
        'Chain selection reasoning',
        'Intent classification',
        'Personalized tip messages',
        'Risk assessment explanations',
        'Autonomous decision explanations',
        'Activity summarization',
      ],
      fallback: 'Rule-based reasoning with weighted scoring',
    });
  });
}

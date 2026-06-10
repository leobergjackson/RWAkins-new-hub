// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Autonomy route handlers (extracted from api.ts)
// Covers: autonomous loop, orchestrator, decisions, memory, predictions, events

import { Router } from 'express';
import type { TipFlowAgent } from '../core/agent.js';
import type { AutonomyService, AutonomyPolicy } from '../services/autonomy.service.js';
import type { OrchestratorService } from '../services/orchestrator.service.js';
import type { PredictorService } from '../services/predictor.service.js';
import type { MemoryService } from '../services/memory.service.js';
import type { EventSimulatorService } from '../services/event-simulator.service.js';
import type { DecisionLogService } from '../services/decision-log.service.js';
import type { AutonomousLoopService } from '../services/autonomous-loop.service.js';
import { logger } from '../utils/logger.js';

// WDK type imports for autonomous loop wallet operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Autonomous loop queries WDK balances for decision-making and executes transfers
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

export interface AutonomyRouteDeps {
  agent: TipFlowAgent;
  autonomy: AutonomyService;
  orchestrator: OrchestratorService;
  predictor: PredictorService;
  memory: MemoryService;
  eventSimulator: EventSimulatorService;
  decisionLog: DecisionLogService;
  getAutonomousLoop: () => AutonomousLoopService | null;
}

/**
 * Register autonomy-related routes onto the given router.
 * Handles: autonomy profile/policies/decisions, orchestrator, predictions,
 *          memory, autonomous loop control, events, decision log.
 */
export function registerAutonomyRoutes(router: Router, deps: AutonomyRouteDeps): void {
  const {
    agent, autonomy, orchestrator, predictor,
    memory, eventSimulator, decisionLog, getAutonomousLoop,
  } = deps;

  // === AUTONOMOUS INTELLIGENCE ===

  /** GET /api/autonomy/profile — Analyze tip history and return a tip profile */
  router.get('/autonomy/profile', (_req, res) => {
    try {
      const tips = agent.getHistory();
      const profile = autonomy.analyzeTipHistory(tips);
      res.json({ profile });
    } catch (err) {
      logger.error('Failed to build tip profile', { error: String(err) });
      res.status(500).json({ error: 'Failed to analyze tip history' });
    }
  });

  /** GET /api/autonomy/recommendations — Get smart tip recommendations */
  router.get('/autonomy/recommendations', (_req, res) => {
    try {
      const tips = agent.getHistory();
      const profile = autonomy.analyzeTipHistory(tips);
      const recommendations = autonomy.generateRecommendations(profile);
      res.json({ recommendations, profile });
    } catch (err) {
      logger.error('Failed to generate recommendations', { error: String(err) });
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  /** POST /api/autonomy/policies — Create a new autonomy policy */
  router.post('/autonomy/policies', (req, res) => {
    try {
      const { name, type, enabled, rules } = req.body as {
        name?: string;
        type?: string;
        enabled?: boolean;
        rules?: Record<string, unknown>;
      };
      if (!name || !type) {
        res.status(400).json({ error: 'name and type are required' });
        return;
      }
      const policy = autonomy.setPolicy('default', {
        name,
        type: type as 'recurring' | 'budget' | 'recipient_limit' | 'custom',
        enabled: enabled !== false,
        rules: (rules ?? {}) as AutonomyPolicy['rules'],
      });
      res.json({ policy });
    } catch (err) {
      logger.error('Failed to create policy', { error: String(err) });
      res.status(500).json({ error: 'Failed to create policy' });
    }
  });

  /** GET /api/autonomy/policies — List all autonomy policies */
  router.get('/autonomy/policies', (_req, res) => {
    const policies = autonomy.getPolicies('default');
    res.json({ policies });
  });

  /** DELETE /api/autonomy/policies/:id — Delete a policy */
  router.delete('/autonomy/policies/:id', (req, res) => {
    const deleted = autonomy.deletePolicy(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }
    res.json({ deleted: true, id: req.params.id });
  });

  /** GET /api/autonomy/decisions — Get the full decision log */
  router.get('/autonomy/decisions', (_req, res) => {
    const decisions = autonomy.getDecisionLog();
    res.json({ decisions });
  });

  /** POST /api/autonomy/decisions/:id/approve — Approve a proposed decision */
  router.post('/autonomy/decisions/:id/approve', (req, res) => {
    const decision = autonomy.approveDecision(req.params.id);
    if (!decision) {
      res.status(404).json({ error: 'Decision not found or not in proposed status' });
      return;
    }
    res.json({ decision });
  });

  /** POST /api/autonomy/decisions/:id/reject — Reject a proposed decision */
  router.post('/autonomy/decisions/:id/reject', (req, res) => {
    const decision = autonomy.rejectDecision(req.params.id);
    if (!decision) {
      res.status(404).json({ error: 'Decision not found or not in proposed status' });
      return;
    }
    res.json({ decision });
  });

  /** POST /api/autonomy/evaluate — Run the autonomous evaluation pipeline */
  router.post('/autonomy/evaluate', (_req, res) => {
    try {
      const tips = agent.getHistory();
      const proposals = autonomy.evaluateAndPropose(tips);
      res.json({ proposals, count: proposals.length });
    } catch (err) {
      logger.error('Autonomous evaluation failed', { error: String(err) });
      res.status(500).json({ error: 'Autonomous evaluation failed' });
    }
  });

  // ── Multi-Agent Orchestration ────────────────────────────────
  router.post('/orchestrator/propose', async (req, res) => {
    const { type, params } = req.body;
    if (!type || !params) return res.status(400).json({ error: 'type and params required' });
    const action = await orchestrator.propose(type, params);
    res.status(201).json(action);
  });

  router.get('/orchestrator/history', (_req, res) => {
    res.json(orchestrator.getHistory());
  });

  router.get('/orchestrator/stats', (_req, res) => {
    res.json(orchestrator.getStats());
  });

  router.get('/orchestrator/:id', (req, res) => {
    const action = orchestrator.getAction(req.params.id);
    if (!action) return res.status(404).json({ error: 'Action not found' });
    res.json(action);
  });

  router.post('/orchestrator/:id/result', (req, res) => {
    const action = orchestrator.recordExecution(req.params.id, req.body);
    if (!action) return res.status(404).json({ error: 'Action not found' });
    res.json(action);
  });

  router.post('/orchestrator/config', (req, res) => {
    if (req.body.dailyLimit) orchestrator.setDailyLimit(req.body.dailyLimit);
    if (req.body.knownRecipient) orchestrator.addKnownRecipient(req.body.knownRecipient);
    res.json({ success: true });
  });

  // ── Predictive Tipping Intelligence ──────────────────────────
  router.post('/predictions/learn', (req, res) => {
    const { tips } = req.body;
    if (!Array.isArray(tips)) return res.status(400).json({ error: 'tips array required' });
    predictor.learnFromHistory(tips);
    res.json({ success: true, message: 'Prediction models updated' });
  });

  router.post('/predictions/generate', (_req, res) => {
    const predictions = predictor.generatePredictions();
    res.json(predictions);
  });

  router.get('/predictions', (_req, res) => {
    res.json(predictor.getPendingPredictions());
  });

  router.get('/predictions/all', (_req, res) => {
    res.json(predictor.getAllPredictions());
  });

  router.get('/predictions/stats', (_req, res) => {
    res.json(predictor.getStats());
  });

  router.post('/predictions/:id/accept', (req, res) => {
    const pred = predictor.acceptPrediction(req.params.id);
    if (!pred) return res.status(404).json({ error: 'Prediction not found' });
    res.json(pred);
  });

  router.post('/predictions/:id/dismiss', (req, res) => {
    const pred = predictor.dismissPrediction(req.params.id);
    if (!pred) return res.status(404).json({ error: 'Prediction not found' });
    res.json(pred);
  });

  // ── Agent Memory ─────────────────────────────────────────────
  router.get('/memory', (_req, res) => {
    res.json(memory.getAllMemories());
  });

  router.get('/memory/stats', (_req, res) => {
    res.json(memory.getStats());
  });

  router.get('/memory/search', (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: 'q parameter required' });
    res.json(memory.search(query));
  });

  router.post('/memory', (req, res) => {
    const { type, key, value, source } = req.body;
    if (!key || !value) return res.status(400).json({ error: 'key and value required' });
    const entry = memory.remember(type ?? 'fact', key, value, source ?? 'user_said');
    res.status(201).json(entry);
  });

  router.get('/memory/conversations', (_req, res) => {
    res.json(memory.getConversationHistory());
  });

  router.delete('/memory/:id', (req, res) => {
    const success = memory.forget(req.params.id);
    if (!success) return res.status(404).json({ error: 'Memory not found' });
    res.json({ success: true });
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 3: AUTONOMOUS LOOP ENDPOINTS
  // ══════════════════════════════════════════════════════════════

  /** GET /api/agent/loop/status — Get loop state */
  router.get('/agent/loop/status', (_req, res) => {
    const loop = getAutonomousLoop();
    if (!loop) {
      return res.json({ running: false, error: 'Autonomous loop not initialized' });
    }
    res.json(loop.getStatus());
  });

  /** POST /api/agent/loop/start — Start the autonomous loop */
  router.post('/agent/loop/start', (_req, res) => {
    const loop = getAutonomousLoop();
    if (!loop) {
      return res.status(500).json({ error: 'Autonomous loop not initialized' });
    }
    loop.start();
    res.json({ status: 'started', ...loop.getStatus() });
  });

  /** POST /api/agent/loop/stop — Stop the autonomous loop */
  router.post('/agent/loop/stop', (_req, res) => {
    const loop = getAutonomousLoop();
    if (!loop) {
      return res.status(500).json({ error: 'Autonomous loop not initialized' });
    }
    loop.stop();
    res.json({ status: 'stopped', ...loop.getStatus() });
  });

  /** POST /api/agent/loop/pause — Pause the loop */
  router.post('/agent/loop/pause', (_req, res) => {
    const loop = getAutonomousLoop();
    if (!loop) {
      return res.status(500).json({ error: 'Autonomous loop not initialized' });
    }
    loop.pause();
    res.json({ status: 'paused', ...loop.getStatus() });
  });

  /** POST /api/agent/loop/resume — Resume the loop */
  router.post('/agent/loop/resume', (_req, res) => {
    const loop = getAutonomousLoop();
    if (!loop) {
      return res.status(500).json({ error: 'Autonomous loop not initialized' });
    }
    loop.resume();
    res.json({ status: 'resumed', ...loop.getStatus() });
  });

  // ── Event Simulator ────────────────────────────────────────

  /** GET /api/events/recent — Get last N events */
  router.get('/events/recent', (req, res) => {
    const limit = parseInt(String(req.query.limit ?? '50'), 10);
    res.json({
      events: eventSimulator.getRecentEvents(limit),
      stats: eventSimulator.getStats(),
    });
  });

  /** GET /api/events/stream — SSE endpoint for real-time event feed */
  router.get('/events/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const clientId = `sse_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    eventSimulator.addSSEClient({
      id: clientId,
      send: (data: string) => { try { res.write(data); } catch { /* client disconnected */ } },
      close: () => { try { res.end(); } catch { /* already closed */ } },
    });

    req.on('close', () => {
      eventSimulator.removeSSEClient(clientId);
    });
  });

  /** GET /api/events/stats — Event simulator statistics */
  router.get('/events/stats', (_req, res) => {
    res.json(eventSimulator.getStats());
  });

  // ── Rumble Webhook Listener ────────────────────────────────

  /** POST /api/webhooks/rumble — Accept Rumble-style webhook payloads */
  router.post('/webhooks/rumble', (req, res) => {
    try {
      const { event, data, timestamp } = req.body;
      if (!event || !data) {
        return res.status(400).json({ error: 'Missing required fields: event, data' });
      }

      const simulatedEvent = eventSimulator.injectWebhookEvent({
        event: String(event),
        data: typeof data === 'object' ? data : {},
        timestamp: timestamp ? Number(timestamp) : undefined,
      });

      logger.info('Rumble webhook received', { event, creatorId: simulatedEvent.creatorId });

      res.json({
        received: true,
        eventId: simulatedEvent.id,
        type: simulatedEvent.type,
        creatorName: simulatedEvent.creatorName,
        engagementQuality: simulatedEvent.engagementQuality,
        suggestedTipAmount: simulatedEvent.suggestedTipAmount,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Decision Log ──────────────────────────────────────────

  /** GET /api/agent/decisions — Paginated decision log */
  router.get('/agent/decisions', (req, res) => {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '20'), 10);
    res.json(decisionLog.getDecisions(page, Math.min(limit, 100)));
  });

  /** GET /api/agent/decisions/export — Full decision log as JSON */
  router.get('/agent/decisions/export', (_req, res) => {
    const decisions = decisionLog.getAllDecisions();
    res.json({
      exportedAt: new Date().toISOString(),
      totalDecisions: decisions.length,
      stats: decisionLog.getStats(),
      decisions,
    });
  });

  /** GET /api/agent/decisions/stats — Decision log statistics */
  router.get('/agent/decisions/stats', (_req, res) => {
    res.json(decisionLog.getStats());
  });

  // ── Agent Memory / Learning ────────────────────────────────

  /** GET /api/agent/memory — What the agent has learned */
  router.get('/agent/memory', (_req, res) => {
    res.json(memory.getLearnings());
  });

  /** GET /api/agent/memory/context — LLM context string built from memories */
  router.get('/agent/memory/context', (_req, res) => {
    res.json({
      context: memory.buildContextForLLM(),
      stats: memory.getStats(),
    });
  });

  // ── Deduplication Stats ────────────────────────────────────

  /** GET /api/agent/dedup — Deduplication service stats */
  router.get('/agent/dedup', (_req, res) => {
    const loop = getAutonomousLoop();
    if (!loop) {
      return res.json({ trackedEntries: 0, ttlMinutes: 60 });
    }
    res.json(loop.getDedupStats());
  });

  /** GET /api/autonomous/openclaw-trace — Last OpenClaw ReAct reasoning trace */
  router.get('/autonomous/openclaw-trace', (_req, res) => {
    const loop = getAutonomousLoop();
    if (!loop) {
      return res.status(503).json({ error: 'Autonomous loop not initialized' });
    }
    const trace = loop.getLastOpenClawTrace();
    res.json({ trace, framework: 'OpenClaw-equivalent ReAct', integratedInLoop: true });
  });
}

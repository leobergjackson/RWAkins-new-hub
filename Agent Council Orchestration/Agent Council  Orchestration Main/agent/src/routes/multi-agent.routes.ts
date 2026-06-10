// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Multi-Agent API Routes

import { Router } from 'express';
import type { MultiAgentOrchestrator } from '../agents/orchestrator.js';
import { logger } from '../utils/logger.js';

export function registerMultiAgentRoutes(router: Router, orchestrator: MultiAgentOrchestrator): void {

  // ── GET /api/agents — List all agents with status ──
  router.get('/api/agents', (_req, res) => {
    try {
      const agents = orchestrator.getAgents().map((a) => a.getInfo());
      res.json({ agents, count: agents.length });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /api/agents/orchestrator/status — Full orchestrator status ──
  router.get('/api/agents/orchestrator/status', (_req, res) => {
    try {
      const status = orchestrator.getStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── POST /api/agents/orchestrator/cycle — Trigger a manual cycle ──
  router.post('/api/agents/orchestrator/cycle', async (_req, res) => {
    try {
      logger.info('Multi-agent: Manual cycle triggered via API');
      const result = await orchestrator.triggerManualCycle();

      // Serialize the votes Map for JSON
      const serializedPhases = {
        ...result.phases,
        votes: Object.fromEntries(result.phases.votes),
      };

      res.json({
        cycleNumber: result.cycleNumber,
        duration: result.duration,
        phases: serializedPhases,
        decisions: result.decisions,
        errors: result.errors,
      });
    } catch (err) {
      logger.error('Multi-agent: Manual cycle failed', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  // ── POST /api/agents/orchestrator/start — Start autonomous loop ──
  router.post('/api/agents/orchestrator/start', (_req, res) => {
    try {
      orchestrator.start();
      res.json({ message: 'Orchestrator started', status: orchestrator.getStatus() });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── POST /api/agents/orchestrator/stop — Stop autonomous loop ──
  router.post('/api/agents/orchestrator/stop', (_req, res) => {
    try {
      orchestrator.stop();
      res.json({ message: 'Orchestrator stopped', status: orchestrator.getStatus() });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /api/agents/orchestrator/decisions — Decision log ──
  router.get('/api/agents/orchestrator/decisions', (_req, res) => {
    try {
      const decisions = orchestrator.getDecisionLog();
      res.json({ decisions, count: decisions.length });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /api/agents/orchestrator/cycles — Cycle history ──
  router.get('/api/agents/orchestrator/cycles', (_req, res) => {
    try {
      const cycles = orchestrator.getCycleHistory().map((c) => ({
        cycleNumber: c.cycleNumber,
        timestamp: c.timestamp,
        duration: c.duration,
        proposalCount: c.phases.proposals.length,
        executionCount: c.phases.executions.length,
        errorCount: c.errors.length,
        decisions: c.decisions,
      }));
      res.json({ cycles, count: cycles.length });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /api/agents/bus/stats — Message bus stats ──
  router.get('/api/agents/bus/stats', (_req, res) => {
    try {
      res.json(orchestrator.bus.getStats());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /api/agents/bus/messages — Full message history ──
  router.get('/api/agents/bus/messages', (req, res) => {
    try {
      const limit = parseInt(req.query['limit'] as string, 10) || 50;
      const messages = orchestrator.bus.getHistory().slice(-limit);
      res.json({ messages, count: messages.length });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /api/agents/:id — Single agent details ──
  router.get('/api/agents/:id', (req, res) => {
    try {
      const agent = orchestrator.getAgent(req.params['id']);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }
      res.json(agent.getInfo());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GET /api/agents/:id/messages — Agent message history ──
  router.get('/api/agents/:id/messages', (req, res) => {
    try {
      const agentId = req.params['id'];
      const agent = orchestrator.getAgent(agentId);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      const limit = parseInt(req.query['limit'] as string, 10) || 50;
      const messages = orchestrator.getAgentMessages(agentId).slice(-limit);
      res.json({
        agentId,
        agentName: agent.getInfo().name,
        messages,
        count: messages.length,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  logger.info('Multi-agent API routes registered');
}

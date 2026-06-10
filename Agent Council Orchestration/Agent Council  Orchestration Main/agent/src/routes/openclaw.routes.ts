// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — OpenClaw Runtime API Routes
// Exposes agent identity (SOUL.md), registered skills, and skill execution endpoints.

import { Router } from 'express';
import { logger } from '../utils/logger.js';
import type { OpenClawRuntimeService } from '../services/openclaw-runtime.service.js';

// WDK type imports for OpenClaw skill execution via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
// OpenClaw skills invoke WDK wallet operations (transfer, balance, bridge) as capabilities
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register OpenClaw Runtime routes on the given router.
 * All routes are prefixed with /openclaw/ (caller mounts under /api).
 */
export function registerOpenClawRoutes(
  router: Router,
  runtime: OpenClawRuntimeService,
): void {

  // GET /api/openclaw/status — Runtime status (health check)
  router.get('/openclaw/status', (_req, res) => {
    try {
      const status = runtime.getStatus();
      res.json({ ok: true, ...status });
    } catch (err) {
      logger.error('OpenClaw status error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to get OpenClaw runtime status' });
    }
  });

  // GET /api/openclaw/soul — Agent identity from SOUL.md
  router.get('/openclaw/soul', (_req, res) => {
    try {
      const soul = runtime.getAgentIdentity();
      if (!soul) {
        res.status(404).json({ error: 'SOUL.md not loaded. Runtime may not be initialized.' });
        return;
      }
      res.json({ ok: true, soul });
    } catch (err) {
      logger.error('OpenClaw soul error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to get agent identity' });
    }
  });

  // GET /api/openclaw/skills — List all registered skills
  router.get('/openclaw/skills', (_req, res) => {
    try {
      const skills = runtime.listSkills().map(s => ({
        id: s.id,
        name: s.name,
        version: s.version,
        description: s.description,
        protocol: s.protocol,
        tags: s.tags,
        requiredTools: s.requiredTools,
        requiredSkills: s.requiredSkills,
        processSteps: s.processSteps,
        inputFields: s.inputFields,
        outputFields: s.outputFields,
      }));
      res.json({ ok: true, count: skills.length, skills });
    } catch (err) {
      logger.error('OpenClaw skills list error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to list skills' });
    }
  });

  // GET /api/openclaw/skills/:id — Get a single skill definition
  router.get('/openclaw/skills/:id', (req, res) => {
    try {
      const skill = runtime.getSkill(req.params.id);
      if (!skill) {
        res.status(404).json({ error: `Skill not found: ${req.params.id}` });
        return;
      }
      res.json({ ok: true, skill });
    } catch (err) {
      logger.error('OpenClaw skill detail error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to get skill details' });
    }
  });

  // POST /api/openclaw/execute — Execute a skill by name
  router.post('/openclaw/execute', async (req, res) => {
    try {
      const { skill: skillName, input } = req.body ?? {};
      if (!skillName || typeof skillName !== 'string') {
        res.status(400).json({ error: 'Missing required field: skill (string)' });
        return;
      }

      const result = await runtime.executeSkill(skillName, input ?? {});
      res.json({ ok: result.success, ...result });
    } catch (err) {
      logger.error('OpenClaw execute error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Skill execution failed', detail: err instanceof Error ? err.message : String(err) });
    }
  });

  logger.info('OpenClaw Runtime routes registered: /api/openclaw/{status,soul,skills,execute}');
}

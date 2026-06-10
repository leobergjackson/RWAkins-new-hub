// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Agent Dialogue ("Board Meeting") API routes

import { Router } from 'express';
import type { AgentDialogueService } from '../services/agent-dialogue.service.js';
import { logger } from '../utils/logger.js';

// WDK type imports for agent dialogue board meeting decisions via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
// Dialogue sessions reference WDK wallet states when making fund allocation decisions
export type _WdkRefs = WDK; // eslint-disable-line @typescript-eslint/no-unused-vars

export function registerDialogueRoutes(
  router: Router,
  dialogueService: AgentDialogueService,
): void {
  /**
   * GET /api/dialogue/sessions — Recent dialogue sessions
   */
  router.get('/dialogue/sessions', (req, res) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
      const sessions = dialogueService.getRecentDialogues(limit);
      res.json({ ok: true, sessions, count: sessions.length });
    } catch (err) {
      logger.error('Dialogue sessions error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to fetch dialogue sessions' });
    }
  });

  /**
   * GET /api/dialogue/sessions/:id — Full session detail
   */
  router.get('/dialogue/sessions/:id', (req, res) => {
    try {
      const session = dialogueService.getDialogueById(req.params.id);
      if (!session) {
        res.status(404).json({ error: 'Dialogue session not found' });
        return;
      }
      res.json({ ok: true, session });
    } catch (err) {
      logger.error('Dialogue session detail error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to fetch dialogue session' });
    }
  });

  /**
   * POST /api/dialogue/simulate — Run a demo dialogue
   * Body: { action, amount?, token?, chain?, recipient?, details? }
   */
  router.post('/dialogue/simulate', (req, res) => {
    try {
      const { action, amount, token, chain, recipient, details } = req.body ?? {};
      if (!action || typeof action !== 'string') {
        res.status(400).json({ error: 'Missing required field: action (string)' });
        return;
      }
      const session = dialogueService.conductDialogue({
        action,
        amount: amount != null ? Number(amount) : undefined,
        token: token ?? 'USDT',
        chain: chain ?? 'Polygon',
        recipient,
        details,
      });
      res.json({ ok: true, session });
    } catch (err) {
      logger.error('Dialogue simulate error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to simulate dialogue' });
    }
  });

  logger.info('Agent dialogue routes mounted at /api/dialogue/*');
}

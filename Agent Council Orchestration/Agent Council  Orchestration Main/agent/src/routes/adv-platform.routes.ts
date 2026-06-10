// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Advanced platform route handlers (extracted from advanced.ts)
// Covers: OpenClaw Agent Framework, Rumble Platform Integration

import { Router } from 'express';
import type { OpenClawService } from '../services/openclaw.service.js';
import type { RumbleService } from '../services/rumble.service.js';

// WDK type imports for platform integration via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// OpenClaw and Rumble platforms use WDK wallets for creator tip disbursement
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register OpenClaw and Rumble advanced platform routes.
 */
export function registerAdvPlatformRoutes(
  router: Router,
  openClawService: OpenClawService,
  rumbleService: RumbleService,
): void {

  // ── Real Rumble Platform Integration ──

  router.get('/rumble/channel/:channelName', async (req, res) => {
    try {
      const data = await rumbleService.fetchChannelData(req.params.channelName);
      res.json(data);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/rumble/search', async (req, res) => {
    try {
      const { q, type } = req.query;
      if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
      const results = await rumbleService.searchRumble(q as string, (type as 'video' | 'channel') || 'video');
      res.json({ results });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/rumble/trending', async (_req, res) => {
    try {
      const videos = await rumbleService.fetchTrendingVideos();
      res.json({ trending: videos });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/rumble/discover', async (req, res) => {
    try {
      const { query, defaultWallet } = req.body;
      if (!query) return res.status(400).json({ error: 'query is required' });
      const creators = await rumbleService.discoverAndRegisterCreators(query, defaultWallet || '0x0000000000000000000000000000000000000000');
      res.json({ discovered: creators.length, creators });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/rumble/smart-tips/:userId', async (req, res) => {
    try {
      const suggestions = await rumbleService.getSmartTipSuggestions(req.params.userId);
      res.json({ suggestions });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/rumble/tip-link', (req, res) => {
    try {
      const { channelUrl, amount, token, message } = req.query;
      if (!channelUrl || !amount) return res.status(400).json({ error: 'channelUrl and amount are required' });
      const link = rumbleService.buildRumbleTipLink(
        channelUrl as string,
        parseFloat(amount as string),
        (token as 'USDT' | 'XAUT' | 'BTC') || 'USDT',
        message as string | undefined,
      );
      res.json({ tipLink: link });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── OpenClaw Agent Framework ──

  router.get('/openclaw/tools', (_req, res) => {
    try {
      const { category } = _req.query;
      res.json({ tools: openClawService.listTools(category as string).map(t => ({ name: t.name, description: t.description, category: t.category, parameters: t.parameters, permissions: t.permissions })) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/openclaw/tools/schema', (_req, res) => {
    try {
      res.json({ schema: openClawService.getToolSchema() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/openclaw/roles', (_req, res) => {
    try {
      res.json({ roles: openClawService.getRoles() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/openclaw/execute', async (req, res) => {
    try {
      const { goal, role, maxSteps } = req.body;
      if (!goal) return res.status(400).json({ error: 'goal is required' });
      const trace = await openClawService.executeGoal(goal, role || 'strategy_planner', maxSteps || 10);
      res.json(trace);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/openclaw/traces', (_req, res) => {
    try {
      const { status } = _req.query;
      res.json({ traces: openClawService.listTraces(status as string) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/openclaw/traces/:id', (req, res) => {
    try {
      const trace = openClawService.getTrace(req.params.id);
      trace ? res.json(trace) : res.status(404).json({ error: 'Trace not found' });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/openclaw/stats', (_req, res) => {
    try {
      res.json(openClawService.getStats());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/openclaw/safety', (_req, res) => {
    try {
      res.json({ safetyConfig: openClawService.getSafetyConfig() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.put('/openclaw/safety', (req, res) => {
    try {
      res.json({ safetyConfig: openClawService.updateSafetyConfig(req.body) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });
}

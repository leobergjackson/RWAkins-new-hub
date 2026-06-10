// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Trading & Marketplace route handlers (extracted from advanced.ts)

import { Router } from 'express';
import type { TradingSwarmService } from '../services/trading-swarm.service.js';
import type { AgentMarketplaceService } from '../services/agent-marketplace.service.js';

// WDK type imports for trading swarm payment settlement via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Trading swarm settles agent marketplace tasks via WDK account.transfer()
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register trading swarm and agent marketplace routes onto the given router.
 */
export function registerTradingRoutes(
  router: Router,
  tradingSwarmService: TradingSwarmService,
  agentMarketplaceService: AgentMarketplaceService,
): void {

  // ── Agent-to-Agent Task Marketplace ──

  router.post('/marketplace/agents', (req, res) => {
    try { res.json(agentMarketplaceService.registerAgent(req.body)); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/marketplace/agents', (req, res) => {
    try { res.json({ agents: agentMarketplaceService.listAgents(req.query.type as string) }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/marketplace/tasks', (req, res) => {
    try { res.json(agentMarketplaceService.postTask(req.body)); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/marketplace/tasks', (req, res) => {
    try { res.json({ tasks: agentMarketplaceService.listTasks(req.query.status as string, req.query.category as string) }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/marketplace/tasks/:id', (req, res) => {
    try { const t = agentMarketplaceService.getTask(req.params.id); t ? res.json(t) : res.status(404).json({ error: 'Task not found' }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/marketplace/tasks/:id/complete', (req, res) => {
    try { const r = agentMarketplaceService.completeTask(req.params.id, req.body); 'error' in r ? res.status(400).json(r) : res.json(r); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/marketplace/tasks/:id/execute', async (req, res) => {
    try {
      const r = await agentMarketplaceService.executeTask(req.params.id);
      'error' in r ? res.status(400).json(r) : res.json(r);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/marketplace/execute', async (req, res) => {
    try {
      const r = await agentMarketplaceService.postAndExecute(req.body);
      'error' in r ? res.status(400).json(r) : res.json(r);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/marketplace/tasks/:id/cancel', (req, res) => {
    try { const r = agentMarketplaceService.cancelTask(req.params.id); 'error' in r ? res.status(400).json(r) : res.json(r); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/marketplace/stats', (_req, res) => {
    try { res.json(agentMarketplaceService.getStats()); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Multi-Agent Trading Swarm ──

  router.get('/trading/traders', (_req, res) => {
    try { res.json({ traders: tradingSwarmService.listTraders() }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/trading/traders/:id/pause', (req, res) => {
    try { const r = tradingSwarmService.pauseTrader(req.params.id); 'error' in r ? res.status(400).json(r) : res.json(r); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/trading/traders/:id/resume', (req, res) => {
    try { const r = tradingSwarmService.resumeTrader(req.params.id); 'error' in r ? res.status(400).json(r) : res.json(r); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.put('/trading/traders/:id/config', (req, res) => {
    try { const r = tradingSwarmService.updateTraderConfig(req.params.id, req.body); 'error' in r ? res.status(400).json(r) : res.json(r); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/trading/trades', (req, res) => {
    try { const limit = req.query.limit ? parseInt(req.query.limit as string) : 50; res.json({ trades: tradingSwarmService.getTrades(req.query.traderId as string, limit) }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/trading/consensus', (req, res) => {
    try { const limit = req.query.limit ? parseInt(req.query.limit as string) : 20; res.json({ consensus: tradingSwarmService.getConsensusHistory(limit), latest: tradingSwarmService.getLatestConsensus() }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/trading/rebalance', (_req, res) => {
    try { res.json(tradingSwarmService.rebalance()); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/trading/stats', (_req, res) => {
    try { res.json(tradingSwarmService.getStats()); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/trading/consensus/force', async (req, res) => {
    try {
      const { pair } = req.body;
      if (!pair) return res.status(400).json({ error: 'pair required (e.g. ETH/USDT)' });
      const result = await tradingSwarmService.forceConsensus(pair);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/trading/dex-volumes', (_req, res) => {
    try { res.json({ volumes: tradingSwarmService.getDexVolumes() }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Swarm & alerts route handlers (extracted from advanced.ts)
// Covers: Wallet Monitoring Swarm, Price Alerts & Portfolio Tracker

import { Router } from 'express';
import type { WalletSwarmService } from '../services/wallet-swarm.service.js';
import type { PriceAlertsService } from '../services/price-alerts.service.js';

// WDK type imports for wallet monitoring swarm via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
// Wallet swarm monitors WDK getBalance() across chains for alerts and portfolio tracking
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register wallet swarm and price alerts routes.
 */
export function registerAdvSwarmRoutes(
  router: Router,
  walletSwarmService: WalletSwarmService,
  priceAlertsService: PriceAlertsService,
): void {

  // ── Wallet Monitoring Swarm ──

  router.get('/swarm/agents', (_req, res) => {
    try {
      res.json({ agents: walletSwarmService.listAgents(), stats: walletSwarmService.getStats() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/swarm/agents', (req, res) => {
    try {
      res.json(walletSwarmService.deployAgent(req.body));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/swarm/agents/:id/pause', (req, res) => {
    try {
      const result = walletSwarmService.pauseAgent(req.params.id);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/swarm/agents/:id/resume', (req, res) => {
    try {
      const result = walletSwarmService.resumeAgent(req.params.id);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.delete('/swarm/agents/:id', (req, res) => {
    try {
      res.json(walletSwarmService.removeAgent(req.params.id));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/swarm/rules', (req, res) => {
    try {
      const result = walletSwarmService.addWatchRule(req.body);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/swarm/rules', (req, res) => {
    try {
      res.json({ rules: walletSwarmService.listRules(req.query.agentId as string) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/swarm/alerts', (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      res.json({ alerts: walletSwarmService.getAlerts(limit, req.query.severity as string) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/swarm/alerts/:id/acknowledge', (req, res) => {
    try {
      const result = walletSwarmService.acknowledgeAlert(req.params.id);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/swarm/alerts/acknowledge-all', (_req, res) => {
    try {
      res.json({ acknowledged: walletSwarmService.acknowledgeAll() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/swarm/stats', (_req, res) => {
    try {
      res.json(walletSwarmService.getStats());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/swarm/check-address', async (req, res) => {
    try {
      const { chainId, address } = req.body;
      if (!chainId || !address) return res.status(400).json({ error: 'chainId and address required' });
      res.json(await walletSwarmService.checkAddress(chainId, address));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/swarm/block-number/:chainId', async (req, res) => {
    try {
      res.json(await walletSwarmService.getBlockNumber(req.params.chainId));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Price Alerts & Portfolio Tracker ──

  router.post('/alerts', (req, res) => {
    try { res.json(priceAlertsService.createAlert(req.body)); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/alerts', (req, res) => {
    try { res.json({ alerts: priceAlertsService.listAlerts(req.query.userId as string) }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/alerts/:id/pause', (req, res) => {
    try { const r = priceAlertsService.pauseAlert(req.params.id); 'error' in r ? res.status(400).json(r) : res.json(r); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/alerts/:id/resume', (req, res) => {
    try { const r = priceAlertsService.resumeAlert(req.params.id); 'error' in r ? res.status(400).json(r) : res.json(r); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.delete('/alerts/:id', (req, res) => {
    try { res.json(priceAlertsService.deleteAlert(req.params.id)); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/prices', (_req, res) => {
    try { res.json({ prices: priceAlertsService.getAllPrices() }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/prices/:token', (req, res) => {
    try { const p = priceAlertsService.getPrice(req.params.token); p ? res.json(p) : res.status(404).json({ error: 'Token not found' }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/portfolio/snapshot', (req, res) => {
    try { res.json(priceAlertsService.createSnapshot(req.body)); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/notifications', (req, res) => {
    try { const limit = req.query.limit ? parseInt(req.query.limit as string) : 50; res.json({ notifications: priceAlertsService.getNotifications(req.query.userId as string, limit) }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/alerts/stats', (_req, res) => {
    try { res.json(priceAlertsService.getStats()); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });
}

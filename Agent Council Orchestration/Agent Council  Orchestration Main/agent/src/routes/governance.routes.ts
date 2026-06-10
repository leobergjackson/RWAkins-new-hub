// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Governance route handlers (extracted from advanced.ts)

import { Router } from 'express';
import type { GovernanceService } from '../services/governance.service.js';

// WDK type imports for governance proposal execution via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Governance proposals that pass can trigger WDK fund transfers or parameter changes
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register AI-Only Governance System routes onto the given router.
 */
export function registerGovernanceRoutes(
  router: Router,
  governanceService: GovernanceService,
): void {

  router.post('/governance/proposals', (req, res) => {
    try {
      const result = governanceService.createProposal(req.body);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/governance/proposals', (req, res) => {
    try {
      res.json({ proposals: governanceService.listProposals(req.query.status as string) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/governance/proposals/:id', (req, res) => {
    try {
      const p = governanceService.getProposal(req.params.id);
      p ? res.json(p) : res.status(404).json({ error: 'Proposal not found' });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/governance/proposals/:id/veto', (req, res) => {
    try {
      const { agentId, reason } = req.body;
      const result = governanceService.vetoProposal(req.params.id, agentId, reason);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/governance/agents', (_req, res) => {
    try {
      res.json({ agents: governanceService.getAgents() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/governance/config', (_req, res) => {
    try {
      res.json(governanceService.getConfig());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.put('/governance/config', (req, res) => {
    try {
      res.json(governanceService.updateConfig(req.body));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/governance/stats', (_req, res) => {
    try {
      res.json(governanceService.getStats());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/governance/state', (_req, res) => {
    try {
      res.json({ governedState: governanceService.getGovernedState() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/governance/parameters', (_req, res) => {
    try {
      res.json({ parameters: governanceService.getGovernableParameters() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/governance/changelog', (_req, res) => {
    try {
      res.json({ changelog: governanceService.getChangeLog() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/governance/proposals/:id/rollback', (req, res) => {
    try {
      const { reason } = req.body;
      const result = governanceService.rollbackProposal(req.params.id, reason || 'Manual rollback');
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Tip Splitter route handlers

import { Router } from 'express';
import type { TipSplitterService, SplitShare } from '../services/tip-splitter.service.js';
import type { ChainId, TokenType } from '../types/index.js';
import { logger } from '../utils/logger.js';

// WDK type imports for tip splitting via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Split tips execute multiple WDK account.transfer() calls proportionally
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

export interface SplitRouteDeps {
  tipSplitter: TipSplitterService;
}

/**
 * Register tip-splitting routes onto the given router.
 */
export function registerSplitRoutes(router: Router, deps: SplitRouteDeps): void {
  const { tipSplitter } = deps;

  /** GET /api/splits — List all split configs */
  router.get('/splits', (_req, res) => {
    try {
      const configs = tipSplitter.listSplits();
      const stats = tipSplitter.getStats();
      res.json({ configs, stats });
    } catch (err) {
      logger.error('Failed to list splits', { error: String(err) });
      res.status(500).json({ error: 'Failed to list splits' });
    }
  });

  /** POST /api/splits — Create a new split config */
  router.post('/splits', (req, res) => {
    try {
      const { name, shares } = req.body as { name?: string; shares?: SplitShare[] };
      if (!name || !Array.isArray(shares) || shares.length === 0) {
        res.status(400).json({ error: 'name and shares[] are required' });
        return;
      }
      const config = tipSplitter.createSplit(name, shares);
      res.status(201).json(config);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Failed to create split', { error: msg });
      res.status(400).json({ error: msg });
    }
  });

  /** GET /api/splits/:id — Get a specific split config */
  router.get('/splits/:id', (req, res) => {
    try {
      const config = tipSplitter.getSplit(req.params.id);
      if (!config) {
        res.status(404).json({ error: 'Split config not found' });
        return;
      }
      const history = tipSplitter.getSplitHistory(req.params.id);
      res.json({ config, history });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/splits/:id/execute — Execute a split */
  router.post('/splits/:id/execute', async (req, res) => {
    try {
      const { amount, chainId, token } = req.body as {
        amount?: number;
        chainId?: ChainId;
        token?: TokenType;
      };
      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'amount must be a positive number' });
        return;
      }
      const result = await tipSplitter.executeSplit(
        req.params.id,
        amount,
        chainId ?? 'ethereum-sepolia',
        token ?? 'usdt',
      );
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Failed to execute split', { error: msg });
      res.status(400).json({ error: msg });
    }
  });

  /** GET /api/splits/:id/history — Get execution history for a split */
  router.get('/splits/:id/history', (req, res) => {
    try {
      const history = tipSplitter.getSplitHistory(req.params.id);
      res.json({ history });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Community Tip Pool route handlers

import { Router } from 'express';
import type { TipPoolService } from '../services/tip-pool.service.js';
import { logger } from '../utils/logger.js';

// WDK type imports for pool distribution via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Pool distribution executes batch WDK account.transfer() to all pool recipients
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register tip-pool routes onto the given router.
 * Handles: list pools, get pool, create pool, contribute, distribute, stats.
 */
export function registerPoolRoutes(
  router: Router,
  tipPoolService: TipPoolService,
): void {

  /** GET /api/pools — List all pools (optionally filter by status) */
  router.get('/pools', (_req, res) => {
    try {
      const status = typeof _req.query.status === 'string' ? _req.query.status as 'active' | 'filled' | 'distributed' | 'expired' : undefined;
      const pools = tipPoolService.getAllPools(status);
      res.json({ pools, count: pools.length });
    } catch (err) {
      logger.error('Failed to list pools', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/pools/stats — Pool aggregate statistics */
  router.get('/pools/stats', (_req, res) => {
    try {
      const stats = tipPoolService.getPoolStats();
      res.json(stats);
    } catch (err) {
      logger.error('Failed to get pool stats', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/pools/:id — Get a single pool by ID */
  router.get('/pools/:id', (req, res) => {
    try {
      const pool = tipPoolService.getPool(req.params.id);
      if (!pool) {
        res.status(404).json({ error: 'Pool not found' });
        return;
      }
      res.json({ pool });
    } catch (err) {
      logger.error('Failed to get pool', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/pools — Create a new tip pool */
  router.post('/pools', (req, res) => {
    try {
      const { creatorHandle, targetAmount, chain } = req.body ?? {};
      if (!creatorHandle || !targetAmount) {
        res.status(400).json({ error: 'creatorHandle and targetAmount are required' });
        return;
      }
      const pool = tipPoolService.createPool(
        creatorHandle,
        parseFloat(targetAmount) || 0,
        chain || 'ethereum-sepolia',
      );
      res.status(201).json({ pool });
    } catch (err) {
      logger.error('Failed to create pool', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/pools/:id/contribute — Contribute to a pool */
  router.post('/pools/:id/contribute', (req, res) => {
    try {
      const { amount, contributorAddress } = req.body ?? {};
      if (!amount || !contributorAddress) {
        res.status(400).json({ error: 'amount and contributorAddress are required' });
        return;
      }
      const pool = tipPoolService.contributeToPool(
        req.params.id,
        parseFloat(amount) || 0,
        contributorAddress,
      );
      res.json({ pool });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Failed to contribute to pool', { error: msg });
      const status = msg.includes('not found') ? 404 : msg.includes('not active') ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  });

  /** POST /api/pools/:id/distribute — Distribute a filled pool to the creator */
  router.post('/pools/:id/distribute', (req, res) => {
    try {
      const pool = tipPoolService.getPool(req.params.id);
      if (!pool) {
        res.status(404).json({ error: 'Pool not found' });
        return;
      }
      if (pool.status !== 'filled') {
        res.status(400).json({ error: `Pool is not filled (status: ${pool.status})` });
        return;
      }
      const result = tipPoolService.checkAndDistribute();
      const distributed = result.distributed.find((p) => p.id === req.params.id);
      if (distributed) {
        res.json({ pool: distributed, txHash: distributed.distributedTxHash });
      } else {
        res.status(500).json({ error: 'Distribution failed', errors: result.errors });
      }
    } catch (err) {
      logger.error('Failed to distribute pool', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });
}

// Copyright 2026 AeroFyta. Licensed under Apache-2.0.
// Chain Abstraction API Routes — unified multi-chain interface.

import { Router } from 'express';
import type { ChainAbstraction } from '../chains/chain-abstraction.js';
import { logger } from '../utils/logger.js';

export function registerChainAbstractionRoutes(
  router: Router,
  chainAbstraction: ChainAbstraction,
): void {
  // GET /api/chains — list supported chains with health status
  router.get('/chains', (_req, res) => {
    res.json({ ok: true, chains: chainAbstraction.getSupportedChains() });
  });

  // GET /api/chains/stats — chain abstraction statistics
  router.get('/chains/stats', (_req, res) => {
    res.json({ ok: true, ...chainAbstraction.getStats() });
  });

  // GET /api/chains/health — health report for all chains
  router.get('/chains/health', (_req, res) => {
    res.json({ ok: true, health: chainAbstraction.getHealthReport() });
  });

  // GET /api/chains/balances — all chain balances
  router.get('/chains/balances', async (_req, res) => {
    try {
      const balances = await chainAbstraction.getAllBalances();
      const totalUsdt = balances.reduce((s, b) => s + parseFloat(b.usdt), 0);
      res.json({ ok: true, balances, totalUsdt });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // GET /api/chains/:chain/balance — balance for a specific chain
  router.get('/chains/:chain/balance', async (req, res) => {
    try {
      const chain = req.params.chain;
      const native = await chainAbstraction.getBalance(chain);
      const usdt = await chainAbstraction.getTokenBalance(chain);
      res.json({ ok: true, chain, native, usdt });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // GET /api/chains/:chain/config — chain configuration
  router.get('/chains/:chain/config', (req, res) => {
    const config = chainAbstraction.getChainConfig(req.params.chain);
    if (!config) { res.status(404).json({ error: 'Chain not found' }); return; }
    res.json({ ok: true, config });
  });

  // POST /api/chains/:chain/estimate-gas — estimate gas for a transfer
  router.post('/chains/:chain/estimate-gas', async (req, res) => {
    try {
      const { to, amount } = req.body ?? {};
      const estimate = await chainAbstraction.estimateGas(
        req.params.chain,
        to ?? '0x0000000000000000000000000000000000000000',
        String(amount ?? '1'),
      );
      res.json({ ok: true, estimate });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/chains/best-chain — find the optimal chain for a transfer
  router.post('/chains/best-chain', async (req, res) => {
    try {
      const { amount, token } = req.body ?? {};
      const result = await chainAbstraction.getBestChainForTransfer(
        String(amount ?? '5'),
        token ?? 'USDT',
      );
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/chains/:chain/transfer — execute a transfer
  router.post('/chains/:chain/transfer', async (req, res) => {
    try {
      const { to, amount, token, memo } = req.body ?? {};
      if (!to || !amount) {
        res.status(400).json({ error: 'Missing required fields: to, amount' });
        return;
      }
      const receipt = await chainAbstraction.transfer(
        req.params.chain,
        to,
        String(amount),
        token ?? 'USDT',
        memo,
      );
      res.json({ ok: true, receipt });
    } catch (err) {
      logger.error('Transfer error', { error: err instanceof Error ? err.message : String(err) });
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // GET /api/chains/transactions — transaction log
  router.get('/chains/transactions', (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
    res.json({ ok: true, transactions: chainAbstraction.getTransactionLog(limit) });
  });

  // POST /api/chains/demo — seed demo balances
  router.post('/chains/demo', (_req, res) => {
    chainAbstraction.seedDemoBalances();
    res.json({ ok: true, message: 'Demo balances seeded across all 9 chains' });
  });

  logger.info('Chain abstraction routes mounted at /api/chains/*');
}

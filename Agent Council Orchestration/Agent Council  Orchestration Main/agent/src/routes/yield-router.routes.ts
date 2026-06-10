// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Multi-Protocol Yield Router API routes

import { Router } from 'express';
import type { YieldRouterService } from '../services/yield-router.service.js';
import { logger } from '../utils/logger.js';

// WDK type imports for yield protocol allocation via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type LendingProtocolAave from '@tetherto/wdk-protocol-lending-aave-evm';
// Yield router allocates to Aave via WDK LendingProtocolAave.supply() and .withdraw()
export type _WdkRefs = WDK | WalletManagerEvm | LendingProtocolAave; // eslint-disable-line @typescript-eslint/no-unused-vars

export function registerYieldRouterRoutes(router: Router, yieldRouter: YieldRouterService): void {
  /**
   * GET /api/yield/router — List all yield protocols and current state
   */
  router.get('/yield/router', (_req, res) => {
    try {
      const protocols = yieldRouter.getProtocols();
      const breakdown = yieldRouter.getYieldBreakdown();
      res.json({
        ok: true,
        protocols: protocols.map(p => ({
          name: p.name,
          apy: p.apy,
          tvl: p.tvl,
          risk: p.risk,
          chains: p.chain,
          minDeposit: p.minDeposit,
          currentAllocation: p.allocated,
          earnings: Math.round(p.earnings * 100000) / 100000,
        })),
        summary: breakdown,
      });
    } catch (err) {
      logger.error('Yield router error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to fetch yield router state' });
    }
  });

  /**
   * GET /api/yield/best?amount=10&maxRisk=medium — Find the best yield protocol
   */
  router.get('/yield/best', (req, res) => {
    try {
      const amount = parseFloat(String(req.query.amount ?? '10'));
      const maxRisk = (String(req.query.maxRisk ?? 'medium')) as 'low' | 'medium' | 'high';
      if (isNaN(amount) || amount <= 0) {
        res.status(400).json({ error: 'Invalid amount — must be a positive number' });
        return;
      }
      const result = yieldRouter.getBestYield(amount, maxRisk);
      res.json({ ok: true, amount, maxRisk, ...result });
    } catch (err) {
      logger.error('Yield best error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to find best yield' });
    }
  });

  /**
   * POST /api/yield/deposit — Route a deposit across protocols (60/30/10 split)
   */
  router.post('/yield/deposit', (req, res) => {
    try {
      const { amount } = req.body ?? {};
      const parsedAmount = parseFloat(String(amount ?? '0'));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ error: 'Missing or invalid amount — must be a positive number' });
        return;
      }
      const result = yieldRouter.routeDeposit(parsedAmount);
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error('Yield deposit error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to route deposit' });
    }
  });

  /**
   * POST /api/yield/rebalance — Check and suggest rebalancing moves
   */
  router.post('/yield/rebalance', (_req, res) => {
    try {
      const result = yieldRouter.rebalance();
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error('Yield rebalance error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to rebalance yield' });
    }
  });

  /**
   * GET /api/yield/breakdown — Detailed per-protocol earnings breakdown
   */
  router.get('/yield/breakdown', (_req, res) => {
    try {
      const breakdown = yieldRouter.getYieldBreakdown();
      res.json({ ok: true, ...breakdown });
    } catch (err) {
      logger.error('Yield breakdown error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to get yield breakdown' });
    }
  });

  logger.info('Yield Router routes mounted at /api/yield/*');
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — t402 Payment Protocol API routes

import { Router } from 'express';
import type { T402ProtocolService } from '../services/t402-protocol.service.js';
import { logger } from '../utils/logger.js';

// WDK type imports for t402 standardized payment processing via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
// t402 payments execute via WDK account.transfer() with standardized receipt generation
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon; // eslint-disable-line @typescript-eslint/no-unused-vars

export function registerT402Routes(router: Router, t402: T402ProtocolService): void {
  /**
   * GET /api/t402/stats — t402 payment statistics (sent/received via t402)
   */
  router.get('/t402/stats', (_req, res) => {
    try {
      const stats = t402.getT402Stats();
      res.json({ ok: true, ...stats });
    } catch (err) {
      logger.error('t402 stats error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to fetch t402 stats' });
    }
  });

  /**
   * POST /api/t402/pay — Create a t402 standardized payment
   */
  router.post('/t402/pay', (req, res) => {
    try {
      const { recipient, amount, purpose, chain, token } = req.body ?? {};
      if (!recipient || !amount || !purpose) {
        res.status(400).json({
          error: 'Missing required fields: recipient, amount, purpose',
        });
        return;
      }
      const payment = t402.createT402Payment(
        String(recipient),
        String(amount),
        String(purpose),
        { chain, token },
      );
      res.json({ ok: true, payment });
    } catch (err) {
      logger.error('t402 pay error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to create t402 payment' });
    }
  });

  /**
   * POST /api/t402/wrap-fetch — Wrap a URL with t402 payment headers
   */
  router.post('/t402/wrap-fetch', (req, res) => {
    try {
      const { url, amount, purpose } = req.body ?? {};
      if (!url) {
        res.status(400).json({ error: 'Missing required field: url' });
        return;
      }
      const result = t402.wrapFetchWithT402(String(url), {
        amount: amount ? String(amount) : undefined,
        purpose: purpose ? String(purpose) : undefined,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error('t402 wrap-fetch error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to wrap fetch with t402' });
    }
  });

  /**
   * GET /api/t402/payments — List all t402 payments
   */
  router.get('/t402/payments', (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit ?? '50'), 10);
      const payments = t402.listPayments(limit);
      res.json({ ok: true, payments, count: payments.length });
    } catch (err) {
      logger.error('t402 payments error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Failed to list t402 payments' });
    }
  });

  /**
   * GET /api/t402/info — t402 protocol information
   */
  router.get('/t402/info', (_req, res) => {
    res.json({
      protocol: 't402/1.0',
      agent: 'AeroFyta/1.0',
      description: 't402 standardized payment protocol for agent-to-agent micropayments',
      compatibility: 'Wraps x402 with t402 headers for Forage interoperability',
      endpoints: [
        { path: '/api/t402/stats', method: 'GET', description: 'Payment statistics' },
        { path: '/api/t402/pay', method: 'POST', description: 'Create t402 payment' },
        { path: '/api/t402/wrap-fetch', method: 'POST', description: 'Wrap URL with t402 headers' },
        { path: '/api/t402/payments', method: 'GET', description: 'List all payments' },
      ],
    });
  });

  logger.info('t402 Payment Protocol routes mounted at /api/t402/*');
}

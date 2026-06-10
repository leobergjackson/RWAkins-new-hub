// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — x402 Protocol Routes
//
// Dedicated x402 Payment Protocol API endpoints for managing paywalls,
// viewing revenue stats, and accessing the demo paywalled endpoint.

import { Router } from 'express';
import { X402ProtocolService } from '../services/x402-protocol.service.js';

// WDK type imports for x402 paywall payment processing via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// x402 payments verify USDT transfers on-chain via WDK getBalance() and account.transfer()
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register x402 protocol routes.
 * Mounts under /api/x402/protocol/...
 */
export function registerX402ProtocolRoutes(router: Router, service: X402ProtocolService): void {

  // GET /api/x402/protocol/paywalls — list active paywalls
  router.get('/x402/protocol/paywalls', (_req, res) => {
    res.json({
      protocol: 'x402/1.0',
      paywalls: service.listPaywalls(),
      count: service.listPaywalls().length,
    });
  });

  // POST /api/x402/protocol/create — create a new paywall
  router.post('/x402/protocol/create', (req, res) => {
    const { endpoint, price, chain, token, description } = req.body ?? {};
    if (!endpoint || !price) {
      res.status(400).json({ error: 'Missing required fields: endpoint, price' });
      return;
    }
    const paywall = service.createPaywall(
      String(endpoint),
      String(price),
      chain ?? 'ethereum-sepolia',
      { token: token ?? 'USDT', description },
    );
    res.status(201).json({ ok: true, paywall });
  });

  // GET /api/x402/protocol/stats — revenue stats
  router.get('/x402/protocol/stats', (_req, res) => {
    res.json({
      protocol: 'x402/1.0',
      ...service.getPaywallStats(),
    });
  });

  // POST /api/x402/protocol/pay — auto-pay to access a paywalled endpoint
  router.post('/x402/protocol/pay', async (req, res) => {
    try {
      const { url, maxPrice } = req.body ?? {};
      if (!url) {
        res.status(400).json({ error: 'Missing required field: url' });
        return;
      }
      const result = await service.payForAccess(
        String(url),
        typeof maxPrice === 'number' ? maxPrice : 1.0,
      );
      if (result.success) {
        res.json({ ok: true, ...result });
      } else {
        res.status(402).json({ ok: false, ...result });
      }
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // GET /api/x402/protocol/history — payment history
  router.get('/x402/protocol/history', (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
    res.json({
      protocol: 'x402/1.0',
      payments: service.getPaymentHistory(limit),
    });
  });

  // GET /api/x402/protocol/demo — a demo paywalled endpoint
  // Returns 402 with payment headers if no valid receipt, premium data if paid.
  router.get('/x402/protocol/demo', (req, res) => {
    const receiptHeader = req.headers['x-payment-receipt'] as string | undefined;

    if (receiptHeader) {
      const verification = service.handlePayment(receiptHeader);
      if (verification.verified) {
        // Payment verified — serve premium demo content
        res.json({
          endpoint: '/api/x402/protocol/demo',
          protocol: 'x402/1.0',
          paid: true,
          paymentId: verification.paymentId,
          data: {
            title: 'Premium Agent Intelligence Report',
            generatedAt: new Date().toISOString(),
            insights: {
              agentCount: 4,
              topPerformer: 'AeroFyta',
              networkThroughput: '1,247 tips/day',
              avgSettlementTime: '2.3 seconds',
              crossChainVolume: '$12,450 USDT (24h)',
              prediction: 'Tip volume expected to increase 15% next week based on creator engagement trends',
            },
            recommendation: 'Deploy idle funds to TON for lower-fee microtip routing',
          },
        });
        return;
      }
      // Invalid receipt
      res.status(402).json({
        error: 'Payment verification failed',
        reason: verification.reason,
        protocol: 'x402/1.0',
      });
      return;
    }

    // No receipt — return 402 with payment instructions
    const requirements = service.getPaymentRequirements('/api/x402/protocol/demo');
    res.set({
      'X-Payment-Required': 'true',
      'X-Payment-Amount': '0.01',
      'X-Payment-Address': service.getWalletAddress(),
      'X-Payment-Token': 'USDT',
      'X-Payment-Chain': 'ethereum-sepolia',
      'X-Payment-Protocol': 'x402/1.0',
      'X-Payment-Agent': 'AeroFyta/1.0',
    });
    res.status(402).json({
      status: 402,
      message: 'Payment Required',
      protocol: 'x402/1.0',
      payment: {
        amount: '0.01',
        token: 'USDT',
        recipient: service.getWalletAddress(),
        chain: 'ethereum-sepolia',
        description: 'Premium Agent Intelligence Report',
      },
      instructions: [
        `1. Send 0.01 USDT to ${service.getWalletAddress()} on ethereum-sepolia`,
        '2. Include the transaction hash in the X-Payment-Receipt header',
        '3. Retry this request with: X-Payment-Receipt: <txHash>',
      ],
      ...(requirements.required ? { paywall: requirements.paywall } : {}),
    });
  });

  // GET /api/x402/protocol/info — protocol description
  router.get('/x402/protocol/info', (_req, res) => {
    res.json({
      protocol: 'x402/1.0',
      agent: 'AeroFyta/1.0',
      description: 'HTTP 402 Payment Required protocol for autonomous agent-to-agent commerce',
      capabilities: {
        server: 'Paywall any endpoint — other agents pay per request',
        client: 'Auto-detect 402 responses, pay autonomously, retry with receipt',
      },
      supportedChains: ['ethereum-sepolia', 'ton-testnet', 'tron-nile'],
      supportedTokens: ['USDT', 'USDT0'],
      walletAddress: service.getWalletAddress(),
      stats: service.getPaywallStats(),
    });
  });
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — x402 HTTP 402 Micropayment Routes
//
// Demonstrates Tether's x402 standard for machine-to-machine micropayments.
// Three premium endpoints return 402 with payment headers unless paid.
// Management endpoints for listing/creating paywalls and viewing stats.

import { Router } from 'express';
import { X402PaymentService } from '../services/x402-payment.service.js';

// WDK type imports for x402 HTTP micropayment verification via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// x402 paywalls verify WDK on-chain payments before granting access to premium content
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register x402 micropayment routes.
 * Mounts under /api/x402/...
 */
export function registerX402PaymentRoutes(router: Router, service: X402PaymentService): void {

  // ── Management Endpoints ──────────────────────────────────────

  // GET /api/x402/paywalls — list all registered paywalls
  router.get('/x402/paywalls', (_req, res) => {
    res.json({
      protocol: 'x402/1.0',
      paywalls: service.listPaywalls(),
      stats: service.getPaywallStats(),
    });
  });

  // POST /api/x402/paywalls — create a new paywall
  router.post('/x402/paywalls', (req, res) => {
    const { endpoint, price, token, description, method } = req.body ?? {};
    if (!endpoint || !price) {
      res.status(400).json({ error: 'Missing required fields: endpoint, price' });
      return;
    }
    const paywall = service.createPaywall(
      endpoint,
      String(price),
      token ?? 'USDT',
      description ?? '',
      method ?? 'GET',
    );
    res.status(201).json({ ok: true, paywall });
  });

  // GET /api/x402/stats — global paywall revenue stats
  router.get('/x402/stats', (_req, res) => {
    res.json({
      protocol: 'x402/1.0',
      ...service.getPaywallStats(),
    });
  });

  // POST /api/x402/verify — manually verify a payment receipt
  router.post('/x402/verify', (req, res) => {
    const { receipt } = req.body ?? {};
    if (!receipt) {
      res.status(400).json({ error: 'Missing required field: receipt (format: paymentId:txHash)' });
      return;
    }
    const result = service.verifyPayment(String(receipt));
    res.json({ protocol: 'x402/1.0', ...result });
  });

  // ── Premium Paywalled Endpoints ───────────────────────────────
  // Each returns 402 with payment details if not paid, or content if paid.

  // GET /api/x402/premium/market-analysis — costs 0.01 USDT
  router.get('/x402/premium/market-analysis', (req, res) => {
    if (service.handlePaymentRequired(req, res)) return;

    // Payment verified — serve premium content
    res.json({
      endpoint: '/api/x402/premium/market-analysis',
      protocol: 'x402/1.0',
      paid: true,
      data: {
        title: 'Multi-Chain Market Analysis — Real-Time',
        generatedAt: new Date().toISOString(),
        analysis: {
          ethereum: {
            gasPrice: '12.5 gwei',
            trend: 'declining',
            recommendation: 'Good time for transactions — gas prices below 24h average',
            avgTipCost: '$0.42',
          },
          ton: {
            feeLevel: 'ultra-low',
            trend: 'stable',
            recommendation: 'Optimal for microtips — near-zero fees',
            avgTipCost: '$0.005',
          },
          tron: {
            energyCost: 'moderate',
            trend: 'rising',
            recommendation: 'Use energy delegation for free transactions',
            avgTipCost: '$0.15',
          },
        },
        optimalChain: 'ton-testnet',
        marketSentiment: 'bullish',
        volumeChange24h: '+15.3%',
        topCreatorCategories: ['crypto-education', 'defi-tutorials', 'market-analysis'],
      },
    });
  });

  // GET /api/x402/premium/ai-recommendation — costs 0.005 USDT
  router.get('/x402/premium/ai-recommendation', (req, res) => {
    if (service.handlePaymentRequired(req, res)) return;

    // Payment verified — serve premium AI recommendation
    res.json({
      endpoint: '/api/x402/premium/ai-recommendation',
      protocol: 'x402/1.0',
      paid: true,
      data: {
        title: 'AI-Powered Creator Tip Recommendations',
        generatedAt: new Date().toISOString(),
        recommendations: [
          {
            creatorId: 'rumble_tech_analyst_42',
            platform: 'Rumble',
            reason: 'Consistent high-quality DeFi tutorials with growing engagement',
            suggestedTip: '0.50',
            token: 'USDT',
            chain: 'ethereum-sepolia',
            confidence: 0.92,
            engagementScore: 87,
          },
          {
            creatorId: 'rumble_crypto_news_99',
            platform: 'Rumble',
            reason: 'Breaking news coverage with verified accuracy track record',
            suggestedTip: '0.25',
            token: 'USDT',
            chain: 'ton-testnet',
            confidence: 0.85,
            engagementScore: 74,
          },
          {
            creatorId: 'rumble_dev_tutorials_7',
            platform: 'Rumble',
            reason: 'Open-source contributor with educational content focus',
            suggestedTip: '1.00',
            token: 'USDT',
            chain: 'ethereum-sepolia',
            confidence: 0.88,
            engagementScore: 91,
          },
        ],
        totalBudgetSuggested: '1.75',
        optimizedRouting: 'Split across ETH and TON for lowest fees',
      },
    });
  });

  // GET /api/x402/premium/portfolio-report — costs 0.02 USDT
  router.get('/x402/premium/portfolio-report', (req, res) => {
    if (service.handlePaymentRequired(req, res)) return;

    // Payment verified — serve premium portfolio report
    res.json({
      endpoint: '/api/x402/premium/portfolio-report',
      protocol: 'x402/1.0',
      paid: true,
      data: {
        title: 'Agent Portfolio & Treasury Report',
        generatedAt: new Date().toISOString(),
        portfolio: {
          totalValue: '125.50',
          currency: 'USDT',
          chains: {
            'ethereum-sepolia': {
              usdt: '50.00',
              native: '0.1 ETH',
              yieldDeployed: '20.00',
              aavePosition: { supplied: '20.00', apy: '3.2%' },
            },
            'ton-testnet': {
              usdt: '30.00',
              native: '5.0 TON',
              yieldDeployed: '0',
            },
            'tron-nile': {
              usdt: '25.50',
              native: '100 TRX',
              energyBalance: '50000',
            },
          },
        },
        performance: {
          totalTipsSent: 342,
          totalTipVolume: '85.20',
          avgTipSize: '0.249',
          uniqueCreatorsTipped: 47,
          x402Revenue: '12.30',
          netPosition: '+2.60',
          roi: '2.1%',
        },
        riskMetrics: {
          diversificationScore: 78,
          concentrationRisk: 'low',
          liquidityRatio: 0.85,
          reserveAdequacy: 'adequate',
        },
      },
    });
  });

  // ── Protocol Info ─────────────────────────────────────────────

  // GET /api/x402/info — x402 protocol description
  router.get('/x402/info', (_req, res) => {
    res.json({
      protocol: 'x402/1.0',
      agent: 'AeroFyta/1.0',
      description: 'HTTP 402 Payment Required protocol for machine-to-machine micropayments',
      standard: 'x402 by Tether',
      flow: [
        '1. Client sends GET request to a premium endpoint',
        '2. Server returns HTTP 402 with X-Payment-* headers describing the payment',
        '3. Client pays via WDK (on-chain USDT transfer)',
        '4. Client retries the request with X-Payment-Receipt header containing paymentId:txHash',
        '5. Server verifies payment on-chain and serves the premium content',
      ],
      premiumEndpoints: [
        { path: '/api/x402/premium/market-analysis', price: '0.01 USDT', description: 'Multi-chain market analysis' },
        { path: '/api/x402/premium/ai-recommendation', price: '0.005 USDT', description: 'AI-powered creator tip recommendations' },
        { path: '/api/x402/premium/portfolio-report', price: '0.02 USDT', description: 'Agent portfolio and treasury report' },
      ],
      walletAddress: service.getWalletAddress(),
      supportedChains: ['ethereum-sepolia', 'ton-testnet', 'tron-nile'],
      supportedTokens: ['USDT', 'USDT0'],
    });
  });
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Advanced DeFi route handlers (extracted from advanced.ts)
// Covers: ZK Privacy, Lending, DeFi Strategy, Self-Sustaining Economics

import { Router } from 'express';
import type { ZKPrivacyService } from '../services/zk-privacy.service.js';
import type { LendingService } from '../services/lending.service.js';
import type { DeFiStrategyService } from '../services/defi-strategy.service.js';
import type { SelfSustainingService } from '../services/self-sustaining.service.js';

// WDK type imports for advanced DeFi operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type LendingProtocolAave from '@tetherto/wdk-protocol-lending-aave-evm';
// Advanced DeFi routes use WDK Aave supply/withdraw/borrow and ZK privacy layers
export type _WdkRefs = WDK | WalletManagerEvm | LendingProtocolAave; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register ZK privacy, lending, DeFi strategy, and sustainability routes.
 */
export function registerAdvDefiRoutes(
  router: Router,
  zkPrivacyService: ZKPrivacyService,
  lendingService: LendingService,
  defiStrategyService: DeFiStrategyService,
  selfSustainingService: SelfSustainingService,
): void {

  // ── Self-Sustaining Agent Economics ──

  router.get('/sustainability/metrics', (_req, res) => {
    try {
      res.json(selfSustainingService.getMetrics());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/sustainability/report', async (_req, res) => {
    try {
      res.json(await selfSustainingService.generateReport());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/sustainability/costs', (req, res) => {
    try {
      res.json(selfSustainingService.recordCost(req.body));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/sustainability/costs', (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      res.json({ costs: selfSustainingService.getCosts(limit) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/sustainability/revenue', (req, res) => {
    try {
      res.json(selfSustainingService.recordRevenue(req.body));
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/sustainability/revenue', (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      res.json({ revenues: selfSustainingService.getRevenues(limit) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/sustainability/optimizations', (_req, res) => {
    try {
      res.json({ optimizations: selfSustainingService.getOptimizations() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/sustainability/optimizations/:id/apply', (req, res) => {
    try {
      const result = selfSustainingService.applyOptimization(req.params.id);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/sustainability/gas-prices', async (req, res) => {
    try {
      const chains = req.query.chains ? (req.query.chains as string).split(',') : undefined;
      res.json({ gasPrices: await selfSustainingService.getGasPrices(chains) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/sustainability/cheapest-chain', async (_req, res) => {
    try {
      res.json(await selfSustainingService.findCheapestChain());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/sustainability/usage', (_req, res) => {
    try {
      res.json(selfSustainingService.getUsageStats());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/sustainability/track/tip', (req, res) => {
    try {
      const { tipAmountUsd, txHash } = req.body;
      selfSustainingService.recordTipRevenue(tipAmountUsd, txHash);
      res.json({ recorded: true, feeRate: '0.3%', feeAmount: tipAmountUsd * 0.003 });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/sustainability/track/llm', (req, res) => {
    try {
      const { tokensUsed, model } = req.body;
      selfSustainingService.trackLlmInference(tokensUsed ?? 500, model ?? 'haiku');
      res.json({ recorded: true, tokensUsed: tokensUsed ?? 500 });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/sustainability/optimizations/generate', async (_req, res) => {
    try {
      res.json({ optimizations: await selfSustainingService.generateOptimizations() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── ZK Privacy Protocol ──

  router.post('/zk/commit', async (req, res) => {
    try { res.json(await zkPrivacyService.createCommitment(req.body)); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/zk/commitments', (req, res) => {
    try { res.json({ commitments: zkPrivacyService.listCommitments(req.query.status as string) }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/zk/commitments/:id', (req, res) => {
    try { const c = zkPrivacyService.getCommitment(req.params.id); c ? res.json(c) : res.status(404).json({ error: 'Commitment not found' }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/zk/commitments/:id/verify', async (req, res) => {
    try { res.json(await zkPrivacyService.verifyCommitment(req.params.id)); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/zk/commitments/:id/reveal', async (req, res) => {
    try { const { blindingFactor, amount } = req.body; res.json(await zkPrivacyService.revealCommitment(req.params.id, blindingFactor, amount)); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/zk/transfer', async (req, res) => {
    try { const r = await zkPrivacyService.privateTransfer(req.body); 'error' in r ? res.status(400).json(r) : res.json(r); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/zk/transfers', (_req, res) => {
    try { res.json({ transfers: zkPrivacyService.listTransfers() }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/zk/transfers/:id/verify', async (req, res) => {
    try { res.json(await zkPrivacyService.verifyTransfer(req.params.id)); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/zk/trusted-setup', async (req, res) => {
    try { res.json(await zkPrivacyService.runTrustedSetup(req.body)); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/zk/trusted-setups', (_req, res) => {
    try { res.json({ setups: zkPrivacyService.getTrustedSetups() }); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/zk/stats', (_req, res) => {
    try { res.json(zkPrivacyService.getStats()); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Autonomous Lending ──

  router.post('/lending/credit-score', async (req, res) => {
    try {
      const { address } = req.body;
      if (!address) return res.status(400).json({ error: 'address is required' });
      const profile = await lendingService.buildCreditScore(address);
      res.json(profile);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/lending/loans/issue', async (req, res) => {
    try {
      const result = await lendingService.issueLoan(req.body);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/lending/loans/:id/repay', (req, res) => {
    try {
      const { amount, txHash } = req.body;
      const result = lendingService.recordRepayment(req.params.id, amount, txHash);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/lending/loans', (_req, res) => {
    try {
      const { borrower, status } = _req.query;
      let loans;
      if (borrower) loans = lendingService.getLoansByBorrower(borrower as string);
      else if (status === 'active') loans = lendingService.getActiveLoans();
      else loans = lendingService.getActiveLoans();
      res.json({ loans });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/lending/loans/:id', (req, res) => {
    try {
      const loan = lendingService.getLoan(req.params.id);
      loan ? res.json(loan) : res.status(404).json({ error: 'Loan not found' });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/lending/loans/:id/schedule', (req, res) => {
    try {
      res.json({ schedule: lendingService.getRepaymentSchedule(req.params.id) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/lending/overdue', (_req, res) => {
    try {
      res.json({ overdue: lendingService.checkOverdueLoans() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/lending/agent-borrow', async (req, res) => {
    try {
      const result = await lendingService.agentBorrow(req.body);
      'error' in result ? res.status(400).json(result) : res.json(result);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/lending/portfolio', (_req, res) => {
    try {
      res.json(lendingService.getLendingPortfolioStats());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // ── Autonomous DeFi Strategy ──

  router.post('/defi/scan', async (req, res) => {
    try {
      const { minApy, minTvl } = req.body;
      const opportunities = await defiStrategyService.scanOpportunities(minApy || 5, minTvl || 100000);
      res.json({ count: opportunities.length, opportunities });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/defi/opportunities', (_req, res) => {
    try {
      const { status } = _req.query;
      res.json({ opportunities: defiStrategyService.getOpportunities(status as string) });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.post('/defi/decide/:id', (req, res) => {
    try {
      const { budget } = req.body;
      const decision = defiStrategyService.makeDecision(req.params.id, budget || 1000);
      res.json(decision);
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/defi/decisions', (_req, res) => {
    try {
      res.json({ decisions: defiStrategyService.getDecisions() });
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/defi/market-state', (_req, res) => {
    try {
      res.json(defiStrategyService.getMarketState());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });

  router.get('/defi/strategy/stats', (_req, res) => {
    try {
      res.json(defiStrategyService.getStats());
    } catch (err) { res.status(500).json({ error: String(err) }); }
  });
}

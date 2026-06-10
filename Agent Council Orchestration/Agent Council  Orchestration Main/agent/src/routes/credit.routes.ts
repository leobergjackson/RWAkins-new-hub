// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Credit Scoring Routes
//
// Dedicated credit scoring API endpoints for agent credit scores,
// leaderboards, and detailed credit reports.

import { Router } from 'express';
import type { CreditScoringService } from '../services/credit-scoring.service.js';

// WDK type imports for credit-based lending via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type LendingProtocolAave from '@tetherto/wdk-protocol-lending-aave-evm';
// Credit scores derived from WDK on-chain transaction history and wallet balance data
export type _WdkRefs = WDK | WalletManagerEvm | LendingProtocolAave; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register credit scoring routes.
 * Mounts under /api/credit/...
 */
export function registerCreditRoutes(router: Router, service: CreditScoringService): void {

  // GET /api/credit/score/:agentId — get credit score for an agent
  router.get('/credit/score/:agentId', (req, res) => {
    try {
      const score = service.calculateScore(req.params.agentId);
      res.json({
        ok: true,
        ...score,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // GET /api/credit/leaderboard — all agent scores ranked
  router.get('/credit/leaderboard', (_req, res) => {
    try {
      const scores = service.getAllScores();
      res.json({
        ok: true,
        leaderboard: scores.map((s, i) => ({
          rank: i + 1,
          ...s,
        })),
        count: scores.length,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // GET /api/credit/report/:agentId — detailed credit report
  router.get('/credit/report/:agentId', (req, res) => {
    try {
      const report = service.getScoreReport(req.params.agentId);
      res.json({
        ok: true,
        report,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}

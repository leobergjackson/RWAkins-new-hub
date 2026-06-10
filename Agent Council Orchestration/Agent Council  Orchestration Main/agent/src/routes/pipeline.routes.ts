// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Transaction Pipeline API Routes
// Exposes the 8-stage transaction pipeline via REST endpoints.

import { Router } from 'express';
import { logger } from '../utils/logger.js';
import type { TransactionPipeline } from '../pipeline/transaction-pipeline.js';
import type { TipParams, EscrowParams, SwapParams, BridgeParams, YieldParams } from '../pipeline/transaction-pipeline.js';
import type { ChainId, TokenType } from '../types/index.js';

/**
 * Register pipeline routes on the given Express router.
 *
 * Endpoints:
 *   GET  /api/pipeline/status  — current pipeline state + nonce states
 *   GET  /api/pipeline/history — completed transactions with full pipeline trace
 *   GET  /api/pipeline/stats   — aggregate pipeline statistics
 *   POST /api/pipeline/simulate — dry-run a transaction through validate→quote→approve
 *   POST /api/pipeline/execute/tip    — execute a tip through the full pipeline
 *   POST /api/pipeline/execute/escrow — execute an escrow through the full pipeline
 *   POST /api/pipeline/execute/swap   — execute a swap through the full pipeline
 *   POST /api/pipeline/execute/bridge — execute a bridge through the full pipeline
 *   POST /api/pipeline/execute/yield  — execute a yield deposit through the full pipeline
 *   GET  /api/pipeline/gas/history    — gas optimization history
 *   GET  /api/pipeline/gas/savings    — total gas savings
 *   GET  /api/pipeline/verify/proofs  — on-chain verification proofs
 *   GET  /api/pipeline/verify/stats   — verification statistics
 *   GET  /api/pipeline/nonce/state    — nonce manager state per chain
 */
export function registerPipelineRoutes(
  router: Router,
  pipeline: TransactionPipeline,
): void {

  // ── Status ─────────────────────────────────────────────────────

  /**
   * @openapi
   * /api/pipeline/status:
   *   get:
   *     summary: Current pipeline execution state
   *     tags: [Pipeline]
   */
  router.get('/pipeline/status', (_req, res) => {
    try {
      const active = pipeline.getActivePipeline();
      const nonceStates = pipeline.getNonceManager().getAllStates();
      const stats = pipeline.getStats();

      res.json({
        active,
        nonceStates,
        stats,
        gasOptimizer: pipeline.getGasOptimizer().getTotalSavings(),
        verifier: pipeline.getReceiptVerifier().getStats(),
      });
    } catch (err) {
      logger.error('Pipeline status error', { error: String(err) });
      res.status(500).json({ error: 'Failed to get pipeline status' });
    }
  });

  // ── History ────────────────────────────────────────────────────

  /**
   * @openapi
   * /api/pipeline/history:
   *   get:
   *     summary: Completed transactions with full pipeline trace
   *     tags: [Pipeline]
   */
  router.get('/pipeline/history', (req, res) => {
    try {
      const history = pipeline.getHistory();
      const limit = parseInt(String(req.query.limit ?? '50'), 10);
      const offset = parseInt(String(req.query.offset ?? '0'), 10);

      const page = history.slice(offset, offset + limit);

      res.json({
        total: history.length,
        offset,
        limit,
        results: page,
      });
    } catch (err) {
      logger.error('Pipeline history error', { error: String(err) });
      res.status(500).json({ error: 'Failed to get pipeline history' });
    }
  });

  // ── Stats ──────────────────────────────────────────────────────

  router.get('/pipeline/stats', (_req, res) => {
    try {
      res.json(pipeline.getStats());
    } catch (err) {
      res.status(500).json({ error: 'Failed to get pipeline stats' });
    }
  });

  // ── Simulate (dry-run) ─────────────────────────────────────────

  /**
   * @openapi
   * /api/pipeline/simulate:
   *   post:
   *     summary: Dry-run a transaction through the pipeline (validate → quote → approve)
   *     tags: [Pipeline]
   */
  router.post('/pipeline/simulate', async (req, res) => {
    try {
      const { type, ...params } = req.body as { type: string } & Record<string, unknown>;

      if (!type || !['tip', 'escrow', 'swap', 'bridge', 'yield'].includes(type)) {
        res.status(400).json({ error: 'type must be one of: tip, escrow, swap, bridge, yield' });
        return;
      }

      const result = await pipeline.simulate(
        type as 'tip' | 'escrow' | 'swap' | 'bridge' | 'yield',
        params,
      );

      res.json({
        simulation: true,
        ...result,
      });
    } catch (err) {
      logger.error('Pipeline simulation error', { error: String(err) });
      res.status(500).json({ error: 'Simulation failed', detail: String(err) });
    }
  });

  // ── Execute Endpoints ──────────────────────────────────────────

  /**
   * POST /api/pipeline/execute/tip
   * Execute a tip through the full 8-stage pipeline.
   */
  router.post('/pipeline/execute/tip', async (req, res) => {
    try {
      const params: TipParams = {
        recipient: String(req.body.recipient ?? ''),
        amount: String(req.body.amount ?? '0'),
        token: (req.body.token ?? 'usdt') as TokenType,
        preferredChain: req.body.preferredChain as ChainId | undefined,
        memo: req.body.memo as string | undefined,
      };

      logger.info('Pipeline execute: TIP', { recipient: params.recipient.slice(0, 16), amount: params.amount });
      const result = await pipeline.executeTip(params);
      res.json(result);
    } catch (err) {
      logger.error('Pipeline tip execution error', { error: String(err) });
      res.status(500).json({ error: 'Pipeline execution failed', detail: String(err) });
    }
  });

  /**
   * POST /api/pipeline/execute/escrow
   */
  router.post('/pipeline/execute/escrow', async (req, res) => {
    try {
      const params: EscrowParams = {
        recipient: String(req.body.recipient ?? ''),
        amount: String(req.body.amount ?? '0'),
        token: (req.body.token ?? 'usdt') as TokenType,
        expiresInHours: parseFloat(req.body.expiresInHours ?? '24'),
        chainId: req.body.chainId as ChainId | undefined,
        condition: req.body.condition as string | undefined,
      };

      const result = await pipeline.executeEscrow(params);
      res.json(result);
    } catch (err) {
      logger.error('Pipeline escrow execution error', { error: String(err) });
      res.status(500).json({ error: 'Pipeline execution failed', detail: String(err) });
    }
  });

  /**
   * POST /api/pipeline/execute/swap
   */
  router.post('/pipeline/execute/swap', async (req, res) => {
    try {
      const params: SwapParams = {
        fromToken: String(req.body.fromToken ?? ''),
        toToken: String(req.body.toToken ?? ''),
        amount: String(req.body.amount ?? '0'),
        chainId: req.body.chainId as ChainId | undefined,
        slippage: req.body.slippage ? parseFloat(req.body.slippage) : undefined,
      };

      const result = await pipeline.executeSwap(params);
      res.json(result);
    } catch (err) {
      logger.error('Pipeline swap execution error', { error: String(err) });
      res.status(500).json({ error: 'Pipeline execution failed', detail: String(err) });
    }
  });

  /**
   * POST /api/pipeline/execute/bridge
   */
  router.post('/pipeline/execute/bridge', async (req, res) => {
    try {
      const params: BridgeParams = {
        fromChain: req.body.fromChain as ChainId,
        toChain: req.body.toChain as ChainId,
        amount: String(req.body.amount ?? '0'),
        token: String(req.body.token ?? 'usdt'),
      };

      const result = await pipeline.executeBridge(params);
      res.json(result);
    } catch (err) {
      logger.error('Pipeline bridge execution error', { error: String(err) });
      res.status(500).json({ error: 'Pipeline execution failed', detail: String(err) });
    }
  });

  /**
   * POST /api/pipeline/execute/yield
   */
  router.post('/pipeline/execute/yield', async (req, res) => {
    try {
      const params: YieldParams = {
        amount: String(req.body.amount ?? '0'),
        token: String(req.body.token ?? 'usdt'),
        protocol: String(req.body.protocol ?? 'aave'),
        chainId: req.body.chainId as ChainId | undefined,
      };

      const result = await pipeline.executeYieldDeposit(params);
      res.json(result);
    } catch (err) {
      logger.error('Pipeline yield execution error', { error: String(err) });
      res.status(500).json({ error: 'Pipeline execution failed', detail: String(err) });
    }
  });

  // ── Gas Optimizer Endpoints ────────────────────────────────────

  router.get('/pipeline/gas/history', (_req, res) => {
    try {
      res.json({ history: pipeline.getGasOptimizer().getHistory() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get gas history' });
    }
  });

  router.get('/pipeline/gas/savings', (_req, res) => {
    try {
      res.json(pipeline.getGasOptimizer().getTotalSavings());
    } catch (err) {
      res.status(500).json({ error: 'Failed to get gas savings' });
    }
  });

  // ── Verification Endpoints ─────────────────────────────────────

  router.get('/pipeline/verify/proofs', (_req, res) => {
    try {
      res.json({ proofs: pipeline.getReceiptVerifier().getProofs() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get verification proofs' });
    }
  });

  router.get('/pipeline/verify/stats', (_req, res) => {
    try {
      res.json(pipeline.getReceiptVerifier().getStats());
    } catch (err) {
      res.status(500).json({ error: 'Failed to get verification stats' });
    }
  });

  // ── Nonce Manager Endpoints ────────────────────────────────────

  router.get('/pipeline/nonce/state', (_req, res) => {
    try {
      res.json({ chains: pipeline.getNonceManager().getAllStates() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get nonce state' });
    }
  });

  logger.info('Transaction pipeline routes mounted at /api/pipeline/*');
}

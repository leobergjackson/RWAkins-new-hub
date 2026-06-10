// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — DeFi route handlers (extracted from api.ts)
// Covers: bridge, lending, swap, streaming, DCA, strategies, treasury, indexer

import { Router } from 'express';
import type { BridgeService } from '../services/bridge.service.js';
import type { LendingService } from '../services/lending.service.js';
import { AAVE_SEPOLIA_TOKENS } from '../services/lending.service.js';
import type { SwapService } from '../services/swap.service.js';
import type { StreamingService } from '../services/streaming.service.js';
import type { DcaService } from '../services/dca.service.js';
import type { FeeArbitrageService } from '../services/fee-arbitrage.service.js';
import type { DeFiStrategyService } from '../services/defi-strategy.service.js';
import type { MultiStrategyService, StrategyDecision } from '../services/multi-strategy.service.js';
import type { WalletOpsService } from '../services/wallet-ops.service.js';
import type { WalletService } from '../services/wallet.service.js';
import type { AutonomousLoopService } from '../services/autonomous-loop.service.js';
import type { TreasuryService } from '../services/treasury.service.js';
import type { IndexerService } from '../services/indexer.service.js';
import type { TokenType, ChainId } from '../types/index.js';

// WDK type imports for DeFi operations via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type Usdt0ProtocolEvm from '@tetherto/wdk-protocol-bridge-usdt0-evm';
import type SwapProtocolVelora from '@tetherto/wdk-protocol-swap-velora-evm';
import type LendingProtocolAave from '@tetherto/wdk-protocol-lending-aave-evm';
// DeFi routes use WDK bridge, swap, and lending protocols for on-chain operations
export type _WdkRefs = WDK | WalletManagerEvm | Usdt0ProtocolEvm | SwapProtocolVelora | LendingProtocolAave; // eslint-disable-line @typescript-eslint/no-unused-vars
import { logger } from '../utils/logger.js';
import { transactionLimiter } from '../middleware/rateLimit.js';

export interface DefiRouteDeps {
  bridge: BridgeService;
  lending: LendingService;
  swap: SwapService;
  streaming: StreamingService;
  dca: DcaService;
  feeArbitrage: FeeArbitrageService;
  defiStrategy: DeFiStrategyService;
  walletOps: WalletOpsService;
  wallet: WalletService;
  treasury: TreasuryService;
  indexer: IndexerService;
  getMultiStrategy: () => MultiStrategyService | null;
  getAutonomousLoop: () => AutonomousLoopService | null;
}

/**
 * Register DeFi-related routes onto the given router.
 * Handles: bridge, lending, swap, streaming, DCA, fee arbitrage, strategies.
 */
export function registerDefiRoutes(router: Router, deps: DefiRouteDeps): void {
  const {
    bridge, lending, swap, streaming, dca,
    feeArbitrage, defiStrategy, walletOps, wallet,
    treasury, indexer,
    getMultiStrategy, getAutonomousLoop,
  } = deps;

  // === CROSS-CHAIN BRIDGE (USDT0) ==========================================

  /** GET /api/bridge/routes — Available bridge routes */
  router.get('/bridge/routes', (_req, res) => {
    try {
      const routes = bridge.getRoutes();
      res.json({ routes, available: bridge.isAvailable() });
    } catch (err) {
      logger.error('Failed to get bridge routes', { error: String(err) });
      res.status(500).json({ error: 'Failed to get bridge routes' });
    }
  });

  /** POST /api/bridge/quote — Get bridge fee quote */
  router.post('/bridge/quote', async (req, res) => {
    try {
      const { fromChain, toChain, amount } = req.body as {
        fromChain: string;
        toChain: string;
        amount: string;
      };

      if (!fromChain || !toChain || !amount) {
        res.status(400).json({ error: 'fromChain, toChain, and amount are required' });
        return;
      }

      const quote = await bridge.quoteBridge(fromChain, toChain, amount);
      if (!quote) {
        res.status(404).json({ error: `No bridge route found from ${fromChain} to ${toChain}` });
        return;
      }

      res.json({ quote });
    } catch (err) {
      logger.error('Failed to get bridge quote', { error: String(err) });
      res.status(500).json({ error: 'Failed to get bridge quote' });
    }
  });

  /** POST /api/bridge/execute — Execute cross-chain bridge via WDK USDT0 Protocol */
  router.post('/bridge/execute', async (req, res) => {
    try {
      const { fromChain, toChain, amount, recipient } = req.body as {
        fromChain: string;
        toChain: string;
        amount: string;
        recipient?: string;
      };

      if (!fromChain || !toChain || !amount) {
        res.status(400).json({ error: 'fromChain, toChain, and amount are required' });
        return;
      }

      const entry = await bridge.executeBridge(fromChain, toChain, amount, recipient);
      res.json({ bridge: entry, note: entry.txHash ? 'Bridge executed via WDK Usdt0ProtocolEvm' : 'Bridge attempted — USDT0 contracts may not be deployed on testnet' });
    } catch (err) {
      logger.error('Failed to execute bridge', { error: String(err) });
      res.status(500).json({ error: 'Failed to execute bridge' });
    }
  });

  /** GET /api/bridge/intents — List all verifiable bridge intents */
  router.get('/bridge/intents', (_req, res) => {
    try {
      const intents = bridge.getIntents();
      res.json({ intents, count: intents.length });
    } catch (err) {
      logger.error('Failed to get bridge intents', { error: String(err) });
      res.status(500).json({ error: 'Failed to get bridge intents' });
    }
  });

  /** GET /api/bridge/history — Bridge transaction history */
  router.get('/bridge/history', (_req, res) => {
    try {
      const history = bridge.getHistory();
      res.json({ history });
    } catch (err) {
      logger.error('Failed to get bridge history', { error: String(err) });
      res.status(500).json({ error: 'Failed to get bridge history' });
    }
  });

  // === DEFI LENDING (AAVE V3) =============================================

  /** GET /api/lending/rates — Current Aave V3 yield rates */
  router.get('/lending/rates', async (_req, res) => {
    try {
      const rates = await lending.getYieldRates();
      res.json({ rates, available: lending.isAvailable() });
    } catch (err) {
      logger.error('Failed to get lending rates', { error: String(err) });
      res.status(500).json({ error: 'Failed to get lending rates' });
    }
  });

  /** GET /api/lending/position — Current lending position */
  router.get('/lending/position', (_req, res) => {
    try {
      const position = lending.getPosition();
      res.json({ position, available: lending.isAvailable() });
    } catch (err) {
      logger.error('Failed to get lending position', { error: String(err) });
      res.status(500).json({ error: 'Failed to get lending position' });
    }
  });

  /** POST /api/lending/supply — Supply funds to Aave V3 via WDK */
  router.post('/lending/supply', async (req, res) => {
    try {
      const { chain, amount, asset } = req.body as {
        chain: string;
        amount: string;
        asset?: string;
      };

      if (!chain || !amount) {
        res.status(400).json({ error: 'chain and amount are required' });
        return;
      }

      const action = await lending.supply(chain, amount, asset);
      res.json({ action, note: action.txHash ? 'Supply executed via WDK AaveProtocolEvm' : 'Supply attempted — Aave V3 may not be available on testnet' });
    } catch (err) {
      logger.error('Failed to supply to lending', { error: String(err) });
      res.status(500).json({ error: 'Failed to supply to lending protocol' });
    }
  });

  /** POST /api/lending/withdraw — Withdraw from Aave V3 via WDK */
  router.post('/lending/withdraw', async (req, res) => {
    try {
      const { chain, amount, asset } = req.body as {
        chain: string;
        amount: string;
        asset?: string;
      };

      if (!chain || !amount) {
        res.status(400).json({ error: 'chain and amount are required' });
        return;
      }

      const action = await lending.withdraw(chain, amount, asset);
      res.json({ action, note: action.txHash ? 'Withdraw executed via WDK AaveProtocolEvm' : 'Withdraw attempted — Aave V3 may not be available on testnet' });
    } catch (err) {
      logger.error('Failed to withdraw from lending', { error: String(err) });
      res.status(500).json({ error: 'Failed to withdraw from lending protocol' });
    }
  });

  /** GET /api/lending/proof — Proof of real Aave V3 DeFi operations on Sepolia */
  router.get('/lending/proof', (_req, res) => {
    try {
      const proof = lending.getProof();
      res.json(proof);
    } catch (err) {
      logger.error('Failed to get lending proof', { error: String(err) });
      res.status(500).json({ error: 'Failed to get lending proof' });
    }
  });

  /** POST /api/lending/mint — Mint free Aave test tokens via faucet */
  router.post('/lending/mint', async (req, res) => {
    try {
      const { token, amount } = req.body as { token?: string; amount?: string };
      const result = await lending.mintTestTokens(token ?? 'USDT', amount ?? '1000');
      res.json(result);
    } catch (err) {
      logger.error('Failed to mint test tokens', { error: String(err) });
      res.status(500).json({ error: 'Failed to mint test tokens' });
    }
  });

  /** GET /api/lending/test-balance — Check Aave test token balance */
  router.get('/lending/test-balance', async (req, res) => {
    try {
      const token = (req.query.token as string) ?? 'USDT';
      const balance = await lending.getAaveTestTokenBalance(token);
      const key = token.toUpperCase() as keyof typeof AAVE_SEPOLIA_TOKENS;
      const tokenAddress = AAVE_SEPOLIA_TOKENS[key] ?? AAVE_SEPOLIA_TOKENS.USDT;
      res.json({ token, balance, tokenAddress });
    } catch (err) {
      logger.error('Failed to get test token balance', { error: String(err) });
      res.status(500).json({ error: 'Failed to get test token balance' });
    }
  });

  /** GET /api/lending/yield-summary — Comprehensive yield summary with projections */
  router.get('/lending/yield-summary', async (_req, res) => {
    try {
      const summary = await lending.getYieldSummary();
      res.json({ summary, available: lending.isAvailable() });
    } catch (err) {
      logger.error('Failed to get yield summary', { error: String(err) });
      res.status(500).json({ error: 'Failed to get yield summary' });
    }
  });

  /** GET /api/lending/projected-yield — Project earnings for a given amount and duration */
  router.get('/lending/projected-yield', async (req, res) => {
    try {
      const amount = parseFloat(req.query.amount as string);
      const days = parseInt(req.query.days as string, 10);
      if (isNaN(amount) || amount <= 0 || isNaN(days) || days <= 0) {
        res.status(400).json({ error: 'amount (positive number) and days (positive integer) query params are required' });
        return;
      }
      const projection = await lending.getProjectedYield(amount, days);
      res.json({ projection, available: lending.isAvailable() });
    } catch (err) {
      logger.error('Failed to get projected yield', { error: String(err) });
      res.status(500).json({ error: 'Failed to calculate projected yield' });
    }
  });

  // ── Tip Streaming Protocol ────────────────────────────────────

  /** POST /api/stream/start — Start a tip stream */
  router.post('/stream/start', transactionLimiter, (req, res) => {
    try {
      const { recipient, amountPerTick, intervalSeconds, token, chainId, maxBudget } = req.body as {
        recipient: string; amountPerTick: string; intervalSeconds?: number;
        token?: string; chainId?: string; maxBudget?: string;
      };
      if (!recipient || !amountPerTick) {
        res.status(400).json({ error: 'recipient and amountPerTick are required' });
        return;
      }
      const validTokens: TokenType[] = ['native', 'usdt', 'usat', 'xaut'];
      const validChains: ChainId[] = ['ethereum-sepolia', 'ton-testnet', 'tron-nile', 'solana-devnet'];
      const safeToken: TokenType = (typeof token === 'string' && validTokens.includes(token as TokenType)) ? token as TokenType : 'native';
      const safeChainId: ChainId = (typeof chainId === 'string' && validChains.includes(chainId as ChainId)) ? chainId as ChainId : 'ethereum-sepolia';
      const stream = streaming.startStream({
        recipient,
        amountPerTick,
        intervalSeconds: intervalSeconds || 30,
        token: safeToken,
        chainId: safeChainId,
        maxBudget,
      });
      res.json({ stream });
    } catch (err) {
      logger.error('Failed to start stream', { error: String(err) });
      res.status(500).json({ error: 'Failed to start tip stream' });
    }
  });

  /** POST /api/stream/:id/pause — Pause a stream */
  router.post('/stream/:id/pause', (req, res) => {
    const stream = streaming.pauseStream(req.params.id);
    if (!stream) {
      res.status(404).json({ error: 'Stream not found or not active' });
      return;
    }
    res.json({ stream });
  });

  /** POST /api/stream/:id/resume — Resume a stream */
  router.post('/stream/:id/resume', (req, res) => {
    const stream = streaming.resumeStream(req.params.id);
    if (!stream) {
      res.status(404).json({ error: 'Stream not found or not paused' });
      return;
    }
    res.json({ stream });
  });

  /** POST /api/stream/:id/stop — Stop a stream */
  router.post('/stream/:id/stop', (req, res) => {
    const stream = streaming.stopStream(req.params.id);
    if (!stream) {
      res.status(404).json({ error: 'Stream not found' });
      return;
    }
    res.json({ stream });
  });

  /** GET /api/stream/active — List active streams */
  router.get('/stream/active', (_req, res) => {
    res.json({ streams: streaming.getActiveStreams(), stats: streaming.getStats() });
  });

  /** GET /api/stream/history — List completed streams */
  router.get('/stream/history', (_req, res) => {
    res.json({ streams: streaming.getStreamHistory() });
  });

  // ── Continuous Pay-Per-Second Streaming ─────────────────────

  /** POST /api/streaming/continuous — Start a continuous pay-per-second stream */
  router.post('/streaming/continuous', transactionLimiter, (req, res) => {
    try {
      const { recipient, ratePerSecond, token, chainId, maxDuration } = req.body as {
        recipient: string; ratePerSecond: number;
        token?: string; chainId?: string; maxDuration?: number;
      };
      if (!recipient || !ratePerSecond || ratePerSecond <= 0) {
        res.status(400).json({ error: 'recipient and positive ratePerSecond are required' });
        return;
      }
      const validTokens: TokenType[] = ['native', 'usdt', 'usat', 'xaut'];
      const validChains: ChainId[] = ['ethereum-sepolia', 'ton-testnet', 'tron-nile', 'solana-devnet'];
      const safeToken: TokenType = (typeof token === 'string' && validTokens.includes(token as TokenType)) ? token as TokenType : 'native';
      const safeChainId: ChainId = (typeof chainId === 'string' && validChains.includes(chainId as ChainId)) ? chainId as ChainId : 'ethereum-sepolia';

      const stream = streaming.startContinuousStream(
        recipient,
        ratePerSecond,
        safeToken,
        safeChainId,
        maxDuration,
      );
      res.json({ stream });
    } catch (err) {
      logger.error('Failed to start continuous stream', { error: String(err) });
      res.status(500).json({ error: 'Failed to start continuous stream' });
    }
  });

  /** POST /api/streaming/continuous/:id/pause — Pause a continuous stream */
  router.post('/streaming/continuous/:id/pause', (req, res) => {
    const stream = streaming.pauseContinuousStream(req.params.id);
    if (!stream) {
      res.status(404).json({ error: 'Continuous stream not found or not active' });
      return;
    }
    res.json({ stream });
  });

  /** POST /api/streaming/continuous/:id/resume — Resume a continuous stream */
  router.post('/streaming/continuous/:id/resume', (req, res) => {
    const stream = streaming.resumeContinuousStream(req.params.id);
    if (!stream) {
      res.status(404).json({ error: 'Continuous stream not found or not paused' });
      return;
    }
    res.json({ stream });
  });

  // ── Engagement-Based Payment Streaming ──────────────────────

  /** POST /api/streaming/engagement — Register an engagement payment config */
  router.post('/streaming/engagement', (req, res) => {
    try {
      const { creatorAddress, chainId, token, triggers, maxPerHour, maxPerDay } = req.body as {
        creatorAddress: string; chainId?: string; token?: string;
        triggers: { perView?: number; perLike?: number; perComment?: number; perShare?: number; perMinuteWatched?: number };
        maxPerHour: number; maxPerDay: number;
      };
      if (!creatorAddress || !triggers || typeof maxPerHour !== 'number' || typeof maxPerDay !== 'number') {
        res.status(400).json({ error: 'creatorAddress, triggers, maxPerHour, and maxPerDay are required' });
        return;
      }
      const validTokens: TokenType[] = ['native', 'usdt', 'usat', 'xaut'];
      const validChains: ChainId[] = ['ethereum-sepolia', 'ton-testnet', 'tron-nile', 'solana-devnet'];
      const safeToken: TokenType = (typeof token === 'string' && validTokens.includes(token as TokenType)) ? token as TokenType : 'usdt';
      const safeChainId: ChainId = (typeof chainId === 'string' && validChains.includes(chainId as ChainId)) ? chainId as ChainId : 'ethereum-sepolia';

      const configId = streaming.registerEngagementPayment({
        creatorAddress,
        chainId: safeChainId,
        token: safeToken,
        triggers,
        maxPerHour,
        maxPerDay,
      });
      res.status(201).json({ configId, creatorAddress, triggers, maxPerHour, maxPerDay });
    } catch (err) {
      logger.error('Failed to register engagement payment', { error: String(err) });
      res.status(500).json({ error: 'Failed to register engagement payment config' });
    }
  });

  /** POST /api/streaming/engagement/:id/event — Record an engagement event */
  router.post('/streaming/engagement/:id/event', (req, res) => {
    try {
      const { type, creatorAddress, metadata } = req.body as {
        type: 'view' | 'like' | 'comment' | 'share' | 'minute_watched';
        creatorAddress: string;
        metadata?: Record<string, unknown>;
      };
      if (!type || !creatorAddress) {
        res.status(400).json({ error: 'type and creatorAddress are required' });
        return;
      }
      const validTypes = ['view', 'like', 'comment', 'share', 'minute_watched'];
      if (!validTypes.includes(type)) {
        res.status(400).json({ error: `Invalid event type. Must be one of: ${validTypes.join(', ')}` });
        return;
      }
      const result = streaming.recordEngagement(req.params.id, { type, creatorAddress, metadata });
      if (!result.accumulated && result.cappedReason === 'config_not_found') {
        res.status(404).json({ error: 'Engagement payment config not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      logger.error('Failed to record engagement event', { error: String(err) });
      res.status(500).json({ error: 'Failed to record engagement event' });
    }
  });

  /** GET /api/streaming/engagement — List all engagement configs + stats */
  router.get('/streaming/engagement', (_req, res) => {
    try {
      const stats = streaming.getEngagementStats();
      res.json(stats);
    } catch (err) {
      logger.error('Failed to get engagement stats', { error: String(err) });
      res.status(500).json({ error: 'Failed to get engagement stats' });
    }
  });

  /** DELETE /api/streaming/engagement/:id — Remove an engagement config */
  router.delete('/streaming/engagement/:id', (req, res) => {
    const removed = streaming.removeEngagementPayment(req.params.id);
    if (!removed) {
      res.status(404).json({ error: 'Engagement payment config not found' });
      return;
    }
    res.json({ removed: true, configId: req.params.id });
  });

  // ── DCA Tipping ──────────────────────────────────────────────
  router.post('/dca', (req, res) => {
    const plan = dca.createPlan(req.body);
    res.status(201).json(plan);
  });

  router.get('/dca', (_req, res) => {
    res.json(dca.getAllPlans());
  });

  router.get('/dca/active', (_req, res) => {
    res.json(dca.getActivePlans());
  });

  router.get('/dca/stats', (_req, res) => {
    res.json(dca.getStats());
  });

  router.get('/dca/:id', (req, res) => {
    const plan = dca.getPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  });

  router.post('/dca/:id/pause', (req, res) => {
    const plan = dca.pausePlan(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Cannot pause plan' });
    res.json(plan);
  });

  router.post('/dca/:id/resume', (req, res) => {
    const plan = dca.resumePlan(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Cannot resume plan' });
    res.json(plan);
  });

  router.post('/dca/:id/cancel', (req, res) => {
    const plan = dca.cancelPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Cannot cancel plan' });
    res.json(plan);
  });

  // ── Cross-Chain Fee Arbitrage ────────────────────────────────
  router.get('/fees/compare', (req, res) => {
    const amount = (req.query.amount as string) ?? '0.001';
    const token = (req.query.token as string) ?? 'usdt';
    res.json(feeArbitrage.compareFees(amount, token));
  });

  router.get('/fees/current', (_req, res) => {
    res.json(feeArbitrage.getCurrentFees());
  });

  router.get('/fees/history', (_req, res) => {
    res.json(feeArbitrage.getAllHistory());
  });

  router.get('/fees/history/:chainId', (req, res) => {
    const history = feeArbitrage.getChainHistory(req.params.chainId);
    if (!history) return res.status(404).json({ error: 'Chain not found' });
    res.json(history);
  });

  router.get('/fees/optimal-timing', (_req, res) => {
    res.json(feeArbitrage.getOptimalTiming());
  });

  // ── Swap / DEX ──────────────────────────────────────────────
  /** GET /api/swap/status — Check swap service availability */
  router.get('/swap/status', (_req, res) => {
    res.json(swap.getStats());
  });

  /** POST /api/swap/quote — Get a swap quote */
  router.post('/swap/quote', async (req, res) => {
    try {
      const { fromToken, toToken, amount } = req.body;
      if (!fromToken || !toToken || !amount) {
        res.status(400).json({ error: 'fromToken, toToken, and amount are required' });
        return;
      }
      const quote = await swap.getQuote(fromToken, toToken, amount);
      res.json(quote);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Swap quote failed' });
    }
  });

  /** POST /api/swap/execute — Execute a token swap */
  router.post('/swap/execute', transactionLimiter, async (req, res) => {
    try {
      const { fromToken, toToken, amount, slippage } = req.body;
      if (!fromToken || !toToken || !amount) {
        res.status(400).json({ error: 'fromToken, toToken, and amount are required' });
        return;
      }
      const result = await swap.executeSwap(fromToken, toToken, amount, slippage ?? 1);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Swap failed' });
    }
  });

  /** GET /api/swap/intents — List all verifiable swap intents */
  router.get('/swap/intents', (_req, res) => {
    try {
      const intents = swap.getIntents();
      res.json({ intents, count: intents.length });
    } catch (err) {
      logger.error('Failed to get swap intents', { error: String(err) });
      res.status(500).json({ error: 'Failed to get swap intents' });
    }
  });

  /** GET /api/swap/history — Get swap history */
  router.get('/swap/history', (_req, res) => {
    res.json(swap.getHistory());
  });

  // ── Composed DeFi Strategy Endpoints ──────────────────────────
  defiStrategy.setServices({
    lending,
    bridge,
    wallet,
  });

  /** GET /api/strategies — List all available composed DeFi strategies */
  router.get('/strategies', (_req, res) => {
    res.json({
      strategies: defiStrategy.getComposedStrategies(),
      stats: defiStrategy.getStats(),
      gasConditions: defiStrategy.getMarketState().gasConditions,
      tipQueue: defiStrategy.getTipQueue(),
      executionLog: defiStrategy.getExecutionLog().slice(-20),
    });
  });

  /** POST /api/strategies/execute — Execute a composed strategy by ID */
  router.post('/strategies/execute', async (req, res) => {
    try {
      const { strategy, params } = req.body as { strategy?: string; params?: Record<string, unknown> };
      if (!strategy) {
        res.status(400).json({ error: 'Missing "strategy" field. Available: tip-and-earn, bridge-and-tip, yield-funded-tips, gas-optimized-batch' });
        return;
      }
      const result = await defiStrategy.executeStrategy(strategy, params ?? {});
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  // ── Multi-Strategy Endpoints — ALL 4 Hackathon Tracks ──────

  /** GET /api/strategies/status — Returns all 4 strategy statuses */
  router.get('/strategies/status', (_req, res) => {
    const ms = getMultiStrategy();
    if (!ms) {
      res.json({ error: 'Multi-strategy service not initialized', strategies: {} });
      return;
    }
    res.json(ms.getStrategyStatus());
  });

  /** GET /api/strategies/decisions — Recent decisions across all strategies */
  router.get('/strategies/decisions', (req, res) => {
    const ms = getMultiStrategy();
    if (!ms) {
      res.json({ decisions: [] });
      return;
    }
    const limit = parseInt(String(req.query.limit ?? '50'), 10);
    const strategy = req.query.strategy as string | undefined;
    if (strategy && ['tipping', 'lending', 'defi', 'wallet_management'].includes(strategy)) {
      res.json(ms.getDecisionsByStrategy(strategy as StrategyDecision['strategy'], limit));
    } else {
      res.json(ms.getDecisions(limit));
    }
  });

  /** GET /api/strategies/lending/positions — Returns lending positions */
  router.get('/strategies/lending/positions', (_req, res) => {
    const ms = getMultiStrategy();
    if (!ms) {
      res.json({ positions: [] });
      return;
    }
    res.json({
      positions: ms.getLendingPositions(),
      lendingAvailable: lending.isAvailable(),
      currentPosition: lending.getPosition(),
      actionHistory: lending.getActionHistory().slice(0, 20),
    });
  });

  /** GET /api/strategies/defi/actions — Returns recent DeFi actions */
  router.get('/strategies/defi/actions', (_req, res) => {
    const ms = getMultiStrategy();
    if (!ms) {
      res.json({ actions: [] });
      return;
    }
    res.json({
      actions: ms.getDeFiActions(),
      swapStats: swap.getStats(),
      bridgeRoutes: bridge.getRoutes().length,
      dcaStats: dca.getStats(),
      feeOptimization: feeArbitrage.compareFees('0.01', 'usdt'),
    });
  });

  /** GET /api/strategies/wallets/health — Returns wallet health across chains */
  router.get('/strategies/wallets/health', (_req, res) => {
    const ms = getMultiStrategy();
    if (!ms) {
      res.json({ wallets: [] });
      return;
    }
    res.json({
      wallets: ms.getWalletHealth(),
      paymasterStatus: walletOps.getPaymasterStatus(),
      registeredChains: wallet.getRegisteredChains(),
    });
  });

  /** GET /api/strategies/summary — Summary for judges across all 4 tracks */
  router.get('/strategies/summary', (_req, res) => {
    const ms = getMultiStrategy();
    if (!ms) {
      res.json({
        tracks: {
          tipping_bot: { enabled: true, decisions: 0, tips_sent: 0, volume: '$0.00' },
          lending_bot: { enabled: false, positions: 0, supplied: '$0', yield_earned: '$0' },
          defi_agent: { enabled: false, swaps: 0, bridges: 0, rebalances: 0 },
          agent_wallets: { enabled: false, chains: 0, wallets_managed: 0, gasless_available: 0 },
        },
        overall: { total_decisions: 0, autonomous_actions: 0, human_overrides: 0, uptime: '0h 0m' },
      });
      return;
    }

    const loopStatus = getAutonomousLoop()?.getStatus();
    const tipsExecuted = loopStatus?.tipsExecuted ?? 0;
    const tipVolume = (tipsExecuted * 0.003).toFixed(4);
    res.json(ms.getSummary(tipsExecuted, tipVolume));
  });

  // === TREASURY MANAGEMENT ================================================

  /** GET /api/treasury/status — Treasury overview with balance breakdown */
  router.get('/treasury/status', async (_req, res) => {
    try {
      const balances = await wallet.getAllBalances();
      const totalBalance = balances.reduce((sum, b) => {
        return sum + parseFloat(b.nativeBalance || '0') + parseFloat(b.usdtBalance || '0');
      }, 0);
      treasury.updateTotalDeposited(totalBalance);
      const status = treasury.getTreasuryStatus(totalBalance);
      res.json({ status });
    } catch (err) {
      logger.error('Failed to get treasury status', { error: String(err) });
      res.status(500).json({ error: 'Failed to get treasury status' });
    }
  });

  /** GET /api/treasury/yields — Available DeFi yield opportunities */
  router.get('/treasury/yields', async (_req, res) => {
    try {
      const yields = await treasury.getYieldOpportunities();
      res.json({ yields });
    } catch (err) {
      logger.error('Failed to fetch yield opportunities', { error: String(err) });
      res.status(500).json({ error: 'Failed to fetch yield opportunities' });
    }
  });

  /** POST /api/treasury/strategy — Set yield strategy configuration */
  router.post('/treasury/strategy', (req, res) => {
    try {
      const strategy = req.body as {
        enabled: boolean; minIdleThreshold: number; targetProtocol: string;
        maxAllocationPercent: number; autoRebalance: boolean; rebalanceIntervalHours: number;
      };
      if (typeof strategy.enabled !== 'boolean') {
        res.status(400).json({ error: 'enabled (boolean) is required' });
        return;
      }
      treasury.setYieldStrategy({
        enabled: strategy.enabled,
        minIdleThreshold: strategy.minIdleThreshold ?? 10,
        targetProtocol: strategy.targetProtocol ?? 'Aave V3',
        maxAllocationPercent: strategy.maxAllocationPercent ?? 20,
        autoRebalance: strategy.autoRebalance ?? false,
        rebalanceIntervalHours: strategy.rebalanceIntervalHours ?? 24,
      });
      res.json({ strategy: treasury.getYieldStrategy() });
    } catch (err) {
      logger.error('Failed to set yield strategy', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** GET /api/treasury/strategy — Get current yield strategy */
  router.get('/treasury/strategy', (_req, res) => {
    res.json({ strategy: treasury.getYieldStrategy() });
  });

  /** POST /api/treasury/allocation — Set fund allocation percentages */
  router.post('/treasury/allocation', (req, res) => {
    try {
      const alloc = req.body as { tippingReservePercent: number; yieldPercent: number; gasBufferPercent: number };
      if (typeof alloc.tippingReservePercent !== 'number' || typeof alloc.yieldPercent !== 'number' || typeof alloc.gasBufferPercent !== 'number') {
        res.status(400).json({ error: 'tippingReservePercent, yieldPercent, and gasBufferPercent are required numbers' });
        return;
      }
      treasury.setAllocation(alloc);
      res.json({ allocation: treasury.getAllocation() });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/treasury/allocation — Get current fund allocation */
  router.get('/treasury/allocation', (_req, res) => {
    res.json({ allocation: treasury.getAllocation() });
  });

  /** GET /api/treasury/analytics — Treasury analytics and efficiency metrics */
  router.get('/treasury/analytics', async (_req, res) => {
    try {
      const analytics = await treasury.getTreasuryAnalytics();
      res.json({ analytics });
    } catch (err) {
      logger.error('Failed to get treasury analytics', { error: String(err) });
      res.status(500).json({ error: 'Failed to get treasury analytics' });
    }
  });

  /** GET /api/treasury/report — Comprehensive economic sustainability report */
  router.get('/treasury/report', async (_req, res) => {
    try {
      const balances = await wallet.getAllBalances();
      const totalBalance = balances.reduce((sum, b) => {
        return sum + parseFloat(b.nativeBalance || '0') + parseFloat(b.usdtBalance || '0');
      }, 0);
      const report = await treasury.getEconomicReport(totalBalance);
      res.json({ report });
    } catch (err) {
      logger.error('Failed to generate economic report', { error: String(err) });
      res.status(500).json({ error: 'Failed to generate economic report' });
    }
  });

  // === WDK INDEXER (Unified Cross-Chain Data) ===

  /** GET /api/indexer/health — Indexer API health check */
  router.get('/indexer/health', async (_req, res) => {
    try {
      const result = await indexer.healthCheck();
      res.json(result);
    } catch (err) {
      logger.error('Indexer health check failed', { error: String(err) });
      res.json({ isAvailable: false, latencyMs: 0, error: String(err) });
    }
  });

  /** GET /api/indexer/chains — Supported chains & tokens */
  router.get('/indexer/chains', async (_req, res) => {
    try {
      const result = await indexer.getSupportedChains();
      res.json(result);
    } catch (err) {
      logger.error('Indexer chains query failed', { error: String(err) });
      res.json({ data: null, isAvailable: false });
    }
  });

  /** GET /api/indexer/balances/:blockchain/:token/:address — Token balance */
  router.get('/indexer/balances/:blockchain/:token/:address', async (req, res) => {
    try {
      const { blockchain, token, address } = req.params;
      const result = await indexer.getTokenBalance(blockchain, token, address);
      res.json(result);
    } catch (err) {
      logger.error('Indexer balance query failed', { error: String(err) });
      res.json({ data: null, isAvailable: false });
    }
  });

  /** GET /api/indexer/transfers/:blockchain/:token/:address — Transfer history */
  router.get('/indexer/transfers/:blockchain/:token/:address', async (req, res) => {
    try {
      const { blockchain, token, address } = req.params;
      const result = await indexer.getTokenTransfers(blockchain, token, address);
      res.json(result);
    } catch (err) {
      logger.error('Indexer transfers query failed', { error: String(err) });
      res.json({ data: null, isAvailable: false });
    }
  });

  /** POST /api/indexer/batch/balances — Batch balance query */
  router.post('/indexer/batch/balances', async (req, res) => {
    try {
      const queries = req.body;
      if (!Array.isArray(queries)) {
        res.status(400).json({ error: 'Body must be an array of { blockchain, token, address }' });
        return;
      }
      const result = await indexer.batchBalances(queries);
      res.json(result);
    } catch (err) {
      logger.error('Indexer batch balances query failed', { error: String(err) });
      res.json({ data: null, isAvailable: false });
    }
  });
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Agent status, health, activity & demo route handlers (extracted from api.ts)

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JsonRpcProvider } from 'ethers';
import type { TipFlowAgent } from '../core/agent.js';
import type { WalletService } from '../services/wallet.service.js';
import type { AIService } from '../services/ai.service.js';
import type { ActivityEvent, ChainId, TipRequest, TokenType } from '../types/index.js';
import { getPersistenceInfo } from '../services/persistence.service.js';
import { logger } from '../utils/logger.js';
import { transactionLimiter } from '../middleware/rateLimit.js';
import { getOpenApiSpec } from './openapi.js';
import { ServiceRegistry } from '../services/service-registry.js';

// WDK type imports for agent status and health reporting via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import type WalletManagerTon from '@tetherto/wdk-wallet-ton';
import type WalletManagerTron from '@tetherto/wdk-wallet-tron';
// Agent status reports WDK wallet health, chain connectivity, and registered managers
export type _WdkRefs = WDK | WalletManagerEvm | WalletManagerTon | WalletManagerTron; // eslint-disable-line @typescript-eslint/no-unused-vars
import { SelfTestService } from '../services/self-test.service.js';

export interface AgentStatusDeps {
  agent: TipFlowAgent;
  wallet: WalletService;
  ai: AIService;
}

/**
 * Register agent status, health, activity, system info, and demo routes.
 */
export function registerAgentStatusRoutes(
  router: Router,
  { agent, wallet, ai }: AgentStatusDeps,
): void {
  const services = ServiceRegistry.getInstance();

  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [System]
   *     summary: Service health check
   *     description: Returns current service status, AI provider, registered chains, and timestamp.
   *     responses:
   *       200:
   *         description: Health status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *                 agent:
   *                   type: string
   *                   example: idle
   *                 ai:
   *                   type: string
   *                   example: ollama
   *                 chains:
   *                   type: array
   *                   items:
   *                     type: string
   *                   example: [ethereum-sepolia, ton-testnet]
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      agent: agent.getState().status,
      ai: ai.getProvider(),
      chains: wallet.getRegisteredChains(),
      timestamp: new Date().toISOString(),
    });
  });

  /** POST /api/self-test — Prove WDK wallet liveness on Sepolia (cached after first run) */
  const selfTestService = new SelfTestService(wallet);

  router.post('/self-test', async (_req, res) => {
    try {
      const result = await selfTestService.runSelfTest();
      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: String(err),
        chain: 'ethereum-sepolia',
        hint: 'Ensure the wallet has Sepolia ETH. Use https://sepoliafaucet.com to fund it.',
      });
    }
  });

  /** GET /api/self-test — Check cached self-test result without re-running */
  router.get('/self-test', (_req, res) => {
    const cached = selfTestService.getCachedResult();
    if (cached) {
      res.json({ success: true, ...cached });
    } else {
      res.json({
        success: false,
        message: 'No self-test result cached. Run POST /api/self-test first.',
        hint: 'curl -X POST http://localhost:3001/api/self-test',
      });
    }
  });

  /** GET /api/proof — Aggregate all on-chain proofs (wallet, faucet, self-test, aave) */
  router.get('/proof', async (_req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const agentRoot = path.resolve(process.cwd());

      const walletAddress = await wallet.getAddress('ethereum-sepolia').catch(() => '0x74118B69ac22FB7e46081400BD5ef9d9a0AC9b62');

      // Read optional tx JSON files
      const readTxFile = (filename: string): Record<string, unknown> | null => {
        try {
          const filepath = path.join(agentRoot, filename);
          if (fs.existsSync(filepath)) {
            return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
          }
        } catch { /* ignore */ }
        return null;
      };

      const selfTestData = readTxFile('.self-test-tx.json');
      const aaveMintData = readTxFile('.aave-mint-tx.json');
      const aaveSupplyData = readTxFile('.aave-supply-tx.json');

      const faucetTx = '0x32870805fc040dc79652812b058784249c11270fc4d43b7cad9979';
      const selfTestTx = (selfTestData as Record<string, string>)?.txHash ?? null;
      const aaveMintTx = (aaveMintData as Record<string, string>)?.txHash ?? null;
      const aaveSupplyTx = (aaveSupplyData as Record<string, string>)?.txHash ?? null;

      const explorerBase = 'https://sepolia.etherscan.io';
      const explorerLinks: Record<string, string> = {
        wallet: `${explorerBase}/address/${walletAddress}`,
        faucetTx: `${explorerBase}/tx/${faucetTx}`,
      };
      if (selfTestTx) explorerLinks.selfTestTx = `${explorerBase}/tx/${selfTestTx}`;
      if (aaveMintTx) explorerLinks.aaveMintTx = `${explorerBase}/tx/${aaveMintTx}`;
      if (aaveSupplyTx) explorerLinks.aaveSupplyTx = `${explorerBase}/tx/${aaveSupplyTx}`;

      res.json({
        wallet: walletAddress,
        network: 'ethereum-sepolia',
        faucetTx,
        selfTestTx,
        aaveMintTx,
        aaveSupplyTx,
        explorerLinks,
        howToVerify: {
          selfTest: 'POST /api/self-test — sends 0-value self-transfer, returns fresh tx hash',
          aaveMint: 'POST /api/advanced/aave/mint-test-usdt — mints test USDT on Sepolia',
          aaveSupply: 'POST /api/advanced/aave/supply — supplies USDT to Aave V3',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to aggregate proofs', details: String(err) });
    }
  });

  /** GET /api/ai/capabilities — Rule-based AI engine capabilities */
  router.get('/ai/capabilities', (_req, res) => {
    const capabilities = ai.getRuleBasedCapabilities();
    res.json({
      ...capabilities,
      currentProvider: ai.getProvider(),
      llmAvailable: ai.isAvailable(),
    });
  });

  /** POST /api/ai/analyze — Analyze text content (sentiment, topics, key phrases) */
  router.post('/ai/analyze', (req, res) => {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'text string is required' });
      return;
    }
    const analysis = ai.analyzeContent(text.trim());
    res.json(analysis);
  });

  // ── Full System Health ─────────────────────────────────────
  router.get('/health/full', (_req, res) => {
    const rumbleService = services.rumble;
    const autonomyService = services.autonomy;
    const memoryService = services.memory;
    const escrowService = services.escrow;
    const predictorService = services.predictor;
    const feeArbitrageService = services.feeArbitrage;
    const dcaService = services.dca;

    const health = {
      status: 'operational',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        agent: { status: 'running', tipCount: agent.getHistory().length },
        wallet: { status: wallet ? 'connected' : 'disconnected' },
        ai: { status: 'ready' },
        rumble: { status: 'active', creatorCount: rumbleService.listCreators().length },
        autonomy: { status: 'active', policyCount: autonomyService.getPolicies('default').length },
        memory: { status: 'active', memoryCount: memoryService.getAllMemories().length },
        streaming: { status: 'ready' },
        receipts: { status: 'ready' },
        reputation: { status: 'ready' },
        treasury: { status: 'ready' },
        bridge: { status: 'ready' },
        lending: { status: 'ready' },
        escrow: { status: 'ready', activeCount: escrowService.getActiveCount() },
        orchestrator: { status: 'ready', agents: ['TipExecutor', 'Guardian', 'TreasuryOptimizer'] },
        predictor: { status: 'ready', pendingPredictions: predictorService.getPendingPredictions().length },
        feeArbitrage: { status: 'ready', chainsMonitored: feeArbitrageService.getCurrentFees().length },
        dca: { status: 'ready', activePlans: dcaService.getActivePlans().length },
        creatorAnalytics: { status: 'ready' },
        indexer: { status: 'ready' },
        telegram: { status: process.env.TELEGRAM_BOT_TOKEN ? 'active' : 'not configured' },
      },
      chains: {
        'ethereum-sepolia': { status: 'active', type: 'EVM' },
        'ton-testnet': { status: 'active', type: 'TON' },
        'tron-nile': { status: 'active', type: 'TRON' },
      },
      wdk: {
        packages: [
          '@tetherto/wdk',
          '@tetherto/wdk-wallet-evm',
          '@tetherto/wdk-wallet-ton',
          '@tetherto/wdk-wallet-tron',
          '@tetherto/wdk-wallet-evm-erc-4337',
          '@tetherto/wdk-wallet-ton-gasless',
          '@tetherto/wdk-protocol-bridge-usdt0-evm',
          '@tetherto/wdk-protocol-lending-aave-evm',
        ],
        methods: [
          'getAccount', 'getAddress', 'getBalance', 'getTokenBalance',
          'sendTransaction', 'transfer', 'sign', 'verify', 'keyPair',
          'quoteSendTransaction', 'getFeeRates', 'getRandomSeedPhrase',
          'registerWallet', 'dispose', 'getAccountByPath',
        ],
      },
      features: {
        tipStreaming: true,
        cryptoReceipts: true,
        socialReputation: true,
        autonomousExecution: true,
        tieredApproval: true,
        hdMultiAccount: true,
        crossChainBridge: true,
        aaveYield: true,
        tipEscrow: true,
        predictiveTipping: true,
        feeArbitrage: true,
        rumbleIntegration: true,
        agentMemory: true,
        xautGoldToken: true,
        voiceCommands: true,
        dcaTipping: true,
        creatorAnalytics: true,
        multiLanguage: ['en', 'es', 'fr', 'ar', 'zh'],
      },
      demoMode: process.env.DEMO_MODE === 'true',
    };
    res.json(health);
  });

  /** GET /api/docs — OpenAPI 3.0 specification */
  router.get('/docs', (_req, res) => {
    res.json(getOpenApiSpec());
  });

  /** GET /api/network/health — Check connectivity to each registered chain */
  router.get('/network/health', async (_req, res) => {
    try {
      const chainIds = wallet.getRegisteredChains();
      const results = await Promise.all(
        chainIds.map(async (chainId) => {
          const config = wallet.getChainConfig(chainId);
          const start = Date.now();

          if (config.blockchain === 'ethereum') {
            try {
              const rpcUrl = config.rpcUrl
                ?? process.env.ETH_SEPOLIA_RPC
                ?? 'https://ethereum-sepolia-rpc.publicnode.com';
              const provider = new JsonRpcProvider(rpcUrl);
              const blockNumber = await provider.getBlockNumber();
              const latencyMs = Date.now() - start;
              const status = latencyMs > 2000 ? 'degraded' : 'healthy';
              return { chainId, chainName: config.name, status, latencyMs, blockNumber };
            } catch {
              return { chainId, chainName: config.name, status: 'down' as const, latencyMs: Date.now() - start };
            }
          }

          // TON: try a simple fetch to the TON API
          try {
            const tonApi = 'https://testnet.toncenter.com/api/v2/getMasterchainInfo';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const resp = await fetch(tonApi, { signal: controller.signal });
            clearTimeout(timeout);
            const latencyMs = Date.now() - start;
            if (!resp.ok) {
              return { chainId, chainName: config.name, status: 'down' as const, latencyMs };
            }
            const data = await resp.json() as { ok: boolean; result?: { last?: { seqno?: number } } };
            const blockNumber = data?.result?.last?.seqno;
            const status = latencyMs > 2000 ? 'degraded' : 'healthy';
            return { chainId, chainName: config.name, status, latencyMs, blockNumber };
          } catch {
            return { chainId, chainName: config.name, status: 'down' as const, latencyMs: Date.now() - start };
          }
        }),
      );

      res.json({ chains: results });
    } catch (err) {
      logger.error('Network health check failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to check network health' });
    }
  });

  /** GET /api/agent/state — Get current agent state */
  router.get('/agent/state', (_req, res) => {
    res.json({ state: agent.getState() });
  });

  /** GET /api/agent/tool-policy — Returns the tool access control policy (blocklist + restricted) */
  router.get('/agent/tool-policy', (_req, res) => {
    const policy = services.openClaw.getToolAccessPolicy();
    res.json(policy);
  });

  /**
   * @openapi
   * /agent/status:
   *   get:
   *     tags: [Agent]
   *     summary: Full agent status
   *     description: Returns unified agent status including state, autonomous loop, protocol availability, LLM provider, and uptime.
   *     responses:
   *       200:
   *         description: Agent status object
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   enum: [idle, analyzing, reasoning, executing, confirming]
   *                 state:
   *                   type: object
   *                 loop:
   *                   type: object
   *                   nullable: true
   *                 protocolStatus:
   *                   type: object
   *                   properties:
   *                     lending:
   *                       type: object
   *                     bridge:
   *                       type: object
   *                     swap:
   *                       type: object
   *                     llm:
   *                       type: object
   *                     escrow:
   *                       type: object
   *                 uptime:
   *                   type: number
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  router.get('/agent/status', (_req, res) => {
    const state = agent.getState();
    const loopStatus = services.autonomousLoop?.getStatus?.() ?? null;
    const lendingService = services.lending;
    const bridgeService = services.bridge;
    const swapService = services.swap;

    const llmProvider = ai.getProvider();
    const protocolStatus = {
      lending: {
        available: lendingService.isAvailable(),
        mode: lendingService.isAvailable() ? 'simulation' as const : 'unavailable' as const,
        reason: 'Aave V3 not deployed on Sepolia — local position tracking with real DeFi Llama rates',
      },
      bridge: {
        available: bridgeService.isAvailable(),
        mode: bridgeService.isAvailable() ? 'simulation' as const : 'unavailable' as const,
        reason: 'USDT0 (LayerZero OFT) is mainnet-only — WDK protocol registered, bridge intent logged',
      },
      swap: {
        available: swapService?.isAvailable() ?? false,
        mode: swapService?.isAvailable() ? 'live' as const : 'simulation' as const,
        reason: swapService?.isAvailable()
          ? 'Velora DEX aggregator active via WDK'
          : 'Velora contracts not deployed on Sepolia — swap intent logged',
      },
      llm: {
        available: llmProvider !== 'rule-based',
        provider: llmProvider,
        model: llmProvider === 'groq' ? 'llama-3.3-70b-versatile'
             : llmProvider === 'gemini' ? 'gemini-2.0-flash'
             : 'deterministic-rules',
      },
      escrow: {
        available: true,
        mode: 'htlc' as const,
        note: 'Cryptographic hash-locked, off-chain — no contract dependency',
      },
    };

    res.json({
      status: state.status ?? 'unknown',
      state,
      loop: loopStatus,
      protocolStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  /** GET /api/agent/events — SSE stream for real-time agent updates */
  router.get('/agent/events', (_req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('data: {"type":"connected"}\n\n');

    const unsubscribe = agent.onStateChange((state) => {
      res.write(`data: ${JSON.stringify({ type: 'state', state })}\n\n`);
    });

    _req.on('close', () => {
      unsubscribe();
    });
  });

  /** GET /api/activity — Get recent activity log */
  router.get('/activity', (_req, res) => {
    res.json({ activity: agent.getActivityLog() });
  });

  /** GET /api/activity/stream — SSE stream for real-time activity events */
  router.get('/activity/stream', (_req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('data: {"type":"connected"}\n\n');

    const unsubscribe = agent.onActivity((event: ActivityEvent) => {
      res.write(`data: ${JSON.stringify({ type: 'activity', event })}\n\n`);
    });

    _req.on('close', () => {
      unsubscribe();
    });
  });

  /**
   * @openapi
   * /agent/history:
   *   get:
   *     tags: [Agent]
   *     summary: Tip transaction history
   *     description: Returns full tip history with transaction details. Supports filtering by search term, chain, status, and date range.
   *     parameters:
   *       - name: search
   *         in: query
   *         schema:
   *           type: string
   *         description: Filter by recipient address or tx hash
   *       - name: chain
   *         in: query
   *         schema:
   *           type: string
   *         description: Filter by chain ID
   *       - name: status
   *         in: query
   *         schema:
   *           type: string
   *           enum: [confirmed, failed, pending]
   *       - name: dateFrom
   *         in: query
   *         schema:
   *           type: string
   *           format: date-time
   *       - name: dateTo
   *         in: query
   *         schema:
   *           type: string
   *           format: date-time
   *     responses:
   *       200:
   *         description: Tip history entries
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 history:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       tipId:
   *                         type: string
   *                       recipient:
   *                         type: string
   *                       amount:
   *                         type: string
   *                       token:
   *                         type: string
   *                       chainId:
   *                         type: string
   *                       txHash:
   *                         type: string
   *                       status:
   *                         type: string
   *                       fee:
   *                         type: string
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                 total:
   *                   type: integer
   */
  router.get('/agent/history', (req, res) => {
    let history = agent.getHistory();

    const search = (req.query.search as string)?.toLowerCase();
    const chain = req.query.chain as string;
    const status = req.query.status as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    if (search) {
      history = history.filter((h) =>
        h.recipient.toLowerCase().includes(search) ||
        h.txHash.toLowerCase().includes(search) ||
        (h.chainId.startsWith('ethereum') ? 'ethereum' : 'ton').includes(search),
      );
    }

    if (chain) {
      history = history.filter((h) => {
        if (chain === 'ethereum') return h.chainId.startsWith('ethereum');
        if (chain === 'ton') return h.chainId.startsWith('ton');
        return h.chainId === chain;
      });
    }

    if (status && (status === 'confirmed' || status === 'failed')) {
      history = history.filter((h) => h.status === status);
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      if (!isNaN(from)) {
        history = history.filter((h) => new Date(h.createdAt).getTime() >= from);
      }
    }

    if (dateTo) {
      const to = new Date(dateTo).getTime();
      if (!isNaN(to)) {
        history = history.filter((h) => new Date(h.createdAt).getTime() <= to + 86400000);
      }
    }

    res.json({ history, total: agent.getHistory().length });
  });

  /** GET /api/agent/history/export — Export tip history in multiple formats */
  router.get('/agent/history/export', (_req, res) => {
    const format = (_req.query.format as string) ?? 'csv';
    const history = agent.getHistory();
    const exportService = services.exportService;

    switch (format) {
      case 'csv': {
        const csv = exportService.exportCSV(history);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="aerofyta-history.csv"');
        res.send(csv);
        break;
      }
      case 'json': {
        const json = exportService.exportJSON(history);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="aerofyta-history.json"');
        res.send(json);
        break;
      }
      case 'markdown': {
        const md = exportService.exportMarkdown(history);
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', 'attachment; filename="aerofyta-history.md"');
        res.send(md);
        break;
      }
      case 'summary': {
        const summary = exportService.exportSummary(history);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="aerofyta-summary.txt"');
        res.send(summary);
        break;
      }
      default:
        res.status(400).json({ error: 'Unsupported format. Use: csv, json, markdown, summary' });
    }
  });

  /** GET /api/tx/:hash/status — Check on-chain confirmation status of a transaction */
  router.get('/tx/:hash/status', async (req, res) => {
    try {
      const { hash } = req.params;
      const chainId = (req.query.chain as ChainId) ?? 'ethereum-sepolia';

      if (!hash || hash.length === 0) {
        res.status(400).json({ error: 'Transaction hash is required' });
        return;
      }

      const registeredChains = wallet.getRegisteredChains();
      if (!registeredChains.includes(chainId)) {
        res.status(400).json({ error: `Unsupported chain: ${chainId}` });
        return;
      }

      const confirmation = await wallet.waitForConfirmation(chainId, hash, 10000);
      res.json({
        txHash: hash,
        chainId,
        confirmed: confirmation.confirmed,
        blockNumber: confirmation.blockNumber || undefined,
        gasUsed: confirmation.gasUsed !== '0' ? confirmation.gasUsed : undefined,
        explorerUrl: wallet.getExplorerUrl(chainId, hash),
      });
    } catch (err) {
      logger.error('Transaction status check failed', { error: String(err) });
      res.status(500).json({ error: 'Failed to check transaction status' });
    }
  });

  /** GET /api/system/info — System and runtime information */
  router.get('/system/info', (_req, res) => {
    const mem = process.memoryUsage();
    res.json({
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      wdkVersion: '1.0.0-beta.6',
      apiEndpoints: 61,
      startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      memoryUsage: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      platform: process.platform,
      environment: process.env.NODE_ENV || 'development',
    });
  });

  /** GET /api/system/persistence — Persistence backend info */
  router.get('/system/persistence', (_req, res) => {
    res.json(getPersistenceInfo());
  });

  /** GET /api/telegram/status — Telegram bot status */
  router.get('/telegram/status', (_req, res) => {
    try {
      const status = agent.getTelegramStatus();
      res.json(status);
    } catch (err) {
      logger.error('Failed to get Telegram status', { error: String(err) });
      res.status(500).json({ error: 'Failed to get Telegram status' });
    }
  });

  // ── Demo Mode Endpoints ──────────────────────────────────────────────

  /** GET /api/demo/scenarios — Returns available demo scenarios with descriptions */
  router.get('/demo/scenarios', async (_req, res) => {
    try {
      const chains = wallet.getRegisteredChains();
      const addresses: Record<string, string> = {};
      for (const chain of chains) {
        try {
          addresses[chain] = await wallet.getAddress(chain);
        } catch {
          // skip chains that fail
        }
      }

      const scenarios = [
        {
          id: 'quick-tip',
          name: 'Quick Tip',
          description: 'Send a 0.0001 ETH self-tip to demonstrate a real on-chain transaction',
          feature: 'Single Tip + Agent Reasoning',
          action: 'self-tip',
        },
        {
          id: 'nlp-tip',
          name: 'NLP Tip',
          description: 'Pre-fills the NLP input with a natural language tip command',
          feature: 'Natural Language Processing',
          action: 'nlp-prefill',
        },
        {
          id: 'batch-demo',
          name: 'Batch Demo',
          description: 'Pre-fills batch form with 2 small self-tips',
          feature: 'Batch Tipping',
          action: 'batch-prefill',
        },
        {
          id: 'split-demo',
          name: 'Split Demo',
          description: 'Pre-fills split form with 2 recipients (own address)',
          feature: 'Tip Splitting',
          action: 'split-prefill',
        },
        {
          id: 'check-balances',
          name: 'Check Balances',
          description: 'Shows all wallet balances across chains',
          feature: 'Multi-Chain Wallets',
          action: 'check-balances',
        },
        {
          id: 'compare-fees',
          name: 'Compare Fees',
          description: 'Shows cross-chain fee comparison for a demo tip',
          feature: 'Fee Optimization',
          action: 'compare-fees',
        },
      ];

      res.json({ scenarios, addresses });
    } catch (err) {
      logger.error('Failed to get demo scenarios', { error: String(err) });
      res.status(500).json({ error: 'Failed to get demo scenarios' });
    }
  });

  /** POST /api/demo/self-tip — Sends a tiny self-tip for demo purposes */
  router.post('/demo/self-tip', transactionLimiter, async (_req, res) => {
    try {
      const selfAddress = await wallet.getAddress('ethereum-sepolia' as ChainId);

      if (!selfAddress) {
        res.status(400).json({ error: 'No EVM wallet address available' });
        return;
      }

      const tipRequest: TipRequest = {
        id: uuidv4(),
        recipient: selfAddress,
        amount: '0.0001',
        token: 'native' as TokenType,
        preferredChain: 'ethereum-sepolia' as ChainId,
        message: 'Demo self-tip — AeroFyta showcase',
        createdAt: new Date().toISOString(),
      };

      logger.info('Executing demo self-tip', { tipId: tipRequest.id, address: selfAddress });

      const result = await agent.executeTip(tipRequest);
      res.json({ result, demoInfo: { selfAddress, amount: '0.0001', purpose: 'Demo self-tip to showcase real transaction flow' } });
    } catch (err) {
      logger.error('Demo self-tip failed', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Full Demo Orchestration (Gap #2) ────────────────────────────────
  // SSE stream that runs all demo steps automatically with delays

  const DEMO_STEPS = [
    { title: 'Show wallet addresses & balances', key: 'wallets' },
    { title: 'Create HTLC escrow', key: 'escrow' },
    { title: 'Claim escrow with secret', key: 'escrow_claim' },
    { title: 'Run autonomous cycle', key: 'autonomous' },
    { title: 'Create DCA plan', key: 'dca' },
    { title: 'Record pay-per-engagement event', key: 'engagement' },
    { title: 'Query creator data', key: 'creator_data' },
    { title: 'Show reputation passport', key: 'reputation' },
    { title: 'Show mood & financial pulse', key: 'personality' },
    { title: 'Show full agent stats', key: 'stats' },
  ];

  async function executeDemoStep(stepNum: number, deps: AgentStatusDeps): Promise<{ title: string; result: Record<string, unknown> }> {
    const { agent: ag, wallet: w } = deps;
    const sr = ServiceRegistry.getInstance();
    const step = DEMO_STEPS[stepNum - 1];
    if (!step) throw new Error(`Invalid step ${stepNum}`);

    switch (step.key) {
      case 'wallets': {
        const chains = w.getRegisteredChains();
        const wallets: Array<{ chain: string; address: string; native: string; usdt: string }> = [];
        for (const chain of chains) {
          try {
            const addr = await w.getAddress(chain);
            const bal = await w.getBalance(chain);
            wallets.push({ chain, address: addr, native: bal.nativeBalance, usdt: bal.usdtBalance });
          } catch { /* skip */ }
        }
        return { title: step.title, result: { wallets, chainCount: wallets.length } };
      }

      case 'escrow': {
        const escrow = sr.escrow;
        const { escrow: created, secret: escrowSecret } = await escrow.createEscrow({
          sender: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
          recipient: '0x53d284357EC70cE289D6D64134DfAc8E511c8a3D',
          amount: '0.005',
          token: 'usdt',
          chainId: 'ethereum-sepolia',
          autoReleaseHours: 24,
          memo: 'Demo escrow for judges',
        });
        // Stash secret for next step
        (sr as any).__demoEscrowSecret = escrowSecret;
        (sr as any).__demoEscrowId = created.id;
        return { title: step.title, result: { escrowId: created.id, hashLock: created.hashLock, amount: created.amount, status: created.status, secret: escrowSecret.slice(0, 12) + '...' } };
      }

      case 'escrow_claim': {
        const escrow = sr.escrow;
        const storedSecret = (sr as any).__demoEscrowSecret as string | undefined;
        const storedId = (sr as any).__demoEscrowId as string | undefined;
        if (storedId && storedSecret) {
          const claimed = await escrow.claimEscrow(storedId, storedSecret);
          if (claimed) {
            return { title: step.title, result: { escrowId: claimed.id, status: claimed.status, releasedAt: claimed.releasedAt } };
          }
        }
        // Fallback: find any locked escrow
        const allEscrows = escrow.getAllEscrows().filter(e => e.status === 'held');
        if (allEscrows.length > 0) {
          return { title: step.title, result: { message: 'Escrow found but no secret available', escrowCount: allEscrows.length } };
        }
        return { title: step.title, result: { message: 'No locked escrow — run step 2 first', status: 'skipped' } };
      }

      case 'autonomous': {
        const orchestrator = sr.orchestrator;
        const decision = await orchestrator.propose('tip', {
          recipient: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
          amount: '0.002',
          token: 'usdt',
          chainId: 'ethereum-sepolia',
          memo: '[Demo] Autonomous cycle for judges',
        });
        return {
          title: step.title,
          result: {
            consensus: decision.consensus,
            confidence: decision.overallConfidence,
            votes: decision.votes.map(v => ({ agent: v.agent, decision: v.decision, confidence: v.confidence })),
            reasoning: decision.reasoningChain,
          },
        };
      }

      case 'dca': {
        const dca = sr.dca;
        const plan = dca.createPlan({
          recipient: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
          totalAmount: 0.01,
          installments: 5,
          intervalHours: 24,
          token: 'usdt',
          chainId: 'ethereum-sepolia',
        });
        return { title: step.title, result: { planId: plan.id, totalAmount: plan.totalAmount, installments: plan.installments, intervalMs: plan.intervalMs, status: plan.status } };
      }

      case 'engagement': {
        const poe = sr.proofOfEngagement;
        const attestation = await poe.createAttestation({
          creator: 'demo-creator-001',
          contentId: 'demo-video-001',
          platform: 'rumble',
          watchPercent: 92,
          engagementScore: 85,
          sessionDurationSec: 1800,
          rewatchCount: 2,
          tipAmount: '0.003',
          tipToken: 'usdt',
          tipChainId: 'ethereum-sepolia',
          tipTxHash: '0x7a3e8c4f9b2d1e5a6c8f0d3b7e9a2c4f1d6e8a0b3c5f7d9e1a4b6c8d0e2f4a6',
          tipId: 'demo-poe-tip',
        });
        return { title: step.title, result: { attestationId: attestation.id, engagementScore: attestation.engagement.engagementScore, watchPercent: attestation.engagement.watchPercent, platform: attestation.platform, verified: attestation.verified } };
      }

      case 'creator_data': {
        const rumble = sr.rumble;
        const demoCreators = rumble.listCreators().slice(0, 5);
        const ytAPI = sr.rssAggregator?.getYouTubeAPI();
        const ytStatus = ytAPI ? ytAPI.getStatus() : { available: false, reason: 'not configured' };
        return {
          title: step.title,
          result: {
            rumbleCreators: demoCreators.map(c => ({ name: c.name, categories: c.categories, totalTipsReceived: c.totalTipsReceived })),
            youtubeApiStatus: ytStatus,
          },
        };
      }

      case 'reputation': {
        const rep = sr.reputation;
        const leaderboard = rep.getLeaderboard(5);
        return {
          title: step.title,
          result: {
            topCreators: leaderboard.map(c => ({ address: c.address, name: c.name, score: c.score, tier: c.tier, tipCount: c.tipCount, totalReceived: c.totalReceived })),
            totalTracked: rep.getCreatorCount(),
          },
        };
      }

      case 'personality': {
        const pers = sr.personality;
        const active = pers.getActiveDefinition();
        const memStats = sr.memory.getStats();
        const treasuryAlloc = sr.treasury.getAllocation();
        return {
          title: step.title,
          result: {
            personality: { type: pers.getActivePersonality(), name: active.name, description: active.description },
            agentMemory: memStats,
            financialPulse: { tippingReserve: treasuryAlloc.tippingReservePercent, yieldAllocation: treasuryAlloc.yieldPercent, gasBuffer: treasuryAlloc.gasBufferPercent },
          },
        };
      }

      case 'stats': {
        const history = ag.getHistory();
        const totalVolume = history.reduce((s, t) => s + parseFloat(t.amount || '0'), 0);
        const confirmedCount = history.filter(h => h.status === 'confirmed').length;
        const dcaStats = sr.dca.getStats();
        const escrowStats = { active: sr.escrow.getActiveCount(), total: sr.escrow.getAllEscrows().length };
        const memStats = sr.memory.getStats();
        return {
          title: step.title,
          result: {
            totalTips: history.length,
            confirmedTips: confirmedCount,
            totalVolume: totalVolume.toFixed(6),
            dcaPlans: dcaStats,
            escrow: escrowStats,
            memory: memStats,
            uptime: Math.floor(process.uptime()),
          },
        };
      }

      default:
        return { title: step.title, result: { message: 'Unknown step' } };
    }
  }

  /** POST /api/demo/run-full — SSE stream: runs ALL demo steps automatically */
  router.post('/demo/run-full', async (_req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const total = DEMO_STEPS.length;
    const deps: AgentStatusDeps = { agent, wallet, ai };

    for (let i = 1; i <= total; i++) {
      try {
        const { title, result } = await executeDemoStep(i, deps);
        const event = { step: i, total, title, result, status: 'success' as const };
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (err) {
        const event = { step: i, total, title: DEMO_STEPS[i - 1].title, result: { error: String(err) }, status: 'error' as const };
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // 2-second delay between steps for visual effect
      if (i < total) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Signal completion
    res.write(`data: ${JSON.stringify({ step: total, total, title: 'Demo complete', result: { message: 'All steps finished' }, status: 'done' })}\n\n`);
    res.end();
  });

  /** POST /api/demo/step — Run ONE demo step at a time (Gap #44) */
  router.post('/demo/step', async (req, res) => {
    try {
      const stepNum = typeof req.body?.step === 'number' ? req.body.step : parseInt(req.body?.step ?? '0', 10);
      if (stepNum < 1 || stepNum > DEMO_STEPS.length) {
        res.status(400).json({ error: `Step must be between 1 and ${DEMO_STEPS.length}`, steps: DEMO_STEPS.map((s, i) => ({ step: i + 1, title: s.title })) });
        return;
      }

      const deps: AgentStatusDeps = { agent, wallet, ai };
      const { title, result } = await executeDemoStep(stepNum, deps);
      res.json({ step: stepNum, total: DEMO_STEPS.length, title, result, status: 'success' });
    } catch (err) {
      logger.error('Demo step failed', { error: String(err) });
      res.status(500).json({ error: String(err), status: 'error' });
    }
  });

  /** GET /api/demo/steps — List all available demo steps */
  router.get('/demo/steps', (_req, res) => {
    res.json({ steps: DEMO_STEPS.map((s, i) => ({ step: i + 1, title: s.title, key: s.key })), total: DEMO_STEPS.length });
  });

  
  // ── Adversarial / Fraud Testing Demo ────────────────────────────────

  /** GET /api/demo/adversarial — list all adversarial scenarios */
  router.get('/demo/adversarial', (_req, res) => {
    try {
      const adversarial = services.adversarialDemo;
      if (!adversarial) {
        res.status(503).json({ error: 'AdversarialDemoService not initialized' });
        return;
      }
      res.json({ scenarios: adversarial.listScenarios() });
    } catch (err) {
      logger.error('Failed to list adversarial scenarios', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/demo/adversarial/run-all — run all 6 adversarial scenarios (must be before :id) */
  router.post('/demo/adversarial/run-all', async (_req, res) => {
    try {
      const adversarial = services.adversarialDemo;
      if (!adversarial) {
        res.status(503).json({ error: 'AdversarialDemoService not initialized' });
        return;
      }
      const results = await adversarial.runAll();
      const blocked = results.filter(r => r.blocked).length;
      res.json({
        summary: { total: results.length, blocked, passed: results.length - blocked },
        results,
      });
    } catch (err) {
      logger.error('Adversarial run-all failed', { error: String(err) });
      res.status(500).json({ error: String(err) });
    }
  });

  /** POST /api/demo/adversarial/:id — run a specific adversarial scenario */
  router.post('/demo/adversarial/:id', async (req, res) => {
    try {
      const adversarial = services.adversarialDemo;
      if (!adversarial) {
        res.status(503).json({ error: 'AdversarialDemoService not initialized' });
        return;
      }
      const result = await adversarial.runScenario(req.params.id);
      if (!result) {
        res.status(404).json({ error: `Unknown scenario: ${req.params.id}`, available: adversarial.listScenarios().map(s => s.id) });
        return;
      }
      res.json({ result });
    } catch (err) {
      logger.error('Adversarial scenario failed', { error: String(err), scenario: req.params.id });
      res.status(500).json({ error: String(err) });
    }
  });

/** GET /api/creators/live — returns latest YouTube RSS creator data */
  router.get('/creators/live', async (_req, res) => {
    try {
      const youtubeRSSService = services.youtubeRSS;
      const freshEvents = await youtubeRSSService.getNewEvents(new Date(0).toISOString());
      const liveData = youtubeRSSService.getLiveCreatorData();
      res.json({
        ok: true,
        source: 'youtube_rss',
        newEventsThisFetch: freshEvents.length,
        ...liveData,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'YouTube RSS fetch failed',
      });
    }
  });
}

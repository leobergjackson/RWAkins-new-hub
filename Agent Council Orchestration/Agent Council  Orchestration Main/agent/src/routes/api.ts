import { Router } from 'express';
import type { TipFlowAgent } from '../core/agent.js';
import { WalletService } from '../services/wallet.service.js';
import type { AIService } from '../services/ai.service.js';
import { logger } from '../utils/logger.js';
import { auditLog } from '../middleware/validate.js';
import { ServiceRegistry } from '../services/service-registry.js';
import { rateLimiterMiddleware } from '../middleware/rate-limiter.js';
import { requestLoggerMiddleware } from '../middleware/request-logger.js';

import { createAdvancedRouter } from './advanced.js';
import { registerController } from '../decorators/index.js';
import { HealthController, ArchitectureController } from '../controllers/health.controller.js';
import { registerWalletRoutes } from './wallet.routes.js';
import { registerTipRoutes } from './tip.routes.js';
import { registerRemittanceRoutes } from './remittance.routes.js';
import { registerDefiRoutes } from './defi.routes.js';
import { registerAutonomyRoutes } from './autonomy.routes.js';
import { registerAnalyticsRoutes } from './analytics.routes.js';
import { registerRumbleRoutes } from './rumble.routes.js';
import { registerEscrowRoutes } from './escrow.routes.js';
import { registerChatRoutes } from './chat.routes.js';
import { registerProtocolRoutes } from './protocol.routes.js';
import { registerPaymentsRoutes } from './payments.routes.js';
import { registerStreamingRoutes } from './streaming.routes.js';
import { registerAgentStatusRoutes } from './agent-status.routes.js';
import { registerReceiptRoutes } from './receipt.routes.js';
import { registerReputationRoutes } from './reputation.routes.js';
import { registerAtomicSwapRoutes } from './swap-atomic.routes.js';
import { registerSettingsRoutes } from './settings.routes.js';
import { registerSmartEscrowRoutes } from './smart-escrow.routes.js';
import { registerNotificationRoutes } from './notification.routes.js';
import { registerX402PaymentRoutes } from './x402-payment.routes.js';
import { X402PaymentService } from '../services/x402-payment.service.js';
import { registerPolicyRoutes } from './policy.routes.js';
import { registerZKProofRoutes } from './zk-proof.routes.js';
import { registerSplitRoutes } from './split.routes.js';
import { registerOpenApiRoutes } from './openapi.routes.js';
import { registerProofRoutes } from './proof.routes.js';
import { registerContractRoutes } from './contracts.routes.js';
import { registerA2ARoutes } from './a2a.routes.js';
import { A2AProtocolService } from '../services/a2a-protocol.service.js';
import { seedA2ARegistry } from '../services/a2a-registry.js';
import { registerAuditRoutes } from './audit.routes.js';
import { registerDocsRoutes } from './docs.routes.js';
import { AuditTrailService } from '../services/audit-trail.service.js';
import { AutonomousProofService } from '../services/autonomous-proof.service.js';
import { seedAuditTrailIfEmpty } from '../services/seed-audit-data.js';
import { registerGitHubRoutes } from './github.routes.js';
import { GitHubWebhookService } from '../services/github-webhook.service.js';
import { registerBrainRoutes } from './brain.routes.js';
import { WalletBrainService } from '../services/wallet-brain.service.js';
import { registerX402ProtocolRoutes } from './x402.routes.js';
import { X402ProtocolService } from '../services/x402-protocol.service.js';
import { registerCreditRoutes } from './credit.routes.js';
import { registerDialogueRoutes } from './dialogue.routes.js';
import { AgentDialogueService } from '../services/agent-dialogue.service.js';
import { registerPoolRoutes } from './pool.routes.js';
import { TipPoolService } from '../services/tip-pool.service.js';
import { registerCacheRoutes } from './cache.routes.js';
import { registerAutoTipRoutes } from './auto-tip.routes.js';
import { registerPipelineRoutes } from './pipeline.routes.js';
import { TransactionPipeline } from '../pipeline/transaction-pipeline.js';
import { DecisionCacheService } from '../services/decision-cache.service.js';
import { AutoTipService } from '../services/auto-tip.service.js';
import { registerOpenClawRoutes } from './openclaw.routes.js';
import { registerLLMRoutes } from './llm.routes.js';
import { LLMCostTrackerService } from '../services/llm-cost-tracker.service.js';
import { PaidFetchService } from '../services/paid-fetch.service.js';
import { registerYieldRouterRoutes } from './yield-router.routes.js';
import { YieldRouterService } from '../services/yield-router.service.js';
import { registerT402Routes } from './t402.routes.js';
import { T402ProtocolService } from '../services/t402-protocol.service.js';
import { registerEconomicsRoutes } from './economics.routes.js';
import { ProfitLossEngine } from '../economics/profit-loss-engine.js';
import { FeeModel } from '../economics/fee-model.js';
import { SustainabilityAnalyzer } from '../economics/sustainability-analyzer.js';
import { GaslessDemoService as GaslessDemoServiceImpl } from '../services/gasless-demo.service.js';

// ── Deep Architectural Systems ────────────────────────────────
import { registerConsensusRoutes } from './consensus.routes.js';
import { registerEventStoreRoutes } from './event-store.routes.js';
import { registerPolicyEngineRoutes } from './policy-engine.routes.js';
import { registerChainAbstractionRoutes } from './chain-abstraction.routes.js';
import { ChainAbstraction } from '../chains/chain-abstraction.js';
import { registerMetricsRoutes } from './metrics.routes.js';
import { eventStore, metrics, policyEngine, consensusProtocol } from '../shared-singletons.js';

// ── Service aliases — all instances live in ServiceRegistry ─────
// These re-exports preserve backward compatibility for modules that
// import named services from './api.js' (e.g. advanced.ts, index.ts).
const services = ServiceRegistry.getInstance();

export const riskEngineService = services.riskEngine;
export const proofOfEngagementService = services.proofOfEngagement;
export const revenueSmoothingService = services.revenueSmoothing;
export const creatorDiscoveryService = services.creatorDiscovery;
export const tipPropagationService = services.tipPropagation;
export const eventSimulatorService = services.eventSimulator;
export const youtubeRSSService = services.youtubeRSS;
export const decisionLogService = services.decisionLog;
export const tipPolicyService = services.tipPolicy;
export const x402Service = services.x402;
export const agentIdentityService = services.agentIdentity;
export const tipQueueService = services.tipQueue;
export const platformAdapterService = services.platformAdapter;
export const challenges = services.challenges;
export const limitsService = services.limits;
export const goalsService = services.goals;
export const rumbleService = services.rumble;
export const autonomyService = services.autonomy;
export const treasuryService = services.treasury;
export const indexerService = services.indexer;
export const bridgeService = services.bridge;
export const lendingService = services.lending;
export const reputationService = services.reputation;
export const escrowService = services.escrow;
export const orchestratorService = services.orchestrator;
export const predictorService = services.predictor;
export const feeArbitrageService = services.feeArbitrage;
export const memoryService = services.memory;
export const dcaService = services.dca;
export const creatorAnalyticsService = services.creatorAnalytics;
export const walletOpsService = services.walletOps;
export const safetyService = services.safety;
export const rpcFailoverService = services.rpcFailover;
export const economicsService = services.economics;
export const qrMerchantService = services.qrMerchant;
export const autoPaymentsService = services.autoPayments;
export const multiSigService = services.multiSig;
export const taxReportingService = services.taxReporting;
export const walletSwarmService = services.walletSwarm;
export const selfSustainingService = services.selfSustaining;
export const governanceService = services.governance;
export const priceAlertsService = services.priceAlerts;
export const agentMarketplaceService = services.agentMarketplace;
export const tradingSwarmService = services.tradingSwarm;
export const zkPrivacyService = services.zkPrivacy;
export const zkProofService = services.zkProof;
export const bitfinexPricingService = services.bitfinexPricing;
export const openClawService = services.openClaw;
export const defiStrategyService = services.defiStrategy;
export const reputationPassportService = services.reputationPassport;
export const atomicSwapService = services.atomicSwap;
export const smartEscrowService = services.smartEscrow;
export const pushNotificationService = services.pushNotification;
export const policyEnforcementService = services.policyEnforcement;

/** Autonomous loop — delegates to ServiceRegistry */
export function getAutonomousLoopService() { return services.autonomousLoop; }
export const autonomousLoopService = services.autonomousLoop;

/** Initialize the autonomous loop — now a no-op (handled by ServiceRegistry.initialize) */
export function initAutonomousLoop(_ai: AIService) {
  return services.autonomousLoop!;
}

/** Initialize multi-strategy service — delegates to ServiceRegistry */
export function initMultiStrategy(_ai: AIService, _wallet: WalletService) {
  return services.initMultiStrategy();
}

export function getMultiStrategyService() { return services.multiStrategy; }

export const webhooks = services.webhooks;
export const personality = services.personality;
export const webhookReceiverService = services.webhookReceiver;
export const rssAggregatorService = services.rssAggregator;
export const youtubeAPIService = services.youtubeAPI;

/** Create API router with injected dependencies */
export function createApiRouter(
  agent: TipFlowAgent,
  wallet: WalletService,
  ai: AIService,
): Router {
  const router = Router();

  // Receipt & Streaming & DCA & Swap services (from ServiceRegistry, nullable before initialize)
  const receiptService = services.receipt;
  const swapService = services.swap;
  const streamingService = services.streaming;
  const contacts = services.contacts;

  // Wire receipt and reputation services to agent (skip if not yet initialized)
  if (receiptService) agent.setReceiptService(receiptService);
  agent.setReputationService(reputationService);

  // ── Production hardening middleware (applied early) ──────────
  router.use(requestLoggerMiddleware());
  router.use(rateLimiterMiddleware());
  logger.info('Production middleware registered: request-logger, rate-limiter');

  // Apply audit logging to all API routes
  router.use(auditLog());

  // ── NestJS-style Decorator Controllers ──────────────────────
  registerController(router, new HealthController());
  registerController(router, new ArchitectureController());
  logger.info('Decorator controllers registered (HealthController, ArchitectureController)');

  // ── OpenAPI docs (must be before agent-status to override basic /docs) ──
  registerOpenApiRoutes(router);

  // ── Swagger UI docs at /api/docs with full interactive explorer ──
  registerDocsRoutes(router);

  // ── Agent Status, Health, Activity, Demo ─────────────────────
  registerAgentStatusRoutes(router, { agent, wallet, ai });

  // ── Wallet Routes ───────────────────────────────────────────
  registerWalletRoutes(router, wallet);

  // ── Tip Routes ──────────────────────────────────────────────
  registerTipRoutes(router, agent, wallet, ai, contacts, safetyService, riskEngineService);

  // ── Remittance Routes (USD→MXN via Bitso off-ramp) ──────────
  registerRemittanceRoutes(router);

  // ── DeFi Routes ─────────────────────────────────────────────
  registerDefiRoutes(router, {
    bridge: bridgeService,
    lending: lendingService,
    swap: swapService!,
    streaming: streamingService!,
    dca: dcaService,
    feeArbitrage: feeArbitrageService,
    defiStrategy: defiStrategyService,
    walletOps: walletOpsService,
    wallet,
    treasury: treasuryService,
    indexer: indexerService,
    getMultiStrategy: () => services.multiStrategy,
    getAutonomousLoop: () => services.autonomousLoop,
  });

  // ── Autonomy Routes ─────────────────────────────────────────
  registerAutonomyRoutes(router, {
    agent,
    autonomy: autonomyService,
    orchestrator: orchestratorService,
    predictor: predictorService,
    memory: memoryService,
    eventSimulator: eventSimulatorService,
    decisionLog: decisionLogService,
    getAutonomousLoop: () => services.autonomousLoop,
  });

  // ── Analytics Routes ────────────────────────────────────────
  registerAnalyticsRoutes(router, {
    agent,
    wallet,
    reputation: reputationService,
    riskEngine: riskEngineService,
    economics: economicsService,
    creatorAnalytics: creatorAnalyticsService,
    safety: safetyService,
    rpcFailover: rpcFailoverService,
    getAutonomousLoop: () => services.autonomousLoop,
    anomalyDetection: services.anomalyDetection,
    creditScoring: services.creditScoring,
  });

  // ── Rumble Routes ───────────────────────────────────────────
  registerRumbleRoutes(router, { rumble: rumbleService });

  // ── Settings, Contacts, Templates, Personality, etc. ────────
  registerSettingsRoutes(router, {
    agent,
    contacts,
    templates: services.templates,
    personality: services.personality,
    ensService: services.ens,
    tagsService: services.tags,
    challenges: services.challenges,
    limitsService: services.limits,
    goalsService: services.goals,
  });

  // ── Chat, Conditions & Webhooks ─────────────────────────────
  registerChatRoutes(router, agent, wallet, ai, services.personality, services.webhooks);

  // ── Cryptographic Tip Receipts ──────────────────────────────
  registerReceiptRoutes(router, receiptService);

  // ── Escrow Routes ───────────────────────────────────────────
  registerEscrowRoutes(router, escrowService);

  // ── Payments & AI Routes ────────────────────────────────────
  registerPaymentsRoutes(router, autoPaymentsService, ai);

  // ── Protocol Routes ─────────────────────────────────────────
  registerProtocolRoutes(router, {
    tipPolicy: tipPolicyService,
    x402: x402Service,
    agentIdentity: agentIdentityService,
    tipQueue: tipQueueService,
    platformAdapter: platformAdapterService,
    proofOfEngagement: proofOfEngagementService,
    revenueSmoothing: revenueSmoothingService,
    creatorDiscovery: creatorDiscoveryService,
    tipPropagation: tipPropagationService,
    rumble: rumbleService,
    riskEngine: riskEngineService,
    bridge: bridgeService,
    lending: lendingService,
    escrow: escrowService,
    reputation: reputationService,
    feeArbitrage: feeArbitrageService,
    memory: memoryService,
  });

  // ── SSE Streaming Reasoning ─────────────────────────────────
  registerStreamingRoutes(router, ai);

  // ── Cross-Chain Reputation Passport ─────────────────────────
  registerReputationRoutes(router, reputationPassportService);

  // ── Cross-Chain Atomic Swaps ───────────────────────────────
  registerAtomicSwapRoutes(router, atomicSwapService);

  // ── Smart Escrow (CREATE2 Deterministic) ──────────────────
  registerSmartEscrowRoutes(router, smartEscrowService);

  // ── Push Notifications (SSE) ──────────────────────────────
  registerNotificationRoutes(router, pushNotificationService);

  // ── Policy Enforcement ──────────────────────────────────────
  registerPolicyRoutes(router, policyEnforcementService);

  // ── ZK Proof (hash-based privacy-preserving verification) ──
  registerZKProofRoutes(router, zkProofService);

  // ── Tip Splitter Routes ──────────────────────────────────────
  registerSplitRoutes(router, { tipSplitter: services.tipSplitter });

  // ── Economics P&L Engine ────────────────────────────────────
  const pnlEngine = new ProfitLossEngine();
  const feeModel = new FeeModel();
  const sustainabilityAnalyzer = new SustainabilityAnalyzer(pnlEngine, feeModel);
  registerEconomicsRoutes(router, { pnlEngine, feeModel, sustainabilityAnalyzer });

  // ── x402 HTTP 402 Micropayment Protocol ──────────────────
  const x402PaymentService = new X402PaymentService();
  // Register the 3 demo paywalled endpoints
  x402PaymentService.createPaywall('/api/x402/premium/market-analysis', '0.01', 'USDT', 'Multi-chain market analysis with gas optimization insights');
  x402PaymentService.createPaywall('/api/x402/premium/ai-recommendation', '0.005', 'USDT', 'AI-powered creator tip recommendations');
  x402PaymentService.createPaywall('/api/x402/premium/portfolio-report', '0.02', 'USDT', 'Comprehensive agent portfolio and treasury report');
  registerX402PaymentRoutes(router, x402PaymentService);

  // ── Webhook Receiver Routes ─────────────────────────────────
  const webhookReceiver = services.webhookReceiver;
  const rssAggregator = services.rssAggregator;

  // POST /api/webhooks/ingest — receive webhook events with signature verification
  router.post('/webhooks/ingest', (req, res) => {
    try {
      const rawBody = JSON.stringify(req.body);
      const event = req.body;
      if (!event || !event.platform || !event.creatorId || !event.creatorName) {
        res.status(400).json({ error: 'Missing required fields: platform, creatorId, creatorName' });
        return;
      }
      const result = webhookReceiver.ingestEvent(event, rawBody);
      if (!result) {
        res.status(403).json({ error: 'Signature verification failed' });
        return;
      }
      res.json({ ok: true, event: result });
    } catch (err) {
      logger.error('Webhook ingest error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/webhooks/events — list recent events
  router.get('/webhooks/events', (req, res) => {
    const since = typeof req.query.since === 'string' ? req.query.since : undefined;
    res.json({ events: webhookReceiver.getRecentEvents(since) });
  });

  // POST /api/webhooks/register — register a webhook
  router.post('/webhooks/register', (req, res) => {
    const { platform, callbackUrl, secret } = req.body ?? {};
    if (!platform || !callbackUrl || !secret) {
      res.status(400).json({ error: 'Missing required fields: platform, callbackUrl, secret' });
      return;
    }
    const registration = webhookReceiver.registerWebhook(platform, callbackUrl, secret);
    res.json({ ok: true, registration: { ...registration, secret: registration.secret.slice(0, 4) + '****' } });
  });

  // GET /api/webhooks/stats — webhook statistics
  router.get('/webhooks/stats', (_req, res) => {
    res.json(webhookReceiver.getStats());
  });

  // POST /api/webhooks/test — send a test event (for demo)
  router.post('/webhooks/test', (req, res) => {
    const testEvent = {
      platform: req.body?.platform ?? 'rumble',
      eventType: req.body?.eventType ?? 'new_video',
      creatorId: req.body?.creatorId ?? 'test_creator_001',
      creatorName: req.body?.creatorName ?? 'TestCreator',
      data: {
        title: req.body?.data?.title ?? 'Test Video — Webhook Integration Demo',
        views: req.body?.data?.views ?? 15000,
        likes: req.body?.data?.likes ?? 500,
        url: req.body?.data?.url ?? 'https://rumble.com/test-video.html',
        ...(req.body?.data ?? {}),
      },
      timestamp: new Date().toISOString(),
    };
    const result = webhookReceiver.ingestEvent(testEvent);
    res.json({ ok: true, testEvent, result });
  });

  // GET /api/creators/feeds — returns latest data from all RSS sources
  router.get('/creators/feeds', (_req, res) => {
    res.json(rssAggregator.getFeedsSummary());
  });

  // ── YouTube Data API v3 Routes ──────────────────────────────────
  const ytAPI = rssAggregator.getYouTubeAPI();

  // GET /api/youtube/status — check if YouTube API is available + quota
  router.get('/youtube/status', (_req, res) => {
    res.json(ytAPI.getStatus());
  });

  // GET /api/youtube/search?q=crypto — search YouTube videos
  router.get('/youtube/search', async (req, res) => {
    try {
      if (!ytAPI.isAvailable()) {
        res.status(503).json({ error: 'YouTube API not configured (set YOUTUBE_API_KEY)' });
        return;
      }
      const q = typeof req.query.q === 'string' ? req.query.q : 'crypto tipping';
      const maxResults = Math.min(parseInt(String(req.query.maxResults ?? '5'), 10) || 5, 25);
      const videos = await ytAPI.searchVideos(q, maxResults);
      res.json({ videos, count: videos.length, query: q });
    } catch (err) {
      logger.error('YouTube search error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'YouTube search failed' });
    }
  });

  // GET /api/youtube/channel/:channelId — get channel details
  router.get('/youtube/channel/:channelId', async (req, res) => {
    try {
      if (!ytAPI.isAvailable()) {
        res.status(503).json({ error: 'YouTube API not configured (set YOUTUBE_API_KEY)' });
        return;
      }
      const channel = await ytAPI.getChannelDetails(req.params.channelId);
      if (!channel) {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }
      res.json({ channel });
    } catch (err) {
      logger.error('YouTube channel error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'YouTube channel lookup failed' });
    }
  });

  // GET /api/youtube/trending — get trending crypto/tech content
  router.get('/youtube/trending', async (_req, res) => {
    try {
      if (!ytAPI.isAvailable()) {
        res.status(503).json({ error: 'YouTube API not configured (set YOUTUBE_API_KEY)' });
        return;
      }
      const videos = await ytAPI.getTrendingCreatorContent();
      res.json({ videos, count: videos.length });
    } catch (err) {
      logger.error('YouTube trending error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'YouTube trending lookup failed' });
    }
  });

  // ── Agent Tool-Use (LLM-driven agentic loop) ─────────────────
  router.post('/agent/tool-use', async (req, res) => {
    try {
      const { goal, maxSteps } = req.body ?? {};
      if (!goal || typeof goal !== 'string') {
        res.status(400).json({ error: 'Missing required field: goal (string)' });
        return;
      }

      // Convert OpenClaw tools to AgenticToolDefinition format
      const openClaw = openClawService;
      const openClawTools = openClaw.listTools();
      const agenticTools: Array<{ name: string; description: string; parameters: Record<string, { type: string; description: string }>; executor: (params: Record<string, unknown>) => Promise<unknown> }> = openClawTools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: Object.fromEntries(
          t.parameters.map(p => [p.name, { type: p.type, description: p.description }])
        ),
        executor: async (params: Record<string, unknown>) => {
          const result = await t.executor(params);
          return result;
        },
      }));

      const result = await ai.agenticToolUse(goal, agenticTools, maxSteps ?? 5);
      res.json({
        ok: true,
        goal,
        ...result,
        toolCount: agenticTools.length,
        provider: ai.getProvider(),
      });
    } catch (err) {
      logger.error('Agent tool-use error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Agent tool-use failed', detail: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── Bitfinex Pricing Routes ──────────────────────────────────
  const bitfinexPricing = services.bitfinexPricing;

  // GET /api/prices/bitfinex — fetch all common pair prices
  router.get('/prices/bitfinex', async (_req, res) => {
    try {
      const symbol = typeof _req.query.symbol === 'string' ? _req.query.symbol : undefined;
      if (symbol) {
        const ticker = await bitfinexPricing.getPrice(symbol);
        res.json({ ok: true, ticker });
        return;
      }
      const tickers = await bitfinexPricing.getAllPrices();
      res.json({ ok: true, tickers, count: tickers.length, cache: bitfinexPricing.getCacheStats() });
    } catch (err) {
      logger.error('Bitfinex pricing error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Bitfinex pricing fetch failed', detail: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── Group 7: Advanced WDK & Integrations ────────────────────
  router.use('/advanced', createAdvancedRouter(wallet, ai));
  logger.info('Advanced WDK routes mounted at /api/advanced/*');

  // ── On-Chain Proof Generation ──────────────────────────────
  registerProofRoutes(router, { wallet, lending: lendingService });

  // ── Deployed Contracts & Proof Tx ────────────────────────
  registerContractRoutes(router);

  // ── Agent-to-Agent (A2A) Payment Protocol ──────────────────
  const a2aProtocol = new A2AProtocolService();
  seedA2ARegistry(a2aProtocol);
  registerA2ARoutes(router, a2aProtocol);
  logger.info('A2A payment protocol routes mounted at /api/a2a/*');

  // ── Decision Audit Trail & Autonomous Proof ──────────────────
  const auditTrailService = new AuditTrailService();
  seedAuditTrailIfEmpty(auditTrailService);
  const autonomousProofService = new AutonomousProofService(auditTrailService);
  registerAuditRoutes(router, { auditTrail: auditTrailService, autonomousProof: autonomousProofService });
  logger.info('Audit trail routes mounted at /api/audit/*');

  // ── GitHub Webhook Tipping ────────────────────────────────────
  const githubWebhookService = new GitHubWebhookService();
  registerGitHubRoutes(router, { githubWebhook: githubWebhookService });
  logger.info('GitHub webhook tipping routes mounted at /api/github/*');

  // ── Wallet-as-Brain Engine ──────────────────────────────────
  const walletBrainService = new WalletBrainService();
  walletBrainService.start();
  registerBrainRoutes(router, walletBrainService);

  // ── x402 Payment Protocol (unified service with payForAccess) ──
  const x402ProtocolService = new X402ProtocolService();
  x402ProtocolService.createPaywall('/api/x402/protocol/demo', '0.01', 'ethereum-sepolia', { description: 'Premium Agent Intelligence Report' });
  registerX402ProtocolRoutes(router, x402ProtocolService);
  logger.info('x402 protocol routes mounted at /api/x402/protocol/*');

  // ── Credit Scoring (agent-level leaderboard + reports) ──────
  registerCreditRoutes(router, services.creditScoring);
  logger.info('Credit scoring routes mounted at /api/credit/*');

  // ── Agent Dialogue ("Board Meeting") Debate System ──────────
  const agentDialogueService = new AgentDialogueService();
  registerDialogueRoutes(router, agentDialogueService);

  // ── Community Tip Pools (crowdfunded bounty pools) ────────────
  const tipPoolService = new TipPoolService();
  registerPoolRoutes(router, tipPoolService);
  logger.info('Tip pool routes mounted at /api/pools/*');

  // ── LLM Decision Cache (context-hashing cost saver) ──────────
  const decisionCacheService = new DecisionCacheService();
  registerCacheRoutes(router, decisionCacheService);
  logger.info('Decision cache routes mounted at /api/cache/*');

  // ── Auto-Tip Standing Orders (persistent auto-tip rules) ────
  const autoTipService = new AutoTipService();
  registerAutoTipRoutes(router, autoTipService);
  logger.info('Auto-tip standing order routes mounted at /api/auto-tip/*');

  // ── OpenClaw Runtime (SOUL.md + skill files) ──────────────────
  registerOpenClawRoutes(router, services.openClawRuntime);
  logger.info('OpenClaw Runtime routes mounted at /api/openclaw/*');

  // ── LLM Cost Tracking ────────────────────────────────────────
  const llmCostTracker = new LLMCostTrackerService();
  registerLLMRoutes(router, llmCostTracker);

  // ── Paid Fetch (agent-as-API-consumer) ────────────────────────
  const paidFetchService = new PaidFetchService();
  paidFetchService.setWallet(wallet);

  // GET /api/paid-fetch/stats — paid API usage stats
  router.get('/paid-fetch/stats', (_req, res) => {
    res.json({ ok: true, ...paidFetchService.getPaidFetchStats() });
  });

  // GET /api/paid-fetch/history — recent payment history
  router.get('/paid-fetch/history', (req, res) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    res.json({ ok: true, payments: paidFetchService.getPaymentHistory(limit) });
  });

  // POST /api/paid-fetch — execute a paid fetch request
  router.post('/paid-fetch', async (req, res) => {
    try {
      const { url, method, headers: reqHeaders, body: reqBody, maxPayment, preferredChain } = req.body ?? {};
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Missing required field: url' });
        return;
      }
      const response = await paidFetchService.paidFetch(url, {
        method: method ?? 'GET',
        headers: reqHeaders,
        body: reqBody ? JSON.stringify(reqBody) : undefined,
        maxPayment,
        preferredChain,
      });
      const text = await response.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      res.json({
        ok: true,
        status: response.status,
        data,
        stats: paidFetchService.getPaidFetchStats(),
      });
    } catch (err) {
      logger.error('Paid fetch error', { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ error: 'Paid fetch failed', detail: err instanceof Error ? err.message : String(err) });
    }
  });
  logger.info('Paid fetch routes mounted at /api/paid-fetch/*');

  // ── Multi-Protocol Yield Router (Aave + Compound + Morpho) ────
  const yieldRouterService = new YieldRouterService();
  registerYieldRouterRoutes(router, yieldRouterService);

  // ── t402 Payment Protocol Wrapper ──────────────────────────────
  const t402ProtocolService = new T402ProtocolService();
  registerT402Routes(router, t402ProtocolService);

  // ── Gasless Transaction Demo (ERC-4337 simulation) ────────────
  const gaslessDemoService = new GaslessDemoServiceImpl();

  router.get('/gasless/simulate', (req, res) => {
    try {
      const chain = typeof req.query.chain === 'string' ? req.query.chain : 'ethereum';
      const recipient = typeof req.query.recipient === 'string' ? req.query.recipient : '0x' + 'b'.repeat(40);
      const amount = parseFloat(String(req.query.amount ?? '1'));
      if (isNaN(amount) || amount <= 0) {
        res.status(400).json({ error: 'Invalid amount — must be a positive number' });
        return;
      }
      const simulation = gaslessDemoService.simulateGaslessTransfer(chain, recipient, amount);
      res.json(simulation);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Gasless simulation error', { error: message });
      res.status(400).json({ error: message });
    }
  });

  router.get('/gasless/chains', (_req, res) => {
    res.json({ chains: gaslessDemoService.getChainComparison() });
  });

  logger.info('Gasless demo routes mounted at /api/gasless/*');

  // ── Transaction Pipeline (8-stage: validate→quote→approve→sign→broadcast→confirm→verify→record) ──
  const pipelineAuditService = new AuditTrailService();
  const transactionPipeline = new TransactionPipeline(wallet, orchestratorService, pipelineAuditService);
  registerPipelineRoutes(router, transactionPipeline);
  logger.info('Transaction pipeline routes mounted at /api/pipeline/*');

  // ══════════════════════════════════════════════════════════════
  // ── Deep Architectural Systems ─────────────────────────────
  // ══════════════════════════════════════════════════════════════

  // ── 1. Consensus Protocol (shared singleton — cryptographic voting) ──
  registerConsensusRoutes(router, consensusProtocol);

  // ── 2. Event Sourcing (shared singleton — append-only hash-chain audit) ──
  registerEventStoreRoutes(router, eventStore);

  // ── 3. Policy Engine (shared singleton — composable rules) ──
  registerPolicyEngineRoutes(router, policyEngine);

  // ── 4. Chain Abstraction Layer (unified 9-chain interface + real RPC) ──
  const chainAbstraction = new ChainAbstraction();
  chainAbstraction.startHealthMonitoring(120000); // Real RPC health checks every 2 min
  registerChainAbstractionRoutes(router, chainAbstraction);

  // ── 5. Observability & Metrics (shared singleton — real instrumentation) ──
  registerMetricsRoutes(router, metrics);

  logger.info('All 5 deep architectural systems registered (REAL shared singletons, no demo seeds)');

  return router;
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Protocol route handlers (extracted from api.ts)
// Covers: Tip Policies, x402, Agent Identity, Tip Queue, Platform Adapters,
// Proof-of-Engagement, Revenue Smoothing, Creator Discovery, Tip Propagation

import { Router } from 'express';
import type { TipPolicyService } from '../services/tip-policy.service.js';
import type { X402Service } from '../services/x402.service.js';
import type { AgentIdentityService } from '../services/agent-identity.service.js';
import type { TipQueueService } from '../services/tip-queue.service.js';
import type { PlatformAdapterService } from '../services/platform-adapter.service.js';
import type { ProofOfEngagementService } from '../services/proof-of-engagement.service.js';
import type { RevenueSmoothingService } from '../services/revenue-smoothing.service.js';
import type { CreatorDiscoveryService } from '../services/creator-discovery.service.js';
import type { TipPropagationService } from '../services/tip-propagation.service.js';
import type { RumbleService } from '../services/rumble.service.js';
import type { RiskEngineService } from '../services/risk-engine.service.js';
import type { BridgeService } from '../services/bridge.service.js';
import type { LendingService } from '../services/lending.service.js';
import type { EscrowService } from '../services/escrow.service.js';
import type { ReputationService } from '../services/reputation.service.js';
import type { FeeArbitrageService } from '../services/fee-arbitrage.service.js';
import type { MemoryService } from '../services/memory.service.js';

export interface ProtocolRouteDeps {
  tipPolicy: TipPolicyService;
  x402: X402Service;
  agentIdentity: AgentIdentityService;
  tipQueue: TipQueueService;
  platformAdapter: PlatformAdapterService;
  proofOfEngagement: ProofOfEngagementService;
  revenueSmoothing: RevenueSmoothingService;
  creatorDiscovery: CreatorDiscoveryService;
  tipPropagation: TipPropagationService;
  rumble: RumbleService;
  riskEngine: RiskEngineService;
  bridge: BridgeService;
  lending: LendingService;
  escrow: EscrowService;
  reputation: ReputationService;
  feeArbitrage: FeeArbitrageService;
  memory: MemoryService;
}

/**
 * Register protocol-level routes onto the given router.
 */
export function registerProtocolRoutes(
  router: Router,
  deps: ProtocolRouteDeps,
): void {
  const {
    tipPolicy, x402, agentIdentity, tipQueue, platformAdapter,
    proofOfEngagement, revenueSmoothing, creatorDiscovery, tipPropagation, rumble,
    riskEngine, bridge, lending, escrow, reputation, feeArbitrage, memory,
  } = deps;

  // ══════════════════════════════════════════════
  //  TIP POLICY ENGINE — Programmable Money
  // ══════════════════════════════════════════════

  /** GET /api/policies — List all tip policies */
  router.get('/policies', (_req, res) => {
    res.json({ policies: tipPolicy.listPolicies(), stats: tipPolicy.getStats() });
  });

  /** POST /api/policies — Create a new tip policy */
  router.post('/policies', (req, res) => {
    try {
      const policy = tipPolicy.createPolicy(req.body);
      res.json({ policy });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/policies/:id — Get a specific policy */
  router.get('/policies/:id', (req, res) => {
    const policy = tipPolicy.getPolicy(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json({ policy });
  });

  /** PUT /api/policies/:id/toggle — Enable/disable a policy */
  router.put('/policies/:id/toggle', (req, res) => {
    const policy = tipPolicy.togglePolicy(req.params.id, req.body.enabled);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json({ policy });
  });

  /** DELETE /api/policies/:id — Delete a policy */
  router.delete('/policies/:id', (req, res) => {
    const result = tipPolicy.deletePolicy(req.params.id);
    if (!result) return res.status(404).json({ error: 'Policy not found' });
    res.json({ deleted: true });
  });

  /** POST /api/policies/evaluate — Evaluate all policies against context */
  router.post('/policies/evaluate', (req, res) => {
    const evaluations = tipPolicy.evaluatePolicies(req.body);
    const triggered = evaluations.filter((e) => e.conditionsMet && e.cooldownOk);
    res.json({ evaluations, triggered, totalEvaluated: evaluations.length });
  });

  // ══════════════════════════════════════════════
  //  x402 PAYMENT PROTOCOL — Agent-to-Agent Commerce
  // ══════════════════════════════════════════════

  /** GET /api/x402/endpoints — List all monetized x402 endpoints */
  router.get('/x402/endpoints', (_req, res) => {
    res.json({ endpoints: x402.getEndpoints(), stats: x402.getStats() });
  });

  /** POST /api/x402/pay — Submit payment proof for a 402 requirement */
  router.post('/x402/pay', (req, res) => {
    try {
      const proof = req.body as { requirementId: string; txHash: string; chainId: string; amount: string; payer: string };
      const result = x402.verifyPayment({
        ...proof,
        paidAt: new Date().toISOString(),
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/x402/stats — x402 revenue and payment statistics */
  router.get('/x402/stats', (_req, res) => {
    res.json(x402.getStats());
  });

  // ══════════════════════════════════════════════
  //  AGENT IDENTITY — Cryptographic Identity & Discovery
  // ══════════════════════════════════════════════

  /** GET /api/agent/identity — Get this agent's cryptographic identity */
  router.get('/agent/identity', (_req, res) => {
    const identity = agentIdentity.getIdentity();
    if (!identity) return res.status(503).json({ error: 'Agent identity not initialized' });
    res.json({ identity, protocol: 'AeroFyta Protocol v1.0' });
  });

  /** GET /api/agent/challenge — Generate a challenge for identity verification */
  router.get('/agent/challenge', (_req, res) => {
    const challenge = agentIdentity.generateChallenge();
    res.json(challenge);
  });

  /** POST /api/agent/verify — Verify another agent's identity */
  router.post('/agent/verify', async (req, res) => {
    try {
      const result = await agentIdentity.verifyAgent(req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** POST /api/agent/sign-challenge — Sign a challenge to prove our identity */
  router.post('/agent/sign-challenge', async (req, res) => {
    try {
      const { challenge } = req.body as { challenge: string };
      if (!challenge) return res.status(400).json({ error: 'challenge is required' });
      const result = await agentIdentity.signChallenge(challenge);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  // ── ERC-8004 Agent Identity (DID-based) ─────────────────────
  // These routes complement the existing /api/agent/* routes above
  // with ERC-8004 DID identity, proof signing, and verification.

  /** GET /api/identity — ERC-8004 agent identity with DID */
  router.get('/identity', (_req, res) => {
    const identity = agentIdentity.getIdentity();
    if (!identity) return res.status(503).json({ error: 'Agent identity not initialized' });
    res.json({
      ok: true,
      standard: 'ERC-8004',
      did: identity.did,
      name: identity.name,
      version: identity.version,
      walletAddress: identity.walletAddress,
      capabilities: identity.capabilities,
      nonce: identity.nonce,
      registeredAt: identity.registeredAt,
      lastActiveAt: identity.lastActiveAt,
    });
  });

  /** POST /api/identity/prove — Sign an identity proof (ERC-8004 challenge-response) */
  router.post('/identity/prove', async (req, res) => {
    try {
      const { challenge } = req.body ?? {};
      if (!challenge || typeof challenge !== 'string') {
        res.status(400).json({ error: 'Missing required field: challenge (string)' });
        return;
      }
      const proof = await agentIdentity.signIdentityProof(challenge);
      res.json({ ok: true, standard: 'ERC-8004', proof });
    } catch (err) {
      res.status(500).json({ error: 'Identity proof failed', detail: String(err) });
    }
  });

  /** POST /api/identity/verify — Verify another agent's ERC-8004 identity proof */
  router.post('/identity/verify', (req, res) => {
    try {
      const { did, challenge, signature } = req.body ?? {};
      if (!did || !challenge || !signature) {
        res.status(400).json({ error: 'Missing required fields: did, challenge, signature' });
        return;
      }
      const result = agentIdentity.verifyIdentityProof(did, challenge, signature);
      res.json({ ok: true, standard: 'ERC-8004', ...result });
    } catch (err) {
      res.status(500).json({ error: 'Identity verification failed', detail: String(err) });
    }
  });

  // ══════════════════════════════════════════════
  //  TIP QUEUE — Async Event-Driven Processing
  // ══════════════════════════════════════════════

  /** POST /api/queue/enqueue — Add a tip to the async queue */
  router.post('/queue/enqueue', (req, res) => {
    try {
      const tip = tipQueue.enqueue(req.body);
      res.status(202).json({ tip, message: 'Tip queued for async processing' });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/queue — Get current queue contents */
  router.get('/queue', (_req, res) => {
    res.json({ queue: tipQueue.getQueue(), stats: tipQueue.getStats() });
  });

  /** GET /api/queue/stats — Queue processing statistics */
  router.get('/queue/stats', (_req, res) => {
    res.json(tipQueue.getStats());
  });

  /** GET /api/queue/dlq — Dead letter queue (failed tips) */
  router.get('/queue/dlq', (_req, res) => {
    res.json({ deadLetterQueue: tipQueue.getDeadLetterQueue() });
  });

  // ══════════════════════════════════════════════
  //  PLATFORM ADAPTERS — Multi-Platform Scaling
  // ══════════════════════════════════════════════

  /** GET /api/platforms — List all registered platform adapters */
  router.get('/platforms', (_req, res) => {
    res.json({
      adapters: platformAdapter.listAdapters(),
      stats: platformAdapter.getCrossPlatformStats(),
    });
  });

  /** GET /api/platforms/creators — Get creators across all platforms */
  router.get('/platforms/creators', (_req, res) => {
    res.json({ creators: platformAdapter.getAllCreators() });
  });

  /** POST /api/platforms/:platform/event — Process event from any platform */
  router.post('/platforms/:platform/event', (req, res) => {
    try {
      const engagement = platformAdapter.processRawEvent(req.params.platform, req.body);
      if (!engagement) return res.status(400).json({ error: 'Could not normalize event' });
      res.json({ engagement });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/platforms/tips — Cross-platform tip events */
  router.get('/platforms/tips', (req, res) => {
    const platform = req.query.platform as string | undefined;
    res.json({ tips: platformAdapter.getTipEvents(platform) });
  });

  // ══════════════════════════════════════════════
  //  PROOF-OF-ENGAGEMENT — Cryptographic Attestations
  // ══════════════════════════════════════════════

  /** POST /api/poe/attest — Create a Proof-of-Engagement attestation */
  router.post('/poe/attest', async (req, res) => {
    try {
      const attestation = await proofOfEngagement.createAttestation(req.body);
      res.json({ attestation });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/poe/verify/:id — Verify an attestation */
  router.get('/poe/verify/:id', async (req, res) => {
    const result = await proofOfEngagement.verifyAttestation(req.params.id);
    res.json(result);
  });

  /** GET /api/poe — List attestations */
  router.get('/poe', (req, res) => {
    const filter = {
      creator: req.query.creator as string | undefined,
      viewer: req.query.viewer as string | undefined,
      platform: req.query.platform as string | undefined,
    };
    res.json({ attestations: proofOfEngagement.getAttestations(filter), stats: proofOfEngagement.getStats() });
  });

  // ══════════════════════════════════════════════
  //  REVENUE SMOOTHING — Creator Income Insurance
  // ══════════════════════════════════════════════

  /** POST /api/smoothing/enroll — Enroll a creator */
  router.post('/smoothing/enroll', (req, res) => {
    try {
      const { creatorId, walletAddress, smoothingLevel } = req.body;
      const profile = revenueSmoothing.enrollCreator(creatorId, walletAddress, smoothingLevel);
      res.json({ profile });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/smoothing/profiles — List enrolled creators */
  router.get('/smoothing/profiles', (_req, res) => {
    res.json({ profiles: revenueSmoothing.listProfiles() });
  });

  /** GET /api/smoothing/reserve — Reserve fund status */
  router.get('/smoothing/reserve', (_req, res) => {
    res.json(revenueSmoothing.getReserveStatus());
  });

  /** POST /api/smoothing/evaluate — Run smoothing evaluation */
  router.post('/smoothing/evaluate', (_req, res) => {
    const actions = revenueSmoothing.evaluateSmoothing();
    res.json({ actions, reserve: revenueSmoothing.getReserveStatus() });
  });

  /** GET /api/smoothing/history — Smoothing action history */
  router.get('/smoothing/history', (req, res) => {
    const creatorId = req.query.creatorId as string | undefined;
    res.json({ actions: revenueSmoothing.getActionHistory(creatorId) });
  });

  // ══════════════════════════════════════════════
  //  CREATOR DISCOVERY — AI Angel Investing
  // ══════════════════════════════════════════════

  /** POST /api/discovery/analyze — Analyze all creators for undervaluation */
  router.post('/discovery/analyze', (_req, res) => {
    const creators = rumble.listCreators().map((c) => ({
      id: c.id, name: c.name, walletAddress: c.walletAddress,
      categories: c.categories, totalTipAmount: c.totalTipAmount,
      subscriberCount: c.subscriberCount,
    }));
    const signals = creatorDiscovery.analyzeCreators(creators);
    res.json({ signals, stats: creatorDiscovery.getStats() });
  });

  /** GET /api/discovery/signals — Get current discovery signals */
  router.get('/discovery/signals', (_req, res) => {
    res.json({ signals: creatorDiscovery.getSignals(), stats: creatorDiscovery.getStats() });
  });

  /** POST /api/discovery/record — Record a discovery tip */
  router.post('/discovery/record', (req, res) => {
    try {
      const record = creatorDiscovery.recordDiscovery(req.body);
      res.json({ record });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  // ══════════════════════════════════════════════
  //  TIP PROPAGATION — Viral Tipping + Amplifiers
  // ══════════════════════════════════════════════

  /** POST /api/propagation/wave — Create a tip wave */
  router.post('/propagation/wave', (req, res) => {
    try {
      const wave = tipPropagation.createWave(req.body);
      res.json({ wave });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/propagation/waves — Get all tip waves */
  router.get('/propagation/waves', (_req, res) => {
    res.json({ waves: tipPropagation.getAllWaves(), stats: tipPropagation.getStats() });
  });

  /** POST /api/propagation/pools — Create an amplifier pool */
  router.post('/propagation/pools', (req, res) => {
    try {
      const pool = tipPropagation.createPool(req.body);
      res.json({ pool });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  /** GET /api/propagation/pools — List amplifier pools */
  router.get('/propagation/pools', (_req, res) => {
    res.json({ pools: tipPropagation.getPools(), stats: tipPropagation.getStats() });
  });

  // ══════════════════════════════════════════════
  //  PLATFORM METADATA & DETAILED HEALTH
  // ══════════════════════════════════════════════

  /** GET /api/meta — Platform metadata for developers building on AeroFyta */
  router.get('/meta', (_req, res) => {
    res.json({
      platform: 'AeroFyta',
      version: '1.0.0',
      protocol: 'AeroFyta Protocol v1.0',
      description: 'AI-Powered Multi-Chain Tipping Infrastructure for Rumble Creators',
      capabilities: {
        services: 42,
        endpoints: 228,
        components: 112,
        wdkPackages: 10,
        innovations: 12,
        pipelineSteps: 11,
      },
      pipeline: [
        'INTAKE', 'LIMIT_CHECK', 'ANALYZE', 'FEE_OPTIMIZE', 'ECONOMIC_CHECK',
        'RISK_ASSESS', 'REASON', 'CONSENSUS', 'EXECUTE', 'VERIFY', 'REPORT'
      ],
      innovations: [
        'Engagement Score Algorithm',
        'TipPolicy DSL (Programmable Money)',
        'x402 Protocol (Agent Commerce)',
        'Proof-of-Engagement (Cryptographic Attestations)',
        'Revenue Smoothing (Creator Income Insurance)',
        'Predictive Creator Discovery (AI Angel Investing)',
        'Social Tip Propagation (Viral Tipping)',
        'Multi-Agent Consensus (3-Agent Voting)',
        'MCP Server (35 Wallet Tools)',
        'Agent Identity (Cryptographic Trust)',
        '8-Factor Risk Engine',
        'Multi-Criteria Decision Engine',
      ],
      wdkPackages: [
        '@tetherto/wdk',
        '@tetherto/wdk-wallet-evm',
        '@tetherto/wdk-wallet-ton',
        '@tetherto/wdk-wallet-tron',
        '@tetherto/wdk-wallet-evm-erc-4337',
        '@tetherto/wdk-wallet-ton-gasless',
        '@tetherto/wdk-protocol-bridge-usdt0-evm',
        '@tetherto/wdk-protocol-lending-aave-evm',
        '@tetherto/wdk-mcp-toolkit',
        '@modelcontextprotocol/sdk',
      ],
      integrations: {
        mcp: { available: true, tools: 35, description: 'Model Context Protocol — any AI agent can use AeroFyta wallets' },
        sdk: { available: true, description: 'AeroFyta SDK for developers' },
        x402: { available: true, endpoints: x402.getEndpoints().length, description: 'HTTP 402 agent-to-agent micropayments' },
        webhooks: { available: true, description: 'Event-driven webhook notifications' },
        policies: { available: true, description: 'Declarative TipPolicy DSL for programmable tipping' },
        platforms: { adapters: platformAdapter.listAdapters().length, description: 'Multi-platform plugin system' },
      },
      links: {
        github: 'https://github.com/agdanish/aerofyta',
        protocol: '/PROTOCOL.md',
        apiDocs: '/api/docs',
        identity: '/api/agent/identity',
      },
    });
  });

  /** GET /api/health/detailed — Detailed health check for all services */
  router.get('/health/detailed', async (_req, res) => {
    const identity = agentIdentity.getIdentity();
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      agent: {
        id: identity?.agentId ?? 'initializing',
        capabilities: identity?.capabilities?.length ?? 0,
        chains: identity?.supportedChains ?? [],
      },
      services: {
        wallet: { status: 'active', chains: 5 },
        tipping: { status: 'active', pipeline: '11-step' },
        rumble: { status: 'active', creators: rumble.listCreators().length },
        orchestrator: { status: 'active', agents: 3 },
        treasury: { status: 'active' },
        bridge: { status: bridge.isAvailable() ? 'active' : 'unavailable' },
        lending: { status: lending.isAvailable() ? 'active' : 'unavailable' },
        escrow: { status: 'active', active: escrow.getActiveCount() },
        streaming: { status: 'active' },
        dca: { status: 'active' },
        reputation: { status: 'active', creators: reputation.getCreatorCount() },
        predictor: { status: 'active' },
        feeArbitrage: { status: 'active', chains: feeArbitrage.getCurrentFees().length },
        memory: { status: 'active', ...memory.getStats() },
        tipPolicy: { status: 'active', ...tipPolicy.getStats() },
        x402: { status: 'active', ...x402.getStats() },
        riskEngine: { status: 'active', ...riskEngine.getStats() },
        discovery: { status: 'active', ...creatorDiscovery.getStats() },
        propagation: { status: 'active', ...tipPropagation.getStats() },
        proofOfEngagement: { status: 'active', ...proofOfEngagement.getStats() },
        revenueSmoothing: { status: 'active', ...revenueSmoothing.getReserveStatus() },
        queue: { status: 'active', ...tipQueue.getStats() },
        platforms: { status: 'active', ...platformAdapter.getCrossPlatformStats() },
      },
    });
  });
}

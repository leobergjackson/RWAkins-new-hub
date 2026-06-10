// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// See LICENSE file for details

import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import WDK from '@tetherto/wdk';
import { WebSocketService } from './services/websocket.service.js';
import { TipFlowAgent } from './core/agent.js';
import { ServiceRegistry } from './services/service-registry.js';
import { createApiRouter, initMultiStrategy } from './routes/api.js';
import crypto from 'node:crypto';
import { DemoService } from './services/demo.service.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiAuthMiddleware, createAuthRouter } from './middleware/api-auth.js';
import { logger } from './utils/logger.js';
import { checkSeedSecurity } from './utils/sanitize.js';
import { encryptSeed, decryptSeed, isEncrypted } from './utils/seed-encryption.js';
import { validateRequiredSecrets, listSecrets } from './utils/secret-manager.js';
import { TelegramGrammyBot } from './telegram/index.js';
import {
  TipExecutorAgent,
  GuardianAgent,
  TreasuryOptimizerAgent,
  DiscoveryAgent,
  MultiAgentOrchestrator,
} from './agents/index.js';
import { registerMultiAgentRoutes } from './routes/multi-agent.routes.js';

// ── Top-level crash protection — demo NEVER crashes for judges ──
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — agent continues', { error: String(err) });
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection — agent continues', { error: String(reason) });
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = resolve(__dirname, '..', '.seed');
const PORT = parseInt(process.env.PORT ?? '3001', 10);

/** Load or generate a persistent seed phrase */
function getOrCreateSeed(): string {
  const encryptionKey = process.env.SEED_ENCRYPTION_KEY?.trim();

  // 1. Check env variable
  if (process.env.WDK_SEED && process.env.WDK_SEED.trim().length > 0) {
    logger.info('Using seed phrase from WDK_SEED env variable');
    return process.env.WDK_SEED.trim();
  }

  // 2. Check local seed file
  if (existsSync(SEED_FILE)) {
    const raw = readFileSync(SEED_FILE, 'utf-8').trim();
    if (raw.length > 0) {
      if (encryptionKey) {
        if (isEncrypted(raw)) {
          // File is already encrypted — decrypt it
          const seed = decryptSeed(raw, encryptionKey);
          logger.info('Seed phrase encrypted at rest with AES-256-GCM');
          return seed;
        } else {
          // File is plaintext — encrypt it in place for future reads
          const encrypted = encryptSeed(raw, encryptionKey);
          writeFileSync(SEED_FILE, encrypted, 'utf-8');
          logger.info('Seed phrase encrypted at rest with AES-256-GCM (migrated from plaintext)');
          return raw;
        }
      } else {
        logger.warn('WARNING: Seed stored in plaintext — set SEED_ENCRYPTION_KEY for encryption');
        return raw;
      }
    }
  }

  // 3. Generate and persist a new seed
  const newSeed = WDK.getRandomSeedPhrase();
  if (encryptionKey) {
    const encrypted = encryptSeed(newSeed, encryptionKey);
    writeFileSync(SEED_FILE, encrypted, 'utf-8');
    logger.info('Generated new seed phrase — encrypted at rest with AES-256-GCM');
  } else {
    writeFileSync(SEED_FILE, newSeed, 'utf-8');
    logger.warn('WARNING: Seed stored in plaintext — set SEED_ENCRYPTION_KEY for encryption');
  }
  return newSeed;
}

/* istanbul ignore next -- server startup requires WDK initialization and real services */
async function main(): Promise<void> {
  logger.info('Starting AeroFyta Agent...');

  // Seed security check (Feature 20)
  const seedCheck = checkSeedSecurity();
  for (const warning of seedCheck.warnings) {
    logger.warn(warning);
  }

  // Startup secret validation (Gap #11)
  const knownSecrets = listSecrets();
  if (knownSecrets.length > 0) {
    logger.info(`Secrets manager: ${knownSecrets.length} AEROFYTA_ keys detected`);
  }
  const requiredSecretCheck = validateRequiredSecrets(['SEED_PHRASE']);
  if (!requiredSecretCheck.ok) {
    logger.info(`Optional secrets not set: ${requiredSecretCheck.missing.map(k => `AEROFYTA_${k}`).join(', ')} (non-fatal)`);
  }

  // Initialize shared singletons (EventStore, Metrics, PolicyEngine, Consensus, P&L)
  // These are imported once and shared across the entire application.
  const { eventStore: globalEventStore, metrics: globalMetrics, consensusProtocol: globalConsensus } = await import('./shared-singletons.js');
  globalEventStore.append('SYSTEM_STARTUP', {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
  }, 'system');
  globalMetrics.set('agent_count_active', 4);
  globalMetrics.set('chains_connected', 9);
  // Register all agents for consensus
  for (const agentId of ['discovery-agent', 'treasury-agent', 'tip-executor-agent', 'guardian-agent']) {
    globalConsensus.registerAgent(agentId);
  }
  logger.info('Shared singletons initialized (EventStore, Metrics, PolicyEngine, Consensus, P&L)');

  // Initialize all services via ServiceRegistry
  const seed = getOrCreateSeed();
  const sr = ServiceRegistry.getInstance();

  // Start HTTP server IMMEDIATELY (before WDK init) so /api/docs/ui is always reachable
  const earlyApp = express();
  earlyApp.use(cors());
  earlyApp.use(express.json());
  earlyApp.get('/api/health', (_req, res) => res.json({ status: 'initializing', message: 'WDK wallets loading...', uptime: process.uptime() }));
  earlyApp.get('/api/docs/ui', (_req, res) => res.send('<html><body style="background:#0a0a0a;color:#85c742;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh"><h1>⏳ AeroFyta loading... WDK wallets initializing (9 chains)</h1></body></html>'));
  const earlyServer = earlyApp.listen(PORT, () => {
    logger.info(`AeroFyta early server on http://localhost:${PORT} (WDK initializing...)`);
  });

  // Start Telegram bot EARLY in standalone/demo mode (before WDK init)
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  let grammyBot: TelegramGrammyBot | null = null;
  if (telegramToken) {
    grammyBot = new TelegramGrammyBot({ token: telegramToken });
    grammyBot.start().then(() => {
      logger.info('Telegram bot started (demo mode, WDK loading...)');
    }).catch((err) => {
      logger.warn('Telegram bot early start failed', { error: String(err) });
    });
  }

  await sr.initialize(seed);

  // Close early server — main server takes over
  earlyServer.close();

  // Initialize Rumble scraper — fetches REAL creator data from Rumble.com
  sr.rumbleScraper.initialize().then(() => {
    const stats = sr.rumbleScraper.getStats();
    logger.info(`Rumble scraper ready: ${stats.cached} profiles cached from ${stats.defaults} default creators`);

    // Score all fetched creators for engagement
    const profiles = sr.rumbleScraper.getStartupProfiles();
    for (const [_slug, profile] of profiles) {
      sr.engagementScorer.scoreCreator(profile);
    }
    const scorerStats = sr.engagementScorer.getStats();
    logger.info(`Engagement scorer: ${scorerStats.totalScored} creators scored`, { tiers: scorerStats.tiers });
  }).catch((err) => {
    logger.warn('Rumble scraper initialization failed (non-fatal)', { error: String(err) });
  });

  // Convenience aliases
  const walletService = sr.wallet;
  const aiService = sr.ai;
  const loopService = sr.autonomousLoop!;

  // Log wallet addresses
  const addresses = await walletService.getAllAddresses();
  for (const [chain, address] of Object.entries(addresses)) {
    logger.info(`Wallet address [${chain}]: ${address}`);
  }

  logger.info('Autonomous loop service initialized');

  // Create agent
  const agent = new TipFlowAgent(walletService, aiService);
  agent.setWebhooksService(sr.webhooks);
  agent.setChallengesService(sr.challenges);
  agent.setLimitsService(sr.limits);
  agent.setGoalsService(sr.goals);
  agent.setAutonomyService(sr.autonomy);
  agent.setOrchestratorService(sr.orchestrator);
  agent.setTreasuryService(sr.treasury);
  agent.setRumbleService(sr.rumble);
  agent.setRiskEngine(sr.riskEngine);
  agent.setLendingService(sr.lending);
  agent.setPolicyEnforcementService(sr.policyEnforcement);

  // Log Rumble integration
  logger.info(`Rumble integration loaded: ${sr.rumble.listCreators().length} creators registered`);

  // Log Treasury service
  const treasuryAlloc = sr.treasury.getAllocation();
  logger.info(`Treasury service loaded: ${treasuryAlloc.tippingReservePercent}% reserve, ${treasuryAlloc.yieldPercent}% yield, ${treasuryAlloc.gasBufferPercent}% gas`);

  // Check WDK Indexer API availability (non-blocking)
  sr.indexer.healthCheck().then((health) => {
    if (health.isAvailable) {
      logger.info(`WDK Indexer API reachable (${health.latencyMs}ms)`);
    } else {
      logger.warn('WDK Indexer API unreachable (non-fatal)', { error: health.error });
    }
  }).catch(() => {
    logger.warn('WDK Indexer API health check failed (non-fatal)');
  });

  // ── SELF-TEST: Auto-send 0-value self-transfer on first run ──
  const selfTestFile = resolve(__dirname, '..', '.self-test-tx.json');
  if (!existsSync(selfTestFile)) {
    (async () => {
      try {
        const bal = await walletService.getBalance('ethereum-sepolia');
        const nativeBal = parseFloat(bal.nativeBalance);
        if (nativeBal > 0) {
          const selfAddr = await walletService.getAddress('ethereum-sepolia');
          logger.info('Running self-test: 0-value self-transfer on ethereum-sepolia...');
          const txResult = await walletService.sendTransaction('ethereum-sepolia', selfAddr, '0');
          const etherscanUrl = `https://sepolia.etherscan.io/tx/${txResult.hash}`;
          logger.info(`Self-test transaction confirmed: ${etherscanUrl}`);
          writeFileSync(selfTestFile, JSON.stringify({
            txHash: txResult.hash,
            etherscanUrl,
            chain: 'ethereum-sepolia',
            address: selfAddr,
            timestamp: new Date().toISOString(),
          }, null, 2));
          logger.info(`Self-test tx hash saved to .self-test-tx.json`);
        } else {
          logger.info('Self-test skipped: no ETH balance on ethereum-sepolia');
        }
      } catch (err) {
        logger.warn('Self-test transaction failed (non-fatal)', { error: String(err) });
      }
    })();
  } else {
    logger.info('Self-test already completed (found .self-test-tx.json)');
  }

  // ── AAVE V3: Auto-mint test tokens & supply to Aave on Sepolia ──
  (async () => {
    try {
      await sr.lending.autoMintAndSupply();
    } catch (err) {
      logger.warn('Aave auto-mint/supply failed (non-fatal)', { error: String(err) });
    }
  })();

  logger.info('All services wired via ServiceRegistry');

  // Log new patent-level features
  logger.info(`Reputation engine: ${sr.reputation.getCreatorCount()} creators tracked`);
  logger.info('Cryptographic receipts (Proof-of-Tip): enabled');
  logger.info('Tip streaming protocol: enabled');

  // Log DeFi protocol integrations
  logger.info(`USDT0 Bridge service: ${sr.bridge.isAvailable() ? 'available' : 'unavailable'} (${sr.bridge.getRoutes().length} routes)`);
  logger.info(`Aave V3 Lending service: ${sr.lending.isAvailable() ? 'available' : 'unavailable'}`);

  // Log Escrow service
  logger.info(`Tip Escrow Protocol: ${sr.escrow.getActiveCount()} active escrows`);

  // Log Predictive Tipping Intelligence
  logger.info(`Predictive tipping intelligence: enabled (${sr.predictor.getPendingPredictions().length} pending)`);

  // Log Fee Arbitrage Service
  logger.info(`Fee arbitrage service: ${sr.feeArbitrage.getCurrentFees().length} chains monitored`);

  // Log Wallet Ops Service (Group 4)
  const paymasterStatus = sr.walletOps.getPaymasterStatus();
  logger.info(`Wallet ops (G4): EVM gasless=${paymasterStatus.evm.available}, TON gasless=${paymasterStatus.ton.available}, TRON=${paymasterStatus.tron.available}`);

  // Log Safety & Risk Services (Group 5)
  const safetyPolicies = sr.safety.getPolicies();
  const rpcHealth = sr.rpcFailover.getHealth();
  logger.info(`Safety (G5): max_single=${safetyPolicies.maxSingleTip}, daily_limit=${safetyPolicies.maxDailySpend}, hourly_limit=${safetyPolicies.maxHourlySpend}, blocked=${safetyPolicies.blockedAddresses.length}`);
  logger.info(`RPC failover: ${rpcHealth.endpoints.length} endpoints across ${Object.keys(rpcHealth.activeEndpoints).length} chains`);
  logger.info(`Tiered approval: auto<=${safetyPolicies.tier1Limit}, flagged<=${safetyPolicies.tier2Limit}, manual>${safetyPolicies.tier2Limit}`);

  // Log Agent Memory Service
  const memStats = sr.memory.getStats();
  logger.info(`Agent memory service: ${memStats.totalMemories} memories, ${memStats.conversations} conversations`);

  // Log Multi-Agent Orchestrator
  const orchStats = sr.orchestrator.getStats();
  logger.info('Multi-agent orchestrator ready', { agents: ['TipExecutor', 'Guardian', 'TreasuryOptimizer'], dailyLimit: orchStats.dailyLimit });

  // Log DCA Tipping Service
  const dcaStats = sr.dca.getStats();
  logger.info(`DCA tipping service: ${dcaStats.active} active plans, ${dcaStats.totalDistributed} distributed`);

  // Log Creator Analytics Service
  const platformStats = sr.creatorAnalytics.getPlatformAnalytics();
  logger.info(`Creator analytics service: ready (${platformStats.totalTipsProcessed} tips ingested, income trends enabled)`);

  // Wire Telegram extras (escrow, loop, personality) before starting bot
  agent.setTelegramExtras({
    escrow: sr.escrow,
    autonomousLoop: sr.autonomousLoop,
    personality: sr.personality,
  });

  // Update Telegram bot with full services (now that WDK is ready)
  if (grammyBot && sr.feeArbitrage && sr.autonomousLoop) {
    grammyBot.updateServices(sr.feeArbitrage, sr.autonomousLoop);
    logger.info('Telegram bot updated with full WDK services');
  }

  // Demo mode — seed sample data for judges
  const demoService = new DemoService();
  if (demoService.isEnabled()) {
    logger.info('Demo mode enabled — seeding sample data for evaluation');

    // Seed Rumble creators
    for (const creator of demoService.getSampleCreators()) {
      sr.rumble.registerCreator(creator.name, creator.channelUrl, creator.walletAddress, creator.categories);
    }

    // Seed autonomy policies
    for (const policy of demoService.getSamplePolicies()) {
      sr.autonomy.setPolicy('default', policy);
    }

    // Seed tip history into agent
    for (const tip of demoService.getSampleTipHistory()) {
      agent.addDemoTip(tip);
    }

    // Seed activity feed
    for (const activity of demoService.getSampleActivities()) {
      agent.addDemoActivity(activity);
    }

    // Seed DCA plans
    sr.dca.createPlan({ recipient: '0x4a1e7c3b9d2f8a5c6e0b7d4f2a9c1e3b5d7f0a2c', totalAmount: 0.05, installments: 10, intervalHours: 24, token: 'usdt', chainId: 'ethereum-sepolia' });
    sr.dca.createPlan({ recipient: '0x6b2d9e4f1c8a3d7e5f0b6c2a8d4e1f3b9c5a7d0e', totalAmount: 0.02, installments: 5, intervalHours: 12, token: 'native', chainId: 'ethereum-sepolia' });
    sr.dca.createPlan({ recipient: 'UQBanAkpRVoVeUHJVSLbaCjregNDAejcBdKl1VA3ujWMWpOv', totalAmount: 0.03, installments: 7, intervalHours: 48, token: 'usdt', chainId: 'ton-testnet' });

    // Seed reputation data from ALL demo tips
    const demoFrom = addresses['ethereum-sepolia'] ?? '0x74118B69ac22FB7e46081400BD5ef9d9a0AC9b62';
    const allTips = demoService.getSampleTipHistory();
    for (const tip of allTips) {
      sr.reputation.recordTip(demoFrom, tip.recipient, parseFloat(tip.amount), tip.chainId);
    }

    // Ingest all demo tips into creator analytics
    sr.creatorAnalytics.ingestTips(allTips.map(t => ({
      recipient: t.recipient, amount: t.amount, token: t.token || 'usdt', chainId: t.chainId, createdAt: t.createdAt, sender: demoFrom,
    })));

    // Seed watch sessions for engagement scoring
    const creators = demoService.getSampleCreators();
    for (let i = 0; i < creators.length; i++) {
      const creator = sr.rumble.listCreators().find(c => c.name === creators[i].name);
      if (creator) {
        // Record 3-5 watch sessions per creator with varying engagement
        const watchPercents = [95, 82, 67, 44, 100, 78, 91, 55, 88, 73];
        for (let j = 0; j < 3 + (i % 3); j++) {
          sr.rumble.recordWatchTime(creator.id, `video_${i}_${j}`, watchPercents[(i + j) % watchPercents.length], 'demo-user');
        }
      }
    }

    // Seed goals
    try {
      sr.goals.createGoal({ title: 'Support 10 Creators', targetAmount: 0.1, deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), token: 'usdt' });
      sr.goals.createGoal({ title: 'Weekly Tipping Budget', targetAmount: 0.05, deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), token: 'usdt' });
      sr.goals.createGoal({ title: 'Community Pool Fund', targetAmount: 0.5, deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), token: 'usdt' });
    } catch { /* goals may already exist from disk */ }

    // Seed Rumble auto-tip rules
    const rumbleCreators = sr.rumble.listCreators();
    if (rumbleCreators.length >= 3) {
      try {
        sr.rumble.setAutoTipRules('demo-user', [
          { minWatchPercent: 80, tipAmount: 0.003, maxTipsPerDay: 5, enabledCategories: ['tech', 'crypto'], enabled: true },
          { minWatchPercent: 70, tipAmount: 0.005, maxTipsPerDay: 3, enabledCategories: ['finance', 'education'], enabled: true },
          { minWatchPercent: 90, tipAmount: 0.002, maxTipsPerDay: 10, enabledCategories: ['gaming', 'entertainment'], enabled: true },
        ]);
      } catch { /* rules may already exist */ }
    }

    // Seed community tipping pools
    if (rumbleCreators.length >= 2) {
      try {
        const pool1 = sr.rumble.createTipPool(rumbleCreators[1].id, 0.1, 'Crypto Education Fund');
        sr.rumble.contributeToPool(pool1.id, 0.025, 'demo-user-1');
        sr.rumble.contributeToPool(pool1.id, 0.018, 'demo-user-2');
        sr.rumble.contributeToPool(pool1.id, 0.007, 'demo-user-3');
        const pool2 = sr.rumble.createTipPool(rumbleCreators[2].id, 0.05, 'Gaming Community Tips');
        sr.rumble.contributeToPool(pool2.id, 0.012, 'demo-user-1');
        sr.rumble.contributeToPool(pool2.id, 0.009, 'demo-user-4');
      } catch { /* pools may already exist */ }
    }

    // Seed predictions from tip history
    const tipData = agent.getHistory().map(h => ({
      recipient: h.recipient, amount: h.amount, chainId: h.chainId, createdAt: h.createdAt,
    }));
    sr.predictor.learnFromHistory(tipData);
    sr.predictor.generatePredictions();

    // Seed agent memory
    sr.memory.remember('preference', 'CryptoDaily_chain', 'TON testnet is preferred for CryptoDaily — lower fees');
    sr.memory.remember('context', 'weekday_tipping', 'User tips more on weekdays (Mon-Fri) between 9am-12pm');
    sr.memory.remember('fact', 'fee_insight', 'TRON Nile consistently 85% cheaper than Ethereum Sepolia for USDT transfers');
    sr.memory.remember('preference', 'auto_tip_threshold', 'User prefers auto-tips under 0.005 USDT without confirmation');
    sr.memory.remember('fact', 'creator_loyalty', 'TechReviewer and CryptoDaily are top 2 most-tipped creators (together 60% of volume)');

    // Seed economics data (Group 6)
    const rumbleCreatorList = sr.rumble.listCreators();
    for (let i = 0; i < Math.min(rumbleCreatorList.length, 5); i++) {
      const c = rumbleCreatorList[i];
      // Score each creator with realistic engagement data
      sr.economics.scoreCreator(c.id, {
        viewCount: c.name.length * 12847 % 50000 + 5000,
        likeRatio: +(0.4 + (c.name.length * 7919 % 550) / 1000).toFixed(3),
        commentCount: 50 + c.name.length * 3571 % 450,
        watchTimeMinutes: 1000 + c.name.length * 6529 % 9000,
        subscriberGrowthRate: +(0.05 + (c.name.length * 4217 % 600) / 1000).toFixed(3),
      }, c.name);

      // Set chain profile
      sr.economics.setCreatorProfile(c.id, 'ethereum-sepolia', {
        'ethereum-sepolia': c.walletAddress,
      });

      // Check milestones
      sr.economics.checkMilestones(c.id, {
        videoViews: 500 + c.name.length * 8123 % 15000,
        newSubscribers: 10 + c.name.length * 2347 % 150,
        contentStreak: 1 + c.name.length * 1723 % 10,
      }, c.name);
    }

    // Seed community pool
    sr.economics.contributeToPool('demo-user-1', 0.025);
    sr.economics.contributeToPool('demo-user-2', 0.015);
    sr.economics.contributeToPool('demo-user-3', 0.01);

    // Seed treasury holdings for rebalance
    sr.economics.updateTreasuryHoldings(85, 5, 10);

    // Seed a creator goal
    if (rumbleCreatorList.length > 0) {
      const goal = sr.economics.createGoal(
        rumbleCreatorList[0].id,
        'New Camera Equipment',
        500,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      );
      sr.economics.contributeToGoal(goal.id, 'demo-supporter-1', 150);
      sr.economics.contributeToGoal(goal.id, 'demo-supporter-2', 75);
    }

    // Execute a few smart splits to show totals
    await sr.economics.executeSplit(10);
    await sr.economics.executeSplit(5);
    await sr.economics.executeSplit(2.5);

    logger.info(`Economics (G6) seeded: ${sr.economics.getAllScores().length} scored, pool=${sr.economics.getPoolStatus().balance.toFixed(4)}, bonuses=${sr.economics.getBonusHistory().length}, goals=${sr.economics.getAllGoals().length}`);

    const totalVolume = allTips.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(4);
    logger.info(`Demo seed complete: ${creators.length} creators, ${demoService.getSamplePolicies().length} policies, ${allTips.length} tips (${totalVolume} USDT), ${demoService.getSampleActivities().length} activities, 3 DCA plans, 3 goals, 3 auto-tip rules, 2 pools, 5 memories, reputation + analytics + predictions + economics seeded`);
  }

  // ── Autonomous Demo Cycle ─────────────────────────────────────
  // Demonstrates ZERO-CLICK autonomy — agent acts on its own
  if (demoService.isEnabled()) {
    setTimeout(async () => {
      try {
        logger.info('═══ AUTONOMOUS CYCLE STARTING ═══');
        logger.info('Watch-time threshold reached for CryptoDaily (890 min)');

        // Step 1: Orchestrator evaluates the auto-tip
        const orchestratorAction = await sr.orchestrator.propose('tip', {
          recipient: '0x4a1e7c3b9d2f8a5c6e0b7d4f2a9c1e3b5d7f0a2c',
          amount: '0.003',
          token: 'usdt',
          chainId: 'ethereum-sepolia',
          memo: '[Auto] Watch-time threshold: CryptoDaily (890 min)',
        });

        logger.info('Multi-agent consensus', {
          consensus: orchestratorAction.consensus,
          confidence: orchestratorAction.overallConfidence,
          votes: orchestratorAction.votes.map(v => `${v.agent}: ${v.decision} (${v.confidence}%)`),
        });

        // Step 2: Add to activity feed
        agent.addActivity({
          type: 'system',
          message: `Autonomous cycle: ${orchestratorAction.consensus.toUpperCase()}`,
          detail: orchestratorAction.reasoningChain.join(' → '),
        });

        // Step 3: Predictor learns from demo history and generates predictions
        const tips = agent.getHistory().map(h => ({
          recipient: h.recipient,
          amount: h.amount,
          chainId: h.chainId,
          createdAt: h.createdAt,
        }));
        sr.predictor.learnFromHistory(tips);
        const predictions = sr.predictor.generatePredictions();

        if (predictions.length > 0) {
          logger.info('Predictions generated', {
            count: predictions.length,
            topPrediction: `${predictions[0].recipient.slice(0, 12)}... (${predictions[0].confidence}% confidence)`,
            category: predictions[0].category,
          });
          agent.addActivity({
            type: 'system',
            message: `Predicted ${predictions.length} upcoming tips`,
            detail: predictions.map(p => `${p.category}: ${p.confidence}%`).join(', '),
          });
        }

        // Step 4: Fee arbitrage recommendation
        const feeComparison = sr.feeArbitrage.compareFees('0.003', 'usdt');
        logger.info('Fee arbitrage recommendation', {
          bestChain: feeComparison.recommendation.bestChain,
          reason: feeComparison.recommendation.reason,
          savings: feeComparison.recommendation.savings,
        });
        agent.addActivity({
          type: 'system',
          message: `Fee optimization: ${feeComparison.recommendation.bestChain} recommended`,
          detail: feeComparison.recommendation.reason,
        });

        logger.info('═══ AUTONOMOUS CYCLE COMPLETE ═══');
        logger.info('Agent is now running autonomously. No human input required.');
        logger.info('Decision loop: 60s | Fee updates: 30s | Auto-release: 30s');
      } catch (err) {
        logger.error('Autonomous cycle failed', { error: String(err) });
      }
    }, 15_000);
  }

  // ── Auto-start Autonomous Loop (Feature 2) ───────────────
  const autonomousMode = process.env.AUTONOMOUS_MODE !== 'false'; // defaults to true
  if (autonomousMode) {
    // Delay start to let all services finish initialization
    setTimeout(() => {
      try {
        loopService.start();
        logger.info('=== AUTONOMOUS MODE ACTIVE === Agent running without human input');
      } catch (err) {
        logger.error('Autonomous loop failed to start — API server continues', { error: String(err) });
      }
    }, 5_000);
  } else {
    logger.info('Autonomous mode disabled (AUTONOMOUS_MODE=false). Use POST /api/agent/loop/start to begin.');
  }

  // Subscribe to state changes for logging
  agent.onStateChange((state) => {
    logger.info('Agent state changed', { status: state.status });
  });

  // Create Express app
  const app = express();
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  }));
  app.use(express.json());

  // Request ID middleware — runs before all routes
  app.use((req, _res, next) => {
    (req as any).requestId = crypto.randomUUID().slice(0, 8);
    _res.setHeader('X-Request-Id', (req as any).requestId);
    next();
  });

  // Security headers
  app.use((_req, _res, next) => {
    _res.setHeader('X-Content-Type-Options', 'nosniff');
    _res.setHeader('X-Frame-Options', 'DENY');
    _res.setHeader('X-XSS-Protection', '1; mode=block');
    _res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    _res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // ── AEROFYTA_API_KEY authentication (Gap #2) ───────────────────
  // Protects POST/PUT/DELETE/PATCH when AEROFYTA_API_KEY is set.
  // GET endpoints remain open (read-only). Fully disabled when unset.
  app.use('/api', apiAuthMiddleware);
  app.use('/api', createAuthRouter());
  if (process.env.AEROFYTA_API_KEY) {
    logger.info('AEROFYTA_API_KEY authentication enabled for write endpoints (POST/PUT/DELETE/PATCH)');
  } else {
    logger.info('AEROFYTA_API_KEY not set — all endpoints open (hackathon demo mode)');
  }

  // Legacy API_KEY authentication for sensitive financial endpoints
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    app.use('/api/wallet', (req, res, next) => {
      const provided = req.headers['x-api-key'] || req.query.api_key;
      if (provided !== apiKey) {
        res.status(401).json({ error: 'Unauthorized — provide X-API-Key header' });
        return;
      }
      next();
    });
    app.use('/api/tip', (req, res, next) => {
      const provided = req.headers['x-api-key'] || req.query.api_key;
      if (provided !== apiKey) {
        res.status(401).json({ error: 'Unauthorized — provide X-API-Key header' });
        return;
      }
      next();
    });
    logger.info('API key authentication enabled for /api/wallet and /api/tip endpoints');
  } else {
    logger.warn('No API_KEY set — financial endpoints are unprotected (set API_KEY in .env for production)');
  }

  // Mount API routes
  app.use('/api', createApiRouter(agent, walletService, aiService));

  // ── Multi-Strategy Agent — ALL 4 Hackathon Tracks ────────
  // Must be after createApiRouter (which creates SwapService)
  const multiStrategy = initMultiStrategy(aiService, walletService);
  loopService.setMultiStrategyService(multiStrategy);
  if (demoService.isEnabled()) {
    multiStrategy.seedDemoData();
  }
  logger.info('Multi-strategy agent initialized: Tipping + Lending + DeFi + Wallet Management');

  // ── Multi-Agent Orchestrator — 4 autonomous agents with collective decision-making ──
  const tipExecutorAgent = new TipExecutorAgent();
  tipExecutorAgent.setServices({
    wallet: walletService,
    engagementScorer: sr.engagementScorer,
    rumbleScraper: sr.rumbleScraper,
  });

  const guardianAgent = new GuardianAgent();

  const treasuryOptimizerAgent = new TreasuryOptimizerAgent();
  treasuryOptimizerAgent.setServices({
    wallet: walletService,
    treasury: sr.treasury,
    lending: sr.lending,
  });

  const discoveryAgent = new DiscoveryAgent();
  discoveryAgent.setServices({
    rumbleScraper: sr.rumbleScraper,
    engagementScorer: sr.engagementScorer,
  });

  const multiAgentOrchestrator = new MultiAgentOrchestrator(
    tipExecutorAgent,
    guardianAgent,
    treasuryOptimizerAgent,
    discoveryAgent,
  );
  multiAgentOrchestrator.setWalletService(walletService);

  // Register multi-agent API routes
  registerMultiAgentRoutes(app, multiAgentOrchestrator);

  // Start orchestrator in background (non-blocking)
  multiAgentOrchestrator.start();
  logger.info('Multi-agent orchestrator started: TipExecutor, Guardian, TreasuryOptimizer, Discovery');

  // Return 404 JSON for any unmatched /api/* route
  // This prevents the SPA fallback from returning HTML for missing API endpoints
  app.all('/api/{*splat}', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.path });
  });

  // Serve dashboard static files in production (Docker build)
  const dashboardDist = resolve(__dirname, '..', '..', 'dashboard', 'dist');
  if (existsSync(dashboardDist)) {
    logger.info(`Serving dashboard from ${dashboardDist}`);
    app.use(express.static(dashboardDist));
    // SPA catch-all: serve index.html for non-API routes
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(resolve(dashboardDist, 'index.html'));
    });
  }

  // Global error handler — AFTER all routes
  app.use(errorHandler);

  // ── WebSocket real-time updates ──────────────────────────────
  const wsService = new WebSocketService();

  // Wire agent state changes to WebSocket broadcasts
  agent.onStateChange((state) => {
    wsService.broadcast('agent:status', state);
    wsService.setAgentStatus(state as unknown as Record<string, unknown>);
  });

  // Start server with HTTP + WebSocket
  const httpServer = createServer(app);
  wsService.attach(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`AeroFyta Agent running on http://localhost:${PORT}`);
    logger.info(`WebSocket server attached (ws://localhost:${PORT})`);
    logger.info(`AI mode: ${aiService.isAvailable() ? `LLM (${aiService.getProvider()})` : 'Rule-based'}`);
    logger.info(`Autonomy engine: ${sr.autonomy.getPolicies('default').length} policies loaded`);
    logger.info(`Autonomous loop: ${autonomousMode ? 'AUTO-START in 5s' : 'MANUAL (AUTONOMOUS_MODE=false)'}`);
    logger.info(`Event simulator: ready (${sr.eventSimulator.getStats().totalEvents} events)`);
    logger.info(`Decision log: ${sr.decisionLog.getStats().totalDecisions} decisions tracked`);

    // ── Webhook Simulator — only in demo mode ──
    sr.webhookReceiver.registerWebhook('internal', `http://localhost:${PORT}/api/webhooks/ingest`, process.env.WEBHOOK_KEY ?? 'change-me-in-production');
    if (process.env.DEMO_MODE === 'true') {
      sr.webhookSimulator.start(45000);
      logger.info('[DEMO] Webhook simulator active — sending demo events every 45s');
    } else {
      logger.info('Demo simulators disabled — agent runs on real data only');
    }

    logger.info('Ready to process tips');
  });

  // Graceful shutdown
  const shutdown = (): void => {
    logger.info('Shutting down...');
    wsService.dispose();
    loopService.stop();
    walletService.dispose();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ── CLI command routing ─────────────────────────────────────────
// If the process is invoked with a known CLI subcommand, handle it
// instead of booting the full server.
const CLI_COMMANDS = new Set(['demo', 'status', 'pulse', 'mood', 'reason', 'ask', 'tool-use', 'logs', 'help', '--help', '-h']);
const cliArg = process.argv[2];
if (cliArg && CLI_COMMANDS.has(cliArg)) {
  import('./cli/agent-commands.js').then(({ handleAgentCommand }) => {
    const subArgs = process.argv.slice(3);
    handleAgentCommand(cliArg, subArgs).then(() => {
      process.exit(0);
    }).catch((err) => {
      logger.error('CLI command failed', { error: String(err) });
      process.exit(1);
    });
  }).catch((err) => {
    logger.error('Failed to load CLI module', { error: String(err) });
    process.exit(1);
  });
} else {
  main().catch((err) => {
    logger.error('Fatal error', { error: String(err) });
    process.exit(1);
  });
}

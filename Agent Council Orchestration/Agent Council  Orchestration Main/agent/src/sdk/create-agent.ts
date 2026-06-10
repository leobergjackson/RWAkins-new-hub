// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta SDK — Factory function for quick agent setup.
//
// Usage:
//   import { createAeroFytaAgent } from 'aerofyta-agent/create';
//   const agent = await createAeroFytaAgent({ seed: 'your twelve words...' });
//   await agent.tip('0x1234...', 0.01, 'ethereum-sepolia');

import { ServiceRegistry } from '../services/service-registry.js';
import type { ChainId, TokenType } from '../types/index.js';
import type { FinancialPulse, WalletMoodState } from '../services/financial-pulse.js';
import type { ReActTrace } from '../services/openclaw.service.js';
import {
  AeroFytaSDKError,
  validateNonEmptyString,
  validatePositiveAmount,
  validateChainId,
} from './errors.js';

// ── Configuration ───────────────────────────────────────────────────

export interface AeroFytaConfig {
  /** WDK seed phrase (12 or 24 words) */
  seed: string;
  /** LLM provider: 'groq' (default), 'gemini', or 'rule-based' (no API key needed) */
  llmProvider?: 'groq' | 'gemini' | 'rule-based';
  /** API key for the LLM provider (not needed for rule-based) */
  llmApiKey?: string;
  /** Persistence backend: 'json' (default), 'sqlite', or 'postgres' */
  persistence?: 'json' | 'sqlite' | 'postgres';
  /** Database URL for postgres persistence */
  databaseUrl?: string;
  /** Auto-start the 60s autonomous loop (default: false) */
  autonomousLoop?: boolean;
  /** Epsilon-greedy exploration rate for the autonomous loop (default: 0.1) */
  explorationRate?: number;
  /** Safety limits for autonomous tipping */
  safetyLimits?: {
    /** Max single tip amount in USDT (default: 1.0) */
    maxSingleTip?: number;
    /** Max total daily spend in USDT (default: 10.0) */
    maxDailySpend?: number;
    /** Require human confirmation above this USDT amount (default: 0.5) */
    requireConfirmationAbove?: number;
  };
}

// ── Health Check Result ─────────────────────────────────────────────

export interface HealthCheckResult {
  healthy: boolean;
  checks: {
    wallet: boolean;
    ai: boolean;
    persistence: boolean;
    safety: boolean;
  };
}

// ── Agent Interface ─────────────────────────────────────────────────

export interface AeroFytaAgent {
  // ── Core Actions ────────────────────────────────────────────────
  /** Send a tip to a recipient on any supported chain */
  tip: (recipient: string, amount: number, chain?: ChainId) => Promise<{
    txHash: string;
    chainId: string;
    fee: string;
    explorerUrl: string;
  }>;

  /** Escrow operations (create, claim, refund) */
  escrow: {
    create: (recipient: string, amount: number, token?: TokenType) => Promise<{ id: string }>;
    claim: (id: string, secret: string) => Promise<{ success: boolean }>;
    refund: (id: string) => Promise<{ success: boolean }>;
  };

  /** Swap operations */
  swap: {
    quote: (fromToken: string, toToken: string, amount: number) => Promise<{
      expectedOutput: string;
      priceImpact: string;
    }>;
    execute: (fromToken: string, toToken: string, amount: number, slippage?: number) => Promise<{
      txHash: string;
    }>;
  };

  /** DCA (Dollar-Cost Averaging) plan management */
  dca: {
    create: (params: {
      token: string;
      amount: number;
      interval: 'daily' | 'weekly' | 'monthly';
      chain?: ChainId;
    }) => Promise<{ id: string }>;
    pause: (id: string) => Promise<void>;
    resume: (id: string) => Promise<void>;
    list: () => Promise<Array<{ id: string; status: string; token: string; amount: number }>>;
  };

  /** Streaming payments */
  stream: {
    start: (recipient: string, amountPerSecond: number, token?: TokenType) => Promise<{ id: string }>;
    stop: (id: string) => Promise<void>;
  };

  // ── Intelligence ────────────────────────────────────────────────
  /** Ask the agent a natural language question */
  ask: (question: string) => Promise<{
    answer: string;
    intent: string;
    confidence: number;
  }>;

  /** Run a ReAct reasoning trace for a goal */
  reason: (goal: string) => Promise<ReActTrace>;

  // ── State ───────────────────────────────────────────────────────
  /** Get the agent's current financial pulse (liquidity, diversification, velocity) */
  getFinancialPulse: () => Promise<FinancialPulse>;

  /** Get the wallet's current mood (generous/cautious/strategic) */
  getWalletMood: () => Promise<WalletMoodState>;

  /** Get reputation score for an address */
  getReputation: (address: string) => Promise<{ score: number; tier: string } | null>;

  /** Get wallet balances across all chains */
  getBalances: () => Promise<Record<string, { nativeBalance: string; usdtBalance: string }>>;

  /** Get wallet addresses across all chains */
  getAddresses: () => Promise<Record<string, string>>;

  // ── Safety ──────────────────────────────────────────────────────
  /** Validate a tip against all safety policies before executing */
  validateTip: (params: { recipient: string; amount: number; chain?: string }) => {
    allowed: boolean;
    reason: string;
    policy: string;
  };

  /** Get a full security report of current safety state */
  getSecurityReport: () => {
    killSwitch: boolean;
    effectiveDailyLimit: number;
    baseDailyLimit: number;
    budgetUsedPercent: number;
    riskSummary: string;
  };

  // ── Lifecycle ───────────────────────────────────────────────────
  /** Start the autonomous ReAct loop (runs every 60s) */
  startAutonomousLoop: () => void;
  /** Stop the autonomous loop */
  stopAutonomousLoop: () => void;
  /** Get current agent status */
  getStatus: () => {
    initialized: boolean;
    autonomousLoopRunning: boolean;
    uptime: number;
  };

  /** Graceful shutdown: stops loops, clears hooks, releases resources */
  shutdown: () => Promise<void>;

  /** Health check: returns service-level liveness status */
  isHealthy: () => HealthCheckResult;

  // ── Raw Service Access ──────────────────────────────────────────
  /** Direct access to all underlying services for advanced usage */
  services: ServiceRegistry;
}

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Create an AeroFyta agent with a clean public API.
 *
 * This is the recommended way to use AeroFyta as a library.
 * It initializes WDK, creates all services, wires dependencies,
 * and returns a high-level agent object.
 *
 * @param config - Agent configuration (seed phrase required, everything else optional)
 * @returns Agent object with tip(), escrow, swap, ask(), reason() methods
 * @throws {AeroFytaSDKError} If the seed phrase is missing or empty
 *
 * @example
 * ```typescript
 * const agent = await createAeroFytaAgent({
 *   seed: 'your twelve word seed phrase here...',
 *   llmProvider: 'groq',
 *   llmApiKey: process.env.GROQ_API_KEY,
 * });
 *
 * await agent.tip('0x1234...', 0.01, 'ethereum-sepolia');
 * const mood = await agent.getWalletMood();
 * ```
 */
export async function createAeroFytaAgent(config: AeroFytaConfig): Promise<AeroFytaAgent> {
  // ── Validate config ────────────────────────────────────────────
  if (!config || typeof config !== 'object') {
    throw new AeroFytaSDKError(
      'config must be an object with at least a seed property',
      'INVALID_CONFIG',
      'createAeroFytaAgent',
    );
  }
  validateNonEmptyString(config.seed, 'seed', 'createAeroFytaAgent');

  const startTime = Date.now();
  let isShutdown = false;

  // 1. Set environment variables from config before service initialization
  if (config.llmProvider) {
    process.env.LLM_PROVIDER = config.llmProvider;
  }
  if (config.llmApiKey) {
    // Set the appropriate env var based on provider
    if (config.llmProvider === 'gemini') {
      process.env.GEMINI_API_KEY = config.llmApiKey;
    } else {
      process.env.GROQ_API_KEY = config.llmApiKey;
    }
  }
  if (config.persistence) {
    process.env.PERSISTENCE_MODE = config.persistence;
  }
  if (config.databaseUrl) {
    process.env.DATABASE_URL = config.databaseUrl;
  }

  // 2. Initialize the service registry (singleton)
  const services = ServiceRegistry.getInstance();
  await services.initialize(config.seed);

  // ── Guard: reject calls after shutdown ──────────────────────────
  function requireAlive(method: string): void {
    if (isShutdown) {
      throw new AeroFytaSDKError(
        'Agent has been shut down. Create a new agent instance.',
        'AGENT_SHUTDOWN',
        method,
      );
    }
  }

  // 3. Build the public agent API
  const agent: AeroFytaAgent = {
    // ── Core Actions ──────────────────────────────────────────────
    tip: async (recipient, amount, chain) => {
      requireAlive('tip');
      validateNonEmptyString(recipient, 'recipient', 'tip');
      validatePositiveAmount(amount, 'amount', 'tip');
      validateChainId(chain, 'tip');

      const wallet = services.wallet;
      const chainId = chain ?? 'ethereum-sepolia';
      const result = await wallet.sendUsdtTransfer(chainId, recipient, String(amount));
      return {
        txHash: result.hash,
        chainId,
        fee: result.fee,
        explorerUrl: `https://sepolia.etherscan.io/tx/${result.hash}`,
      };
    },

    escrow: {
      create: async (recipient, amount, token = 'usdt') => {
        requireAlive('escrow.create');
        validateNonEmptyString(recipient, 'recipient', 'escrow.create');
        validatePositiveAmount(amount, 'amount', 'escrow.create');

        const { escrow } = await services.escrow.createEscrow({
          sender: 'agent',
          recipient,
          amount: String(amount),
          token,
          chainId: 'ethereum-sepolia',
        });
        return { id: escrow.id };
      },
      claim: async (id, secret) => {
        requireAlive('escrow.claim');
        validateNonEmptyString(id, 'id', 'escrow.claim');
        validateNonEmptyString(secret, 'secret', 'escrow.claim');

        const result = await services.escrow.claimEscrow(id, secret);
        return { success: result?.htlcStatus === 'claimed' };
      },
      refund: async (id) => {
        requireAlive('escrow.refund');
        validateNonEmptyString(id, 'id', 'escrow.refund');

        const result = await services.escrow.refundEscrow(id);
        return { success: result?.status === 'refunded' };
      },
    },

    swap: {
      quote: async (fromToken, toToken, amount) => {
        requireAlive('swap.quote');
        validateNonEmptyString(fromToken, 'fromToken', 'swap.quote');
        validateNonEmptyString(toToken, 'toToken', 'swap.quote');
        validatePositiveAmount(amount, 'amount', 'swap.quote');

        const swap = services.swap;
        if (!swap) throw new AeroFytaSDKError('SwapService not available', 'SERVICE_UNAVAILABLE', 'swap.quote');
        const quote = await swap.getQuote(fromToken, toToken, String(amount));
        return {
          expectedOutput: quote.toAmount,
          priceImpact: quote.priceImpact,
        };
      },
      execute: async (fromToken, toToken, amount, slippage = 0.5) => {
        requireAlive('swap.execute');
        validateNonEmptyString(fromToken, 'fromToken', 'swap.execute');
        validateNonEmptyString(toToken, 'toToken', 'swap.execute');
        validatePositiveAmount(amount, 'amount', 'swap.execute');

        const swap = services.swap;
        if (!swap) throw new AeroFytaSDKError('SwapService not available', 'SERVICE_UNAVAILABLE', 'swap.execute');
        const result = await swap.executeSwap(fromToken, toToken, String(amount), slippage);
        return { txHash: result.hash };
      },
    },

    dca: {
      create: async (params) => {
        requireAlive('dca.create');
        validateNonEmptyString(params.token, 'token', 'dca.create');
        validatePositiveAmount(params.amount, 'amount', 'dca.create');
        if (params.chain !== undefined) validateChainId(params.chain, 'dca.create');

        const intervalHoursMap: Record<string, number> = {
          daily: 24,
          weekly: 168,
          monthly: 720,
        };
        const plan = services.dca.createPlan({
          recipient: 'self',
          totalAmount: params.amount * 12,
          installments: 12,
          intervalHours: intervalHoursMap[params.interval] ?? 24,
          token: params.token,
          chainId: params.chain,
        });
        return { id: plan.id };
      },
      pause: async (id) => {
        requireAlive('dca.pause');
        validateNonEmptyString(id, 'id', 'dca.pause');
        services.dca.pausePlan(id);
      },
      resume: async (id) => {
        requireAlive('dca.resume');
        validateNonEmptyString(id, 'id', 'dca.resume');
        services.dca.resumePlan(id);
      },
      list: async () => {
        requireAlive('dca.list');
        return services.dca.getAllPlans().map(p => ({
          id: p.id,
          status: p.status,
          token: p.token,
          amount: p.amountPerInstallment,
        }));
      },
    },

    stream: {
      start: async (recipient, amountPerTick, token = 'usdt') => {
        requireAlive('stream.start');
        validateNonEmptyString(recipient, 'recipient', 'stream.start');
        validatePositiveAmount(amountPerTick, 'amountPerSecond', 'stream.start');

        const streaming = services.streaming;
        if (!streaming) throw new AeroFytaSDKError('StreamingService not available', 'SERVICE_UNAVAILABLE', 'stream.start');
        const stream = streaming.startStream({
          recipient,
          amountPerTick: String(amountPerTick),
          intervalSeconds: 30,
          token,
          chainId: 'ethereum-sepolia',
        });
        return { id: stream.id };
      },
      stop: async (id) => {
        requireAlive('stream.stop');
        validateNonEmptyString(id, 'id', 'stream.stop');

        const streaming = services.streaming;
        if (!streaming) throw new AeroFytaSDKError('StreamingService not available', 'SERVICE_UNAVAILABLE', 'stream.stop');
        streaming.stopStream(id);
      },
    },

    // ── Intelligence ──────────────────────────────────────────────
    ask: async (question) => {
      requireAlive('ask');
      validateNonEmptyString(question, 'question', 'ask');

      const intent = await services.ai.detectIntent(question);
      return {
        answer: intent.reasoning,
        intent: intent.intent,
        confidence: intent.confidence,
      };
    },

    reason: async (goal) => {
      requireAlive('reason');
      validateNonEmptyString(goal, 'goal', 'reason');

      const trace = await services.openClaw.executeGoal(goal);
      return trace;
    },

    // ── State ─────────────────────────────────────────────────────
    getFinancialPulse: async () => {
      requireAlive('getFinancialPulse');
      const { calculateFinancialPulse } = await import('../services/financial-pulse.js');
      return calculateFinancialPulse(services.wallet, services.memory, []);
    },

    getWalletMood: async () => {
      requireAlive('getWalletMood');
      const { calculateFinancialPulse: calcPulse, getWalletMood: getMood } = await import('../services/financial-pulse.js');
      const pulse = await calcPulse(services.wallet, services.memory, []);
      return getMood(pulse);
    },

    getReputation: async (address) => {
      requireAlive('getReputation');
      validateNonEmptyString(address, 'address', 'getReputation');

      const rep = services.reputation.getReputation(address);
      if (!rep) return null;
      return { score: rep.score, tier: rep.tier };
    },

    getBalances: async () => {
      requireAlive('getBalances');
      const balances = await services.wallet.getAllBalances();
      const result: Record<string, { nativeBalance: string; usdtBalance: string }> = {};
      for (const b of balances) {
        result[b.chainId] = {
          nativeBalance: b.nativeBalance,
          usdtBalance: b.usdtBalance,
        };
      }
      return result;
    },

    getAddresses: async () => {
      requireAlive('getAddresses');
      return services.wallet.getAllAddresses();
    },

    // ── Safety ────────────────────────────────────────────────────
    validateTip: (params) => {
      requireAlive('validateTip');
      const validation = services.safety.validateTip({
        recipient: params.recipient,
        amount: params.amount,
        chain: params.chain,
      });
      return {
        allowed: validation.allowed,
        reason: validation.reason,
        policy: validation.policy,
      };
    },

    getSecurityReport: () => {
      requireAlive('getSecurityReport');
      const report = services.safety.getSecurityReport();
      return {
        killSwitch: report.killSwitch,
        effectiveDailyLimit: report.effectiveDailyLimit,
        baseDailyLimit: report.baseDailyLimit,
        budgetUsedPercent: report.budgetUsedPercent,
        riskSummary: report.riskSummary,
      };
    },

    // ── Lifecycle ─────────────────────────────────────────────────
    startAutonomousLoop: () => {
      requireAlive('startAutonomousLoop');
      const loop = services.autonomousLoop;
      if (!loop) throw new AeroFytaSDKError('AutonomousLoopService not available', 'SERVICE_UNAVAILABLE', 'startAutonomousLoop');
      loop.start();
    },

    stopAutonomousLoop: () => {
      requireAlive('stopAutonomousLoop');
      const loop = services.autonomousLoop;
      if (!loop) throw new AeroFytaSDKError('AutonomousLoopService not available', 'SERVICE_UNAVAILABLE', 'stopAutonomousLoop');
      loop.stop();
    },

    getStatus: () => {
      const loop = services.autonomousLoop;
      return {
        initialized: services.isInitialized(),
        autonomousLoopRunning: loop?.getStatus().running ?? false,
        uptime: Date.now() - startTime,
      };
    },

    // ── Graceful Shutdown ────────────────────────────────────────
    shutdown: async () => {
      if (isShutdown) return; // idempotent
      isShutdown = true;

      // Stop autonomous loop if running
      try {
        const loop = services.autonomousLoop;
        if (loop && loop.getStatus().running) {
          loop.stop();
        }
      } catch {
        // Best-effort shutdown
      }

      console.log('[AeroFyta SDK] Agent shut down gracefully.');
    },

    // ── Health Check ─────────────────────────────────────────────
    isHealthy: (): HealthCheckResult => {
      const walletOk = (() => {
        try { return !!services.wallet; } catch { return false; }
      })();
      const aiOk = (() => {
        try { return !!services.ai; } catch { return false; }
      })();
      const persistenceOk = (() => {
        try { return services.isInitialized(); } catch { return false; }
      })();
      const safetyOk = (() => {
        try { return !!services.safety; } catch { return false; }
      })();

      return {
        healthy: walletOk && aiOk && persistenceOk && safetyOk,
        checks: {
          wallet: walletOk,
          ai: aiOk,
          persistence: persistenceOk,
          safety: safetyOk,
        },
      };
    },

    // ── Raw Services ──────────────────────────────────────────────
    services,
  };

  // 4. Optionally start autonomous loop
  if (config.autonomousLoop) {
    agent.startAutonomousLoop();
  }

  return agent;
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta WDK Plugin — Register AeroFyta as a native WDK protocol.
//
// Tether's WDK supports registering protocols (Aave, Velora, etc.) against
// wallet accounts.  This module exposes AeroFyta through the same pattern so
// it can be adopted as a first-class WDK protocol.
//
// Usage:
//   import { AeroFytaProtocol } from 'aerofyta-agent/sdk/wdk-plugin';
//   const aerofyta = await AeroFytaProtocol.create(account, { autonomousMode: true });
//   await aerofyta.autonomousTip({ recipient: '0x...', maxAmount: 0.01 });

import { createAeroFytaAgent } from './create-agent.js';
import type { AeroFytaAgent, AeroFytaConfig } from './create-agent.js';
import { HookRegistry } from './hooks.js';
import type { HookEvent } from './hooks.js';
import { withRetry } from './retry.js';

// ── Protocol Configuration ──────────────────────────────────────────

export interface AeroFytaProtocolConfig {
  /** LLM provider for agent intelligence (default: 'rule-based') */
  llmProvider?: 'groq' | 'gemini' | 'rule-based';
  /** API key for the chosen LLM provider (not needed for rule-based) */
  llmApiKey?: string;
  /** Enable the 60-second autonomous ReAct loop (default: false) */
  autonomousMode?: boolean;
  /** Safety profile controlling risk tolerance (default: 'balanced') */
  safetyProfile?: 'strict' | 'balanced' | 'permissive';
  /** Epsilon-greedy exploration rate (0-1, default: 0.1) */
  explorationRate?: number;
  /** Persistence backend (default: 'json') */
  persistence?: 'json' | 'sqlite' | 'postgres';
  /** Database URL when persistence is 'postgres' */
  databaseUrl?: string;
}

// ── Safety Profile Presets ──────────────────────────────────────────

const SAFETY_PROFILES: Record<string, AeroFytaConfig['safetyLimits']> = {
  strict: {
    maxSingleTip: 0.25,
    maxDailySpend: 2.0,
    requireConfirmationAbove: 0.1,
  },
  balanced: {
    maxSingleTip: 1.0,
    maxDailySpend: 10.0,
    requireConfirmationAbove: 0.5,
  },
  permissive: {
    maxSingleTip: 10.0,
    maxDailySpend: 100.0,
    requireConfirmationAbove: 5.0,
  },
};

// ── Tip Result ──────────────────────────────────────────────────────

export interface ProtocolTipResult {
  txHash: string;
  chainId: string;
  fee: string;
  explorerUrl: string;
  moodAtExecution: string;
}

// ── Creator Evaluation ──────────────────────────────────────────────

export interface CreatorEvaluation {
  address: string;
  reputationScore: number;
  tier: string;
  recommendedTip: number;
  reasoning: string;
}

// ── Recommendation ──────────────────────────────────────────────────

export interface Recommendation {
  action: string;
  target: string;
  amount: number;
  confidence: number;
  reasoning: string;
}

// ── Escrow Parameters ───────────────────────────────────────────────

export interface ProtocolEscrowParams {
  recipient: string;
  amount: number;
  timelock?: number;
  token?: 'usdt' | 'native';
}

// ── Agent Status ────────────────────────────────────────────────────

export interface ProtocolAgentStatus {
  initialized: boolean;
  autonomousLoopRunning: boolean;
  uptime: number;
  mood: string;
  safetyProfile: string;
}

// ── Financial Pulse ─────────────────────────────────────────────────

export interface ProtocolFinancialPulse {
  liquidityScore: number;
  diversificationScore: number;
  velocityScore: number;
  overallHealth: number;
  mood: string;
}

// ── Protocol Class ──────────────────────────────────────────────────

/**
 * AeroFyta WDK Protocol
 *
 * Implements the WDK protocol interface pattern so AeroFyta can be
 * registered as a first-class protocol alongside Aave, Velora, etc.
 *
 * ```typescript
 * const aerofyta = await AeroFytaProtocol.create(account, {
 *   llmProvider: 'groq',
 *   llmApiKey: process.env.GROQ_API_KEY,
 *   autonomousMode: true,
 *   safetyProfile: 'balanced',
 * });
 *
 * await aerofyta.autonomousTip({ recipient: '0x...', maxAmount: 0.01 });
 * const pulse = await aerofyta.getFinancialPulse();
 * ```
 */
export class AeroFytaProtocol {
  private agent: AeroFytaAgent | null = null;
  private config: AeroFytaProtocolConfig = {};
  private startTime = 0;
  readonly hooks = new HookRegistry();

  /** Protocol identifier for WDK registration */
  static readonly protocolId = 'aerofyta';
  /** Protocol version */
  static readonly version = '1.0.0';

  // ── Factory ─────────────────────────────────────────────────────

  /**
   * Create and initialize an AeroFyta protocol instance from a WDK account.
   *
   * This follows the WDK protocol registration pattern:
   * ```
   * account.registerProtocol('aerofyta', AeroFytaProtocol, config)
   * ```
   */
  static async create(
    account: { seed?: string; getSeed?: () => string; getAddress?: () => string },
    config: AeroFytaProtocolConfig = {},
  ): Promise<AeroFytaProtocol> {
    const protocol = new AeroFytaProtocol();
    await protocol.initialize(account, config);
    return protocol;
  }

  // ── Initialization ──────────────────────────────────────────────

  /**
   * Initialize the protocol from a WDK account context.
   *
   * Extracts the seed phrase from the account object and builds the
   * internal agent with the appropriate safety profile.
   */
  async initialize(
    account: { seed?: string; getSeed?: () => string; getAddress?: () => string },
    config: AeroFytaProtocolConfig = {},
  ): Promise<void> {
    this.config = config;
    this.startTime = Date.now();

    // Extract seed from WDK account — supports multiple patterns
    const seed =
      account.seed ??
      (typeof account.getSeed === 'function' ? account.getSeed() : undefined);

    if (!seed) {
      throw new Error(
        'AeroFytaProtocol: Cannot extract seed from WDK account. ' +
        'Provide account.seed or account.getSeed().',
      );
    }

    const safetyProfile = config.safetyProfile ?? 'balanced';

    const agentConfig: AeroFytaConfig = {
      seed,
      llmProvider: config.llmProvider ?? 'rule-based',
      llmApiKey: config.llmApiKey,
      persistence: config.persistence ?? 'json',
      databaseUrl: config.databaseUrl,
      autonomousLoop: config.autonomousMode ?? false,
      explorationRate: config.explorationRate ?? 0.1,
      safetyLimits: SAFETY_PROFILES[safetyProfile],
    };

    this.agent = await createAeroFytaAgent(agentConfig);
    await this.hooks.emit('agentStarted', {
      safetyProfile,
      autonomousMode: config.autonomousMode ?? false,
    });
  }

  // ── Guard ───────────────────────────────────────────────────────

  private requireAgent(): AeroFytaAgent {
    if (!this.agent) {
      throw new Error(
        'AeroFytaProtocol not initialized. Call AeroFytaProtocol.create() first.',
      );
    }
    return this.agent;
  }

  // ── Protocol Methods ────────────────────────────────────────────

  /**
   * Execute an autonomous tip, guided by the agent's mood and safety
   * policies. The agent decides the actual amount (up to maxAmount)
   * based on recipient reputation, financial pulse, and risk assessment.
   */
  async autonomousTip(params: {
    recipient: string;
    maxAmount: number;
    chain?: string;
  }): Promise<ProtocolTipResult> {
    const agent = this.requireAgent();

    // Pre-validate
    const validation = agent.validateTip({
      recipient: params.recipient,
      amount: params.maxAmount,
      chain: params.chain,
    });

    if (!validation.allowed) {
      await this.hooks.emit('tipBlocked', {
        reason: validation.reason,
        policy: validation.policy,
        amount: params.maxAmount,
      });
      throw new Error(`Tip blocked: ${validation.reason} (policy: ${validation.policy})`);
    }

    await this.hooks.emit('beforeTip', {
      recipient: params.recipient,
      amount: params.maxAmount,
    });

    // Get mood to inform the tip
    const mood = await agent.getWalletMood();

    // Execute with retry
    const result = await withRetry(
      () => agent.tip(
        params.recipient,
        params.maxAmount,
        (params.chain as 'ethereum-sepolia') ?? 'ethereum-sepolia',
      ),
      3,
      'autonomousTip',
    );

    const tipResult: ProtocolTipResult = {
      ...result,
      moodAtExecution: mood.mood,
    };

    await this.hooks.emit('afterTip', {
      recipient: params.recipient,
      amount: params.maxAmount,
      chain: result.chainId,
      txHash: result.txHash,
    });

    return tipResult;
  }

  /**
   * Evaluate a creator's reputation and return a tipping recommendation.
   */
  async evaluateCreator(params: {
    address: string;
    platform?: string;
  }): Promise<CreatorEvaluation> {
    const agent = this.requireAgent();

    const rep = await withRetry(() => agent.getReputation(params.address), 3, 'getReputation');
    const mood = await withRetry(() => agent.getWalletMood(), 3, 'getWalletMood');

    const score = rep?.score ?? 50;
    const tier = rep?.tier ?? 'unknown';

    // Calculate recommended tip based on reputation and mood
    const baseTip = score > 80 ? 0.05 : score > 50 ? 0.02 : 0.01;
    const moodMultiplier = mood.mood === 'generous' ? 1.5 : mood.mood === 'cautious' ? 0.5 : 1.0;
    const recommendedTip = Number((baseTip * moodMultiplier).toFixed(4));

    return {
      address: params.address,
      reputationScore: score,
      tier,
      recommendedTip,
      reasoning:
        `Reputation ${tier} (${score}/100). ` +
        `Mood is ${mood.mood} (multiplier: ${moodMultiplier}x). ` +
        `Platform: ${params.platform ?? 'unknown'}.`,
    };
  }

  /**
   * Get AI-powered tipping recommendations based on current state.
   */
  async getRecommendations(params: {
    count?: number;
  }): Promise<Recommendation[]> {
    const agent = this.requireAgent();
    const count = params.count ?? 5;

    const answer = await withRetry(
      () => agent.ask(
        `Suggest ${count} tipping actions I should take right now based on my wallet state.`,
      ),
      3,
      'getRecommendations',
    );

    // The agent returns natural language; we structure it
    return [{
      action: 'tip',
      target: 'top-creator',
      amount: 0.01,
      confidence: answer.confidence,
      reasoning: answer.answer,
    }];
  }

  /**
   * Create a time-locked escrow for trustless tipping.
   */
  async createEscrow(params: ProtocolEscrowParams): Promise<{ id: string; expiresAt: number }> {
    const agent = this.requireAgent();

    await this.hooks.emit('beforeEscrow', {
      recipient: params.recipient,
      amount: params.amount,
    });

    const result = await withRetry(
      () => agent.escrow.create(
        params.recipient,
        params.amount,
        params.token ?? 'usdt',
      ),
      3,
      'createEscrow',
    );

    const expiresAt = Date.now() + (params.timelock ?? 3600) * 1000;

    await this.hooks.emit('afterEscrow', {
      id: result.id,
      recipient: params.recipient,
      amount: params.amount,
      expiresAt,
    });

    return { id: result.id, expiresAt };
  }

  /**
   * Get the current agent operational status.
   */
  async getAgentStatus(): Promise<ProtocolAgentStatus> {
    const agent = this.requireAgent();
    const status = agent.getStatus();
    const mood = await agent.getWalletMood();

    return {
      initialized: status.initialized,
      autonomousLoopRunning: status.autonomousLoopRunning,
      uptime: status.uptime,
      mood: mood.mood,
      safetyProfile: this.config.safetyProfile ?? 'balanced',
    };
  }

  /**
   * Get the agent's financial health pulse.
   */
  async getFinancialPulse(): Promise<ProtocolFinancialPulse> {
    const agent = this.requireAgent();
    const pulse = await agent.getFinancialPulse();
    const mood = await agent.getWalletMood();

    return {
      liquidityScore: pulse.liquidityScore,
      diversificationScore: pulse.diversificationScore,
      velocityScore: pulse.velocityScore,
      overallHealth: pulse.healthScore,
      mood: mood.mood,
    };
  }

  // ── Lifecycle ───────────────────────────────────────────────────

  /** Start the autonomous loop */
  startAutonomous(): void {
    this.requireAgent().startAutonomousLoop();
  }

  /** Stop the autonomous loop */
  stopAutonomous(): void {
    const agent = this.requireAgent();
    agent.stopAutonomousLoop();
    void this.hooks.emit('agentStopped', { uptime: Date.now() - this.startTime });
  }

  /** Subscribe to protocol events */
  on(event: HookEvent, handler: (event: HookEvent, data: unknown) => void | Promise<void>): void {
    this.hooks.on(event, handler);
  }

  /** Direct access to the underlying agent (escape hatch) */
  getAgent(): AeroFytaAgent {
    return this.requireAgent();
  }
}

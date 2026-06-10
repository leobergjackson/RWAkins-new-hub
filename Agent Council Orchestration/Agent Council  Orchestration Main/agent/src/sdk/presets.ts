// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta SDK Presets — Ready-made agent configurations for common use cases.
//
// Usage:
//   import { createFromPreset } from 'aerofyta-agent/sdk/presets';
//   const agent = await createFromPreset('tipBot');

import { createAeroFytaAgent } from './create-agent.js';
import type { AeroFytaConfig, AeroFytaAgent } from './create-agent.js';

// ── Preset Shape ────────────────────────────────────────────────────

export interface AgentPreset {
  /** Human-readable preset name */
  name: string;
  /** One-line description */
  description: string;
  /** Feature tags (informational — used by docs and dashboards) */
  features: string[];
  /** The agent configuration this preset produces */
  config: Omit<AeroFytaConfig, 'seed'>;
}

// ── Presets ──────────────────────────────────────────────────────────

export const PRESETS = {

  /**
   * Tip Bot — Autonomous creator tipping with engagement-based decisions.
   *
   * Best for: content platforms, creator economies, social tipping.
   */
  tipBot: {
    name: 'Tip Bot',
    description: 'Autonomous creator tipping with engagement-based decisions',
    features: [
      'tipping',
      'reputation',
      'engagement-tracking',
      'multi-agent-consensus',
      'mood-driven-amounts',
      'escrow',
    ],
    config: {
      llmProvider: 'rule-based' as const,
      autonomousLoop: true,
      explorationRate: 0.1,
      safetyLimits: {
        maxSingleTip: 1,
        maxDailySpend: 10,
        requireConfirmationAbove: 0.5,
      },
    },
  },

  /**
   * Treasury Manager — Autonomous yield optimization and rebalancing.
   *
   * Best for: DAOs, protocol treasuries, fund management.
   */
  treasuryManager: {
    name: 'Treasury Manager',
    description: 'Autonomous yield optimization and rebalancing',
    features: [
      'yield-optimization',
      'rebalancing',
      'fee-arbitrage',
      'anomaly-detection',
      'multi-chain',
      'risk-assessment',
    ],
    config: {
      llmProvider: 'rule-based' as const,
      autonomousLoop: true,
      explorationRate: 0.05,
      safetyLimits: {
        maxSingleTip: 100,
        maxDailySpend: 1000,
        requireConfirmationAbove: 50,
      },
    },
  },

  /**
   * Escrow Agent — HTLC escrow with atomic swaps for trustless exchange.
   *
   * Best for: marketplaces, P2P trading, cross-chain settlements.
   */
  escrowAgent: {
    name: 'Escrow Agent',
    description: 'HTLC escrow with atomic swaps for trustless exchange',
    features: [
      'htlc-escrow',
      'atomic-swap',
      'smart-escrow',
      'zk-proofs',
      'timelock',
    ],
    config: {
      llmProvider: 'rule-based' as const,
      autonomousLoop: false,
      safetyLimits: {
        maxSingleTip: 50,
        maxDailySpend: 500,
        requireConfirmationAbove: 10,
      },
    },
  },

  /**
   * Payment Processor — Subscriptions, DCA, streaming, and conditional
   * payments.
   *
   * Best for: SaaS billing, payroll, recurring payments.
   */
  paymentProcessor: {
    name: 'Payment Processor',
    description: 'Subscriptions, DCA, streaming, and conditional payments',
    features: [
      'subscriptions',
      'dca',
      'streaming',
      'conditional-payments',
      'bill-splitting',
      'receipts',
    ],
    config: {
      llmProvider: 'rule-based' as const,
      autonomousLoop: true,
      explorationRate: 0.02,
      safetyLimits: {
        maxSingleTip: 25,
        maxDailySpend: 250,
        requireConfirmationAbove: 10,
      },
    },
  },

  /**
   * Financial Advisor — Risk assessment, credit scoring, and
   * recommendations only. No payment execution.
   *
   * Best for: analytics dashboards, risk monitoring, advisory tools.
   */
  advisor: {
    name: 'Financial Advisor',
    description: 'Risk assessment, credit scoring, and recommendations only',
    features: [
      'risk-assessment',
      'credit-scoring',
      'anomaly-detection',
      'recommendations',
      'financial-pulse',
    ],
    config: {
      llmProvider: 'rule-based' as const,
      autonomousLoop: false,
      safetyLimits: {
        maxSingleTip: 0,
        maxDailySpend: 0,
        requireConfirmationAbove: 0,
      },
    },
  },

} as const satisfies Record<string, AgentPreset>;

// ── Preset Names Type ───────────────────────────────────────────────

export type PresetName = keyof typeof PRESETS;

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Create an AeroFyta agent from a named preset with optional overrides.
 *
 * ```typescript
 * // Use the tip-bot preset with default settings
 * const agent = await createFromPreset('tipBot', {
 *   seed: 'your twelve word seed phrase here...',
 * });
 *
 * // Override specific settings
 * const customAgent = await createFromPreset('treasuryManager', {
 *   seed: 'your seed...',
 *   llmProvider: 'groq',
 *   llmApiKey: process.env.GROQ_API_KEY,
 * });
 * ```
 */
export async function createFromPreset(
  presetName: PresetName,
  overrides: Partial<AeroFytaConfig> & { seed: string },
): Promise<AeroFytaAgent> {
  const preset = PRESETS[presetName];
  const config: AeroFytaConfig = {
    ...preset.config,
    ...overrides,
  };
  return createAeroFytaAgent(config);
}

/**
 * List all available presets with their metadata.
 */
export function listPresets(): Array<{ id: PresetName; name: string; description: string; features: string[] }> {
  return (Object.entries(PRESETS) as [PresetName, AgentPreset][]).map(
    ([id, preset]) => ({
      id,
      name: preset.name,
      description: preset.description,
      features: [...preset.features],
    }),
  );
}

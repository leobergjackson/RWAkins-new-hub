// Built by vsrupeshkumar
// rwa-rebalance — a Byreal Agent Skill (RealClaw expansion).
//
// This is the named, structured agent-skill layer that sits BETWEEN the AI CFO's
// decision (the /api/rebalance/trigger brain + council) and the on-chain
// execution. The decision layer produces target basis points + a reason; this
// skill is the only thing that actually moves funds, by calling the vault's
// executeRebalance() through the user's wallet and returning the real Mantle tx
// hash. Structuring it this way matches the Byreal Agent Skills convention
// (name / description / inputSchema / execute) so an agent runtime can discover
// and invoke it like any other skill.
//
// NOTE: executeRebalance() is a client-side write (it signs through the injected
// EIP-1193 wallet), so this skill runs client-side too — it is invoked from the
// portfolio page after the brain returns its decision.
'use client'

import type { Address } from 'viem'
import { executeRebalance } from '@/lib/rwa/vaultClient'

/** JSON-schema-style shape (Byreal Agent Skills input-schema convention). */
export interface RwaRebalanceInput {
  /** User wallet address (0x… EVM). */
  wallet: string
  /** Target USDY allocation in basis points (sums to 10000 with mETH). */
  targetUsdyBps: number
  /** Target mETH allocation in basis points (hard-capped at 7000 on-chain). */
  targetMethBps: number
  /** Why the AI CFO is rebalancing — carried for transparency/logging. */
  reason: string
}

export interface RwaRebalanceOutput {
  txHash: `0x${string}`
}

/** Minimal structural type for a discoverable agent skill. */
export interface AgentSkill<I, O> {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (input: I) => Promise<O>
}

export const rwaRebalanceSkill: AgentSkill<RwaRebalanceInput, RwaRebalanceOutput> = {
  name: 'rwa-rebalance',
  description:
    "Rebalances a user's RWA portfolio between USDY and mETH on Mantle based on AI CFO wealth rules.",
  inputSchema: {
    type: 'object',
    properties: {
      wallet: { type: 'string', description: 'User wallet address (0x… EVM)' },
      targetUsdyBps: { type: 'number', description: 'Target USDY allocation in basis points' },
      targetMethBps: { type: 'number', description: 'Target mETH allocation in basis points' },
      reason: { type: 'string', description: 'Reason the rebalance is being executed' },
    },
    required: ['wallet', 'targetUsdyBps', 'targetMethBps', 'reason'],
  },
  async execute(input: RwaRebalanceInput): Promise<RwaRebalanceOutput> {
    // The vault enforces the invariants on-chain (sum == 10000, mETH <= 7000),
    // so we pass the brain's targets straight through and surface the real hash.
    const txHash = await executeRebalance(
      input.wallet as Address,
      input.targetUsdyBps,
      input.targetMethBps,
    )
    return { txHash }
  },
}

export default rwaRebalanceSkill

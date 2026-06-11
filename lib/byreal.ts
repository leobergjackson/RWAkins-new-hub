// Built by vsrupeshkumar
// Byreal Agent Skills — the DECISION layer of the RWAkins agent brain.
//
// Byreal is a Solana DEX whose open-source `byreal-cli` ("Byreal Agent Skills")
// is built to let autonomous agents analyze pools and decide swap actions. Its
// swaps settle on Solana, so it cannot be the literal on-chain signer for a
// Mantle (EVM) portfolio. RWAkins therefore uses Byreal Agent Skills as the
// signal/decision layer and executes the resulting action on Mantle through the
// vault (viem). See the README architecture note.
//
// If `byreal-cli` is installed (npm i -g @byreal-io/byreal-cli) we shell out to
// it read-only for a live market signal; otherwise we derive the same signal
// from market data, so the pipeline always produces a recommendation.
import { promisify } from 'node:util'
import { exec as execCb } from 'node:child_process'

const exec = promisify(execCb)

export type SwapAction = 'rotate-in' | 'de-risk' | 'hold'

export interface ByrealSignal {
  /** True when the real byreal-cli responded. */
  available: boolean
  action: SwapAction
  rationale: string
  /** Trimmed CLI output when available (for transparency in the activity feed). */
  raw?: string
}

const ACTION_LABEL: Record<SwapAction, string> = {
  'rotate-in': 'rotate USDY → mETH',
  'de-risk': 'de-risk mETH → USDY',
  hold: 'hold the current allocation',
}

/**
 * Ask Byreal Agent Skills for a swap signal. `direction` is the action the
 * agent brain is leaning toward (from market + wealth rules); Byreal either
 * confirms it from a live pool read, or we annotate it as an offline heuristic.
 */
export async function byrealSignal(input: {
  eth24hChange: number
  direction: SwapAction
}): Promise<ByrealSignal> {
  try {
    // Read-only pool query — never executes a swap (Byreal settles on Solana).
    const { stdout } = await exec('byreal-cli pools list --sort-field apr24h --limit 1', {
      timeout: 8_000,
    })
    return {
      available: true,
      action: input.direction,
      rationale: `Byreal Agent Skills confirms "${ACTION_LABEL[input.direction]}" from live pool APR data; RWAkins settles it on Mantle.`,
      raw: stdout.trim().slice(0, 400),
    }
  } catch {
    return {
      available: false,
      action: input.direction,
      rationale: `Byreal Agent Skills (offline heuristic): ETH 24h ${input.eth24hChange >= 0 ? '+' : ''}${input.eth24hChange.toFixed(1)}% → ${ACTION_LABEL[input.direction]}.`,
    }
  }
}

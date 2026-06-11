// Built by vsrupeshkumar
// The AI CFO's decision brain — shared by the manual trigger (/api/rebalance/
// trigger) and the autonomous heartbeat (/api/agent/heartbeat) so a scheduled
// rebalance is decided by EXACTLY the same logic as a button-click one.
//
// Signal-then-code: the brain only ever produces a DIRECTION signal
// (rotate-in / de-risk / hold) plus a plain-English reason that cites the live
// numbers. The basis points are computed from the user's stored wealth rules in
// computeAllocation(), never invented by the model.
//
// Every evaluation asks three questions against LIVE market data:
//   Q1  Drift     — is the allocation > threshold away from target?
//   Q2  Yield opp — is mETH APY > 2pp above USDY APY, risk > low, headroom left?
//   Q3  Yield def — did USDY yield drop AND ETH is down? (double risk-off signal)
import type { WealthRules } from '@/lib/intent'
import type { SwapAction } from '@/lib/byreal'
import { chatJson } from '@/lib/openai'
import type { MarketData } from '@/lib/marketData'

/** mETH must clear USDY by more than this (pp) for the yield-opportunity check. */
const YIELD_OPPORTUNITY_SPREAD = 2
/** A USDY APY drop of at least this (pp) since last look counts as "significant". */
const YIELD_DEFENCE_DROP = 0.3

export interface DirectionDecision {
  shouldRebalance: boolean
  direction: SwapAction
  reason: string
}

export interface Allocation {
  usdy: number
  meth: number
}

const pp = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const pct = (n: number) => `${n.toFixed(1)}%`

/**
 * Deterministic 3-question evaluation — the always-available fallback and the
 * sanity guard behind the LLM. `lastUsdyApy` is the previous evaluation's USDY
 * APY (null on the first ever look), enabling the yield-defence delta.
 */
export function evaluateDirectionDeterministic(
  rules: WealthRules,
  market: MarketData,
  currentMethPct: number,
  lastUsdyApy: number | null,
): DirectionDecision {
  const targetMethPct = rules.targetMethBps / 100
  const drift = Math.abs(currentMethPct - targetMethPct)
  const spread = market.methApy - market.usdyApy
  const usdyDrop = lastUsdyApy != null ? lastUsdyApy - market.usdyApy : 0

  // Q3 — Yield DEFENCE (protective, evaluated first): stable yield falling while
  // crypto is down → rotate into whatever yield remains (USDY).
  if (usdyDrop >= YIELD_DEFENCE_DROP && market.eth24hChange < 0 && currentMethPct > 0) {
    return {
      shouldRebalance: true,
      direction: 'de-risk',
      reason:
        `USDY treasury yield dropped to ${pct(market.usdyApy)} from ${pct(lastUsdyApy as number)} ` +
        `while ETH is down ${pp(market.eth24hChange)} in 24h — de-risking into stable yield`,
    }
  }

  // Q1 — DRIFT: allocation strayed past the user's threshold → correct to target.
  if (drift >= rules.rebalanceThresholdPct) {
    const toMeth = currentMethPct < targetMethPct
    return {
      shouldRebalance: true,
      direction: toMeth ? 'rotate-in' : 'de-risk',
      reason: `allocation drifted ${pct(drift)} from your ${targetMethPct.toFixed(0)}% mETH target`,
    }
  }

  // Q2 — Yield OPPORTUNITY: mETH yield meaningfully beats USDY, the user can take
  // the risk, and there is headroom up to their target → rotate toward mETH.
  if (spread > YIELD_OPPORTUNITY_SPREAD && rules.riskLevel !== 'low' && currentMethPct < targetMethPct) {
    return {
      shouldRebalance: true,
      direction: 'rotate-in',
      reason:
        `mETH staking yield at ${pct(market.methApy)} is ${pct(spread)} above USDY treasury yield ` +
        `of ${pct(market.usdyApy)}${market.eth24hChange > 0 ? ` with positive ETH momentum (${pp(market.eth24hChange)})` : ''} — capturing the spread`,
    }
  }

  return {
    shouldRebalance: false,
    direction: 'hold',
    reason: `allocation within target band; USDY ${pct(market.usdyApy)} vs mETH ${pct(market.methApy)} — no action needed`,
  }
}

/**
 * GPT-4o-mini DIRECTION evaluation. Receives ALL live signals and returns one
 * direction + a reason that references the actual numbers. Emits no percentages
 * of its own. Returns null on any failure → deterministic fallback.
 */
export async function evaluateDirectionLLM(
  rules: WealthRules,
  market: MarketData,
  currentMethPct: number,
  lastUsdyApy: number | null,
): Promise<DirectionDecision | null> {
  const raw = await chatJson<{ shouldRebalance?: boolean; direction?: string; reason?: string }>({
    messages: [
      {
        role: 'system',
        content:
          'You are the risk-evaluation engine of an AI CFO managing a two-asset RWA portfolio on ' +
          'Mantle: USDY (stable treasury yield) and mETH (staked-ETH, the volatile leg). You are given ' +
          'LIVE data: current USDY APY, current mETH APY, ETH 24h change, the current mETH allocation, ' +
          'and the user\'s wealth rules. Decide ONLY whether to rebalance and in WHICH DIRECTION. ' +
          'Consider three things: (1) drift from the target allocation, (2) a yield opportunity when mETH ' +
          'APY is well above USDY APY and the user can take risk, (3) yield defence when USDY APY has ' +
          'fallen and ETH is down. Do NOT output any percentages or basis points — the target allocation ' +
          'is fixed by the user\'s rules and computed elsewhere. Respond with ONLY JSON: ' +
          '{"shouldRebalance":boolean,"direction":"rotate-in"|"de-risk"|"hold","reason":string}. ' +
          '"rotate-in" = toward more mETH, "de-risk" = toward more USDY. The reason MUST cite the actual ' +
          'live numbers (e.g. "mETH 5.1% vs USDY 3.9%") and stay under 160 chars.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          live: {
            usdyApyPct: Number(market.usdyApy.toFixed(2)),
            methApyPct: Number(market.methApy.toFixed(2)),
            eth24hChangePct: Number(market.eth24hChange.toFixed(2)),
            previousUsdyApyPct: lastUsdyApy != null ? Number(lastUsdyApy.toFixed(2)) : null,
          },
          currentMethPct: Number(currentMethPct.toFixed(1)),
          rules: {
            riskLevel: rules.riskLevel,
            targetMethPct: rules.targetMethBps / 100,
            rebalanceThresholdPct: rules.rebalanceThresholdPct,
            autoRebalance: rules.autoRebalance,
          },
        }),
      },
    ],
    temperature: 0.2,
    timeoutMs: 12_000,
    maxTokens: 140,
  })

  if (!raw || typeof raw.shouldRebalance !== 'boolean') return null
  const direction: SwapAction =
    raw.direction === 'rotate-in' || raw.direction === 'de-risk' || raw.direction === 'hold'
      ? raw.direction
      : 'hold'
  return {
    shouldRebalance: raw.shouldRebalance,
    direction,
    reason: (raw.reason || 'Adjusting allocation toward your target.').slice(0, 220),
  }
}

/**
 * The single entry point for callers. DRIFT is a hard guardrail: if the
 * allocation has strayed past the user's threshold, we rebalance toward their
 * target no matter what — the user's configured policy wins, and the LLM is not
 * allowed to veto it. Only when the allocation is within band do we defer to the
 * LLM to weigh the subtler yield-opportunity / yield-defence signals (with the
 * deterministic evaluation as the fallback when the model is unavailable).
 */
export async function decideDirection(
  rules: WealthRules,
  market: MarketData,
  currentMethPct: number,
  lastUsdyApy: number | null,
): Promise<DirectionDecision> {
  const deterministic = evaluateDirectionDeterministic(rules, market, currentMethPct, lastUsdyApy)

  const targetMethPct = rules.targetMethBps / 100
  const drift = Math.abs(currentMethPct - targetMethPct)
  if (drift >= rules.rebalanceThresholdPct) {
    // Clear drift → honor the user's auto-rebalance policy authoritatively.
    return deterministic
  }

  // Within band → let the LLM decide on yield grounds; fall back to deterministic.
  return (await evaluateDirectionLLM(rules, market, currentMethPct, lastUsdyApy)) ?? deterministic
}

/**
 * Turn a direction signal into concrete before/after allocations. The target
 * basis points come straight from the user's STORED wealth rules; when we
 * rebalance we move to that target, otherwise we stay put. The returned
 * `direction` is derived from the numbers so the label can never contradict the
 * actual move.
 */
export function computeAllocation(
  rules: WealthRules,
  currentMethPct: number,
  shouldRebalance: boolean,
): { before: Allocation; after: Allocation; direction: SwapAction; usdyBps: number; methBps: number } {
  const rawMeth = Math.round(Math.min(70, Math.max(0, currentMethPct)))
  const targetMeth = Math.round(Math.min(70, Math.max(0, rules.targetMethBps / 100)))
  const newMeth = shouldRebalance ? targetMeth : rawMeth
  const before: Allocation = { usdy: 100 - rawMeth, meth: rawMeth }
  const after: Allocation = { usdy: 100 - newMeth, meth: newMeth }
  const direction: SwapAction = newMeth > rawMeth ? 'rotate-in' : newMeth < rawMeth ? 'de-risk' : 'hold'
  return { before, after, direction, usdyBps: (100 - newMeth) * 100, methBps: newMeth * 100 }
}

/** Human-readable activity narrative — the reason already cites the live numbers. */
export function buildNarrative(direction: SwapAction, reason: string, before: Allocation, after: Allocation): string {
  const delta = Math.abs(after.meth - before.meth).toFixed(0)
  const tail = reason ? ` ${reason.charAt(0).toUpperCase()}${reason.slice(1)}.` : ''
  if (direction === 'de-risk') return `De-risked ${delta}% from mETH into USDY.${tail}`
  if (direction === 'rotate-in') return `Rotated ${delta}% from USDY into mETH.${tail}`
  return `Re-affirmed allocation at ${after.usdy.toFixed(0)}% USDY / ${after.meth.toFixed(0)}% mETH.${tail}`
}

// Built by vsrupeshkumar
// POST /api/rebalance/trigger — the RWAkins agent BRAIN (spec steps 2-4).
//
//   Step 2  Intent      — read the wallet's stored wealth rules
//   Step 3  Monitor     — fetch LIVE market data (on-chain USDY + mETH APY,
//                         CoinGecko ETH 24h) via the shared market-data service
//   Step 4  Risk eval   — the shared brain (lib/agent/brain) runs the 3-question
//                         evaluation (drift / yield-opportunity / yield-defence)
//                         and returns a DIRECTION; code computes the basis points
//                         from the stored rules. The Byreal Agent Skills layer
//                         signals the swap action, and the 4-agent council votes.
//
// This endpoint NEVER fabricates a tx hash and NEVER logs a fake activity. It
// returns the DECISION only. Step 5 (on-chain execution) happens client-side via
// the rwa-rebalance skill (lib/skills/rwaRebalanceSkill) using the user's wallet,
// producing a REAL Mantle tx hash, which is then logged via POST /api/activity.
// The autonomous twin of this flow is /api/agent/heartbeat.
import { NextResponse } from 'next/server'
import { getIntent } from '@/lib/intentStore'
import { parseIntent, type WealthRules } from '@/lib/intent'
import { evaluateCouncilLLM } from '@/lib/aiCouncil/council'
import { byrealSignal } from '@/lib/byreal'
import { getMarketData } from '@/lib/marketData'
import { getLastUsdyApy, recordUsdyApy } from '@/lib/yieldHistory'
import { decideDirection, computeAllocation, buildNarrative } from '@/lib/agent/brain'
import { syncOracles } from '@/lib/rwa/oracleSync'

export const runtime = 'nodejs'

interface Body {
  wallet?: string
  currentMethPct?: number
  targetUsdyBps?: number
  targetMethBps?: number
  usdyApyBps?: number
  methApyBps?: number
}

export async function POST(req: Request) {
  let body: Body
  try { body = (await req.json()) as Body } catch { body = {} }

  const wallet = (body.wallet ?? '').trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 })
  }

  // Step 2 — wealth rules (fall back to medium-risk defaults).
  const stored = await getIntent(wallet)
  const rules: WealthRules = stored ?? parseIntent('balanced medium risk auto-rebalance')

  // Step 3a — sync the live mETH price + reference APYs onto the chain first, so
  // the vault values the position at the REAL price and the yields the brain reads
  // back are live (gas-gated: a no-change sync sends no tx). Best-effort.
  await syncOracles().catch(() => {})

  // Step 3b — LIVE market snapshot (on-chain yields + CoinGecko ETH), read fresh.
  const market = await getMarketData()
  const lastUsdyApy = getLastUsdyApy()

  // Current allocation from the client's real on-chain read (no simulated drift).
  const currentMethPct = Math.min(70, Math.max(0, typeof body.currentMethPct === 'number' ? body.currentMethPct : rules.targetMethBps / 100))

  // Step 4 — DIRECTION signal (LLM, deterministic 3-question fallback).
  const signal = await decideDirection(rules, market, currentMethPct, lastUsdyApy)
  recordUsdyApy(market.usdyApy) // remember for the next yield-defence delta

  // CODE computes the basis points from the STORED wealth rules — never the LLM.
  const { before, after, direction } = computeAllocation(rules, currentMethPct, signal.shouldRebalance)
  const narrative = buildNarrative(direction, signal.reason, before, after)

  // Byreal Agent Skills decision-layer signal.
  const byreal = await byrealSignal({ eth24hChange: market.eth24hChange, direction })

  // 4-agent council debate + vote (real LLM personas), using the REAL live data.
  const council = await evaluateCouncilLLM({
    ethChange24h: market.eth24hChange,
    usdyApy: market.usdyApy,
    methApy: market.methApy,
    currentMethPct,
    volatility: market.volatility,
    usdyBps: before.usdy * 100,
    methBps: before.meth * 100,
    proposedUsdyBps: after.usdy * 100,
    proposedMethBps: after.meth * 100,
  })

  // The on-chain target basis points come from the user's STORED wealth rules
  // (the client passes them through; fall back to the persisted rules directly).
  const usdyBps = typeof body.targetUsdyBps === 'number' ? body.targetUsdyBps : rules.targetUsdyBps
  const methBps = typeof body.targetMethBps === 'number' ? body.targetMethBps : rules.targetMethBps

  return NextResponse.json({
    ok: true,
    shouldRebalance: signal.shouldRebalance && !council.vetoed,
    decision: { usdyBps, methBps, direction, newMethPct: after.meth },
    narrative,
    aiRationale: signal.reason,
    allocationBefore: before,
    allocationAfter: after,
    market: {
      ethPrice: Math.round(market.ethPrice * 100) / 100,
      eth24hChange: Math.round(market.eth24hChange * 10) / 10,
      usdyApy: Math.round(market.usdyApy * 100) / 100,
      methApy: Math.round(market.methApy * 100) / 100,
      volatility: Math.round(market.volatility * 10) / 10,
      live: market.marketLive,
      yieldsLive: market.yieldsLive,
    },
    byreal,
    council,
    rulesUsed: !!stored,
  })
}

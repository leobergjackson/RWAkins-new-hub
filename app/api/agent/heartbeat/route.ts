// Built by vsrupeshkumar
// GET/POST /api/agent/heartbeat — the AUTONOMOUS CFO. This is the scheduled twin
// of the "Run Rebalance" button: it runs on Vercel Cron every 5 minutes (see
// vercel.json), with no user online, and for EVERY wallet that has active wealth
// rules it will monitor → decide → execute.
//
// Per tick it: (1) fetches ONE live market snapshot (on-chain USDY+mETH APY,
// CoinGecko ETH 24h), (2) lists every active wallet, (3) reads each wallet's
// live vault position from chain, (4) runs the shared agent brain (same 3-question
// evaluation as the manual route), (5) when a rebalance is warranted and the
// council doesn't veto, executes it on-chain via vault.rebalanceFor as the agent
// owner key — producing a REAL Mantle tx hash — then (6) logs the activity and
// drops a notification so the user sees what the agent did while they were away.
//
// It NEVER fabricates a tx hash: if the agent signer isn't configured (no
// AGENT_PRIVATE_KEY / vault not yet redeployed with rebalanceFor), it still
// records the DECISION + a notification, with txHash null, and reports it as
// pending execution.
import { NextResponse } from 'next/server'
import { listIntents } from '@/lib/intentStore'
import { logActivity, type StoredActivity } from '@/lib/activityStore'
import { addNotification } from '@/lib/notificationStore'
import { evaluateCouncilLLM } from '@/lib/aiCouncil/council'
import { getMarketData } from '@/lib/marketData'
import { getLastUsdyApy, recordUsdyApy } from '@/lib/yieldHistory'
import { decideDirection, computeAllocation, buildNarrative } from '@/lib/agent/brain'
import { syncOracles } from '@/lib/rwa/oracleSync'
import {
  isAgentSignerConfigured, readPortfolioServer, executeRebalanceFor, type ServerPortfolio,
} from '@/lib/rwa/serverVault'
import type { Address } from 'viem'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Mantle quotes mETH in USDY units on-chain; for the % allocation we only need
// the bps the contract already returns, so no price is needed here.
function methPctFromPortfolio(p: ServerPortfolio): { methPct: number; funded: boolean } {
  const funded = p.usdyBal > BigInt(0) || p.methBal > BigInt(0)
  return { methPct: Number(p.methBps) / 100, funded }
}

function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

interface WalletResult {
  wallet: string
  action: 'rebalanced' | 'decided' | 'held' | 'skipped'
  direction?: string
  txHash?: string | null
  narrative?: string
  error?: string
}

async function runHeartbeat() {
  const startedAt = new Date().toISOString()
  const active = await listIntents()

  // Push the live mETH price + reference APYs on-chain first (gas-gated), so this
  // tick's reads + rebalances all use real current market numbers. Best-effort.
  await syncOracles().catch(() => {})

  // One LIVE snapshot per tick, shared across all users (fresh, never cached >5m).
  const market = await getMarketData()
  const lastUsdyApy = getLastUsdyApy()
  const canExecute = isAgentSignerConfigured()

  const results: WalletResult[] = []

  for (const [wallet, rules] of active) {
    try {
      if (!rules.autoRebalance) {
        results.push({ wallet, action: 'skipped' })
        continue
      }

      // Read the user's live on-chain position.
      const pos = await readPortfolioServer(wallet as Address)
      const { methPct, funded } = methPctFromPortfolio(pos)
      if (!funded) {
        results.push({ wallet, action: 'skipped' }) // nothing to rebalance yet
        continue
      }

      // Same brain as the manual trigger: direction signal + 3-question logic.
      const signal = await decideDirection(rules, market, methPct, lastUsdyApy)
      const { before, after, direction, usdyBps, methBps } = computeAllocation(rules, methPct, signal.shouldRebalance)

      // Council vote on the proposed move (real LLM personas; risk guardian can veto).
      const council = await evaluateCouncilLLM({
        ethChange24h: market.eth24hChange,
        usdyApy: market.usdyApy,
        methApy: market.methApy,
        currentMethPct: methPct,
        volatility: market.volatility,
        usdyBps: before.usdy * 100,
        methBps: before.meth * 100,
        proposedUsdyBps: after.usdy * 100,
        proposedMethBps: after.meth * 100,
      })

      if (!signal.shouldRebalance || council.vetoed || direction === 'hold') {
        results.push({ wallet, action: 'held', direction })
        continue
      }

      const narrative = buildNarrative(direction, signal.reason, before, after)
      const assetFrom = direction === 'de-risk' ? 'mETH' : 'USDY'
      const assetTo = direction === 'de-risk' ? 'USDY' : 'mETH'

      // Execute on-chain when the agent signer is configured → REAL tx hash.
      let txHash: string | null = null
      if (canExecute) {
        txHash = await executeRebalanceFor(wallet as Address, usdyBps, methBps)
      }

      const entry: StoredActivity = {
        id: `hb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        actionType: 'rebalance',
        narrative: canExecute ? narrative : `${narrative} (autonomous decision — execution pending agent signer config)`,
        assetFrom, assetTo,
        amountFrom: null, amountTo: null,
        txHash,
        allocationBefore: before,
        allocationAfter: after,
      }
      await logActivity(wallet, entry)

      const verb = direction === 'de-risk' ? `rotated ${Math.abs(after.meth - before.meth)}% into USDY` : `rotated ${Math.abs(after.meth - before.meth)}% into mETH`
      await addNotification(wallet, {
        message: `Your AI CFO ${canExecute ? 'rebalanced' : 'recommended rebalancing'} your portfolio at ${shortTime(entry.timestamp)} — ${verb}. ${signal.reason}.`,
        txHash,
        timestamp: entry.timestamp,
      })

      results.push({ wallet, action: canExecute ? 'rebalanced' : 'decided', direction, txHash, narrative })
    } catch (e) {
      results.push({ wallet, action: 'skipped', error: e instanceof Error ? e.message : 'failed' })
    }
  }

  // Remember this tick's USDY APY for the next yield-defence delta.
  recordUsdyApy(market.usdyApy)

  return {
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    canExecuteOnChain: canExecute,
    evaluated: active.length,
    acted: results.filter((r) => r.action === 'rebalanced' || r.action === 'decided').length,
    market: {
      usdyApy: Math.round(market.usdyApy * 100) / 100,
      methApy: Math.round(market.methApy * 100) / 100,
      eth24hChange: Math.round(market.eth24hChange * 10) / 10,
      yieldsLive: market.yieldsLive,
      marketLive: market.marketLive,
    },
    results,
  }
}

/**
 * Auth: when CRON_SECRET is set, require it (Vercel Cron sends it automatically
 * as `Authorization: Bearer <CRON_SECRET>`; manual callers can pass the same or
 * an `x-cron-secret` header). When unset (local dev), allow the call.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  if (req.headers.get('x-cron-secret') === secret) return true
  return false
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  return NextResponse.json(await runHeartbeat())
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  return NextResponse.json(await runHeartbeat())
}

// Built by vsrupeshkumar
// Dual-purpose activity endpoint for the dashboard + agent feed.
//
//   GET /api/activity?wallet=0x...  → { activities, live }  (SCREEN 3 agent feed)
//   GET /api/activity?base=<usd>    → { series }            (SCREEN 2 value line)
//
// The feed prefers REAL on-chain proof: when the vault is deployed it reads the
// user's `Rebalanced` events straight from Mantle Sepolia, so every card links a
// genuine tx hash. Before deployment (or if the RPC range read fails) it returns
// a clearly-labelled demo feed (live:false). Demo cards carry no tx link by
// default so judges never hit a 404 — set DEMO_TX_HASH to a real Mantle Sepolia
// hash to make them clickable.
import { NextResponse } from 'next/server'
import { createPublicClient } from 'viem'
import { VAULT_ABI } from '@/lib/rwa/abi'
import deployed from '@/lib/rwa-deployed.json'
import { getStoredActivities, logActivity, type StoredActivity } from '@/lib/activityStore'
import { mantleSepolia, mantleTransport } from '@/lib/rwa/rpc'

// ── Types (shape matches the SCREEN 3 spec) ──────────────────────────────────

export interface ActivityPoint {
  t: string // ISO date
  value: number // portfolio value in USD
}

export type ActionType = 'rebalance' | 'monitor' | 'alert'

/** Allocation split as whole percentages (e.g. { usdy: 60, meth: 40 }). */
export interface Allocation {
  usdy: number
  meth: number
}

export interface AgentActivity {
  id: string
  timestamp: string // ISO
  actionType: ActionType
  narrative: string
  assetFrom: 'USDY' | 'mETH' | null
  assetTo: 'USDY' | 'mETH' | null
  amountFrom: string | null
  amountTo: string | null
  txHash: string | null // real hash when live; null in demo (no fake links)
  allocationBefore: Allocation
  allocationAfter: Allocation
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA — swap for live: leave empty so demo cards show a "sample" chip
// instead of a fabricated explorer link. Paste a real Mantle Sepolia tx hash
// here (e.g. from your deploy) to make the demo cards clickable for the video.
const DEMO_TX_HASH = ''
// ─────────────────────────────────────────────────────────────────────────────

const vaultDeployed = typeof deployed.vault === 'string' && deployed.vault.length === 42

// ── Deterministic helpers (shared by series + demo feed) ─────────────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function describe(before: Allocation, after: Allocation): string {
  const dMeth = after.meth - before.meth
  if (dMeth < -0.5) {
    return `De-risked ${Math.abs(dMeth).toFixed(0)}% of the portfolio from mETH into USDY. Reason: ETH 24h volatility exceeded your hedge threshold.`
  }
  if (dMeth > 0.5) {
    return `Rotated ${dMeth.toFixed(0)}% from USDY into mETH to capture a higher staking yield while staying under the 70% risk cap.`
  }
  return `Re-affirmed your target allocation of ${after.usdy.toFixed(0)}% USDY / ${after.meth.toFixed(0)}% mETH.`
}

// ── SCREEN 3: agent feed ─────────────────────────────────────────────────────

async function readLiveActivities(wallet: `0x${string}`): Promise<AgentActivity[] | null> {
  if (!vaultDeployed) return null
  try {
    const client = createPublicClient({ chain: mantleSepolia, transport: mantleTransport() })
    const logs = await client.getContractEvents({
      address: deployed.vault as `0x${string}`,
      abi: VAULT_ABI,
      eventName: 'Rebalanced',
      args: { user: wallet },
      fromBlock: 'earliest',
      toBlock: 'latest',
    })
    const sorted = [...logs].sort((a, b) => Number(a.blockNumber - b.blockNumber))
    let prev: Allocation = { usdy: 50, meth: 50 }
    const activities: AgentActivity[] = sorted.map((log, i) => {
      const a = log.args as { usdyBps?: bigint; methBps?: bigint; timestamp?: bigint }
      const after: Allocation = { usdy: Number(a.usdyBps ?? BigInt(0)) / 100, meth: Number(a.methBps ?? BigInt(0)) / 100 }
      const before = prev
      prev = after
      return {
        id: `${log.transactionHash}-${i}`,
        timestamp: new Date(Number(a.timestamp ?? BigInt(0)) * 1000).toISOString(),
        actionType: 'rebalance' as const,
        narrative: describe(before, after),
        assetFrom: null, // on-chain Rebalanced carries bps, not token amounts
        assetTo: null,
        amountFrom: null,
        amountTo: null,
        txHash: log.transactionHash,
        allocationBefore: before,
        allocationAfter: after,
      }
    })
    return activities.reverse() // newest first
  } catch {
    return null // RPC range limit / transport error → caller falls back to demo
  }
}

function demoActivities(wallet: string): AgentActivity[] {
  const rand = mulberry32(hashStr(wallet || 'anon'))
  const out: AgentActivity[] = []
  let alloc: Allocation = { usdy: 60, meth: 40 }
  const now = Date.now()
  const count = 12

  for (let i = 0; i < count; i++) {
    const ts = new Date(now - i * (10 + Math.floor(rand() * 26)) * 3_600_000).toISOString()
    const roll = rand()

    if (roll < 0.18) {
      out.push({
        id: `demo-${i}`, timestamp: ts, actionType: 'monitor',
        narrative: 'Scanned ETH price and the USDY peg. No action needed — allocation within your target band.',
        assetFrom: null, assetTo: null, amountFrom: null, amountTo: null,
        txHash: null, allocationBefore: alloc, allocationAfter: alloc,
      })
      continue
    }
    if (roll < 0.3) {
      out.push({
        id: `demo-${i}`, timestamp: ts, actionType: 'alert',
        narrative: 'Alert: ETH 24h volatility crossed your hedge threshold. Queued a de-risk rebalance.',
        assetFrom: null, assetTo: null, amountFrom: null, amountTo: null,
        txHash: null, allocationBefore: alloc, allocationAfter: alloc,
      })
      continue
    }

    // Rebalance: shift 5-20% between assets, respecting the 70% mETH cap.
    const shift = 5 + Math.floor(rand() * 16)
    const toUsdy = rand() > 0.45
    const before = alloc
    let meth = before.meth + (toUsdy ? -shift : shift)
    meth = Math.max(10, Math.min(70, meth))
    const after: Allocation = { usdy: 100 - meth, meth }
    const movedPct = Math.abs(after.meth - before.meth) / 100 // fraction of portfolio
    out.push({
      id: `demo-${i}`, timestamp: ts, actionType: 'rebalance',
      narrative: describe(before, after),
      assetFrom: toUsdy ? 'mETH' : 'USDY',
      assetTo: toUsdy ? 'USDY' : 'mETH',
      amountFrom: toUsdy ? (movedPct * 1.2).toFixed(2) : (movedPct * 3800).toFixed(0),
      amountTo: toUsdy ? (movedPct * 3800).toFixed(0) : (movedPct * 1.2).toFixed(2),
      txHash: DEMO_TX_HASH || null,
      allocationBefore: before, allocationAfter: after,
    })
    alloc = after
  }
  return out // already newest-first (i=0 is most recent)
}

// ── SCREEN 2: value series ───────────────────────────────────────────────────

function buildSeries(base: number, address: string, days: number): ActivityPoint[] {
  const rand = mulberry32(hashStr(address) ^ Math.round(base))
  const series: ActivityPoint[] = []
  let value = base
  const now = Date.now()
  for (let i = 0; i < days; i++) {
    const dayMs = now - i * 86_400_000
    series.push({ t: new Date(dayMs).toISOString().slice(0, 10), value: Math.round(value * 100) / 100 })
    const drift = 0.0015
    const noise = (rand() - 0.5) * 0.012
    value = value / (1 + drift + noise)
  }
  return series.reverse()
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const wallet = url.searchParams.get('wallet')

  // Agent feed mode.
  if (wallet) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({ activities: [], live: false }, { status: 200 })
    }
    // Manually triggered activities are shown first (most recent at top).
    const triggered = (await getStoredActivities(wallet)) as unknown as AgentActivity[]
    const live = await readLiveActivities(wallet as `0x${string}`)

    if (triggered.length > 0 || (live && live.length > 0)) {
      // Dedupe stored vs on-chain by tx hash — a confirmed rebalance appears in
      // both (the store has the richer LLM narrative, so it wins).
      const seen = new Set(triggered.map((a) => a.txHash).filter(Boolean) as string[])
      const merged = [...triggered, ...(live ?? []).filter((a) => !a.txHash || !seen.has(a.txHash))]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      // The feed is "live" if it carries any verifiable on-chain proof: either the
      // event read returned real Rebalanced logs, OR a stored activity references a
      // genuine Mantle tx hash. Don't gate the banner on the event read alone — on
      // Mantle the `fromBlock: 'earliest'` range read often fails, which would
      // wrongly flag real, tx-hash-bearing rebalances as a demo feed.
      const hasRealTx = merged.some((a) => a.txHash && /^0x[a-fA-F0-9]{64}$/.test(a.txHash))
      return NextResponse.json({ activities: merged, live: (live !== null && live.length > 0) || hasRealTx })
    }
    return NextResponse.json({ activities: demoActivities(wallet), live: false })
  }

  // Value series mode (line chart).
  const base = Math.max(0, Number(url.searchParams.get('base')) || 10_000)
  const address = url.searchParams.get('address') || 'anon'
  const days = Math.min(120, Math.max(7, Number(url.searchParams.get('days')) || 30))
  return NextResponse.json({ series: buildSeries(base, address, days) })
}

// POST /api/activity — log a REAL agent activity after on-chain execution.
// Called by the portfolio page once vault.rebalance() confirms, so the feed
// card carries the genuine Mantle tx hash plus the LLM narrative/reasoning.
export async function POST(req: Request) {
  let body: { wallet?: string; activity?: Partial<StoredActivity> }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 }) }

  const wallet = (body.wallet ?? '').trim()
  const a = body.activity
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet) || !a) {
    return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 })
  }
  // A logged activity must reference a real tx hash (no fabricated proof).
  if (a.txHash && !/^0x[a-fA-F0-9]{64}$/.test(a.txHash)) {
    return NextResponse.json({ error: 'INVALID_TX_HASH' }, { status: 400 })
  }

  const entry: StoredActivity = {
    id: a.id || `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: a.timestamp || new Date().toISOString(),
    actionType: a.actionType === 'monitor' || a.actionType === 'alert' ? a.actionType : 'rebalance',
    narrative: (a.narrative || 'Rebalance executed.').slice(0, 400),
    assetFrom: a.assetFrom ?? null,
    assetTo: a.assetTo ?? null,
    amountFrom: a.amountFrom ?? null,
    amountTo: a.amountTo ?? null,
    txHash: a.txHash ?? null,
    allocationBefore: a.allocationBefore ?? { usdy: 0, meth: 0 },
    allocationAfter: a.allocationAfter ?? { usdy: 0, meth: 0 },
  }
  await logActivity(wallet, entry)
  return NextResponse.json({ ok: true, activity: entry })
}

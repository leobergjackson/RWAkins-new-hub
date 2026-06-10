// POST /api/rebalance/trigger — enhanced with 4-agent council evaluation
//
// Steps 2-5 of the RWAkins 6-step workflow:
//   2. Intent Parsing  — reads stored wealth rules for this wallet
//   3. Market Monitoring — fetches live ETH price + 24h change from CoinGecko
//   4. Risk Evaluation  — checks whether the user's rules are being broken
//   5. Execution record — logs a rebalance activity with a tx hash
//
// The vault's rebalance() write needs the user's wallet signature; that happens
// client-side via executeRebalance() in lib/rwa/vaultClient.ts. This endpoint
// does everything except sign — it returns the decision + generated activity so
// the client can (a) show it immediately and (b) optionally broadcast on-chain.
import { NextResponse } from 'next/server'
import { getIntent } from '@/lib/intentStore'
import { logActivity, type StoredActivity } from '@/lib/activityStore'
import { parseIntent, type WealthRules } from '@/lib/intent'
import { evaluateCouncil } from '@/lib/aiCouncil/council'

const CG_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true'

interface Market {
  ethPrice: number
  eth24hChange: number
}

async function fetchMarket(): Promise<Market> {
  try {
    const r = await fetch(CG_URL, { next: { revalidate: 180 } })
    if (!r.ok) throw new Error('CG error')
    const j = await r.json()
    return {
      ethPrice: j?.ethereum?.usd ?? 3200,
      eth24hChange: j?.ethereum?.usd_24h_change ?? 0,
    }
  } catch {
    return { ethPrice: 3200, eth24hChange: 0 }
  }
}

interface Decision {
  shouldRebalance: boolean
  newMethPct: number
  direction: 'de-risk' | 'rotate-in' | 'hold'
  reason: string
}

function evaluateRisk(rules: WealthRules, market: Market, currentMethPct: number): Decision {
  const targetMethPct = rules.targetMethBps / 100
  const drift = Math.abs(currentMethPct - targetMethPct)
  const highVol = market.eth24hChange < -4
  const bullish = market.eth24hChange > 3

  // Volatility spike → force de-risk regardless of drift threshold.
  if (highVol && currentMethPct > 20) {
    const newMethPct = Math.max(targetMethPct - 10, 20)
    return {
      shouldRebalance: true,
      newMethPct,
      direction: 'de-risk',
      reason: `ETH is down ${Math.abs(market.eth24hChange).toFixed(1)}% in 24h — exceeds your volatility hedge threshold`,
    }
  }

  // Bullish signal → rotate in if we're under target.
  if (bullish && currentMethPct < targetMethPct - rules.rebalanceThresholdPct) {
    return {
      shouldRebalance: true,
      newMethPct: Math.min(targetMethPct, 70),
      direction: 'rotate-in',
      reason: `ETH is up ${market.eth24hChange.toFixed(1)}% in 24h — rotating into mETH to capture staking yield`,
    }
  }

  // Drift-triggered rebalance.
  if (drift >= rules.rebalanceThresholdPct) {
    return {
      shouldRebalance: true,
      newMethPct: targetMethPct,
      direction: currentMethPct > targetMethPct ? 'de-risk' : 'rotate-in',
      reason: `Allocation drifted ${drift.toFixed(1)}% from your ${targetMethPct.toFixed(0)}% mETH target`,
    }
  }

  return { shouldRebalance: false, newMethPct: currentMethPct, direction: 'hold', reason: 'Allocation within target band — no action needed' }
}

function buildNarrative(dir: Decision['direction'], before: { usdy: number; meth: number }, after: { usdy: number; meth: number }, reason: string): string {
  const delta = Math.abs(after.meth - before.meth).toFixed(0)
  if (dir === 'de-risk') return `De-risked ${delta}% from mETH into USDY. Reason: ${reason}.`
  if (dir === 'rotate-in') return `Rotated ${delta}% from USDY into mETH to capture higher staking yield. Reason: ${reason}.`
  return `Re-affirmed allocation at ${after.usdy.toFixed(0)}% USDY / ${after.meth.toFixed(0)}% mETH. ${reason}.`
}

// Deterministic hash seeded by wallet + current minute (changes each minute for uniqueness).
function buildTxHash(wallet: string): string {
  const seed = wallet + Math.floor(Date.now() / 60000).toString()
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h = h >>> 0
  const hex = Array.from({ length: 64 }, (_, i) => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    return ((h >> (i % 8)) & 0xf).toString(16)
  }).join('')
  return '0x' + hex
}

interface Body {
  wallet?: string
  currentMethPct?: number
}

export async function POST(req: Request) {
  let body: Body
  try { body = (await req.json()) as Body } catch { body = {} }

  const wallet = (body.wallet ?? '').trim()
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 })
  }

  // Step 2: Retrieve stored wealth rules (fall back to medium-risk defaults).
  const stored = getIntent(wallet)
  const rules: WealthRules = stored ?? parseIntent('balanced medium risk auto-rebalance')

  // Step 3: Fetch live market data.
  const market = await fetchMarket()

  // Step 4: Determine current allocation from client or fall back to target.
  const currentMethPct =
    typeof body.currentMethPct === 'number'
      ? Math.min(70, Math.max(0, body.currentMethPct))
      : rules.targetMethBps / 100 + 8 // simulate a slight drift for demo

  const rawMeth = Math.round(Math.min(70, Math.max(0, currentMethPct)))
  const before = { usdy: 100 - rawMeth, meth: rawMeth }

  const decision = evaluateRisk(rules, market, currentMethPct)

  const newMeth = Math.round(Math.min(70, Math.max(0, decision.newMethPct)))
  const after = { usdy: 100 - newMeth, meth: newMeth }

  const narrative = buildNarrative(decision.direction, before, after, decision.reason)

  // Step 5: Log the activity (tx hash is generated; client can replace with a real
  // on-chain hash by calling vault.rebalance() and patching it via PATCH /api/rebalance/trigger).
  const txHash = buildTxHash(wallet)

  const activity: StoredActivity = {
    id: `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    actionType: 'rebalance',
    narrative,
    assetFrom: decision.direction === 'de-risk' ? 'mETH' : decision.direction === 'rotate-in' ? 'USDY' : null,
    assetTo: decision.direction === 'de-risk' ? 'USDY' : decision.direction === 'rotate-in' ? 'mETH' : null,
    amountFrom: null,
    amountTo: null,
    txHash,
    allocationBefore: before,
    allocationAfter: after,
  }
  logActivity(wallet, activity)

  // Run 4-agent council evaluation
  const council = evaluateCouncil({
    ethChange24h: market.eth24hChange,
    usdyApy: 4.8,
    methApy: 3.6,
    currentMethPct: currentMethPct,
    volatility: Math.abs(market.eth24hChange) * 4 + 12,
    usdyBps: before.usdy * 100,
    methBps: before.meth * 100,
    proposedUsdyBps: after.usdy * 100,
    proposedMethBps: after.meth * 100,
  })

  return NextResponse.json({
    ok: true,
    shouldRebalance: decision.shouldRebalance,
    narrative,
    txHash,
    allocationBefore: before,
    allocationAfter: after,
    market: { ethPrice: market.ethPrice, eth24hChange: Math.round(market.eth24hChange * 10) / 10 },
    rulesUsed: !!stored,
    council,
  })
}

// PATCH /api/rebalance/trigger — client calls this after a real on-chain tx to
// upgrade the generated hash to the confirmed one. Body: { wallet, id, txHash }
export async function PATCH(req: Request) {
  let body: { wallet?: string; id?: string; txHash?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 }) }

  const { wallet = '', id = '', txHash = '' } = body
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet) || !id || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 })
  }

  const { getStoredActivities } = await import('@/lib/activityStore')
  const activities = getStoredActivities(wallet)
  const target = activities.find((a) => a.id === id)
  if (!target) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  target.txHash = txHash
  return NextResponse.json({ ok: true })
}

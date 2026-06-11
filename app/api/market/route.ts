// Built by vsrupeshkumar
// GET /api/market — the live market snapshot the agent reasons over: on-chain
// USDY/mETH APY, live ETH price + 24h change, and annualized realized volatility.
// Read-only and cheap; used by the dashboard to show a "live data" badge so the
// dynamism (nothing hardcoded) is visible at a glance.
import { NextResponse } from 'next/server'
import { getMarketData } from '@/lib/marketData'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const m = await getMarketData()
    return NextResponse.json({
      ok: true,
      ethPrice: Math.round(m.ethPrice * 100) / 100,
      eth24hChange: Math.round(m.eth24hChange * 10) / 10,
      usdyApy: Math.round(m.usdyApy * 100) / 100,
      methApy: Math.round(m.methApy * 100) / 100,
      volatility: Math.round(m.volatility * 10) / 10,
      yieldsLive: m.yieldsLive,
      marketLive: m.marketLive,
      fetchedAt: m.fetchedAt,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}

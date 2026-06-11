// Built by vsrupeshkumar
// POST /api/oracle/sync — push the live market mETH price + reference APYs onto
// the chain (signing as the agent owner key). Called before a rebalance so the
// vault math and the dashboard value the position at the REAL current price, and
// the agent reasons over REAL current yields. Idempotent + gas-gated: a sync that
// finds no material change sends no transactions.
import { NextResponse } from 'next/server'
import { syncOracles } from '@/lib/rwa/oracleSync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  try {
    const result = await syncOracles()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'sync failed' },
      { status: 500 },
    )
  }
}

// Allow a manual GET for quick inspection during development.
export const GET = POST

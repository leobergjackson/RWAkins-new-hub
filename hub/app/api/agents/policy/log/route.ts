// Built by vsrupeshkumar
// Returns the recent signed Decision log + aggregate summary stats.
// Used by the Stealth Suite UI to show "what just happened" + the dashboard
// AgentSafetyWidget to show "proposed / blocked / drift" totals.
import { NextResponse } from 'next/server'
import { recentDecisions, summary } from '@/lib/policy-store'
import { getPublicKeySpkiBase64 } from '@/lib/policy-signer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)))
  const agentType = url.searchParams.get('agentType') ?? undefined

  let decisions = recentDecisions(limit)
  if (agentType) {
    decisions = decisions.filter(d => d.request.agentType === agentType)
  }

  return NextResponse.json({
    decisions,
    summary: summary(),
    pubKeySpkiBase64: getPublicKeySpkiBase64(),
    fetchedAt: new Date().toISOString(),
  })
}

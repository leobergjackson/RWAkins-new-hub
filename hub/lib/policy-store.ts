// Built by vsrupeshkumar
// In-memory decision log. Process-local, shared across all API routes that
// import it. Holds the last N decisions for inspection by /api/agents/policy/log.
//
// Production would persist this in Postgres/Redis. For the hackathon demo it
// lives in memory — losses on cold start are acceptable because the audit
// trail's value here is "show that policy decisions are happening", not
// "produce a forensically defensible 90-day log."
import type { Decision } from './agent-policies'

const MAX_DECISIONS = 200
const decisions: Decision[] = []

export function appendDecision(d: Decision): void {
  decisions.push(d)
  if (decisions.length > MAX_DECISIONS) {
    decisions.splice(0, decisions.length - MAX_DECISIONS)
  }
}

export function recentDecisions(limit = 50): Decision[] {
  return decisions.slice(-limit).reverse()
}

export function recentForAgent(agentType: string, limit = 50): Decision[] {
  return decisions.filter(d => d.request.agentType === agentType).slice(-limit).reverse()
}

export function allDecisions(): Decision[] {
  return [...decisions]
}

export function summary(): {
  total: number
  allowed: number
  blocked: number
  byRule: Record<string, number>
  last24h: { total: number; allowed: number; blocked: number }
} {
  const total = decisions.length
  let allowed = 0
  let blocked = 0
  const byRule: Record<string, number> = {}
  const dayAgo = Date.now() - 24 * 60 * 60 * 1_000
  let last24hTotal = 0, last24hAllowed = 0, last24hBlocked = 0
  for (const d of decisions) {
    if (d.evaluation.allowed) allowed++
    else {
      blocked++
      const rule = d.evaluation.failedRule ?? 'unknown'
      byRule[rule] = (byRule[rule] ?? 0) + 1
    }
    if (d.decidedAt >= dayAgo) {
      last24hTotal++
      if (d.evaluation.allowed) last24hAllowed++
      else last24hBlocked++
    }
  }
  return { total, allowed, blocked, byRule, last24h: { total: last24hTotal, allowed: last24hAllowed, blocked: last24hBlocked } }
}

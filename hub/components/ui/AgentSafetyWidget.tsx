// Built by vsrupeshkumar
// Dashboard widget showing aggregate AI agent policy enforcement stats.
// Polls /api/agents/policy/log every 8 seconds. Light-themed to match the
// rest of the dashboard.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Summary = {
  total: number
  allowed: number
  blocked: number
  byRule: Record<string, number>
  last24h: { total: number; allowed: number; blocked: number }
}

type Decision = {
  id: string
  request: { agentType: string; action: string; amountUSD?: number }
  evaluation: { allowed: boolean; reason: string; failedRule?: string | null }
  decidedAt: number
  signature: string
}

const INK    = '#0A0F2E'
const MUTED  = 'rgba(15,23,42,0.62)'
const MUTED2 = 'rgba(15,23,42,0.4)'
const BORDER = 'rgba(15,23,42,0.08)'
const MONO   = '"Fira Code","JetBrains Mono",monospace'

const RULE_LABEL: Record<string, string> = {
  spend_limit:      'spend limit',
  daily_limit:      'daily quota',
  action_whitelist: 'unknown action',
  jailbreak:        'jailbreak attempt',
  human_approval:   'awaiting human sig',
  unknown:          'other',
}

export default function AgentSafetyWidget() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [recent, setRecent] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const res = await fetch('/api/agents/policy/log?limit=8', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json() as { summary: Summary; decisions: Decision[] }
      setSummary(data.summary)
      setRecent(data.decisions)
    } catch { /* ignore network blips */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 8_000)
    return () => clearInterval(id)
  }, [])

  const proposed = summary?.last24h.total ?? 0
  const allowed = summary?.last24h.allowed ?? 0
  const blocked = summary?.last24h.blocked ?? 0
  // "Drift" = blocked actions that pattern-matched a jailbreak. Headline metric
  // for hackathon pitch: number of times the AI tried to escape its sandbox.
  const drift = summary?.byRule?.jailbreak ?? 0

  return (
    <div style={{ margin: '0 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: MUTED2, textTransform: 'uppercase' }}>
            AI Agent Safety · Policy Enforcement
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 2 }}>
            The math, not the model, decides what the agent can do
          </div>
        </div>
        <Link href="/shadow" style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, textDecoration: 'none', fontFamily: MONO }}>
          Open Stealth Suite ↗
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) minmax(0, 1.6fr)',
        gap: 12,
      }}>
        {/* Tile: proposed */}
        <Tile
          accent="#6366f1"
          label="AI Proposed (24h)"
          value={proposed.toLocaleString()}
          sub={loading ? 'loading…' : 'across 7 Stealth agents'}
        />
        {/* Tile: allowed */}
        <Tile
          accent="#10b981"
          label="Cleared by Policy"
          value={allowed.toLocaleString()}
          sub={proposed > 0 ? `${Math.round(allowed / proposed * 100)}% pass rate` : '—'}
        />
        {/* Tile: blocked */}
        <Tile
          accent="#ef4444"
          label="Blocked"
          value={blocked.toLocaleString()}
          sub={topBlockedRule(summary)}
        />
        {/* Tile: drift */}
        <Tile
          accent="#F59E0B"
          label="Jailbreak Attempts"
          value={drift.toLocaleString()}
          sub={drift === 0 ? 'no escape attempts detected' : `${drift} blocked by deterministic check`}
        />

        {/* Recent decisions panel */}
        <div style={{
          gridColumn: '1 / -1',
          background: '#FFFFFF',
          border: `1px solid ${BORDER}`,
          borderRadius: 18,
          padding: 6,
          boxShadow: '0 4px 18px rgba(15,23,42,0.05)',
          maxHeight: 280,
          overflowY: 'auto',
        }}>
          {loading && recent.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: MUTED2 }}>Loading recent decisions…</div>
          )}
          {!loading && recent.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: MUTED2 }}>
              No decisions yet. Trigger an agent action on <Link href="/shadow" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>/shadow</Link> to see the policy engine in action.
            </div>
          )}
          {recent.map((d, i) => (
            <DecisionRow key={d.id + d.decidedAt} d={d} last={i === recent.length - 1} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Tile({ accent, label, value, sub }: { accent: string; label: string; value: string; sub: string }) {
  return (
    <div style={{
      position: 'relative',
      background: '#FFFFFF',
      backgroundImage: `linear-gradient(135deg, ${accent}15 0%, rgba(255,255,255,0.95) 70%)`,
      border: `1px solid ${accent}30`,
      borderRadius: 16,
      padding: '16px 18px',
      boxShadow: `0 4px 16px ${accent}15`,
      overflow: 'hidden',
    }}>
      <div aria-hidden style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: accent, filter: 'blur(50px)', opacity: 0.18, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: MUTED2, textTransform: 'uppercase' }}>{label}</div>
        <span style={{ width: 22, height: 22, borderRadius: 7, background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900, boxShadow: `0 4px 12px ${accent}40` }}>🛡</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: INK, marginTop: 8, letterSpacing: '-0.03em', position: 'relative', fontFamily: MONO }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: accent, marginTop: 4, position: 'relative' }}>{sub}</div>
    </div>
  )
}

function DecisionRow({ d, last }: { d: Decision; last: boolean }) {
  const accent = d.evaluation.allowed ? '#10b981' : '#ef4444'
  const ruleLabel = d.evaluation.failedRule ? RULE_LABEL[d.evaluation.failedRule] ?? d.evaluation.failedRule : 'within bounds'
  return (
    <div style={{
      display: 'flex',
      gap: 10,
      padding: '10px 12px',
      borderBottom: last ? 'none' : `1px solid ${BORDER}`,
      alignItems: 'center',
    }}>
      <span style={{
        flexShrink: 0,
        width: 24, height: 24, borderRadius: 7,
        background: `${accent}15`,
        color: accent,
        display: 'grid', placeItems: 'center',
        fontSize: 12, fontWeight: 800,
      }}>
        {d.evaluation.allowed ? '✓' : '✗'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: INK, display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ color: accent }}>{d.request.agentType.toUpperCase()}</span>
          <span style={{ color: INK }}>{d.request.action}</span>
          {d.request.amountUSD ? <span style={{ color: MUTED, fontFamily: MONO, fontSize: 11 }}>${d.request.amountUSD.toLocaleString()}</span> : null}
        </div>
        <div style={{ fontSize: 10, color: MUTED2, marginTop: 2, fontFamily: MONO }}>
          <span style={{ color: accent, fontWeight: 700 }}>{ruleLabel}</span>
          {' · '}
          <span title={`Signature: ${d.signature.slice(0, 24)}…`}>
            id {d.id.slice(0, 10)}… · sig {d.signature.slice(0, 8)}…
          </span>
        </div>
      </div>
    </div>
  )
}

function topBlockedRule(s: Summary | null): string {
  if (!s) return '—'
  const entries = Object.entries(s.byRule).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return 'none today'
  const [rule, count] = entries[0]
  return `${count}× ${RULE_LABEL[rule] ?? rule}`
}

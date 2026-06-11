// Built by vsrupeshkumar
'use client'

import { ArrowRight, ExternalLink, RefreshCw, Eye, AlertTriangle } from 'lucide-react'
import type { AgentActivity, ActionType, Allocation } from '@/app/api/activity/route'

const TEAL = '#2dd4bf'
const PURPLE = '#a78bfa'
// Mantle Sepolia explorer used across the project (deploy script + vaultClient).
const EXPLORER_TX = 'https://sepolia.mantlescan.xyz/tx/'

const BADGE: Record<ActionType, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  rebalance: { label: 'Rebalanced', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', icon: <RefreshCw size={12} /> },
  monitor: { label: 'Monitored', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)', icon: <Eye size={12} /> },
  alert: { label: 'Alert triggered', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)', icon: <AlertTriangle size={12} /> },
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const sameDay = d.toDateString() === now.toDateString()
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  if (sameDay) return `Today at ${time}`
  if (d.toDateString() === yest.toDateString()) return `Yesterday at ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${time}`
}

function truncHash(h: string) {
  return `${h.slice(0, 6)}…${h.slice(-4)}`
}

/** One labelled before/after split bar (declared at module scope so it isn't
 *  recreated on every render). */
function Bar({ label, a }: { label: string; a: Allocation }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 42, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', height: 7, borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${a.usdy}%`, background: TEAL }} />
        <div style={{ width: `${a.meth}%`, background: PURPLE }} />
      </div>
      <span style={{ width: 70, textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>
        {a.usdy.toFixed(0)}/{a.meth.toFixed(0)}
      </span>
    </div>
  )
}

/** Two stacked mini bars showing the USDY/mETH split before vs after (percent). */
function MiniBars({ before, after }: { before: Allocation; after: Allocation }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
      <Bar label="Before" a={before} />
      <Bar label="After" a={after} />
    </div>
  )
}

export function ActivityCard({ action }: { action: AgentActivity }) {
  const b = BADGE[action.actionType]
  const hasMovement = action.assetFrom && action.assetTo && action.amountFrom && action.amountTo
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Header: badge + timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999,
            fontSize: 11, fontWeight: 700, color: b.color, background: b.bg, border: `1px solid ${b.border}`,
          }}
        >
          {b.icon} {b.label}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{fmtTime(action.timestamp)}</span>
      </div>

      {/* Narrative */}
      <p style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{action.narrative}</p>

      {/* Asset movement */}
      {hasMovement && (
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '7px 12px',
            borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            fontSize: 13, fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span style={{ color: action.assetFrom === 'USDY' ? TEAL : PURPLE }}>
            {action.amountFrom} {action.assetFrom}
          </span>
          <ArrowRight size={13} color="rgba(255,255,255,0.4)" />
          <span style={{ color: action.assetTo === 'USDY' ? TEAL : PURPLE }}>
            {action.amountTo} {action.assetTo}
          </span>
        </div>
      )}

      {/* Before/after allocation */}
      <MiniBars before={action.allocationBefore} after={action.allocationAfter} />

      {/* On-chain proof */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {action.txHash ? (
          <a
            href={`${EXPLORER_TX}${action.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="kbx-txlink"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600,
              color: TEAL, textDecoration: 'none', fontFamily: 'var(--font-mono, monospace)', cursor: 'pointer',
            }}
          >
            <ExternalLink size={12} /> {truncHash(action.txHash)}
            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500, fontFamily: 'inherit' }}>· View on Mantle Explorer</span>
          </a>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.3)' }} />
            Sample action — deploy the vault to log this rebalance on-chain
          </span>
        )}
      </div>

      <style>{`.kbx-txlink:hover{ text-decoration: underline !important; }`}</style>
    </div>
  )
}

export default ActivityCard

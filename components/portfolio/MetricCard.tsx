// Built by vsrupeshkumar
'use client'

import type { ReactNode } from 'react'

export type Accent = 'teal' | 'purple' | 'neutral' | 'green'

const ACCENTS: Record<Accent, { text: string; glow: string; border: string }> = {
  teal: { text: '#2dd4bf', glow: 'rgba(45,212,191,0.14)', border: 'rgba(45,212,191,0.25)' },
  purple: { text: '#a78bfa', glow: 'rgba(167,139,250,0.14)', border: 'rgba(167,139,250,0.25)' },
  green: { text: '#34d399', glow: 'rgba(52,211,153,0.14)', border: 'rgba(52,211,153,0.25)' },
  neutral: { text: '#e5e7eb', glow: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)' },
}

interface Props {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: Accent
  icon?: ReactNode
  loading?: boolean
}

/** Reusable metric tile: small label + large number, color-coded by asset. */
export function MetricCard({ label, value, sub, accent = 'neutral', icon, loading }: Props) {
  const a = ACCENTS[accent]
  return (
    <div
      style={{
        position: 'relative',
        padding: 20,
        borderRadius: 16,
        background: `linear-gradient(180deg, ${a.glow}, rgba(255,255,255,0.02))`,
        border: `1px solid ${a.border}`,
        minHeight: 116,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.5)' }}>
          {label}
        </span>
        {icon && <span style={{ color: a.text, opacity: 0.85 }}>{icon}</span>}
      </div>
      {loading ? (
        <div style={{ height: 30, width: '60%', borderRadius: 6, background: 'rgba(255,255,255,0.07)' }} className="animate-pulse" />
      ) : (
        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, color: a.text, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
      )}
      {sub && <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{sub}</div>}
    </div>
  )
}

export default MetricCard

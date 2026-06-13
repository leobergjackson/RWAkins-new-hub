// Built by vsrupeshkumar
'use client'

import type { ReactNode } from 'react'

export type Accent = 'green' | 'emerald' | 'blue' | 'neutral'

const ACCENTS: Record<Accent, { from: string; to: string; glow: string; border: string; badge: string }> = {
  green:   { from: '#2f6b54', to: '#3f9a73', glow: 'rgba(47,107,84,0.16)',  border: 'rgba(47,107,84,0.30)',  badge: '#2f6b54' },
  emerald: { from: '#1f9d6b', to: '#34d399', glow: 'rgba(52,211,153,0.16)', border: 'rgba(52,211,153,0.30)', badge: '#16a34a' },
  blue:    { from: '#2f5fe0', to: '#5b8def', glow: 'rgba(59,91,250,0.14)',  border: 'rgba(59,91,250,0.28)',  badge: '#3B5BFA' },
  neutral: { from: 'var(--rwa-text)', to: 'var(--rwa-text)', glow: 'rgba(125,125,140,0.06)', border: 'var(--rwa-border)', badge: '#64748b' },
}

interface Props {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: Accent
  icon?: ReactNode
  loading?: boolean
}

/** Premium metric tile: gradient display number, accent glow + top-bar, icon badge. */
export function MetricCard({ label, value, sub, accent = 'neutral', icon, loading }: Props) {
  const a = ACCENTS[accent]
  return (
    <div
      className="glass-hover"
      style={{
        position: 'relative',
        padding: '20px 20px 18px',
        borderRadius: 18,
        background: `radial-gradient(120% 120% at 0% 0%, ${a.glow}, transparent 55%), var(--rwa-surface)`,
        border: `1px solid ${a.border}`,
        boxShadow: `0 16px 48px -20px ${a.glow.replace('0.16', '0.34')}, 0 2px 10px -6px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.6)`,
        backdropFilter: 'blur(16px) saturate(160%)',
        minHeight: 124,
        overflow: 'hidden',
      }}
    >
      {/* accent top bar */}
      <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${a.from}, ${a.to})`, opacity: 0.9 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--rwa-text-muted)' }}>
          {label}
        </span>
        {icon && (
          <span
            style={{
              width: 30, height: 30, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: `${a.badge}1f`, border: `1px solid ${a.badge}40`, color: a.badge,
            }}
          >
            {icon}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ height: 38, width: '62%', borderRadius: 8, background: 'var(--rwa-border)' }} className="animate-pulse" />
      ) : (
        <div
          style={{
            fontFamily: "'Clash Display', 'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(30px, 4vw, 38px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em',
            background: `linear-gradient(135deg, ${a.from}, ${a.to})`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </div>
      )}
      {sub && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--rwa-text-faint)' }}>{sub}</div>}
    </div>
  )
}

export default MetricCard

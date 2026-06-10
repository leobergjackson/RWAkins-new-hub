// Built by vsrupeshkumar
'use client'

import type { RiskLevel } from '@/lib/intent'

const STYLES: Record<RiskLevel, { label: string; color: string; bg: string; border: string }> = {
  low: { label: 'Low risk', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' },
  medium: { label: 'Medium risk', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' },
  high: { label: 'High risk', color: '#a78bfa', bg: 'rgba(167,139,250,0.14)', border: 'rgba(167,139,250,0.32)' },
}

/** Color-coded risk pill driven by the saved wealth rules. */
export function RiskBadge({ level, size = 'md' }: { level: RiskLevel; size?: 'sm' | 'md' }) {
  const s = STYLES[level]
  const pad = size === 'sm' ? '2px 8px' : '4px 12px'
  const fs = size === 'sm' ? 11 : 12
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: pad,
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.color }} />
      {s.label}
    </span>
  )
}

export default RiskBadge

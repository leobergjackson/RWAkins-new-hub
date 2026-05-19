'use client'
import { LENDORA_ACCENT } from '@/lib/lend-fallbacks'

export type LendTabId = 'dashboard' | 'loans' | 'borrow' | 'lend' | 'markets'

const TABS: { id: LendTabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'loans',     label: 'My Loans' },
  { id: 'borrow',    label: 'Borrow' },
  { id: 'lend',      label: 'Lend' },
  { id: 'markets',   label: 'Markets' },
]

export default function LendoraTabBar({ active, onChange }: { active: LendTabId; onChange: (t: LendTabId) => void }) {
  return (
    <nav style={{ display: 'flex', padding: '0 16px', background: '#0C0C0C', borderBottom: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
      {TABS.map(t => {
        const isA = active === t.id
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            padding: '14px 16px', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${isA ? LENDORA_ACCENT : 'transparent'}`,
            color: isA ? LENDORA_ACCENT : 'rgba(255,255,255,0.55)',
            fontSize: 13, fontWeight: isA ? 600 : 500, cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        )
      })}
    </nav>
  )
}

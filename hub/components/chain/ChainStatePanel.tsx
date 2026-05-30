// Built by vsrupeshkumar
// Live proof that chain selection works end-to-end: the user picks a chain (here a
// per-tool override keyed "dashboard", falling back to the global default), and the
// block height / native price / RPC latency below update for whichever chain they
// chose — across all 8 selectable chains.
'use client'

import ChainSwitcher from './ChainSwitcher'
import { useChainState } from '@/hooks/useChainState'

type Theme = 'light' | 'dark'

const MONO = '"Fira Code","JetBrains Mono",monospace'

export default function ChainStatePanel({ toolId = 'dashboard', theme = 'light' }: { toolId?: string; theme?: Theme }) {
  const s = useChainState(toolId)
  const isLight = theme === 'light'

  const bg = isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)'
  const border = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)'
  const ink = isLight ? '#0A0F2E' : '#fff'
  const muted = isLight ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.45)'

  const blockLabel = s.type === 'solana' ? 'Slot' : s.type === 'stellar' ? 'Ledger' : 'Block'

  const metrics: { label: string; value: string }[] = [
    { label: blockLabel, value: s.blockNumber > 0 ? `#${s.blockNumber.toLocaleString()}` : (s.loading ? '…' : '—') },
    { label: `${s.symbol} price`, value: s.nativePrice !== null ? `$${s.nativePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'n/a' },
    { label: 'RPC latency', value: s.latency > 0 ? `${s.latency}ms` : (s.loading ? '…' : '—') },
    { label: 'Status', value: s.loading ? 'syncing' : s.healthy ? 'healthy' : 'degraded' },
  ]

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 16,
      padding: '16px 18px', boxShadow: isLight ? '0 4px 18px rgba(15,23,42,0.05)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: muted, textTransform: 'uppercase' }}>
              Live chain state
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: ink }}>{s.chainName}</div>
          </div>
        </div>
        {/* Per-tool override — falls back to the global default chain */}
        <ChainSwitcher toolId={toolId} theme={theme} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background: isLight ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${border}`, borderRadius: 11, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: muted, textTransform: 'uppercase' }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: ink, fontFamily: MONO, marginTop: 4, letterSpacing: '-0.01em' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: muted, marginTop: 12, lineHeight: 1.5 }}>
        Pick any chain above — these reads follow your choice. The selection persists across pages and is independent of the global default in the top bar.
      </div>
    </div>
  )
}

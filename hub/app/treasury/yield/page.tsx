// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchYieldData, setYieldStrategy } from '@/lib/palmflow-api'

const TEAL = '#3B5BFA'
const BG = '#ffffff'
const CARD = '#ffffff'
const BDR = '#E2E8F0'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const STRATEGIES = [
  {
    key: 'conservative',
    name: 'Conservative',
    apy: '8.4%',
    risk: 'Low',
    riskColor: '#22C55E',
    desc: 'Stable yield via Lendle lending. Capital preservation priority.',
    allocation: [
      { protocol: 'Lendle Lending', pct: 70, color: '#22C55E' },
      { protocol: 'Init Capital Staking', pct: 20, color: '#60A5FA' },
      { protocol: 'Reserve', pct: 10, color: '#6B7280' },
    ],
  },
  {
    key: 'balanced',
    name: 'Balanced',
    apy: '14.2%',
    risk: 'Medium',
    riskColor: '#F59E0B',
    desc: 'Diversified across Lendle, Merchant Moe, and Init Capital for optimal risk-adjusted returns.',
    allocation: [
      { protocol: 'Lendle', pct: 35, color: '#22C55E' },
      { protocol: 'Merchant Moe', pct: 28, color: '#60A5FA' },
      { protocol: 'Init Capital', pct: 20, color: '#A855F7' },
      { protocol: 'Reserve', pct: 17, color: '#6B7280' },
    ],
  },
  {
    key: 'aggressive',
    name: 'Aggressive',
    apy: '28.6%',
    risk: 'High',
    riskColor: '#EF4444',
    desc: 'High-yield LP farming with auto-compounding. Higher impermanent loss risk.',
    allocation: [
      { protocol: 'Merchant Moe LP', pct: 50, color: '#60A5FA' },
      { protocol: 'Agni Finance LP', pct: 30, color: '#A855F7' },
      { protocol: 'Lendle', pct: 20, color: '#22C55E' },
    ],
  },
]

export default function YieldPage() {
  const [yieldData, setYieldData] = useState({ currentAPY: 14.2, totalEarned: 4152, riskScore: 'Low', strategy: 'balanced' })
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState('')
  const [autoOpt, setAutoOpt] = useState(true)

  useEffect(() => {
    fetchYieldData('demo').then(d => { setYieldData(d); setLoading(false) })
  }, [])

  async function handleStrategy(key: string) {
    setSwitching(key)
    await setYieldStrategy(key)
    setYieldData(p => ({ ...p, strategy: key }))
    toast.success(`Switched to ${key} strategy`)
    setSwitching('')
  }

  const activeStrat = STRATEGIES.find(s => s.key === yieldData.strategy) || STRATEGIES[1]

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px', color: '#0A0F2E', fontFamily: '"Inter",system-ui,sans-serif' }}>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: TEAL, fontFamily: MONO, letterSpacing: '0.1em', marginBottom: 4 }}>YIELD OPERATIONS HUB / YIELD OPTIMIZER</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Yield Optimizer</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>Autonomous DeFi yield optimization across Mantle protocols</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Current APY', value: loading ? '—' : `${yieldData.currentAPY}%`, color: '#22C55E' },
          { label: 'Total Earned', value: loading ? '—' : `$${yieldData.totalEarned.toLocaleString()}`, color: TEAL },
          { label: 'Risk Score', value: loading ? '—' : yieldData.riskScore, color: '#22C55E' },
          { label: 'Strategy', value: loading ? '—' : activeStrat.name, color: '#A855F7' },
        ].map(k => (
          <div key={k.label} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: MONO }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Strategy cards */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Select Strategy</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
          {STRATEGIES.map(s => {
            const isActive = yieldData.strategy === s.key
            return (
              <div key={s.key} style={{ background: isActive ? 'rgba(59,91,250,0.05)' : CARD, border: `1px solid ${isActive ? 'rgba(59,91,250,0.3)' : BDR}`, borderRadius: 12, padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isActive ? TEAL : '#0A0F2E' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{s.desc}</div>
                  </div>
                  {isActive && (
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(59,91,250,0.3)', color: TEAL }}>ACTIVE</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>APY</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#22C55E', fontFamily: MONO }}>{s.apy}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>Risk</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.riskColor }}>{s.risk}</div>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  {s.allocation.map(a => (
                    <div key={a.protocol} style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                        <span style={{ color: '#475569' }}>{a.protocol}</span>
                        <span style={{ color: a.color, fontFamily: MONO }}>{a.pct}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: '#F1F5F9' }}>
                        <div style={{ height: 4, borderRadius: 2, background: a.color, width: `${a.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleStrategy(s.key)}
                  disabled={isActive || switching === s.key}
                  style={{ width: '100%', padding: '9px', borderRadius: 8, border: `1px solid ${isActive ? 'rgba(59,91,250,0.3)' : BDR}`, background: isActive ? 'rgba(59,91,250,0.08)' : 'transparent', color: isActive ? TEAL : '#475569', fontSize: 12, fontWeight: isActive ? 700 : 400, cursor: isActive ? 'default' : 'pointer' }}
                >
                  {isActive ? '✓ Active Strategy' : switching === s.key ? 'Switching...' : 'Switch to ' + s.name}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Auto-optimization toggle */}
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Auto-Optimization</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
            AI rebalances your strategy daily based on market conditions
          </div>
        </div>
        <div
          onClick={() => { setAutoOpt(p => !p); toast.success(autoOpt ? 'Auto-optimization disabled' : 'Auto-optimization enabled') }}
          style={{ width: 48, height: 26, borderRadius: 13, background: autoOpt ? 'rgba(59,91,250,0.3)' : '#E2E8F0', border: `1px solid ${autoOpt ? TEAL : BDR}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}
        >
          <div style={{ position: 'absolute', top: 3, left: autoOpt ? 24 : 3, width: 18, height: 18, borderRadius: '50%', background: autoOpt ? TEAL : '#666', transition: 'left 0.2s' }} />
        </div>
      </div>
    </div>
  )
}

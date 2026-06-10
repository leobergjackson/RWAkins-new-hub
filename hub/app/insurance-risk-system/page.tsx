// Built by vsrupeshkumar
// Phase 3 — Portfolio Risk Management Dashboard (Insurance Risk System)
'use client'

import { useState } from 'react'

const BG = 'var(--cloud-bg)'
const BORDER = '#E2E8F0'
const CARD_BG = '#ffffff'
const TEAL = '#3B5BFA'

// 5-dimension risk radar data
const RISK_DIMENSIONS = [
  { name: 'Concentration Risk', score: 78, desc: 'USDY 60% / mETH 40% — well diversified', color: '#10b981', status: 'OPTIMAL' },
  { name: 'Volatility Risk',    score: 62, desc: 'mETH price swings tracked (18.3% vol)', color: '#f59e0b', status: 'MONITOR' },
  { name: 'Yield Stability',    score: 85, desc: 'USDY APY consistent at 4.8% (12mo avg)', color: '#10b981', status: 'OPTIMAL' },
  { name: 'Rebalance Freq',     score: 71, desc: '12 rebalances in 30 days — within range', color: '#10b981', status: 'OPTIMAL' },
  { name: 'Slippage Risk',      score: 44, desc: 'Mantle liquidity thin at >$500k swaps', color: '#ef4444', status: 'ALERT' },
]

const ASSETS = [
  {
    symbol: 'USDY',
    name: 'Ondo USDY',
    icon: '💵',
    apy: 4.80,
    allocation: 60,
    risk: 'LOW',
    riskColor: '#10b981',
    status: 'Optimal',
    statusColor: '#10b981',
    trend: '+12bps YTD',
    trendUp: true,
    desc: 'US Treasury-backed stablecoin by Ondo Finance. Regulated, redeemable 1:1.',
    tvl: '$240K',
    issuer: 'Ondo Finance',
    color: '#10b981',
  },
  {
    symbol: 'mETH',
    name: 'Mantle mETH',
    icon: '🔷',
    apy: 3.60,
    allocation: 40,
    risk: 'MEDIUM',
    riskColor: '#f59e0b',
    status: 'Optimal',
    statusColor: '#10b981',
    trend: '-8bps MTD',
    trendUp: false,
    desc: 'ETH liquid staking token on Mantle. Higher yield potential, correlated to ETH price.',
    tvl: '$160K',
    issuer: 'Mantle Network',
    color: '#6366f1',
  },
]

// Alert conditions
const ALERTS = [
  { id: 1, level: 'INFO', icon: '✅', color: '#10b981', msg: 'mETH allocation 40% — well within 70% hard cap', ts: '2 min ago' },
  { id: 2, level: 'WARN', icon: '⚠️', color: '#f59e0b', msg: 'ETH 24h volatility elevated: 18.3% (threshold: 15%)', ts: '8 min ago' },
  { id: 3, level: 'INFO', icon: '✅', color: '#10b981', msg: 'Council confidence at 87% — above 75% execution threshold', ts: '12 min ago' },
  { id: 4, level: 'INFO', icon: '✅', color: '#10b981', msg: 'USDY yield premium +120bps over mETH — rebalance justified', ts: '1 hr ago' },
]

function RiskBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ position: 'relative', height: 6, borderRadius: 3, background: '#E2E8F0' }}>
      <div style={{ height: '100%', width: `${score}%`, borderRadius: 3, background: color, transition: 'width 0.8s ease' }} />
    </div>
  )
}

// Hexagonal radar using CSS-based approach (no d3/canvas)
function RiskRadar() {
  return (
    <div style={{ padding: '20px', borderRadius: 16, background: CARD_BG, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0F2E', marginBottom: 16 }}>Portfolio Health Gauge</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {RISK_DIMENSIONS.map(dim => (
          <div key={dim.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{dim.name}</span>
                <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 8 }}>{dim.desc}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: dim.color, fontFamily: 'monospace' }}>{dim.score}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: dim.color,
                  background: `${dim.color}15`, border: `1px solid ${dim.color}30`,
                  borderRadius: 4, padding: '1px 5px', letterSpacing: '0.07em',
                }}>{dim.status}</span>
              </div>
            </div>
            <RiskBar score={dim.score} color={dim.color} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
        {[{ label: 'OPTIMAL', color: '#10b981', count: RISK_DIMENSIONS.filter(d => d.status === 'OPTIMAL').length },
          { label: 'MONITOR', color: '#f59e0b', count: RISK_DIMENSIONS.filter(d => d.status === 'MONITOR').length },
          { label: 'ALERT',   color: '#ef4444', count: RISK_DIMENSIONS.filter(d => d.status === 'ALERT').length }].map(s => (
          <div key={s.label} style={{ padding: '8px', borderRadius: 8, background: `${s.color}10`, border: `1px solid ${s.color}25` }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.count}</div>
            <div style={{ fontSize: 9, color: '#64748B', letterSpacing: '0.1em' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AssetCard({ asset }: { asset: typeof ASSETS[0] }) {
  return (
    <div style={{
      padding: '20px', borderRadius: 16,
      background: `${asset.color}06`, border: `1px solid ${asset.color}20`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: `${asset.color}20`, border: `1px solid ${asset.color}35`,
            display: 'grid', placeItems: 'center', fontSize: 18,
          }}>{asset.icon}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0A0F2E' }}>{asset.symbol}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>{asset.issuer}</div>
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: asset.riskColor,
          background: `${asset.riskColor}15`, border: `1px solid ${asset.riskColor}30`,
          borderRadius: 6, padding: '3px 8px',
        }}>{asset.risk} RISK</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'APY', value: `${asset.apy.toFixed(2)}%`, color: asset.color },
          { label: 'Allocation', value: `${asset.allocation}%`, color: '#0A0F2E' },
          { label: 'Status', value: asset.status, color: asset.statusColor },
          { label: 'TVL', value: asset.tvl, color: '#475569' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 12px', borderRadius: 9, background: '#F8FAFC', border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginBottom: 10 }}>{asset.desc}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: asset.trendUp ? '#10b981' : '#ef4444' }}>
          {asset.trendUp ? '↗' : '↘'}
        </span>
        <span style={{ fontSize: 12, color: '#64748B' }}>Yield Trend: {asset.trend}</span>
      </div>
    </div>
  )
}

export default function InsuranceRiskPage() {
  const [showFormula, setShowFormula] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#0A0F2E', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)', display: 'grid', placeItems: 'center', fontSize: 18,
            }}>🛡️</div>
            <div>
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                Risk Management
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                5-Dimension Portfolio Health
              </div>
            </div>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Portfolio Risk Management
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
            Five risk dimensions tracked in real time. The Risk Guardian agent monitors all constraints
            and can veto any rebalance that violates the hard-coded 70% mETH cap.
          </p>
        </div>

        {/* Top stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Portfolio Health', value: '74/100', color: '#10b981' },
            { label: 'Risk Level', value: 'MODERATE', color: '#f59e0b' },
            { label: 'mETH Cap Usage', value: '40/70%', color: TEAL },
            { label: 'Active Alerts', value: '1', color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ padding: '16px', borderRadius: 14, background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'monospace', marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 2-column: radar + assets */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <RiskRadar />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ASSETS.map(a => <AssetCard key={a.symbol} asset={a} />)}
          </div>
        </div>

        {/* Alert feed */}
        <div style={{ padding: '20px', borderRadius: 16, background: CARD_BG, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0F2E', marginBottom: 14 }}>Alert Feed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ALERTS.map(alert => (
              <div key={alert.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                borderRadius: 9, background: `${alert.color}08`, border: `1px solid ${alert.color}20`,
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{alert.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, color: '#334155' }}>{alert.msg}</span>
                </div>
                <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, fontFamily: 'monospace' }}>{alert.ts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rebalance formula */}
        <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
          <button
            onClick={() => setShowFormula(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', background: '#ffffff', border: 'none',
              cursor: 'pointer', color: '#334155', fontSize: 13, fontWeight: 600,
            }}
          >
            <span>⚙️ Rebalance Trigger Logic (Transparency)</span>
            <span style={{ color: TEAL }}>{showFormula ? '▲ collapse' : '▼ expand'}</span>
          </button>
          {showFormula && (
            <div style={{ padding: '0 20px 20px', background: '#F8FAFC' }}>
              <pre style={{
                fontSize: 12, color: '#3B5BFA', fontFamily: 'monospace', lineHeight: 1.7,
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{`TRIGGER CONDITION:
IF |USDY_allocation - USDY_target| > threshold%
AND mETH_allocation ≤ 70%  (MAX_RISK_BPS enforced on-chain)
AND council_confidence_score > 75%
AND quorum_met (3 of 4 agents voted YES)
THEN execute_rebalance()

CURRENT STATE:
  AI Confidence:   87%  ✅ (> 75% threshold)
  Drift:           8%   ✅ (> 5% trigger threshold)
  mETH Cap:        40%  ✅ (≤ 70%)
  Council Quorum:  3/4  ✅

STATUS: READY TO REBALANCE
Last checked: 2 min ago · Next auto-check: 10 min`}</pre>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

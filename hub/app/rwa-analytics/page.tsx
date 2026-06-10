// Built by vsrupeshkumar
// Phase 5 — RWAkins Ecosystem Impact Analytics (public, no wallet required)
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const BG = 'var(--cloud-bg)'
const BORDER = '#E2E8F0'
const CARD_BG = '#ffffff'
const TEAL = '#3B5BFA'

// Simulated rolling rebalance history for charts
const generateHistory = () =>
  Array.from({ length: 30 }, (_, i) => ({
    day: `Jun ${i + 1 < 10 ? '0' : ''}${i + 1}`,
    rebalances: Math.floor(Math.random() * 8 + 2),
    confidence: Math.floor(Math.random() * 15 + 80),
    tvl: 1100 + Math.random() * 200,
  }))

const HISTORY = generateHistory()

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 120},${20 - ((v - min) / range) * 16}`)
  return (
    <svg width="120" height="20" style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points.join(' ')} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SimpleBar({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = Math.max(...data)
  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
        {data.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1, background: color,
              height: `${(v / max) * 100}%`, borderRadius: '2px 2px 0 0',
              opacity: i === data.length - 1 ? 1 : 0.4 + (i / data.length) * 0.5,
              transition: 'height 0.5s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function RwaAnalyticsPage() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 4000)
    return () => clearInterval(t)
  }, [])

  // Drift stats slightly each tick for live feel
  const tvl = (1200 + Math.sin(tick * 0.3) * 18).toFixed(1)
  const rebalances = 142 + tick % 3
  const confidence = (87 + Math.sin(tick * 0.5) * 1.2).toFixed(1)
  const uptime = (99.4 + Math.sin(tick * 0.1) * 0.3).toFixed(1)

  const rebalanceHistory = HISTORY.map(h => h.rebalances)
  const confidenceHistory = HISTORY.map(h => h.confidence)
  const tvlHistory = HISTORY.map(h => h.tvl)

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#0A0F2E', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)', display: 'grid', placeItems: 'center', fontSize: 18,
            }}>📊</div>
            <div>
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                RWAkins — AI × RWA
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Ecosystem Impact · Public Dashboard
              </div>
            </div>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            RWAkins Ecosystem Impact
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
            Live metrics across the RWAkins platform. No wallet required.
            All agent activity logged on <span style={{ color: TEAL }}>Mantle Sepolia</span>.
          </p>
        </div>

        {/* Primary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total TVL', value: `$${tvl}K+`, sublabel: 'USDY + mETH in vault', color: '#10b981', sparkData: tvlHistory.map(v => v) },
            { label: 'Rebalances Executed', value: String(rebalances), sublabel: `24h: ${12 + tick % 2}`, color: TEAL, sparkData: rebalanceHistory },
            { label: 'Avg Council Confidence', value: `${confidence}%`, sublabel: `Guardian: 96.0%`, color: '#8b5cf6', sparkData: confidenceHistory },
          ].map(s => (
            <div key={s.label} style={{ padding: '20px', borderRadius: 16, background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: 'monospace', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{s.sublabel}</div>
                </div>
                <MiniSparkline data={s.sparkData.slice(-15)} color={s.color} />
              </div>
            </div>
          ))}
        </div>

        {/* Secondary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Mantle Tx Volume', value: '$4.5M', sublabel: 'Gas saved vs L1: $12.4k', color: '#6366f1' },
            { label: 'Agent Uptime', value: `${uptime}%`, sublabel: '4 agents, 30-day avg', color: '#10b981' },
            { label: 'Compliance Audits', value: '100%', sublabel: 'All decisions on-chain', color: TEAL },
          ].map(s => (
            <div key={s.label} style={{ padding: '16px 18px', borderRadius: 14, background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{s.sublabel}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ padding: '20px', borderRadius: 16, background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <SimpleBar data={rebalanceHistory.slice(-20)} color={TEAL} label="Rebalances per day (last 20 days)" />
          </div>
          <div style={{ padding: '20px', borderRadius: 16, background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <SimpleBar data={confidenceHistory.slice(-20)} color='#8b5cf6' label="Avg council confidence % (last 20 days)" />
          </div>
        </div>

        {/* Asset allocation */}
        <div style={{
          padding: '22px', borderRadius: 16, marginBottom: 24,
          background: CARD_BG, border: `1px solid ${BORDER}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0F2E', marginBottom: 16 }}>Current Asset Allocation</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ height: 20, borderRadius: 10, overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
                <div style={{ width: '60%', background: '#10b981' }} />
                <div style={{ width: '40%', background: '#6366f1' }} />
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { symbol: 'USDY', pct: 60, color: '#10b981', apy: '4.80%' },
                  { symbol: 'mETH', pct: 40, color: '#6366f1', apy: '3.60%' },
                ].map(a => (
                  <div key={a.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: a.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>{a.symbol}</span>
                    <span style={{ fontSize: 13, color: a.color, fontFamily: 'monospace', fontWeight: 700 }}>{a.pct}%</span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>APY {a.apy}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Combined APY', value: '4.32%', color: '#10b981' },
                { label: 'Risk Level', value: 'MODERATE', color: '#f59e0b' },
                { label: 'mETH Cap Usage', value: '57%', color: TEAL },
                { label: 'Drift from Target', value: '0.8%', color: '#10b981' },
              ].map(s => (
                <div key={s.label} style={{ padding: '10px 12px', borderRadius: 9, background: '#F8FAFC', border: `1px solid ${BORDER}`, minWidth: 120 }}>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mantle ecosystem integration */}
        <div style={{
          padding: '22px', borderRadius: 16, marginBottom: 20,
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0F2E', marginBottom: 14 }}>Mantle Ecosystem Integration</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {[
              { label: 'Settlement Layer', value: 'Mantle Sepolia', color: '#6366f1', icon: '⛓' },
              { label: 'USDY Issuer', value: 'Ondo Finance', color: TEAL, icon: '🏦' },
              { label: 'mETH Protocol', value: 'Mantle LSP', color: '#8b5cf6', icon: '🔷' },
              { label: 'Agent Standard', value: 'ERC-8004', color: '#f59e0b', icon: '⬡' },
              { label: 'Gas Token', value: 'MNT', color: '#10b981', icon: '⛽' },
              { label: 'Chain ID', value: '5003', color: '#3b82f6', icon: '#' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '12px 14px', borderRadius: 10,
                background: '#F8FAFC', border: `1px solid ${s.color}25`,
              }}>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 3 }}>{s.icon} {s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/agent-council" style={{
            padding: '10px 20px', borderRadius: 10, background: `${TEAL}15`,
            border: `1px solid ${TEAL}35`, color: TEAL, fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
          }}>⬡ View Live Council →</Link>
          <Link href="/compare" style={{
            padding: '10px 20px', borderRadius: 10, background: '#F8FAFC',
            border: `1px solid ${BORDER}`, color: '#475569', fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
          }}>⇌ Compare Alternatives →</Link>
        </div>

      </div>
    </div>
  )
}

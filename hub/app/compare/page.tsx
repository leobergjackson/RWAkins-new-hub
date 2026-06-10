// Built by vsrupeshkumar
// Phase 5 — RWAkins vs Alternatives Comparison Table
'use client'

import Link from 'next/link'

const BG = 'var(--cloud-bg)'
const BORDER = '#E2E8F0'
const TEAL = '#3B5BFA'

const YES = '✅'
const NO = '❌'
const PARTIAL = '⚠️'

const ROWS = [
  {
    feature: 'Autonomous rebalancing',
    rwakins: { value: YES,     note: '4-agent council',          color: '#10b981' },
    manual:  { value: NO,      note: 'User does it',             color: '#ef4444' },
    robo:    { value: PARTIAL, note: 'Basic rule-based',         color: '#f59e0b' },
  },
  {
    feature: 'Real-time market awareness',
    rwakins: { value: YES,     note: '4 agents, continuous',     color: '#10b981' },
    manual:  { value: NO,      note: 'User monitors manually',   color: '#ef4444' },
    robo:    { value: PARTIAL, note: 'Daily/hourly snapshots',   color: '#f59e0b' },
  },
  {
    feature: 'On-chain transparency',
    rwakins: { value: YES,     note: 'Mantle (ERC-8004 logs)',   color: '#10b981' },
    manual:  { value: PARTIAL, note: 'Depends on user',          color: '#f59e0b' },
    robo:    { value: NO,      note: 'Proprietary, opaque',      color: '#ef4444' },
  },
  {
    feature: 'Risk constraint enforcement',
    rwakins: { value: YES,     note: 'Guardian veto + contract', color: '#10b981' },
    manual:  { value: PARTIAL, note: 'User discipline required', color: '#f59e0b' },
    robo:    { value: PARTIAL, note: 'Preset bands, no veto',    color: '#f59e0b' },
  },
  {
    feature: 'KYC/AML compliance aware',
    rwakins: { value: YES,     note: 'Framework documented',     color: '#10b981' },
    manual:  { value: NO,      note: 'No framework',             color: '#ef4444' },
    robo:    { value: PARTIAL, note: 'Basic KYC only',           color: '#f59e0b' },
  },
  {
    feature: 'Auditable AI decisions',
    rwakins: { value: YES,     note: 'ERC-8004 identity NFTs',   color: '#10b981' },
    manual:  { value: NO,      note: 'No AI involved',           color: '#ef4444' },
    robo:    { value: NO,      note: 'Black-box algorithm',      color: '#ef4444' },
  },
  {
    feature: 'Entry for Web2 users',
    rwakins: { value: YES,     note: 'Simple onboarding intent', color: '#10b981' },
    manual:  { value: PARTIAL, note: 'Steep DeFi learning curve', color: '#f59e0b' },
    robo:    { value: YES,     note: 'Traditional UX',           color: '#10b981' },
  },
  {
    feature: 'RWA assets (USDY / mETH)',
    rwakins: { value: YES,     note: 'Core, tokenized on-chain', color: '#10b981' },
    manual:  { value: PARTIAL, note: 'Access varies by DEX',     color: '#f59e0b' },
    robo:    { value: NO,      note: 'TradFi assets only',       color: '#ef4444' },
  },
  {
    feature: 'Council debate (watch AI think)',
    rwakins: { value: YES,     note: 'Live reasoning stream',    color: '#10b981' },
    manual:  { value: NO,      note: 'N/A',                      color: '#ef4444' },
    robo:    { value: NO,      note: 'Hidden logic',             color: '#ef4444' },
  },
  {
    feature: 'Cross-chain support',
    rwakins: { value: PARTIAL, note: 'Mantle-first (expanding)', color: '#f59e0b' },
    manual:  { value: PARTIAL, note: 'Depends on bridges',       color: '#f59e0b' },
    robo:    { value: NO,      note: 'Single-chain only',        color: '#ef4444' },
  },
]

const COL_HEADERS = [
  { label: 'Feature', width: '280px' },
  { label: 'RWAkins AI CFO', color: TEAL, highlight: true },
  { label: 'Manual DIY DeFi', color: '#64748B' },
  { label: 'Traditional Robo-Advisor', color: '#64748B' },
]

export default function ComparePage() {
  const rwaScore = ROWS.filter(r => r.rwakins.value === YES).length
  const manualScore = ROWS.filter(r => r.manual.value === YES).length
  const roboScore = ROWS.filter(r => r.robo.value === YES).length

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#0A0F2E', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.3)', display: 'grid', placeItems: 'center', fontSize: 18,
            }}>⇌</div>
            <div>
              <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                Product Differentiation
              </div>
            </div>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            RWAkins vs Alternatives
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
            Why an autonomous AI council with on-chain transparency wins over manual DeFi and traditional robo-advisors.
          </p>
        </div>

        {/* Score summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'RWAkins AI CFO', score: rwaScore, total: ROWS.length, color: TEAL, highlight: true },
            { label: 'Manual DIY DeFi', score: manualScore, total: ROWS.length, color: '#f59e0b' },
            { label: 'Robo-Advisor', score: roboScore, total: ROWS.length, color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '18px', borderRadius: 14, textAlign: 'center',
              background: s.highlight ? `${TEAL}10` : '#ffffff',
              border: `1px solid ${s.highlight ? TEAL + '30' : '#E2E8F0'}`,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>
                {s.score}/{s.total}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{s.label}</div>
              <div style={{ height: 4, borderRadius: 2, background: '#E2E8F0', marginTop: 10 }}>
                <div style={{ height: '100%', width: `${(s.score / s.total) * 100}%`, borderRadius: 2, background: s.color, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div style={{ borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '280px 1fr 1fr 1fr',
            background: '#F8FAFC',
            borderBottom: `1px solid ${BORDER}`,
          }}>
            {COL_HEADERS.map((h, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                fontSize: 12, fontWeight: 700,
                color: h.color ?? '#475569',
                background: h.highlight ? `${TEAL}10` : 'transparent',
                borderRight: i < COL_HEADERS.length - 1 ? `1px solid ${BORDER}` : 'none',
                letterSpacing: '0.03em',
              }}>
                {h.label}
                {h.highlight && (
                  <div style={{ fontSize: 9, color: TEAL, fontWeight: 700, letterSpacing: '0.12em', marginTop: 2, opacity: 0.7 }}>
                    THIS PROJECT
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {ROWS.map((row, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '280px 1fr 1fr 1fr',
              borderBottom: i < ROWS.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              <div style={{
                padding: '13px 16px', fontSize: 13, color: '#334155', fontWeight: 500,
                borderRight: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center',
              }}>
                {row.feature}
              </div>
              {[row.rwakins, row.manual, row.robo].map((cell, ci) => (
                <div key={ci} style={{
                  padding: '13px 16px',
                  background: ci === 0 ? `${TEAL}06` : 'transparent',
                  borderRight: ci < 2 ? `1px solid ${BORDER}` : 'none',
                  display: 'flex', flexDirection: 'column', gap: 3,
                }}>
                  <span style={{ fontSize: 14 }}>{cell.value}</span>
                  <span style={{ fontSize: 11, color: cell.color, fontWeight: 500 }}>{cell.note}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Unique differentiators */}
        <div style={{ marginTop: 24, padding: '22px', borderRadius: 16, background: 'rgba(45,212,191,0.05)', border: '1px solid rgba(45,212,191,0.15)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0F2E', marginBottom: 12 }}>
            RWAkins Unique Differentiators
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {[
              { icon: '⬡', title: 'ERC-8004 Agent Identity', desc: 'Non-repudiable on-chain AI decisions' },
              { icon: '🛡️', title: 'Guardian Veto Power', desc: 'Risk constraints enforced at consensus layer' },
              { icon: '📋', title: 'Audit Trail', desc: 'Regulators can verify every decision' },
              { icon: '💬', title: 'Watch AI Think', desc: 'Agents debate in real-time — no black box' },
            ].map(d => (
              <div key={d.title} style={{
                padding: '14px', borderRadius: 10,
                background: '#F8FAFC', border: `1px solid ${BORDER}`,
              }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{d.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0F2E', marginBottom: 3 }}>{d.title}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          <Link href="/agent-council" style={{
            padding: '10px 20px', borderRadius: 10, background: `${TEAL}15`,
            border: `1px solid ${TEAL}35`, color: TEAL, fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>⬡ See Agent Council →</Link>
          <Link href="/rwa-analytics" style={{
            padding: '10px 20px', borderRadius: 10, background: '#F8FAFC',
            border: `1px solid ${BORDER}`, color: '#475569', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>📊 View Analytics →</Link>
        </div>

      </div>
    </div>
  )
}

'use client'
import { LENDORA_ACCENT, FALLBACK_MARKETS } from '@/lib/lend-fallbacks'

const A = LENDORA_ACCENT
const BORDER = 'rgba(255,255,255,0.08)'
const CARD = '#111111'
const MUTED = 'rgba(255,255,255,0.6)'
const MUTED2 = 'rgba(255,255,255,0.4)'
const MONO = '"Fira Code","JetBrains Mono",monospace'

const utilColor = (u: number) => u < 60 ? '#10b981' : u < 80 ? '#f59e0b' : '#ef4444'

export default function LendMarkets({ onSupply, onBorrow }: { onSupply?: (a: string) => void; onBorrow?: (a: string) => void }) {
  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Stat label="Total Market Size" v="$464M" />
        <Stat label="Total Borrowed"     v="$180M" />
        <Stat label="Utilization"        v="38.8%" />
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>{['Asset', 'Total Supply', 'Total Borrowed', 'Supply APY', 'Borrow APR', 'Utilization', 'Action'].map(h => (
              <th key={h} style={th}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {FALLBACK_MARKETS.map(m => (
              <tr key={m.asset} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ ...td, fontFamily: MONO, color: A }}>{m.asset}</td>
                <td style={{ ...td, fontFamily: MONO }}>{m.supply}</td>
                <td style={{ ...td, fontFamily: MONO }}>{m.borrowed}</td>
                <td style={{ ...td, color: '#10b981' }}>{m.sAPY}</td>
                <td style={{ ...td, color: '#ef4444' }}>{m.bAPR}</td>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ minWidth: 32 }}>{m.util}%</span>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden', maxWidth: 100 }}>
                      <div style={{ width: `${m.util}%`, height: '100%', background: utilColor(m.util) }} />
                    </div>
                  </div>
                </td>
                <td style={td}>
                  <button onClick={() => onSupply?.(m.asset)} style={btn}>Supply</button>
                  <button onClick={() => onBorrow?.(m.asset)} style={{ ...btn, marginLeft: 6 }}>Borrow</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: MUTED2, textTransform: 'uppercase', marginBottom: 10 }}>Interest Rate Model</div>
        <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, marginBottom: 12 }}>
          Lendora uses a kinked interest rate model. Rates are low at low utilization and rise sharply above 80% to incentivize repayment and attract new supply.
        </p>
        {[
          { tier: 'Tier 1 (Score 900+)', desc: '−2.5% off market rate', color: '#10b981' },
          { tier: 'Tier 2 (Score 800+)', desc: '−1.5% off market rate ← You qualify', color: A },
          { tier: 'Tier 3 (Score 700+)', desc: '−0.5% off market rate', color: MUTED },
          { tier: 'Standard (< 700)',     desc: 'Market rate',           color: MUTED2 },
        ].map(t => (
          <div key={t.tier} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
            <span style={{ color: t.color, fontWeight: 600 }}>{t.tier}</span>
            <span style={{ color: '#fff' }}>{t.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: MUTED2, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 4, fontFamily: MONO }}>{v}</div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left', padding: '12px 16px', borderBottom: `1px solid ${BORDER}`,
  fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: MUTED2, background: 'rgba(255,255,255,0.02)',
}
const td: React.CSSProperties = { padding: '12px 16px', color: '#fff' }
const btn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6, background: 'transparent',
  border: `1px solid ${BORDER}`, color: A, fontSize: 11, fontWeight: 600, cursor: 'pointer',
}

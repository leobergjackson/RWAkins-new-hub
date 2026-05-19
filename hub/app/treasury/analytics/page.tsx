'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchTreasury, fetchAgents } from '@/lib/palmflow-api'
import { PF_AGENTS } from '@/lib/palmflow-fallbacks'
import type { TreasuryData } from '@/lib/palmflow-api'
import type { PFAgent } from '@/lib/palmflow-fallbacks'

const TEAL = '#00E5CC'
const BG = '#080810'
const CARD = 'rgba(255,255,255,0.03)'
const BDR = 'rgba(255,255,255,0.07)'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const SVG_W = 600, SVG_H = 100, PAD = 8
function buildPath(data: number[], color: string) {
  if (!data.length) return null
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (SVG_W - PAD * 2)
    const y = SVG_H - PAD - ((v - mn) / range) * (SVG_H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const d = `M${pts.join('L')}`
  const fill = `${d}L${SVG_W - PAD},${SVG_H - PAD}L${PAD},${SVG_H - PAD}Z`
  return { d, fill }
}

const FORECAST = [999945, 1042000, 1089000, 1138000, 1190000, 1245000, 1303000]
const FORECAST_LABELS = ['May 19', 'May 26', 'Jun 2', 'Jun 9', 'Jun 16', 'Jun 23', 'Jun 30']

export default function AnalyticsPage() {
  const [treasury, setTreasury] = useState<TreasuryData | null>(null)
  const [agents, setAgents] = useState<PFAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeChart, setActiveChart] = useState<'treasury' | 'forecast'>('treasury')

  useEffect(() => {
    Promise.all([fetchTreasury('demo'), fetchAgents()]).then(([t, a]) => {
      setTreasury(t); setAgents(a); setLoading(false)
    })
  }, [])

  function exportCSV() {
    if (!treasury) return
    const rows = treasury.chartLabels.map((l, i) => `${l},${treasury.chartData[i]}`).join('\n')
    const csv = `Date,Balance (PUSD)\n${rows}`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'treasury-analytics.csv'
    a.click()
    toast.success('CSV exported')
  }

  const chartData = activeChart === 'treasury' ? treasury?.chartData : FORECAST
  const chartLabels = activeChart === 'treasury' ? treasury?.chartLabels : FORECAST_LABELS
  const path = chartData ? buildPath(chartData, TEAL) : null

  const leaderboard = [...(agents.length ? agents : PF_AGENTS)].sort((a, b) => b.tasks - a.tasks)

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px', color: '#fff', fontFamily: '"Inter",system-ui,sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: TEAL, fontFamily: MONO, letterSpacing: '0.1em', marginBottom: 4 }}>PALMFLOW AI / ANALYTICS</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Treasury Analytics</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Deep insights and neural forecasting</p>
        </div>
        <button
          onClick={exportCSV}
          style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${BDR}`, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' }}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: '7-Day Peak', value: loading ? '—' : `${Math.max(...(treasury?.chartData || [0])).toLocaleString()} PUSD`, color: '#22C55E' },
          { label: '7-Day Low', value: loading ? '—' : `${Math.min(...(treasury?.chartData || [0])).toLocaleString()} PUSD`, color: '#EF4444' },
          { label: 'Net Flow', value: loading || !treasury ? '—' : `${(treasury.chartData[treasury.chartData.length-1] - treasury.chartData[0]).toLocaleString()} PUSD`, color: TEAL },
          { label: 'Forecast (30d)', value: '+30.3%', color: '#A855F7' },
        ].map(k => (
          <div key={k.label} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color, fontFamily: MONO }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {activeChart === 'treasury' ? 'Treasury Balance History' : '🔮 Neural Forecast (30-day)'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['treasury', 'forecast'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveChart(tab)}
                style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${activeChart === tab ? TEAL : BDR}`, background: activeChart === tab ? 'rgba(0,229,204,0.1)' : 'transparent', color: activeChart === tab ? TEAL : 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', textTransform: 'capitalize' }}
              >
                {tab === 'forecast' ? '🔮 Forecast' : 'History'}
              </button>
            ))}
          </div>
        </div>
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="anaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeChart === 'forecast' ? '#A855F7' : TEAL} stopOpacity="0.3" />
              <stop offset="100%" stopColor={activeChart === 'forecast' ? '#A855F7' : TEAL} stopOpacity="0" />
            </linearGradient>
          </defs>
          {path && <path d={path.fill} fill="url(#anaGrad)" />}
          {path && <path d={path.d} fill="none" stroke={activeChart === 'forecast' ? '#A855F7' : TEAL} strokeWidth="2" strokeDasharray={activeChart === 'forecast' ? '6,3' : undefined} />}
        </svg>
        {chartLabels && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {chartLabels.map(l => (
              <span key={l} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{l}</span>
            ))}
          </div>
        )}
      </div>

      {/* Agent leaderboard */}
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Agent Leaderboard</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {leaderboard.map((a, i) => (
            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 80px 70px', gap: 12, alignItems: 'center', padding: '11px 0', borderBottom: i < leaderboard.length - 1 ? `1px solid ${BDR}` : 'none' }}>
              <span style={{ fontSize: 12, color: i < 3 ? ['#F59E0B', '#94A3B8', '#CD7C2F'][i] : 'rgba(255,255,255,0.3)', fontWeight: 700, fontFamily: MONO }}>
                #{i + 1}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{a.type}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, fontFamily: MONO }}>{a.tasks}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>tasks</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#22C55E', fontFamily: MONO }}>{a.efficiency}%</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>efficiency</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: a.status === 'active' ? '#22C55E' : '#F59E0B' }}>
                ● {a.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

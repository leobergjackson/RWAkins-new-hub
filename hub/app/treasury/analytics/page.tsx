// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts'
import { fetchAnalyticsData } from '@/lib/palmflow-api'
import type { PFAnalyticsData } from '@/lib/palmflow-api'

const TEAL = '#3B5BFA'
const BG = '#ffffff'
const CARD = '#ffffff'
const BDR = '#E2E8F0'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const DATE_RANGES = ['7d', '30d', '90d', 'all'] as const
type DateRange = typeof DATE_RANGES[number]

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background:'#ffffff', border:'1px solid rgba(59,91,250,0.2)', borderRadius:8, fontSize:11 },
  labelStyle: { color:'#64748B' },
  itemStyle: { color: '#0A0F2E' },
}

export default function AnalyticsPage() {
  const [data, setData] = useState<PFAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>('30d')
  const [mounted, setMounted] = useState(false)

  /* charts must only render client-side */
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    setLoading(true)
    fetchAnalyticsData(range).then(d => { setData(d); setLoading(false) })
  }, [range])

  function exportCSV() {
    if (!data) return
    const rows = data.volumeTrend.map(v => `${v.date},${v.sent},${v.received}`).join('\n')
    const csv = `Date,Sent (USD),Received (USD)\n${rows}`
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' })); a.download = 'analytics.csv'; a.click()
    toast.success('Analytics exported')
  }

  const d = data

  return (
    <div style={{ background:BG, minHeight:'100vh', padding:'24px', color: '#0A0F2E', fontFamily:'"Inter",system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:11, color:TEAL, fontFamily:MONO, letterSpacing:'0.1em', marginBottom:4 }}>YIELD OPERATIONS HUB / ANALYTICS</div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Yield Operations Hub Analytics</h1>
          <p style={{ margin:'6px 0 0', fontSize:13, color:'#64748B' }}>Financial performance and AI-powered insights</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ display:'flex', gap:4 }}>
            {DATE_RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                style={{ padding:'6px 12px', borderRadius:16, border:`1px solid ${range===r?TEAL:BDR}`, background:range===r?'rgba(59,91,250,0.1)':'transparent', color:range===r?TEAL:'#64748B', fontSize:11, cursor:'pointer' }}>
                {r === 'all' ? 'All' : r}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${BDR}`, background:'#F8FAFC', color:'#64748B', fontSize:11, cursor:'pointer' }}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Sent (30d)',     value: d ? `$${d.totalSent.toLocaleString()}` : '—',     sub:'+12.5% vs prev',               color:'#60A5FA', icon:'📤' },
          { label:'Total Received (30d)', value: d ? `$${d.totalReceived.toLocaleString()}` : '—', sub:'+8.3% vs prev',                color:'#22C55E', icon:'📥' },
          { label:'Gas Spent',            value: d ? `$${d.gasSpent.toLocaleString()}` : '—',      sub: d ? `saved $${d.gasSaved}` : '',color:TEAL,      icon:'⛽' },
          { label:'Transactions',         value: d ? `${d.transactionCount}` : '—',                sub: d ? `${d.successRate}% success` : '', color:'#A855F7', icon:'🔢' },
        ].map(k => (
          <div key={k.label} style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:12, padding:'16px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:10, color:'#64748B', marginBottom:6 }}>{k.label}</div>
                <div style={{ fontSize:20, fontWeight:700, color:k.color, fontFamily:MONO }}>{loading ? '—' : k.value}</div>
                <div style={{ fontSize:10, color:'#94A3B8', marginTop:3 }}>{k.sub}</div>
              </div>
              <span style={{ fontSize:20 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Volume trend chart */}
      <div style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:12, padding:'20px 24px', marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Payment Volume Trend</div>
        <div style={{ fontSize:11, color:'#94A3B8', marginBottom:20 }}>Daily sent vs received (USD)</div>
        {mounted && d && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.volumeTrend} margin={{ top:4, right:16, left:0, bottom:0 }}>
              <CartesianGrid stroke="#F8FAFC" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill:'#94A3B8', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#94A3B8', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: unknown) => `$${Number(v).toLocaleString()}`} />
              <Line type="monotone" dataKey="sent"     stroke="#60A5FA" strokeWidth={2} dot={false} name="Sent" />
              <Line type="monotone" dataKey="received" stroke="#22C55E" strokeWidth={2} dot={false} name="Received" />
            </LineChart>
          </ResponsiveContainer>
        )}
        {(!mounted || !d) && <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8', fontSize:12 }}>Loading chart...</div>}
        <div style={{ display:'flex', gap:20, marginTop:12, justifyContent:'center' }}>
          <span style={{ fontSize:11, color:'#60A5FA', display:'flex', alignItems:'center', gap:6 }}><span style={{ width:16, height:2, background:'#60A5FA', display:'inline-block' }} /> Sent</span>
          <span style={{ fontSize:11, color:'#22C55E', display:'flex', alignItems:'center', gap:6 }}><span style={{ width:16, height:2, background:'#22C55E', display:'inline-block' }} /> Received</span>
        </div>
      </div>

      {/* Pie + Bar */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

        {/* Asset Composition Pie */}
        <div style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:12, padding:'20px 24px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Yield Operations Hub Composition</div>
          <div style={{ fontSize:11, color:'#94A3B8', marginBottom:16 }}>Portfolio breakdown by asset</div>
          {mounted && d ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={d.assetComposition} dataKey="amount" nameKey="asset" cx="50%" cy="50%" outerRadius={75} label={false} labelLine={false}>
                  {d.assetComposition.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: unknown) => `$${Number(v).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8', fontSize:12 }}>Loading...</div>
          )}
          {d && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8, justifyContent:'center' }}>
              {d.assetComposition.map(a => (
                <span key={a.asset} style={{ fontSize:10, display:'flex', alignItems:'center', gap:4, color:'#475569' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:a.color, display:'inline-block' }} />
                  {a.asset} {a.percentage}%
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Network Distribution Bar */}
        <div style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:12, padding:'20px 24px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Activity by Network</div>
          <div style={{ fontSize:11, color:'#94A3B8', marginBottom:16 }}>% of total volume per chain</div>
          {mounted && d ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.networkDistribution} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid stroke="#F8FAFC" strokeDasharray="3 3" />
                <XAxis dataKey="network" tick={{ fill:'#94A3B8', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#94A3B8', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: unknown) => `${v}%`} />
                <Bar dataKey="percentage" radius={[4,4,0,0]} name="Volume %">
                  {d.networkDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8', fontSize:12 }}>Loading...</div>
          )}
        </div>
      </div>

      {/* Top Recipients Table */}
      <div style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:12, padding:'20px 24px' }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Top 5 Payment Recipients (30 days)</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${BDR}` }}>
                {['#', 'Recipient Address', 'Amount Sent', 'Transactions', '% of Total'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'6px 12px', fontSize:10, color:'#94A3B8', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(d?.topRecipients || []).map((r, i) => (
                <tr key={r.address} style={{ borderBottom:`1px solid #ffffff` }}>
                  <td style={{ padding:'11px 12px', color:i < 3 ? ['#F59E0B','#94A3B8','#CD7C2F'][i] : '#94A3B8', fontWeight:700, fontFamily:MONO }}>#{i+1}</td>
                  <td style={{ padding:'11px 12px', fontFamily:MONO, color:TEAL }}>{r.address}</td>
                  <td style={{ padding:'11px 12px', fontWeight:700 }}>${r.amount.toLocaleString()}</td>
                  <td style={{ padding:'11px 12px', color:'#475569' }}>{r.count} txns</td>
                  <td style={{ padding:'11px 12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:60, height:4, borderRadius:2, background:'#F1F5F9' }}>
                        <div style={{ height:4, borderRadius:2, background:TEAL, width:`${r.percentage}%` }} />
                      </div>
                      <span style={{ fontFamily:MONO, color:TEAL }}>{r.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!d && [...Array(4)].map((_,i) => (
                <tr key={i}><td colSpan={5} style={{ padding:'11px 12px', color:'#CBD5E1' }}>Loading...</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

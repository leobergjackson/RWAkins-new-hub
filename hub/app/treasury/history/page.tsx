// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchHistory, type PFHistoryItem } from '@/lib/palmflow-api'

const TEAL = '#3B5BFA'
const BG = '#ffffff'
const CARD = '#ffffff'
const BDR = '#E2E8F0'
const MONO = '"JetBrains Mono","Fira Code",monospace'

function typeColor(t: string) {
  return t === 'deposit' ? '#22C55E' : t === 'payment' ? '#60A5FA' : '#F59E0B'
}
function typeIcon(t: string) {
  return t === 'deposit' ? '↓' : t === 'payment' ? '→' : '↑'
}

export default function HistoryPage() {
  const [items, setItems] = useState<PFHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'payment' | 'deposit' | 'withdrawal'>('all')

  useEffect(() => {
    fetchHistory('demo').then(h => { setItems(h); setLoading(false) })
  }, [])

  const filtered = items.filter(item => {
    const matchSearch = !search || item.event.toLowerCase().includes(search.toLowerCase()) || item.agent.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || item.type === typeFilter
    return matchSearch && matchType
  })

  function exportCSV() {
    const header = 'Date,Event,Agent,Type,Amount,Status,Blockchain'
    const rows = items.map(i => `"${i.timestamp}","${i.event}","${i.agent}","${i.type}","${i.amount}","${i.status}","${i.blockchain}"`).join('\n')
    const csv = `${header}\n${rows}`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'Yield Operations Hub-history.csv'
    a.click()
    toast.success('History exported')
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px', color: '#0A0F2E', fontFamily: '"Inter",system-ui,sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: TEAL, fontFamily: MONO, letterSpacing: '0.1em', marginBottom: 4 }}>YIELD OPERATIONS HUB / HISTORY</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Transaction History</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>Immutable audit log of all Yield Operations Hub operations</p>
        </div>
        <button onClick={exportCSV} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${BDR}`, background: '#F8FAFC', color: '#475569', fontSize: 12, cursor: 'pointer' }}>
          ↓ Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events, agents..."
          style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 8, border: `1px solid ${BDR}`, background: '#ffffff', color: '#0A0F2E', fontSize: 12, outline: 'none' }}
        />
        {(['all', 'payment', 'deposit', 'withdrawal'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${typeFilter === t ? TEAL : BDR}`, background: typeFilter === t ? 'rgba(59,91,250,0.1)' : 'transparent', color: typeFilter === t ? TEAL : '#64748B', fontSize: 11, cursor: 'pointer', textTransform: 'capitalize' }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Transactions', value: items.length },
          { label: 'Payments', value: items.filter(i => i.type === 'payment').length, color: '#60A5FA' },
          { label: 'Deposits', value: items.filter(i => i.type === 'deposit').length, color: '#22C55E' },
          { label: 'Withdrawals', value: items.filter(i => i.type === 'withdrawal').length, color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color || '#fff', fontFamily: MONO }}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px 80px 100px', gap: 0, padding: '10px 20px', borderBottom: `1px solid ${BDR}`, fontSize: 10, color: '#94A3B8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span>Event / Agent</span>
          <span>Type</span>
          <span>Amount</span>
          <span>Chain</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Timestamp</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>Loading history...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>No matching transactions</div>
        ) : (
          filtered.map((item, i) => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px 80px 100px', gap: 0, padding: '12px 20px', borderBottom: i < filtered.length - 1 ? `1px solid #F8FAFC` : 'none', fontSize: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, marginBottom: 2 }}>{item.event}</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>{item.agent}</div>
              </div>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${typeColor(item.type)}15`, color: typeColor(item.type), display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                {typeIcon(item.type)} {item.type}
              </span>
              <span style={{ fontFamily: MONO, fontWeight: 700, color: typeColor(item.type) }}>{item.amount}</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>{item.blockchain}</span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: item.status === 'Finalized' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: item.status === 'Finalized' ? '#22C55E' : '#F59E0B', whiteSpace: 'nowrap' }}>
                {item.status}
              </span>
              <span style={{ fontSize: 10, color: '#94A3B8', textAlign: 'right' }}>{item.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

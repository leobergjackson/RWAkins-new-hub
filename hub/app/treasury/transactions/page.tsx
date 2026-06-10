// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchTransactions } from '@/lib/palmflow-api'
import type { PFTransaction } from '@/lib/palmflow-api'

const TEAL = '#3B5BFA'
const BG = '#ffffff'
const CARD = '#ffffff'
const BDR = '#E2E8F0'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const TYPE_ICON: Record<string, string> = { payment:'💸', swap:'🔄', deposit:'⬇️', withdrawal:'⬆️' }
const TYPE_COLOR: Record<string, string> = { payment:'#60A5FA', swap:'#A855F7', deposit:'#22C55E', withdrawal:'#F59E0B' }
const STATUS_COLOR: Record<string, string> = { completed:'#22C55E', pending:'#F59E0B', failed:'#EF4444' }

function short(addr: string) { return `${addr.slice(0,8)}...${addr.slice(-6)}` }

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<PFTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [networkFilter, setNetworkFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<PFTransaction | null>(null)
  const limit = 10

  useEffect(() => {
    setLoading(true)
    fetchTransactions({ type: typeFilter === 'all' ? undefined : typeFilter, status: statusFilter === 'all' ? undefined : statusFilter, search, page, limit })
      .then(r => { setTransactions(r.transactions); setTotal(r.total) })
      .finally(() => setLoading(false))
  }, [typeFilter, statusFilter, networkFilter, search, page])

  function exportCSV() {
    const header = 'Date,Type,From,To,Asset,Amount,USD Value,Status,Network,Tx Hash,Fee'
    const rows = transactions.map(t => `"${t.timestamp}","${t.type}","${t.from}","${t.to}","${t.fromAsset}","${t.fromAmount}","$${t.usdValue}","${t.status}","${t.network}","${t.txHash}","$${t.fee}"`).join('\n')
    const blob = new Blob([`${header}\n${rows}`], { type:'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'transactions.csv'; a.click()
    toast.success('Transactions exported')
  }

  const filtered = transactions.filter(t => {
    const matchSearch = !search || t.txHash.includes(search) || t.from.includes(search) || t.to.includes(search)
    const matchNet = networkFilter === 'all' || t.network === networkFilter
    return matchSearch && matchNet
  })

  const networks = ['all', ...Array.from(new Set(transactions.map(t => t.network)))]

  return (
    <div style={{ background:BG, minHeight:'100vh', padding:'24px', color: '#0A0F2E', fontFamily:'"Inter",system-ui,sans-serif' }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:11, color:TEAL, fontFamily:MONO, letterSpacing:'0.1em', marginBottom:4 }}>YIELD OPERATIONS HUB / TRANSACTIONS</div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Transaction History</h1>
          <p style={{ margin:'6px 0 0', fontSize:13, color:'#64748B' }}>All payments, swaps, deposits and withdrawals</p>
        </div>
        <button onClick={exportCSV} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${BDR}`, background:'#F8FAFC', color:'#475569', fontSize:12, cursor:'pointer' }}>
          ↓ Export CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'Total Transactions', value:total, color: '#0A0F2E' },
          { label:'Completed', value:transactions.filter(t=>t.status==='completed').length, color:'#22C55E' },
          { label:'Pending', value:transactions.filter(t=>t.status==='pending').length, color:'#F59E0B' },
          { label:'Failed', value:transactions.filter(t=>t.status==='failed').length, color:'#EF4444' },
        ].map(s => (
          <div key={s.label} style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:10, color:'#64748B', marginBottom:5 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:s.color, fontFamily:MONO }}>{loading?'—':s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by hash or address..."
          style={{ flex:1, minWidth:200, padding:'8px 14px', borderRadius:8, border:`1px solid ${BDR}`, background:'#ffffff', color: '#0A0F2E', fontSize:12, outline:'none' }} />
        {[
          { label:'Type', value:typeFilter, set:setTypeFilter, opts:['all','payment','swap','deposit','withdrawal'] },
          { label:'Status', value:statusFilter, set:setStatusFilter, opts:['all','completed','pending','failed'] },
        ].map(f => (
          <div key={f.label} style={{ display:'flex', gap:4 }}>
            {f.opts.map(o => (
              <button key={o} onClick={() => f.set(o)}
                style={{ padding:'6px 12px', borderRadius:16, border:`1px solid ${f.value===o?TEAL:BDR}`, background:f.value===o?'rgba(59,91,250,0.1)':'transparent', color:f.value===o?TEAL:'#64748B', fontSize:10, cursor:'pointer', textTransform:'capitalize' }}>
                {o}
              </button>
            ))}
          </div>
        ))}
        <select value={networkFilter} onChange={e => setNetworkFilter(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:`1px solid ${BDR}`, background:'#ffffff', color:'#475569', fontSize:11, outline:'none' }}>
          {networks.map(n => <option key={n} value={n} style={{ textTransform:'capitalize' }}>{n === 'all' ? 'All Networks' : n}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:12, overflow:'hidden', marginBottom:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 130px 100px 80px 80px 80px', gap:0, padding:'9px 16px', borderBottom:`1px solid ${BDR}`, fontSize:9, color:'#94A3B8', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
          <span>Type</span><span>Details</span><span>Amount</span><span>Network</span><span>Status</span><span>Fee</span><span>Action</span>
        </div>
        {loading ? (
          <div style={{ textAlign:'center', color:'#94A3B8', padding:40 }}>Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', color:'#94A3B8', padding:40 }}>No matching transactions</div>
        ) : filtered.map((t, i) => (
          <div key={t.id} style={{ display:'grid', gridTemplateColumns:'100px 1fr 130px 100px 80px 80px 80px', gap:0, padding:'12px 16px', borderBottom:i < filtered.length-1 ? `1px solid #ffffff` : 'none', alignItems:'center', fontSize:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span>{TYPE_ICON[t.type] || '•'}</span>
              <span style={{ fontSize:10, color:TYPE_COLOR[t.type] || '#fff', textTransform:'capitalize' }}>{t.type}</span>
            </div>
            <div>
              <div style={{ fontSize:11, color:'#334155', marginBottom:2 }}>
                {short(t.from)} → {short(t.to)}
              </div>
              <div style={{ fontSize:10, color:'#94A3B8' }}>{t.timestamp}</div>
              {t.memo && <div style={{ fontSize:10, color:'#94A3B8', fontStyle:'italic' }}>{t.memo}</div>}
            </div>
            <div>
              <div style={{ fontFamily:MONO, fontWeight:700, color:TYPE_COLOR[t.type] || '#fff', fontSize:12 }}>
                {t.fromAmount.toLocaleString()} {t.fromAsset}
                {t.toAsset && <span style={{ color:'#64748B', fontWeight:400 }}> → {t.toAmount?.toLocaleString()} {t.toAsset}</span>}
              </div>
              <div style={{ fontSize:10, color:'#94A3B8' }}>${t.usdValue.toLocaleString()}</div>
            </div>
            <div style={{ fontSize:10, color:'#64748B' }}>{t.network}</div>
            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:`${STATUS_COLOR[t.status]}15`, color:STATUS_COLOR[t.status], whiteSpace:'nowrap' }}>
              {t.status}
            </span>
            <span style={{ fontSize:10, color:'#64748B', fontFamily:MONO }}>${t.fee}</span>
            <button onClick={() => setSelected(t)}
              style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${BDR}`, background:'transparent', color:'#64748B', fontSize:10, cursor:'pointer' }}>
              View
            </button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'#64748B' }}>
        <span>Showing {((page-1)*limit)+1}–{Math.min(page*limit, total)} of {total} transactions</span>
        <div style={{ display:'flex', gap:6 }}>
          <button disabled={page===1} onClick={() => setPage(p=>p-1)}
            style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${BDR}`, background:'transparent', color:page===1?'#94A3B8':'#64748B', cursor:page===1?'default':'pointer' }}>←</button>
          <span style={{ padding:'5px 12px', borderRadius:6, background:'rgba(255,255,255,0.1)', border:`1px solid rgba(59,91,250,0.3)`, color:TEAL }}>{page}</span>
          <button disabled={page*limit >= total} onClick={() => setPage(p=>p+1)}
            style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${BDR}`, background:'transparent', color:page*limit>=total?'#94A3B8':'#64748B', cursor:page*limit>=total?'default':'pointer' }}>→</button>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div onClick={e => e.target === e.currentTarget && setSelected(null)}
          style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#ffffff', border:`1px solid rgba(59,91,250,0.2)`, borderRadius:16, padding:32, width:480, maxWidth:'95vw' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:700 }}>Transaction Details</div>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'#64748B', fontSize:20, cursor:'pointer' }}>×</button>
            </div>
            {[
              { label:'Tx Hash', value:selected.txHash },
              { label:'Type', value:selected.type },
              { label:'Status', value:selected.status, color:STATUS_COLOR[selected.status] },
              { label:'From', value:selected.from },
              { label:'To', value:selected.to },
              { label:'Amount', value:`${selected.fromAmount.toLocaleString()} ${selected.fromAsset}${selected.toAsset ? ` → ${selected.toAmount?.toLocaleString()} ${selected.toAsset}` : ''}` },
              { label:'USD Value', value:`$${selected.usdValue.toLocaleString()}` },
              { label:'Network', value:selected.network },
              { label:'Fee', value:`$${selected.fee}` },
              { label:'Time', value:selected.timestamp },
              ...(selected.blockNumber ? [{ label:'Block', value:`#${selected.blockNumber.toLocaleString()}` }] : []),
              ...(selected.error ? [{ label:'Error', value:selected.error, color:'#EF4444' }] : []),
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:12 }}>
                <span style={{ color:'#64748B' }}>{r.label}</span>
                <span style={{ color:r.color||'#fff', fontFamily:MONO, maxWidth:'60%', textAlign:'right', wordBreak:'break-all' }}>{r.value}</span>
              </div>
            ))}
            {selected.status === 'failed' && (
              <button style={{ width:'100%', marginTop:8, padding:'10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.4)', background:'rgba(239,68,68,0.08)', color:'#FCA5A5', cursor:'pointer' }}>
                ↻ Retry Transaction
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

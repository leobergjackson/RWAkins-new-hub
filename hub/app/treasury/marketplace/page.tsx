// Built by vsrupeshkumar
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MARKETPLACE_AGENTS } from '@/lib/palmflow-fallbacks'

const TEAL = '#3B5BFA'
const BG = '#ffffff'
const CARD = '#ffffff'
const BDR = '#E2E8F0'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const CATEGORIES = ['All', 'DeFi', 'Security', 'Marketing', 'Analytics', 'Compliance', 'DevOps']

const COMPLEXITY_COLOR = (c: string) => c === 'Expert' ? '#EF4444' : c === 'High' ? '#F59E0B' : '#22C55E'

export default function MarketplacePage() {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [hiring, setHiring] = useState<Record<string, boolean>>({})

  const filtered = MARKETPLACE_AGENTS.filter(a => {
    const matchCat = category === 'All' || a.category === category
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  async function hire(name: string) {
    setHiring(h => ({ ...h, [name]: true }))
    await new Promise(r => setTimeout(r, 1200))
    toast.success(`${name} deployed to your workforce`)
    setHiring(h => ({ ...h, [name]: false }))
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px', color: '#0A0F2E', fontFamily: '"Inter",system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: TEAL, fontFamily: MONO, letterSpacing: '0.1em', marginBottom: 4 }}>YIELD OPERATIONS HUB / MARKETPLACE</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Agent Marketplace</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>Deploy pre-trained neural agents to your Yield Operations Hub OS</p>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agents..."
          style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 8, border: `1px solid ${BDR}`, background: '#ffffff', color: '#0A0F2E', fontSize: 12, outline: 'none' }}
        />
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${category === c ? TEAL : BDR}`, background: category === c ? 'rgba(59,91,250,0.1)' : 'transparent', color: category === c ? TEAL : '#64748B', fontSize: 11, cursor: 'pointer' }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total Agents', value: MARKETPLACE_AGENTS.length },
          { label: 'Free Agents', value: MARKETPLACE_AGENTS.filter(a => a.price === 'Free').length, color: '#22C55E' },
          { label: 'Categories', value: CATEGORIES.length - 1, color: '#A855F7' },
          { label: 'Avg Efficiency', value: `${Math.round(MARKETPLACE_AGENTS.reduce((s, a) => s + a.efficiency, 0) / MARKETPLACE_AGENTS.length)}%`, color: TEAL },
        ].map(s => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color || '#fff', fontFamily: MONO }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Agent grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
        {filtered.map(a => (
          <div key={a.name} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{a.role}</div>
              </div>
              <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, background: a.price === 'Free' ? 'rgba(34,197,94,0.12)' : 'rgba(59,91,250,0.1)', border: `1px solid ${a.price === 'Free' ? 'rgba(34,197,94,0.3)' : 'rgba(59,91,250,0.25)'}`, color: a.price === 'Free' ? '#22C55E' : TEAL, fontWeight: 700 }}>
                {a.price}
              </span>
            </div>

            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, marginBottom: 14, flex: 1 }}>{a.desc}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Efficiency', value: `${a.efficiency}%`, color: TEAL },
                { label: 'Complexity', value: a.complexity, color: COMPLEXITY_COLOR(a.complexity) },
                { label: 'Rating', value: `★ ${a.rating}`, color: '#F59E0B' },
              ].map(m => (
                <div key={m.label} style={{ background: '#F8FAFC', borderRadius: 8, padding: '7px 9px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: m.color, fontFamily: MONO }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, background: '#F8FAFC', border: `1px solid ${BDR}`, color: '#64748B' }}>
                {a.category}
              </span>
              <button
                onClick={() => hire(a.name)}
                disabled={hiring[a.name]}
                style={{ marginLeft: 'auto', padding: '7px 16px', borderRadius: 8, border: `1px solid ${TEAL}`, background: hiring[a.name] ? 'rgba(59,91,250,0.05)' : 'rgba(59,91,250,0.1)', color: TEAL, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                {hiring[a.name] ? 'Deploying...' : 'Hire Agent'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94A3B8', padding: '60px 0' }}>
          No agents match your search.
        </div>
      )}
    </div>
  )
}

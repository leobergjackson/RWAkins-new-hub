// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchAgents, deployAgent, syncAgent, type PFAgent } from '@/lib/palmflow-api'

const TEAL = '#3B5BFA'
const BG = '#ffffff'
const CARD = '#ffffff'
const BDR = '#E2E8F0'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const AGENT_TYPES = ['DeFi Specialist', 'Risk Manager', 'Yield Operations Hub Analyst', 'Marketing AI', 'Product AI', 'Security AI']

export default function AgentsPage() {
  const [agents, setAgents] = useState<PFAgent[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showDeploy, setShowDeploy] = useState(false)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({ name: '', agentType: AGENT_TYPES[0], budget: '' })
  const [deploying, setDeploying] = useState(false)

  useEffect(() => {
    fetchAgents().then(a => { setAgents(a); setLoading(false) })
  }, [])

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.type.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSync(id: string) {
    setBusy(b => ({ ...b, [id]: true }))
    await syncAgent(id)
    toast.success('Agent synced')
    setBusy(b => ({ ...b, [id]: false }))
  }

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault()
    setDeploying(true)
    const res = await deployAgent(form.name, form.agentType, Number(form.budget))
    if (res.ok) {
      toast.success(`Agent deployed — ${res.id}`)
      setShowDeploy(false)
      fetchAgents().then(setAgents)
    }
    setDeploying(false)
  }

  const statusColor = (s: string) => s === 'active' ? '#22C55E' : s === 'idle' ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px', color: '#0A0F2E', fontFamily: '"Inter",system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: TEAL, fontFamily: MONO, letterSpacing: '0.1em', marginBottom: 4 }}>YIELD OPERATIONS HUB / NEURAL WORKFORCE</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Neural Workforce</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>Deploy and monitor autonomous AI agents</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents..."
            style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${BDR}`, background: '#ffffff', color: '#0A0F2E', fontSize: 12, outline: 'none', width: 200 }}
          />
          <button
            onClick={() => setShowDeploy(true)}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${TEAL}`, background: 'rgba(255,255,255,0.1)', color: TEAL, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            + Deploy Agent
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total Agents', value: agents.length },
          { label: 'Active', value: agents.filter(a => a.status === 'active').length, color: '#22C55E' },
          { label: 'Idle', value: agents.filter(a => a.status === 'idle').length, color: '#F59E0B' },
          { label: 'Avg Efficiency', value: agents.length ? `${Math.round(agents.reduce((s, a) => s + a.efficiency, 0) / agents.length)}%` : '—', color: TEAL },
        ].map(s => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color || '#fff', fontFamily: MONO }}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Agent grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>Loading agents...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
          {filtered.map(a => (
            <div key={a.id} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{a.type}</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${statusColor(a.status)}18`, border: `1px solid ${statusColor(a.status)}44`, color: statusColor(a.status) }}>
                  ● {a.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Efficiency', value: `${a.efficiency}%`, color: TEAL },
                  { label: 'Tasks', value: a.tasks, color: '#0A0F2E' },
                  { label: 'Allocation', value: `${a.allocation} USDC`, color: '#A855F7' },
                  { label: 'Rating', value: `★ ${a.rating}`, color: '#F59E0B' },
                ].map(m => (
                  <div key={m.label} style={{ background: '#F8FAFC', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>{m.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: m.color, fontFamily: MONO }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {a.pnlDelta && (
                <div style={{ fontSize: 11, color: '#22C55E', marginBottom: 8, fontFamily: MONO }}>PnL Delta: {a.pnlDelta}</div>
              )}
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 14, lineHeight: 1.5 }}>
                Last: {a.lastAction}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleSync(a.id)}
                  disabled={busy[a.id]}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${TEAL}`, background: busy[a.id] ? 'rgba(59,91,250,0.05)' : 'rgba(59,91,250,0.08)', color: TEAL, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  {busy[a.id] ? 'Syncing...' : '⟳ Sync'}
                </button>
                <button
                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${BDR}`, background: 'transparent', color: '#64748B', fontSize: 11, cursor: 'pointer' }}
                >
                  View Logs
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deploy modal */}
      {showDeploy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#ffffff', border: `1px solid rgba(59,91,250,0.2)`, borderRadius: 14, padding: 32, width: 420, maxWidth: '95vw' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Deploy Neural Agent</div>
            <form onSubmit={handleDeploy}>
              {[
                { label: 'Agent Name', key: 'name', placeholder: 'e.g. Yield Optimizer v2', type: 'text' },
                { label: 'Budget (USDC)', key: 'budget', placeholder: '1000', type: 'number' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BDR}`, background: '#F8FAFC', color: '#0A0F2E', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>Agent Type</label>
                <select
                  value={form.agentType}
                  onChange={e => setForm(p => ({ ...p, agentType: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BDR}`, background: '#ffffff', color: '#0A0F2E', fontSize: 13, outline: 'none' }}
                >
                  {AGENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowDeploy(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${BDR}`, background: 'transparent', color: '#64748B', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={deploying} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${TEAL}`, background: 'rgba(255,255,255,0.1)', color: TEAL, fontWeight: 700, cursor: 'pointer' }}>
                  {deploying ? 'Deploying...' : 'Deploy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchPolicies, createPolicy, togglePolicy, type PFPolicy } from '@/lib/palmflow-api'

const TEAL = '#00E5CC'
const BG = '#080810'
const CARD = 'rgba(255,255,255,0.03)'
const BDR = 'rgba(255,255,255,0.07)'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const POLICY_TYPES = ['spending', 'yield', 'risk']

export default function PolicyPage() {
  const [policies, setPolicies] = useState<PFPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', policyType: 'spending', threshold: '', description: '' })

  useEffect(() => {
    fetchPolicies('demo').then(p => { setPolicies(p); setLoading(false) })
  }, [])

  async function handleToggle(id: string, status: 'active' | 'paused') {
    setBusy(b => ({ ...b, [id]: true }))
    const next = status === 'active' ? 'paused' : 'active'
    await togglePolicy(id, next)
    setPolicies(p => p.map(pol => pol.id === id ? { ...pol, status: next } : pol))
    toast.success(`Policy ${next}`)
    setBusy(b => ({ ...b, [id]: false }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await createPolicy({ ...form, threshold: Number(form.threshold) })
    if (res.ok) {
      toast.success('Policy created')
      setShowCreate(false)
      fetchPolicies('demo').then(setPolicies)
    }
    setCreating(false)
  }

  const typeColor = (t: string) => t === 'spending' ? '#EF4444' : t === 'yield' ? '#22C55E' : '#F59E0B'

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px', color: '#fff', fontFamily: '"Inter",system-ui,sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: TEAL, fontFamily: MONO, letterSpacing: '0.1em', marginBottom: 4 }}>PALMFLOW AI / NEURAL GUARDRAILS</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Neural Guardrails</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Cryptographic policy enforcement for treasury operations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${TEAL}`, background: 'rgba(0,229,204,0.1)', color: TEAL, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          + New Policy
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total Policies', value: policies.length, color: '#fff' },
          { label: 'Active', value: policies.filter(p => p.status === 'active').length, color: '#22C55E' },
          { label: 'Paused', value: policies.filter(p => p.status === 'paused').length, color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: MONO }}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Emergency Lock Banner */}
      {policies.find(p => p.id === 'p1' && p.status === 'active') && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>Emergency Lock Active</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              Abnormal spending velocity detected. All outbound transactions blocked until review.
            </div>
          </div>
        </div>
      )}

      {/* Policies */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>Loading policies...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {policies.map(p => (
            <div key={p.id} style={{ background: CARD, border: `1px solid ${p.status === 'active' ? `${typeColor(p.policyType)}22` : BDR}`, borderRadius: 12, padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${typeColor(p.policyType)}18`, border: `1px solid ${typeColor(p.policyType)}44`, color: typeColor(p.policyType), textTransform: 'capitalize' }}>
                      {p.policyType}
                    </span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: p.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${p.status === 'active' ? 'rgba(34,197,94,0.3)' : BDR}`, color: p.status === 'active' ? '#22C55E' : 'rgba(255,255,255,0.4)' }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{p.description}</div>
                  {p.threshold !== 0 && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      Threshold: <span style={{ color: typeColor(p.policyType), fontFamily: MONO, fontWeight: 700 }}>{p.threshold} {p.unit}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(p.id, p.status)}
                  disabled={busy[p.id]}
                  style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${p.status === 'active' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, background: p.status === 'active' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', color: p.status === 'active' ? '#FCA5A5' : '#22C55E', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {busy[p.id] ? '...' : p.status === 'active' ? '⏸ Pause' : '▶ Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#0e0e1a', border: `1px solid rgba(0,229,204,0.2)`, borderRadius: 14, padding: 32, width: 420, maxWidth: '95vw' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Create Neural Guardrail</div>
            <form onSubmit={handleCreate}>
              {[
                { label: 'Policy Name', key: 'name', placeholder: 'Daily Spending Cap' },
                { label: 'Description', key: 'description', placeholder: 'Max PUSD per 24 hours' },
                { label: 'Threshold', key: 'threshold', placeholder: '1000', type: 'number' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BDR}`, background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Policy Type</label>
                <select
                  value={form.policyType}
                  onChange={e => setForm(p => ({ ...p, policyType: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BDR}`, background: '#0e0e1a', color: '#fff', fontSize: 13, outline: 'none' }}
                >
                  {POLICY_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${BDR}`, background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={creating} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${TEAL}`, background: 'rgba(0,229,204,0.1)', color: TEAL, fontWeight: 700, cursor: 'pointer' }}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

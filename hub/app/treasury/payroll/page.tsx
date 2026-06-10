// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchStreams, createStream, pauseStream, resumeStream, type PFStream } from '@/lib/palmflow-api'

const TEAL = '#3B5BFA'
const BG = '#ffffff'
const CARD = '#ffffff'
const BDR = '#E2E8F0'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const TOKENS = ['USDC', 'MNT', 'USDC']
const ROLES = ['Engineer', 'Designer', 'Marketing', 'Operations', 'Researcher', 'Full Stack Developer', 'Product Manager']

const RATE = 0.015 // USDC streamed per second (demo)

export default function PayrollPage() {
  const [streams, setStreams] = useState<PFStream[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [streamed, setStreamed] = useState(469.8547)
  const [form, setForm] = useState({ recipientName: '', role: ROLES[0], wallet: '', ratePerHour: '', token: 'USDC' })

  useEffect(() => {
    fetchStreams('demo').then(s => { setStreams(s); setLoading(false) })
  }, [])

  /* payroll tick */
  useEffect(() => {
    const id = setInterval(() => setStreamed(p => p + RATE), 1000)
    return () => clearInterval(id)
  }, [])

  async function handlePause(id: string, status: 'active' | 'paused') {
    setBusy(b => ({ ...b, [id]: true }))
    if (status === 'active') {
      await pauseStream(id)
      toast.success('Stream paused')
    } else {
      await resumeStream(id)
      toast.success('Stream resumed')
    }
    fetchStreams('demo').then(setStreams)
    setBusy(b => ({ ...b, [id]: false }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await createStream({ ...form, ratePerHour: Number(form.ratePerHour) })
    if (res.ok) {
      toast.success('Stream created')
      setShowCreate(false)
      fetchStreams('demo').then(setStreams)
    }
    setCreating(false)
  }

  const totalStreamed = streams.reduce((s, st) => s + st.totalStreamed, 0)

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px', color: '#0A0F2E', fontFamily: '"Inter",system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: TEAL, fontFamily: MONO, letterSpacing: '0.1em', marginBottom: 4 }}>YIELD OPERATIONS HUB / PAYROLL</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Payroll Streaming</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>Real-time autonomous payroll on Mantle</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${TEAL}`, background: 'rgba(255,255,255,0.1)', color: TEAL, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          + Create Stream
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Active Streams', value: streams.filter(s => s.status === 'active').length, color: '#22C55E' },
          { label: 'Total Streams', value: streams.length, color: '#0A0F2E' },
          { label: 'Total Streamed', value: `${streamed.toFixed(4)} USDC`, color: TEAL },
          { label: 'Avg Rate', value: streams.length ? `${(streams.reduce((s, st) => s + st.ratePerHour, 0) / streams.length).toFixed(0)} USDC/hr` : '—', color: '#A855F7' },
        ].map(s => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: MONO }}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Streams */}
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Active Streams</div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: 30 }}>Loading...</div>
        ) : streams.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: 30 }}>No payroll streams. Create one to start.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {streams.map(s => (
              <div key={s.id} style={{ background: '#F8FAFC', border: `1px solid ${BDR}`, borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.recipientName}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {s.role} · <span style={{ fontFamily: MONO }}>{s.wallet}</span> · {s.region}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TEAL, fontFamily: MONO }}>
                      {s.id === 's1' ? streamed.toFixed(4) : (s.totalStreamed ?? 0).toFixed(4)} {s.token}
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>Total streamed</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontFamily: MONO }}>
                      {s.ratePerHour} {s.token}/hr
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, background: s.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', border: `1px solid ${s.status === 'active' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`, color: s.status === 'active' ? '#22C55E' : '#F59E0B' }}>
                      ● {s.status}
                    </span>
                    <button
                      onClick={() => handlePause(s.id, s.status)}
                      disabled={busy[s.id]}
                      style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${BDR}`, background: 'transparent', color: '#475569', fontSize: 11, cursor: 'pointer' }}
                    >
                      {busy[s.id] ? '...' : s.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                    </button>
                  </div>
                </div>
                {s.status === 'active' && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ height: 3, borderRadius: 2, background: '#F1F5F9' }}>
                      <div style={{ height: 3, borderRadius: 2, background: TEAL, width: `${Math.min(100, (s.totalStreamed / (s.totalStreamed + 1000)) * 100)}%`, transition: 'width 1s linear' }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#ffffff', border: `1px solid rgba(59,91,250,0.2)`, borderRadius: 14, padding: 32, width: 420, maxWidth: '95vw' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Create Payroll Stream</div>
            <form onSubmit={handleCreate}>
              {[
                { label: 'Recipient Name', key: 'recipientName', placeholder: 'Alex Rivera' },
                { label: 'Wallet Address', key: 'wallet', placeholder: '7xKp...9mQZ' },
                { label: 'Rate (USDC/hr)', key: 'ratePerHour', placeholder: '54', type: 'number' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BDR}`, background: '#F8FAFC', color: '#0A0F2E', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              {[
                { label: 'Role', key: 'role', options: ROLES },
                { label: 'Token', key: 'token', options: TOKENS },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <select
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BDR}`, background: '#ffffff', color: '#0A0F2E', fontSize: 13, outline: 'none' }}
                  >
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${BDR}`, background: 'transparent', color: '#64748B', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={creating} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${TEAL}`, background: 'rgba(255,255,255,0.1)', color: TEAL, fontWeight: 700, cursor: 'pointer' }}>
                  {creating ? 'Creating...' : 'Create Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

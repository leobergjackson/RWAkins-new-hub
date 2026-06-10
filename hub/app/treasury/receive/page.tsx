// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchWallets, fetchPaymentRequests, createPaymentRequest } from '@/lib/palmflow-api'
import type { PFWallet, PFPaymentRequest } from '@/lib/palmflow-api'

const TEAL = '#3B5BFA'
const BG = '#ffffff'
const CARD = '#ffffff'
const BDR = '#E2E8F0'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const ASSETS = ['USDC','MNT','ETH','USDC','USDT','DAI']
const NETWORKS = ['Mantle','Ethereum','Polygon']

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${copied ? TEAL : BDR}`, background:copied?'rgba(59,91,250,0.08)':'transparent', color:copied?TEAL:'#64748B', fontSize:10, cursor:'pointer' }}>
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  )
}

function QRPlaceholder({ data }: { data: string }) {
  const encoded = encodeURIComponent(data)
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encoded}&bgcolor=080810&color=00E5CC&margin=8`}
      alt="QR Code"
      width={140}
      height={140}
      style={{ borderRadius: 10, border: `1px solid rgba(59,91,250,0.2)` }}
      onError={(e) => {
        const el = e.currentTarget
        el.style.display = 'none'
        const parent = el.parentElement
        if (parent) {
          const fb = document.createElement('div')
          fb.style.cssText = 'width:140px;height:140px;border-radius:10px;border:1px solid rgba(59,91,250,0.2);display:flex;align-items:center;justify-content:center;font-size:11px;color:#94A3B8;text-align:center;padding:10px;box-sizing:border-box'
          fb.textContent = 'QR Code'
          parent.appendChild(fb)
        }
      }}
    />
  )
}

export default function ReceivePage() {
  const [wallets, setWallets] = useState<PFWallet[]>([])
  const [requests, setRequests] = useState<PFPaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<PFPaymentRequest | null>(null)
  const [form, setForm] = useState({ amount: '', asset: 'USDC', network: 'Mantle', description: '', expiryDate: '' })
  const [expandedQR, setExpandedQR] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchWallets(), fetchPaymentRequests()]).then(([w, r]) => {
      setWallets(w); setRequests(r); setLoading(false)
    })
  }, [])

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount) return toast.error('Enter an amount')
    setCreating(true)
    const req = await createPaymentRequest({ amount: Number(form.amount), asset: form.asset, network: form.network, description: form.description, expiryDate: form.expiryDate })
    setCreated(req)
    setRequests(p => [req, ...p])
    toast.success('Payment request created!')
    setCreating(false)
  }

  const statusColor = (s: string) => s === 'paid' ? '#22C55E' : s === 'pending' ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px', color: '#0A0F2E', fontFamily: '"Inter",system-ui,sans-serif' }}>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: TEAL, fontFamily: MONO, letterSpacing: '0.1em', marginBottom: 4 }}>YIELD OPERATIONS HUB / RECEIVE</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Receive Payment</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>Share your wallet addresses or create payment requests with QR codes</p>
      </div>

      {/* Wallet Addresses */}
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Your Wallet Addresses</div>
        {loading ? (
          <div style={{ color:'#94A3B8', fontSize:12 }}>Loading wallets...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {wallets.map(w => (
              <div key={w.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:'#F8FAFC', borderRadius:10, border:`1px solid ${BDR}`, flexWrap:'wrap', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  {expandedQR === w.id ? (
                    <div>
                      <QRPlaceholder data={w.address} />
                      <button onClick={() => setExpandedQR(null)} style={{ display:'block', margin:'8px auto 0', background:'none', border:'none', color:TEAL, fontSize:10, cursor:'pointer' }}>Close</button>
                    </div>
                  ) : (
                    <button onClick={() => setExpandedQR(w.id)} style={{ width:48, height:48, borderRadius:8, border:`1px solid rgba(59,91,250,0.2)`, background:'rgba(255,255,255,0.05)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                      ⬛
                    </button>
                  )}
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:3 }}>{w.label}</div>
                    <div style={{ fontSize:10, color:TEAL, marginBottom:3 }}>{w.network}</div>
                    <div style={{ fontFamily:MONO, fontSize:11, color:'#64748B' }}>{w.address}</div>
                    <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{w.balance.toLocaleString()} {w.symbol} · ${w.usdValue.toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <CopyBtn text={w.address} />
                  <button onClick={() => setExpandedQR(w.id === expandedQR ? null : w.id)}
                    style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${BDR}`, background:'transparent', color:'#64748B', fontSize:10, cursor:'pointer' }}>
                    QR Code
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Create Request Form */}
        <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 14, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Create Payment Request</div>
          <form onSubmit={handleCreate}>
            {[
              { label:'AMOUNT *', key:'amount', type:'number', placeholder:'100' },
              { label:'DESCRIPTION', key:'description', type:'text', placeholder:'e.g. Q2 services payment' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#64748B', display:'block', marginBottom:6 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={upd(f.key)} required={f.label.includes('*')}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${BDR}`, background:'#F8FAFC', color: '#0A0F2E', fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              {[
                { label:'ASSET', key:'asset', options:ASSETS },
                { label:'NETWORK', key:'network', options:NETWORKS },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:11, color:'#64748B', display:'block', marginBottom:6 }}>{f.label}</label>
                  <select value={(form as any)[f.key]} onChange={upd(f.key)}
                    style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${BDR}`, background:'#ffffff', color: '#0A0F2E', fontSize:13, outline:'none' }}>
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:11, color:'#64748B', display:'block', marginBottom:6 }}>EXPIRY DATE</label>
              <input type="date" value={form.expiryDate} onChange={upd('expiryDate')}
                style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${BDR}`, background:'#F8FAFC', color: '#0A0F2E', fontSize:13, outline:'none', boxSizing:'border-box' }} />
            </div>
            <button type="submit" disabled={creating}
              style={{ width:'100%', padding:'12px', borderRadius:10, border:`1px solid ${TEAL}`, background:'rgba(255,255,255,0.1)', color:TEAL, fontWeight:700, fontSize:14, cursor:'pointer' }}>
              {creating ? 'Creating...' : '📋 Generate Payment Request'}
            </button>
          </form>
        </div>

        {/* Created request result */}
        <div>
          {created && (
            <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid rgba(59,91,250,0.25)`, borderRadius:14, padding:'22px', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:TEAL, marginBottom:14 }}>✅ Payment Request Created</div>
              <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:14, flexWrap:'wrap' }}>
                <QRPlaceholder data={created.shareLink} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, marginBottom:6 }}>
                    <span style={{ color:'#64748B' }}>Amount: </span>
                    <span style={{ fontWeight:700, fontFamily:MONO, color:'#22C55E' }}>{created.amount} {created.asset}</span>
                  </div>
                  <div style={{ fontSize:12, marginBottom:6 }}>
                    <span style={{ color:'#64748B' }}>Network: </span>{created.network}
                  </div>
                  <div style={{ fontSize:12, marginBottom:6 }}>
                    <span style={{ color:'#64748B' }}>Expires: </span>{created.expiresAt}
                  </div>
                  {created.description && (
                    <div style={{ fontSize:12, marginBottom:6 }}>
                      <span style={{ color:'#64748B' }}>Note: </span>{created.description}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize:10, color:'#94A3B8', marginBottom:8 }}>Share link:</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ flex:1, fontFamily:MONO, fontSize:10, color:'#64748B', wordBreak:'break-all', padding:'8px', background:'#ffffff', borderRadius:6 }}>{created.shareLink}</div>
                <CopyBtn text={created.shareLink} />
              </div>
            </div>
          )}

          {/* Recent requests */}
          <div style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:14, padding:'22px' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Recent Payment Requests</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {requests.map(r => (
                <div key={r.id} style={{ padding:'12px 14px', background:'#F8FAFC', borderRadius:10, border:`1px solid ${BDR}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <div>
                      <span style={{ fontFamily:MONO, fontWeight:700, fontSize:13, color:statusColor(r.status) }}>{r.amount} {r.asset}</span>
                      <span style={{ fontSize:10, color:'#94A3B8', marginLeft:8 }}>{r.network}</span>
                    </div>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:`${statusColor(r.status)}18`, color:statusColor(r.status) }}>
                      {r.status}
                    </span>
                  </div>
                  {r.description && <div style={{ fontSize:11, color:'#64748B', marginBottom:4 }}>{r.description}</div>}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:10, color:'#CBD5E1' }}>Created {r.createdAt} · Exp {r.expiresAt}</div>
                    <CopyBtn text={r.shareLink} />
                  </div>
                </div>
              ))}
              {requests.length === 0 && <div style={{ color:'#94A3B8', fontSize:12, textAlign:'center', padding:'16px 0' }}>No payment requests yet</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

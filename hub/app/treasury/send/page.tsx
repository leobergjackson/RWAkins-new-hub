// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { fetchWallets, suggestRoute, sendPayment } from '@/lib/palmflow-api'
import type { PFWallet, PFSwapRoute } from '@/lib/palmflow-api'

const TEAL = '#3B5BFA'
const BG = '#ffffff'
const CARD = '#ffffff'
const BDR = '#E2E8F0'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const ASSETS = ['USDC','MNT','ETH','USDC','USDT','DAI','MATIC']
const NETWORKS = ['Mantle','Ethereum','Polygon','Base','Optimism']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  )
}
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BDR}`, background: '#F8FAFC', color: '#0A0F2E', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const sel: React.CSSProperties = { ...inp, background: '#ffffff' }

type SendState = { fromWallet: string; toAddress: string; asset: string; amount: string; network: string; memo: string }

export default function SendPage() {
  const [wallets, setWallets] = useState<PFWallet[]>([])
  const [form, setForm] = useState<SendState>({ fromWallet: '', toAddress: '', asset: 'USDC', amount: '', network: 'Mantle', memo: '' })
  const [route, setRoute] = useState<PFSwapRoute | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [slippage, setSlippage] = useState('0.5')

  useEffect(() => { fetchWallets().then(setWallets) }, [])
  useEffect(() => {
    if (!form.toAddress || !form.amount || !form.fromWallet) return
    const t = setTimeout(() => {
      setRouteLoading(true)
      suggestRoute({ from: form.fromWallet, to: form.toAddress, amount: Number(form.amount), fromAsset: form.asset, toNetwork: form.network })
        .then(r => { setRoute(r); setRouteLoading(false) })
    }, 800)
    return () => clearTimeout(t)
  }, [form.toAddress, form.amount, form.fromWallet, form.asset, form.network])

  const upd = (k: keyof SendState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!form.toAddress || !form.amount) return toast.error('Fill in recipient and amount')
    setSending(true)
    const res = await sendPayment({ fromWallet: form.fromWallet, toAddress: form.toAddress, amount: Number(form.amount), asset: form.asset, network: form.network, memo: form.memo, routeId: route?.id })
    setTxHash(res.txHash)
    toast.success(`Payment sent! Tx: ${res.txHash}`)
    setSending(false)
  }

  const selectedWallet = wallets.find(w => w.id === form.fromWallet)
  const usdEquiv = form.amount && selectedWallet ? (Number(form.amount) * (selectedWallet.usdValue / selectedWallet.balance)).toFixed(2) : '0.00'
  const fee = route?.totalCost || 0.25

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px', color: '#0A0F2E', fontFamily: '"Inter",system-ui,sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: TEAL, fontFamily: MONO, letterSpacing: '0.1em', marginBottom: 4 }}>YIELD OPERATIONS HUB / SEND</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Send Payment</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>AI-optimized routing across any blockchain</p>
        </div>

        {txHash && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
            style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.06)', marginBottom: 20, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>Payment Sent!</div>
              <div style={{ fontSize: 11, color: '#64748B', fontFamily: MONO, marginTop: 2 }}>Tx: {txHash}</div>
            </div>
          </motion.div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* Send form */}
          <form onSubmit={handleSend}>
            <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 14, padding: '24px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Payment Details</div>

              <Field label="SEND FROM *">
                <select value={form.fromWallet} onChange={upd('fromWallet')} style={sel} required>
                  <option value="">Select wallet...</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.label} — {w.balance.toLocaleString()} {w.symbol} (${w.usdValue.toLocaleString()})</option>
                  ))}
                </select>
              </Field>

              <Field label="SEND TO *">
                <input value={form.toAddress} onChange={upd('toAddress')} placeholder="0x... or Mantle address or ENS name" style={inp} required />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="ASSET *">
                  <select value={form.asset} onChange={upd('asset')} style={sel}>
                    {ASSETS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </Field>
                <Field label="DESTINATION NETWORK">
                  <select value={form.network} onChange={upd('network')} style={sel}>
                    {NETWORKS.map(n => <option key={n}>{n}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="AMOUNT *">
                <div style={{ position: 'relative' }}>
                  <input type="number" value={form.amount} onChange={upd('amount')} placeholder="0.00" style={{ ...inp, paddingRight: 60 }} required min="0" step="any" />
                  <button type="button" onClick={() => selectedWallet && setForm(p => ({ ...p, amount: String(selectedWallet.balance) }))}
                    style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', padding:'3px 8px', borderRadius:6, border:`1px solid ${BDR}`, background:'rgba(255,255,255,0.08)', color:TEAL, fontSize:10, cursor:'pointer' }}>MAX</button>
                </div>
                {form.amount && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, fontFamily: MONO }}>≈ ${usdEquiv} USD</div>}
              </Field>

              <Field label="MEMO (OPTIONAL)">
                <textarea value={form.memo} onChange={upd('memo') as any} placeholder="Add a note..." rows={2} maxLength={200}
                  style={{ ...inp, resize: 'vertical' as any }} />
              </Field>

              {/* Advanced toggle */}
              <button type="button" onClick={() => setAdvanced(p => !p)} style={{ background:'none', border:'none', color: TEAL, fontSize:12, cursor:'pointer', padding:'4px 0', marginBottom: advanced ? 12 : 0 }}>
                {advanced ? '▲' : '▼'} Advanced Options
              </button>
              {advanced && (
                <div style={{ padding:'12px', background:'#F8FAFC', borderRadius:8, marginBottom:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Field label="SLIPPAGE TOLERANCE">
                    <select value={slippage} onChange={e => setSlippage(e.target.value)} style={sel}>
                      {['0.1','0.5','1.0','2.0','5.0'].map(v => <option key={v} value={v}>{v}%</option>)}
                    </select>
                  </Field>
                  <Field label="GAS PRIORITY">
                    <select style={sel}><option>Standard</option><option>Fast</option><option>Instant</option></select>
                  </Field>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" disabled={sending || !form.toAddress || !form.amount}
                  style={{ flex: 2, padding: '12px', borderRadius: 10, border: `1px solid ${TEAL}`, background: sending ? 'rgba(59,91,250,0.05)' : 'rgba(59,91,250,0.12)', color: TEAL, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  {sending ? 'Sending...' : '💸 Send Payment'}
                </button>
                <button type="button" onClick={() => setForm({ fromWallet:'', toAddress:'', asset:'USDC', amount:'', network:'Mantle', memo:'' })}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${BDR}`, background: 'transparent', color: '#64748B', fontSize: 13, cursor: 'pointer' }}>
                  Clear
                </button>
              </div>
            </div>
          </form>

          {/* AI Route panel */}
          <div>
            <div style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 14, padding: '22px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#A855F7', marginBottom: 4 }}>🤖 AI Route Suggestion</div>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 14 }}>Nomad agent optimizing your route...</div>
              {routeLoading ? (
                <div style={{ textAlign:'center', color:'#94A3B8', fontSize:12, padding:'20px 0' }}>Optimizing route...</div>
              ) : route ? (
                <>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                    {route.steps.map((s, i) => (
                      <div key={i} style={{ padding:'10px 12px', background:'#ffffff', borderRadius:8 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#A855F7' }}>{s.protocol}</div>
                        <div style={{ fontSize:10, color:'#64748B', marginTop:2 }}>
                          {s.network} · Impact: {s.priceImpact}% · Fee: ${s.fee}
                        </div>
                      </div>
                    ))}
                  </div>
                  {[
                    { label:'Estimated Cost', value:`$${route.totalCost}`, color:TEAL },
                    { label:'Execution Time', value:`~${route.executionTime}s`, color: '#0A0F2E' },
                    { label:'Expected Output', value:`${route.expectedOutput.toLocaleString()} ${form.asset}`, color:'#22C55E' },
                    { label:'Confidence', value:`${route.confidence}%`, color:'#22C55E' },
                    { label:'Slippage', value:`${route.slippage}%`, color:'#F59E0B' },
                  ].map(r => (
                    <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
                      <span style={{ color:'#64748B' }}>{r.label}</span>
                      <span style={{ color:r.color, fontFamily:MONO, fontWeight:600 }}>{r.value}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ fontSize:12, color:'#CBD5E1', textAlign:'center', padding:'12px 0' }}>
                  Fill in recipient and amount to see AI route
                </div>
              )}
            </div>

            {/* Transaction Summary */}
            <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 14, padding: '18px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Transaction Summary</div>
              {[
                { label:'Amount', value: form.amount ? `${form.amount} ${form.asset}` : '—' },
                { label:'Network Fee', value:`$${fee}`, note:'AI optimized' },
                { label:'Expected Arrival', value: route ? `~${route.executionTime}s` : '~30s' },
                { label:'Route', value: route?.label || 'Direct transfer' },
                { label:'Total Cost', value: form.amount ? `${form.amount} ${form.asset} + $${fee}` : '—' },
              ].map(s => (
                <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8, fontSize:12 }}>
                  <span style={{ color:'#64748B' }}>{s.label}</span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color: '#0A0F2E', fontFamily:MONO }}>{s.value}</div>
                    {s.note && <div style={{ fontSize:9, color:TEAL }}>{s.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

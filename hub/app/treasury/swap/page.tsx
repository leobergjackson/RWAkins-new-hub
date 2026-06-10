// Built by vsrupeshkumar
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { getSwapQuote, executeSwap } from '@/lib/palmflow-api'
import { PF_SWAP_ROUTES } from '@/lib/palmflow-fallbacks'
import type { PFSwapRoute } from '@/lib/palmflow-api'

const TEAL = '#3B5BFA'
const BG = '#ffffff'
const CARD = '#ffffff'
const BDR = '#E2E8F0'
const MONO = '"JetBrains Mono","Fira Code",monospace'

const ASSETS = ['MNT','ETH','USDC','USDT','DAI','MATIC','USDC']
const NETWORKS = ['Mantle','Ethereum','Polygon']

const MOCK_PRICES: Record<string, number> = { MNT:0.65, ETH:2984, USDC:1, USDT:1, DAI:1, MATIC:0.99, USDY:1.08 }

export default function SwapPage() {
  const [fromAsset, setFromAsset] = useState('MNT')
  const [toAsset, setToAsset]   = useState('USDC')
  const [fromAmount, setFromAmount] = useState('10')
  const [fromNetwork, setFromNetwork] = useState('Mantle')
  const [toNetwork, setToNetwork] = useState('Mantle')
  const [slippage, setSlippage] = useState('0.5')
  const [routes, setRoutes] = useState<PFSwapRoute[]>(PF_SWAP_ROUTES)
  const [selectedRoute, setSelectedRoute] = useState<PFSwapRoute>(PF_SWAP_ROUTES[0])
  const [quoting, setQuoting] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [showRoutes, setShowRoutes] = useState(false)

  const fromPrice = MOCK_PRICES[fromAsset] || 1
  const toPrice   = MOCK_PRICES[toAsset] || 1
  const expectedOut = fromAmount ? ((Number(fromAmount) * fromPrice) / toPrice).toFixed(6) : '0'
  const minOut = fromAmount ? (Number(expectedOut) * (1 - Number(slippage) / 100)).toFixed(6) : '0'

  useEffect(() => {
    if (!fromAmount || !fromAsset || !toAsset) return
    const t = setTimeout(() => {
      setQuoting(true)
      getSwapQuote({ fromAsset, toAsset, amount: Number(fromAmount), fromNetwork, toNetwork })
        .then(r => { setRoutes(r.routes); setSelectedRoute(r.bestRoute) })
        .finally(() => setQuoting(false))
    }, 600)
    return () => clearTimeout(t)
  }, [fromAsset, toAsset, fromAmount, fromNetwork, toNetwork])

  function flipAssets() {
    setFromAsset(toAsset); setToAsset(fromAsset)
    setFromNetwork(toNetwork); setToNetwork(fromNetwork)
  }

  async function handleSwap(e: React.FormEvent) {
    e.preventDefault()
    if (!fromAmount) return toast.error('Enter an amount')
    setExecuting(true)
    const res = await executeSwap({ fromAsset, toAsset, amount: Number(fromAmount), slippageTolerance: Number(slippage), routeId: selectedRoute.id })
    setTxHash(res.txHash)
    toast.success(`Swap executed! Tx: ${res.txHash}`)
    setExecuting(false)
  }

  const routeColor = (i: number) => [TEAL, '#22C55E', '#F59E0B'][i] || '#fff'

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px', color: '#0A0F2E', fontFamily: '"Inter",system-ui,sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: TEAL, fontFamily: MONO, letterSpacing: '0.1em', marginBottom: 4 }}>YIELD OPERATIONS HUB / SWAP</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Swap Assets</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>AI-optimized DEX routing across Mantle, Ethereum and more</p>
        </div>

        {txHash && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
            style={{ padding:'14px 18px', borderRadius:10, border:'1px solid rgba(34,197,94,0.4)', background:'rgba(34,197,94,0.06)', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:20 }}>✅</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#22C55E' }}>Swap Executed!</div>
              <div style={{ fontSize:11, color:'#64748B', fontFamily:MONO, marginTop:2 }}>Tx: {txHash}</div>
            </div>
          </motion.div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>

          {/* Route Visualization */}
          <div>
            <div style={{ background:'rgba(168,85,247,0.04)', border:'1px solid rgba(168,85,247,0.2)', borderRadius:14, padding:'22px', marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#A855F7', marginBottom:14 }}>🔀 Execution Path</div>
              {quoting ? (
                <div style={{ color:'#94A3B8', fontSize:12, textAlign:'center', padding:'16px 0' }}>Getting best price...</div>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                    <span style={{ padding:'6px 12px', background:'rgba(255,255,255,0.1)', borderRadius:8, fontSize:12, fontWeight:700, color:TEAL, fontFamily:MONO }}>{fromAsset}</span>
                    {selectedRoute.steps.map((s, i) => (
                      <span key={i} style={{ display:'contents' }}>
                        <span style={{ color:'#94A3B8', fontSize:14 }}>→</span>
                        <span style={{ padding:'5px 10px', background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.2)', borderRadius:6, fontSize:10, color:'#A855F7' }}>{s.protocol}</span>
                      </span>
                    ))}
                    <span style={{ color:'#94A3B8', fontSize:14 }}>→</span>
                    <span style={{ padding:'6px 12px', background:'rgba(34,197,94,0.1)', borderRadius:8, fontSize:12, fontWeight:700, color:'#22C55E', fontFamily:MONO }}>{toAsset}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                    {selectedRoute.steps.map((s, i) => (
                      <div key={i} style={{ padding:'10px 12px', background:'#ffffff', borderRadius:8 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#A855F7' }}>{s.protocol}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#64748B', marginTop:3 }}>
                          <span>{s.network}</span>
                          <span>Impact: {s.priceImpact}% · Fee: ${s.fee}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {[
                    { label:'Total Cost', value:`$${selectedRoute.totalCost}` },
                    { label:'Exec Time', value:`~${selectedRoute.executionTime}s` },
                    { label:'Expected', value:`${expectedOut} ${toAsset}` },
                    { label:'Confidence', value:`${selectedRoute.confidence}%` },
                  ].map(r => (
                    <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:5 }}>
                      <span style={{ color:'#64748B' }}>{r.label}</span>
                      <span style={{ color: '#0A0F2E', fontFamily:MONO }}>{r.value}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Alternative routes */}
            <div style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:14, padding:'18px' }}>
              <button onClick={() => setShowRoutes(p => !p)} style={{ background:'none', border:'none', color:TEAL, fontSize:12, cursor:'pointer', fontWeight:600, padding:0, width:'100%', textAlign:'left', marginBottom:showRoutes?12:0 }}>
                {showRoutes ? '▲' : '▼'} Alternative Routes ({routes.length})
              </button>
              {showRoutes && routes.map((r, i) => (
                <div key={r.id} onClick={() => setSelectedRoute(r)}
                  style={{ padding:'11px 12px', background: r.id === selectedRoute.id ? `rgba(59,91,250,0.06)` : '#F8FAFC', border:`1px solid ${r.id === selectedRoute.id ? 'rgba(59,91,250,0.3)' : BDR}`, borderRadius:10, marginBottom:8, cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:routeColor(i) }}>{r.label}</span>
                    {r.id === selectedRoute.id && <span style={{ fontSize:9, color:TEAL }}>SELECTED</span>}
                  </div>
                  <div style={{ fontSize:10, color:'#64748B', display:'flex', gap:12 }}>
                    <span>Cost: ${r.totalCost}</span>
                    <span>Impact: {r.steps[0]?.priceImpact}%</span>
                    <span>~{r.executionTime}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Swap Form */}
          <div>
            <form onSubmit={handleSwap} style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:14, padding:'24px' }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:20 }}>Swap</div>

              {/* From */}
              <div style={{ background:'#ffffff', borderRadius:12, padding:'16px', marginBottom:8 }}>
                <label style={{ fontSize:11, color:'#64748B', marginBottom:8, display:'block', fontWeight:600 }}>SELL</label>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <input type="number" value={fromAmount} onChange={e => setFromAmount(e.target.value)} placeholder="0.00" min="0" step="any"
                    style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:28, fontWeight:700, color: '#0A0F2E', fontFamily:MONO, width:0 }} />
                  <div>
                    <select value={fromAsset} onChange={e => setFromAsset(e.target.value)}
                      style={{ padding:'8px 12px', borderRadius:8, border:`1px solid rgba(59,91,250,0.3)`, background:'rgba(255,255,255,0.08)', color:TEAL, fontSize:13, fontWeight:700, outline:'none', cursor:'pointer' }}>
                      {ASSETS.map(a => <option key={a}>{a}</option>)}
                    </select>
                    <div style={{ fontSize:10, color:'#94A3B8', textAlign:'right', marginTop:3 }}>≈ ${(Number(fromAmount||0) * fromPrice).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ fontSize:10, color:'#94A3B8', marginTop:6 }}>
                  Network:
                  <select value={fromNetwork} onChange={e => setFromNetwork(e.target.value)} style={{ marginLeft:6, background:'none', border:'none', color:'#64748B', fontSize:10, outline:'none', cursor:'pointer' }}>
                    {NETWORKS.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              {/* Flip button */}
              <div style={{ textAlign:'center', marginBottom:8 }}>
                <motion.button type="button" onClick={flipAssets} whileHover={{ rotate:180 }} transition={{ duration:0.3 }}
                  style={{ width:36, height:36, borderRadius:'50%', border:`1px solid rgba(59,91,250,0.3)`, background:'rgba(255,255,255,0.08)', color:TEAL, fontSize:18, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                  ⇅
                </motion.button>
              </div>

              {/* To */}
              <div style={{ background:'#ffffff', borderRadius:12, padding:'16px', marginBottom:20 }}>
                <label style={{ fontSize:11, color:'#64748B', marginBottom:8, display:'block', fontWeight:600 }}>BUY</label>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ flex:1, fontSize:28, fontWeight:700, color:'#22C55E', fontFamily:MONO }}>{expectedOut}</div>
                  <div>
                    <select value={toAsset} onChange={e => setToAsset(e.target.value)}
                      style={{ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(34,197,94,0.3)', background:'rgba(34,197,94,0.08)', color:'#22C55E', fontSize:13, fontWeight:700, outline:'none', cursor:'pointer' }}>
                      {ASSETS.map(a => <option key={a}>{a}</option>)}
                    </select>
                    <div style={{ fontSize:10, color:'#94A3B8', textAlign:'right', marginTop:3 }}>≈ ${(Number(expectedOut||0) * toPrice).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ fontSize:10, color:'#94A3B8', marginTop:6 }}>
                  Network:
                  <select value={toNetwork} onChange={e => setToNetwork(e.target.value)} style={{ marginLeft:6, background:'none', border:'none', color:'#64748B', fontSize:10, outline:'none', cursor:'pointer' }}>
                    {NETWORKS.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              {/* Details */}
              <div style={{ background:'#F8FAFC', borderRadius:10, padding:'14px', marginBottom:20 }}>
                {[
                  { label:'Price Impact', value:`${selectedRoute.steps[0]?.priceImpact || 0.2}%`, color:'#22C55E' },
                  { label:'Minimum Received', value:`${minOut} ${toAsset}`, color: '#0A0F2E' },
                  { label:'Route', value:selectedRoute.label, color:'#A855F7' },
                  { label:'Total Fee', value:`$${selectedRoute.totalCost}`, color:TEAL },
                  { label:'Slippage', value:`${slippage}%`, color:'#F59E0B' },
                ].map(d => (
                  <div key={d.label} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:7 }}>
                    <span style={{ color:'#64748B' }}>{d.label}</span>
                    <span style={{ color:d.color, fontFamily:MONO, fontWeight:600 }}>{d.value}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, borderTop:`1px solid ${BDR}`, paddingTop:8 }}>
                  <span style={{ fontSize:11, color:'#64748B' }}>Slippage Tolerance</span>
                  <div style={{ display:'flex', gap:6 }}>
                    {['0.1','0.5','1.0'].map(v => (
                      <button key={v} type="button" onClick={() => setSlippage(v)}
                        style={{ padding:'3px 9px', borderRadius:6, border:`1px solid ${slippage===v?TEAL:BDR}`, background:slippage===v?'rgba(59,91,250,0.1)':'transparent', color:slippage===v?TEAL:'#64748B', fontSize:10, cursor:'pointer' }}>
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <motion.button type="submit" disabled={executing || !fromAmount}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ width:'100%', padding:'14px', borderRadius:12, border:`1px solid ${TEAL}`, background:executing?'rgba(59,91,250,0.05)':'rgba(59,91,250,0.12)', color:TEAL, fontWeight:800, fontSize:15, cursor:'pointer' }}>
                {executing ? 'Executing Swap...' : `🔄 Swap ${fromAsset} → ${toAsset}`}
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { loadWallet, persistWallet } from '@/lib/wallet-utils'
import {
  fetchTreasury, fetchAgents, askAdvisor,
  type TreasuryData,
} from '@/lib/palmflow-api'
import { PF_ACTIVITY_POOL, type PFAgent } from '@/lib/palmflow-fallbacks'

type PhantomProvider = {
  isPhantom?: boolean
  connect: () => Promise<{ publicKey: { toString: () => string } }>
}

type FeedItem = { id: string; agent: string; action: string; timestamp: string }

const TEAL = '#00E5CC'
const BG = '#080810'
const CARD = 'rgba(255,255,255,0.03)'
const BDR = 'rgba(255,255,255,0.07)'
const MONO = '"JetBrains Mono","Fira Code",monospace'

function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function short(addr: string) {
  return addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr
}

const SVG_W = 600, SVG_H = 120, PAD = 10
function buildPath(data: number[]) {
  if (!data.length) return ''
  const mn = Math.min(...data), mx = Math.max(...data)
  const range = mx - mn || 1
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (SVG_W - PAD * 2)
    const y = SVG_H - PAD - ((v - mn) / range) * (SVG_H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `M${pts.join('L')}`
}

export default function TreasuryDashboard() {
  const [wallet, setWallet] = useState('')
  const [treasury, setTreasury] = useState<TreasuryData | null>(null)
  const [agents, setAgents] = useState<PFAgent[]>([])
  const [activity, setActivity] = useState<FeedItem[]>([])
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const poolIdx = useRef(0)

  useEffect(() => {
    const saved = loadWallet('solana')
    if (saved) setWallet(saved)
  }, [])

  useEffect(() => {
    if (!wallet) return
    setLoading(true)
    Promise.all([fetchTreasury(wallet), fetchAgents()])
      .then(([t, a]) => {
        setTreasury(t)
        setAgents(a)
        setIsDemo(false)
        setActivity(
          PF_ACTIVITY_POOL.slice(0, 6).map((p, i) => ({
            ...p, id: `i${i}`, timestamp: ts(),
          }))
        )
      })
      .catch(() => setIsDemo(true))
      .finally(() => setLoading(false))
  }, [wallet])

  /* auto-append activity in demo mode */
  useEffect(() => {
    if (!isDemo && !treasury) return
    if (!treasury) {
      import('@/lib/palmflow-api').then(m => m.fetchTreasury('demo')).then(t => {
        setTreasury(t)
        setAgents([])
        setIsDemo(true)
        setActivity(
          PF_ACTIVITY_POOL.slice(0, 6).map((p, i) => ({ ...p, id: `d${i}`, timestamp: ts() }))
        )
      })
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      const item = PF_ACTIVITY_POOL[poolIdx.current % PF_ACTIVITY_POOL.length]
      poolIdx.current++
      setActivity(p => [{ ...item, id: `a${Date.now()}`, timestamp: ts() }, ...p.slice(0, 19)])
    }, 5000)
    return () => clearInterval(id)
  }, [])

  async function connectWallet() {
    try {
      const phantom = (window as any).solana as PhantomProvider | undefined
      if (!phantom?.isPhantom) throw new Error('Phantom wallet not installed.')
      const res = await phantom.connect()
      const addr = res.publicKey.toString()
      setWallet(addr)
      persistWallet('solana', addr)
      toast.success('Phantom connected')
    } catch (e: any) {
      toast.error(e?.message || 'Wallet connection failed')
    }
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim()) return
    const question = chatInput.trim()
    setChatInput('')
    setChatHistory(h => [...h, { role: 'user', text: question }])
    setChatLoading(true)
    const reply = await askAdvisor(question, treasury)
    setChatHistory(h => [...h, { role: 'ai', text: reply }])
    setChatLoading(false)
  }

  const t = treasury
  const chartPath = t ? buildPath(t.chartData) : ''
  const chartFill = t ? `${chartPath}L${SVG_W - PAD},${SVG_H - PAD}L${PAD},${SVG_H - PAD}Z` : ''

  const kpis = [
    { label: 'Total Liquidity',  value: t ? `${t.totalLiquidity.toLocaleString()} PUSD` : '—', icon: '💎', color: TEAL },
    { label: 'Network Flow',     value: t ? `$${t.networkFlow.toLocaleString()}` : '—',          icon: '🔁', color: '#A855F7' },
    { label: 'Protocol Yield',   value: t ? `$${t.protocolYield.toLocaleString()}` : '—',        icon: '📈', color: '#22C55E' },
    { label: 'Active Agents',    value: t ? String(t.activeAgents) : '—',                        icon: '🤖', color: '#F59E0B' },
  ]

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '24px', fontFamily: '"Inter",system-ui,sans-serif', color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: TEAL, fontFamily: MONO, letterSpacing: '0.1em', marginBottom: 4 }}>
            PALMFLOW AI / NEURAL TREASURY OS
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Treasury Dashboard</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Autonomous treasury & neural workforce management on Solana
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, border: `1px solid ${isDemo ? 'rgba(255,255,255,0.15)' : 'rgba(0,229,204,0.4)'}`, color: isDemo ? 'rgba(255,255,255,0.4)' : TEAL, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isDemo ? '#666' : TEAL }} />
            {isDemo ? 'Demo Mode' : 'Live'}
          </span>
          <span style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(168,85,247,0.3)', color: '#C084FC', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A855F7' }} />
            Solana Devnet
          </span>
          <button
            onClick={connectWallet}
            style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${TEAL}`, background: wallet ? 'rgba(0,229,204,0.1)' : 'transparent', color: TEAL, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {wallet ? short(wallet) : 'Connect Phantom'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: MONO }}>
                  {loading ? <span style={{ opacity: 0.3 }}>——</span> : k.value}
                </div>
              </div>
              <span style={{ fontSize: 22 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Sentinel row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, marginBottom: 20 }}>

        {/* SVG Chart */}
        <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Treasury Analytics</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>7-day balance history (PUSD)</div>
          <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEAL} stopOpacity="0.3" />
                <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
              </linearGradient>
            </defs>
            {chartFill && <path d={chartFill} fill="url(#chartGrad)" />}
            {chartPath && <path d={chartPath} fill="none" stroke={TEAL} strokeWidth="2" />}
          </svg>
          {t && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {t.chartLabels.map(l => (
                <span key={l} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{l}</span>
              ))}
            </div>
          )}
        </div>

        {/* Neural Sentinel */}
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>🛡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Neural Sentinel</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Security Guardian</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 10, padding: '3px 9px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444' }}>
              🔒 LOCK ACTIVE
            </span>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 11, color: '#FCA5A5' }}>
            Emergency Lock: Abnormal spending velocity detected.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Transactions Blocked', value: '3', color: '#EF4444' },
              { label: 'Policy Checks', value: '100%', color: '#22C55E' },
              { label: 'Risk Score', value: 'LOW', color: '#22C55E' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{r.label}</span>
                <span style={{ color: r.color, fontWeight: 700, fontFamily: MONO }}>{r.value}</span>
              </div>
            ))}
          </div>
          <Link href="/treasury/policy">
            <button style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Security Audit →
            </button>
          </Link>
        </div>
      </div>

      {/* Workforce + Activity + Advisor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 360px', gap: 12, marginBottom: 20 }}>

        {/* Active Workforce */}
        <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Active Workforce</div>
            <Link href="/treasury/agents" style={{ fontSize: 11, color: TEAL, textDecoration: 'none' }}>View all →</Link>
          </div>
          {(agents.length ? agents.slice(0, 4) : [
            { id:'a1', name:'Arbitrage Hunter', type:'DeFi Specialist', status:'active' as const, efficiency:100, allocation:500, resourceUsed:0, lastAction:'Arbitrage cycle on Solana DEXs', rating:4.9, tasks:24 },
            { id:'a2', name:'Atlas', type:'Product AI', status:'active' as const, efficiency:100, allocation:1000, resourceUsed:0, lastAction:'Product roadmap analysis complete', rating:5.0, tasks:12 },
            { id:'a5', name:'Risk Manager', type:'Risk Manager', status:'active' as const, efficiency:100, allocation:5000, resourceUsed:10, lastAction:'Emergency lock engaged', rating:5.0, tasks:8 },
            { id:'a7', name:'Marketing AI', type:'Ad Buying & Growth', status:'idle' as const, efficiency:100, allocation:25000, resourceUsed:18200, lastAction:'Ad campaigns paused', rating:4.8, tasks:45 },
          ]).map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${BDR}` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{a.type}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: a.status === 'active' ? '#22C55E' : '#F59E0B' }}>
                  ● {a.status}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>{a.efficiency}% eff.</div>
              </div>
            </div>
          ))}
        </div>

        {/* Neural Activity Feed */}
        <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL, display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Neural Activity Feed
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
            {activity.map(a => (
              <div key={a.id} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, borderLeft: `2px solid ${TEAL}` }}>
                <div style={{ fontSize: 10, color: TEAL, fontFamily: MONO, marginBottom: 2 }}>{a.agent}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{a.action}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{a.timestamp}</div>
              </div>
            ))}
            {activity.length === 0 && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>
                Connect wallet to load activity
              </div>
            )}
          </div>
        </div>

        {/* Neural Advisor */}
        <div style={{ background: CARD, border: `1px solid rgba(0,229,204,0.12)`, borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: TEAL }}>⚡ Neural Advisor</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>AI-powered treasury intelligence</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
            {chatHistory.length === 0 && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                Ask about treasury balance, agent performance, yield strategy, or risk...
              </div>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} style={{
                padding: '8px 10px', borderRadius: 8, fontSize: 12,
                background: m.role === 'user' ? 'rgba(0,229,204,0.08)' : 'rgba(255,255,255,0.04)',
                color: m.role === 'user' ? TEAL : 'rgba(255,255,255,0.8)',
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '90%',
              }}>
                {m.text}
              </div>
            ))}
            {chatLoading && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Thinking...</div>
            )}
          </div>
          <form onSubmit={sendChat} style={{ display: 'flex', gap: 6 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask the advisor..."
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${BDR}`, background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 12, outline: 'none' }}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${TEAL}`, background: chatLoading ? 'transparent' : 'rgba(0,229,204,0.1)', color: TEAL, fontSize: 12, cursor: 'pointer' }}
            >
              →
            </button>
          </form>
        </div>
      </div>

      {/* Asset Allocation */}
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Asset Allocation</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {[
            { symbol: 'SOL',  name: 'Solana',           amount: '0.984',     pct: 0,  color: '#A855F7' },
            { symbol: 'PUSD', name: 'PalmFlow USD',      amount: '999,945',   pct: 100, color: TEAL },
            { symbol: 'KMN',  name: 'Kamino (Yield)',    amount: '3,500',     pct: 35,  color: '#22C55E' },
            { symbol: 'RYD',  name: 'Raydium (Yield)',   amount: '2,800',     pct: 28,  color: '#60A5FA' },
            { symbol: 'JITO', name: 'Jito (Yield)',      amount: '2,000',     pct: 20,  color: '#F59E0B' },
          ].map(a => (
            <div key={a.symbol} style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: `1px solid rgba(255,255,255,0.05)` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: a.color, fontFamily: MONO }}>{a.symbol}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{a.pct}%</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{a.name}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, fontFamily: MONO }}>{a.amount}</div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 8 }}>
                <div style={{ height: 3, borderRadius: 2, width: `${a.pct}%`, background: a.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

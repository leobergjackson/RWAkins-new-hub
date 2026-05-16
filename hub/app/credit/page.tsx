'use client'

import { useEffect, useMemo, useState } from 'react'
import { CREDITBLOCKS_API } from '../../lib/api'
import { fallbackCreditScore } from '../../lib/fallback'
import {
  isMetaMaskInstalled,
  truncateAddress,
  switchToQIE,
  WALLET_INSTALL_LINKS,
  QIE_MAINNET,
} from '../../lib/wallet-utils'
import DemoBanner from '../components/DemoBanner'

type ScoreData = {
  score: number
  grade?: string
  wallet?: string
  history?: number[]
  factors?: {
    transactionHistory?: number
    walletAge?: number
    defiActivity?: number
    repaymentRate?: number
  }
  nftMinted?: boolean
}

type ChatMsg = { role: 'user' | 'ai'; content: string; timestamp: Date }

const EXPLORER = 'https://mainnet.qie.digital'

function Sparkline({ data }: { data: number[] }) {
  if (!data?.length) return null
  const w = 280, h = 70, pad = 6
  const min = Math.min(...data), max = Math.max(...data)
  const range = Math.max(1, max - min)
  const pts = data
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (data.length - 1)
      const y = h - pad - ((v - min) / range) * (h - pad * 2)
      return `${x},${y}`
    })
    .join(' ')
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }}>
        <polyline points={pts} fill="none" stroke="#F5C518" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((v, i) => {
          const x = pad + (i * (w - pad * 2)) / (data.length - 1)
          const y = h - pad - ((v - min) / range) * (h - pad * 2)
          return <circle key={i} cx={x} cy={y} r="2.5" fill="#F5C518" />
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6, marginTop: 4 }}>
        <span>min {min}</span>
        <span>max {max}</span>
      </div>
    </div>
  )
}

function FactorBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span>{label}</span>
        <span className="gold-text">{v}%</span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', background: 'linear-gradient(90deg,#F5C518,#FFD95C)', borderRadius: 999 }} />
      </div>
    </div>
  )
}

export default function CreditPage() {
  const [wallet, setWallet] = useState('')
  const [data, setData] = useState<ScoreData | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [minting, setMinting] = useState(false)
  const [error, setError] = useState('')
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const installed = useMemo(() => (typeof window === 'undefined' ? true : isMetaMaskInstalled()), [])

  async function connect() {
    setError('')
    try {
      if (!isMetaMaskInstalled()) throw new Error('MetaMask is not installed.')
      await switchToQIE()
      const accounts = (await (window as any).ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      setWallet(accounts[0] || '')
    } catch (err: any) {
      setError(err?.message || 'Unable to connect wallet.')
    }
  }

  async function loadScore(addr: string) {
    if (!addr) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${CREDITBLOCKS_API}/api/score/${addr}`)
      if (!res.ok) throw new Error('offline')
      const json = await res.json()
      setData({ ...json, wallet: addr })
      setIsDemo(false)
    } catch {
      setData({ ...fallbackCreditScore, wallet: addr })
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }

  async function generateScore() {
    if (!wallet) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${CREDITBLOCKS_API}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet, chainId: 1990 }),
      })
      if (!res.ok) throw new Error('offline')
      const json = await res.json()
      setData({ ...json, wallet })
      setIsDemo(false)
    } catch {
      setData({ ...fallbackCreditScore, wallet })
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }

  async function mintNFT() {
    if (!wallet) return
    setMinting(true)
    setError('')
    try {
      const res = await fetch(`${CREDITBLOCKS_API}/api/score/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet }),
      })
      if (!res.ok) throw new Error('Mint failed')
      const json = await res.json()
      setData((prev) => (prev ? { ...prev, nftMinted: true, ...json } : prev))
    } catch (err: any) {
      setError(err?.message || 'Mint failed — backend offline.')
    } finally {
      setMinting(false)
    }
  }

  async function sendChat() {
    const text = input.trim()
    if (!text) return
    const userMsg: ChatMsg = { role: 'user', content: text, timestamp: new Date() }
    setChat((prev) => [...prev, userMsg])
    setInput('')
    setChatLoading(true)
    try {
      const res = await fetch(`${CREDITBLOCKS_API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, wallet }),
      })
      if (!res.ok) throw new Error('offline')
      const json = await res.json()
      setChat((prev) => [...prev, { role: 'ai', content: json.reply || json.message || '(no reply)', timestamp: new Date() }])
    } catch {
      setChat((prev) => [
        ...prev,
        { role: 'ai', content: 'Backend is offline. Connect a wallet on QIE Mainnet (chain ID 1990) and ensure CREDITBLOCKS_API is reachable.', timestamp: new Date() },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => { if (wallet) loadScore(wallet) }, [wallet])

  return (
    <main className="container" style={{ padding: '40px 24px' }}>
      <header style={{ marginBottom: 24 }}>
        <p className="eyebrow">Credit Passport</p>
        <h1>On-chain credit score</h1>
        <p className="silver-text">AI-powered. Soulbound NFT on QIE Mainnet (Chain ID 1990).</p>
      </header>

      {isDemo && <DemoBanner />}

      {!installed && (
        <div className="card">
          <p>MetaMask is required for this tool.</p>
          <a className="btn-gold" href={WALLET_INSTALL_LINKS.metamask} target="_blank" rel="noopener noreferrer">Install MetaMask</a>
        </div>
      )}

      {installed && !wallet && (
        <div className="card">
          <p>Connect MetaMask on QIE Mainnet to generate or view your credit score.</p>
          <button className="btn-gold" onClick={connect}>Connect Wallet</button>
          {error && <p style={{ color: '#F87171', marginTop: 8 }}>{error}</p>}
        </div>
      )}

      {wallet && (
        <>
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p className="silver-text" style={{ fontSize: 12 }}>WALLET</p>
                <p style={{ fontFamily: 'monospace' }}>{truncateAddress(wallet)}</p>
              </div>
              <span className="chain-badge"><span className="chain-dot" /> {QIE_MAINNET.chainName}</span>
              <button className="btn-outline" onClick={() => setWallet('')}>Disconnect</button>
            </div>
          </section>

          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p className="silver-text" style={{ fontSize: 12 }}>YOUR SCORE</p>
                <h2 className="gold-text" style={{ fontSize: 64, lineHeight: 1, margin: '4px 0' }}>{data?.score ?? '—'}</h2>
                <p>Grade: <strong className="gold-text">{data?.grade ?? '—'}</strong></p>
                {data?.nftMinted ? (
                  <p style={{ marginTop: 8 }}>
                    Score on-chain ✅ &middot;{' '}
                    <a href={`${EXPLORER}/address/${wallet}`} target="_blank" rel="noopener noreferrer" className="gold-text">View on Explorer</a>
                  </p>
                ) : data && (
                  <button className="btn-gold" style={{ marginTop: 12 }} onClick={mintNFT} disabled={minting}>
                    {minting ? <span className="spinner" /> : 'Mint as NFT'}
                  </button>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <p className="silver-text" style={{ fontSize: 12, marginBottom: 4 }}>HISTORY</p>
                <Sparkline data={data?.history && data.history.length ? data.history : fallbackCreditScore.history} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <button className="btn-gold" onClick={generateScore} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Regenerate Score'}
              </button>
              <button className="btn-outline" onClick={() => loadScore(wallet)} disabled={loading}>Refresh</button>
            </div>
            {error && <p style={{ color: '#F87171', marginTop: 8 }}>{error}</p>}
          </section>

          <section className="card">
            <h3>Score breakdown</h3>
            {(() => {
              const f = data?.factors || fallbackCreditScore.factors
              return (
                <>
                  <FactorBar label="Transaction History" value={f.transactionHistory ?? 0} />
                  <FactorBar label="Wallet Age"          value={f.walletAge ?? 0} />
                  <FactorBar label="DeFi Activity"       value={f.defiActivity ?? 0} />
                  <FactorBar label="Repayment Rate"      value={f.repaymentRate ?? 0} />
                </>
              )
            })()}
          </section>

          <section className="card">
            <h3>Q-Loan AI advisor</h3>
            <p className="silver-text" style={{ fontSize: 13 }}>Ask anything about loans, rates, or your credit profile.</p>
            <div style={{ maxHeight: 320, overflowY: 'auto', margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chat.length === 0 && <p style={{ opacity: 0.5, fontSize: 13 }}>No messages yet.</p>}
              {chat.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 14,
                    border: `1px solid ${m.role === 'user' ? '#F5C518' : 'rgba(255,255,255,0.2)'}`,
                    background: m.role === 'user' ? 'rgba(245,197,24,0.08)' : 'rgba(255,255,255,0.04)',
                    fontSize: 14,
                  }}>{m.content}</div>
                  <p style={{ fontSize: 11, opacity: 0.5, marginTop: 2, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                    {m.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              ))}
              {chatLoading && <p style={{ fontSize: 13, opacity: 0.6 }}>AI is thinking…</p>}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendChat() }} style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your score, loan rates, or strategy…"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: '#0C0C0C', color: '#fff' }}
              />
              <button className="btn-gold" type="submit" disabled={chatLoading || !input.trim()}>Send</button>
            </form>
          </section>
        </>
      )}
    </main>
  )
}

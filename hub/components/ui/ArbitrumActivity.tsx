// Built by vsrupeshkumar
// Recent on-chain Mantle activity for the connected EVM wallet.
// Sources from /api/arbitrum/txs (Mantle Explorer-backed), light theme.
'use client'

import { useEffect, useState } from 'react'
import { useWalletForTool } from '@/hooks/useWalletForTool'

type Tx = {
  hash: string
  block: number
  timestamp: number
  from: string
  to: string
  valueEth: number
  feeEth: number
  direction: 'in' | 'out' | 'self'
  status: 'success' | 'failed'
  method: string
  explorerUrl: string
}

type Resp = {
  address: string
  count: number
  txs: Tx[]
  generatedAt: string
}

const INK    = '#0A0F2E'
const MUTED  = 'rgba(15,23,42,0.62)'
const MUTED2 = 'rgba(15,23,42,0.4)'
const BORDER = 'rgba(15,23,42,0.08)'
const MONO   = '"Fira Code","JetBrains Mono",monospace'

function relTime(unix: number): string {
  const diff = Date.now() / 1000 - unix
  if (diff < 60)        return `${Math.max(1, Math.round(diff))}s ago`
  if (diff < 3600)      return `${Math.round(diff / 60)}m ago`
  if (diff < 86400)     return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

function fmtEth(n: number): string {
  if (n === 0) return '0'
  if (n < 0.0001) return n.toExponential(2)
  return n.toFixed(4).replace(/\.?0+$/, '')
}

export default function ArbitrumActivity() {
  const { address } = useWalletForTool()
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(addr: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/arbitrum/txs?address=${addr}&limit=8`, { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tx history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!address || !/^0x[a-f0-9]{40}$/i.test(address)) { setData(null); return }
    load(address)
  }, [address])

  if (!address) return null

  return (
    <div style={{ margin: '0 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: MUTED2, textTransform: 'uppercase' }}>
            Mantle Activity · On-chain
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 2 }}>
            Your last {data?.count ?? 8} Mantle transactions
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: MUTED, fontFamily: MONO }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#28A0F0', boxShadow: '0 0 6px #28A0F0' }} />
            via Explorer
          </span>
          <button
            onClick={() => load(address)}
            style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: 0, fontFamily: MONO }}
          >
            ↻ refresh
          </button>
        </div>
      </div>

      <div style={{
        background: '#FFFFFF',
        border: `1px solid ${BORDER}`,
        borderRadius: 18,
        padding: 6,
        boxShadow: '0 4px 18px rgba(15,23,42,0.05)',
      }}>
        {loading && !data && (
          <div style={{ padding: 14 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 16, background: 'rgba(15,23,42,0.05)', borderRadius: 6, marginBottom: 10, width: `${90 - i * 5}%` }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: 16, fontSize: 12, color: '#b91c1c', fontFamily: MONO }}>
            Explorer Error: {error}
          </div>
        )}

        {data && data.txs.length === 0 && !loading && (
          <div style={{ padding: 16, fontSize: 12, color: MUTED2 }}>
            No transactions found on Mantle for this wallet yet.
          </div>
        )}

        {data?.txs.map((tx, i) => {
          const arrow = tx.direction === 'in' ? '↓' : tx.direction === 'out' ? '↑' : '↔'
          const arrowColor = tx.direction === 'in' ? '#10b981' : tx.direction === 'out' ? '#ef4444' : '#6366f1'
          const counterparty = tx.direction === 'in' ? tx.from : tx.to
          return (
            <a
              key={`${tx.hash}-${i}`}
              href={tx.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'background 0.15s',
                borderBottom: i < (data.txs.length - 1) ? `1px solid ${BORDER}` : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(40,160,240,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{
                flexShrink: 0,
                width: 28, height: 28, borderRadius: 8,
                background: `${arrowColor}15`,
                color: arrowColor,
                display: 'grid', placeItems: 'center',
                fontSize: 14, fontWeight: 800,
              }}>
                {arrow}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: INK, fontFamily: MONO }}>
                    {tx.method}
                  </span>
                  <span style={{ fontSize: 11, color: MUTED2 }}>
                    {tx.direction === 'in' ? 'from' : tx.direction === 'out' ? 'to' : 'self'}
                  </span>
                  <span style={{ fontSize: 11, color: MUTED, fontFamily: MONO }}>
                    {counterparty.slice(0, 6)}…{counterparty.slice(-4)}
                  </span>
                  {tx.status === 'failed' && (
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontFamily: MONO }}>
                      FAILED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: MUTED2, marginTop: 4, fontFamily: MONO, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>block {tx.block.toLocaleString()}</span>
                  <span>·</span>
                  <span>{relTime(tx.timestamp)}</span>
                  <span>·</span>
                  <span>fee {fmtEth(tx.feeEth)} ETH</span>
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: INK, fontFamily: MONO }}>
                  {tx.valueEth > 0 ? `${tx.direction === 'out' ? '−' : ''}${fmtEth(tx.valueEth)} ETH` : '—'}
                </div>
                <div style={{ fontSize: 10, color: '#28A0F0', fontWeight: 700, marginTop: 2 }}>
                  Explorer ↗
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

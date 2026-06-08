// Built by vsrupeshkumar
// Cross-chain wallet portfolio card — calls /api/portfolio (Moralis) and shows
// the total USD balance + top holdings per chain. Light theme to match the
// rest of the new dashboard.
'use client'

import { useEffect, useState } from 'react'
import { useWalletForTool } from '@/hooks/useWalletForTool'

type Token = {
  symbol: string
  name: string
  balance: string
  usd: number
  logo?: string
  isNative: boolean
}

type ChainHoldings = {
  chain: string
  chainName: string
  chainColor: string
  totalUsd: number
  tokens: Token[]
  error?: string
}

type PortfolioResponse = {
  address: string
  totalUsd: number
  chains: ChainHoldings[]
  generatedAt: string
}

const INK    = '#0A0F2E'
const MUTED  = 'rgba(15,23,42,0.62)'
const MUTED2 = 'rgba(15,23,42,0.4)'
const BORDER = 'rgba(15,23,42,0.08)'
const MONO   = '"Fira Code","JetBrains Mono",monospace'

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (n >= 1)    return `$${n.toFixed(2)}`
  return `$${n.toFixed(4)}`
}

function fmtBalance(s: string): string {
  const n = Number(s)
  if (!isFinite(n)) return s
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1)    return n.toFixed(3)
  return n.toFixed(6)
}

export default function WalletPortfolio() {
  const { address } = useWalletForTool()
  const [data, setData] = useState<PortfolioResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(addr: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/portfolio?address=${addr}`, { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!address) { setData(null); return }
    if (!/^0x[a-f0-9]{40}$/i.test(address)) { setData(null); return }
    load(address)
  }, [address])

  // Not connected state — show connect-to-unlock CTA so the card still has content
  if (!address) {
    return (
      <div style={{ margin: '0 24px 24px' }}>
        <Header empty />
        <div style={{
          background: '#FFFFFF',
          border: `1px dashed ${BORDER}`,
          borderRadius: 18,
          padding: '32px 28px',
          textAlign: 'center',
          boxShadow: '0 4px 18px rgba(15,23,42,0.05)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👛</div>
          <div style={{ fontSize: 14, color: INK, fontWeight: 700, marginBottom: 4 }}>
            Connect an EVM wallet to see your portfolio
          </div>
          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
            Powered by Moralis · pulls live balances across Mantle, Ethereum and Polygon in one call.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ margin: '0 24px 24px' }}>
      <Header
        totalUsd={data?.totalUsd}
        loading={loading}
        address={address}
        onRefresh={() => load(address)}
      />

      {error && (
        <div style={{
          padding: 14,
          borderRadius: 12,
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#b91c1c',
          fontSize: 12,
          fontFamily: MONO,
        }}>
          Moralis: {error}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12,
      }}>
        {(data?.chains ?? [
          { chain: 'arbitrum', chainName: 'Mantle Network', chainColor: '#28A0F0', totalUsd: 0, tokens: [] },
          { chain: 'eth',      chainName: 'Ethereum',     chainColor: '#627EEA', totalUsd: 0, tokens: [] },
          { chain: 'polygon',  chainName: 'Polygon',      chainColor: '#8247E5', totalUsd: 0, tokens: [] },
        ] as ChainHoldings[]).map(chain => (
          <ChainCard key={chain.chain} chain={chain} loading={loading && !data} />
        ))}
      </div>
    </div>
  )
}

function Header({
  totalUsd,
  loading,
  address,
  onRefresh,
  empty,
}: {
  totalUsd?: number
  loading?: boolean
  address?: string
  onRefresh?: () => void
  empty?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: MUTED2, textTransform: 'uppercase' }}>
          Wallet Portfolio · Cross-chain
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 2 }}>
          {empty ? 'Live token balances across 3 EVM chains' : (
            totalUsd !== undefined
              ? <>Total <span style={{
                  background: 'linear-gradient(135deg, #3B5BFA, #8B5CF6 55%, #EC4899)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontFamily: MONO,
                }}>{fmtUsd(totalUsd)}</span></>
              : loading ? 'Fetching balances…' : 'Connect to see balances'
          )}
        </div>
      </div>
      {!empty && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: MUTED, fontFamily: MONO }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            via Moralis
          </span>
          {address && (
            <span title={address}>· {address.slice(0, 6)}…{address.slice(-4)}</span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: 0, fontFamily: MONO }}
            >
              ↻ refresh
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ChainCard({ chain, loading }: { chain: ChainHoldings; loading: boolean }) {
  return (
    <div style={{
      background: '#FFFFFF',
      backgroundImage: `linear-gradient(135deg, ${chain.chainColor}10 0%, rgba(255,255,255,0.95) 70%)`,
      border: `1px solid ${BORDER}`,
      borderRadius: 18,
      padding: 18,
      boxShadow: '0 4px 18px rgba(15,23,42,0.05)',
      position: 'relative',
      overflow: 'hidden',
      minHeight: 180,
    }}>
      <div aria-hidden style={{
        position: 'absolute',
        top: -40, right: -40,
        width: 140, height: 140,
        borderRadius: '50%',
        background: chain.chainColor,
        filter: 'blur(50px)',
        opacity: 0.18,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: chain.chainColor, boxShadow: `0 0 6px ${chain.chainColor}` }} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: chain.chainColor, textTransform: 'uppercase' }}>
            {chain.chainName}
          </span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: INK, fontFamily: MONO }}>
          {fmtUsd(chain.totalUsd)}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 14, background: 'rgba(15,23,42,0.06)', borderRadius: 6, width: `${85 - i * 8}%`, animation: 'wp-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
          <style>{`@keyframes wp-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
      ) : chain.error ? (
        <div style={{ fontSize: 11, color: 'rgba(239,68,68,0.85)', fontFamily: MONO }}>
          {chain.error.slice(0, 60)}
        </div>
      ) : chain.tokens.length === 0 ? (
        <div style={{ fontSize: 12, color: MUTED2, marginTop: 8 }}>
          No tokens · ${chain.totalUsd.toFixed(2)} on this chain
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
          {chain.tokens.map(t => (
            <div key={`${t.symbol}-${t.name}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
              {t.logo ? (
                 
                <img src={t.logo} alt={t.symbol} width={22} height={22} style={{ borderRadius: '50%', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${chain.chainColor}25`, color: chain.chainColor, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                  {t.symbol[0]}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: INK, display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  {t.symbol}
                  {t.isNative && (
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${chain.chainColor}20`, color: chain.chainColor, fontFamily: MONO }}>
                      NATIVE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: MUTED2, fontFamily: MONO }}>
                  {fmtBalance(t.balance)} {t.symbol}
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: INK, fontFamily: MONO, flexShrink: 0 }}>
                {fmtUsd(t.usd)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

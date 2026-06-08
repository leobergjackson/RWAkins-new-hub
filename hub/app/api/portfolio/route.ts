// Built by vsrupeshkumar
// Cross-chain wallet portfolio via Moralis Web3 API.
// Returns aggregated USD value + top holdings across Mantle / Ethereum / Polygon.
// Server-side only so MORALIS_API_KEY never reaches the browser.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MORALIS_BASE = 'https://deep-index.moralis.io/api/v2.2'
const FETCH_TIMEOUT_MS = 9_000
// Chain mapping: Moralis chain id → display name + accent colour
const CHAINS: Array<{ id: string; name: string; color: string }> = [
  { id: 'arbitrum', name: 'Mantle Network', color: '#28A0F0' },
  { id: 'eth',      name: 'Ethereum',     color: '#627EEA' },
  { id: 'polygon',  name: 'Polygon',      color: '#8247E5' },
]

type MoralisToken = {
  token_address: string
  symbol: string
  name: string
  logo?: string | null
  thumbnail?: string | null
  decimals: number
  balance: string
  balance_formatted?: string
  usd_price?: number | null
  usd_value?: number | null
  portfolio_percentage?: number
  native_token?: boolean
}

export type ChainHoldings = {
  chain: string
  chainName: string
  chainColor: string
  totalUsd: number
  tokens: Array<{
    symbol: string
    name: string
    balance: string
    usd: number
    logo?: string
    isNative: boolean
  }>
  error?: string
}

export type PortfolioResponse = {
  address: string
  totalUsd: number
  chains: ChainHoldings[]
  generatedAt: string
}

async function fetchChain(address: string, chain: { id: string; name: string; color: string }, apiKey: string): Promise<ChainHoldings> {
  const url = `${MORALIS_BASE}/wallets/${address}/tokens?chain=${chain.id}&exclude_spam=true&exclude_unverified_contracts=true`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!res.ok) {
      return { chain: chain.id, chainName: chain.name, chainColor: chain.color, totalUsd: 0, tokens: [], error: `HTTP ${res.status}` }
    }
    const json = await res.json() as { result?: MoralisToken[] }
    const items = (json.result ?? [])
      .filter(t => (t.usd_value ?? 0) > 0.5)  // skip dust < $0.50
      .slice(0, 6)
      .map(t => ({
        symbol: t.symbol,
        name: t.name,
        balance: t.balance_formatted || (Number(t.balance) / Math.pow(10, t.decimals)).toFixed(4),
        usd: t.usd_value ?? 0,
        logo: t.logo ?? t.thumbnail ?? undefined,
        isNative: !!t.native_token,
      }))
    const totalUsd = items.reduce((s, t) => s + t.usd, 0)
    return { chain: chain.id, chainName: chain.name, chainColor: chain.color, totalUsd, tokens: items }
  } catch (e) {
    return { chain: chain.id, chainName: chain.name, chainColor: chain.color, totalUsd: 0, tokens: [], error: e instanceof Error ? e.message : 'network' }
  } finally {
    clearTimeout(t)
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const address = url.searchParams.get('address')?.toLowerCase()
  if (!address || !/^0x[a-f0-9]{40}$/i.test(address)) {
    return NextResponse.json({ error: 'invalid address' }, { status: 400 })
  }

  const apiKey = process.env.MORALIS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'MORALIS_API_KEY not configured' }, { status: 503 })
  }

  const chains = await Promise.all(CHAINS.map(c => fetchChain(address, c, apiKey)))
  const totalUsd = chains.reduce((s, c) => s + c.totalUsd, 0)

  const payload: PortfolioResponse = {
    address,
    totalUsd,
    chains,
    generatedAt: new Date().toISOString(),
  }
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}

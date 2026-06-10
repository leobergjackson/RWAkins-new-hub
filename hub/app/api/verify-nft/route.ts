// Built by vsrupeshkumar
// Verify Credit Passport Soulbound NFT & fetch general NFTs via Moralis Web3 API.
// Server-side only so MORALIS_API_KEY never reaches the browser.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MORALIS_BASE = 'https://deep-index.moralis.io/api/v2.2'
const FETCH_TIMEOUT_MS = 9_000

const CHAINS = [
  { id: 'arbitrum', name: 'Mantle Network' },
  { id: 'polygon',  name: 'Polygon'      },
  { id: 'eth',      name: 'Ethereum'     },
]

type MoralisNFT = {
  token_address: string
  token_id: string
  amount?: string
  contract_type?: string
  name?: string | null
  symbol?: string | null
  token_uri?: string | null
  metadata?: string | null
  normalized_metadata?: {
    name?: string | null
    description?: string | null
    image?: string | null
    attributes?: Array<Record<string, unknown>>
  } | null
}

async function fetchChainNFTs(address: string, chain: string, apiKey: string): Promise<MoralisNFT[]> {
  const url = `${MORALIS_BASE}/wallets/${address}/nfts?chain=${chain}&format=decimal&normalizeMetadata=true`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error(`[verify-nft] Moralis fetch failed for ${chain}: HTTP ${res.status}`)
      return []
    }
    const json = await res.json() as { result?: MoralisNFT[] }
    return json.result ?? []
  } catch (e) {
    console.error(`[verify-nft] fetch failed for ${chain}:`, e)
    return []
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

  try {
    // Fetch NFTs from supported chains
    const nftPromises = CHAINS.map(c => fetchChainNFTs(address, c.id, apiKey).then(nfts => 
      nfts.map(n => ({ ...n, chainName: c.name, chainId: c.id }))
    ))
    const results = await Promise.all(nftPromises)
    const allNfts = results.flat()

    // Detect if a Credit Passport soulbound NFT exists
    // We check NFT name, symbol, or metadata name for "Credit Passport" or "RWAkins Credit"
    const creditPassportNft = allNfts.find(n => {
      const name = (n.name ?? '').toLowerCase()
      const symbol = (n.symbol ?? '').toLowerCase()
      const metaName = (n.normalized_metadata?.name ?? '').toLowerCase()
      return (
        name.includes('credit passport') ||
        name.includes('creditpassport') ||
        symbol.includes('ncrd') ||
        symbol.includes('kcp') ||
        metaName.includes('credit passport')
      )
    })

    const payload = {
      address,
      verified: !!creditPassportNft,
      creditPassport: creditPassportNft ? {
        tokenAddress: creditPassportNft.token_address,
        tokenId: creditPassportNft.token_id,
        name: creditPassportNft.name || 'RWAkins Credit Passport',
        symbol: creditPassportNft.symbol || 'KCP',
        chainName: creditPassportNft.chainName,
        metadata: creditPassportNft.normalized_metadata,
      } : null,
      nfts: allNfts.map(n => ({
        tokenAddress: n.token_address,
        tokenId: n.token_id,
        name: n.name || 'Unnamed NFT',
        symbol: n.symbol || 'NFT',
        chainName: n.chainName,
        chainId: n.chainId,
        image: n.normalized_metadata?.image || null,
        description: n.normalized_metadata?.description || null,
      })),
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[verify-nft] server error:', e)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

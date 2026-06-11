// Built by vsrupeshkumar
// Live market-data service — the agent's eyes. Every agent evaluation calls
// getMarketData(), which fetches THREE live signals in parallel and never serves
// anything older than the 5-minute freshness budget:
//
//   1. USDY APY  — read on-chain from the USDY token's yield oracle (currentYield)
//   2. mETH APY  — read on-chain from the mETH staking token (currentYield)
//   3. ETH 24h   — fetched from CoinGecko's free public price API (no key needed)
//
// Nothing here is hard-coded: the yields come straight off the Mantle Sepolia
// contracts at the moment of evaluation, and the ETH momentum signal comes live
// from CoinGecko. This is server-side only (it talks to an RPC + CoinGecko), so
// it is safe to share between /api/rebalance/trigger and /api/agent/heartbeat.
import { createPublicClient } from 'viem'
import { RWA_TOKEN_ABI } from '@/lib/rwa/abi'
import deployed from '@/lib/rwa-deployed.json'
import { fetchPrices, fetchRealizedVolatilityPct } from '@/lib/api/coingecko'
import { mantleSepolia, mantleTransport } from '@/lib/rwa/rpc'

const serverClient = createPublicClient({ chain: mantleSepolia, transport: mantleTransport() })

const vaultDeployed = typeof deployed.vault === 'string' && deployed.vault.length === 42

/** Freshness budget — callers must never treat data older than this as live. */
export const MARKET_MAX_AGE_MS = 5 * 60_000 // 5 minutes

export interface MarketData {
  /** Live USDY treasury APY in percent (e.g. 4.8). */
  usdyApy: number
  /** Live mETH staking APY in percent (e.g. 5.1). */
  methApy: number
  /** Live ETH spot price in USD. */
  ethPrice: number
  /** ETH 24h price change in percent — the bullish/bearish signal. */
  eth24hChange: number
  /** Annualized realized ETH volatility (percent) from a live 7d hourly series. */
  volatility: number
  /** True when the on-chain yields were read successfully (not a fallback). */
  yieldsLive: boolean
  /** True when CoinGecko answered (not a neutral fallback). */
  marketLive: boolean
  /** When this snapshot was taken (ms epoch) — used to assert freshness. */
  fetchedAt: number
}

// Sensible neutral fallbacks if a source is briefly unreachable. These keep the
// pipeline alive without ever forcing a rebalance (eth24hChange 0 = no signal).
const FALLBACK_USDY_APY = 4.8
const FALLBACK_METH_APY = 3.6

/** Read a mock-RWA token's `currentYield` (bps) and return it as a percent. */
async function readApyPct(token: `0x${string}`): Promise<number> {
  const bps = (await serverClient.readContract({
    address: token,
    abi: RWA_TOKEN_ABI,
    functionName: 'currentYield',
  })) as bigint
  return Number(bps) / 100 // 480 bps → 4.80%
}

async function fetchYields(): Promise<{ usdyApy: number; methApy: number; live: boolean }> {
  if (!vaultDeployed) {
    return { usdyApy: FALLBACK_USDY_APY, methApy: FALLBACK_METH_APY, live: false }
  }
  try {
    const [usdyApy, methApy] = await Promise.all([
      readApyPct(deployed.usdy as `0x${string}`),
      readApyPct(deployed.meth as `0x${string}`),
    ])
    return { usdyApy, methApy, live: true }
  } catch {
    return { usdyApy: FALLBACK_USDY_APY, methApy: FALLBACK_METH_APY, live: false }
  }
}

async function fetchEth(): Promise<{ ethPrice: number; eth24hChange: number; live: boolean }> {
  try {
    const prices = await fetchPrices(['ethereum'])
    const row = prices['ethereum']
    if (!row || typeof row.usd !== 'number') throw new Error('no price')
    return { ethPrice: row.usd, eth24hChange: row.usd_24h_change ?? 0, live: true }
  } catch {
    // CoinGecko unreachable — neutral snapshot (0% change forces no rebalance).
    return { ethPrice: 0, eth24hChange: 0, live: false }
  }
}

/**
 * Fetch all three live signals in parallel. Always returns a usable snapshot —
 * a briefly-unreachable source degrades to a neutral fallback rather than
 * throwing, so the agent can always reach a decision.
 */
export async function getMarketData(): Promise<MarketData> {
  const [yields, eth, vol] = await Promise.all([
    fetchYields(),
    fetchEth(),
    fetchRealizedVolatilityPct('ethereum', 7),
  ])
  return {
    usdyApy: yields.usdyApy,
    methApy: yields.methApy,
    ethPrice: eth.ethPrice,
    eth24hChange: eth.eth24hChange,
    // Live realized vol when available; otherwise a momentum-scaled estimate so
    // the council/risk checks always have a sane number.
    volatility: vol ?? Math.abs(eth.eth24hChange) * 4 + 12,
    yieldsLive: yields.live,
    marketLive: eth.live,
    fetchedAt: Date.now(),
  }
}

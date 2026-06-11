// Built by vsrupeshkumar
// Live REAL-WORLD yield source for the two RWAkins legs, from DefiLlama's public
// keyless yields API (https://yields.llama.fi/pools). We pull the actual on-market
// APY for a tokenized-treasury pool (USDY proxy) and a liquid-staked-ETH pool
// (mETH proxy), so the yields the agent reasons over — and writes on-chain — are
// real market numbers, never hardcoded. Cached 10 min; falls back to null (the
// caller then keeps the last good on-chain value) if the API is briefly down.
const POOLS_URL = 'https://yields.llama.fi/pools'
const CACHE_TTL = 10 * 60_000 // 10 minutes

export interface RwaYields {
  /** Tokenized-treasury APY in percent (USDY proxy), or null if unavailable. */
  usdyApy: number | null
  /** Liquid-staked-ETH APY in percent (mETH proxy), or null if unavailable. */
  methApy: number | null
  /** True when at least one leg came back live from DefiLlama. */
  live: boolean
}

interface LlamaPool {
  chain?: string
  project?: string
  symbol?: string
  apy?: number | null
  apyBase?: number | null
  tvlUsd?: number | null
}

let cache: { data: RwaYields; ts: number } | null = null

const apyOf = (p: LlamaPool): number | null =>
  typeof p.apy === 'number' ? p.apy : typeof p.apyBase === 'number' ? p.apyBase : null

/**
 * Pick the highest-TVL pool that matches a predicate and has a sane APY (0-30%),
 * so we track the deepest, most representative real pool rather than a thin outlier.
 */
function pickApy(pools: LlamaPool[], match: (p: LlamaPool) => boolean): number | null {
  const candidates = pools
    .filter((p) => match(p) && apyOf(p) != null && (apyOf(p) as number) > 0.1 && (apyOf(p) as number) <= 30)
    .sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0))
  return candidates.length ? (apyOf(candidates[0]) as number) : null
}

/** Fetch the live USDY (treasury) + mETH (LST) reference APYs from DefiLlama. */
export async function fetchRwaYields(): Promise<RwaYields> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(POOLS_URL, { signal: ctrl.signal }).finally(() => clearTimeout(t))
    if (!res.ok) throw new Error(`DefiLlama ${res.status}`)
    const json = (await res.json()) as { data?: LlamaPool[] }
    const pools = json.data ?? []

    const sym = (p: LlamaPool) => (p.symbol ?? '').toUpperCase()
    const proj = (p: LlamaPool) => (p.project ?? '').toLowerCase()

    // USDY proxy: Ondo's tokenized US-treasury yield (exact pool when present,
    // otherwise any USDY-symboled treasury pool).
    const usdyApy =
      pickApy(pools, (p) => proj(p).includes('ondo') && sym(p).includes('USDY')) ??
      pickApy(pools, (p) => sym(p).includes('USDY'))

    // mETH proxy: Mantle's liquid-staked ETH (exact pool when present, otherwise
    // any METH-symboled LST pool).
    const methApy =
      pickApy(pools, (p) => (p.chain ?? '').toLowerCase() === 'mantle' && sym(p).includes('METH')) ??
      pickApy(pools, (p) => sym(p).includes('METH'))

    const data: RwaYields = { usdyApy, methApy, live: usdyApy != null || methApy != null }
    cache = { data, ts: Date.now() }
    return data
  } catch {
    if (cache) return cache.data
    return { usdyApy: null, methApy: null, live: false }
  }
}

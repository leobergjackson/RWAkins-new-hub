// Built by vsrupeshkumar
// CoinGecko live price fetcher with a 60-second in-memory cache.
// The API key (if any) is read from the environment — never hard-coded.

const BASE_URL = 'https://api.coingecko.com/api/v3'
const API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || ''
const CACHE_TTL = 60_000 // 60 seconds

export interface CoinPrice {
  usd: number
  usd_24h_change: number
}

export type PriceMap = Record<string, CoinPrice>

interface CacheEntry {
  data: PriceMap
  ts: number
}

// Keyed by the sorted id list + vsCurrency, so different queries cache separately.
const cache = new Map<string, CacheEntry>()

/**
 * Fetches simple prices + 24h change for the given CoinGecko coin ids.
 * Results are cached for 60s. On a network/HTTP error the last cached value
 * is returned if available; otherwise the error is thrown.
 *
 * Note: Mantle has no CoinGecko listing — never pass it here.
 */
export async function fetchPrices(
  ids: string[],
  vsCurrency = 'usd',
): Promise<PriceMap> {
  const cacheKey = [...ids].sort().join(',') + ':' + vsCurrency
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data
  }

  try {
    const url =
      `${BASE_URL}/simple/price` +
      `?ids=${encodeURIComponent(ids.join(','))}` +
      `&vs_currencies=${encodeURIComponent(vsCurrency)}` +
      `&include_24hr_change=true`

    const headers: Record<string, string> = { accept: 'application/json' }
    if (API_KEY) headers['x-cg-demo-api-key'] = API_KEY

    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(url, { headers, signal: ctrl.signal }).finally(() => clearTimeout(t))
    if (!res.ok) throw new Error(`CoinGecko request failed: ${res.status}`)

    const json = (await res.json()) as Record<string, Record<string, number>>
    const data: PriceMap = {}
    for (const id of ids) {
      const row = json[id]
      if (row) {
        data[id] = {
          usd: row[vsCurrency] ?? 0,
          usd_24h_change: row[`${vsCurrency}_24h_change`] ?? 0,
        }
      }
    }

    cache.set(cacheKey, { data, ts: Date.now() })
    return data
  } catch (err) {
    if (cached) return cached.data
    throw err
  }
}

// ── Realized volatility ───────────────────────────────────────────────────────

interface VolEntry { vol: number; ts: number }
const volCache = new Map<string, VolEntry>()
const VOL_TTL = 10 * 60_000 // 10 minutes

/**
 * Annualized realized volatility (percent) computed from a REAL hourly price
 * series over the last `days` days (CoinGecko market_chart). Returns null if the
 * series is unavailable so the caller can fall back. Cached 10 minutes.
 */
export async function fetchRealizedVolatilityPct(id: string, days = 7): Promise<number | null> {
  const key = `${id}:${days}`
  const c = volCache.get(key)
  if (c && Date.now() - c.ts < VOL_TTL) return c.vol
  try {
    const url = `${BASE_URL}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`
    const headers: Record<string, string> = { accept: 'application/json' }
    if (API_KEY) headers['x-cg-demo-api-key'] = API_KEY
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(url, { headers, signal: ctrl.signal }).finally(() => clearTimeout(t))
    if (!res.ok) throw new Error(`market_chart ${res.status}`)
    const json = (await res.json()) as { prices?: [number, number][] }
    const prices = (json.prices ?? []).map((p) => p[1]).filter((p) => p > 0)
    if (prices.length < 3) throw new Error('insufficient series')

    // Log returns between consecutive (≈hourly) samples → stdev → annualize.
    const rets: number[] = []
    for (let i = 1; i < prices.length; i++) rets.push(Math.log(prices[i] / prices[i - 1]))
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length
    const stdevPerSample = Math.sqrt(variance)
    // Samples are hourly → annualize over 24*365 hours.
    const periodsPerYear = (prices.length - 1) / days * 365
    const annualized = stdevPerSample * Math.sqrt(periodsPerYear) * 100
    const vol = Math.round(annualized * 10) / 10
    volCache.set(key, { vol, ts: Date.now() })
    return vol
  } catch {
    return c ? c.vol : null
  }
}

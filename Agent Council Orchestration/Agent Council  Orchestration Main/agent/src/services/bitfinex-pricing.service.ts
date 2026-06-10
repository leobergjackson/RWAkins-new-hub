// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Real-time pricing from Bitfinex public API (free, no key required).

import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export interface TickerData {
  symbol: string;
  bid: number;
  bidSize: number;
  ask: number;
  askSize: number;
  dailyChange: number;
  dailyChangePercent: number;
  lastPrice: number;
  volume: number;
  high: number;
  low: number;
  fetchedAt: string;
}

interface CacheEntry {
  data: TickerData;
  expiresAt: number;
}

// ── Common trading pairs ──────────────────────────────────────

const COMMON_PAIRS = [
  'BTCUSD',
  'ETHUSD',
  'XAUTUSD',
  'USTUSD',    // USDt
  'SOLUSD',
  'TONUSD',
  'TRXUSD',
  'AVAXUSD',
] as const;

const CACHE_TTL_MS = 60_000; // 60 seconds

// ── Service ───────────────────────────────────────────────────

export class BitfinexPricingService {
  private cache = new Map<string, CacheEntry>();
  private readonly baseUrl = 'https://api-pub.bitfinex.com/v2';

  /**
   * Fetch price for a single trading pair from Bitfinex.
   * Returns cached data if still fresh (60-second TTL).
   *
   * @param symbol Trading pair symbol, e.g. 'BTCUSD', 'ETHUSD', 'XAUTUSD'
   */
  async getPrice(symbol: string): Promise<TickerData> {
    const sym = symbol.toUpperCase();

    // Check cache
    const cached = this.cache.get(sym);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const url = `${this.baseUrl}/ticker/t${sym}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Bitfinex API returned ${response.status}: ${response.statusText}`);
      }

      const arr: number[] = await response.json() as number[];
      if (!Array.isArray(arr) || arr.length < 10) {
        throw new Error(`Unexpected Bitfinex response format for t${sym}`);
      }

      // Bitfinex ticker array format:
      // [BID, BID_SIZE, ASK, ASK_SIZE, DAILY_CHANGE, DAILY_CHANGE_RELATIVE, LAST_PRICE, VOLUME, HIGH, LOW]
      const ticker: TickerData = {
        symbol: sym,
        bid: arr[0],
        bidSize: arr[1],
        ask: arr[2],
        askSize: arr[3],
        dailyChange: arr[4],
        dailyChangePercent: arr[5] * 100, // Convert to percentage
        lastPrice: arr[6],
        volume: arr[7],
        high: arr[8],
        low: arr[9],
        fetchedAt: new Date().toISOString(),
      };

      // Update cache
      this.cache.set(sym, {
        data: ticker,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return ticker;
    } catch (err) {
      logger.error('Bitfinex pricing fetch failed', {
        symbol: sym,
        error: err instanceof Error ? err.message : String(err),
      });
      // Return stale cache if available
      if (cached) {
        logger.warn('Returning stale cache for Bitfinex ticker', { symbol: sym });
        return cached.data;
      }
      throw err;
    }
  }

  /**
   * Batch-fetch prices for all common trading pairs.
   * Individual failures are logged and excluded from results.
   */
  async getAllPrices(): Promise<TickerData[]> {
    const results: TickerData[] = [];
    const promises = COMMON_PAIRS.map(async (sym) => {
      try {
        const ticker = await this.getPrice(sym);
        results.push(ticker);
      } catch {
        logger.warn('Skipping pair in batch fetch', { symbol: sym });
      }
    });
    await Promise.allSettled(promises);
    return results.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  /**
   * List all common pairs this service can fetch.
   */
  getCommonPairs(): string[] {
    return [...COMMON_PAIRS];
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number; pairs: string[] } {
    const now = Date.now();
    const activePairs: string[] = [];
    for (const [sym, entry] of this.cache.entries()) {
      if (now < entry.expiresAt) {
        activePairs.push(sym);
      }
    }
    return { size: activePairs.length, pairs: activePairs };
  }

  /**
   * Clear all cached prices.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

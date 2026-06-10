// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent

import { logger } from '../utils/logger.js';

/** Base URL for the WDK Indexer API */
const INDEXER_BASE = 'https://wdk-api.tether.io';

/** Cache entry with TTL */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/** Token info returned by the chains endpoint */
export interface IndexerTokenInfo {
  token: string;
  blockchain: string;
  [key: string]: unknown;
}

/** Chain/token list from the indexer */
export interface IndexerChainsResponse {
  chains: IndexerTokenInfo[];
  [key: string]: unknown;
}

/** Token balance from the indexer */
export interface IndexerTokenBalance {
  balance: string;
  blockchain: string;
  token: string;
  address: string;
  [key: string]: unknown;
}

/** Token transfer record from the indexer */
export interface IndexerTokenTransfer {
  txHash: string;
  from: string;
  to: string;
  value: string;
  blockchain: string;
  token: string;
  timestamp?: string;
  blockNumber?: number;
  [key: string]: unknown;
}

/** Batch query item */
export interface BatchQuery {
  blockchain: string;
  token: string;
  address: string;
}

/** Health check result */
export interface IndexerHealthResult {
  isAvailable: boolean;
  latencyMs: number;
  status?: string;
  error?: string;
}

/**
 * WDK Indexer Service — wraps the Tether WDK Indexer REST API
 * for unified cross-chain balance and transfer data.
 *
 * Features:
 * - 30-second result caching to respect rate limits (4 req/10s balances, 8 req/10s transfers)
 * - Graceful fallback when API is unreachable
 * - No external dependencies — uses native fetch (Node.js 22+)
 */
export class IndexerService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cacheTtlMs = 30_000; // 30 seconds
  private available = false;

  /** Check if the indexer API is reachable */
  async healthCheck(): Promise<IndexerHealthResult> {
    const start = Date.now();
    try {
      const res = await fetch(`${INDEXER_BASE}/api/v1/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        this.available = true;
        return { isAvailable: true, latencyMs, status: String(body.status ?? 'ok') };
      }
      this.available = false;
      return { isAvailable: false, latencyMs, error: `HTTP ${res.status}` };
    } catch (err) {
      this.available = false;
      return { isAvailable: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }

  /** Whether the indexer was reachable on last health check */
  isAvailable(): boolean {
    return this.available;
  }

  /** Get supported chains and tokens */
  async getSupportedChains(): Promise<{ data: IndexerChainsResponse | null; isAvailable: boolean }> {
    const cacheKey = 'chains';
    const cached = this.getFromCache<IndexerChainsResponse>(cacheKey);
    if (cached) return { data: cached, isAvailable: true };

    try {
      const res = await fetch(`${INDEXER_BASE}/api/v1/chains`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        logger.warn('Indexer chains request failed', { status: res.status });
        return { data: null, isAvailable: false };
      }
      const data = (await res.json()) as IndexerChainsResponse;
      this.setCache(cacheKey, data);
      return { data, isAvailable: true };
    } catch (err) {
      logger.warn('Indexer chains request error', { error: String(err) });
      return { data: null, isAvailable: false };
    }
  }

  /** Get token balance for an address on a specific chain */
  async getTokenBalance(
    blockchain: string,
    token: string,
    address: string,
  ): Promise<{ data: IndexerTokenBalance | null; isAvailable: boolean }> {
    const cacheKey = `balance:${blockchain}:${token}:${address}`;
    const cached = this.getFromCache<IndexerTokenBalance>(cacheKey);
    if (cached) return { data: cached, isAvailable: true };

    try {
      const url = `${INDEXER_BASE}/api/v1/${encodeURIComponent(blockchain)}/${encodeURIComponent(token)}/${encodeURIComponent(address)}/token-balances`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        logger.warn('Indexer balance request failed', { blockchain, token, address, status: res.status });
        return { data: null, isAvailable: false };
      }
      const data = (await res.json()) as IndexerTokenBalance;
      this.setCache(cacheKey, data);
      return { data, isAvailable: true };
    } catch (err) {
      logger.warn('Indexer balance request error', { blockchain, token, address, error: String(err) });
      return { data: null, isAvailable: false };
    }
  }

  /** Get token transfer history for an address */
  async getTokenTransfers(
    blockchain: string,
    token: string,
    address: string,
  ): Promise<{ data: IndexerTokenTransfer[] | null; isAvailable: boolean }> {
    const cacheKey = `transfers:${blockchain}:${token}:${address}`;
    const cached = this.getFromCache<IndexerTokenTransfer[]>(cacheKey);
    if (cached) return { data: cached, isAvailable: true };

    try {
      const url = `${INDEXER_BASE}/api/v1/${encodeURIComponent(blockchain)}/${encodeURIComponent(token)}/${encodeURIComponent(address)}/token-transfers`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        logger.warn('Indexer transfers request failed', { blockchain, token, address, status: res.status });
        return { data: null, isAvailable: false };
      }
      const data = (await res.json()) as IndexerTokenTransfer[];
      this.setCache(cacheKey, data);
      return { data, isAvailable: true };
    } catch (err) {
      logger.warn('Indexer transfers request error', { blockchain, token, address, error: String(err) });
      return { data: null, isAvailable: false };
    }
  }

  /** Batch balance query across multiple chains */
  async batchBalances(
    queries: BatchQuery[],
  ): Promise<{ data: IndexerTokenBalance[] | null; isAvailable: boolean }> {
    const cacheKey = `batch-balances:${JSON.stringify(queries)}`;
    const cached = this.getFromCache<IndexerTokenBalance[]>(cacheKey);
    if (cached) return { data: cached, isAvailable: true };

    try {
      const res = await fetch(`${INDEXER_BASE}/api/v1/batch/token-balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queries),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        logger.warn('Indexer batch balances request failed', { status: res.status });
        return { data: null, isAvailable: false };
      }
      const data = (await res.json()) as IndexerTokenBalance[];
      this.setCache(cacheKey, data);
      return { data, isAvailable: true };
    } catch (err) {
      logger.warn('Indexer batch balances request error', { error: String(err) });
      return { data: null, isAvailable: false };
    }
  }

  /** Batch transfer query across multiple chains */
  async batchTransfers(
    queries: BatchQuery[],
  ): Promise<{ data: IndexerTokenTransfer[][] | null; isAvailable: boolean }> {
    const cacheKey = `batch-transfers:${JSON.stringify(queries)}`;
    const cached = this.getFromCache<IndexerTokenTransfer[][]>(cacheKey);
    if (cached) return { data: cached, isAvailable: true };

    try {
      const res = await fetch(`${INDEXER_BASE}/api/v1/batch/token-transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queries),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        logger.warn('Indexer batch transfers request failed', { status: res.status });
        return { data: null, isAvailable: false };
      }
      const data = (await res.json()) as IndexerTokenTransfer[][];
      this.setCache(cacheKey, data);
      return { data, isAvailable: true };
    } catch (err) {
      logger.warn('Indexer batch transfers request error', { error: String(err) });
      return { data: null, isAvailable: false };
    }
  }

  /** Read from cache if not expired */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data;
    }
    if (entry) this.cache.delete(key);
    return null;
  }

  /** Write to cache with TTL */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.cacheTtlMs });
  }

  /** Clear all cached data */
  clearCache(): void {
    this.cache.clear();
  }
}

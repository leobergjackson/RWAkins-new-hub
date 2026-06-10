// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Real Data Provider Service
// Provides REAL data from blockchain RPCs, Rumble RSS, and public APIs.
// Replaces fake webhook events with genuine platform and on-chain data.
// Falls back gracefully to cached data if the network is unavailable.

import { logger } from '../utils/logger.js';
import type { RumbleScraperService, RumbleCreatorProfile } from './rumble-scraper.service.js';
import type { WalletService } from './wallet.service.js';
import type { WalletBalance } from '../types/index.js';

// ── Types ──────────────────────────────────────────────────────

export interface RealCreatorData {
  profiles: RumbleCreatorProfile[];
  source: 'live' | 'cached' | 'unavailable';
  fetchedAt: string;
}

export interface RealChainData {
  balances: WalletBalance[];
  source: 'live' | 'cached' | 'unavailable';
  fetchedAt: string;
}

export interface RealGasData {
  ethereum: { gasPrice: string; source: string } | null;
  fetchedAt: string;
  source: 'live' | 'cached' | 'unavailable';
}

// ── Service ────────────────────────────────────────────────────

/**
 * RealDataProviderService — fetches REAL data from external sources.
 *
 * Data sources:
 * - Rumble RSS/HTML via RumbleScraperService
 * - WDK wallet balances from real testnet RPCs
 * - Public gas price APIs (no API key needed)
 *
 * All methods fall back gracefully to cached or empty data on failure.
 */
export class RealDataProviderService {
  private rumbleScraper: RumbleScraperService | null = null;
  private walletService: WalletService | null = null;

  // Cache for graceful fallback
  private cachedCreatorData: RealCreatorData | null = null;
  private cachedChainData: RealChainData | null = null;
  private cachedGasData: RealGasData | null = null;

  setRumbleScraper(scraper: RumbleScraperService): void {
    this.rumbleScraper = scraper;
  }

  setWalletService(wallet: WalletService): void {
    this.walletService = wallet;
  }

  // ── Real Rumble Data ────────────────────────────────────────

  /**
   * Fetch real creator profiles from Rumble via RSS/HTML scraping.
   * Falls back to cached data if network is unavailable.
   */
  async getRealRumbleData(): Promise<RealCreatorData> {
    if (!this.rumbleScraper) {
      return { profiles: [], source: 'unavailable', fetchedAt: new Date().toISOString() };
    }

    try {
      // Initialize if not already done
      if (!this.rumbleScraper.isInitialized()) {
        await this.rumbleScraper.initialize();
      }

      const startupProfiles = this.rumbleScraper.getStartupProfiles();
      const profiles: RumbleCreatorProfile[] = [];

      for (const [, profile] of startupProfiles) {
        profiles.push(profile);
      }

      // Also try to refresh default creators
      const defaultSlugs = this.rumbleScraper.getDefaultCreators();
      for (const slug of defaultSlugs) {
        try {
          const fresh = await this.rumbleScraper.fetchCreatorProfile(slug);
          // Replace startup data with fresh data if it's from a live source
          if (fresh.source !== 'demo') {
            const idx = profiles.findIndex((p) => p.channelSlug === slug);
            if (idx >= 0) profiles[idx] = fresh;
            else profiles.push(fresh);
          }
        } catch {
          // Individual creator fetch failure is fine — we have cached data
        }
      }

      const liveCount = profiles.filter((p) => p.source !== 'demo').length;
      const result: RealCreatorData = {
        profiles,
        source: liveCount > 0 ? 'live' : 'cached',
        fetchedAt: new Date().toISOString(),
      };

      this.cachedCreatorData = result;
      logger.info(`RealDataProvider: Rumble data fetched — ${liveCount} live, ${profiles.length - liveCount} cached`);
      return result;
    } catch (err) {
      logger.warn('RealDataProvider: Rumble fetch failed, using cached data', { error: String(err) });
      if (this.cachedCreatorData) return this.cachedCreatorData;
      return { profiles: [], source: 'unavailable', fetchedAt: new Date().toISOString() };
    }
  }

  // ── Real Chain Data ─────────────────────────────────────────

  /**
   * Query real testnet balances via WDK wallet service.
   * Falls back to cached balances if RPCs are unreachable.
   */
  async getRealChainData(): Promise<RealChainData> {
    if (!this.walletService) {
      return { balances: [], source: 'unavailable', fetchedAt: new Date().toISOString() };
    }

    try {
      const balances = await this.walletService.getAllBalances();
      const result: RealChainData = {
        balances,
        source: 'live',
        fetchedAt: new Date().toISOString(),
      };
      this.cachedChainData = result;
      logger.info(`RealDataProvider: chain data fetched — ${balances.length} chains`);
      return result;
    } catch (err) {
      logger.warn('RealDataProvider: chain data fetch failed, using cached data', { error: String(err) });
      if (this.cachedChainData) return this.cachedChainData;
      return { balances: [], source: 'unavailable', fetchedAt: new Date().toISOString() };
    }
  }

  // ── Real Gas Data ───────────────────────────────────────────

  /**
   * Fetch real gas prices from public Ethereum RPCs (no API key needed).
   * Falls back to cached gas data if the RPC is unreachable.
   */
  async getRealGasData(): Promise<RealGasData> {
    const rpcs = [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://rpc.sepolia.org',
      'https://sepolia.drpc.org',
    ];

    for (const rpc of rpcs) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5_000);

        const response = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_gasPrice',
            params: [],
            id: 1,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) continue;

        const data = (await response.json()) as { result?: string };
        if (data.result) {
          const gasWei = parseInt(data.result, 16);
          const gasGwei = (gasWei / 1e9).toFixed(2);

          const result: RealGasData = {
            ethereum: { gasPrice: `${gasGwei} gwei`, source: rpc },
            fetchedAt: new Date().toISOString(),
            source: 'live',
          };
          this.cachedGasData = result;
          logger.info(`RealDataProvider: gas price fetched — ${gasGwei} gwei from ${rpc}`);
          return result;
        }
      } catch {
        // Try next RPC
      }
    }

    logger.warn('RealDataProvider: all gas RPCs failed, using cached data');
    if (this.cachedGasData) return this.cachedGasData;
    return { ethereum: null, fetchedAt: new Date().toISOString(), source: 'unavailable' };
  }

  // ── Summary ─────────────────────────────────────────────────

  /**
   * Get a summary of all available real data sources and their status.
   */
  getDataSourceStatus(): {
    rumble: 'live' | 'cached' | 'unavailable';
    chain: 'live' | 'cached' | 'unavailable';
    gas: 'live' | 'cached' | 'unavailable';
  } {
    return {
      rumble: this.cachedCreatorData?.source ?? 'unavailable',
      chain: this.cachedChainData?.source ?? 'unavailable',
      gas: this.cachedGasData?.source ?? 'unavailable',
    };
  }
}

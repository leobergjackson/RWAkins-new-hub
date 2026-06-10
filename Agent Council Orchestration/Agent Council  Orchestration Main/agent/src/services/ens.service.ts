import { JsonRpcProvider } from 'ethers';
import { logger } from '../utils/logger.js';

/** Cached ENS resolution entry */
interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

/** TTL for cache entries in milliseconds (5 minutes) */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * ENSService — Resolves .eth names to Ethereum addresses and vice versa.
 * Uses ethers.js JsonRpcProvider against Ethereum mainnet (ENS only works on mainnet).
 * Results are cached in memory with a 5-minute TTL.
 */
export class ENSService {
  private provider: JsonRpcProvider;
  private forwardCache: Map<string, CacheEntry> = new Map();
  private reverseCache: Map<string, CacheEntry> = new Map();

  constructor() {
    // Use env var for custom RPC, otherwise ethers default mainnet
    const rpcUrl = process.env.ETH_MAINNET_RPC || 'https://cloudflare-eth.com';
    this.provider = new JsonRpcProvider(rpcUrl);
    logger.info('ENS service initialized', { rpcUrl });
  }

  /**
   * Resolve an ENS name (e.g. "vitalik.eth") to an Ethereum address.
   * Returns null if resolution fails or the name is not registered.
   */
  async resolveENS(name: string): Promise<string | null> {
    const normalizedName = name.toLowerCase().trim();

    // Check cache
    const cached = this.forwardCache.get(normalizedName);
    if (cached && cached.expiresAt > Date.now()) {
      logger.debug('ENS cache hit (forward)', { name: normalizedName, address: cached.value });
      return cached.value;
    }

    try {
      const address = await this.provider.resolveName(normalizedName);
      // Cache the result (even null to avoid repeated lookups)
      this.forwardCache.set(normalizedName, {
        value: address,
        expiresAt: Date.now() + CACHE_TTL,
      });

      if (address) {
        logger.info('ENS resolved', { name: normalizedName, address });
      } else {
        logger.info('ENS name not found', { name: normalizedName });
      }

      return address;
    } catch (err) {
      logger.warn('ENS resolution failed', { name: normalizedName, error: String(err) });
      // Cache failure to prevent repeated slow lookups
      this.forwardCache.set(normalizedName, {
        value: null,
        expiresAt: Date.now() + CACHE_TTL,
      });
      return null;
    }
  }

  /**
   * Reverse-lookup an Ethereum address to its primary ENS name.
   * Returns null if no reverse record is set.
   */
  async lookupAddress(address: string): Promise<string | null> {
    const normalizedAddress = address.toLowerCase().trim();

    // Check cache
    const cached = this.reverseCache.get(normalizedAddress);
    if (cached && cached.expiresAt > Date.now()) {
      logger.debug('ENS cache hit (reverse)', { address: normalizedAddress, name: cached.value });
      return cached.value;
    }

    try {
      const name = await this.provider.lookupAddress(normalizedAddress);
      this.reverseCache.set(normalizedAddress, {
        value: name,
        expiresAt: Date.now() + CACHE_TTL,
      });

      if (name) {
        logger.info('ENS reverse lookup', { address: normalizedAddress, name });
      }

      return name;
    } catch (err) {
      logger.warn('ENS reverse lookup failed', { address: normalizedAddress, error: String(err) });
      this.reverseCache.set(normalizedAddress, {
        value: null,
        expiresAt: Date.now() + CACHE_TTL,
      });
      return null;
    }
  }

  /** Clear expired cache entries */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.forwardCache) {
      if (entry.expiresAt <= now) this.forwardCache.delete(key);
    }
    for (const [key, entry] of this.reverseCache) {
      if (entry.expiresAt <= now) this.reverseCache.delete(key);
    }
  }
}

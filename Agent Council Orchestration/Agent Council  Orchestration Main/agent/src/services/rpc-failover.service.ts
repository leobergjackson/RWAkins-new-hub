// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — RPC Failover Middleware (Feature 33)
//
// For each chain, supports multiple RPC endpoints.
// If primary fails, automatically switches to backup.
// Tracks RPC health: which endpoints are up/down.

import { logger } from '../utils/logger.js';

// ── Types ────────────────────────────────────────────────────────

/** RPC endpoint health status */
export interface RpcEndpoint {
  url: string;
  chain: string;
  role: 'primary' | 'backup';
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  lastError?: string;
  responseTimeMs?: number;
  failCount: number;
  successCount: number;
}

/** Overall RPC health status */
export interface RpcHealthStatus {
  endpoints: RpcEndpoint[];
  activeEndpoints: Record<string, string>; // chain → currently active URL
  failovers: number;
  lastFailover?: string;
}

// ── Service ──────────────────────────────────────────────────────

/**
 * RpcFailoverService — automatic RPC endpoint failover for all chains.
 *
 * Configuration via env vars:
 *   ETH_RPC_PRIMARY, ETH_RPC_BACKUP
 *   TON_RPC_PRIMARY, TON_RPC_BACKUP
 *   TRON_RPC_PRIMARY, TRON_RPC_BACKUP
 */
export class RpcFailoverService {
  private endpoints: Map<string, RpcEndpoint[]> = new Map();
  private activeEndpoints: Map<string, string> = new Map();
  private failoverCount = 0;
  private lastFailover?: string;

  constructor() {
    this.initEndpoints();
    logger.info('RPC failover service initialized', {
      chains: Array.from(this.endpoints.keys()),
      totalEndpoints: Array.from(this.endpoints.values()).reduce((s, eps) => s + eps.length, 0),
    });
  }

  /** Initialize RPC endpoints from env vars */
  private initEndpoints(): void {
    const chains: Array<{
      chain: string;
      primaryEnv: string;
      backupEnv: string;
      defaultPrimary: string;
      defaultBackup: string;
    }> = [
      {
        chain: 'ethereum-sepolia',
        primaryEnv: 'ETH_RPC_PRIMARY',
        backupEnv: 'ETH_RPC_BACKUP',
        defaultPrimary: 'https://rpc.sepolia.org',
        defaultBackup: 'https://ethereum-sepolia.publicnode.com',
      },
      {
        chain: 'ton-testnet',
        primaryEnv: 'TON_RPC_PRIMARY',
        backupEnv: 'TON_RPC_BACKUP',
        defaultPrimary: 'https://testnet.toncenter.com/api/v2',
        defaultBackup: 'https://testnet.tonhubapi.com',
      },
      {
        chain: 'tron-nile',
        primaryEnv: 'TRON_RPC_PRIMARY',
        backupEnv: 'TRON_RPC_BACKUP',
        defaultPrimary: 'https://nile.trongrid.io',
        defaultBackup: 'https://api.nileex.io',
      },
    ];

    for (const config of chains) {
      const primaryUrl = process.env[config.primaryEnv] ?? config.defaultPrimary;
      const backupUrl = process.env[config.backupEnv] ?? config.defaultBackup;

      const endpoints: RpcEndpoint[] = [
        this.createEndpoint(primaryUrl, config.chain, 'primary'),
        this.createEndpoint(backupUrl, config.chain, 'backup'),
      ];

      this.endpoints.set(config.chain, endpoints);
      this.activeEndpoints.set(config.chain, primaryUrl);
    }
  }

  private createEndpoint(url: string, chain: string, role: 'primary' | 'backup'): RpcEndpoint {
    return {
      url,
      chain,
      role,
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      failCount: 0,
      successCount: 0,
    };
  }

  /**
   * Get the active RPC URL for a chain.
   * If the current primary is down, returns the backup.
   */
  getActiveRpc(chain: string): string | undefined {
    return this.activeEndpoints.get(chain);
  }

  /**
   * Report a successful RPC call.
   * Updates health metrics.
   */
  reportSuccess(chain: string, responseTimeMs?: number): void {
    const activeUrl = this.activeEndpoints.get(chain);
    const eps = this.endpoints.get(chain) ?? [];
    const ep = eps.find(e => e.url === activeUrl);
    if (ep) {
      ep.status = 'healthy';
      ep.successCount++;
      ep.responseTimeMs = responseTimeMs;
      ep.lastCheck = new Date().toISOString();
    }
  }

  /**
   * Report a failed RPC call.
   * If failures exceed threshold, automatically fail over to backup.
   */
  reportFailure(chain: string, error: string): void {
    const activeUrl = this.activeEndpoints.get(chain);
    const eps = this.endpoints.get(chain) ?? [];
    const ep = eps.find(e => e.url === activeUrl);

    if (ep) {
      ep.failCount++;
      ep.lastError = error;
      ep.lastCheck = new Date().toISOString();

      // After 3 consecutive failures, mark as down and switch
      if (ep.failCount >= 3) {
        ep.status = 'down';

        // Find a healthy backup
        const backup = eps.find(e => e.url !== activeUrl && e.status !== 'down');
        if (backup) {
          this.activeEndpoints.set(chain, backup.url);
          this.failoverCount++;
          this.lastFailover = new Date().toISOString();

          logger.warn(`${chain} primary RPC failed, switching to backup`, {
            from: activeUrl?.slice(0, 40),
            to: backup.url.slice(0, 40),
            failCount: ep.failCount,
          });
        } else {
          logger.error(`${chain}: ALL RPC endpoints are down — no backup available`, {
            failCount: ep.failCount,
          });
        }
      } else {
        ep.status = 'degraded';
      }
    }
  }

  /**
   * Reset a chain's endpoint to primary.
   * Call this periodically to re-check if primary has recovered.
   */
  resetToPrimary(chain: string): void {
    const eps = this.endpoints.get(chain) ?? [];
    const primary = eps.find(e => e.role === 'primary');
    if (primary) {
      primary.status = 'healthy';
      primary.failCount = 0;
      this.activeEndpoints.set(chain, primary.url);
      logger.info(`${chain}: Reset to primary RPC`, { url: primary.url.slice(0, 40) });
    }
  }

  /** Get full RPC health status */
  getHealth(): RpcHealthStatus {
    const allEndpoints: RpcEndpoint[] = [];
    for (const eps of this.endpoints.values()) {
      allEndpoints.push(...eps);
    }

    const active: Record<string, string> = {};
    for (const [chain, url] of this.activeEndpoints) {
      active[chain] = url;
    }

    return {
      endpoints: allEndpoints,
      activeEndpoints: active,
      failovers: this.failoverCount,
      lastFailover: this.lastFailover,
    };
  }
}

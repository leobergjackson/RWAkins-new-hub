// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Configurable Tip Splitting Service
//
// Splits incoming tips across multiple recipients (creator, editor, community pool, etc.)
// using basis-point shares (1 bp = 0.01%). Executes one WDK transfer per share.

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { WalletService } from './wallet.service.js';
import type { ChainId, TokenType } from '../types/index.js';

// ── Types ────────────────────────────────────────────────────────

/** A single share within a split configuration */
export interface SplitShare {
  address: string;
  basisPoints: number; // 1 bp = 0.01%, must sum to 10000 across all shares
  label: string;
}

/** A named split configuration */
export interface SplitConfig {
  id: string;
  name: string;
  shares: SplitShare[];
  createdAt: string;
}

/** Result of a single share transfer within a split execution */
export interface ShareTransferResult {
  address: string;
  label: string;
  basisPoints: number;
  amount: string;
  txHash: string | null;
  status: 'confirmed' | 'failed';
  error?: string;
}

/** Result of executing a full split */
export interface SplitExecutionResult {
  id: string;
  splitId: string;
  splitName: string;
  totalAmount: string;
  chainId: ChainId;
  token: TokenType;
  transfers: ShareTransferResult[];
  succeeded: number;
  failed: number;
  executedAt: string;
}

/** Aggregate statistics for the split service */
export interface SplitStats {
  totalSplitsConfigured: number;
  totalExecutions: number;
  totalDistributed: number;
}

// ── Constants ────────────────────────────────────────────────────

const MAX_HISTORY = 500;
const BASIS_POINTS_TOTAL = 10000;

// ── Service ──────────────────────────────────────────────────────

/**
 * TipSplitterService — Configurable tip splitting with WDK execution.
 *
 * Each split config defines named shares that must sum to 10000 basis points.
 * On execution, each share receives its proportional amount via a separate
 * WDK transfer, enabling transparent multi-party tipping.
 */
export class TipSplitterService {
  private configs = new Map<string, SplitConfig>();
  private executionHistory: SplitExecutionResult[] = [];
  private wallet: WalletService | null = null;

  constructor(wallet?: WalletService) {
    this.wallet = wallet ?? null;

    // Pre-configure the default split: 80% creator, 10% editor, 10% community
    this.configs.set('default', {
      id: 'default',
      name: 'Default Creator Split',
      shares: [
        { address: '0x0000000000000000000000000000000000000001', basisPoints: 8000, label: 'creator' },
        { address: '0x0000000000000000000000000000000000000002', basisPoints: 1000, label: 'editor' },
        { address: '0x0000000000000000000000000000000000000003', basisPoints: 1000, label: 'community-pool' },
      ],
      createdAt: new Date().toISOString(),
    });

    logger.info('TipSplitterService initialized with default split config');
  }

  /** Wire the wallet service after construction (called by ServiceRegistry.initialize) */
  setWalletService(wallet: WalletService): void {
    this.wallet = wallet;
  }

  // ── Config Management ──────────────────────────────────────────

  /**
   * Create a new split configuration.
   * Validates that basis points sum to exactly 10000.
   */
  createSplit(name: string, shares: SplitShare[]): SplitConfig {
    // Validate basis points
    const totalBp = shares.reduce((sum, s) => sum + s.basisPoints, 0);
    if (totalBp !== BASIS_POINTS_TOTAL) {
      throw new Error(
        `Basis points must sum to ${BASIS_POINTS_TOTAL} (100%), got ${totalBp}`,
      );
    }

    // Validate individual shares
    for (const share of shares) {
      if (share.basisPoints <= 0) {
        throw new Error(`Each share must have positive basisPoints, got ${share.basisPoints} for "${share.label}"`);
      }
      if (!share.address) {
        throw new Error(`Each share must have a non-empty address`);
      }
    }

    const config: SplitConfig = {
      id: uuidv4(),
      name,
      shares,
      createdAt: new Date().toISOString(),
    };

    this.configs.set(config.id, config);
    logger.info('Created split config', { id: config.id, name, shareCount: shares.length });
    return config;
  }

  /** Get a split config by ID */
  getSplit(id: string): SplitConfig | undefined {
    return this.configs.get(id);
  }

  /** List all split configs */
  listSplits(): SplitConfig[] {
    return Array.from(this.configs.values());
  }

  // ── Execution ──────────────────────────────────────────────────

  /**
   * Execute a split: distribute `amount` across all shares in the config,
   * sending one WDK transfer per share.
   */
  async executeSplit(
    splitId: string,
    amount: number,
    chainId: ChainId,
    token: TokenType = 'usdt',
  ): Promise<SplitExecutionResult> {
    const config = this.configs.get(splitId);
    if (!config) {
      throw new Error(`Split config "${splitId}" not found`);
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const transfers: ShareTransferResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const share of config.shares) {
      const shareAmount = (amount * share.basisPoints) / BASIS_POINTS_TOTAL;
      const shareAmountStr = shareAmount.toFixed(6);

      try {
        let txHash: string | null = null;

        if (this.wallet) {
          // Execute real WDK transfer
          if (token === 'usdt') {
            const result = await this.wallet.sendUsdtTransfer(chainId, share.address, shareAmountStr);
            txHash = result.hash;
          } else {
            const result = await this.wallet.sendTransaction(chainId, share.address, shareAmountStr);
            txHash = result.hash;
          }
        } else {
          // Simulation mode — no wallet connected
          txHash = `sim_${uuidv4().slice(0, 8)}`;
        }

        transfers.push({
          address: share.address,
          label: share.label,
          basisPoints: share.basisPoints,
          amount: shareAmountStr,
          txHash,
          status: 'confirmed',
        });
        succeeded++;
      } catch (err) {
        transfers.push({
          address: share.address,
          label: share.label,
          basisPoints: share.basisPoints,
          amount: shareAmountStr,
          txHash: null,
          status: 'failed',
          error: String(err),
        });
        failed++;
        logger.error('Split share transfer failed', {
          splitId, label: share.label, address: share.address, error: String(err),
        });
      }
    }

    const result: SplitExecutionResult = {
      id: uuidv4(),
      splitId,
      splitName: config.name,
      totalAmount: amount.toFixed(6),
      chainId,
      token,
      transfers,
      succeeded,
      failed,
      executedAt: new Date().toISOString(),
    };

    this.executionHistory.push(result);
    if (this.executionHistory.length > MAX_HISTORY) {
      this.executionHistory.splice(0, this.executionHistory.length - MAX_HISTORY);
    }

    logger.info('Split executed', {
      splitId, name: config.name, totalAmount: amount, succeeded, failed,
    });

    return result;
  }

  // ── History & Stats ────────────────────────────────────────────

  /** Get execution history for a specific split config */
  getSplitHistory(splitId: string): SplitExecutionResult[] {
    return this.executionHistory.filter((e) => e.splitId === splitId);
  }

  /** Get all execution history */
  getAllHistory(): SplitExecutionResult[] {
    return [...this.executionHistory];
  }

  /** Get aggregate statistics */
  getStats(): SplitStats {
    const totalDistributed = this.executionHistory.reduce(
      (sum, e) => sum + parseFloat(e.totalAmount),
      0,
    );

    return {
      totalSplitsConfigured: this.configs.size,
      totalExecutions: this.executionHistory.length,
      totalDistributed: Math.round(totalDistributed * 1e6) / 1e6,
    };
  }
}

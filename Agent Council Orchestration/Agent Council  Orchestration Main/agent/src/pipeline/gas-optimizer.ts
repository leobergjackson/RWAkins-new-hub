// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Cross-Chain Gas Optimizer
// Compares gas costs across all available chains via WDK and picks the cheapest.

import { logger } from '../utils/logger.js';
import type { WalletService } from '../services/wallet.service.js';
import type { ChainId } from '../types/index.js';

// ── Types ──────────────────────────────────────────────────────

export interface GasOptimizationResult {
  /** The chain selected as cheapest viable option */
  selectedChain: ChainId;
  /** Why this chain was selected */
  reason: string;
  /** Fee on the selected chain in USD */
  selectedFeeUsd: string;
  /** Is this a gasless transaction? */
  isGasless: boolean;
  /** All chains ranked by fee */
  rankings: ChainGasRanking[];
  /** Amount saved vs the most expensive option */
  savingsUsd: string;
  /** Human-readable optimization log */
  optimizationLog: string;
  /** Time spent optimizing (ms) */
  optimizationTimeMs: number;
}

export interface ChainGasRanking {
  chainId: ChainId;
  chainName: string;
  feeUsd: number;
  feeNative: string;
  hasBalance: boolean;
  isGasless: boolean;
  viable: boolean;
  viabilityReason: string;
  rank: number;
}

/** Gasless chain identifiers */
const GASLESS_CHAINS: Set<ChainId> = new Set([
  'ethereum-sepolia-gasless',
  'ton-testnet-gasless',
]);

/** Chain display names */
const CHAIN_NAMES: Record<string, string> = {
  'ethereum-sepolia': 'Ethereum Sepolia',
  'ton-testnet': 'TON Testnet',
  'tron-nile': 'Tron Nile',
  'ethereum-sepolia-gasless': 'Ethereum (Gasless/ERC-4337)',
  'ton-testnet-gasless': 'TON (Gasless)',
  'bitcoin-testnet': 'Bitcoin Testnet',
  'solana-devnet': 'Solana Devnet',
  'plasma': 'Plasma',
  'stable': 'Stable',
};

// ── Service ────────────────────────────────────────────────────

/**
 * GasOptimizer — Intelligent cross-chain gas cost optimization.
 *
 * Before any transaction, compares gas across all registered chains:
 * 1. Calls WDK account.quoteSendTransaction() on every available chain
 * 2. Checks balance sufficiency on each chain
 * 3. Prefers gasless chains (ERC-4337, TON gasless) when available
 * 4. Picks the cheapest chain that has sufficient balance
 * 5. Logs savings: "Chose Polygon ($0.001) over Ethereum ($2.50) — saved $2.499"
 */
export class GasOptimizer {
  private walletService: WalletService;
  private optimizationHistory: GasOptimizationResult[] = [];

  constructor(walletService: WalletService) {
    this.walletService = walletService;
  }

  /**
   * Find the cheapest chain to execute a transaction on.
   * Queries fee estimates across all registered chains via WDK.
   *
   * @param recipient — destination address
   * @param amount — human-readable amount (e.g., "0.01")
   * @param token — 'native' | 'usdt' | 'usat' | 'xaut'
   * @param preferredChain — optional hint, still checked for viability
   */
  async optimize(
    recipient: string,
    amount: string,
    token: string = 'usdt',
    preferredChain?: ChainId,
  ): Promise<GasOptimizationResult> {
    const startTime = Date.now();
    const chains = this.walletService.getRegisteredChains();

    logger.info('Gas optimization starting', {
      recipient: recipient.slice(0, 16) + '...',
      amount,
      token,
      chainsToCheck: chains.length,
    });

    // 1. Gather fee estimates and balances in parallel via WDK
    const rankings: ChainGasRanking[] = await Promise.all(
      chains.map(async (chainId, _idx) => {
        const isGasless = GASLESS_CHAINS.has(chainId);
        const chainName = CHAIN_NAMES[chainId] ?? chainId;

        try {
          // Get fee estimate via WDK account.quoteSendTransaction()
          const { fee } = await this.walletService.estimateFee(chainId, recipient, amount);
          const feeUsd = this.estimateFeeUsd(chainId, fee);

          // Check balance via WDK account.getBalance() + account.getTokenBalance()
          const balance = await this.walletService.getBalance(chainId);
          const hasBalance = this.hasEnoughBalance(balance, amount, token);

          // Gasless chains have zero gas cost
          const effectiveFeeUsd = isGasless ? 0 : feeUsd;

          return {
            chainId,
            chainName,
            feeUsd: effectiveFeeUsd,
            feeNative: isGasless ? '0' : fee,
            hasBalance,
            isGasless,
            viable: hasBalance,
            viabilityReason: hasBalance ? 'sufficient balance' : 'insufficient balance',
            rank: 0, // assigned after sorting
          };
        } catch (err) {
          return {
            chainId,
            chainName,
            feeUsd: Infinity,
            feeNative: 'error',
            hasBalance: false,
            isGasless,
            viable: false,
            viabilityReason: `chain error: ${String(err).slice(0, 80)}`,
            rank: 0,
          };
        }
      }),
    );

    // 2. Sort: gasless first, then by fee ascending, then by viability
    rankings.sort((a, b) => {
      // Viable chains first
      if (a.viable && !b.viable) return -1;
      if (!a.viable && b.viable) return 1;
      // Gasless chains first among viable
      if (a.viable && b.viable) {
        if (a.isGasless && !b.isGasless) return -1;
        if (!a.isGasless && b.isGasless) return 1;
      }
      // Then by fee
      return a.feeUsd - b.feeUsd;
    });

    // Assign ranks
    rankings.forEach((r, i) => { r.rank = i + 1; });

    // 3. Select the best chain
    const viable = rankings.filter((r) => r.viable);
    let selected: ChainGasRanking;
    let reason: string;

    if (preferredChain) {
      const preferred = rankings.find((r) => r.chainId === preferredChain && r.viable);
      if (preferred) {
        selected = preferred;
        reason = `User preferred chain ${preferred.chainName} is viable`;
      } else {
        // Preferred chain not viable — fall back to cheapest
        selected = viable[0] ?? rankings[0];
        reason = preferredChain
          ? `Preferred chain ${preferredChain} not viable — falling back to cheapest`
          : 'No viable chains — selecting best available';
      }
    } else {
      selected = viable[0] ?? rankings[0];
      reason = selected.isGasless
        ? `Gasless chain ${selected.chainName} available — zero gas cost`
        : `Cheapest viable chain: ${selected.chainName} ($${selected.feeUsd.toFixed(4)})`;
    }

    // 4. Calculate savings
    const mostExpensive = viable.length > 0
      ? viable[viable.length - 1].feeUsd
      : 0;
    const savingsUsd = (mostExpensive - selected.feeUsd).toFixed(4);

    // 5. Build optimization log
    const optimizationLog = this.buildLog(selected, rankings, savingsUsd);
    const optimizationTimeMs = Date.now() - startTime;

    const result: GasOptimizationResult = {
      selectedChain: selected.chainId,
      reason,
      selectedFeeUsd: `$${selected.feeUsd.toFixed(4)}`,
      isGasless: selected.isGasless,
      rankings,
      savingsUsd: `$${savingsUsd}`,
      optimizationLog,
      optimizationTimeMs,
    };

    // Store in history
    this.optimizationHistory.push(result);
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory.shift();
    }

    logger.info('Gas optimization complete', {
      selected: selected.chainId,
      feeUsd: selected.feeUsd.toFixed(4),
      isGasless: selected.isGasless,
      savingsUsd,
      timeMs: optimizationTimeMs,
    });

    return result;
  }

  /** Get optimization history */
  getHistory(): GasOptimizationResult[] {
    return [...this.optimizationHistory];
  }

  /** Get total gas saved across all optimizations */
  getTotalSavings(): { totalSavedUsd: number; optimizationCount: number } {
    const totalSavedUsd = this.optimizationHistory.reduce(
      (sum, r) => sum + parseFloat(r.savingsUsd.replace('$', '')),
      0,
    );
    return { totalSavedUsd, optimizationCount: this.optimizationHistory.length };
  }

  // ── Private helpers ──────────────────────────────────────────

  /**
   * Estimate fee in USD using approximate prices.
   * Same logic as WalletService for consistency.
   */
  private estimateFeeUsd(chainId: ChainId, fee: string): number {
    const feeVal = parseFloat(fee);
    if (isNaN(feeVal)) return 0;
    // Approximate prices for fee ranking only — not financial advice
    if (chainId.startsWith('ethereum')) return feeVal * 2500;
    if (chainId.startsWith('ton')) return feeVal * 2.5;
    if (chainId.startsWith('tron')) return feeVal * 0.25;
    if (chainId.startsWith('bitcoin')) return feeVal * 60000;
    if (chainId.startsWith('solana')) return feeVal * 150;
    if (chainId === 'plasma' || chainId === 'stable') return feeVal * 2500; // EVM L2
    return feeVal;
  }

  /** Check if a chain has enough balance for the transfer */
  private hasEnoughBalance(
    balance: { nativeBalance: string; usdtBalance: string },
    amount: string,
    token: string,
  ): boolean {
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) return false;

    if (token === 'native') {
      return parseFloat(balance.nativeBalance) >= amountVal;
    }
    // For USDT/USAT/XAUT — check token balance
    return parseFloat(balance.usdtBalance) >= amountVal;
  }

  /** Build human-readable optimization log */
  private buildLog(
    selected: ChainGasRanking,
    rankings: ChainGasRanking[],
    savingsUsd: string,
  ): string {
    const lines: string[] = [
      `Gas Optimization Report`,
      `Selected: ${selected.chainName} (${selected.isGasless ? 'GASLESS' : `$${selected.feeUsd.toFixed(4)}`})`,
    ];

    const viable = rankings.filter((r) => r.viable);
    if (viable.length > 1) {
      const mostExpensive = viable[viable.length - 1];
      lines.push(
        `Chose ${selected.chainName} ($${selected.feeUsd.toFixed(4)}) over ` +
        `${mostExpensive.chainName} ($${mostExpensive.feeUsd.toFixed(4)}) — saved $${savingsUsd}`,
      );
    }

    lines.push('', 'Chain Rankings:');
    for (const r of rankings) {
      const status = r.viable ? 'OK' : 'SKIP';
      const gasless = r.isGasless ? ' [GASLESS]' : '';
      lines.push(
        `  #${r.rank} ${r.chainName}: $${r.feeUsd === Infinity ? 'N/A' : r.feeUsd.toFixed(4)}${gasless} [${status}] ${r.viabilityReason}`,
      );
    }

    return lines.join('\n');
  }
}

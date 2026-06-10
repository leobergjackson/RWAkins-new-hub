// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Self-test service: proves WDK wallet liveness on Sepolia

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WalletService } from './wallet.service.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = resolve(__dirname, '..', '..', '.self-test-tx.json');

export interface SelfTestResult {
  walletAddress: string;
  txHash: string | null;
  etherscanLink: string | null;
  signatureProof: string | null;
  timestamp: string;
  proof: string;
  method: 'self-transfer' | 'message-sign' | 'cached';
  network: 'ethereum-sepolia';
  cached: boolean;
}

/**
 * Self-test service for proving WDK wallet operational status.
 *
 * Attempts a 0-value self-transfer on Sepolia to prove wallet liveness.
 * Falls back to signing a message if the transfer fails (still proves WDK works).
 * Caches the result so subsequent calls return instantly.
 */
export class SelfTestService {
  private cachedResult: SelfTestResult | null = null;
  private running = false;

  constructor(private wallet: WalletService) {
    // Load cached result from disk if available
    this.loadFromDisk();
  }

  /**
   * Run the self-test. Returns cached result if already completed.
   */
  async runSelfTest(): Promise<SelfTestResult> {
    // Return cached result if available
    if (this.cachedResult) {
      return { ...this.cachedResult, cached: true, method: 'cached' };
    }

    // Prevent concurrent runs
    if (this.running) {
      return {
        walletAddress: '',
        txHash: null,
        etherscanLink: null,
        signatureProof: null,
        timestamp: new Date().toISOString(),
        proof: 'Self-test already in progress, please wait...',
        method: 'self-transfer',
        network: 'ethereum-sepolia',
        cached: false,
      };
    }

    this.running = true;

    try {
      const walletAddress = await this.wallet.getAddress('ethereum-sepolia');

      // Attempt 1: 0-value self-transfer (proves full wallet control)
      try {
        const result = await this.wallet.sendTransaction('ethereum-sepolia', walletAddress, '0');
        const txHash = result.hash;
        const etherscanLink = `https://sepolia.etherscan.io/tx/${txHash}`;

        const selfTestResult: SelfTestResult = {
          walletAddress,
          txHash,
          etherscanLink,
          signatureProof: null,
          timestamp: new Date().toISOString(),
          proof: 'WDK wallet operational — 0-value self-transfer confirmed on Sepolia',
          method: 'self-transfer',
          network: 'ethereum-sepolia',
          cached: false,
        };

        this.cachedResult = selfTestResult;
        this.saveToDisk(selfTestResult);
        logger.info('Self-test succeeded via self-transfer', { txHash, etherscanLink });
        return selfTestResult;
      } catch (transferErr) {
        logger.warn('Self-test transfer failed, falling back to message signing', {
          error: String(transferErr),
        });
      }

      // Attempt 2: Sign a message (proves key control without gas)
      try {
        const message = `AeroFyta self-test proof | wallet: ${walletAddress} | time: ${Date.now()}`;
        const { signature, publicKey } = await this.wallet.signMessage('ethereum-sepolia', message);

        const selfTestResult: SelfTestResult = {
          walletAddress,
          txHash: null,
          etherscanLink: `https://sepolia.etherscan.io/address/${walletAddress}`,
          signatureProof: JSON.stringify({ message, signature, publicKey }),
          timestamp: new Date().toISOString(),
          proof: 'WDK wallet operational — message signed with private key (no gas for self-transfer)',
          method: 'message-sign',
          network: 'ethereum-sepolia',
          cached: false,
        };

        this.cachedResult = selfTestResult;
        this.saveToDisk(selfTestResult);
        logger.info('Self-test succeeded via message signing', { walletAddress });
        return selfTestResult;
      } catch (signErr) {
        logger.error('Self-test signing also failed', { error: String(signErr) });
        throw new Error(
          `Self-test failed: transfer error and signing error. Wallet: ${walletAddress}. ` +
          `Ensure Sepolia ETH is available. Error: ${String(signErr)}`,
        );
      }
    } finally {
      this.running = false;
    }
  }

  /** Check if a cached result exists */
  hasCachedResult(): boolean {
    return this.cachedResult !== null;
  }

  /** Get cached result without running the test */
  getCachedResult(): SelfTestResult | null {
    if (!this.cachedResult) return null;
    return { ...this.cachedResult, cached: true, method: 'cached' };
  }

  /** Clear the cached result (forces re-run on next call) */
  clearCache(): void {
    this.cachedResult = null;
    try {
      if (existsSync(CACHE_PATH)) {
        const { unlinkSync } = require('node:fs');
        unlinkSync(CACHE_PATH);
      }
    } catch {
      // ignore cleanup errors
    }
  }

  // ── Private helpers ────────────────────────────────────────────

  private loadFromDisk(): void {
    try {
      if (existsSync(CACHE_PATH)) {
        const raw = readFileSync(CACHE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (data && (data.txHash || data.signatureProof)) {
          this.cachedResult = {
            walletAddress: data.walletAddress ?? data.address ?? '',
            txHash: data.txHash ?? null,
            etherscanLink: data.etherscanUrl ?? data.etherscanLink ?? null,
            signatureProof: data.signatureProof ?? null,
            timestamp: data.timestamp ?? new Date().toISOString(),
            proof: data.proof ?? 'WDK wallet operational (loaded from cache)',
            method: data.method ?? (data.txHash ? 'self-transfer' : 'message-sign'),
            network: 'ethereum-sepolia',
            cached: true,
          };
          logger.info('Self-test result loaded from disk cache');
        }
      }
    } catch {
      // ignore read errors
    }
  }

  private saveToDisk(result: SelfTestResult): void {
    try {
      writeFileSync(CACHE_PATH, JSON.stringify({
        txHash: result.txHash,
        etherscanUrl: result.etherscanLink,
        walletAddress: result.walletAddress,
        signatureProof: result.signatureProof,
        proof: result.proof,
        method: result.method,
        chain: 'ethereum-sepolia',
        timestamp: result.timestamp,
      }, null, 2));
      logger.info('Self-test result saved to disk');
    } catch (err) {
      logger.warn('Failed to save self-test result to disk', { error: String(err) });
    }
  }
}

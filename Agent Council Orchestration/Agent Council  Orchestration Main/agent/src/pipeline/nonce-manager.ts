// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Transaction Nonce Manager
// Prevents nonce collisions for concurrent transactions across chains.

import { logger } from '../utils/logger.js';
import type { ChainId } from '../types/index.js';

// ── Types ──────────────────────────────────────────────────────

export interface NonceSlot {
  chainId: ChainId;
  nonce: number;
  acquiredAt: string;
  txHash?: string;
  released: boolean;
}

interface ChainNonceState {
  /** Last confirmed on-chain nonce */
  baseNonce: number;
  /** Pending nonce slots — keys are the slot nonces */
  pending: Map<number, NonceSlot>;
  /** Lock to serialize nonce acquisition */
  lock: Promise<void>;
  lockRelease: (() => void) | null;
}

// ── Service ────────────────────────────────────────────────────

/**
 * NonceManager — Serialize and track nonces per chain.
 *
 * For EVM chains, nonce collisions cause immediate tx rejection.
 * This manager:
 * 1. Acquires a lock before reading nonce
 * 2. Tracks pending nonces per chain
 * 3. Retries with bumped nonce on nonce-too-low errors
 * 4. Releases lock on confirmation or timeout
 *
 * For non-EVM chains (TON, Tron, BTC, Solana) nonce management
 * is handled by the chain runtime — this manager still serializes
 * submissions to prevent duplicate broadcasts.
 */
export class NonceManager {
  private chains = new Map<ChainId, ChainNonceState>();
  private readonly lockTimeoutMs: number;

  constructor(lockTimeoutMs: number = 30_000) {
    this.lockTimeoutMs = lockTimeoutMs;
  }

  /**
   * Acquire the next nonce for a chain. Caller MUST call release()
   * when the transaction is confirmed or failed.
   */
  async acquireNonce(
    chainId: ChainId,
    getOnChainNonce: () => Promise<number>,
  ): Promise<{ nonce: number; release: (txHash?: string) => void }> {
    const state = this.getOrCreateState(chainId);

    // Serialize access — wait for previous lock
    await this.waitForLock(state, chainId);

    // Set our lock
    let lockRelease: () => void;
    state.lock = new Promise<void>((resolve) => { lockRelease = resolve; });
    state.lockRelease = lockRelease!;

    // Auto-release safety — prevent deadlocks
    const timeout = setTimeout(() => {
      logger.warn('Nonce lock timeout — force releasing', { chainId });
      lockRelease!();
      state.lockRelease = null;
    }, this.lockTimeoutMs);

    try {
      // Refresh base nonce from chain
      const onChainNonce = await getOnChainNonce();
      state.baseNonce = Math.max(state.baseNonce, onChainNonce);

      // Find next available nonce (skip any still-pending)
      let nextNonce = state.baseNonce;
      while (state.pending.has(nextNonce) && !state.pending.get(nextNonce)!.released) {
        nextNonce++;
      }

      const slot: NonceSlot = {
        chainId,
        nonce: nextNonce,
        acquiredAt: new Date().toISOString(),
        released: false,
      };
      state.pending.set(nextNonce, slot);

      logger.info('Nonce acquired', { chainId, nonce: nextNonce, pendingCount: state.pending.size });

      // Release function for the caller
      const release = (txHash?: string) => {
        clearTimeout(timeout);
        slot.txHash = txHash;
        slot.released = true;

        // Clean up confirmed slots below the new base
        this.cleanupConfirmed(state);

        // Release the chain lock
        if (state.lockRelease) {
          state.lockRelease();
          state.lockRelease = null;
        }

        logger.info('Nonce released', { chainId, nonce: nextNonce, txHash });
      };

      // Release the lock so next acquirer can proceed
      // (we've already reserved our slot)
      if (state.lockRelease) {
        state.lockRelease();
        state.lockRelease = null;
      }

      return { nonce: nextNonce, release };
    } catch (err) {
      clearTimeout(timeout);
      if (state.lockRelease) {
        state.lockRelease();
        state.lockRelease = null;
      }
      throw err;
    }
  }

  /**
   * Handle nonce-too-low error by bumping and retrying.
   * Returns a new nonce that should be used for the retry.
   */
  bumpNonce(chainId: ChainId, failedNonce: number): number {
    const state = this.getOrCreateState(chainId);

    // Mark the failed slot as released
    const failedSlot = state.pending.get(failedNonce);
    if (failedSlot) {
      failedSlot.released = true;
    }

    // Bump base nonce past the failure
    state.baseNonce = Math.max(state.baseNonce, failedNonce + 1);

    // Find next free nonce
    let nextNonce = state.baseNonce;
    while (state.pending.has(nextNonce) && !state.pending.get(nextNonce)!.released) {
      nextNonce++;
    }

    state.pending.set(nextNonce, {
      chainId,
      nonce: nextNonce,
      acquiredAt: new Date().toISOString(),
      released: false,
    });

    logger.info('Nonce bumped after nonce-too-low', {
      chainId,
      failedNonce,
      newNonce: nextNonce,
    });

    return nextNonce;
  }

  /** Check if an error is a nonce-related error */
  isNonceError(error: unknown): boolean {
    const msg = String(error).toLowerCase();
    return (
      msg.includes('nonce too low') ||
      msg.includes('nonce has already been used') ||
      msg.includes('replacement transaction underpriced') ||
      msg.includes('already known') ||
      msg.includes('invalid nonce')
    );
  }

  /** Get current state for a chain */
  getState(chainId: ChainId): { baseNonce: number; pendingCount: number; slots: NonceSlot[] } {
    const state = this.chains.get(chainId);
    if (!state) {
      return { baseNonce: 0, pendingCount: 0, slots: [] };
    }
    return {
      baseNonce: state.baseNonce,
      pendingCount: state.pending.size,
      slots: Array.from(state.pending.values()),
    };
  }

  /** Get all chain states */
  getAllStates(): Record<string, { baseNonce: number; pendingCount: number }> {
    const result: Record<string, { baseNonce: number; pendingCount: number }> = {};
    for (const [chainId, state] of this.chains) {
      result[chainId] = {
        baseNonce: state.baseNonce,
        pendingCount: state.pending.size,
      };
    }
    return result;
  }

  /** Reset state for a chain (e.g., after full resync) */
  reset(chainId: ChainId): void {
    this.chains.delete(chainId);
    logger.info('Nonce state reset', { chainId });
  }

  // ── Private helpers ──────────────────────────────────────────

  private getOrCreateState(chainId: ChainId): ChainNonceState {
    let state = this.chains.get(chainId);
    if (!state) {
      state = {
        baseNonce: 0,
        pending: new Map(),
        lock: Promise.resolve(),
        lockRelease: null,
      };
      this.chains.set(chainId, state);
    }
    return state;
  }

  private async waitForLock(state: ChainNonceState, chainId: ChainId): Promise<void> {
    const deadline = Date.now() + this.lockTimeoutMs;
    while (state.lockRelease !== null && Date.now() < deadline) {
      await Promise.race([
        state.lock,
        new Promise<void>((resolve) => setTimeout(resolve, 1000)),
      ]);
    }
    if (state.lockRelease !== null) {
      logger.warn('Force-breaking stale nonce lock', { chainId });
      state.lockRelease();
      state.lockRelease = null;
    }
  }

  private cleanupConfirmed(state: ChainNonceState): void {
    // Remove all released slots below the base nonce
    for (const [nonce, slot] of state.pending) {
      if (slot.released && nonce < state.baseNonce) {
        state.pending.delete(nonce);
      }
    }
  }
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Cross-Chain Atomic Swap Service using HTLC protocol

import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export interface AtomicSwapRequest {
  initiatorAddress: string;    // Alice
  counterpartyAddress: string; // Bob
  sendChain: string;           // 'ethereum-sepolia'
  sendAmount: string;          // '0.01'
  sendToken: string;           // 'native'
  receiveChain: string;        // 'ton-testnet'
  receiveAmount: string;       // '5.0'
  receiveToken: string;        // 'native'
}

export interface SwapSide {
  address: string;
  chain: string;
  amount: string;
  token: string;
  escrowId?: string;
  lockTxHash?: string;
}

export interface SwapEvent {
  timestamp: string;
  event: string;
  chain: string;
  txHash?: string;
}

export interface AtomicSwap {
  id: string;
  status: 'initiated' | 'counterparty_locked' | 'claimed' | 'refunded' | 'expired';

  // Initiator side (Alice)
  initiator: SwapSide;

  // Counterparty side (Bob)
  counterparty: SwapSide;

  // Shared HTLC params
  hashLock: string;           // Same on both chains
  secret?: string;            // Only revealed after claim
  initiatorTimelock: number;  // 24h (longer)
  counterpartyTimelock: number; // 12h (shorter — gives initiator time to claim)

  createdAt: string;
  completedAt?: string;

  // Audit trail
  events: SwapEvent[];
}

export interface AtomicSwapStats {
  total: number;
  completed: number;
  refunded: number;
  active: number;
  avgCompletionTime: number; // ms
}

/** Minimal interface for the escrow service dependency */
interface SwapEscrowService {
  createEscrow(params: {
    sender: string;
    recipient: string;
    amount: string;
    token: string;
    chainId: string;
    memo?: string;
    timelockHours?: number;
    releaseCondition?: string;
  }): Promise<{ escrow: { id: string; hashLock: string; lockTxHash?: string }; secret: string }>;

  claimEscrow(escrowId: string, secret: string): Promise<{ id: string; releaseTxHash?: string } | undefined>;

  refundEscrow(escrowId: string, reason?: string): Promise<{ id: string; refundTxHash?: string } | undefined>;

  getEscrow(id: string): { id: string; hashLock: string; htlcStatus: string } | undefined;
}

/** Minimal interface for the wallet service dependency */
interface SwapWalletService {
  getBalance?(chainId: string): Promise<{ usdtBalance: string }>;
  verifySignerAlignment?(expectedAddress: string, chainId: string): Promise<{ aligned: boolean; actualAddress: string; expectedAddress: string }>;
  getAddress?(chainId: string): Promise<string>;
}

// ── Constants ──────────────────────────────────────────────────

const INITIATOR_TIMELOCK_HOURS = 24;
const COUNTERPARTY_TIMELOCK_HOURS = 12;

// ── Service ────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const SWAP_FILE = join(__dirname, '..', '..', '.atomic-swaps.json');

/**
 * AtomicSwapService — Cross-chain atomic swaps using the HTLC protocol.
 *
 * Implements the classic hash time-locked contract pattern for trustless
 * cross-chain exchanges. The same SHA-256 hashLock is used on both chains,
 * creating an atomic link: if one side is claimed (revealing the secret),
 * the other side can also be claimed. If neither acts within the timelock,
 * both sides refund.
 *
 * Protocol flow:
 * 1. Alice generates a secret, computes hashLock = SHA-256(secret)
 * 2. Alice creates HTLC on her sendChain (24h timelock) via EscrowService
 * 3. Bob verifies Alice's HTLC, creates matching HTLC on his chain (12h timelock)
 *    using the SAME hashLock
 * 4. Alice claims Bob's HTLC by revealing the secret (on-chain TX on receiveChain)
 * 5. Bob reads the revealed secret and claims Alice's HTLC (on-chain TX on sendChain)
 * 6. If either party doesn't act, timelocks expire and funds refund
 *
 * The shorter counterparty timelock (12h vs 24h) ensures Alice has time to
 * claim Bob's funds before her own HTLC expires.
 */
export class AtomicSwapService {
  private swaps: AtomicSwap[] = [];
  private counter = 0;
  private escrowService?: SwapEscrowService;
  private walletService?: SwapWalletService;

  constructor() {
    this.load();
    logger.info('AtomicSwapService initialized', { active: this.swaps.filter(s => s.status === 'initiated' || s.status === 'counterparty_locked').length });
  }

  /** Wire the escrow service for HTLC operations */
  setEscrowService(escrow: SwapEscrowService): void {
    this.escrowService = escrow;
  }

  /** Wire the wallet service for balance checks */
  setWalletService(wallet: SwapWalletService): void {
    this.walletService = wallet;
  }

  // ── Crypto Helpers ─────────────────────────────────────────────

  /** Generate a random 32-byte secret and compute its SHA-256 hash */
  private generateHashLock(): { secret: string; hashLock: string } {
    const secretBytes = randomBytes(32);
    const secret = secretBytes.toString('hex');
    const hashLock = createHash('sha256').update(secretBytes).digest('hex');
    return { secret, hashLock };
  }

  /** Verify that a secret matches a hashLock */
  private verifySecret(secret: string, hashLock: string): boolean {
    const secretBytes = Buffer.from(secret, 'hex');
    const computed = createHash('sha256').update(secretBytes).digest('hex');
    return computed === hashLock;
  }

  // ── Core Operations ────────────────────────────────────────────

  /**
   * Step 1: Initiator (Alice) creates the first HTLC on the sendChain.
   * Generates a secret, locks funds via EscrowService, returns the secret
   * to Alice only.
   */
  async initiateSwap(request: AtomicSwapRequest): Promise<{ swap: AtomicSwap; secret: string }> {
    // Validate request
    if (!request.initiatorAddress || !request.counterpartyAddress) {
      throw new Error('Both initiator and counterparty addresses are required');
    }
    if (!request.sendChain || !request.receiveChain) {
      throw new Error('Both send and receive chains are required');
    }
    if (parseFloat(request.sendAmount) <= 0 || parseFloat(request.receiveAmount) <= 0) {
      throw new Error('Amounts must be positive');
    }

    const now = new Date();
    const swapId = `swap_${++this.counter}_${Date.now()}`;

    // Optional balance check via wallet service
    if (this.walletService?.getBalance) {
      try {
        const balance = await this.walletService.getBalance(request.sendChain);
        logger.debug('Swap initiator balance check', { chain: request.sendChain, balance: balance.usdtBalance });
      } catch {
        logger.debug('Balance check skipped for swap initiation');
      }
    }

    // Generate the shared secret and hashLock
    const { secret, hashLock } = this.generateHashLock();

    // Calculate timelocks
    const initiatorTimelock = now.getTime() + INITIATOR_TIMELOCK_HOURS * 60 * 60 * 1000;
    const counterpartyTimelock = now.getTime() + COUNTERPARTY_TIMELOCK_HOURS * 60 * 60 * 1000;

    // Create HTLC on the initiator's send chain via EscrowService
    let escrowId: string | undefined;
    let lockTxHash: string | undefined;

    if (this.escrowService) {
      const { escrow } = await this.escrowService.createEscrow({
        sender: request.initiatorAddress,
        recipient: request.counterpartyAddress,
        amount: request.sendAmount,
        token: request.sendToken,
        chainId: request.sendChain,
        memo: `Atomic swap ${swapId} — initiator lock`,
        timelockHours: INITIATOR_TIMELOCK_HOURS,
        releaseCondition: 'manual',
      });
      escrowId = escrow.id;
      lockTxHash = escrow.lockTxHash;
    }

    const swap: AtomicSwap = {
      id: swapId,
      status: 'initiated',
      initiator: {
        address: request.initiatorAddress,
        chain: request.sendChain,
        amount: request.sendAmount,
        token: request.sendToken,
        escrowId,
        lockTxHash,
      },
      counterparty: {
        address: request.counterpartyAddress,
        chain: request.receiveChain,
        amount: request.receiveAmount,
        token: request.receiveToken,
      },
      hashLock,
      initiatorTimelock,
      counterpartyTimelock,
      createdAt: now.toISOString(),
      events: [
        {
          timestamp: now.toISOString(),
          event: 'swap_initiated',
          chain: request.sendChain,
          txHash: lockTxHash,
        },
      ],
    };

    this.swaps.push(swap);
    this.save();

    logger.info('Atomic swap initiated', {
      id: swapId,
      sendChain: request.sendChain,
      receiveChain: request.receiveChain,
      sendAmount: request.sendAmount,
      receiveAmount: request.receiveAmount,
      hashLock: hashLock.slice(0, 16) + '...',
    });

    // Return secret to initiator ONLY — they share hashLock (not secret) with counterparty
    return { swap, secret };
  }

  /**
   * Step 2: Counterparty (Bob) responds by creating a matching HTLC on the
   * receive chain using the SAME hashLock. The counterparty escrow must be
   * created externally (via EscrowService) and linked here.
   */
  async respondToSwap(swapId: string, counterpartyEscrowId: string): Promise<AtomicSwap> {
    const swap = this.swaps.find(s => s.id === swapId);
    if (!swap) throw new Error(`Swap ${swapId} not found`);
    if (swap.status !== 'initiated') {
      throw new Error(`Swap ${swapId} is not in 'initiated' state (current: ${swap.status})`);
    }

    // Verify the counterparty's escrow uses the same hashLock
    if (this.escrowService) {
      const escrow = this.escrowService.getEscrow(counterpartyEscrowId);
      if (!escrow) throw new Error(`Counterparty escrow ${counterpartyEscrowId} not found`);
      if (escrow.hashLock !== swap.hashLock) {
        throw new Error('Counterparty escrow hashLock does not match swap hashLock — atomicity broken');
      }
    }

    swap.counterparty.escrowId = counterpartyEscrowId;
    swap.status = 'counterparty_locked';
    swap.events.push({
      timestamp: new Date().toISOString(),
      event: 'counterparty_locked',
      chain: swap.counterparty.chain,
    });

    this.save();

    logger.info('Atomic swap counterparty locked', {
      id: swapId,
      counterpartyEscrowId,
      chain: swap.counterparty.chain,
    });

    return swap;
  }

  /**
   * Step 3/4: Claim the other side's HTLC using the secret.
   *
   * - Initiator claims counterparty's escrow (reveals secret on receiveChain)
   * - Counterparty claims initiator's escrow (uses revealed secret on sendChain)
   *
   * When the initiator claims, the secret is recorded in the swap record so
   * the counterparty can read it and claim the other side.
   */
  async claimSwap(swapId: string, secret: string, side: 'initiator' | 'counterparty'): Promise<AtomicSwap> {
    const swap = this.swaps.find(s => s.id === swapId);
    if (!swap) throw new Error(`Swap ${swapId} not found`);

    // Verify secret against hashLock
    if (!this.verifySecret(secret, swap.hashLock)) {
      throw new Error('Invalid secret — does not match hashLock');
    }

    // Verify signer alignment before claiming
    if (this.walletService?.verifySignerAlignment) {
      const claimChain = side === 'initiator' ? swap.counterparty.chain : swap.initiator.chain;
      const claimAddress = side === 'initiator' ? swap.initiator.address : swap.counterparty.address;
      try {
        const alignment = await this.walletService.verifySignerAlignment(claimAddress, claimChain);
        if (!alignment.aligned) {
          logger.error('Atomic swap claim ABORTED: signer alignment mismatch', {
            id: swapId, side, expected: claimAddress, actual: alignment.actualAddress,
          });
          throw new Error(`Signer alignment mismatch: expected ${claimAddress.slice(0, 16)}..., got ${alignment.actualAddress.slice(0, 16)}...`);
        }
        logger.info('Signer alignment verified for atomic swap claim', { id: swapId, side, chain: claimChain });
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('Signer alignment mismatch')) throw err;
        logger.warn('Signer alignment check skipped for atomic swap', { id: swapId, error: String(err) });
      }
    }

    if (side === 'initiator') {
      // Alice claims Bob's escrow on the receive chain
      if (swap.status !== 'counterparty_locked') {
        throw new Error(`Cannot claim as initiator: swap must be in 'counterparty_locked' state (current: ${swap.status})`);
      }
      if (!swap.counterparty.escrowId) {
        throw new Error('Counterparty escrow not linked');
      }

      // Check counterparty timelock hasn't expired
      if (Date.now() > swap.counterpartyTimelock) {
        throw new Error('Counterparty timelock has expired — cannot claim');
      }

      let claimTxHash: string | undefined;
      if (this.escrowService) {
        const result = await this.escrowService.claimEscrow(swap.counterparty.escrowId, secret);
        claimTxHash = result?.releaseTxHash;
      }

      // Reveal the secret — counterparty can now claim the other side
      swap.secret = secret;
      swap.counterparty.lockTxHash = claimTxHash;
      swap.events.push({
        timestamp: new Date().toISOString(),
        event: 'initiator_claimed',
        chain: swap.counterparty.chain,
        txHash: claimTxHash,
      });

      logger.info('Atomic swap: initiator claimed counterparty funds', {
        id: swapId,
        chain: swap.counterparty.chain,
        txHash: claimTxHash,
      });

    } else {
      // Bob claims Alice's escrow on the send chain using the revealed secret
      if (swap.status !== 'counterparty_locked' && swap.status !== 'claimed') {
        throw new Error(`Cannot claim as counterparty: swap not in valid state (current: ${swap.status})`);
      }
      if (!swap.initiator.escrowId) {
        throw new Error('Initiator escrow not linked');
      }

      // Check initiator timelock hasn't expired
      if (Date.now() > swap.initiatorTimelock) {
        throw new Error('Initiator timelock has expired — cannot claim');
      }

      let claimTxHash: string | undefined;
      if (this.escrowService) {
        const result = await this.escrowService.claimEscrow(swap.initiator.escrowId, secret);
        claimTxHash = result?.releaseTxHash;
      }

      swap.secret = secret;
      swap.initiator.lockTxHash = claimTxHash;
      swap.events.push({
        timestamp: new Date().toISOString(),
        event: 'counterparty_claimed',
        chain: swap.initiator.chain,
        txHash: claimTxHash,
      });

      logger.info('Atomic swap: counterparty claimed initiator funds', {
        id: swapId,
        chain: swap.initiator.chain,
        txHash: claimTxHash,
      });
    }

    // If both sides have been claimed, mark swap as complete
    const initiatorClaimed = swap.events.some(e => e.event === 'initiator_claimed');
    const counterpartyClaimed = swap.events.some(e => e.event === 'counterparty_claimed');

    if (initiatorClaimed && counterpartyClaimed) {
      swap.status = 'claimed';
      swap.completedAt = new Date().toISOString();
      logger.info('Atomic swap fully completed', { id: swapId });
    }

    this.save();
    return swap;
  }

  /**
   * Refund a side of the swap after its timelock has expired.
   */
  async refundSwap(swapId: string, side: 'initiator' | 'counterparty'): Promise<AtomicSwap> {
    const swap = this.swaps.find(s => s.id === swapId);
    if (!swap) throw new Error(`Swap ${swapId} not found`);

    const now = Date.now();

    if (side === 'initiator') {
      if (now <= swap.initiatorTimelock) {
        throw new Error(`Initiator timelock has not expired yet (expires: ${new Date(swap.initiatorTimelock).toISOString()})`);
      }
      if (!swap.initiator.escrowId) {
        throw new Error('No initiator escrow to refund');
      }

      if (this.escrowService) {
        await this.escrowService.refundEscrow(swap.initiator.escrowId, `Atomic swap ${swapId} refund — timelock expired`);
      }

      swap.events.push({
        timestamp: new Date().toISOString(),
        event: 'initiator_refunded',
        chain: swap.initiator.chain,
      });

      logger.info('Atomic swap: initiator refunded', { id: swapId, chain: swap.initiator.chain });

    } else {
      if (now <= swap.counterpartyTimelock) {
        throw new Error(`Counterparty timelock has not expired yet (expires: ${new Date(swap.counterpartyTimelock).toISOString()})`);
      }
      if (!swap.counterparty.escrowId) {
        throw new Error('No counterparty escrow to refund');
      }

      if (this.escrowService) {
        await this.escrowService.refundEscrow(swap.counterparty.escrowId, `Atomic swap ${swapId} refund — timelock expired`);
      }

      swap.events.push({
        timestamp: new Date().toISOString(),
        event: 'counterparty_refunded',
        chain: swap.counterparty.chain,
      });

      logger.info('Atomic swap: counterparty refunded', { id: swapId, chain: swap.counterparty.chain });
    }

    // If both sides refunded, mark swap as refunded
    const initiatorRefunded = swap.events.some(e => e.event === 'initiator_refunded');
    const counterpartyRefunded = swap.events.some(e => e.event === 'counterparty_refunded');

    if (initiatorRefunded || counterpartyRefunded) {
      swap.status = 'refunded';
      swap.completedAt = new Date().toISOString();
    }

    this.save();
    return swap;
  }

  // ── Queries ────────────────────────────────────────────────────

  getSwap(id: string): AtomicSwap | undefined {
    return this.swaps.find(s => s.id === id);
  }

  listSwaps(status?: string): AtomicSwap[] {
    if (status) {
      return this.swaps.filter(s => s.status === status);
    }
    return [...this.swaps].reverse();
  }

  getSwapStats(): AtomicSwapStats {
    const completed = this.swaps.filter(s => s.status === 'claimed');
    const refunded = this.swaps.filter(s => s.status === 'refunded');
    const active = this.swaps.filter(s => s.status === 'initiated' || s.status === 'counterparty_locked');

    // Average completion time for completed swaps
    let totalCompletionTime = 0;
    for (const s of completed) {
      if (s.completedAt) {
        totalCompletionTime += new Date(s.completedAt).getTime() - new Date(s.createdAt).getTime();
      }
    }

    return {
      total: this.swaps.length,
      completed: completed.length,
      refunded: refunded.length,
      active: active.length,
      avgCompletionTime: completed.length > 0 ? Math.round(totalCompletionTime / completed.length) : 0,
    };
  }

  // ── Persistence ────────────────────────────────────────────────

  private load(): void {
    try {
      if (existsSync(SWAP_FILE)) {
        const data = JSON.parse(readFileSync(SWAP_FILE, 'utf-8'));
        this.swaps = data.swaps ?? [];
        this.counter = data.counter ?? 0;
      }
    } catch {
      logger.warn('Could not load atomic swap data, starting fresh');
    }
  }

  private save(): void {
    try {
      writeFileSync(SWAP_FILE, JSON.stringify({ swaps: this.swaps, counter: this.counter }, null, 2));
    } catch (err) {
      logger.error('Failed to save atomic swap data', { error: String(err) });
    }
  }
}

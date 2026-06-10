// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Cryptographic Tip Receipts (Proof-of-Tip)

import { createHash, randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';
import type { WalletService } from './wallet.service.js';
import type { ChainId, TokenType } from '../types/index.js';

/** Cryptographic tip receipt — verifiable proof of tipping */
export interface CryptoReceipt {
  version: '1.0';
  receiptId: string;
  tipId: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  chainId: ChainId;
  txHash: string;
  blockNumber?: number;
  fee: string;
  memo?: string;
  timestamp: string;
  // Cryptographic proof
  senderPublicKey: string;
  signature: string;
  messageHash: string;
}

/** Result of verifying a cryptographic receipt */
export interface ReceiptVerification {
  valid: boolean;
  receipt: CryptoReceipt;
  verifiedAt: string;
  signerAddress: string;
  reason?: string;
}

/** Input for generating a receipt (matches TipResult shape) */
export interface TipResultInput {
  tipId: string;
  from: string;
  to: string;
  amount: string;
  token: TokenType;
  chainId: ChainId;
  txHash: string;
  blockNumber?: number;
  fee: string;
  memo?: string;
  createdAt: string;
}

export class ReceiptService {
  private wallet: WalletService;
  private receipts = new Map<string, CryptoReceipt>();

  constructor(walletService: WalletService) {
    this.wallet = walletService;
  }

  /** Build a canonical JSON string from receipt data (deterministic, sorted keys) */
  private buildCanonicalPayload(data: Omit<CryptoReceipt, 'senderPublicKey' | 'signature' | 'messageHash' | 'receiptId' | 'version'>): string {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(data).sort()) {
      const val = (data as Record<string, unknown>)[key];
      if (val !== undefined && val !== null) {
        sorted[key] = val;
      }
    }
    return JSON.stringify(sorted);
  }

  /** Hash a canonical payload using SHA-256 */
  private hashPayload(payload: string): string {
    return createHash('sha256').update(payload).digest('hex');
  }

  /** Generate a cryptographically signed receipt for a completed tip */
  async generateReceipt(tipResult: TipResultInput): Promise<CryptoReceipt> {
    const receiptId = randomUUID();

    // Build the data to sign
    const receiptData = {
      tipId: tipResult.tipId,
      from: tipResult.from,
      to: tipResult.to,
      amount: tipResult.amount,
      token: tipResult.token,
      chainId: tipResult.chainId,
      txHash: tipResult.txHash,
      blockNumber: tipResult.blockNumber,
      fee: tipResult.fee,
      memo: tipResult.memo,
      timestamp: tipResult.createdAt,
    };

    // Canonical JSON → hash
    const canonicalJson = this.buildCanonicalPayload(receiptData);
    const messageHash = this.hashPayload(canonicalJson);

    // Sign using WDK wallet
    let signature = '';
    let senderPublicKey = '';
    try {
      const signResult = await this.wallet.signMessage(tipResult.chainId, messageHash);
      signature = signResult.signature;
      senderPublicKey = signResult.publicKey;
    } catch (err) {
      logger.warn('Failed to sign receipt — storing unsigned', { error: String(err), tipId: tipResult.tipId });
      signature = 'unsigned';
      senderPublicKey = 'unavailable';
    }

    const receipt: CryptoReceipt = {
      version: '1.0',
      receiptId,
      ...receiptData,
      senderPublicKey,
      signature,
      messageHash,
    };

    // Store receipt
    this.receipts.set(tipResult.tipId, receipt);
    logger.info('Cryptographic receipt generated', { tipId: tipResult.tipId, receiptId, signed: signature !== 'unsigned' });

    return receipt;
  }

  /** Verify a cryptographic receipt's signature */
  async verifyReceipt(receipt: CryptoReceipt): Promise<ReceiptVerification> {
    const verifiedAt = new Date().toISOString();

    // Rebuild canonical payload from receipt fields
    const receiptData = {
      tipId: receipt.tipId,
      from: receipt.from,
      to: receipt.to,
      amount: receipt.amount,
      token: receipt.token,
      chainId: receipt.chainId,
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
      fee: receipt.fee,
      memo: receipt.memo,
      timestamp: receipt.timestamp,
    };

    const canonicalJson = this.buildCanonicalPayload(receiptData);
    const recomputedHash = this.hashPayload(canonicalJson);

    // Verify hash matches
    if (recomputedHash !== receipt.messageHash) {
      return {
        valid: false,
        receipt,
        verifiedAt,
        signerAddress: receipt.from,
        reason: 'Message hash mismatch — receipt data has been tampered with',
      };
    }

    // If unsigned, report as unverifiable
    if (receipt.signature === 'unsigned') {
      return {
        valid: false,
        receipt,
        verifiedAt,
        signerAddress: receipt.from,
        reason: 'Receipt was not signed (wallet signing unavailable at time of creation)',
      };
    }

    // Verify signature using WDK
    try {
      const isValid = await this.wallet.verifyMessage(receipt.chainId, receipt.messageHash, receipt.signature);
      return {
        valid: isValid,
        receipt,
        verifiedAt,
        signerAddress: receipt.from,
        reason: isValid ? undefined : 'Signature verification failed — signature does not match',
      };
    } catch (err) {
      return {
        valid: false,
        receipt,
        verifiedAt,
        signerAddress: receipt.from,
        reason: `Verification error: ${String(err)}`,
      };
    }
  }

  /** Get a receipt by tip ID */
  getReceipt(tipId: string): CryptoReceipt | undefined {
    return this.receipts.get(tipId);
  }

  /** Get all receipts */
  getAllReceipts(): CryptoReceipt[] {
    return Array.from(this.receipts.values());
  }

  /** Get receipt count */
  getCount(): number {
    return this.receipts.size;
  }
}

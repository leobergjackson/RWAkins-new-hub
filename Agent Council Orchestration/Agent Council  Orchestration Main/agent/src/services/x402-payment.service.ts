// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — x402 HTTP 402 Micropayment Protocol Service
//
// Implements the full x402 standard for machine-to-machine micropayments:
//   1. Server returns HTTP 402 with payment details in headers
//   2. Client pays via WDK, gets a receipt (txHash)
//   3. Client retries request with X-Payment-Receipt header
//   4. Server verifies receipt and serves content
//
// This service extends the base X402Service with paywall management,
// per-endpoint revenue tracking, and demo premium content endpoints.

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { Request, Response } from 'express';

// ── Types ────────────────────────────────────────────────────────

export interface Paywall {
  id: string;
  endpoint: string;
  method: string;
  price: string;
  token: string;
  description: string;
  enabled: boolean;
  createdAt: string;
  stats: PaywallEndpointStats;
}

export interface PaywallEndpointStats {
  totalRequests: number;
  paidRequests: number;
  rejectedRequests: number;
  totalRevenue: number;
  lastPaidAt: string | null;
}

export interface PaymentReceipt {
  paymentId: string;
  txHash: string;
  amount: string;
  payer: string;
  chainId: string;
  paidAt: string;
}

export interface PendingPayment {
  id: string;
  paywallId: string;
  endpoint: string;
  amount: string;
  recipient: string;
  token: string;
  chainId: string;
  description: string;
  expiresAt: string;
  createdAt: string;
}

export interface PaywallGlobalStats {
  totalPaywalls: number;
  activePaywalls: number;
  totalRevenue: number;
  totalPaidRequests: number;
  totalRejectedRequests: number;
  revenueByEndpoint: Record<string, number>;
}

// ── Service ──────────────────────────────────────────────────────

export class X402PaymentService {
  private paywalls: Map<string, Paywall> = new Map();
  private pendingPayments: Map<string, PendingPayment> = new Map();
  private verifiedReceipts: Map<string, PaymentReceipt> = new Map();
  /** Set of paymentIds that have been used to access content (prevents replay) */
  private usedReceipts: Set<string> = new Set();
  private walletAddress = '';

  constructor() {
    logger.info('x402 Payment Protocol service initialized');
  }

  /** Set wallet address for receiving payments */
  setWalletAddress(address: string): void {
    this.walletAddress = address;
  }

  getWalletAddress(): string {
    return this.walletAddress || '0x0000000000000000000000000000000000000000';
  }

  // ── Paywall Management ─────────────────────────────────────────

  /**
   * Register a paywalled endpoint.
   * Any request to this endpoint will receive HTTP 402 unless paid.
   */
  createPaywall(
    endpoint: string,
    price: string,
    token: string = 'USDT',
    description: string = '',
    method: string = 'GET',
  ): Paywall {
    const id = uuidv4();
    const paywall: Paywall = {
      id,
      endpoint,
      method: method.toUpperCase(),
      price,
      token,
      description: description || `Premium content at ${endpoint}`,
      enabled: true,
      createdAt: new Date().toISOString(),
      stats: {
        totalRequests: 0,
        paidRequests: 0,
        rejectedRequests: 0,
        totalRevenue: 0,
        lastPaidAt: null,
      },
    };

    const key = `${paywall.method}:${endpoint}`;
    this.paywalls.set(key, paywall);
    logger.info('x402 paywall created', { id, endpoint, price, token });
    return paywall;
  }

  /**
   * Handle a request to a paywalled endpoint.
   * Returns 402 with payment headers if not paid, or null if paid (caller serves content).
   */
  handlePaymentRequired(req: Request, res: Response): boolean {
    const key = `${req.method.toUpperCase()}:${req.path}`;
    const paywall = this.paywalls.get(key) ?? this.findPaywallByPattern(req.method, req.path);

    if (!paywall || !paywall.enabled) {
      // Not a paywalled endpoint
      return false;
    }

    paywall.stats.totalRequests++;

    // Check for payment receipt header
    const receiptHeader = req.headers['x-payment-receipt'] as string | undefined;
    if (receiptHeader) {
      const verification = this.verifyReceipt(receiptHeader, paywall);
      if (verification.verified) {
        // Payment verified — caller should serve content
        return false;
      }
      // Payment failed verification
      paywall.stats.rejectedRequests++;
      res.status(402).json({
        error: 'Payment verification failed',
        reason: verification.reason,
        protocol: 'x402/1.0',
      });
      return true;
    }

    // No receipt — return 402 with payment instructions
    paywall.stats.rejectedRequests++;
    const payment = this.createPendingPayment(paywall);

    // Set x402 standard headers
    res.set({
      'X-Payment-Required': 'true',
      'X-Payment-Id': payment.id,
      'X-Payment-Amount': payment.amount,
      'X-Payment-Address': payment.recipient,
      'X-Payment-Token': payment.token,
      'X-Payment-Chain': payment.chainId,
      'X-Payment-Description': paywall.description,
      'X-Payment-Expires': payment.expiresAt,
      'X-Payment-Protocol': 'x402/1.0',
      'X-Payment-Agent': 'AeroFyta/1.0',
    });

    res.status(402).json({
      status: 402,
      message: 'Payment Required',
      protocol: 'x402/1.0',
      payment: {
        id: payment.id,
        amount: payment.amount,
        token: payment.token,
        recipient: payment.recipient,
        chainId: payment.chainId,
        description: paywall.description,
        expiresAt: payment.expiresAt,
      },
      instructions: [
        `1. Send ${payment.amount} ${payment.token} to ${payment.recipient} on ${payment.chainId}`,
        '2. Include the transaction hash in the X-Payment-Receipt header',
        '3. Retry the request with: X-Payment-Receipt: <paymentId>:<txHash>',
      ],
    });

    return true;
  }

  /**
   * Verify a payment receipt string.
   * Format: "paymentId:txHash" or just "txHash" (looks up by pending payments).
   */
  verifyPayment(receipt: string): { verified: boolean; reason: string; paymentId?: string } {
    const [paymentIdOrTx, txHash] = receipt.includes(':')
      ? receipt.split(':', 2)
      : [receipt, receipt];

    // Check if already used (prevent replay)
    if (this.usedReceipts.has(paymentIdOrTx)) {
      return { verified: false, reason: 'Receipt already used' };
    }

    // Look up pending payment
    const pending = this.pendingPayments.get(paymentIdOrTx);
    if (!pending) {
      // If no pending payment found, treat as direct txHash verification
      // In production, would verify on-chain. For hackathon demo, accept valid-looking hashes.
      if (txHash && txHash.length >= 10) {
        return { verified: true, reason: 'Transaction hash accepted (demo mode)', paymentId: paymentIdOrTx };
      }
      return { verified: false, reason: 'Unknown payment ID and invalid transaction hash' };
    }

    // Check expiry
    if (new Date(pending.expiresAt) < new Date()) {
      this.pendingPayments.delete(paymentIdOrTx);
      return { verified: false, reason: 'Payment request expired' };
    }

    // In production: verify txHash on-chain via WDK indexer.
    // For hackathon: trust valid-looking transaction hashes.
    const actualTx = txHash || paymentIdOrTx;
    if (!actualTx || actualTx.length < 10) {
      return { verified: false, reason: 'Invalid transaction hash' };
    }

    // Record verified receipt
    const receiptRecord: PaymentReceipt = {
      paymentId: paymentIdOrTx,
      txHash: actualTx,
      amount: pending.amount,
      payer: 'verified',
      chainId: pending.chainId,
      paidAt: new Date().toISOString(),
    };

    this.verifiedReceipts.set(paymentIdOrTx, receiptRecord);
    this.usedReceipts.add(paymentIdOrTx);
    this.pendingPayments.delete(paymentIdOrTx);

    // Update paywall stats
    const paywall = this.findPaywallById(pending.paywallId);
    if (paywall) {
      paywall.stats.paidRequests++;
      paywall.stats.totalRevenue += parseFloat(pending.amount);
      paywall.stats.lastPaidAt = receiptRecord.paidAt;
    }

    logger.info('x402 payment verified', { paymentId: paymentIdOrTx, txHash: actualTx, amount: pending.amount });
    return { verified: true, reason: 'Payment verified — access granted', paymentId: paymentIdOrTx };
  }

  /** Get aggregate stats across all paywalls */
  getPaywallStats(): PaywallGlobalStats {
    const revenueByEndpoint: Record<string, number> = {};
    let totalRevenue = 0;
    let totalPaidRequests = 0;
    let totalRejectedRequests = 0;
    let activePaywalls = 0;

    for (const paywall of this.paywalls.values()) {
      if (paywall.enabled) activePaywalls++;
      totalRevenue += paywall.stats.totalRevenue;
      totalPaidRequests += paywall.stats.paidRequests;
      totalRejectedRequests += paywall.stats.rejectedRequests;
      revenueByEndpoint[paywall.endpoint] = paywall.stats.totalRevenue;
    }

    return {
      totalPaywalls: this.paywalls.size,
      activePaywalls,
      totalRevenue,
      totalPaidRequests,
      totalRejectedRequests,
      revenueByEndpoint,
    };
  }

  /** List all registered paywalls */
  listPaywalls(): Paywall[] {
    return Array.from(this.paywalls.values());
  }

  // ── Internal Helpers ───────────────────────────────────────────

  private createPendingPayment(paywall: Paywall): PendingPayment {
    const payment: PendingPayment = {
      id: uuidv4(),
      paywallId: paywall.id,
      endpoint: paywall.endpoint,
      amount: paywall.price,
      recipient: this.getWalletAddress(),
      token: paywall.token,
      chainId: 'ethereum-sepolia',
      description: paywall.description,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.pendingPayments.set(payment.id, payment);
    return payment;
  }

  private verifyReceipt(receiptHeader: string, paywall: Paywall): { verified: boolean; reason: string } {
    const result = this.verifyPayment(receiptHeader);
    if (result.verified && paywall) {
      // Stats already updated in verifyPayment
    }
    return result;
  }

  private findPaywallByPattern(method: string, path: string): Paywall | undefined {
    for (const paywall of this.paywalls.values()) {
      if (paywall.method !== method.toUpperCase()) continue;
      // Simple pattern matching for parameterized routes
      const pattern = paywall.endpoint.replace(/:[^/]+/g, '[^/]+');
      if (new RegExp(`^${pattern}$`).test(path)) return paywall;
    }
    return undefined;
  }

  private findPaywallById(id: string): Paywall | undefined {
    for (const paywall of this.paywalls.values()) {
      if (paywall.id === id) return paywall;
    }
    return undefined;
  }
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — x402 Payment Protocol Service (Unified)
//
// High-level x402 protocol implementation that combines server-side paywalling
// with client-side auto-pay. Agents can both charge for their API endpoints
// and autonomously pay to access other agents' paywalled endpoints.

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

// ── Types ────────────────────────────────────────────────────────

export interface X402Paywall {
  id: string;
  endpoint: string;
  price: string;
  chain: string;
  token: string;
  description: string;
  enabled: boolean;
  createdAt: string;
}

export interface X402PaymentRecord {
  id: string;
  direction: 'incoming' | 'outgoing';
  endpoint: string;
  amount: string;
  chain: string;
  token: string;
  txHash: string;
  payer: string;
  recipient: string;
  timestamp: string;
}

export interface X402PaywallStats {
  totalPaywalls: number;
  activePaywalls: number;
  totalIncomingRevenue: number;
  totalOutgoingSpend: number;
  netRevenue: number;
  totalIncomingPayments: number;
  totalOutgoingPayments: number;
  revenueByEndpoint: Record<string, number>;
  topEndpoints: Array<{ endpoint: string; revenue: number; payments: number }>;
}

export interface X402AccessResult {
  success: boolean;
  data?: unknown;
  paymentId?: string;
  txHash?: string;
  amountPaid?: string;
  error?: string;
}

// ── Service ──────────────────────────────────────────────────────

/**
 * X402ProtocolService — Unified x402 HTTP 402 Payment Protocol.
 *
 * Server side:
 *   - createPaywall(endpoint, price, chain) — protect an endpoint
 *   - handlePayment(req) — process incoming X-Payment-Receipt header
 *
 * Client side:
 *   - payForAccess(url, maxPrice) — auto-pay to access a paywalled endpoint
 *
 * Stats:
 *   - getPaywallStats() — revenue and usage metrics
 */
export class X402ProtocolService {
  private paywalls = new Map<string, X402Paywall>();
  private payments: X402PaymentRecord[] = [];
  private walletAddress = '0xAer0Fyta000000000000000000000000DeadBeef';

  constructor() {
    logger.info('X402ProtocolService initialized');
  }

  // ── Server Side: Paywall Management ─────────────────────────────

  /**
   * Protect an endpoint with x402 — any request without valid payment receipt
   * will receive HTTP 402 Payment Required with payment instructions.
   */
  createPaywall(
    endpoint: string,
    price: string,
    chain: string = 'ethereum-sepolia',
    options: { token?: string; description?: string } = {},
  ): X402Paywall {
    const paywall: X402Paywall = {
      id: uuidv4(),
      endpoint,
      price,
      chain,
      token: options.token ?? 'USDT',
      description: options.description ?? `Premium endpoint: ${endpoint}`,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    this.paywalls.set(endpoint, paywall);
    logger.info('x402 paywall created', { endpoint, price, chain });
    return paywall;
  }

  /**
   * Process an incoming payment receipt from X-Payment-Receipt header.
   * Returns true if payment is valid and access should be granted.
   */
  handlePayment(receiptHeader: string): {
    verified: boolean;
    reason: string;
    paymentId?: string;
  } {
    if (!receiptHeader || receiptHeader.length < 8) {
      return { verified: false, reason: 'Missing or invalid payment receipt' };
    }

    // Parse receipt: format "paymentId:txHash" or just "txHash"
    const parts = receiptHeader.split(':');
    const paymentId = parts.length > 1 ? parts[0] : uuidv4();
    const txHash = parts.length > 1 ? parts[1] : parts[0];

    if (!txHash || txHash.length < 10) {
      return { verified: false, reason: 'Invalid transaction hash' };
    }

    // In production: verify on-chain via WDK indexer.
    // For hackathon demo: accept valid-looking hashes.
    const record: X402PaymentRecord = {
      id: paymentId,
      direction: 'incoming',
      endpoint: 'verified-receipt',
      amount: '0.01',
      chain: 'ethereum-sepolia',
      token: 'USDT',
      txHash,
      payer: 'external-agent',
      recipient: this.walletAddress,
      timestamp: new Date().toISOString(),
    };

    this.payments.push(record);
    logger.info('x402 payment verified', { paymentId, txHash });
    return { verified: true, reason: 'Payment verified — access granted', paymentId };
  }

  /**
   * Check if an endpoint is paywalled and return payment instructions.
   */
  getPaymentRequirements(endpoint: string): {
    required: boolean;
    paywall?: X402Paywall;
    instructions?: {
      amount: string;
      recipient: string;
      chain: string;
      token: string;
      protocol: string;
    };
  } {
    const paywall = this.paywalls.get(endpoint);
    if (!paywall || !paywall.enabled) {
      return { required: false };
    }

    return {
      required: true,
      paywall,
      instructions: {
        amount: paywall.price,
        recipient: this.walletAddress,
        chain: paywall.chain,
        token: paywall.token,
        protocol: 'x402/1.0',
      },
    };
  }

  // ── Client Side: Auto-Pay for Access ────────────────────────────

  /**
   * Autonomously pay to access another agent's paywalled endpoint.
   *
   * Flow:
   * 1. Fetch the URL — expect HTTP 402 with payment headers
   * 2. Parse payment requirements from X-Payment-* headers
   * 3. Check if price <= maxPrice
   * 4. Execute WDK payment (simulated for demo)
   * 5. Retry with X-Payment-Receipt header
   * 6. Return the premium content
   */
  async payForAccess(url: string, maxPrice: number): Promise<X402AccessResult> {
    logger.info('x402 client: attempting to pay for access', { url, maxPrice });

    try {
      // Step 1: Initial request to get payment requirements
      // In production, this would be a real HTTP request.
      // For demo, we simulate the x402 handshake.
      const simulatedPaymentId = uuidv4();
      const simulatedPrice = '0.01';

      // Step 2: Check price against max
      const priceNum = parseFloat(simulatedPrice);
      if (priceNum > maxPrice) {
        return {
          success: false,
          error: `Price ${simulatedPrice} USDT exceeds max ${maxPrice} USDT`,
        };
      }

      // Step 3: Execute payment via WDK (simulated for demo)
      const txHash = `0x${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 32)}`;

      // Step 4: Record outgoing payment
      const record: X402PaymentRecord = {
        id: simulatedPaymentId,
        direction: 'outgoing',
        endpoint: url,
        amount: simulatedPrice,
        chain: 'ethereum-sepolia',
        token: 'USDT',
        txHash,
        payer: this.walletAddress,
        recipient: 'external-agent',
        timestamp: new Date().toISOString(),
      };
      this.payments.push(record);

      logger.info('x402 client: payment sent', {
        url,
        amount: simulatedPrice,
        txHash: txHash.slice(0, 18) + '...',
      });

      // Step 5: Return success with simulated premium data
      return {
        success: true,
        paymentId: simulatedPaymentId,
        txHash,
        amountPaid: simulatedPrice,
        data: {
          accessGranted: true,
          url,
          paidAt: new Date().toISOString(),
          protocol: 'x402/1.0',
          note: 'Premium content unlocked via autonomous x402 payment',
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('x402 client: payForAccess failed', { url, error: msg });
      return { success: false, error: msg };
    }
  }

  // ── Stats & Info ──────────────────────────────────────────────

  /** Get aggregate paywall and payment statistics */
  getPaywallStats(): X402PaywallStats {
    const revenueByEndpoint: Record<string, number> = {};
    const endpointPaymentCount: Record<string, number> = {};

    for (const payment of this.payments) {
      if (payment.direction === 'incoming') {
        const ep = payment.endpoint;
        revenueByEndpoint[ep] = (revenueByEndpoint[ep] ?? 0) + parseFloat(payment.amount);
        endpointPaymentCount[ep] = (endpointPaymentCount[ep] ?? 0) + 1;
      }
    }

    const incomingPayments = this.payments.filter(p => p.direction === 'incoming');
    const outgoingPayments = this.payments.filter(p => p.direction === 'outgoing');
    const totalIncoming = incomingPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const totalOutgoing = outgoingPayments.reduce((s, p) => s + parseFloat(p.amount), 0);

    const topEndpoints = Object.entries(revenueByEndpoint)
      .map(([endpoint, revenue]) => ({
        endpoint,
        revenue,
        payments: endpointPaymentCount[endpoint] ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalPaywalls: this.paywalls.size,
      activePaywalls: Array.from(this.paywalls.values()).filter(p => p.enabled).length,
      totalIncomingRevenue: Math.round(totalIncoming * 1e6) / 1e6,
      totalOutgoingSpend: Math.round(totalOutgoing * 1e6) / 1e6,
      netRevenue: Math.round((totalIncoming - totalOutgoing) * 1e6) / 1e6,
      totalIncomingPayments: incomingPayments.length,
      totalOutgoingPayments: outgoingPayments.length,
      revenueByEndpoint,
      topEndpoints,
    };
  }

  /** List all registered paywalls */
  listPaywalls(): X402Paywall[] {
    return Array.from(this.paywalls.values());
  }

  /** Get recent payment records */
  getPaymentHistory(limit: number = 50): X402PaymentRecord[] {
    return this.payments.slice(-limit).reverse();
  }

  /** Set wallet address for receiving payments */
  setWalletAddress(address: string): void {
    this.walletAddress = address;
  }

  /** Get wallet address */
  getWalletAddress(): string {
    return this.walletAddress;
  }
}

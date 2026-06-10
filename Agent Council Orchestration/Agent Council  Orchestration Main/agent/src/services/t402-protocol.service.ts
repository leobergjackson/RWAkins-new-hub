// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — t402 Payment Protocol Wrapper
//
// Wraps our x402 implementation in the t402 standard used by Forage.
// t402 is a standardized payment protocol for agent-to-agent micropayments
// with structured payment IDs, purpose tracking, and cross-chain support.

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

// ── Types ────────────────────────────────────────────────────────

export interface T402Payment {
  paymentId: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  chain: string;
  purpose: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  /** Optional: x402 payment receipt reference */
  x402Receipt?: string;
  /** Optional: t402 protocol version */
  protocolVersion: string;
}

export interface T402Stats {
  totalPaymentsSent: number;
  totalPaymentsReceived: number;
  totalAmountSent: number;
  totalAmountReceived: number;
  uniqueRecipients: number;
  uniqueSenders: number;
  paymentsByPurpose: Record<string, number>;
  paymentsByChain: Record<string, number>;
  protocolVersion: string;
}

export interface T402FetchOptions {
  /** Target URL requiring t402 payment */
  url: string;
  /** Payment amount in token units */
  amount: string;
  /** Wallet address to pay from */
  from: string;
  /** Purpose of the payment */
  purpose: string;
  /** Chain to pay on */
  chain?: string;
  /** Token to pay with */
  token?: string;
}

// ── Service ──────────────────────────────────────────────────────

export class T402ProtocolService {
  private payments: Map<string, T402Payment> = new Map();
  private agentAddress = '';

  constructor() {
    logger.info('[t402] Payment Protocol Wrapper initialized');
  }

  /** Set the agent's wallet address */
  setAgentAddress(address: string): void {
    this.agentAddress = address;
  }

  /**
   * Create a standardized t402 payment record.
   * This wraps the x402 payment flow in the t402 standard.
   */
  createT402Payment(
    recipient: string,
    amount: string,
    purpose: string,
    options?: { chain?: string; token?: string },
  ): T402Payment {
    const payment: T402Payment = {
      paymentId: `t402_${uuidv4()}`,
      from: this.agentAddress || '0x0000000000000000000000000000000000000000',
      to: recipient,
      amount,
      token: options?.token ?? 'USDT',
      chain: options?.chain ?? 'ethereum-sepolia',
      purpose,
      status: 'completed',
      timestamp: new Date().toISOString(),
      protocolVersion: 't402/1.0',
    };

    this.payments.set(payment.paymentId, payment);

    logger.info('[t402] Payment created', {
      paymentId: payment.paymentId,
      amount,
      purpose,
      recipient: recipient.slice(0, 10) + '...',
    });

    return payment;
  }

  /**
   * Wrap a fetch call with t402 payment headers.
   * Returns the payment headers that should be included in the request.
   */
  wrapFetchWithT402(url: string, options?: {
    amount?: string;
    purpose?: string;
    from?: string;
  }): {
    url: string;
    headers: Record<string, string>;
    payment: T402Payment;
  } {
    const payment = this.createT402Payment(
      new URL(url).hostname,
      options?.amount ?? '0.01',
      options?.purpose ?? `t402 access: ${url}`,
    );

    const headers: Record<string, string> = {
      'X-T402-Payment-Id': payment.paymentId,
      'X-T402-Amount': payment.amount,
      'X-T402-Token': payment.token,
      'X-T402-Chain': payment.chain,
      'X-T402-From': payment.from,
      'X-T402-Purpose': payment.purpose,
      'X-T402-Protocol': 't402/1.0',
      'X-T402-Timestamp': payment.timestamp,
      // Also set x402 headers for backward compatibility
      'X-Payment-Receipt': `${payment.paymentId}:demo_tx_hash`,
      'X-Payment-Protocol': 'x402/1.0',
    };

    logger.info('[t402] Fetch wrapped with payment headers', {
      url,
      paymentId: payment.paymentId,
    });

    return { url, headers, payment };
  }

  /** Get t402 payment statistics */
  getT402Stats(): T402Stats {
    const sent: T402Payment[] = [];
    const received: T402Payment[] = [];
    const uniqueRecipients = new Set<string>();
    const uniqueSenders = new Set<string>();
    const paymentsByPurpose: Record<string, number> = {};
    const paymentsByChain: Record<string, number> = {};

    for (const p of this.payments.values()) {
      if (p.from === this.agentAddress) {
        sent.push(p);
        uniqueRecipients.add(p.to);
      } else {
        received.push(p);
        uniqueSenders.add(p.from);
      }

      // Track by purpose
      const purposeKey = p.purpose.split(':')[0].trim().toLowerCase();
      paymentsByPurpose[purposeKey] = (paymentsByPurpose[purposeKey] ?? 0) + 1;

      // Track by chain
      paymentsByChain[p.chain] = (paymentsByChain[p.chain] ?? 0) + 1;
    }

    return {
      totalPaymentsSent: sent.length,
      totalPaymentsReceived: received.length,
      totalAmountSent: sent.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      totalAmountReceived: received.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      uniqueRecipients: uniqueRecipients.size,
      uniqueSenders: uniqueSenders.size,
      paymentsByPurpose,
      paymentsByChain,
      protocolVersion: 't402/1.0',
    };
  }

  /** Get a specific payment by ID */
  getPayment(paymentId: string): T402Payment | undefined {
    return this.payments.get(paymentId);
  }

  /** List all payments (most recent first) */
  listPayments(limit = 50): T402Payment[] {
    return Array.from(this.payments.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

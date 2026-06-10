// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent
//
// x402 PAYMENT PROTOCOL — HTTP-Native Micropayments for Agent Commerce
//
// x402 is an emerging standard where HTTP responses can require payment.
// Instead of HTTP 401 (Unauthorized), a server returns HTTP 402 (Payment Required)
// with payment instructions. The client (an AI agent) autonomously pays and retries.
//
// This enables AGENT-TO-AGENT COMMERCE:
//   Agent A requests premium data from Agent B
//   Agent B returns 402 with payment details
//   Agent A pays via WDK, includes payment proof in retry header
//   Agent B verifies payment and serves the data
//
// AeroFyta implements BOTH sides:
//   - x402 SERVER: Monetize AeroFyta's API endpoints (creator analytics, predictions)
//   - x402 CLIENT: Pay other x402-enabled services autonomously
//
// This is the future of agentic finance: agents that can earn and spend money
// to accomplish tasks, with every payment settled onchain via WDK.

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

// ── Types ────────────────────────────────────────────────────────

export interface PaymentRequirement {
  /** Unique payment request ID */
  id: string;
  /** Amount required in USDT */
  amount: string;
  /** Recipient wallet address */
  recipient: string;
  /** Chain to pay on */
  chainId: string;
  /** Token type */
  token: 'usdt' | 'native';
  /** Description of what's being paid for */
  description: string;
  /** Expiry timestamp */
  expiresAt: string;
  /** Resource being accessed */
  resource: string;
}

export interface PaymentProof {
  /** The payment requirement ID this proves */
  requirementId: string;
  /** Transaction hash proving payment */
  txHash: string;
  /** Chain the payment was made on */
  chainId: string;
  /** Amount paid */
  amount: string;
  /** Payer address */
  payer: string;
  /** Timestamp */
  paidAt: string;
}

export interface x402Endpoint {
  /** API path that requires payment */
  path: string;
  /** HTTP method */
  method: string;
  /** Price per request in USDT */
  pricePerRequest: string;
  /** Description */
  description: string;
  /** Whether this endpoint is active */
  enabled: boolean;
}

export interface x402Stats {
  totalPaymentsReceived: number;
  totalRevenueUsdt: number;
  totalPaymentsMade: number;
  totalSpentUsdt: number;
  activeEndpoints: number;
  pendingPayments: number;
}

// ── Service ──────────────────────────────────────────────────────

/**
 * x402 Payment Protocol Service
 *
 * Implements HTTP 402 Payment Required protocol for agent-to-agent commerce.
 * Any AeroFyta API endpoint can be monetized — other agents pay per request.
 * AeroFyta agents can also pay other x402-enabled services autonomously.
 *
 * This demonstrates "the future of agentic finance and programmable money"
 * by enabling autonomous economic actors that earn and spend to accomplish tasks.
 */
export class X402Service {
  private endpoints: Map<string, x402Endpoint> = new Map();
  private pendingPayments: Map<string, PaymentRequirement> = new Map();
  private verifiedPayments: Map<string, PaymentProof> = new Map();
  private walletAddress = '';
  private stats: x402Stats = {
    totalPaymentsReceived: 0,
    totalRevenueUsdt: 0,
    totalPaymentsMade: 0,
    totalSpentUsdt: 0,
    activeEndpoints: 0,
    pendingPayments: 0,
  };

  constructor() {
    // Register default monetized endpoints
    this.registerEndpoint('/api/predictions/generate', 'POST', '0.001', 'AI-powered tip prediction generation');
    this.registerEndpoint('/api/analytics/creators/:address', 'GET', '0.0005', 'Detailed creator analytics and reputation data');
    this.registerEndpoint('/api/rumble/engagement/:userId/:creatorId', 'GET', '0.0001', 'Engagement score calculation');
    this.registerEndpoint('/api/fees/optimal-timing', 'GET', '0.0002', 'Optimal gas timing recommendation');
    logger.info('x402 payment protocol initialized', { endpoints: this.endpoints.size });
  }

  /** Set the wallet address for receiving payments */
  setWalletAddress(address: string): void {
    this.walletAddress = address;
  }

  /** Get the wallet address for receiving payments */
  getWalletAddress(): string {
    return this.walletAddress || 'not set';
  }

  // ── Server Side (receive payments) ──────────────────────────────

  /** Register an API endpoint as paid (x402) */
  registerEndpoint(path: string, method: string, pricePerRequest: string, description: string): void {
    this.endpoints.set(`${method}:${path}`, {
      path,
      method,
      pricePerRequest,
      description,
      enabled: true,
    });
    this.stats.activeEndpoints = Array.from(this.endpoints.values()).filter((e) => e.enabled).length;
  }

  /** Check if a request requires payment */
  requiresPayment(method: string, path: string): x402Endpoint | undefined {
    // Exact match
    const exact = this.endpoints.get(`${method}:${path}`);
    if (exact?.enabled) return exact;

    // Pattern match (for parameterized routes)
    for (const [key, endpoint] of this.endpoints) {
      if (!endpoint.enabled) continue;
      const [m, p] = key.split(':');
      if (m !== method) continue;
      // Simple pattern matching: /api/foo/:id matches /api/foo/123
      const pattern = p.replace(/:[^/]+/g, '[^/]+');
      if (new RegExp(`^${pattern}$`).test(path)) return endpoint;
    }

    return undefined;
  }

  /** Create a payment requirement for a request */
  createPaymentRequirement(endpoint: x402Endpoint, resource: string): PaymentRequirement {
    const requirement: PaymentRequirement = {
      id: uuidv4(),
      amount: endpoint.pricePerRequest,
      recipient: this.walletAddress,
      chainId: 'ethereum-sepolia',
      token: 'usdt',
      description: endpoint.description,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min expiry
      resource,
    };

    this.pendingPayments.set(requirement.id, requirement);
    this.stats.pendingPayments = this.pendingPayments.size;
    return requirement;
  }

  /** Verify a payment proof and grant access */
  verifyPayment(proof: PaymentProof): { verified: boolean; reason: string } {
    const requirement = this.pendingPayments.get(proof.requirementId);
    if (!requirement) {
      return { verified: false, reason: 'Unknown payment requirement' };
    }

    if (new Date(requirement.expiresAt) < new Date()) {
      this.pendingPayments.delete(proof.requirementId);
      return { verified: false, reason: 'Payment requirement expired' };
    }

    if (parseFloat(proof.amount) < parseFloat(requirement.amount)) {
      return { verified: false, reason: `Insufficient payment: ${proof.amount} < ${requirement.amount}` };
    }

    // In production, verify txHash onchain. For hackathon, trust the proof.
    this.verifiedPayments.set(proof.requirementId, proof);
    this.pendingPayments.delete(proof.requirementId);

    this.stats.totalPaymentsReceived++;
    this.stats.totalRevenueUsdt += parseFloat(proof.amount);
    this.stats.pendingPayments = this.pendingPayments.size;

    logger.info('x402 payment verified', {
      requirementId: proof.requirementId,
      txHash: proof.txHash,
      amount: proof.amount,
    });

    return { verified: true, reason: 'Payment verified — access granted' };
  }

  // ── Client Side (make payments) ─────────────────────────────────

  /**
   * Parse a 402 Payment Required response from another service.
   * Extracts payment instructions from the response headers/body.
   */
  parse402Response(headers: Record<string, string>, body?: Record<string, unknown>): PaymentRequirement | null {
    // Standard x402 headers
    const amount = headers['x-payment-amount'] ?? (body?.amount as string);
    const recipient = headers['x-payment-recipient'] ?? (body?.recipient as string);
    const chainId = headers['x-payment-chain'] ?? (body?.chainId as string) ?? 'ethereum-sepolia';
    const description = headers['x-payment-description'] ?? (body?.description as string) ?? 'Unknown resource';
    const id = headers['x-payment-id'] ?? (body?.id as string) ?? uuidv4();

    if (!amount || !recipient) return null;

    return {
      id,
      amount,
      recipient,
      chainId,
      token: 'usdt',
      description,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      resource: headers['x-payment-resource'] ?? '',
    };
  }

  /**
   * Record a payment made to another x402 service.
   */
  recordPaymentMade(requirement: PaymentRequirement, txHash: string): void {
    this.stats.totalPaymentsMade++;
    this.stats.totalSpentUsdt += parseFloat(requirement.amount);

    logger.info('x402 payment made to external service', {
      recipient: requirement.recipient,
      amount: requirement.amount,
      txHash,
      description: requirement.description,
    });
  }

  // ── Info ────────────────────────────────────────────────────────

  /** Get all registered x402 endpoints */
  getEndpoints(): x402Endpoint[] {
    return Array.from(this.endpoints.values());
  }

  /** Get x402 service statistics */
  getStats(): x402Stats {
    return { ...this.stats };
  }

  /** Generate x402 payment response headers */
  getPaymentHeaders(requirement: PaymentRequirement): Record<string, string> {
    return {
      'X-Payment-Required': 'true',
      'X-Payment-Id': requirement.id,
      'X-Payment-Amount': requirement.amount,
      'X-Payment-Recipient': requirement.recipient,
      'X-Payment-Chain': requirement.chainId,
      'X-Payment-Token': requirement.token,
      'X-Payment-Description': requirement.description,
      'X-Payment-Expires': requirement.expiresAt,
      'X-Payment-Protocol': 'x402/1.0',
      'X-Payment-Agent': 'AeroFyta/1.0',
    };
  }
}

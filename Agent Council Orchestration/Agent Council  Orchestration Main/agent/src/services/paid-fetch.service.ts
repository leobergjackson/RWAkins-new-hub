// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Paid Fetch Service
// Agent pays for API access automatically via x402-style 402 Payment Required flows.

import { logger } from '../utils/logger.js';

// ── Types ──────────────────────────────────────────────────────

export interface PaidFetchOptions extends RequestInit {
  /** Maximum USDt willing to pay per request (default: "1.00") */
  maxPayment?: string;
  /** Preferred chain for payment (default: "ethereum-sepolia") */
  preferredChain?: string;
}

export interface PaidFetchStats {
  totalSpent: number;
  callCount: number;
  paidCallCount: number;
  freeCallCount: number;
  failedPayments: number;
  providers: Record<string, number>;
}

interface PaymentRecord {
  url: string;
  address: string;
  amount: string;
  chain: string;
  txHash: string;
  timestamp: string;
}

/** Minimal wallet interface — duck-typed to avoid circular dependency */
interface PayableWallet {
  sendUsdtTransfer(chainId: string, recipient: string, amount: string): Promise<{ hash: string; fee: string }>;
}

// ── Service ────────────────────────────────────────────────────

/**
 * PaidFetchService — transparent HTTP client that auto-pays 402 responses.
 *
 * Flow:
 * 1. Issue a normal fetch(url)
 * 2. If 402 Payment Required, read X-Payment-Address / X-Payment-Amount / X-Payment-Chain
 * 3. Send USDt via WDK to the address
 * 4. Retry with X-Payment-Receipt header containing the tx hash
 * 5. Return the final response
 *
 * This makes our agent a CONSUMER of other agents' paid APIs.
 */
export class PaidFetchService {
  private wallet: PayableWallet | null = null;
  private stats: PaidFetchStats = {
    totalSpent: 0,
    callCount: 0,
    paidCallCount: 0,
    freeCallCount: 0,
    failedPayments: 0,
    providers: {},
  };
  private paymentHistory: PaymentRecord[] = [];
  private readonly maxHistorySize = 200;

  setWallet(wallet: PayableWallet): void {
    this.wallet = wallet;
  }

  /**
   * Fetch a URL, automatically paying if the server returns 402.
   */
  async paidFetch(url: string, options?: PaidFetchOptions): Promise<Response> {
    this.stats.callCount++;
    const maxPayment = parseFloat(options?.maxPayment ?? '1.00');
    const preferredChain = options?.preferredChain ?? 'ethereum-sepolia';

    // Strip our custom options before passing to fetch
    const fetchOpts: RequestInit = { ...options };
    delete (fetchOpts as Record<string, unknown>).maxPayment;
    delete (fetchOpts as Record<string, unknown>).preferredChain;

    // Step 1: Normal fetch
    let response: Response;
    try {
      response = await fetch(url, fetchOpts);
    } catch (err) {
      logger.error('paidFetch: network error', { url, error: String(err) });
      throw err;
    }

    // Step 2: If not 402, return as-is
    if (response.status !== 402) {
      this.stats.freeCallCount++;
      return response;
    }

    // Step 3: Parse payment headers
    const paymentAddress = response.headers.get('X-Payment-Address')
      ?? response.headers.get('x-payment-address');
    const paymentAmountStr = response.headers.get('X-Payment-Amount')
      ?? response.headers.get('x-payment-amount');
    const paymentChain = response.headers.get('X-Payment-Chain')
      ?? response.headers.get('x-payment-chain')
      ?? preferredChain;

    if (!paymentAddress || !paymentAmountStr) {
      logger.warn('paidFetch: 402 returned but missing payment headers', { url });
      this.stats.failedPayments++;
      return response; // Can't pay — return the 402 as-is
    }

    const paymentAmount = parseFloat(paymentAmountStr);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      logger.warn('paidFetch: invalid payment amount', { url, paymentAmountStr });
      this.stats.failedPayments++;
      return response;
    }

    // Step 4: Enforce budget limit
    if (paymentAmount > maxPayment) {
      logger.warn('paidFetch: payment exceeds maxPayment budget', {
        url, requested: paymentAmount, max: maxPayment,
      });
      this.stats.failedPayments++;
      return response;
    }

    // Step 5: Send payment via WDK
    if (!this.wallet) {
      logger.error('paidFetch: no wallet configured — cannot pay 402');
      this.stats.failedPayments++;
      return response;
    }

    let txHash: string;
    try {
      logger.info('paidFetch: paying for API access', {
        url, address: paymentAddress, amount: paymentAmountStr, chain: paymentChain,
      });
      const result = await this.wallet.sendUsdtTransfer(
        paymentChain,
        paymentAddress,
        paymentAmountStr,
      );
      txHash = result.hash;
      logger.info('paidFetch: payment sent', { txHash, fee: result.fee });
    } catch (err) {
      logger.error('paidFetch: payment failed', { url, error: String(err) });
      this.stats.failedPayments++;
      return response;
    }

    // Track the payment
    this.stats.paidCallCount++;
    this.stats.totalSpent += paymentAmount;

    const provider = new URL(url).hostname;
    this.stats.providers[provider] = (this.stats.providers[provider] ?? 0) + paymentAmount;

    const record: PaymentRecord = {
      url,
      address: paymentAddress,
      amount: paymentAmountStr,
      chain: paymentChain,
      txHash,
      timestamp: new Date().toISOString(),
    };
    this.paymentHistory.push(record);
    if (this.paymentHistory.length > this.maxHistorySize) {
      this.paymentHistory.shift();
    }

    // Step 6: Retry with receipt header
    const retryHeaders = new Headers(fetchOpts.headers ?? {});
    retryHeaders.set('X-Payment-Receipt', txHash);

    try {
      const retryResponse = await fetch(url, {
        ...fetchOpts,
        headers: retryHeaders,
      });
      return retryResponse;
    } catch (err) {
      logger.error('paidFetch: retry after payment failed', { url, txHash, error: String(err) });
      throw err;
    }
  }

  /**
   * Get aggregate stats about paid API usage.
   */
  getPaidFetchStats(): PaidFetchStats {
    return { ...this.stats, providers: { ...this.stats.providers } };
  }

  /**
   * Get recent payment history.
   */
  getPaymentHistory(limit = 20): PaymentRecord[] {
    return this.paymentHistory.slice(-limit);
  }

  /**
   * Reset stats (useful for testing or daily resets).
   */
  resetStats(): void {
    this.stats = {
      totalSpent: 0,
      callCount: 0,
      paidCallCount: 0,
      freeCallCount: 0,
      failedPayments: 0,
      providers: {},
    };
    this.paymentHistory = [];
  }
}

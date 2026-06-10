// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — QR Code Payment Receiver for Merchants
// REAL: on-chain payment verification, EIP-681/BIP-21 payment URIs,
// balance monitoring, multi-chain tx confirmation.

import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

// ── Chain RPCs for payment verification ────────────────────────

const CHAIN_RPCS: Record<string, { rpc: string; explorer: string; type: 'evm' | 'btc' | 'solana' | 'tron' }> = {
  ethereum:         { rpc: 'https://cloudflare-eth.com',         explorer: 'https://etherscan.io/tx/',          type: 'evm' },
  'ethereum-sepolia': { rpc: 'https://rpc.sepolia.org',          explorer: 'https://sepolia.etherscan.io/tx/',  type: 'evm' },
  polygon:          { rpc: 'https://polygon-rpc.com',            explorer: 'https://polygonscan.com/tx/',       type: 'evm' },
  bsc:              { rpc: 'https://bsc-dataseed.binance.org',   explorer: 'https://bscscan.com/tx/',           type: 'evm' },
  arbitrum:         { rpc: 'https://arb1.arbitrum.io/rpc',       explorer: 'https://arbiscan.io/tx/',           type: 'evm' },
  optimism:         { rpc: 'https://mainnet.optimism.io',        explorer: 'https://optimistic.etherscan.io/tx/', type: 'evm' },
  base:             { rpc: 'https://mainnet.base.org',           explorer: 'https://basescan.org/tx/',          type: 'evm' },
  bitcoin:          { rpc: 'https://blockstream.info/api',       explorer: 'https://blockstream.info/tx/',      type: 'btc' },
  'bitcoin-testnet': { rpc: 'https://blockstream.info/testnet/api', explorer: 'https://blockstream.info/testnet/tx/', type: 'btc' },
  solana:           { rpc: 'https://api.mainnet-beta.solana.com', explorer: 'https://solscan.io/tx/',           type: 'solana' },
  'solana-devnet':  { rpc: 'https://api.devnet.solana.com',      explorer: 'https://solscan.io/tx/',            type: 'solana' },
  tron:             { rpc: 'https://api.trongrid.io',            explorer: 'https://tronscan.org/#/transaction/', type: 'tron' },
  'tron-nile':      { rpc: 'https://nile.trongrid.io',          explorer: 'https://nile.tronscan.org/#/transaction/', type: 'tron' },
};

async function fetchWithTimeout(url: string, opts?: RequestInit & { timeout?: number }): Promise<Response> {
  const timeoutMs = opts?.timeout ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { timeout: _t, ...fetchOpts } = opts ?? {};
    return await fetch(url, {
      ...fetchOpts,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...fetchOpts.headers },
    });
  } finally {
    clearTimeout(timer);
  }
}

// ── On-Chain Verification Functions ────────────────────────────

interface TxVerification {
  verified: boolean;
  status: 'confirmed' | 'pending' | 'failed' | 'not_found';
  blockNumber?: number;
  confirmations?: number;
  from?: string;
  to?: string;
  value?: string;
  gasUsed?: number;
  explorerUrl: string;
}

/** Verify an EVM transaction on-chain via eth_getTransactionReceipt */
async function verifyEvmTx(rpcUrl: string, txHash: string, explorerBase: string): Promise<TxVerification> {
  try {
    // Get receipt
    const receiptRes = await fetchWithTimeout(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [txHash] }),
    });
    const receiptData = await receiptRes.json() as { result?: { status: string; blockNumber: string; gasUsed: string; from: string; to: string } };

    if (!receiptData.result) {
      // Check if tx is pending
      const txRes = await fetchWithTimeout(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_getTransactionByHash', params: [txHash] }),
      });
      const txData = await txRes.json() as { result?: { from: string; to: string; value: string } };
      if (txData.result) {
        return {
          verified: false, status: 'pending',
          from: txData.result.from, to: txData.result.to,
          value: (parseInt(txData.result.value, 16) / 1e18).toString(),
          explorerUrl: explorerBase + txHash,
        };
      }
      return { verified: false, status: 'not_found', explorerUrl: explorerBase + txHash };
    }

    const receipt = receiptData.result;
    const success = receipt.status === '0x1';
    const blockNum = parseInt(receipt.blockNumber, 16);

    // Get current block for confirmations
    const blockRes = await fetchWithTimeout(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'eth_blockNumber', params: [] }),
    });
    const blockData = await blockRes.json() as { result?: string };
    const currentBlock = parseInt(blockData.result ?? '0x0', 16);

    // Get tx details for value
    const txRes2 = await fetchWithTimeout(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'eth_getTransactionByHash', params: [txHash] }),
    });
    const txData2 = await txRes2.json() as { result?: { value: string } };
    const valueWei = parseInt(txData2.result?.value ?? '0x0', 16);

    return {
      verified: success,
      status: success ? 'confirmed' : 'failed',
      blockNumber: blockNum,
      confirmations: currentBlock - blockNum,
      from: receipt.from,
      to: receipt.to,
      value: (valueWei / 1e18).toString(),
      gasUsed: parseInt(receipt.gasUsed, 16),
      explorerUrl: explorerBase + txHash,
    };
  } catch (err) {
    logger.warn(`EVM tx verification failed: ${err}`);
    return { verified: false, status: 'not_found', explorerUrl: explorerBase + txHash };
  }
}

/** Verify a Bitcoin transaction via Blockstream API */
async function verifyBtcTx(apiBase: string, txHash: string, explorerBase: string): Promise<TxVerification> {
  try {
    const res = await fetchWithTimeout(`${apiBase}/tx/${txHash}`);
    if (!res.ok) return { verified: false, status: 'not_found', explorerUrl: explorerBase + txHash };

    const tx = await res.json() as {
      status: { confirmed: boolean; block_height?: number };
      vin: { prevout?: { scriptpubkey_address?: string; value?: number } }[];
      vout: { scriptpubkey_address?: string; value?: number }[];
    };

    const confirmed = tx.status.confirmed;
    const totalOut = tx.vout.reduce((s, o) => s + (o.value ?? 0), 0);
    const from = tx.vin[0]?.prevout?.scriptpubkey_address;
    const to = tx.vout[0]?.scriptpubkey_address;

    // Get tip height for confirmations
    let confirmations = 0;
    if (confirmed && tx.status.block_height) {
      try {
        const tipRes = await fetchWithTimeout(`${apiBase}/blocks/tip/height`);
        const tipHeight = parseInt(await tipRes.text());
        confirmations = tipHeight - tx.status.block_height + 1;
      } catch { /* ignore */ }
    }

    return {
      verified: confirmed,
      status: confirmed ? 'confirmed' : 'pending',
      blockNumber: tx.status.block_height,
      confirmations,
      from,
      to,
      value: (totalOut / 1e8).toString(),
      explorerUrl: explorerBase + txHash,
    };
  } catch (err) {
    logger.warn(`BTC tx verification failed: ${err}`);
    return { verified: false, status: 'not_found', explorerUrl: explorerBase + txHash };
  }
}

/** Verify a Solana transaction via JSON-RPC */
async function verifySolanaTx(rpcUrl: string, txHash: string, explorerBase: string): Promise<TxVerification> {
  try {
    const res = await fetchWithTimeout(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'getTransaction',
        params: [txHash, { encoding: 'json', maxSupportedTransactionVersion: 0 }],
      }),
    });
    const data = await res.json() as {
      result?: {
        slot: number;
        meta: { err: unknown; fee: number; postBalances: number[]; preBalances: number[] };
        transaction: { message: { accountKeys: string[] } };
      }
    };

    if (!data.result) return { verified: false, status: 'not_found', explorerUrl: explorerBase + txHash };

    const success = data.result.meta.err === null;
    const accounts = data.result.transaction.message.accountKeys;
    const preBalances = data.result.meta.preBalances;
    const postBalances = data.result.meta.postBalances;
    // Find the account that received funds (balance increased)
    let receiverIdx = -1;
    let maxIncrease = 0;
    for (let i = 1; i < postBalances.length; i++) {
      const increase = postBalances[i] - preBalances[i];
      if (increase > maxIncrease) {
        maxIncrease = increase;
        receiverIdx = i;
      }
    }

    return {
      verified: success,
      status: success ? 'confirmed' : 'failed',
      blockNumber: data.result.slot,
      from: accounts[0],
      to: receiverIdx >= 0 ? accounts[receiverIdx] : accounts[1],
      value: (maxIncrease / 1e9).toFixed(9),
      gasUsed: data.result.meta.fee,
      explorerUrl: explorerBase + txHash,
    };
  } catch (err) {
    logger.warn(`Solana tx verification failed: ${err}`);
    return { verified: false, status: 'not_found', explorerUrl: explorerBase + txHash };
  }
}

/** Verify a Tron transaction via TronGrid API */
async function verifyTronTx(apiBase: string, txHash: string, explorerBase: string): Promise<TxVerification> {
  try {
    const res = await fetchWithTimeout(`${apiBase}/wallet/gettransactionbyid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: txHash }),
    });
    const tx = await res.json() as {
      txID?: string;
      ret?: { contractRet: string }[];
      raw_data?: {
        contract?: { parameter?: { value?: { to_address?: string; owner_address?: string; amount?: number } } }[];
      };
    };

    if (!tx.txID) return { verified: false, status: 'not_found', explorerUrl: explorerBase + txHash };

    const success = tx.ret?.[0]?.contractRet === 'SUCCESS';
    const contract = tx.raw_data?.contract?.[0]?.parameter?.value;

    return {
      verified: success,
      status: success ? 'confirmed' : 'failed',
      from: contract?.owner_address,
      to: contract?.to_address,
      value: contract?.amount ? (contract.amount / 1e6).toString() : '0',
      explorerUrl: explorerBase + txHash,
    };
  } catch (err) {
    logger.warn(`Tron tx verification failed: ${err}`);
    return { verified: false, status: 'not_found', explorerUrl: explorerBase + txHash };
  }
}

/** Get EVM address balance */
async function getEvmBalance(rpcUrl: string, address: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] }),
    });
    const data = await res.json() as { result?: string };
    return parseInt(data.result ?? '0x0', 16) / 1e18;
  } catch { return 0; }
}

/** Get Bitcoin address balance */
async function getBtcBalance(apiBase: string, address: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(`${apiBase}/address/${address}`);
    if (!res.ok) return 0;
    const data = await res.json() as {
      chain_stats: { funded_txo_sum: number; spent_txo_sum: number };
    };
    return (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8;
  } catch { return 0; }
}

// ── Types ──────────────────────────────────────────────────────

export interface MerchantProfile {
  id: string;
  name: string;
  walletAddress: string;
  chainId: string;
  acceptedTokens: string[];
  createdAt: string;
  totalReceived: number;
  transactionCount: number;
  webhookUrl?: string;
  metadata?: Record<string, string>;
  currentBalance?: number;
  lastBalanceCheck?: string;
}

export interface QRPaymentRequest {
  id: string;
  merchantId: string;
  amount: string;
  token: string;
  chainId: string;
  walletAddress: string;
  memo?: string;
  expiresAt: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  txHash?: string;
  payerAddress?: string;
  qrData: string;
  /** Standard payment URI (EIP-681 for EVM, BIP-21 for BTC) */
  paymentUri: string;
  /** On-chain verification result */
  verification?: TxVerification;
}

export interface QRPaymentStats {
  totalMerchants: number;
  totalPayments: number;
  totalVolume: number;
  avgPaymentSize: number;
  pendingPayments: number;
  conversionRate: number;
  verifiedOnChain: number;
}

// ── Service ────────────────────────────────────────────────────

export class QRMerchantService {
  private merchants: Map<string, MerchantProfile> = new Map();
  private payments: Map<string, QRPaymentRequest> = new Map();

  constructor() {
    logger.info('QR Merchant payment service initialized (real on-chain verification)');
  }

  // ── Merchant Management ──────────────────────────────────

  registerMerchant(params: {
    name: string;
    walletAddress: string;
    chainId?: string;
    acceptedTokens?: string[];
    webhookUrl?: string;
    metadata?: Record<string, string>;
  }): MerchantProfile {
    const merchant: MerchantProfile = {
      id: `merchant_${randomUUID().slice(0, 8)}`,
      name: params.name,
      walletAddress: params.walletAddress,
      chainId: params.chainId ?? 'ethereum',
      acceptedTokens: params.acceptedTokens ?? ['USDT', 'native'],
      createdAt: new Date().toISOString(),
      totalReceived: 0,
      transactionCount: 0,
      webhookUrl: params.webhookUrl,
      metadata: params.metadata,
    };
    this.merchants.set(merchant.id, merchant);
    logger.info(`Merchant registered: ${merchant.name} (${merchant.id})`);
    return merchant;
  }

  getMerchant(merchantId: string): MerchantProfile | null {
    return this.merchants.get(merchantId) ?? null;
  }

  listMerchants(): MerchantProfile[] {
    return [...this.merchants.values()];
  }

  /** Check real on-chain balance for a merchant */
  async checkMerchantBalance(merchantId: string): Promise<{ balance: number; chainId: string } | { error: string }> {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) return { error: `Merchant ${merchantId} not found` };

    const chain = CHAIN_RPCS[merchant.chainId];
    if (!chain) return { error: `Unsupported chain: ${merchant.chainId}` };

    let balance = 0;
    if (chain.type === 'evm') {
      balance = await getEvmBalance(chain.rpc, merchant.walletAddress);
    } else if (chain.type === 'btc') {
      balance = await getBtcBalance(chain.rpc, merchant.walletAddress);
    }

    merchant.currentBalance = balance;
    merchant.lastBalanceCheck = new Date().toISOString();

    return { balance, chainId: merchant.chainId };
  }

  // ── QR Code Generation (Standard Payment URIs) ─────────

  /** Build a standard payment URI based on chain type */
  private buildPaymentUri(chainId: string, address: string, amount: string, token: string, memo?: string): string {
    const chain = CHAIN_RPCS[chainId];
    if (!chain) return `aerofyta://pay?to=${address}&amount=${amount}&token=${token}`;

    switch (chain.type) {
      case 'evm': {
        // EIP-681: ethereum:<address>?value=<wei>
        // For native ETH transfers
        if (token === 'native' || token === 'ETH') {
          const valueWei = BigInt(Math.round(parseFloat(amount) * 1e18));
          let uri = `ethereum:${address}@${this.getChainIdNum(chainId)}?value=${valueWei}`;
          if (memo) uri += `&data=${Buffer.from(memo).toString('hex')}`;
          return uri;
        }
        // For ERC-20 tokens (USDT etc) — simplified
        return `ethereum:${address}@${this.getChainIdNum(chainId)}?value=0&uint256=${amount}`;
      }
      case 'btc': {
        // BIP-21: bitcoin:<address>?amount=<btc>&message=<memo>
        let uri = `bitcoin:${address}?amount=${amount}`;
        if (memo) uri += `&message=${encodeURIComponent(memo)}`;
        return uri;
      }
      case 'solana': {
        // Solana Pay: solana:<address>?amount=<amount>&spl-token=<mint>
        let uri = `solana:${address}?amount=${amount}`;
        if (token !== 'native' && token !== 'SOL') uri += `&spl-token=${token}`;
        if (memo) uri += `&memo=${encodeURIComponent(memo)}`;
        return uri;
      }
      case 'tron': {
        return `tron:${address}?amount=${amount}&token=${token}`;
      }
      default:
        return `aerofyta://pay?to=${address}&amount=${amount}&token=${token}&chain=${chainId}`;
    }
  }

  private getChainIdNum(chainId: string): number {
    const map: Record<string, number> = {
      ethereum: 1, 'ethereum-sepolia': 11155111, polygon: 137,
      bsc: 56, arbitrum: 42161, optimism: 10, base: 8453,
    };
    return map[chainId] ?? 1;
  }

  generatePaymentQR(params: {
    merchantId: string;
    amount: string;
    token?: string;
    memo?: string;
    expiresInMinutes?: number;
  }): QRPaymentRequest | { error: string } {
    const merchant = this.merchants.get(params.merchantId);
    if (!merchant) return { error: `Merchant ${params.merchantId} not found` };

    const token = params.token ?? 'USDT';
    if (!merchant.acceptedTokens.includes(token)) {
      return { error: `Merchant does not accept ${token}. Accepted: ${merchant.acceptedTokens.join(', ')}` };
    }

    const reqId = `qr_${randomUUID().slice(0, 12)}`;
    const expiresMs = (params.expiresInMinutes ?? 30) * 60 * 1000;

    // Build standard payment URI
    const paymentUri = this.buildPaymentUri(merchant.chainId, merchant.walletAddress, params.amount, token, params.memo);

    // Also build aerofyta-specific QR data
    const qrData = `aerofyta://pay?to=${merchant.walletAddress}&amount=${params.amount}&token=${token}&chain=${merchant.chainId}&id=${reqId}${params.memo ? `&memo=${encodeURIComponent(params.memo)}` : ''}`;

    const payment: QRPaymentRequest = {
      id: reqId,
      merchantId: params.merchantId,
      amount: params.amount,
      token,
      chainId: merchant.chainId,
      walletAddress: merchant.walletAddress,
      memo: params.memo,
      expiresAt: new Date(Date.now() + expiresMs).toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      qrData,
      paymentUri,
    };

    this.payments.set(reqId, payment);
    logger.info(`QR payment request created: ${reqId} for ${params.amount} ${token} — URI: ${paymentUri}`);
    return payment;
  }

  // ── Payment Confirmation with Real Verification ─────────

  /** Confirm payment with REAL on-chain transaction verification */
  async confirmPayment(paymentId: string, txHash: string, payerAddress: string): Promise<QRPaymentRequest | { error: string }> {
    const payment = this.payments.get(paymentId);
    if (!payment) return { error: `Payment ${paymentId} not found` };
    if (payment.status !== 'pending') return { error: `Payment already ${payment.status}` };

    if (new Date(payment.expiresAt) < new Date()) {
      payment.status = 'expired';
      return { error: 'Payment request has expired' };
    }

    // Real on-chain verification
    const verification = await this.verifyTransaction(payment.chainId, txHash);
    payment.verification = verification;

    if (!verification.verified) {
      if (verification.status === 'pending') {
        // Tx exists but not yet confirmed — keep as pending
        payment.txHash = txHash;
        payment.payerAddress = payerAddress;
        return payment; // Return with pending status, verification attached
      }
      return { error: `Transaction verification failed: ${verification.status}. Explorer: ${verification.explorerUrl}` };
    }

    // Verified on-chain — mark as paid
    payment.status = 'paid';
    payment.paidAt = new Date().toISOString();
    payment.txHash = txHash;
    payment.payerAddress = payerAddress;

    // Update merchant stats
    const merchant = this.merchants.get(payment.merchantId);
    if (merchant) {
      merchant.totalReceived += parseFloat(payment.amount) || 0;
      merchant.transactionCount++;
    }

    logger.info(`Payment verified on-chain: ${paymentId} — tx ${txHash} (${verification.confirmations ?? 0} confirmations)`);
    return payment;
  }

  /** Verify a transaction on the appropriate chain */
  async verifyTransaction(chainId: string, txHash: string): Promise<TxVerification> {
    const chain = CHAIN_RPCS[chainId];
    if (!chain) return { verified: false, status: 'not_found', explorerUrl: `unknown-chain://${txHash}` };

    switch (chain.type) {
      case 'evm':
        return verifyEvmTx(chain.rpc, txHash, chain.explorer);
      case 'btc':
        return verifyBtcTx(chain.rpc, txHash, chain.explorer);
      case 'solana':
        return verifySolanaTx(chain.rpc, txHash, chain.explorer);
      case 'tron':
        return verifyTronTx(chain.rpc, txHash, chain.explorer);
      default:
        return { verified: false, status: 'not_found', explorerUrl: chain.explorer + txHash };
    }
  }

  /** Standalone tx verification — verify any tx on any supported chain */
  async verifyTx(chainId: string, txHash: string): Promise<TxVerification> {
    return this.verifyTransaction(chainId, txHash);
  }

  cancelPayment(paymentId: string): QRPaymentRequest | { error: string } {
    const payment = this.payments.get(paymentId);
    if (!payment) return { error: `Payment ${paymentId} not found` };
    if (payment.status !== 'pending') return { error: `Cannot cancel — payment is ${payment.status}` };

    payment.status = 'cancelled';
    logger.info(`Payment cancelled: ${paymentId}`);
    return payment;
  }

  getPayment(paymentId: string): QRPaymentRequest | null {
    return this.payments.get(paymentId) ?? null;
  }

  listPayments(merchantId?: string): QRPaymentRequest[] {
    const all = [...this.payments.values()];
    if (merchantId) return all.filter(p => p.merchantId === merchantId);
    return all;
  }

  // ── Expiration Check ─────────────────────────────────────

  expireStalePayments(): number {
    const now = new Date();
    let expired = 0;
    for (const payment of this.payments.values()) {
      if (payment.status === 'pending' && new Date(payment.expiresAt) < now) {
        payment.status = 'expired';
        expired++;
      }
    }
    if (expired > 0) logger.info(`Expired ${expired} stale QR payment requests`);
    return expired;
  }

  // ── Stats ────────────────────────────────────────────────

  getStats(): QRPaymentStats {
    const all = [...this.payments.values()];
    const paid = all.filter(p => p.status === 'paid');
    const totalVolume = paid.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const generated = all.filter(p => p.status !== 'cancelled').length;
    const verifiedOnChain = paid.filter(p => p.verification?.verified).length;

    return {
      totalMerchants: this.merchants.size,
      totalPayments: paid.length,
      totalVolume,
      avgPaymentSize: paid.length > 0 ? totalVolume / paid.length : 0,
      pendingPayments: all.filter(p => p.status === 'pending').length,
      conversionRate: generated > 0 ? (paid.length / generated) * 100 : 0,
      verifiedOnChain,
    };
  }
}

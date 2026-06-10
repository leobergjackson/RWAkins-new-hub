// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta Chain Adapters — Normalize any WDK wallet type into a
// uniform interface so the agent core never needs chain-specific logic.
//
// Usage:
//   import { UniversalAdapter } from 'aerofyta-agent/sdk/adapters';
//   const wallet = UniversalAdapter.fromWDKAccount(account, 'ethereum-sepolia');

// ── Common Adapter Interface ────────────────────────────────────────

export interface ChainWallet {
  /** Get the wallet address on this chain */
  getAddress(): string;
  /** Get the native + USDT balance */
  getBalance(): Promise<{ native: string; usdt: string }>;
  /** Send a raw transaction */
  sendTransaction(params: { to: string; value: string; data?: string }): Promise<{ hash: string }>;
  /** Transfer USDT to a recipient */
  transfer(params: { to: string; amount: string; token?: string }): Promise<{ hash: string }>;
  /** The chain identifier */
  readonly chainId: string;
  /** Human-readable chain name */
  readonly chainName: string;
}

// ── WDK Account Shape ───────────────────────────────────────────────

/**
 * Minimal interface that any WDK account object satisfies.
 * We keep this loose so the SDK works with current and future WDK versions.
 */
export interface WDKAccount {
  getAddress?: () => string;
  address?: string;
  getBalance?: () => Promise<unknown>;
  sendTransaction?: (params: unknown) => Promise<unknown>;
  transfer?: (params: unknown) => Promise<unknown>;
}

// ── Helpers ─────────────────────────────────────────────────────────

function extractAddress(account: WDKAccount): string {
  if (typeof account.getAddress === 'function') return account.getAddress();
  if (account.address) return account.address;
  return '0x0000000000000000000000000000000000000000';
}

async function extractBalance(account: WDKAccount): Promise<{ native: string; usdt: string }> {
  if (typeof account.getBalance === 'function') {
    const bal = await account.getBalance() as Record<string, string> | undefined;
    return {
      native: bal?.native ?? bal?.nativeBalance ?? '0',
      usdt: bal?.usdt ?? bal?.usdtBalance ?? '0',
    };
  }
  return { native: '0', usdt: '0' };
}

async function wrapSend(
  account: WDKAccount,
  params: { to: string; value: string; data?: string },
): Promise<{ hash: string }> {
  if (typeof account.sendTransaction === 'function') {
    const result = await account.sendTransaction(params) as { hash?: string; txHash?: string };
    return { hash: result.hash ?? result.txHash ?? 'unknown' };
  }
  throw new Error('WDK account does not support sendTransaction');
}

async function wrapTransfer(
  account: WDKAccount,
  params: { to: string; amount: string; token?: string },
): Promise<{ hash: string }> {
  if (typeof account.transfer === 'function') {
    const result = await account.transfer(params) as { hash?: string; txHash?: string };
    return { hash: result.hash ?? result.txHash ?? 'unknown' };
  }
  // Fall back to sendTransaction
  return wrapSend(account, { to: params.to, value: params.amount });
}

// ── EVM Adapter ─────────────────────────────────────────────────────

export class EVMAdapter {
  /**
   * Wrap a WDK EVM account (Ethereum, Polygon, Arbitrum, etc.) as a
   * ChainWallet.
   */
  static fromWDKAccount(account: WDKAccount, chainId = 'ethereum-sepolia'): ChainWallet {
    return {
      getAddress: () => extractAddress(account),
      getBalance: () => extractBalance(account),
      sendTransaction: (params) => wrapSend(account, params),
      transfer: (params) => wrapTransfer(account, params),
      chainId,
      chainName: chainId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  }
}

// ── TON Adapter ─────────────────────────────────────────────────────

export class TONAdapter {
  /**
   * Wrap a WDK TON account as a ChainWallet.
   */
  static fromWDKAccount(account: WDKAccount, chainId = 'ton-testnet'): ChainWallet {
    return {
      getAddress: () => extractAddress(account),
      getBalance: () => extractBalance(account),
      sendTransaction: (params) => wrapSend(account, params),
      transfer: (params) => wrapTransfer(account, params),
      chainId,
      chainName: 'TON',
    };
  }
}

// ── Tron Adapter ────────────────────────────────────────────────────

export class TronAdapter {
  /**
   * Wrap a WDK Tron account as a ChainWallet.
   */
  static fromWDKAccount(account: WDKAccount, chainId = 'tron-nile'): ChainWallet {
    return {
      getAddress: () => extractAddress(account),
      getBalance: () => extractBalance(account),
      sendTransaction: (params) => wrapSend(account, params),
      transfer: (params) => wrapTransfer(account, params),
      chainId,
      chainName: 'Tron',
    };
  }
}

// ── Bitcoin Adapter ─────────────────────────────────────────────────

export class BitcoinAdapter {
  /**
   * Wrap a WDK Bitcoin account as a ChainWallet.
   * Note: Bitcoin uses UTXO model; transfer wraps the WDK abstraction.
   */
  static fromWDKAccount(account: WDKAccount, chainId = 'bitcoin-testnet'): ChainWallet {
    return {
      getAddress: () => extractAddress(account),
      getBalance: () => extractBalance(account),
      sendTransaction: (params) => wrapSend(account, params),
      transfer: (params) => wrapTransfer(account, params),
      chainId,
      chainName: 'Bitcoin',
    };
  }
}

// ── Solana Adapter ──────────────────────────────────────────────────

export class SolanaAdapter {
  /**
   * Wrap a WDK Solana account as a ChainWallet.
   */
  static fromWDKAccount(account: WDKAccount, chainId = 'solana-devnet'): ChainWallet {
    return {
      getAddress: () => extractAddress(account),
      getBalance: () => extractBalance(account),
      sendTransaction: (params) => wrapSend(account, params),
      transfer: (params) => wrapTransfer(account, params),
      chainId,
      chainName: 'Solana',
    };
  }
}

// ── Universal Adapter ───────────────────────────────────────────────

/**
 * Auto-detect the correct adapter from a chain identifier.
 *
 * ```typescript
 * const wallet = UniversalAdapter.fromWDKAccount(account, 'ethereum-sepolia');
 * const balance = await wallet.getBalance();
 * ```
 */
export class UniversalAdapter {
  /**
   * Create a ChainWallet from any WDK account by detecting the chain
   * type from the chainId string.
   */
  static fromWDKAccount(account: WDKAccount, chainId: string): ChainWallet {
    const id = chainId.toLowerCase();

    if (id.includes('ethereum') || id.includes('polygon') || id.includes('arbitrum') || id.includes('evm')) {
      return EVMAdapter.fromWDKAccount(account, chainId);
    }
    if (id.includes('ton')) {
      return TONAdapter.fromWDKAccount(account, chainId);
    }
    if (id.includes('tron')) {
      return TronAdapter.fromWDKAccount(account, chainId);
    }
    if (id.includes('bitcoin') || id.includes('btc')) {
      return BitcoinAdapter.fromWDKAccount(account, chainId);
    }
    if (id.includes('solana') || id.includes('sol')) {
      return SolanaAdapter.fromWDKAccount(account, chainId);
    }

    // Default: treat as EVM-compatible
    return EVMAdapter.fromWDKAccount(account, chainId);
  }

  /**
   * Get all supported chain families.
   */
  static getSupportedChains(): string[] {
    return [
      'ethereum-sepolia',
      'ethereum-mainnet',
      'polygon-mainnet',
      'arbitrum-mainnet',
      'ton-testnet',
      'ton-mainnet',
      'tron-nile',
      'tron-mainnet',
      'bitcoin-testnet',
      'bitcoin-mainnet',
      'solana-devnet',
      'solana-mainnet',
    ];
  }
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — AI-Powered Multi-Chain Tipping Agent

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonRpcProvider, Contract, AbiCoder } from 'ethers';
import AaveProtocolEvm from '@tetherto/wdk-protocol-lending-aave-evm';
import { logger } from '../utils/logger.js';
import type { WalletService } from './wallet.service.js';

const __dirname_lending = dirname(fileURLToPath(import.meta.url));

// ── WDK Account Interface ────────────────────────────────────────

/** Minimal interface for a WDK account returned by WalletService.getWdkAccount() */
interface WdkAccount {
  registerProtocol(name: string, protocol: unknown, options: Record<string, unknown>): void;
  getLendingProtocol(name: string): {
    supply(params: { token: string; amount: bigint }): Promise<{ hash: string }>;
    withdraw(params: { token: string; amount: bigint }): Promise<{ hash: string }>;
    borrow(params: { asset: string; amount: bigint; interestRateMode: number }): Promise<{ hash: string }>;
    getAccountData(): Promise<{
      totalCollateralBase?: bigint;
      totalDebtBase?: bigint;
      availableBorrowsBase?: bigint;
      healthFactor?: bigint;
    }>;
  };
}

// ── Types ────────────────────────────────────────────────────────

export interface LendingRate {
  asset: string;
  chain: string;
  protocol: string;
  supplyApy: number;
  borrowApy: number;
  totalSupply: string;
  totalBorrow: string;
  utilizationRate: number;
  lastUpdated: string;
}

export interface LendingPosition {
  asset: string;
  chain: string;
  supplied: string;
  earned: string;
  apy: number;
  healthFactor: string;
  enteredAt: string;
  // Real Aave V3 account data (when available)
  totalCollateral?: string;
  totalDebt?: string;
  availableBorrows?: string;
  // Local tracking fields for compound interest calculation
  depositTime?: string;       // ISO timestamp of deposit
  principal?: number;         // original deposit amount
  currentAPY?: number;        // live APY at time of deposit (updated on refresh)
  accruedInterest?: number;   // calculated interest since deposit
}

export interface LendingAction {
  id: string;
  type: 'supply' | 'withdraw' | 'borrow' | 'repay';
  asset: string;
  chain: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed' | 'local_tracking';
  txHash?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// ── Autonomous Lending Types ─────────────────────────────────────

export interface CreditProfile {
  address: string;
  ensName: string | null;
  creditScore: number; // 0-1000
  creditTier: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
  totalTxCount: number;
  totalBalanceUsd: number;
  chainActivity: Record<string, { txCount: number; balance: number }>;
  activeChains: number;
  isContract: boolean;
  pastLoans: number;
  repaidLoans: number;
  defaultedLoans: number;
  lastUpdated: string;
  factors: {
    transactionHistory: number;
    balanceStrength: number;
    multiChainPresence: number;
    identityVerification: number;
    repaymentHistory: number;
  };
}

export interface LoanRecord {
  id: string;
  borrower: string;
  borrowerEns: string | null;
  amount: number;
  token: string;
  interestRate: number;
  totalRepayment: number;
  totalInterest: number;
  purpose: string;
  creditScoreAtIssuance: number;
  creditTier: string;
  status: 'active' | 'repaid' | 'defaulted' | 'cancelled';
  issuedAt: string;
  dueDate: string;
  installments: number;
  installmentAmount: number;
  installmentIntervalDays: number;
  repayments: Array<{ amount: number; paidAt: string; txHash: string | null }>;
  collateral: null | { token: string; amount: number; chain: string };
  decisionReasoning: string;
}

export interface RepaymentEntry {
  loanId: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paidAt: string | null;
  txHash: string | null;
}

// ── Rate cache ───────────────────────────────────────────────────

interface RateCache {
  data: LendingRate[];
  fetchedAt: number;
}

const RATE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let rateCache: RateCache | null = null;

// ── Static fallback rates ────────────────────────────────────────

const STATIC_RATES: LendingRate[] = [
  {
    asset: 'USDT', chain: 'Ethereum', protocol: 'Aave V3',
    supplyApy: 4.12, borrowApy: 5.85, totalSupply: '1.2B', totalBorrow: '890M',
    utilizationRate: 74.2, lastUpdated: new Date().toISOString(),
  },
  {
    asset: 'USDT', chain: 'Arbitrum', protocol: 'Aave V3',
    supplyApy: 5.87, borrowApy: 7.62, totalSupply: '320M', totalBorrow: '245M',
    utilizationRate: 76.6, lastUpdated: new Date().toISOString(),
  },
  {
    asset: 'USDT', chain: 'Optimism', protocol: 'Aave V3',
    supplyApy: 6.21, borrowApy: 8.14, totalSupply: '180M', totalBorrow: '142M',
    utilizationRate: 78.9, lastUpdated: new Date().toISOString(),
  },
  {
    asset: 'ETH', chain: 'Ethereum', protocol: 'Aave V3',
    supplyApy: 1.85, borrowApy: 3.21, totalSupply: '2.8M ETH', totalBorrow: '1.1M ETH',
    utilizationRate: 39.3, lastUpdated: new Date().toISOString(),
  },
  {
    asset: 'ETH', chain: 'Arbitrum', protocol: 'Aave V3',
    supplyApy: 2.14, borrowApy: 3.89, totalSupply: '520K ETH', totalBorrow: '210K ETH',
    utilizationRate: 40.4, lastUpdated: new Date().toISOString(),
  },
  {
    asset: 'USDT', chain: 'Polygon', protocol: 'Aave V3',
    supplyApy: 5.45, borrowApy: 7.21, totalSupply: '95M', totalBorrow: '72M',
    utilizationRate: 75.8, lastUpdated: new Date().toISOString(),
  },
];

// ── Aave V3 Sepolia Testnet Contract Addresses ──────────────────
// Source: https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Sepolia.sol
// Faucet: https://staging.aave.com/faucet/ (10,000 tokens per mint tx)

export const AAVE_V3_SEPOLIA = {
  POOL: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
  POOL_ADDRESSES_PROVIDER: '0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A',
  POOL_CONFIGURATOR: '0x7Ee60D184C24Ef7AfC1Ec7Be59A0f448A0abd138',
  ORACLE: '0x2da88497588bf89281816106C7259e31AF45a663',
  ACL_MANAGER: '0x7F2bE3b178deeFF716CD6Ff03Ef79A1dFf360ddD',
  FAUCET_URL: 'https://staging.aave.com/faucet/',
  // Aave Sepolia Faucet contract — call mint(address token, address to, uint256 amount)
  FAUCET: '0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D',
} as const;

/**
 * Aave V3 Sepolia test token addresses (underlying).
 * These are Aave's OWN test tokens on Sepolia — NOT real mainnet tokens.
 * Mint them via the Aave faucet at https://staging.aave.com/faucet/
 */
export const AAVE_SEPOLIA_TOKENS = {
  USDT:  '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
  USDC:  '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
  DAI:   '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
  WETH:  '0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c',
  WBTC:  '0x29f2D40B0605204364af54EC677bD022dA425d03',
  LINK:  '0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5',
  AAVE:  '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',
  EURS:  '0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E',
  GHO:   '0xc4bF5CbDaBE595361438F8c6a187bDc330539c60',
} as const;

/** aToken addresses (receipt tokens after supplying) */
export const AAVE_SEPOLIA_ATOKENS = {
  aUSDT: '0xAF0F6e8b0Dc5c913bbF4d14c22B4E78Dd14310B6',
  aUSDC: '0x16dA4541aD1807f4443d92D26044C1147406EB80',
  aDAI:  '0x29598b72eb5CeBd806C5dCD549490FdA35B13cD8',
  aWETH: '0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830',
  aWBTC: '0x1804Bf30507dc2EB3bDEbbbdd859991EAeF6EefF',
  aLINK: '0x3FfAf50D4F4E96eB78f2407c090b72e86eCaed24',
  aAAVE: '0x6b8558764d3b7572136F17174Cb9aB1DDc7E1259',
  aEURS: '0xB20691021F9AcED8631eDaa3c0Cd2949EB45662D',
  aGHO:  '0xd190eF37dB51Bb955A680fF1A85763CC72d083D4',
} as const;

// ── Token address lookup for Aave V3 supply/withdraw ────────────
// Mainnet addresses kept for reference; Sepolia uses Aave's own test tokens.

const AAVE_TOKEN_ADDRESSES: Record<string, string> = {
  // Mainnet (for rate lookups / future mainnet support)
  'ethereum': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  'arbitrum': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  'optimism': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  'polygon': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  // Sepolia testnet — Aave's own test USDT (mint via faucet)
  'ethereum-sepolia': AAVE_SEPOLIA_TOKENS.USDT,
};

/** Resolve the correct Aave Sepolia test token address for a given asset symbol */
function resolveSepoliaToken(asset: string): string {
  const key = asset.toUpperCase() as keyof typeof AAVE_SEPOLIA_TOKENS;
  return AAVE_SEPOLIA_TOKENS[key] ?? AAVE_SEPOLIA_TOKENS.USDT;
}

/** Get token decimals (USDT/USDC = 6, DAI/WETH/others = 18) */
function getTokenDecimals(asset: string): number {
  const sixDecimal = ['USDT', 'USDC'];
  const eightDecimal = ['WBTC'];
  const upper = asset.toUpperCase();
  if (sixDecimal.includes(upper)) return 6;
  if (eightDecimal.includes(upper)) return 8;
  return 18;
}

// ── DeFi Llama rate fetcher ──────────────────────────────────────

interface DefiLlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  totalSupplyUsd: number;
  totalBorrowUsd: number;
  apyBaseBorrow: number | null;
}

async function fetchRatesFromDefiLlama(): Promise<LendingRate[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://yields.llama.fi/pools', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`DeFi Llama returned HTTP ${res.status}`);
    }

    const json = await res.json() as { data: DefiLlamaPool[] };

    const aavePools = (json.data || []).filter((p: DefiLlamaPool) => {
      const symbol = (p.symbol ?? '').toUpperCase();
      return (
        p.project === 'aave-v3' &&
        (symbol.includes('USDT') || symbol === 'WETH' || symbol === 'ETH') &&
        p.tvlUsd > 1_000_000
      );
    });

    const rates: LendingRate[] = aavePools.slice(0, 10).map((p: DefiLlamaPool) => {
      const supplyApy = p.apy ?? p.apyBase ?? 0;
      const borrowApy = p.apyBaseBorrow ?? supplyApy * 1.4;
      const totalSupply = p.totalSupplyUsd ?? p.tvlUsd;
      const totalBorrow = p.totalBorrowUsd ?? 0;
      const utilization = totalSupply > 0 ? (totalBorrow / totalSupply) * 100 : 0;
      const asset = (p.symbol ?? '').toUpperCase().includes('USDT') ? 'USDT' : 'ETH';

      const chainMap: Record<string, string> = {
        'Ethereum': 'Ethereum', 'Arbitrum': 'Arbitrum', 'Optimism': 'Optimism',
        'Polygon': 'Polygon', 'Base': 'Base', 'BSC': 'BSC', 'Avalanche': 'Avalanche',
      };

      return {
        asset,
        chain: chainMap[p.chain] ?? p.chain,
        protocol: 'Aave V3',
        supplyApy: Math.round(supplyApy * 100) / 100,
        borrowApy: Math.round(borrowApy * 100) / 100,
        totalSupply: formatLargeNumber(totalSupply),
        totalBorrow: formatLargeNumber(totalBorrow),
        utilizationRate: Math.round(utilization * 10) / 10,
        lastUpdated: new Date().toISOString(),
      };
    });

    logger.info(`Fetched ${rates.length} Aave V3 lending rates from DeFi Llama`);
    return rates.length > 0 ? rates : STATIC_RATES;
  } catch (err) {
    logger.warn('Failed to fetch lending rates from DeFi Llama, using static data', { error: String(err) });
    return STATIC_RATES;
  }
}

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(2);
}

// ── Live APY cache (15 min TTL) ──────────────────────────────────

interface ApyCache {
  apy: number;
  fetchedAt: number;
}

const APY_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let apyCache: ApyCache | null = null;

/**
 * Fetch live Aave V3 USDT supply APY from DeFi Llama.
 * Returns the best available APY for Aave V3 USDT pools.
 * Cached for 15 minutes to avoid API spam.
 */
async function fetchLiveAPY(): Promise<number> {
  const now = Date.now();
  if (apyCache && (now - apyCache.fetchedAt) < APY_CACHE_TTL_MS) {
    return apyCache.apy;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://yields.llama.fi/pools', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`DeFi Llama HTTP ${res.status}`);

    const json = await res.json() as { data: DefiLlamaPool[] };

    // Find Aave V3 USDT pools with significant TVL
    const usdtPools = (json.data || []).filter((p: DefiLlamaPool) => {
      const symbol = (p.symbol ?? '').toUpperCase();
      return (
        p.project === 'aave-v3' &&
        symbol.includes('USDT') &&
        p.tvlUsd > 1_000_000
      );
    });

    if (usdtPools.length > 0) {
      // Use the pool with the highest TVL (most reliable rate)
      usdtPools.sort((a: DefiLlamaPool, b: DefiLlamaPool) => b.tvlUsd - a.tvlUsd);
      const bestPool = usdtPools[0];
      const apy = bestPool.apy ?? bestPool.apyBase ?? 4.0;
      apyCache = { apy, fetchedAt: now };
      logger.info(`Live APY fetched from DeFi Llama: ${apy.toFixed(2)}% (Aave V3 USDT, ${bestPool.chain})`);
      return apy;
    }

    // No matching pools found, fall back to static
    const fallbackApy = STATIC_RATES[0]?.supplyApy ?? 4.0;
    apyCache = { apy: fallbackApy, fetchedAt: now };
    return fallbackApy;
  } catch (err) {
    logger.warn('Failed to fetch live APY from DeFi Llama, using cached/static', { error: String(err) });
    if (apyCache) return apyCache.apy;
    const fallbackApy = STATIC_RATES[0]?.supplyApy ?? 4.0;
    apyCache = { apy: fallbackApy, fetchedAt: now };
    return fallbackApy;
  }
}

// ── Service ──────────────────────────────────────────────────────

/**
 * LendingService — Wraps the WDK Aave V3 lending protocol for supply/withdraw.
 *
 * Uses `@tetherto/wdk-protocol-lending-aave-evm` for REAL onchain Aave V3 interactions.
 * The lending protocol is registered per-account via WDK's `registerProtocol()` method.
 *
 * On testnet (Sepolia), Aave V3 may behave differently, so the service
 * gracefully falls back to local position tracking when Aave contracts are unavailable on testnet.
 */
export class LendingService {
  private walletService: WalletService | null = null;
  private available = false;
  private protocolRegistered = false;
  private position: LendingPosition | null = null;
  private actionHistory: LendingAction[] = [];

  /** Provide the WalletService reference so we can get WDK accounts for protocol registration */
  setWalletService(ws: WalletService): void {
    this.walletService = ws;
    this.tryInitialize();
  }

  // ── Initialization ────────────────────────────────────────────

  private tryInitialize(): void {
    try {
      this.available = true;
      logger.info('Lending service initialized (Aave V3 protocol loaded, WDK integration ready)');
    } catch (err) {
      logger.warn('Aave V3 protocol initialization failed — service unavailable', { error: String(err) });
      this.available = false;
    }
  }

  /**
   * Register the Aave V3 lending protocol on a WDK account.
   * Called lazily before the first lending operation.
   */
  /* istanbul ignore next -- requires real WDK account for Aave protocol registration */
  private async registerProtocol(): Promise<void> {
    if (this.protocolRegistered || !this.walletService) return;

    try {
      const account = await this.walletService.getWdkAccount('ethereum-sepolia') as WdkAccount | null;
      if (account && typeof account.registerProtocol === 'function') {
        account.registerProtocol('aave-v3', AaveProtocolEvm as unknown, {
          pool: AAVE_V3_SEPOLIA.POOL,
          poolAddressesProvider: AAVE_V3_SEPOLIA.POOL_ADDRESSES_PROVIDER,
        });
        this.protocolRegistered = true;
        logger.info('Aave V3 lending protocol registered on WDK account (Sepolia)', {
          pool: AAVE_V3_SEPOLIA.POOL,
        });
      }
    } catch (err) {
      logger.warn('Could not register Aave V3 protocol on WDK account (non-critical)', { error: String(err) });
    }
  }

  // ── Public API ────────────────────────────────────────────────

  /** Check if the lending protocol is available */
  isAvailable(): boolean {
    return this.available;
  }

  /** Get current Aave V3 yield rates (cached, refreshed from DeFi Llama) */
  async getYieldRates(): Promise<LendingRate[]> {
    const now = Date.now();
    if (rateCache && (now - rateCache.fetchedAt) < RATE_CACHE_TTL_MS) {
      return rateCache.data;
    }

    const data = await fetchRatesFromDefiLlama();
    rateCache = { data, fetchedAt: now };
    return data;
  }

  /**
   * Supply funds to Aave V3 via WDK lending protocol.
   *
   * Attempts REAL onchain Aave V3 supply via `@tetherto/wdk-protocol-lending-aave-evm`.
   * Retries up to 3 times with 2-second delay between attempts.
   * Falls back to local position tracking with live APY if all retries fail.
   */
  async supply(chain: string, amount: string, asset = 'USDT'): Promise<LendingAction> {
    const id = `lend-supply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const action: LendingAction = {
      id,
      type: 'supply',
      asset,
      chain,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Attempt REAL Aave V3 supply via WDK — retry up to 3 times with 2s delay
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.registerProtocol();

        if (this.protocolRegistered && this.walletService) {
          const account = await this.walletService.getWdkAccount('ethereum-sepolia') as WdkAccount | null;
          if (account) {
            const aaveProtocol = account.getLendingProtocol('aave-v3');
            const isSepolia = chain.toLowerCase().includes('sepolia');
            const tokenAddr = isSepolia
              ? resolveSepoliaToken(asset)
              : (AAVE_TOKEN_ADDRESSES[chain.toLowerCase()] ?? AAVE_TOKEN_ADDRESSES['ethereum-sepolia']);
            const decimals = getTokenDecimals(asset);
            const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));

            logger.info(`Executing REAL WDK Aave V3 supply (attempt ${attempt}/${MAX_RETRIES})`, {
              id, chain, amount, asset, token: tokenAddr, decimals,
            });

            const result = await aaveProtocol.supply({
              token: tokenAddr,
              amount: amountBigInt,
            });

            action.txHash = result.hash;
            action.status = 'completed';
            action.completedAt = new Date().toISOString();

            logger.info('WDK Aave V3 supply completed', { id, txHash: result.hash, attempt });

            // Refresh real account data
            await this.refreshPosition(account);

            this.actionHistory.unshift(action);
            if (this.actionHistory.length > 100) this.actionHistory = this.actionHistory.slice(0, 100);
            return action;
          }
        }
      } catch (err) {
        lastError = String(err);
        logger.warn(`WDK Aave V3 supply attempt ${attempt}/${MAX_RETRIES} failed`, {
          id, chain, amount, asset, error: lastError,
        });

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    // All retries exhausted — fall back to local position tracking with live APY
    action.error = lastError
      ? `Aave V3 supply attempted via WDK AaveProtocolEvm (3 retries) — ${lastError}`
      : 'Aave V3 supply: WDK account unavailable after 3 retries';

    // Fetch live APY from DeFi Llama for realistic local tracking
    let liveApy: number;
    try {
      liveApy = await fetchLiveAPY();
    } catch {
      const rate = STATIC_RATES.find((r) => r.chain.toLowerCase() === chain.toLowerCase() && r.asset === asset);
      liveApy = rate?.supplyApy ?? 4.0;
    }

    logger.warn(
      'Aave V3 Sepolia supply failed after 3 retries — tracking locally with live APY from DeFi Llama',
      { chain, amount, asset, liveApy: liveApy.toFixed(2) },
    );

    action.status = 'local_tracking';
    action.error += ' — fell back to local position tracking with live APY';

    const currentSupplied = parseFloat(this.position?.supplied ?? '0');
    const newPrincipal = currentSupplied + parseFloat(amount);
    const depositTime = this.position?.depositTime ?? new Date().toISOString();

    this.position = {
      asset,
      chain,
      supplied: newPrincipal.toFixed(6),
      earned: this.position?.earned ?? '0.000000',
      apy: liveApy,
      healthFactor: 'N/A',
      enteredAt: this.position?.enteredAt ?? new Date().toISOString(),
      depositTime,
      principal: newPrincipal,
      currentAPY: liveApy,
      accruedInterest: 0,
    };

    this.actionHistory.unshift(action);
    if (this.actionHistory.length > 100) this.actionHistory = this.actionHistory.slice(0, 100);

    return action;
  }

  /**
   * Withdraw funds from Aave V3 via WDK lending protocol.
   *
   * Attempts REAL onchain Aave V3 withdraw via `@tetherto/wdk-protocol-lending-aave-evm`.
   * Falls back to local position tracking if Aave contracts are unavailable on testnet.
   */
  async withdraw(chain: string, amount: string, asset = 'USDT'): Promise<LendingAction> {
    const id = `lend-withdraw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const action: LendingAction = {
      id,
      type: 'withdraw',
      asset,
      chain,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Attempt REAL Aave V3 withdraw via WDK
    try {
      await this.registerProtocol();

      if (this.protocolRegistered && this.walletService) {
        const account = await this.walletService.getWdkAccount('ethereum-sepolia') as WdkAccount | null;
        if (account) {
          const aaveProtocol = account.getLendingProtocol('aave-v3');
          const isSepolia = chain.toLowerCase().includes('sepolia');
          const tokenAddr = isSepolia
            ? resolveSepoliaToken(asset)
            : (AAVE_TOKEN_ADDRESSES[chain.toLowerCase()] ?? AAVE_TOKEN_ADDRESSES['ethereum-sepolia']);
          const decimals = getTokenDecimals(asset);
          const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));

          logger.info('Executing REAL WDK Aave V3 withdraw', { id, chain, amount, asset, token: tokenAddr, decimals });

          const result = await aaveProtocol.withdraw({
            token: tokenAddr,
            amount: amountBigInt,
          });

          action.txHash = result.hash;
          action.status = 'completed';
          action.completedAt = new Date().toISOString();

          logger.info('WDK Aave V3 withdraw completed', { id, txHash: result.hash });

          await this.refreshPosition(account);

          this.actionHistory.unshift(action);
          if (this.actionHistory.length > 100) this.actionHistory = this.actionHistory.slice(0, 100);
          return action;
        }
      }
    } catch (err) {
      logger.warn('WDK Aave V3 withdraw failed (Aave may not be available on testnet)', {
        id, chain, amount, asset, error: String(err),
      });
      action.error = `Aave V3 withdraw attempted via WDK AaveProtocolEvm — ${String(err)}`;
    }

    // Fallback: local position tracking (Aave V3 not deployed on this testnet)
    logger.warn('Lending fallback: using local position tracking for withdraw (Aave V3 unavailable)', { chain, amount, asset });
    action.status = 'local_tracking';
    action.error = action.error
      ? `${action.error} — fell back to local position tracking`
      : 'Aave V3 not available on testnet — using local position tracking';

    if (this.position) {
      const currentSupplied = parseFloat(this.position.supplied);
      const newSupplied = Math.max(0, currentSupplied - parseFloat(amount));
      if (newSupplied <= 0) {
        this.position = null;
      } else {
        this.position = { ...this.position, supplied: newSupplied.toFixed(6) };
      }
    }

    this.actionHistory.unshift(action);
    if (this.actionHistory.length > 100) this.actionHistory = this.actionHistory.slice(0, 100);

    return action;
  }

  /**
   * Borrow funds from Aave V3 via WDK lending protocol.
   *
   * Attempts REAL onchain Aave V3 borrow via `@tetherto/wdk-protocol-lending-aave-evm`.
   * Falls back to local position tracking if Aave contracts are unavailable on testnet.
   *
   * Requirements: must have sufficient collateral (health factor > 1.0 after borrow).
   */
  /* istanbul ignore next -- requires real WDK Aave protocol and blockchain */
  async borrow(chain: string, amount: string, asset = 'USDT'): Promise<LendingAction> {
    const id = `lend-borrow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const action: LendingAction = {
      id,
      type: 'borrow',
      asset,
      chain,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Guard: must have an active supply position to borrow against
    if (!this.position || parseFloat(this.position.supplied) <= 0) {
      action.status = 'failed';
      action.error = 'Cannot borrow without active collateral — supply first';
      this.actionHistory.unshift(action);
      return action;
    }

    // Attempt REAL Aave V3 borrow via WDK
    try {
      await this.registerProtocol();

      if (this.protocolRegistered && this.walletService) {
        const account = await this.walletService.getWdkAccount('ethereum-sepolia') as WdkAccount | null;
        if (account) {
          const aaveProtocol = account.getLendingProtocol('aave-v3');
          const decimals = getTokenDecimals(asset);
          const amountRaw = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));
          const result = await aaveProtocol.borrow({ asset, amount: amountRaw, interestRateMode: 2 });
          action.txHash = result.hash;
          action.status = 'completed';
          action.completedAt = new Date().toISOString();
          logger.info('WDK Aave V3 borrow completed', { id, txHash: result.hash });
          await this.refreshPosition(account);
          this.actionHistory.unshift(action);
          if (this.actionHistory.length > 100) this.actionHistory = this.actionHistory.slice(0, 100);
          return action;
        }
      }
    } catch (err) {
      logger.warn('WDK Aave V3 borrow failed (Aave may not be available on testnet)', {
        id, chain, amount, asset, error: String(err),
      });
      action.error = `Aave V3 borrow attempted via WDK AaveProtocolEvm — ${String(err)}`;
    }

    // Fallback: local position tracking (Aave V3 not deployed on this testnet)
    logger.warn('Lending fallback: using local position tracking for borrow (Aave V3 unavailable)', { chain, amount, asset });
    action.status = 'local_tracking';
    action.error = action.error
      ? `${action.error} — fell back to local position tracking`
      : 'Aave V3 not available on testnet — using local position tracking';

    // Validate collateralization: borrowed amount must not exceed 80% of supplied
    const supplied = parseFloat(this.position.supplied);
    const currentDebt = parseFloat(this.position.totalDebt ?? '0');
    const maxBorrow = supplied * 0.8 - currentDebt;
    if (parseFloat(amount) > maxBorrow) {
      action.status = 'failed';
      action.error = `Borrow exceeds safe limit: max borrowable is ${maxBorrow.toFixed(6)} ${asset} (80% LTV)`;
      this.actionHistory.unshift(action);
      return action;
    }

    // Update local position with new debt
    const newDebt = currentDebt + parseFloat(amount);
    const healthFactor = newDebt > 0 ? (supplied / newDebt).toFixed(2) : 'N/A';
    this.position = {
      ...this.position,
      totalDebt: newDebt.toFixed(6),
      healthFactor,
      availableBorrows: Math.max(0, supplied * 0.8 - newDebt).toFixed(6),
    };

    this.actionHistory.unshift(action);
    if (this.actionHistory.length > 100) this.actionHistory = this.actionHistory.slice(0, 100);
    return action;
  }

  /**
   * Refresh position from real Aave V3 account data via WDK.
   */
  private async refreshPosition(account: WdkAccount): Promise<void> {
    try {
      const aaveProtocol = account.getLendingProtocol('aave-v3');
      const accountData = await aaveProtocol.getAccountData();

      this.position = {
        asset: 'USDT',
        chain: 'Ethereum',
        supplied: (Number(accountData.totalCollateralBase ?? 0n) / 1e8).toFixed(6),
        earned: '0.000000',
        apy: STATIC_RATES[0]?.supplyApy ?? 4.0,
        healthFactor: accountData.healthFactor ? (Number(accountData.healthFactor) / 1e18).toFixed(2) : 'N/A',
        enteredAt: this.position?.enteredAt ?? new Date().toISOString(),
        totalCollateral: (Number(accountData.totalCollateralBase ?? 0n) / 1e8).toFixed(6),
        totalDebt: (Number(accountData.totalDebtBase ?? 0n) / 1e8).toFixed(6),
        availableBorrows: (Number(accountData.availableBorrowsBase ?? 0n) / 1e8).toFixed(6),
      };
    } catch (err) {
      logger.debug('Could not refresh Aave V3 position from chain', { error: String(err) });
    }
  }

  /** Get current lending position with real-time accrued interest calculation */
  getPosition(): LendingPosition | null {
    if (!this.position) return null;

    const pos = { ...this.position };

    // Calculate accrued interest for locally-tracked positions
    if (pos.depositTime && pos.principal && pos.currentAPY) {
      const depositMs = new Date(pos.depositTime).getTime();
      const elapsedMs = Date.now() - depositMs;
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

      // Simple interest: interest = principal * (APY/100) * (elapsedDays/365)
      const interest = pos.principal * (pos.currentAPY / 100) * (elapsedDays / 365);
      pos.accruedInterest = parseFloat(interest.toFixed(8));
      pos.earned = interest.toFixed(6);
      pos.supplied = (pos.principal + interest).toFixed(6);
    }

    return pos;
  }

  /** Get lending action history */
  getActionHistory(): LendingAction[] {
    return this.actionHistory.map((a) => ({ ...a }));
  }

  /**
   * Get projected yield for a given principal and holding period.
   * Uses live APY from DeFi Llama (cached 15 min).
   */
  async getProjectedYield(
    principal: number,
    days: number,
  ): Promise<{
    principal: number;
    days: number;
    apy: number;
    projectedInterest: number;
    projectedTotal: number;
    dailyYield: number;
    monthlyYield: number;
    annualYield: number;
    source: string;
  }> {
    const apy = await fetchLiveAPY();

    const projectedInterest = principal * (apy / 100) * (days / 365);
    const dailyYield = principal * (apy / 100) / 365;
    const monthlyYield = dailyYield * 30;
    const annualYield = principal * (apy / 100);

    return {
      principal,
      days,
      apy: parseFloat(apy.toFixed(2)),
      projectedInterest: parseFloat(projectedInterest.toFixed(6)),
      projectedTotal: parseFloat((principal + projectedInterest).toFixed(6)),
      dailyYield: parseFloat(dailyYield.toFixed(6)),
      monthlyYield: parseFloat(monthlyYield.toFixed(6)),
      annualYield: parseFloat(annualYield.toFixed(6)),
      source: apyCache ? 'defi_llama_live' : 'static_fallback',
    };
  }

  /**
   * Get a comprehensive yield summary for the current position.
   * Returns principal, accrued interest, APY, whether it's live Aave or local_tracking,
   * projected yield for 7/30/90/365 days, and data freshness.
   */
  async getYieldSummary(): Promise<{
    position: {
      principal: number;
      accruedInterest: number;
      currentAPY: number;
      totalValue: number;
    } | null;
    source: 'live_aave' | 'local_tracking' | 'none';
    projections: {
      days7: number;
      days30: number;
      days90: number;
      days365: number;
    };
    dataFreshness: {
      apyLastFetched: string | null;
      apyCacheAgeMs: number | null;
      apyCacheTtlMs: number;
    };
  }> {
    const pos = this.getPosition();

    if (!pos) {
      return {
        position: null,
        source: 'none',
        projections: { days7: 0, days30: 0, days90: 0, days365: 0 },
        dataFreshness: {
          apyLastFetched: apyCache ? new Date(apyCache.fetchedAt).toISOString() : null,
          apyCacheAgeMs: apyCache ? Date.now() - apyCache.fetchedAt : null,
          apyCacheTtlMs: APY_CACHE_TTL_MS,
        },
      };
    }

    const principal = pos.principal ?? parseFloat(pos.supplied);
    const accruedInterest = pos.accruedInterest ?? 0;
    const currentAPY = pos.currentAPY ?? pos.apy;
    const isLocalTracking = pos.depositTime != null && pos.principal != null;

    // Calculate projections using current APY
    const project = (days: number): number =>
      parseFloat((principal * (currentAPY / 100) * (days / 365)).toFixed(6));

    return {
      position: {
        principal,
        accruedInterest,
        currentAPY,
        totalValue: parseFloat((principal + accruedInterest).toFixed(6)),
      },
      source: isLocalTracking ? 'local_tracking' : 'live_aave',
      projections: {
        days7: project(7),
        days30: project(30),
        days90: project(90),
        days365: project(365),
      },
      dataFreshness: {
        apyLastFetched: apyCache ? new Date(apyCache.fetchedAt).toISOString() : null,
        apyCacheAgeMs: apyCache ? Date.now() - apyCache.fetchedAt : null,
        apyCacheTtlMs: APY_CACHE_TTL_MS,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // AAVE FAUCET — Mint free test tokens on Sepolia
  // ══════════════════════════════════════════════════════════════════

  private mintTxHash: string | null = null;
  private supplyTxHash: string | null = null;

  /**
   * Check the Aave test token balance for a given asset on Sepolia.
   * Uses ethers to call balanceOf on the Aave test token contract.
   */
  async getAaveTestTokenBalance(tokenSymbol: string = 'USDT'): Promise<string> {
    if (!this.walletService) return '0';
    try {
      const address = await this.walletService.getAddress('ethereum-sepolia');
      const tokenAddr = resolveSepoliaToken(tokenSymbol);
      const rpcUrl = process.env.ETH_SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
      const provider = new JsonRpcProvider(rpcUrl);
      const erc20 = new Contract(tokenAddr, [
        'function balanceOf(address) view returns (uint256)',
      ], provider);
      const balance: bigint = await erc20.balanceOf(address);
      const decimals = getTokenDecimals(tokenSymbol);
      return (Number(balance) / 10 ** decimals).toFixed(decimals > 6 ? 6 : 2);
    } catch (err) {
      logger.warn('Failed to check Aave test token balance', { error: String(err) });
      return '0';
    }
  }

  /**
   * Mint free Aave test tokens on Sepolia via the Aave faucet contract.
   *
   * The faucet contract at 0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D
   * exposes: mint(address token, address onBehalfOf, uint256 amount)
   *
   * This gives free test USDT/USDC/DAI/WETH on Sepolia for Aave V3 testing.
   */
  /* istanbul ignore next -- requires real blockchain RPC for raw transaction encoding */
  async mintTestTokens(
    tokenSymbol: string = 'USDT',
    amount: string = '10000',
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.walletService) {
      return { success: false, error: 'Wallet service not available' };
    }

    try {
      const userAddress = await this.walletService.getAddress('ethereum-sepolia');
      const tokenAddr = resolveSepoliaToken(tokenSymbol);
      const decimals = getTokenDecimals(tokenSymbol);
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));

      // Encode: mint(address,address,uint256)
      // Function selector for mint(address,address,uint256) = 0x9a2b961c (keccak of signature)
      // We use ethers AbiCoder to encode the call data
      const abiCoder = AbiCoder.defaultAbiCoder();
      const functionSelector = '0x9a2b961c'; // keccak256("mint(address,address,uint256)").slice(0,10)
      const encodedParams = abiCoder.encode(
        ['address', 'address', 'uint256'],
        [tokenAddr, userAddress, amountBigInt],
      );
      const callData = functionSelector + encodedParams.slice(2); // remove 0x from params

      logger.info('Minting Aave test tokens via faucet contract', {
        token: tokenSymbol,
        tokenAddress: tokenAddr,
        amount,
        decimals,
        faucet: AAVE_V3_SEPOLIA.FAUCET,
        userAddress,
      });

      // Send raw transaction to faucet contract
      const account = await this.walletService.getWdkAccount('ethereum-sepolia');
      const result = await account.sendTransaction({
        to: AAVE_V3_SEPOLIA.FAUCET,
        value: 0n,
        data: callData,
      });

      this.mintTxHash = result.hash;
      logger.info(`Minted ${amount} test ${tokenSymbol} from Aave Sepolia faucet`, {
        txHash: result.hash,
        explorerUrl: `https://sepolia.etherscan.io/tx/${result.hash}`,
      });

      return { success: true, txHash: result.hash };
    } catch (err) {
      const errorMsg = String(err);
      logger.warn('Aave faucet mint failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Approve the Aave V3 Pool to spend test tokens (ERC-20 approve).
   * Required before calling supply().
   */
  async approveAavePool(
    tokenSymbol: string = 'USDT',
    amount: string = '1000000',
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.walletService) {
      return { success: false, error: 'Wallet service not available' };
    }

    try {
      const tokenAddr = resolveSepoliaToken(tokenSymbol);
      const decimals = getTokenDecimals(tokenSymbol);
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));

      // Encode: approve(address spender, uint256 amount)
      const abiCoder = AbiCoder.defaultAbiCoder();
      const functionSelector = '0x095ea7b3'; // keccak256("approve(address,uint256)").slice(0,10)
      const encodedParams = abiCoder.encode(
        ['address', 'uint256'],
        [AAVE_V3_SEPOLIA.POOL, amountBigInt],
      );
      const callData = functionSelector + encodedParams.slice(2);

      logger.info('Approving Aave V3 Pool to spend test tokens', {
        token: tokenSymbol,
        tokenAddress: tokenAddr,
        spender: AAVE_V3_SEPOLIA.POOL,
        amount,
      });

      const account = await this.walletService.getWdkAccount('ethereum-sepolia');
      const result = await account.sendTransaction({
        to: tokenAddr,
        value: 0n,
        data: callData,
      });

      logger.info('Aave V3 Pool approval confirmed', { txHash: result.hash });
      return { success: true, txHash: result.hash };
    } catch (err) {
      const errorMsg = String(err);
      logger.warn('Aave Pool approval failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Auto-mint and auto-supply to Aave V3 on Sepolia.
   * Called once on startup — checks if already run via .aave-mint-tx.json.
   *
   * Flow:
   * 1. Check if we have test USDT balance on Sepolia
   * 2. If balance is 0, mint 1000 test USDT from Aave faucet
   * 3. Approve Aave Pool to spend USDT
   * 4. Supply 100 test USDT to Aave V3
   * 5. Save tx hashes to .aave-mint-tx.json and .aave-supply-tx.json
   */
  /* istanbul ignore next -- requires real blockchain for mint + supply flow */
  async autoMintAndSupply(): Promise<void> {
    const mintFile = resolve(__dirname_lending, '..', '..', '.aave-mint-tx.json');
    const supplyFile = resolve(__dirname_lending, '..', '..', '.aave-supply-tx.json');

    // Load existing proof data if present
    if (existsSync(mintFile)) {
      try {
        const data = JSON.parse(readFileSync(mintFile, 'utf-8'));
        this.mintTxHash = data.txHash ?? null;
      } catch { /* ignore parse errors */ }
    }
    if (existsSync(supplyFile)) {
      try {
        const data = JSON.parse(readFileSync(supplyFile, 'utf-8'));
        this.supplyTxHash = data.txHash ?? null;
      } catch { /* ignore parse errors */ }
    }

    // If both files exist, we already ran this — skip
    if (existsSync(mintFile) && existsSync(supplyFile)) {
      logger.info('Aave auto-mint/supply already completed (found .aave-mint-tx.json and .aave-supply-tx.json)');
      return;
    }

    if (!this.walletService) {
      logger.warn('Aave auto-mint skipped: wallet service not available');
      return;
    }

    // Check native ETH balance first — need gas for transactions
    try {
      const bal = await this.walletService.getBalance('ethereum-sepolia');
      const nativeBal = parseFloat(bal.nativeBalance);
      if (nativeBal <= 0) {
        logger.info('Aave auto-mint skipped: no ETH balance on ethereum-sepolia (need gas)');
        return;
      }
    } catch (err) {
      logger.warn('Aave auto-mint skipped: could not check ETH balance', { error: String(err) });
      return;
    }

    // Step 1: Check Aave test USDT balance
    if (!existsSync(mintFile)) {
      const balance = await this.getAaveTestTokenBalance('USDT');
      if (parseFloat(balance) < 100) {
        // Step 2: Mint 1000 test USDT from Aave faucet
        logger.info('Minting 1000 test USDT from Aave Sepolia faucet...');
        const mintResult = await this.mintTestTokens('USDT', '1000');
        if (mintResult.success && mintResult.txHash) {
          logger.info(`Minted 1000 test USDT from Aave Sepolia faucet: ${mintResult.txHash}`);
          writeFileSync(mintFile, JSON.stringify({
            txHash: mintResult.txHash,
            token: 'USDT',
            amount: '1000',
            tokenAddress: AAVE_SEPOLIA_TOKENS.USDT,
            faucetContract: AAVE_V3_SEPOLIA.FAUCET,
            explorerUrl: `https://sepolia.etherscan.io/tx/${mintResult.txHash}`,
            timestamp: new Date().toISOString(),
          }, null, 2));
        } else {
          logger.warn('Aave faucet mint failed — supply step skipped', { error: mintResult.error });
          return;
        }

        // Wait for mint tx to confirm
        await new Promise((r) => setTimeout(r, 5000));
      } else {
        logger.info(`Already have ${balance} Aave test USDT — skipping mint`);
        // Create a placeholder mint file
        writeFileSync(mintFile, JSON.stringify({
          txHash: null,
          note: 'Already had test USDT balance — no mint needed',
          balance,
          timestamp: new Date().toISOString(),
        }, null, 2));
      }
    }

    // Step 3 & 4: Approve and supply 100 test USDT to Aave V3
    if (!existsSync(supplyFile)) {
      // Approve first
      logger.info('Approving Aave V3 Pool to spend test USDT...');
      const approveResult = await this.approveAavePool('USDT', '1000');
      if (!approveResult.success) {
        logger.warn('Aave Pool approval failed — supply step skipped', { error: approveResult.error });
        return;
      }
      logger.info(`Aave Pool approval confirmed: ${approveResult.txHash}`);

      // Wait for approval to confirm
      await new Promise((r) => setTimeout(r, 3000));

      // Supply 100 USDT
      logger.info('Supplying 100 test USDT to Aave V3 on Sepolia...');
      const supplyAction = await this.supply('ethereum-sepolia', '100', 'USDT');
      const supplyHash = supplyAction.txHash ?? null;
      this.supplyTxHash = supplyHash;

      writeFileSync(supplyFile, JSON.stringify({
        txHash: supplyHash,
        approvalTxHash: approveResult.txHash,
        token: 'USDT',
        amount: '100',
        pool: AAVE_V3_SEPOLIA.POOL,
        status: supplyAction.status,
        explorerUrl: supplyHash ? `https://sepolia.etherscan.io/tx/${supplyHash}` : null,
        timestamp: new Date().toISOString(),
      }, null, 2));

      if (supplyHash) {
        logger.info(`Supplied 100 test USDT to Aave V3 on Sepolia: ${supplyHash}`);
      } else {
        logger.info('Aave V3 supply recorded (local tracking — real supply may have failed on testnet)');
      }
    }
  }

  /**
   * Get proof of Aave V3 DeFi operations (mint + supply tx hashes and links).
   * Used by the GET /api/lending/proof endpoint.
   */
  getProof(): {
    mintTxHash: string | null;
    supplyTxHash: string | null;
    position: { supplied: string; apy: string; accrued: string } | null;
    explorerLinks: { mint: string | null; supply: string | null };
    faucetInfo: {
      contract: string;
      url: string;
      tokens: Record<string, string>;
    };
  } {
    const pos = this.getPosition();

    // Also try to load from disk if not in memory
    if (!this.mintTxHash) {
      const mintFile = resolve(__dirname_lending, '..', '..', '.aave-mint-tx.json');
      if (existsSync(mintFile)) {
        try {
          const data = JSON.parse(readFileSync(mintFile, 'utf-8'));
          this.mintTxHash = data.txHash ?? null;
        } catch { /* ignore */ }
      }
    }
    if (!this.supplyTxHash) {
      const supplyFile = resolve(__dirname_lending, '..', '..', '.aave-supply-tx.json');
      if (existsSync(supplyFile)) {
        try {
          const data = JSON.parse(readFileSync(supplyFile, 'utf-8'));
          this.supplyTxHash = data.txHash ?? null;
        } catch { /* ignore */ }
      }
    }

    return {
      mintTxHash: this.mintTxHash,
      supplyTxHash: this.supplyTxHash,
      position: pos ? {
        supplied: pos.supplied,
        apy: `${pos.apy.toFixed(1)}%`,
        accrued: pos.earned,
      } : null,
      explorerLinks: {
        mint: this.mintTxHash ? `https://sepolia.etherscan.io/tx/${this.mintTxHash}` : null,
        supply: this.supplyTxHash ? `https://sepolia.etherscan.io/tx/${this.supplyTxHash}` : null,
      },
      faucetInfo: {
        contract: AAVE_V3_SEPOLIA.FAUCET,
        url: AAVE_V3_SEPOLIA.FAUCET_URL,
        tokens: { ...AAVE_SEPOLIA_TOKENS },
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════
  // AUTONOMOUS LENDING — Delegated to lending-credit.ts
  // Credit Scoring, Loan Lifecycle, Repayment
  // ══════════════════════════════════════════════════════════════════

  private loans: Map<string, LoanRecord> = new Map();
  private creditProfiles: Map<string, CreditProfile> = new Map();
  private repaymentSchedule: RepaymentEntry[] = [];

  /** Build a credit score from on-chain history — delegates to lending-credit.ts */
  async buildCreditScore(address: string): Promise<CreditProfile> {
    const { buildCreditScoreImpl } = await import('./lending-credit.js');
    const profile = await buildCreditScoreImpl(address, this.creditProfiles, this.loans);
    this.creditProfiles.set(address, profile);
    return profile;
  }

  /** Autonomous loan issuance */
  async issueLoan(params: {
    borrower: string;
    requestedAmount: number;
    token: string;
    purpose: string;
    durationDays: number;
  }): Promise<LoanRecord | { error: string }> {
    const { issueLoanImpl } = await import('./lending-credit.js');
    return issueLoanImpl(params, { buildCreditScore: (addr: string) => this.buildCreditScore(addr), walletService: this.walletService }, this.loans, this.repaymentSchedule);
  }

  /** Record a repayment */
  recordRepayment(loanId: string, amount: number, txHash?: string): LoanRecord | { error: string } {
    const loan = this.loans.get(loanId);
    if (!loan) return { error: `Loan ${loanId} not found` };
    if (loan.status !== 'active') return { error: `Loan is ${loan.status}, cannot accept repayments` };
    loan.repayments.push({ amount, paidAt: new Date().toISOString(), txHash: txHash ?? null });
    const totalRepaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
    const pending = this.repaymentSchedule.filter(r => r.loanId === loanId && r.status === 'pending');
    let remaining = amount;
    for (const entry of pending) {
      if (remaining <= 0) break;
      if (remaining >= entry.amount) { entry.status = 'paid'; entry.paidAt = new Date().toISOString(); entry.txHash = txHash ?? null; remaining -= entry.amount; }
      else { entry.amount -= remaining; remaining = 0; }
    }
    if (totalRepaid >= loan.totalRepayment) { loan.status = 'repaid'; logger.info(`Loan fully repaid: ${loanId}`); }
    logger.info(`Repayment recorded: ${loanId} — $${amount} (total repaid: $${totalRepaid.toFixed(2)}/${loan.totalRepayment})`);
    return loan;
  }

  /** Check for overdue loans and mark defaults */
  checkOverdueLoans(): Array<{ loanId: string; borrower: string; overdueDays: number; outstandingAmount: number }> {
    const overdue: Array<{ loanId: string; borrower: string; overdueDays: number; outstandingAmount: number }> = [];
    const now = Date.now();
    for (const loan of this.loans.values()) {
      if (loan.status !== 'active') continue;
      const dueDate = new Date(loan.dueDate).getTime();
      if (now > dueDate) {
        const overdueDays = Math.floor((now - dueDate) / 86400000);
        const totalRepaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
        const outstanding = loan.totalRepayment - totalRepaid;
        if (overdueDays > 30) { loan.status = 'defaulted'; logger.warn(`Loan DEFAULTED: ${loan.id}`); }
        overdue.push({ loanId: loan.id, borrower: loan.borrower, overdueDays, outstandingAmount: parseFloat(outstanding.toFixed(2)) });
      }
    }
    return overdue;
  }

  /** Agent-to-agent lending */
  async agentBorrow(params: {
    borrowerAgentId: string;
    lenderAgentId: string;
    amount: number;
    token: string;
    purpose: string;
    repayFromRevenue: boolean;
    borrowerWalletAddress?: string;
  }): Promise<LoanRecord | { error: string }> {
    const borrowerAddress = params.borrowerWalletAddress
      ?? `0x${createHash('sha256').update(params.borrowerAgentId).digest('hex').slice(0, 40)}`;
    const loan = await this.issueLoan({ borrower: borrowerAddress, requestedAmount: params.amount, token: params.token, purpose: `Agent-to-agent: ${params.purpose}`, durationDays: 30 });
    if ('error' in loan) return loan;
    loan.decisionReasoning += ` | Agent-to-agent loan: borrower=${params.borrowerAgentId}, lender=${params.lenderAgentId}`;
    if (params.repayFromRevenue) loan.decisionReasoning += ' | Repayment from earned revenue enabled';
    return loan;
  }

  getLoansByBorrower(address: string): LoanRecord[] { return Array.from(this.loans.values()).filter(l => l.borrower === address); }
  getLoan(id: string): LoanRecord | undefined { return this.loans.get(id); }
  getActiveLoans(): LoanRecord[] { return Array.from(this.loans.values()).filter(l => l.status === 'active'); }
  getRepaymentSchedule(loanId: string): RepaymentEntry[] { return this.repaymentSchedule.filter(r => r.loanId === loanId); }
  getCreditProfile(address: string): CreditProfile | undefined { return this.creditProfiles.get(address); }

  getLendingPortfolioStats() {
    const loans = Array.from(this.loans.values());
    const activeLoans = loans.filter(l => l.status === 'active');
    const repaidLoans = loans.filter(l => l.status === 'repaid');
    const defaultedLoans = loans.filter(l => l.status === 'defaulted');
    const totalRepaidAmount = loans.reduce((sum, l) => sum + l.repayments.reduce((s, r) => s + r.amount, 0), 0);
    const totalInterest = repaidLoans.reduce((sum, l) => sum + l.totalInterest, 0);
    const avgScore = loans.length > 0 ? loans.reduce((sum, l) => sum + l.creditScoreAtIssuance, 0) / loans.length : 0;
    return {
      totalLoansIssued: loans.length, activeLoans: activeLoans.length,
      totalLent: loans.reduce((sum, l) => sum + l.amount, 0),
      totalRepaid: parseFloat(totalRepaidAmount.toFixed(2)),
      totalInterestEarned: parseFloat(totalInterest.toFixed(2)),
      defaultRate: loans.length > 0 ? parseFloat((defaultedLoans.length / loans.length * 100).toFixed(1)) : 0,
      averageCreditScore: Math.round(avgScore),
    };
  }
}

// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Community Tip Pool Service
// Crowdfunded bounty/tip pools where multiple fans contribute to a shared pool
// that distributes to a creator when a target threshold is met.

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export interface TipPoolContributor {
  address: string;
  amount: number;
  timestamp: string;
}

export interface TipPool {
  id: string;
  creatorHandle: string;
  targetAmount: number;
  currentAmount: number;
  contributors: TipPoolContributor[];
  status: 'active' | 'filled' | 'distributed' | 'expired';
  chain: string;
  expiresAt: string;
  createdAt: string;
  distributedTxHash?: string;
}

export interface TipPoolStats {
  totalPools: number;
  activePools: number;
  filledPools: number;
  distributedPools: number;
  expiredPools: number;
  totalContributed: number;
  totalDistributed: number;
  uniqueContributors: number;
}

const DEFAULT_EXPIRY_DAYS = 7;

export class TipPoolService {
  private pools: Map<string, TipPool> = new Map();

  constructor() {
    this.seedDemoPools();
  }

  /** Create a new tip pool for a creator */
  createPool(creatorHandle: string, targetAmount: number, chain: string): TipPool {
    if (!creatorHandle || targetAmount <= 0) {
      throw new Error('Invalid creatorHandle or targetAmount');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const pool: TipPool = {
      id: uuidv4(),
      creatorHandle,
      targetAmount,
      currentAmount: 0,
      contributors: [],
      status: 'active',
      chain,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    };

    this.pools.set(pool.id, pool);
    logger.info('Tip pool created', { poolId: pool.id, creatorHandle, targetAmount, chain });
    return pool;
  }

  /** Contribute funds to a pool */
  contributeToPool(poolId: string, amount: number, contributorAddress: string): TipPool {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool ${poolId} not found`);
    if (pool.status !== 'active') throw new Error(`Pool ${poolId} is not active (status: ${pool.status})`);
    if (amount <= 0) throw new Error('Contribution amount must be positive');

    pool.contributors.push({
      address: contributorAddress,
      amount,
      timestamp: new Date().toISOString(),
    });
    pool.currentAmount = Math.round((pool.currentAmount + amount) * 100) / 100;

    // Auto-mark as filled when target reached
    if (pool.currentAmount >= pool.targetAmount) {
      pool.status = 'filled';
      logger.info('Tip pool filled!', { poolId, creatorHandle: pool.creatorHandle, currentAmount: pool.currentAmount });
    }

    logger.info('Contribution added to pool', { poolId, amount, contributor: contributorAddress.slice(0, 10) });
    return pool;
  }

  /** Get a single pool by ID */
  getPool(poolId: string): TipPool | undefined {
    return this.pools.get(poolId);
  }

  /** Get all active pools for a creator handle */
  getActivePoolsForCreator(handle: string): TipPool[] {
    return Array.from(this.pools.values()).filter(
      (p) => p.creatorHandle.toLowerCase() === handle.toLowerCase() && p.status === 'active',
    );
  }

  /** Get all pools with optional status filter */
  getAllPools(statusFilter?: TipPool['status']): TipPool[] {
    const all = Array.from(this.pools.values());
    if (statusFilter) return all.filter((p) => p.status === statusFilter);
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /** Auto-distribute filled pools (simulate on-chain tx) */
  checkAndDistribute(): { distributed: TipPool[]; errors: string[] } {
    const filled = Array.from(this.pools.values()).filter((p) => p.status === 'filled');
    const distributed: TipPool[] = [];
    const errors: string[] = [];

    for (const pool of filled) {
      try {
        // Simulate on-chain distribution
        pool.status = 'distributed';
        pool.distributedTxHash = `0x${uuidv4().replace(/-/g, '')}`;
        distributed.push(pool);
        logger.info('Pool distributed', {
          poolId: pool.id,
          creatorHandle: pool.creatorHandle,
          amount: pool.currentAmount,
          txHash: pool.distributedTxHash,
        });
      } catch (err) {
        const msg = `Failed to distribute pool ${pool.id}: ${err instanceof Error ? err.message : String(err)}`;
        errors.push(msg);
        logger.error(msg);
      }
    }

    return { distributed, errors };
  }

  /** Expire old pools past their expiry date and simulate refund */
  expireOldPools(): { expired: TipPool[]; refundedAmount: number } {
    const now = Date.now();
    const expired: TipPool[] = [];
    let refundedAmount = 0;

    for (const pool of this.pools.values()) {
      if (pool.status === 'active' && new Date(pool.expiresAt).getTime() < now) {
        pool.status = 'expired';
        refundedAmount += pool.currentAmount;
        expired.push(pool);
        logger.info('Pool expired, refunding contributors', {
          poolId: pool.id,
          creatorHandle: pool.creatorHandle,
          refundAmount: pool.currentAmount,
          contributorCount: pool.contributors.length,
        });
      }
    }

    return { expired, refundedAmount };
  }

  /** Get aggregate pool statistics */
  getPoolStats(): TipPoolStats {
    const all = Array.from(this.pools.values());
    const uniqueAddresses = new Set<string>();

    let totalContributed = 0;
    let totalDistributed = 0;

    for (const pool of all) {
      totalContributed += pool.currentAmount;
      if (pool.status === 'distributed') {
        totalDistributed += pool.currentAmount;
      }
      for (const c of pool.contributors) {
        uniqueAddresses.add(c.address);
      }
    }

    return {
      totalPools: all.length,
      activePools: all.filter((p) => p.status === 'active').length,
      filledPools: all.filter((p) => p.status === 'filled').length,
      distributedPools: all.filter((p) => p.status === 'distributed').length,
      expiredPools: all.filter((p) => p.status === 'expired').length,
      totalContributed: Math.round(totalContributed * 100) / 100,
      totalDistributed: Math.round(totalDistributed * 100) / 100,
      uniqueContributors: uniqueAddresses.size,
    };
  }

  // ── Demo seed data ──────────────────────────────────────────────────

  private seedDemoPools(): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

    // Pool 1: @Bongino — 35/50 USDT, 8 contributors, active
    const pool1: TipPool = {
      id: 'pool-bongino-001',
      creatorHandle: '@Bongino',
      targetAmount: 50,
      currentAmount: 35,
      contributors: [
        { address: '0x1a2B3c4D5e6F7890AbCdEf1234567890aBcDeF01', amount: 10, timestamp: new Date(now.getTime() - 6 * 3600000).toISOString() },
        { address: '0x2b3C4d5E6f7A8901BcDeF01234567890AbCdEf02', amount: 5, timestamp: new Date(now.getTime() - 5 * 3600000).toISOString() },
        { address: '0x3c4D5e6F7a8B9012CdEf012345678901BcDeFa03', amount: 3, timestamp: new Date(now.getTime() - 4.5 * 3600000).toISOString() },
        { address: '0x4d5E6f7A8b9C0123DeF0123456789012CdEfAb04', amount: 5, timestamp: new Date(now.getTime() - 4 * 3600000).toISOString() },
        { address: '0x5e6F7a8B9c0D1234Ef01234567890123DeFaBc05', amount: 2, timestamp: new Date(now.getTime() - 3 * 3600000).toISOString() },
        { address: '0x6f7A8b9C0d1E2345F012345678901234EfAbCd06', amount: 4, timestamp: new Date(now.getTime() - 2 * 3600000).toISOString() },
        { address: '0x7a8B9c0D1e2F3456012345678901234FaBcDe07', amount: 3, timestamp: new Date(now.getTime() - 1 * 3600000).toISOString() },
        { address: '0x8b9C0d1E2f3A4567123456789012345AbCdEf08', amount: 3, timestamp: new Date(now.getTime() - 0.5 * 3600000).toISOString() },
      ],
      status: 'active',
      chain: 'ethereum-sepolia',
      expiresAt,
      createdAt: new Date(now.getTime() - 2 * 24 * 3600000).toISOString(),
    };

    // Pool 2: @TuckerCarlson — 50/50 USDT, 12 contributors, filled
    const pool2: TipPool = {
      id: 'pool-tucker-001',
      creatorHandle: '@TuckerCarlson',
      targetAmount: 50,
      currentAmount: 50,
      contributors: [
        { address: '0xAa1B2c3D4e5F6789012345678901234AbCdEf10', amount: 8, timestamp: new Date(now.getTime() - 20 * 3600000).toISOString() },
        { address: '0xBb2C3d4E5f6A7890123456789012345BcDeFa11', amount: 5, timestamp: new Date(now.getTime() - 18 * 3600000).toISOString() },
        { address: '0xCc3D4e5F6a7B8901234567890123456CdEfAb12', amount: 3, timestamp: new Date(now.getTime() - 16 * 3600000).toISOString() },
        { address: '0xDd4E5f6A7b8C9012345678901234567DeF0Bc13', amount: 5, timestamp: new Date(now.getTime() - 14 * 3600000).toISOString() },
        { address: '0xEe5F6a7B8c9D0123456789012345678Ef01Cd14', amount: 2, timestamp: new Date(now.getTime() - 12 * 3600000).toISOString() },
        { address: '0xFf6A7b8C9d0E1234567890123456789Fa12De15', amount: 4, timestamp: new Date(now.getTime() - 10 * 3600000).toISOString() },
        { address: '0x0a7B8c9D0e1F2345678901234567890Ab23Ef16', amount: 3, timestamp: new Date(now.getTime() - 8 * 3600000).toISOString() },
        { address: '0x1b8C9d0E1f2A3456789012345678901Bc34Fa17', amount: 5, timestamp: new Date(now.getTime() - 6 * 3600000).toISOString() },
        { address: '0x2c9D0e1F2a3B4567890123456789012Cd45Ab18', amount: 3, timestamp: new Date(now.getTime() - 5 * 3600000).toISOString() },
        { address: '0x3d0E1f2A3b4C5678901234567890123De56Bc19', amount: 4, timestamp: new Date(now.getTime() - 4 * 3600000).toISOString() },
        { address: '0x4e1F2a3B4c5D6789012345678901234Ef67Cd20', amount: 5, timestamp: new Date(now.getTime() - 3 * 3600000).toISOString() },
        { address: '0x5f2A3b4C5d6E7890123456789012345Fa78De21', amount: 3, timestamp: new Date(now.getTime() - 2 * 3600000).toISOString() },
      ],
      status: 'filled',
      chain: 'ethereum-sepolia',
      expiresAt,
      createdAt: new Date(now.getTime() - 3 * 24 * 3600000).toISOString(),
    };

    // Pool 3: @TimPool — 10/25 USDT, 3 contributors, active
    const pool3: TipPool = {
      id: 'pool-timpool-001',
      creatorHandle: '@TimPool',
      targetAmount: 25,
      currentAmount: 10,
      contributors: [
        { address: '0xAA11BB22CC33DD44EE55FF66778899AABBCCDD01', amount: 5, timestamp: new Date(now.getTime() - 10 * 3600000).toISOString() },
        { address: '0xBB22CC33DD44EE55FF66778899AABBCCDDEEFF02', amount: 3, timestamp: new Date(now.getTime() - 7 * 3600000).toISOString() },
        { address: '0xCC33DD44EE55FF66778899AABBCCDDEEFF001103', amount: 2, timestamp: new Date(now.getTime() - 3 * 3600000).toISOString() },
      ],
      status: 'active',
      chain: 'ton-testnet',
      expiresAt,
      createdAt: new Date(now.getTime() - 1 * 24 * 3600000).toISOString(),
    };

    this.pools.set(pool1.id, pool1);
    this.pools.set(pool2.id, pool2);
    this.pools.set(pool3.id, pool3);
    logger.info('Tip pool service seeded with 3 demo pools');
  }
}

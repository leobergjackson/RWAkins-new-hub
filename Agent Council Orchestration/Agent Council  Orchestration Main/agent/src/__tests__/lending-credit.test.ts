/**
 * Tests for lending-credit.ts — buildCreditScoreImpl, issueLoanImpl.
 * Uses mocked fetch for RPC calls.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildCreditScoreImpl, issueLoanImpl } from '../services/lending-credit.js';
import type { CreditProfile, LoanRecord, RepaymentEntry } from '../services/lending.service.js';

// Mock fetch globally so RPC calls don't hit the network
const originalFetch = global.fetch;

before(() => {
  (global as any).fetch = async (url: string, opts?: any) => {
    // CoinGecko price
    if (typeof url === 'string' && url.includes('coingecko')) {
      return {
        ok: true,
        json: async () => ({ ethereum: { usd: 3000 }, 'matic-network': { usd: 0.5 }, binancecoin: { usd: 600 } }),
      };
    }
    // RPC batch call for credit score
    const body = opts?.body ? JSON.parse(opts.body) : null;
    if (Array.isArray(body)) {
      return {
        ok: true,
        json: async () => [
          { result: '0x64' },   // txCount = 100
          { result: '0xDE0B6B3A7640000' }, // 1 ETH balance
          { result: '0x' },     // not a contract
        ],
      };
    }
    // ENS reverse lookup
    return { ok: true, json: async () => ({ result: '0x' }) };
  };
});

after(() => {
  global.fetch = originalFetch;
});

describe('buildCreditScoreImpl', () => {
  it('returns a credit profile with score', async () => {
    const profiles = new Map<string, CreditProfile>();
    const loans = new Map<string, LoanRecord>();
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    const result = await buildCreditScoreImpl(addr, profiles, loans);
    assert.ok(result.creditScore >= 0);
    assert.ok(result.creditScore <= 1000);
    assert.equal(result.address, addr);
    assert.ok(['excellent', 'good', 'fair', 'poor', 'very_poor'].includes(result.creditTier));
  });

  it('uses cached profile within 1 hour', async () => {
    const profiles = new Map<string, CreditProfile>();
    const loans = new Map<string, LoanRecord>();
    const addr = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const first = await buildCreditScoreImpl(addr, profiles, loans);
    profiles.set(addr, first);
    const second = await buildCreditScoreImpl(addr, profiles, loans);
    assert.equal(first.creditScore, second.creditScore);
  });

  it('poor tier for address with defaulted loans', async () => {
    const profiles = new Map<string, CreditProfile>();
    const loans = new Map<string, LoanRecord>();
    const addr = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    loans.set('loan1', {
      id: 'loan1', borrower: addr, amount: 100, token: 'USDT',
      interestRate: 0.1, totalRepayment: 110, totalInterest: 10,
      purpose: 'test', creditScoreAtIssuance: 500, creditTier: 'fair',
      status: 'defaulted', issuedAt: new Date().toISOString(),
      dueDate: new Date().toISOString(), installments: 1,
      installmentAmount: 110, installmentIntervalDays: 30,
      repayments: [], collateral: null, decisionReasoning: 'test',
      borrowerEns: null,
    } as unknown as LoanRecord);
    const result = await buildCreditScoreImpl(addr, profiles, loans);
    // Defaulted loans should lower the score
    assert.ok(result.creditScore < 800);
  });
});

describe('issueLoanImpl', () => {
  it('issues a loan for fair-credit borrower', async () => {
    const loans = new Map<string, LoanRecord>();
    const schedule: RepaymentEntry[] = [];
    const service = {
      async buildCreditScore(_addr: string): Promise<CreditProfile> {
        return {
          address: _addr, ensName: null, creditScore: 550, creditTier: 'fair' as const,
          totalTxCount: 50, totalBalanceUsd: 500, chainActivity: {},
          activeChains: 1, isContract: false, pastLoans: 0,
          repaidLoans: 0, defaultedLoans: 0, lastUpdated: new Date().toISOString(),
          factors: { transactionHistory: 0, balanceStrength: 0, multiChainPresence: 0, identityVerification: 0, repaymentHistory: 0 },
        };
      },
      walletService: null,
    };
    const result = await issueLoanImpl(
      { borrower: '0xabc', requestedAmount: 500, token: 'USDT', purpose: 'test', durationDays: 30 },
      service, loans, schedule,
    );
    assert.ok(!('error' in result));
    const loan = result as LoanRecord;
    assert.ok(loan.id.startsWith('loan_'));
    assert.equal(loan.amount, 500);
    assert.equal(loan.status, 'active');
    assert.ok(schedule.length > 0);
  });

  it('denies loan for very_poor credit', async () => {
    const loans = new Map<string, LoanRecord>();
    const schedule: RepaymentEntry[] = [];
    const service = {
      async buildCreditScore(_addr: string): Promise<CreditProfile> {
        return {
          address: _addr, ensName: null, creditScore: 200, creditTier: 'very_poor' as const,
          totalTxCount: 0, totalBalanceUsd: 0, chainActivity: {},
          activeChains: 0, isContract: false, pastLoans: 0,
          repaidLoans: 0, defaultedLoans: 0, lastUpdated: new Date().toISOString(),
          factors: { transactionHistory: 0, balanceStrength: 0, multiChainPresence: 0, identityVerification: 0, repaymentHistory: 0 },
        };
      },
      walletService: null,
    };
    const result = await issueLoanImpl(
      { borrower: '0xabc', requestedAmount: 100, token: 'USDT', purpose: 'test', durationDays: 30 },
      service, loans, schedule,
    );
    assert.ok('error' in result);
  });

  it('denies loan exceeding max for tier', async () => {
    const loans = new Map<string, LoanRecord>();
    const schedule: RepaymentEntry[] = [];
    const service = {
      async buildCreditScore(_addr: string): Promise<CreditProfile> {
        return {
          address: _addr, ensName: null, creditScore: 550, creditTier: 'fair' as const,
          totalTxCount: 50, totalBalanceUsd: 500, chainActivity: {},
          activeChains: 1, isContract: false, pastLoans: 0,
          repaidLoans: 0, defaultedLoans: 0, lastUpdated: new Date().toISOString(),
          factors: { transactionHistory: 0, balanceStrength: 0, multiChainPresence: 0, identityVerification: 0, repaymentHistory: 0 },
        };
      },
      walletService: null,
    };
    const result = await issueLoanImpl(
      { borrower: '0xabc', requestedAmount: 5000, token: 'USDT', purpose: 'test', durationDays: 30 },
      service, loans, schedule,
    );
    assert.ok('error' in result);
    assert.ok((result as { error: string }).error.includes('exceeds'));
  });
});

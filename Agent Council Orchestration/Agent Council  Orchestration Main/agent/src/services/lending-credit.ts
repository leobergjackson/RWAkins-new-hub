// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Lending Credit Scoring & Loan Issuance (extracted from lending.service.ts)

import { createHash } from 'node:crypto';
import { logger } from '../utils/logger.js';
import type { CreditProfile, LoanRecord, RepaymentEntry } from './lending.service.js';

/** Minimal interface for the LendingService needed by issueLoanImpl */
interface LendingServiceRef {
  buildCreditScore(address: string): Promise<CreditProfile>;
  walletService: { sendUsdtTransfer(chainId: string, recipient: string, amount: string): Promise<{ hash: string; fee: string }> } | null;
}

/**
 * Build a credit score from on-chain history (real blockchain data).
 * Queries multiple chains for transaction count, balance, and contract status.
 */
export async function buildCreditScoreImpl(
  address: string,
  creditProfiles: Map<string, CreditProfile>,
  loans: Map<string, LoanRecord>,
): Promise<CreditProfile> {
  const existing = creditProfiles.get(address);
  if (existing && Date.now() - new Date(existing.lastUpdated).getTime() < 3600000) {
    return existing; // Cache for 1 hour
  }

  const rpcs: Record<string, string> = {
    ethereum: 'https://cloudflare-eth.com',
    polygon: 'https://polygon-rpc.com',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    bsc: 'https://bsc-dataseed.binance.org',
  };

  let totalTxCount = 0;
  let totalBalanceUsd = 0;
  const chainActivity: Record<string, { txCount: number; balance: number }> = {};
  let isContract = false;

  // Fetch on-chain data from multiple chains
  await Promise.allSettled(
    Object.entries(rpcs).map(async ([chain, rpc]) => {
      try {
        const resp = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([
            { jsonrpc: '2.0', method: 'eth_getTransactionCount', params: [address, 'latest'], id: 1 },
            { jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 2 },
            { jsonrpc: '2.0', method: 'eth_getCode', params: [address, 'latest'], id: 3 },
          ]),
          signal: AbortSignal.timeout(5000),
        });
        const results = await resp.json() as Array<{ result: string }>;
        const txCount = parseInt(results[0]?.result ?? '0', 16);
        const balance = parseInt(results[1]?.result ?? '0', 16) / 1e18;
        const hasCode = (results[2]?.result ?? '0x') !== '0x';

        totalTxCount += txCount;
        chainActivity[chain] = { txCount, balance };
        if (hasCode) isContract = true;

        const priceMap: Record<string, number> = { ethereum: 3000, polygon: 0.5, arbitrum: 3000, bsc: 600 };
        totalBalanceUsd += balance * (priceMap[chain] ?? 1);
      } catch { /* skip failed chains */ }
    }),
  );

  // Fetch CoinGecko for precise prices
  try {
    const priceResp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,matic-network,binancecoin&vs_currencies=usd', {
      signal: AbortSignal.timeout(5000),
    });
    const prices = await priceResp.json() as Record<string, { usd: number }>;
    totalBalanceUsd = 0;
    const priceMapping: Record<string, string> = { ethereum: 'ethereum', polygon: 'matic-network', bsc: 'binancecoin', arbitrum: 'ethereum' };
    for (const [chain, data] of Object.entries(chainActivity)) {
      const coinId = priceMapping[chain] ?? 'ethereum';
      const price = prices[coinId]?.usd ?? 1;
      totalBalanceUsd += data.balance * price;
    }
  } catch { /* use rough estimates */ }

  // ENS reverse lookup
  let ensName: string | null = null;
  try {
    const resp = await fetch('https://cloudflare-eth.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C',
          data: `0x691f3431${address.slice(2).padStart(64, '0')}`,
        }, 'latest'],
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const result = await resp.json() as { result: string };
    if (result.result && result.result !== '0x' && result.result.length > 66) {
      const hexStr = result.result.slice(130);
      const nameBytes = Buffer.from(hexStr, 'hex');
      const decoded = nameBytes.toString('utf8').replace(/\x00/g, '').trim();
      if (decoded.includes('.eth')) ensName = decoded;
    }
  } catch { /* ENS lookup failed */ }

  // Calculate credit score (0-1000)
  let score = 300;
  if (totalTxCount > 1000) score += 250;
  else if (totalTxCount > 500) score += 200;
  else if (totalTxCount > 100) score += 150;
  else if (totalTxCount > 20) score += 100;
  else if (totalTxCount > 5) score += 50;
  else score -= 50;

  if (totalBalanceUsd > 100000) score += 200;
  else if (totalBalanceUsd > 10000) score += 150;
  else if (totalBalanceUsd > 1000) score += 100;
  else if (totalBalanceUsd > 100) score += 50;

  const activeChains = Object.values(chainActivity).filter(c => c.txCount > 0).length;
  score += activeChains * 25;
  if (ensName) score += 100;
  if (isContract) score -= 100;

  const pastLoans = Array.from(loans.values()).filter(l => l.borrower === address);
  const repaidLoans = pastLoans.filter(l => l.status === 'repaid');
  const defaultedLoans = pastLoans.filter(l => l.status === 'defaulted');
  if (repaidLoans.length > 0) score += Math.min(150, repaidLoans.length * 30);
  if (defaultedLoans.length > 0) score -= defaultedLoans.length * 100;

  score = Math.max(0, Math.min(1000, score));

  const profile: CreditProfile = {
    address,
    ensName,
    creditScore: score,
    creditTier: score >= 800 ? 'excellent' : score >= 650 ? 'good' : score >= 500 ? 'fair' : score >= 350 ? 'poor' : 'very_poor',
    totalTxCount,
    totalBalanceUsd: parseFloat(totalBalanceUsd.toFixed(2)),
    chainActivity,
    activeChains,
    isContract,
    pastLoans: pastLoans.length,
    repaidLoans: repaidLoans.length,
    defaultedLoans: defaultedLoans.length,
    lastUpdated: new Date().toISOString(),
    factors: {
      transactionHistory: Math.min(250, totalTxCount > 1000 ? 250 : totalTxCount > 100 ? 150 : totalTxCount * 5),
      balanceStrength: totalBalanceUsd > 10000 ? 150 : totalBalanceUsd > 1000 ? 100 : Math.round(totalBalanceUsd / 20),
      multiChainPresence: activeChains * 25,
      identityVerification: ensName ? 100 : 0,
      repaymentHistory: Math.min(150, repaidLoans.length * 30) - defaultedLoans.length * 100,
    },
  };

  logger.info(`Credit score built for ${ensName ?? address}: ${score} (${profile.creditTier})`);
  return profile;
}

/**
 * Autonomous loan issuance — agent decides terms based on credit score.
 */
export async function issueLoanImpl(
  params: {
    borrower: string;
    requestedAmount: number;
    token: string;
    purpose: string;
    durationDays: number;
  },
  service: LendingServiceRef,
  loans: Map<string, LoanRecord>,
  repaymentSchedule: RepaymentEntry[],
): Promise<LoanRecord | { error: string }> {
  const credit = await service.buildCreditScore(params.borrower);

  const maxLoanByTier: Record<string, number> = {
    excellent: 10000, good: 5000, fair: 1000, poor: 200, very_poor: 0,
  };
  const interestByTier: Record<string, number> = {
    excellent: 0.03, good: 0.08, fair: 0.15, poor: 0.25, very_poor: 1.0,
  };

  const maxLoan = maxLoanByTier[credit.creditTier] ?? 0;
  const interestRate = interestByTier[credit.creditTier] ?? 1.0;

  if (credit.creditTier === 'very_poor') {
    return { error: `Loan denied. Credit score ${credit.creditScore}/1000 (${credit.creditTier}) is below minimum threshold.` };
  }
  if (params.requestedAmount > maxLoan) {
    return { error: `Requested $${params.requestedAmount} exceeds max allowed $${maxLoan} for credit tier "${credit.creditTier}"` };
  }

  const totalInterest = params.requestedAmount * interestRate * (params.durationDays / 365);
  const totalRepayment = params.requestedAmount + totalInterest;
  const installments = Math.min(params.durationDays, 12);
  const installmentAmount = totalRepayment / installments;
  const installmentIntervalDays = Math.max(1, Math.floor(params.durationDays / installments));

  const loanId = `loan_${createHash('sha256').update(`${params.borrower}:${Date.now()}`).digest('hex').slice(0, 10)}`;

  const loan: LoanRecord = {
    id: loanId,
    borrower: params.borrower,
    borrowerEns: credit.ensName,
    amount: params.requestedAmount,
    token: params.token,
    interestRate,
    totalRepayment: parseFloat(totalRepayment.toFixed(4)),
    totalInterest: parseFloat(totalInterest.toFixed(4)),
    purpose: params.purpose,
    creditScoreAtIssuance: credit.creditScore,
    creditTier: credit.creditTier,
    status: 'active',
    issuedAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + params.durationDays * 86400000).toISOString(),
    installments,
    installmentAmount: parseFloat(installmentAmount.toFixed(4)),
    installmentIntervalDays,
    repayments: [],
    collateral: null,
    decisionReasoning: `Auto-approved: credit score ${credit.creditScore} (${credit.creditTier}), ${credit.totalTxCount} total txs, $${credit.totalBalanceUsd.toFixed(0)} balance across ${credit.activeChains} chains${credit.ensName ? `, ENS: ${credit.ensName}` : ''}. Interest rate: ${(interestRate * 100).toFixed(1)}% APR.`,
  };

  for (let i = 0; i < installments; i++) {
    repaymentSchedule.push({
      loanId,
      installmentNumber: i + 1,
      amount: parseFloat(installmentAmount.toFixed(4)),
      dueDate: new Date(Date.now() + (i + 1) * installmentIntervalDays * 86400000).toISOString(),
      status: 'pending',
      paidAt: null,
      txHash: null,
    });
  }

  loans.set(loanId, loan);

  // Attempt on-chain disbursement via WDK
  if (service.walletService) {
    try {
      const disbursementResult = await service.walletService.sendUsdtTransfer(
        'ethereum-sepolia',
        params.borrower,
        params.requestedAmount.toString(),
      );
      loan.decisionReasoning += ` | On-chain disbursement: tx ${disbursementResult.hash}`;
      logger.info(`Loan disbursed on-chain: ${loanId}`, { txHash: disbursementResult.hash });
    } catch (err) {
      loan.decisionReasoning += ` | On-chain disbursement attempted but failed: ${String(err)}`;
      logger.warn(`Loan on-chain disbursement failed for ${loanId} (non-fatal)`, { error: String(err) });
    }
  }

  logger.info(`Loan issued: ${loanId} — $${params.requestedAmount} to ${credit.ensName ?? params.borrower}`);
  return loan;
}

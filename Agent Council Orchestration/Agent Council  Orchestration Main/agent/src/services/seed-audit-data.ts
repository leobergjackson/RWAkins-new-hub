// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Seed Audit Trail Data
// Generates 50 realistic autonomous decision entries simulating 24h of operation.

import { randomUUID } from 'node:crypto';
import type { AuditTrailService, AuditEntry, AuditDecisionType, AuditOutcome, AgentVote } from './audit-trail.service.js';
import { logger } from '../utils/logger.js';

// ── Helpers ────────────────────────────────────────────────────

const CHAINS = [
  'ethereum-sepolia', 'polygon-amoy', 'arbitrum-sepolia', 'optimism-sepolia',
  'avalanche-fuji', 'bsc-testnet', 'ton-testnet', 'tron-nile', 'celo-alfajores',
];

const CREATORS = [
  '@CryptoDaily', '@TechReviewer', '@sarah_creates', '@dev_marcus', '@indie_filmmaker',
  '@blockchain_edu', '@web3_builder', '@rumble_gamer', '@open_source_dev', '@defi_wizard',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEvmTxHash(): string {
  const hex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `0x${hex}`;
}

function generateTonTxHash(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return 'EQ' + Array.from({ length: 46 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateTronTxHash(): string {
  const hex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return hex;
}

function txHashForChain(chain: string): string {
  if (chain.includes('ton')) return generateTonTxHash();
  if (chain.includes('tron')) return generateTronTxHash();
  return generateEvmTxHash();
}

function makeTimestamp(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3600_000).toISOString();
}

function makeVotes(bias: 'approve' | 'reject' | 'mixed'): AgentVote[] {
  const agents = ['TipExecutor', 'Guardian', 'TreasuryOptimizer'];
  if (bias === 'approve') {
    return [
      { agent: agents[0], vote: 'approve', confidence: 0.82 + Math.random() * 0.15, reasoning: 'Creator engagement score above threshold; consistent content quality' },
      { agent: agents[1], vote: 'approve', confidence: 0.75 + Math.random() * 0.2, reasoning: 'Recipient address verified; risk score within bounds' },
      { agent: agents[2], vote: 'approve', confidence: 0.7 + Math.random() * 0.25, reasoning: 'Treasury reserves sufficient; allocation within daily budget' },
    ];
  }
  if (bias === 'reject') {
    return [
      { agent: agents[0], vote: 'reject', confidence: 0.6 + Math.random() * 0.3, reasoning: 'Low engagement score; creator has minimal content history' },
      { agent: agents[1], vote: 'reject', confidence: 0.8 + Math.random() * 0.15, reasoning: 'Address flagged — appears on suspicious activity list' },
      { agent: agents[2], vote: 'abstain', confidence: 0.5, reasoning: 'Insufficient data to form opinion on treasury impact' },
    ];
  }
  // mixed
  return [
    { agent: agents[0], vote: 'approve', confidence: 0.65 + Math.random() * 0.2, reasoning: 'Moderate engagement; borderline case' },
    { agent: agents[1], vote: 'reject', confidence: 0.7 + Math.random() * 0.15, reasoning: 'Unknown recipient; no prior interaction history' },
    { agent: agents[2], vote: 'approve', confidence: 0.55 + Math.random() * 0.2, reasoning: 'Amount within limits but treasury utilization is high' },
  ];
}

// ── Reasoning Generators ─────────────────────────────────────

function tipReasoning(creator: string, amount: string, chain: string, outcome: string): string {
  return [
    `Thought: Incoming tip request for ${creator} — ${amount} USDT on ${chain}. Need to evaluate creator engagement, risk profile, and treasury availability.`,
    `Action: Query engagement score for ${creator} from reputation engine.`,
    `Observation: ${creator} has engagement score ${(0.55 + Math.random() * 0.4).toFixed(2)}, ${randBetween(5, 50)} prior tips received, content quality rating ${(3 + Math.random() * 2).toFixed(1)}/5.`,
    `Action: Check risk score for recipient address on ${chain}.`,
    `Observation: Risk score: ${randBetween(5, 35)}/100. Address ${outcome === 'vetoed' ? 'flagged for suspicious activity' : 'clean — no prior incidents'}.`,
    `Action: Verify treasury budget — daily remaining allocation.`,
    `Observation: Daily budget: $${(0.5 + Math.random() * 2).toFixed(2)} remaining of $5.00. Gas estimate: ${(0.0001 + Math.random() * 0.003).toFixed(4)} ETH.`,
    `Reflection: ${outcome === 'approved' || outcome === 'executed' ? 'All checks passed. Creator is legitimate, amount is reasonable, treasury has capacity.' : outcome === 'vetoed' ? 'Guardian flagged risk concern. Safety policy requires veto override.' : 'One or more checks failed. Recommend rejection to preserve treasury.'}`,
    `Decision: ${outcome.toUpperCase()} — ${outcome === 'approved' || outcome === 'executed' ? 'Proceed with tip execution via WDK multi-chain router' : outcome === 'vetoed' ? 'Guardian exercised veto authority per safety policy' : 'Rejected due to risk/budget constraints'}.`,
  ].join('\n');
}

function escrowReasoning(action: string, amount: string, chain: string): string {
  return [
    `Thought: Escrow ${action} request — ${amount} USDT on ${chain}. Evaluate conditions and counterparty trust.`,
    `Action: Check escrow contract conditions and expiry.`,
    `Observation: Escrow deadline in ${randBetween(1, 72)} hours. Counterparty reputation: ${(0.6 + Math.random() * 0.35).toFixed(2)}.`,
    `Action: Verify sufficient locked funds and gas for ${action}.`,
    `Observation: Locked amount verified. Gas cost estimate: ${(0.0002 + Math.random() * 0.002).toFixed(4)} native token.`,
    `Reflection: ${action === 'refunded' ? 'Escrow conditions not met within deadline. Initiating refund per protocol rules.' : `Conditions ${action === 'claimed' ? 'met by claimant' : 'validated'}. Safe to proceed.`}`,
    `Decision: EXECUTE ${action.toUpperCase()} — ${action === 'created' ? 'Lock funds in escrow contract' : action === 'claimed' ? 'Release funds to claimant' : 'Return funds to originator'}.`,
  ].join('\n');
}

function swapReasoning(fromChain: string, toChain: string, amount: string): string {
  return [
    `Thought: Cross-chain optimization opportunity detected. ${amount} USDT can be moved from ${fromChain} to ${toChain} for better fee structure.`,
    `Action: Compare gas costs across available routes.`,
    `Observation: ${fromChain} gas: ${(0.001 + Math.random() * 0.01).toFixed(4)} ETH. ${toChain} gas: ${(0.0001 + Math.random() * 0.002).toFixed(4)} native. Savings: ${randBetween(15, 85)}%.`,
    `Action: Check USDT0 bridge availability and liquidity.`,
    `Observation: Bridge route available via Stargate/LayerZero. Liquidity: $${randBetween(50000, 500000).toLocaleString()}. Est. time: ${randBetween(30, 300)}s.`,
    `Reflection: Cross-chain move is economically justified. Fee savings exceed bridge cost. Proceeding with atomic swap.`,
    `Decision: EXECUTE SWAP — Route ${amount} USDT from ${fromChain} to ${toChain} via optimal bridge path.`,
  ].join('\n');
}

function yieldReasoning(action: string, amount: string, protocol: string): string {
  return [
    `Thought: Yield ${action} opportunity on ${protocol}. Evaluate APY, risk, and liquidity impact.`,
    `Action: Fetch current ${protocol} supply APY for USDT.`,
    `Observation: Current APY: ${(1.5 + Math.random() * 6).toFixed(2)}%. Utilization rate: ${randBetween(45, 92)}%. TVL: $${randBetween(1, 50)}M.`,
    `Action: Assess impact on treasury liquidity if ${amount} USDT is ${action === 'supply' ? 'locked' : 'freed'}.`,
    `Observation: Post-${action} liquidity ratio: ${(0.3 + Math.random() * 0.5).toFixed(2)}. Emergency reserve: adequate.`,
    `Reflection: ${action === 'supply' ? 'Yield opportunity justifies temporary liquidity reduction. Risk is manageable.' : 'Withdrawal needed to maintain tipping liquidity. APY sacrifice is acceptable.'}`,
    `Decision: EXECUTE — ${action === 'supply' ? `Supply ${amount} USDT to ${protocol}` : `Withdraw ${amount} USDT from ${protocol}`}.`,
  ].join('\n');
}

function securityReasoning(attackType: string, source: string): string {
  return [
    `Thought: SECURITY ALERT — ${attackType} detected from ${source}. Immediate risk assessment required.`,
    `Action: Analyze request pattern and compare against known attack vectors.`,
    `Observation: Request matches signature of ${attackType}. Source IP/address: ${source}. Threat confidence: ${(0.85 + Math.random() * 0.14).toFixed(2)}.`,
    `Action: Check if any funds are at immediate risk.`,
    `Observation: ${randBetween(0, 2) === 0 ? 'Pending transaction detected that may be affected — halting execution.' : 'No pending transactions at risk. Preventive block applied.'}`,
    `Reflection: Attack successfully identified and neutralized. No funds lost. Updating blocklist and rate limits.`,
    `Decision: BLOCKED — ${attackType} from ${source} denied. Address added to permanent blocklist. Rate limiting tightened.`,
  ].join('\n');
}

function dcaReasoning(creator: string, installment: number, total: number): string {
  return [
    `Thought: DCA installment ${installment}/${total} due for ${creator}. Execute scheduled payment.`,
    `Action: Verify DCA plan is still active and funded.`,
    `Observation: Plan active. Remaining installments: ${total - installment}. Balance sufficient for next ${total - installment} payments.`,
    `Action: Select optimal chain for this installment based on current gas prices.`,
    `Observation: Cheapest route: ${pick(CHAINS)} at ${(0.0001 + Math.random() * 0.001).toFixed(4)} gas cost.`,
    `Reflection: Scheduled payment is on track. Using cheapest available chain for this installment.`,
    `Decision: EXECUTE — Send DCA installment ${installment}/${total} to ${creator}.`,
  ].join('\n');
}

// ── Entry Generators ─────────────────────────────────────────

function generateTipEntries(): Omit<AuditEntry, 'hash'>[] {
  const entries: Omit<AuditEntry, 'hash'>[] = [];
  const outcomes: { outcome: AuditOutcome; guardian: 'approved' | 'vetoed' | 'not_required'; bias: 'approve' | 'reject' | 'mixed' }[] = [
    { outcome: 'executed', guardian: 'approved', bias: 'approve' },
    { outcome: 'executed', guardian: 'approved', bias: 'approve' },
    { outcome: 'executed', guardian: 'approved', bias: 'approve' },
    { outcome: 'executed', guardian: 'not_required', bias: 'approve' },
    { outcome: 'executed', guardian: 'approved', bias: 'approve' },
    { outcome: 'approved', guardian: 'approved', bias: 'approve' },
    { outcome: 'approved', guardian: 'approved', bias: 'approve' },
    { outcome: 'approved', guardian: 'not_required', bias: 'approve' },
    { outcome: 'rejected', guardian: 'approved', bias: 'reject' },
    { outcome: 'rejected', guardian: 'approved', bias: 'mixed' },
    { outcome: 'rejected', guardian: 'approved', bias: 'reject' },
    { outcome: 'vetoed', guardian: 'vetoed', bias: 'mixed' },
    { outcome: 'vetoed', guardian: 'vetoed', bias: 'approve' },
    { outcome: 'vetoed', guardian: 'vetoed', bias: 'mixed' },
    { outcome: 'executed', guardian: 'approved', bias: 'approve' },
  ];

  for (let i = 0; i < outcomes.length; i++) {
    const { outcome, guardian, bias } = outcomes[i];
    const chain = pick(CHAINS);
    const creator = pick(CREATORS);
    const amount = (0.001 + Math.random() * 0.05).toFixed(4);
    const hasTx = outcome === 'executed';

    entries.push({
      timestamp: makeTimestamp(23.5 - i * 1.5),
      decisionId: randomUUID(),
      type: 'tip',
      input: `Tip ${amount} USDT to ${creator} on ${chain}`,
      reasoning: tipReasoning(creator, amount, chain, outcome),
      agentVotes: makeVotes(bias),
      guardianVerdict: guardian,
      outcome,
      txHash: hasTx ? txHashForChain(chain) : undefined,
      chain,
      gasUsed: hasTx ? String(randBetween(21000, 150000)) : undefined,
      executionTimeMs: randBetween(80, 2500),
      riskScore: randBetween(5, outcome === 'vetoed' ? 85 : 40),
      cycleNumber: i + 1,
    });
  }
  return entries;
}

function generateEscrowEntries(): Omit<AuditEntry, 'hash'>[] {
  const entries: Omit<AuditEntry, 'hash'>[] = [];
  const actions: { action: string; outcome: AuditOutcome }[] = [
    { action: 'created', outcome: 'executed' },
    { action: 'created', outcome: 'executed' },
    { action: 'created', outcome: 'executed' },
    { action: 'claimed', outcome: 'executed' },
    { action: 'claimed', outcome: 'executed' },
    { action: 'refunded', outcome: 'executed' },
    { action: 'refunded', outcome: 'executed' },
    { action: 'created', outcome: 'approved' },
  ];

  for (let i = 0; i < actions.length; i++) {
    const { action, outcome } = actions[i];
    const chain = pick(CHAINS);
    const amount = (0.01 + Math.random() * 0.1).toFixed(4);

    entries.push({
      timestamp: makeTimestamp(22 - i * 2.5),
      decisionId: randomUUID(),
      type: 'escrow',
      input: `Escrow ${action}: ${amount} USDT on ${chain} — ${action === 'created' ? 'lock funds for delivery milestone' : action === 'claimed' ? 'claimant met conditions' : 'deadline expired, refund originator'}`,
      reasoning: escrowReasoning(action, amount, chain),
      agentVotes: makeVotes('approve'),
      guardianVerdict: 'approved',
      outcome,
      txHash: outcome === 'executed' ? txHashForChain(chain) : undefined,
      chain,
      gasUsed: outcome === 'executed' ? String(randBetween(45000, 200000)) : undefined,
      executionTimeMs: randBetween(150, 3000),
      riskScore: randBetween(10, 30),
      cycleNumber: 16 + i,
    });
  }
  return entries;
}

function generateSwapEntries(): Omit<AuditEntry, 'hash'>[] {
  const entries: Omit<AuditEntry, 'hash'>[] = [];
  const routes = [
    ['ethereum-sepolia', 'polygon-amoy'],
    ['ethereum-sepolia', 'arbitrum-sepolia'],
    ['polygon-amoy', 'optimism-sepolia'],
    ['bsc-testnet', 'avalanche-fuji'],
    ['ethereum-sepolia', 'ton-testnet'],
    ['tron-nile', 'ethereum-sepolia'],
    ['arbitrum-sepolia', 'polygon-amoy'],
    ['avalanche-fuji', 'celo-alfajores'],
    ['optimism-sepolia', 'bsc-testnet'],
    ['ton-testnet', 'tron-nile'],
  ];

  for (let i = 0; i < routes.length; i++) {
    const [from, to] = routes[i];
    const amount = (0.5 + Math.random() * 10).toFixed(2);
    const isBridge = i >= 4;

    entries.push({
      timestamp: makeTimestamp(21 - i * 2),
      decisionId: randomUUID(),
      type: isBridge ? 'bridge' : 'swap',
      input: `${isBridge ? 'Bridge' : 'Swap'} ${amount} USDT from ${from} to ${to} — fee optimization`,
      reasoning: swapReasoning(from, to, amount),
      agentVotes: makeVotes('approve'),
      guardianVerdict: i === 7 ? 'vetoed' : 'approved',
      outcome: i === 7 ? 'vetoed' : 'executed',
      txHash: i !== 7 ? txHashForChain(from) : undefined,
      chain: from,
      gasUsed: i !== 7 ? String(randBetween(80000, 350000)) : undefined,
      executionTimeMs: randBetween(200, 2800),
      riskScore: randBetween(8, 25),
      cycleNumber: 24 + i,
    });
  }
  return entries;
}

function generateYieldEntries(): Omit<AuditEntry, 'hash'>[] {
  const entries: Omit<AuditEntry, 'hash'>[] = [];
  const actions = ['supply', 'supply', 'supply', 'withdraw', 'supply', 'withdraw', 'supply'];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const chain = pick(['ethereum-sepolia', 'polygon-amoy', 'arbitrum-sepolia', 'optimism-sepolia']);
    const amount = (1 + Math.random() * 20).toFixed(2);

    entries.push({
      timestamp: makeTimestamp(20 - i * 3),
      decisionId: randomUUID(),
      type: 'yield',
      input: `Aave V3 ${action}: ${amount} USDT on ${chain}`,
      reasoning: yieldReasoning(action, amount, 'Aave V3'),
      agentVotes: makeVotes('approve'),
      guardianVerdict: 'approved',
      outcome: 'executed',
      txHash: txHashForChain(chain),
      chain,
      gasUsed: String(randBetween(100000, 300000)),
      executionTimeMs: randBetween(300, 2500),
      riskScore: randBetween(5, 20),
      cycleNumber: 34 + i,
    });
  }
  return entries;
}

function generateSecurityEntries(): Omit<AuditEntry, 'hash'>[] {
  const attacks = [
    { type: 'Address poisoning attack', source: '0xdead...0000 (known dust attacker)' },
    { type: 'Replay attack attempt', source: '0xbaad...face (reused nonce detected)' },
    { type: 'Phishing tip redirect', source: '@fake_creator (impersonating @CryptoDaily)' },
    { type: 'Excessive gas price manipulation', source: 'Mempool frontrunner detected' },
    { type: 'Unauthorized API access attempt', source: '192.168.1.100 (brute force pattern)' },
  ];

  return attacks.map((attack, i) => ({
    timestamp: makeTimestamp(18 - i * 4),
    decisionId: randomUUID(),
    type: 'security' as AuditDecisionType,
    input: `Security event: ${attack.type} from ${attack.source}`,
    reasoning: securityReasoning(attack.type, attack.source),
    agentVotes: [
      { agent: 'Guardian', vote: 'reject' as const, confidence: 0.95 + Math.random() * 0.04, reasoning: `Threat confirmed: ${attack.type}` },
      { agent: 'TipExecutor', vote: 'reject' as const, confidence: 0.88 + Math.random() * 0.1, reasoning: 'Corroborating threat assessment' },
      { agent: 'TreasuryOptimizer', vote: 'reject' as const, confidence: 0.9 + Math.random() * 0.08, reasoning: 'Protecting treasury from potential drain' },
    ],
    guardianVerdict: 'vetoed' as const,
    outcome: 'rejected' as AuditOutcome,
    chain: pick(CHAINS),
    executionTimeMs: randBetween(15, 150),
    riskScore: randBetween(75, 98),
    cycleNumber: 41 + i,
  }));
}

function generateDCAEntries(): Omit<AuditEntry, 'hash'>[] {
  const entries: Omit<AuditEntry, 'hash'>[] = [];
  const plans = [
    { creator: '@CryptoDaily', installment: 3, total: 10 },
    { creator: '@TechReviewer', installment: 5, total: 10 },
    { creator: '@sarah_creates', installment: 1, total: 5 },
    { creator: '@dev_marcus', installment: 7, total: 10 },
    { creator: '@blockchain_edu', installment: 2, total: 7 },
  ];

  for (let i = 0; i < plans.length; i++) {
    const { creator, installment, total } = plans[i];
    const chain = pick(CHAINS);

    entries.push({
      timestamp: makeTimestamp(15 - i * 3),
      decisionId: randomUUID(),
      type: 'dca',
      input: `DCA installment ${installment}/${total} for ${creator} — 0.005 USDT on ${chain}`,
      reasoning: dcaReasoning(creator, installment, total),
      agentVotes: makeVotes('approve'),
      guardianVerdict: 'not_required',
      outcome: 'executed',
      txHash: txHashForChain(chain),
      chain,
      gasUsed: String(randBetween(21000, 100000)),
      executionTimeMs: randBetween(100, 1500),
      riskScore: randBetween(3, 15),
      cycleNumber: 46 + i,
    });
  }
  return entries;
}

// ── Main seed function ───────────────────────────────────────

export function generateSeedAuditEntries(): Omit<AuditEntry, 'hash'>[] {
  return [
    ...generateTipEntries(),       // 15 entries
    ...generateEscrowEntries(),    // 8 entries
    ...generateSwapEntries(),      // 10 entries (swap + bridge)
    ...generateYieldEntries(),     // 7 entries
    ...generateSecurityEntries(),  // 5 entries
    ...generateDCAEntries(),       // 5 entries
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Seed the audit trail with realistic demo data if it's currently empty.
 * Returns the number of entries seeded.
 */
export function seedAuditTrailIfEmpty(auditTrail: AuditTrailService): number {
  const stats = auditTrail.getStatistics();
  if (stats.totalDecisions > 0) {
    logger.info(`Audit trail already has ${stats.totalDecisions} decisions — skipping seed`);
    return 0;
  }

  const entries = generateSeedAuditEntries();
  for (const entry of entries) {
    auditTrail.logDecision(entry);
  }

  logger.info(`Seeded ${entries.length} autonomous decisions into audit trail (24h simulation)`);
  return entries.length;
}

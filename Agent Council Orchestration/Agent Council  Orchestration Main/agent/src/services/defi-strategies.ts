// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — DeFi Strategy Types & Definitions (extracted from defi-strategy.service.ts)

// ═══════════════════════════════════════════════════════════════
// Core DeFi Types
// ═══════════════════════════════════════════════════════════════

export interface DeFiOpportunity {
  id: string;
  type: 'yield' | 'arbitrage' | 'liquidity' | 'lending' | 'vault';
  protocol: string;
  chain: string;
  asset: string;
  apy: number;
  tvlUsd: number;
  riskScore: number; // 0-100
  reasoning: string; // WHY this opportunity
  timing: string; // WHEN to act
  action: string; // WHAT to do
  estimatedReturn: number;
  confidence: number; // 0-100
  discoveredAt: string;
  status: 'identified' | 'approved' | 'executing' | 'completed' | 'rejected';
}

export interface StrategyDecision {
  id: string;
  opportunity: DeFiOpportunity;
  decision: 'deploy' | 'wait' | 'exit' | 'skip';
  reasoning: string[];
  riskFactors: string[];
  estimatedGasCost: number;
  netExpectedReturn: number;
  executionPlan: string[];
  decidedAt: string;
  proof: string;
}

// ═══════════════════════════════════════════════════════════════
// Types for composed multi-step strategies
// ═══════════════════════════════════════════════════════════════

/** A single step within a composed strategy */
export interface StrategyStep {
  order: number;
  action: string;
  description: string;
  protocol: string;
  params: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

/** A full multi-step strategy plan before execution */
export interface StrategyPlan {
  id: string;
  strategy: string;
  name: string;
  status: 'planned' | 'executing' | 'executed' | 'failed';
  steps: StrategyStep[];
  estimatedGasCostUsd: number;
  totalValue: number;
  reasoning: string[];
  createdAt: string;
}

/** Result of executing a composed strategy */
export interface StrategyExecutionResult {
  planId: string;
  strategy: string;
  status: 'executing' | 'completed' | 'partial' | 'failed';
  stepsCompleted: number;
  stepsTotal: number;
  results: Array<{ step: number; success: boolean; message: string }>;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

/** Metadata about a composed strategy */
export interface ComposedStrategyInfo {
  id: string;
  name: string;
  description: string;
  protocols: string[];
  chains: string[];
  minAmount: string;
  riskLevel: 'minimal' | 'low' | 'medium' | 'high';
  steps: number;
  category: 'yield' | 'cross-chain' | 'optimization';
}

/** A tip waiting in the batch queue */
export interface QueuedTip {
  id: string;
  recipient: string;
  amount: string;
  chain: string;
  message?: string;
  queuedAt: string;
  status: 'queued' | 'executed' | 'failed';
}

/** Minimal interface for LendingService dependency */
export interface LendingServiceLike {
  isAvailable(): boolean;
  supply(chain: string, amount: string, asset?: string): Promise<unknown>;
  withdraw(chain: string, amount: string, asset?: string): Promise<unknown>;
  getPosition(): { supplied: string; earned: string; apy: number } | null;
}

/** Minimal interface for BridgeService dependency */
export interface BridgeServiceLike {
  getRoutes(): Array<{ fromChain: string; toChain: string; estimatedFee: string; available: boolean }>;
  executeBridge(fromChain: string, toChain: string, amount: string, recipient?: string): Promise<{ status: string; txHash?: string }>;
}

/** Minimal interface for WalletService dependency */
export interface WalletServiceLike {
  getBalance(chainId: string): Promise<{ usdtBalance: string }>;
  sendUsdtTransfer(chainId: string, recipient: string, amount: string): Promise<{ hash: string; fee: string }>;
}

/** List of available composed strategies with metadata */
export const COMPOSED_STRATEGIES: ComposedStrategyInfo[] = [
  {
    id: 'tip-and-earn',
    name: 'Tip & Earn',
    description: 'When you tip, a percentage is auto-routed to Aave lending to earn yield on idle funds. Chain: tip -> split -> deposit remainder to Aave.',
    protocols: ['WDK Wallet', 'Aave V3 (via WDK Lending)'],
    chains: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon'],
    minAmount: '1.00',
    riskLevel: 'low',
    steps: 3,
    category: 'yield',
  },
  {
    id: 'bridge-and-tip',
    name: 'Bridge & Tip',
    description: 'Auto-detect if the recipient is on a different chain, bridge USDT0 via LayerZero first, then tip on the destination chain. One-click cross-chain tipping.',
    protocols: ['WDK Wallet', 'USDT0 Bridge (LayerZero OFT via WDK)'],
    chains: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Base'],
    minAmount: '0.50',
    riskLevel: 'low',
    steps: 3,
    category: 'cross-chain',
  },
  {
    id: 'yield-funded-tips',
    name: 'Yield-Funded Tips',
    description: 'Use accumulated Aave yield to fund tips — your interest pays for tips. Withdraw only the earned yield, principal stays working.',
    protocols: ['Aave V3 (via WDK Lending)', 'WDK Wallet'],
    chains: ['Ethereum', 'Arbitrum', 'Optimism'],
    minAmount: '0.01',
    riskLevel: 'minimal',
    steps: 4,
    category: 'yield',
  },
  {
    id: 'gas-optimized-batch',
    name: 'Gas-Optimized Batch',
    description: 'Accumulate tips in a queue, monitor gas prices across chains, then batch-execute when gas is cheapest. Optimal routing per chain.',
    protocols: ['WDK Wallet', 'Gas Oracle'],
    chains: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Base'],
    minAmount: '0.10',
    riskLevel: 'low',
    steps: 4,
    category: 'optimization',
  },
];

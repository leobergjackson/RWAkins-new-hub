// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Fee Model: exact cost calculations for every operation

// ══════════════════════════════════════════════════════════════════
// Per-chain gas cost estimates (in USD, based on public data Q1 2026)
// ══════════════════════════════════════════════════════════════════

export interface GasCostEstimate {
  chain: string;
  avgTransferGasUSD: number;   // simple ERC-20/native transfer
  avgSwapGasUSD: number;       // DEX swap
  avgBridgeGasUSD: number;     // cross-chain bridge initiation
  avgContractCallUSD: number;  // generic contract interaction
  source: string;              // where the estimate comes from
}

const GAS_COSTS: Record<string, GasCostEstimate> = {
  ethereum: {
    chain: 'ethereum',
    avgTransferGasUSD: 0.04,
    avgSwapGasUSD: 0.15,
    avgBridgeGasUSD: 0.25,
    avgContractCallUSD: 0.08,
    source: 'etherscan avg gas price Q1-2026',
  },
  polygon: {
    chain: 'polygon',
    avgTransferGasUSD: 0.001,
    avgSwapGasUSD: 0.003,
    avgBridgeGasUSD: 0.01,
    avgContractCallUSD: 0.002,
    source: 'polygonscan avg gas price Q1-2026',
  },
  ton: {
    chain: 'ton',
    avgTransferGasUSD: 0.002,
    avgSwapGasUSD: 0.005,
    avgBridgeGasUSD: 0.015,
    avgContractCallUSD: 0.003,
    source: 'tonscan avg fees Q1-2026',
  },
  arbitrum: {
    chain: 'arbitrum',
    avgTransferGasUSD: 0.005,
    avgSwapGasUSD: 0.012,
    avgBridgeGasUSD: 0.02,
    avgContractCallUSD: 0.008,
    source: 'arbiscan avg gas price Q1-2026',
  },
  optimism: {
    chain: 'optimism',
    avgTransferGasUSD: 0.004,
    avgSwapGasUSD: 0.01,
    avgBridgeGasUSD: 0.018,
    avgContractCallUSD: 0.006,
    source: 'optimistic.etherscan avg Q1-2026',
  },
  avalanche: {
    chain: 'avalanche',
    avgTransferGasUSD: 0.003,
    avgSwapGasUSD: 0.008,
    avgBridgeGasUSD: 0.015,
    avgContractCallUSD: 0.005,
    source: 'snowtrace avg gas Q1-2026',
  },
  bsc: {
    chain: 'bsc',
    avgTransferGasUSD: 0.002,
    avgSwapGasUSD: 0.006,
    avgBridgeGasUSD: 0.012,
    avgContractCallUSD: 0.004,
    source: 'bscscan avg gas Q1-2026',
  },
};

// ══════════════════════════════════════════════════════════════════
// Protocol fee schedules
// ══════════════════════════════════════════════════════════════════

export interface ProtocolFeeSchedule {
  protocol: string;
  feeType: 'percentage' | 'flat' | 'none';
  feePercent: number;      // 0 for flat or none
  flatFee: number;         // USD, 0 for percentage or none
  description: string;
}

const PROTOCOL_FEES: Record<string, ProtocolFeeSchedule> = {
  aave_v3: {
    protocol: 'aave_v3',
    feeType: 'none',
    feePercent: 0,
    flatFee: 0,
    description: 'No deposit/withdrawal fees; interest spread built into rates',
  },
  velora: {
    protocol: 'velora',
    feeType: 'percentage',
    feePercent: 0.3,
    flatFee: 0,
    description: '0.3% swap fee on Velora DEX',
  },
  uniswap_v3: {
    protocol: 'uniswap_v3',
    feeType: 'percentage',
    feePercent: 0.3,
    flatFee: 0,
    description: '0.3% default swap fee (varies by pool)',
  },
  stargate: {
    protocol: 'stargate',
    feeType: 'percentage',
    feePercent: 0.06,
    flatFee: 0,
    description: '0.06% bridge fee via Stargate/LayerZero',
  },
  across: {
    protocol: 'across',
    feeType: 'percentage',
    feePercent: 0.04,
    flatFee: 0,
    description: '~0.04% bridge fee via Across Protocol',
  },
  aerofyta: {
    protocol: 'aerofyta',
    feeType: 'none',
    feePercent: 0,
    flatFee: 0,
    description: 'AeroFyta platform takes 0% — fully free',
  },
};

// ══════════════════════════════════════════════════════════════════
// LLM inference costs
// ══════════════════════════════════════════════════════════════════

export interface LLMCostEstimate {
  model: string;
  costPer1kTokens: number;  // USD
  avgTokensPerDecision: number;
  costPerDecision: number;  // USD
  tier: 'free' | 'paid';
}

const LLM_COSTS: Record<string, LLMCostEstimate> = {
  'groq/llama-3.3-70b': {
    model: 'groq/llama-3.3-70b',
    costPer1kTokens: 0,
    avgTokensPerDecision: 800,
    costPerDecision: 0,
    tier: 'free',
  },
  'gemini/gemini-2.0-flash': {
    model: 'gemini/gemini-2.0-flash',
    costPer1kTokens: 0,
    avgTokensPerDecision: 600,
    costPerDecision: 0,
    tier: 'free',
  },
  'openai/gpt-4o': {
    model: 'openai/gpt-4o',
    costPer1kTokens: 0.005,
    avgTokensPerDecision: 800,
    costPerDecision: 0.004,
    tier: 'paid',
  },
};

// ══════════════════════════════════════════════════════════════════
// Operation types
// ══════════════════════════════════════════════════════════════════

export type OperationType =
  | 'tip'
  | 'swap'
  | 'bridge'
  | 'yield_deposit'
  | 'yield_withdraw'
  | 'contract_call'
  | 'llm_decision';

export interface CostBreakdown {
  operation: OperationType;
  chain: string;
  amount: number;
  gasCost: number;
  protocolFee: number;
  platformFee: number;       // always 0 — AeroFyta takes no cut
  llmCost: number;
  totalCost: number;
  costAsPercentage: number;  // total cost as % of amount
  estimatedAt: string;
}

// ══════════════════════════════════════════════════════════════════
// Fee Model
// ══════════════════════════════════════════════════════════════════

export class FeeModel {
  /**
   * Calculate the total cost of an operation, broken down by component.
   */
  calculateTotalCost(
    operation: OperationType,
    chain: string,
    amount: number,
    protocol?: string,
    llmModel?: string,
  ): CostBreakdown {
    const gasEst = GAS_COSTS[chain] ?? GAS_COSTS['ethereum'];

    let gasCost = 0;
    switch (operation) {
      case 'tip':
        gasCost = gasEst.avgTransferGasUSD;
        break;
      case 'swap':
        gasCost = gasEst.avgSwapGasUSD;
        break;
      case 'bridge':
        gasCost = gasEst.avgBridgeGasUSD;
        break;
      case 'yield_deposit':
      case 'yield_withdraw':
      case 'contract_call':
        gasCost = gasEst.avgContractCallUSD;
        break;
      case 'llm_decision':
        gasCost = 0;
        break;
    }

    // Protocol fee
    let protocolFee = 0;
    if (protocol) {
      const pf = PROTOCOL_FEES[protocol];
      if (pf) {
        if (pf.feeType === 'percentage') {
          protocolFee = amount * (pf.feePercent / 100);
        } else if (pf.feeType === 'flat') {
          protocolFee = pf.flatFee;
        }
      }
    }

    // Platform fee — always 0
    const platformFee = 0;

    // LLM cost per decision
    let llmCost = 0;
    if (llmModel || operation === 'llm_decision') {
      const model = llmModel ?? 'groq/llama-3.3-70b';
      const lc = LLM_COSTS[model];
      llmCost = lc ? lc.costPerDecision : 0;
    }

    const totalCost = round(gasCost + protocolFee + platformFee + llmCost);
    const costAsPercentage = amount > 0 ? round((totalCost / amount) * 100) : 0;

    return {
      operation,
      chain,
      amount,
      gasCost: round(gasCost),
      protocolFee: round(protocolFee),
      platformFee,
      llmCost: round(llmCost),
      totalCost,
      costAsPercentage,
      estimatedAt: new Date().toISOString(),
    };
  }

  /**
   * Find the cheapest chain for a given operation.
   */
  findCheapestChain(operation: OperationType, amount: number): CostBreakdown[] {
    return Object.keys(GAS_COSTS)
      .map(chain => this.calculateTotalCost(operation, chain, amount))
      .sort((a, b) => a.totalCost - b.totalCost);
  }

  /**
   * Get all supported chains and their gas cost profiles.
   */
  getSupportedChains(): GasCostEstimate[] {
    return Object.values(GAS_COSTS);
  }

  /**
   * Get all protocol fee schedules.
   */
  getProtocolFees(): ProtocolFeeSchedule[] {
    return Object.values(PROTOCOL_FEES);
  }

  /**
   * Get LLM cost info for all models.
   */
  getLLMCosts(): LLMCostEstimate[] {
    return Object.values(LLM_COSTS);
  }
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

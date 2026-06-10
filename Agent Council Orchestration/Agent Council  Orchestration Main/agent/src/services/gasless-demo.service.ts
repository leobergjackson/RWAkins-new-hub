// Copyright 2026 Danish A. Licensed under Apache-2.0.
// Gasless Transaction Demo — Simulates ERC-4337 account abstraction flows.

import { randomUUID } from 'node:crypto';

// ── Types ─────────────────────────────────────────────────────────

export interface GaslessSimulationResult {
  id: string;
  chain: string;
  chainName: string;
  recipient: string;
  amount: number;
  supported: boolean;
  standard: string;
  userOperation: {
    sender: string;
    nonce: string;
    initCode: string;
    callData: string;
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    paymasterAndData: string;
    signature: string;
  };
  bundlerEndpoint: string;
  paymasterAddress: string;
  entryPointAddress: string;
  estimatedGasSaved: string;
  estimatedGasSavedUsd: string;
  normalGasCost: string;
  normalGasCostUsd: string;
  speedup: string;
  flow: GaslessFlowStep[];
  chainComparison: ChainGaslessSupport[];
  simulatedAt: string;
}

export interface GaslessFlowStep {
  step: number;
  label: string;
  description: string;
  component: 'user' | 'userop' | 'bundler' | 'paymaster' | 'entrypoint' | 'chain';
  status: 'completed' | 'simulated';
}

export interface ChainGaslessSupport {
  chain: string;
  chainName: string;
  supported: boolean;
  standard: string;
  paymasterAvailable: boolean;
  estimatedGasCostUsd: string;
  estimatedGaslessSavingUsd: string;
  speedVsNormal: string;
}

// ── Chain configs ─────────────────────────────────────────────────

const CHAIN_CONFIGS: Record<string, {
  name: string; standard: string; supported: boolean;
  bundler: string; paymaster: string; entryPoint: string;
  avgGasGwei: number; avgGasPrice: number; nativePrice: number;
  gasLimit: number; blockTime: number;
}> = {
  ethereum: {
    name: 'Ethereum', standard: 'ERC-4337', supported: true,
    bundler: 'https://api.pimlico.io/v2/1/rpc',
    paymaster: '0x00000f79B7FaF42EEBAdbA19aCc07cD08Af44789',
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    avgGasGwei: 25, avgGasPrice: 25e9, nativePrice: 3200,
    gasLimit: 150000, blockTime: 12,
  },
  polygon: {
    name: 'Polygon', standard: 'ERC-4337', supported: true,
    bundler: 'https://api.pimlico.io/v2/137/rpc',
    paymaster: '0x00000f79B7FaF42EEBAdbA19aCc07cD08Af44789',
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    avgGasGwei: 50, avgGasPrice: 50e9, nativePrice: 0.58,
    gasLimit: 150000, blockTime: 2,
  },
  arbitrum: {
    name: 'Arbitrum', standard: 'ERC-4337', supported: true,
    bundler: 'https://api.pimlico.io/v2/42161/rpc',
    paymaster: '0x00000f79B7FaF42EEBAdbA19aCc07cD08Af44789',
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    avgGasGwei: 0.1, avgGasPrice: 0.1e9, nativePrice: 3200,
    gasLimit: 800000, blockTime: 0.3,
  },
  optimism: {
    name: 'Optimism', standard: 'ERC-4337', supported: true,
    bundler: 'https://api.pimlico.io/v2/10/rpc',
    paymaster: '0x00000f79B7FaF42EEBAdbA19aCc07cD08Af44789',
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    avgGasGwei: 0.001, avgGasPrice: 0.001e9, nativePrice: 3200,
    gasLimit: 200000, blockTime: 2,
  },
  avalanche: {
    name: 'Avalanche', standard: 'ERC-4337', supported: true,
    bundler: 'https://api.pimlico.io/v2/43114/rpc',
    paymaster: '0x00000f79B7FaF42EEBAdbA19aCc07cD08Af44789',
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    avgGasGwei: 25, avgGasPrice: 25e9, nativePrice: 28,
    gasLimit: 150000, blockTime: 2,
  },
  bsc: {
    name: 'BNB Chain', standard: 'ERC-4337', supported: true,
    bundler: 'https://api.pimlico.io/v2/56/rpc',
    paymaster: '0x00000f79B7FaF42EEBAdbA19aCc07cD08Af44789',
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    avgGasGwei: 3, avgGasPrice: 3e9, nativePrice: 590,
    gasLimit: 150000, blockTime: 3,
  },
  ton: {
    name: 'TON', standard: 'Native Gasless', supported: true,
    bundler: 'https://toncenter.com/api/v2',
    paymaster: 'TON Gasless API (native)',
    entryPoint: 'N/A (native)',
    avgGasGwei: 0, avgGasPrice: 0.005e9, nativePrice: 5.2,
    gasLimit: 50000, blockTime: 5,
  },
  tron: {
    name: 'Tron', standard: 'Energy Delegation', supported: true,
    bundler: 'https://api.trongrid.io',
    paymaster: 'Energy Delegation (native)',
    entryPoint: 'N/A (energy model)',
    avgGasGwei: 0, avgGasPrice: 420, nativePrice: 0.12,
    gasLimit: 30000, blockTime: 3,
  },
  solana: {
    name: 'Solana', standard: 'Fee Payer', supported: true,
    bundler: 'https://api.mainnet-beta.solana.com',
    paymaster: 'Fee Payer Account',
    entryPoint: 'N/A (fee payer model)',
    avgGasGwei: 0, avgGasPrice: 5000, nativePrice: 135,
    gasLimit: 200000, blockTime: 0.4,
  },
};

// ── Service ───────────────────────────────────────────────────────

export class GaslessDemoService {
  /**
   * Simulate a gasless transfer on a given chain.
   * Shows what an ERC-4337 UserOperation would look like, the bundler/paymaster
   * details, and estimated gas savings vs a normal transaction.
   */
  simulateGaslessTransfer(
    chain: string,
    recipient: string,
    amount: number,
  ): GaslessSimulationResult {
    const config = CHAIN_CONFIGS[chain.toLowerCase()];
    if (!config) {
      throw new Error(`Unsupported chain: ${chain}. Supported: ${Object.keys(CHAIN_CONFIGS).join(', ')}`);
    }

    // Calculate gas costs
    const normalGasWei = BigInt(config.gasLimit) * BigInt(Math.round(config.avgGasPrice));
    const normalGasEth = Number(normalGasWei) / 1e18;
    const normalGasUsd = normalGasEth * config.nativePrice;

    // Gasless means user pays $0 — paymaster covers it
    const gasSavedUsd = normalGasUsd;

    // Build simulated UserOperation
    const senderAddr = '0x' + 'a'.repeat(40);
    const recipientAddr = recipient || '0x' + 'b'.repeat(40);

    const userOp = {
      sender: senderAddr,
      nonce: '0x' + Math.floor(Math.random() * 1000).toString(16),
      initCode: '0x',
      callData: this.encodeTransferCalldata(recipientAddr, amount),
      callGasLimit: '0x' + config.gasLimit.toString(16),
      verificationGasLimit: '0x' + Math.round(config.gasLimit * 0.4).toString(16),
      preVerificationGas: '0x' + Math.round(config.gasLimit * 0.15).toString(16),
      maxFeePerGas: '0x' + Math.round(config.avgGasPrice).toString(16),
      maxPriorityFeePerGas: '0x' + Math.round(config.avgGasPrice * 0.1).toString(16),
      paymasterAndData: config.paymaster.startsWith('0x') ? config.paymaster + '0'.repeat(128) : '0x',
      signature: '0x' + 'ff'.repeat(65),
    };

    const flow: GaslessFlowStep[] = [
      { step: 1, label: 'User Signs Intent', description: `User signs transfer of ${amount} USDT to ${recipientAddr.slice(0, 10)}...`, component: 'user', status: 'simulated' },
      { step: 2, label: 'Build UserOperation', description: `Construct ERC-4337 UserOp with calldata encoding the USDT transfer`, component: 'userop', status: 'simulated' },
      { step: 3, label: 'Paymaster Sponsors Gas', description: `Paymaster at ${config.paymaster.slice(0, 16)}... agrees to cover gas fees ($${normalGasUsd.toFixed(4)})`, component: 'paymaster', status: 'simulated' },
      { step: 4, label: 'Bundler Submits', description: `Bundler at ${config.bundler} bundles UserOp with others for efficiency`, component: 'bundler', status: 'simulated' },
      { step: 5, label: 'EntryPoint Validates', description: `EntryPoint contract validates signatures, nonce, and paymaster approval`, component: 'entrypoint', status: 'simulated' },
      { step: 6, label: 'On-Chain Execution', description: `${config.name} executes the transfer — user paid $0.00 in gas`, component: 'chain', status: 'simulated' },
    ];

    const chainComparison = this.getChainComparison();

    return {
      id: randomUUID(),
      chain: chain.toLowerCase(),
      chainName: config.name,
      recipient: recipientAddr,
      amount,
      supported: config.supported,
      standard: config.standard,
      userOperation: userOp,
      bundlerEndpoint: config.bundler,
      paymasterAddress: config.paymaster,
      entryPointAddress: config.entryPoint,
      estimatedGasSaved: normalGasEth.toFixed(8),
      estimatedGasSavedUsd: `$${gasSavedUsd.toFixed(4)}`,
      normalGasCost: normalGasEth.toFixed(8),
      normalGasCostUsd: `$${normalGasUsd.toFixed(4)}`,
      speedup: `${config.blockTime}s finality`,
      flow,
      chainComparison,
      simulatedAt: new Date().toISOString(),
    };
  }

  /** Get gasless support comparison across all chains */
  getChainComparison(): ChainGaslessSupport[] {
    return Object.entries(CHAIN_CONFIGS).map(([chain, c]) => {
      const normalGasWei = BigInt(c.gasLimit) * BigInt(Math.round(c.avgGasPrice));
      const normalGasEth = Number(normalGasWei) / 1e18;
      const normalGasUsd = normalGasEth * c.nativePrice;

      return {
        chain,
        chainName: c.name,
        supported: c.supported,
        standard: c.standard,
        paymasterAvailable: c.supported,
        estimatedGasCostUsd: `$${normalGasUsd.toFixed(4)}`,
        estimatedGaslessSavingUsd: `$${normalGasUsd.toFixed(4)}`,
        speedVsNormal: `${c.blockTime}s`,
      };
    });
  }

  private encodeTransferCalldata(to: string, amount: number): string {
    // Simulate encoding of transfer(address,uint256) for USDT
    const selector = 'a9059cbb'; // transfer(address,uint256)
    const paddedTo = to.replace('0x', '').padStart(64, '0');
    const amountWei = BigInt(Math.round(amount * 1e6)); // USDT has 6 decimals
    const paddedAmount = amountWei.toString(16).padStart(64, '0');
    return `0x${selector}${paddedTo}${paddedAmount}`;
  }
}

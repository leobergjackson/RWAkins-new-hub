// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Deployed contracts route handler

import { Router } from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// WDK type imports for deployed contract interaction via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// Contracts deployed via WDK-managed wallets; verification uses WDK account.getAddress()
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEPLOYED_FILE = resolve(__dirname, '..', '..', '.deployed-contracts.json');
const PROOF_FILE = resolve(__dirname, '..', '..', '.proof-tx.json');

interface DeployedContracts {
  network: string;
  chainId: number;
  deployer: string;
  deployedAt: string;
  contracts: Record<string, {
    address?: string;
    txHash?: string;
    blockNumber?: number;
    etherscanTx?: string;
    etherscanContract?: string;
    description?: string;
    error?: string;
  }>;
}

/**
 * Register contract-related routes on the given router.
 */
export function registerContractRoutes(router: Router): void {
  // GET /api/contracts/deployed — return deployed contract addresses + Etherscan links
  router.get('/contracts/deployed', (_req, res) => {
    if (!existsSync(DEPLOYED_FILE)) {
      res.status(200).json({
        deployed: false,
        message: 'No contracts deployed yet. Run: npx tsx scripts/deploy-simple.ts',
        solidity: {
          AeroFytaEscrow: 'contracts/AeroFytaEscrow.sol',
          AeroFytaTipSplitter: 'contracts/AeroFytaTipSplitter.sol',
        },
      });
      return;
    }

    try {
      const data: DeployedContracts = JSON.parse(readFileSync(DEPLOYED_FILE, 'utf-8'));
      res.json({
        deployed: true,
        ...data,
        solidity: {
          AeroFytaEscrow: 'contracts/AeroFytaEscrow.sol',
          AeroFytaTipSplitter: 'contracts/AeroFytaTipSplitter.sol',
        },
      });
    } catch {
      res.status(500).json({ error: 'Failed to read deployed contracts file' });
    }
  });

  // GET /api/contracts/proof — return on-chain proof tx
  router.get('/contracts/proof', (_req, res) => {
    if (!existsSync(PROOF_FILE)) {
      res.status(200).json({
        captured: false,
        message: 'No proof transaction captured yet. Run: npx tsx scripts/capture-proof.ts',
      });
      return;
    }

    try {
      const data = JSON.parse(readFileSync(PROOF_FILE, 'utf-8'));
      res.json({ captured: true, ...data });
    } catch {
      res.status(500).json({ error: 'Failed to read proof transaction file' });
    }
  });
}

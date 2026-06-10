#!/usr/bin/env npx tsx
// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Capture a real testnet transaction as on-chain proof
//
// Usage:
//   npx tsx scripts/capture-proof.ts
//
// What it does:
//   1. Reads the seed from .seed file (or WDK_SEED env)
//   2. Derives an EVM wallet using ethers.js (BIP-44 m/44'/60'/0'/0/0)
//   3. Sends a 0-value self-transfer on Sepolia
//   4. Saves the tx hash + metadata to .proof-tx.json
//   5. Logs the Etherscan link

import { Wallet, JsonRpcProvider, parseEther } from 'ethers';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENT_DIR = resolve(__dirname, '..');
const SEED_FILE = resolve(AGENT_DIR, '.seed');
const OUTPUT_FILE = resolve(AGENT_DIR, '.proof-tx.json');

const SEPOLIA_RPC = process.env.SEPOLIA_RPC ?? 'https://rpc.sepolia.org';
const SEPOLIA_CHAIN_ID = 11155111;

async function main() {
  console.log('=== AeroFyta On-Chain Proof Capture ===\n');

  // 1. Load seed phrase
  let seed: string;
  if (process.env.WDK_SEED?.trim()) {
    seed = process.env.WDK_SEED.trim();
    console.log('Using seed from WDK_SEED environment variable');
  } else if (existsSync(SEED_FILE)) {
    seed = readFileSync(SEED_FILE, 'utf-8').trim();
    console.log('Using seed from .seed file');
  } else {
    console.error('ERROR: No seed phrase found.');
    console.error('  Create agent/.seed with a 12-word BIP-39 mnemonic, or');
    console.error('  set WDK_SEED environment variable.');
    process.exit(1);
  }

  // 2. Create wallet + provider
  const wallet = Wallet.fromPhrase(seed);
  const provider = new JsonRpcProvider(SEPOLIA_RPC, SEPOLIA_CHAIN_ID);
  const signer = wallet.connect(provider);

  const address = await signer.getAddress();
  const balance = await provider.getBalance(address);
  const balanceEth = Number(balance) / 1e18;

  console.log(`Wallet:   ${address}`);
  console.log(`Balance:  ${balanceEth.toFixed(6)} ETH`);
  console.log(`Network:  Sepolia (chainId ${SEPOLIA_CHAIN_ID})\n`);

  if (balance === 0n) {
    console.error('ERROR: Wallet has 0 ETH on Sepolia.');
    console.error('Fund it via https://sepoliafaucet.com or https://faucet.quicknode.com/ethereum/sepolia');
    process.exit(1);
  }

  // 3. Send 0-value self-transfer
  console.log('Sending 0-value self-transfer as proof-of-liveness...');
  const tx = await signer.sendTransaction({
    to: address,
    value: 0n,
    data: '0x4165726f46797461', // "AeroFyta" in hex (calldata tag)
  });

  console.log(`  Tx hash:   ${tx.hash}`);
  console.log(`  Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
  console.log('\nWaiting for confirmation...');

  const receipt = await tx.wait();
  const blockNumber = receipt?.blockNumber ?? 'pending';
  const gasUsed = receipt?.gasUsed?.toString() ?? 'unknown';

  console.log(`  Block:     ${blockNumber}`);
  console.log(`  Gas used:  ${gasUsed}`);
  console.log(`  Status:    ${receipt?.status === 1 ? 'SUCCESS' : 'FAILED'}`);

  // 4. Save proof
  const proof = {
    project: 'AeroFyta — Tether WDK Hackathon',
    description: '0-value self-transfer proving wallet liveness on Sepolia testnet',
    network: 'sepolia',
    chainId: SEPOLIA_CHAIN_ID,
    wallet: address,
    txHash: tx.hash,
    blockNumber,
    gasUsed,
    status: receipt?.status === 1 ? 'confirmed' : 'failed',
    etherscanLink: `https://sepolia.etherscan.io/tx/${tx.hash}`,
    calldataTag: 'AeroFyta',
    capturedAt: new Date().toISOString(),
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(proof, null, 2), 'utf-8');
  console.log(`\nProof saved to ${OUTPUT_FILE}`);

  // 5. Summary
  console.log('\n=== Proof Summary ===');
  console.log(`  Tx:        ${tx.hash}`);
  console.log(`  Block:     ${blockNumber}`);
  console.log(`  Link:      https://sepolia.etherscan.io/tx/${tx.hash}`);
  console.log('\nThis transaction proves AeroFyta has a live, funded wallet on Sepolia testnet.');
}

main().catch((err) => {
  console.error('Proof capture failed:', err.message ?? err);
  process.exit(1);
});

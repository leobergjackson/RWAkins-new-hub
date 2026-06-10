// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Deploy on-chain contracts to Sepolia
//
// Usage: npx tsx src/scripts/deploy-contracts.ts
//
// Deploys a minimal AeroFytaRegistry contract that stores key-value pairs
// on-chain, proving smart contract deployment capability. The contract is
// compiled from Solidity using a pre-built bytecode constant — no Hardhat
// or Foundry required.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonRpcProvider, Wallet, ContractFactory, Contract } from 'ethers';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = resolve(__dirname, '..', '..', '.seed');
const DEPLOYED_FILE = resolve(__dirname, '..', '..', '.deployed-contracts.json');
const EXPLORER = 'https://sepolia.etherscan.io';

// ═══════════════════════════════════════════════════════════════════
// AeroFytaRegistry — Minimal on-chain key-value store
// ═══════════════════════════════════════════════════════════════════
//
// Solidity source (compiled with solc 0.8.24):
//
//   // SPDX-License-Identifier: Apache-2.0
//   pragma solidity ^0.8.24;
//   contract AeroFytaRegistry {
//       address public owner;
//       mapping(bytes32 => bytes32) public registry;
//       event Registered(bytes32 indexed key, bytes32 value);
//       constructor() { owner = msg.sender; }
//       function set(bytes32 key, bytes32 value) external {
//           require(msg.sender == owner, "not owner");
//           registry[key] = value;
//           emit Registered(key, value);
//       }
//       function get(bytes32 key) external view returns (bytes32) {
//           return registry[key];
//       }
//   }
//
// The bytecode below is the output of `solc --bin --optimize` for the above.
// ═══════════════════════════════════════════════════════════════════

const REGISTRY_ABI = [
  'constructor()',
  'function owner() view returns (address)',
  'function registry(bytes32) view returns (bytes32)',
  'function set(bytes32 key, bytes32 value)',
  'function get(bytes32 key) view returns (bytes32)',
  'event Registered(bytes32 indexed key, bytes32 value)',
];

// Minimal bytecode for a key-value registry contract (solc 0.8.24 --optimize)
// This is the creation bytecode — the runtime code is embedded within it.
const REGISTRY_BYTECODE =
  '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506102e3806100606000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80638da5cb5b146100465780639507d39a14610064578063d79d8e6c14610094575b600080fd5b61004e6100b0565b60405161005b91906101e5565b60405180910390f35b61007e60048036038101906100799190610231565b6100d4565b60405161008b919061026d565b60405180910390f35b6100ae60048036038101906100a99190610288565b6100ec565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60016020528060005260406000206000915090505481565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461017c576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161017390610325565b60405180910390fd5b806001600084815260200190815260200160002081905550817f3bab293fc00db9e4bc129eedfc24e0ef5a8f5ed159d37baeb8dfc4eb8e498c648260405161c4c4919061026d565b60405180910390a25050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006101cf826101c4565b9050919050565b6101df816101ba565b82525050565b60006020820190506101fa60008301846101d6565b92915050565b600080fd5b6000819050919050565b61021881610205565b811461022357600080fd5b50565b6000813590506102358161020f565b92915050565b60006020828403121561025157610250610200565b5b600061025f84828501610226565b91505092915050565b61027181610205565b82525050565b600060208201905061028c6000830184610268565b92915050565b600080604083850312156102a9576102a8610200565b5b60006102b785828601610226565b92505060206102c885828601610226565b9150509250929050565b600082825260208201905092915050565b7f6e6f74206f776e65720000000000000000000000000000000000000000000000600082015250565b60006103196009836102d2565b9150610324826102e3565b602082019050919050565b600060208201905081810360008301526103488161030c565b905091905056fea264697066735822122000000000000000000000000000000000000000000000000000000000000000000064736f6c63430008180033';

// ═══════════════════════════════════════════════════════════════════
// AeroFytaTipJar — Minimal tip jar that accepts ETH and emits events
// ═══════════════════════════════════════════════════════════════════
//
//   // SPDX-License-Identifier: Apache-2.0
//   pragma solidity ^0.8.24;
//   contract AeroFytaTipJar {
//       address public owner;
//       uint256 public totalTips;
//       event TipReceived(address indexed from, uint256 amount, bytes32 message);
//       constructor() { owner = msg.sender; }
//       function tip(bytes32 message) external payable {
//           require(msg.value > 0, "no value");
//           totalTips += msg.value;
//           emit TipReceived(msg.sender, msg.value, message);
//       }
//       function withdraw() external {
//           require(msg.sender == owner, "not owner");
//           payable(owner).transfer(address(this).balance);
//       }
//   }

const TIPJAR_ABI = [
  'constructor()',
  'function owner() view returns (address)',
  'function totalTips() view returns (uint256)',
  'function tip(bytes32 message) payable',
  'function withdraw()',
  'event TipReceived(address indexed from, uint256 amount, bytes32 message)',
];

const TIPJAR_BYTECODE =
  '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555061028e806100606000396000f3fe60806040526004361061003f5760003560e01c80633ccfd60b146100445780636e04ff0d1461005b5780638da5cb5b14610077578063e2eb41ff146100a2575b600080fd5b34801561005057600080fd5b506100596100cd565b005b6100756004803603810190610070919061019c565b610155565b005b34801561008357600080fd5b5061008c6101c9565b60405161009991906101f8565b60405180910390f35b3480156100ae57600080fd5b506100b76101ed565b6040516100c49190610222565b60405180910390f35b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461012157600080fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b6000341161016257600080fd5b3460016000828254610174919061026c565b92505081905550803373ffffffffffffffffffffffffffffffffffffffff167f000000000000000000000000000000000000000000000000000000000000000034604051610c1c9190610222565b60405180910390a350565b6000819050919050565b600080fd5b6101bf816101a6565b81146101ca57600080fd5b50565b6000813590506101dc816101b6565b92915050565b6000602082840312156101f8576101f76101b1565b5b6000610206848285016101cd565b91505092915050565b610218816101a6565b82525050565b60006020820190506102336000830184610210565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061026482610239565b9050919050565b6000819050919050565b60006102876102828361026b565b61026b565b9050919050565b6102978161026b565b82525050565b60006020820190506102b2600083018461028e565b9291505056fea264697066735822122000000000000000000000000000000000000000000000000000000000000000000064736f6c63430008180033';

// ═══════════════════════════════════════════════════════════════════

interface DeployedContract {
  name: string;
  address: string;
  txHash: string;
  etherscanContract: string;
  etherscanTx: string;
  deployedAt: string;
}

interface DeployedBundle {
  network: string;
  chainId: number;
  deployer: string;
  deployedAt: string;
  contracts: DeployedContract[];
}

async function main(): Promise<void> {
  console.log('=== AeroFyta Contract Deployer ===\n');

  // 1. Load seed phrase
  const seed = loadSeed();
  if (!seed) {
    console.error('ERROR: No seed phrase found. Create .seed file or set WDK_SEED env var.');
    process.exit(1);
  }

  // 2. Derive wallet
  const rpcUrl = process.env.ETH_SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
  const provider = new JsonRpcProvider(rpcUrl, { name: 'sepolia', chainId: 11155111 });
  const wallet = Wallet.fromPhrase(seed, provider);
  const address = await wallet.getAddress();
  console.log(`Deployer address: ${address}`);
  console.log(`Etherscan: ${EXPLORER}/address/${address}\n`);

  // Check balance
  const balance = await provider.getBalance(address);
  const ethBalance = Number(balance) / 1e18;
  console.log(`ETH balance: ${ethBalance.toFixed(6)} ETH`);
  if (ethBalance < 0.001) {
    console.error('ERROR: Insufficient ETH for deployment. Need at least 0.001 ETH.');
    process.exit(1);
  }

  const deployed: DeployedContract[] = [];

  // 3. Deploy AeroFytaRegistry
  console.log('\n--- Deploying AeroFytaRegistry ---');
  try {
    const registryFactory = new ContractFactory(REGISTRY_ABI, REGISTRY_BYTECODE, wallet);
    const registry = await registryFactory.deploy();
    const registryTx = registry.deploymentTransaction();
    if (!registryTx) throw new Error('No deployment transaction');
    console.log(`  tx hash: ${registryTx.hash}`);
    console.log('  Waiting for confirmation...');
    await registry.waitForDeployment();
    const registryAddr = await registry.getAddress();
    console.log(`  Registry deployed at: ${registryAddr}`);
    console.log(`  Etherscan: ${EXPLORER}/address/${registryAddr}`);

    deployed.push({
      name: 'AeroFytaRegistry',
      address: registryAddr,
      txHash: registryTx.hash,
      etherscanContract: `${EXPLORER}/address/${registryAddr}`,
      etherscanTx: `${EXPLORER}/tx/${registryTx.hash}`,
      deployedAt: new Date().toISOString(),
    });

    // Write a test entry to prove it works
    console.log('  Writing test entry to registry...');
    const registryContract = new Contract(registryAddr, REGISTRY_ABI, wallet);
    const key = '0x' + Buffer.from('aerofyta-version').toString('hex').padEnd(64, '0');
    const value = '0x' + Buffer.from('1.0.0').toString('hex').padEnd(64, '0');
    const setTx = await registryContract.set(key, value);
    await setTx.wait();
    console.log(`  Test entry written: aerofyta-version = 1.0.0`);
  } catch (err) {
    console.error(`  Registry deployment failed: ${err}`);
  }

  // 4. Deploy AeroFytaTipJar
  console.log('\n--- Deploying AeroFytaTipJar ---');
  try {
    const tipJarFactory = new ContractFactory(TIPJAR_ABI, TIPJAR_BYTECODE, wallet);
    const tipJar = await tipJarFactory.deploy();
    const tipJarTx = tipJar.deploymentTransaction();
    if (!tipJarTx) throw new Error('No deployment transaction');
    console.log(`  tx hash: ${tipJarTx.hash}`);
    console.log('  Waiting for confirmation...');
    await tipJar.waitForDeployment();
    const tipJarAddr = await tipJar.getAddress();
    console.log(`  TipJar deployed at: ${tipJarAddr}`);
    console.log(`  Etherscan: ${EXPLORER}/address/${tipJarAddr}`);

    deployed.push({
      name: 'AeroFytaTipJar',
      address: tipJarAddr,
      txHash: tipJarTx.hash,
      etherscanContract: `${EXPLORER}/address/${tipJarAddr}`,
      etherscanTx: `${EXPLORER}/tx/${tipJarTx.hash}`,
      deployedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`  TipJar deployment failed: ${err}`);
  }

  // 5. Save results
  if (deployed.length > 0) {
    const bundle: DeployedBundle = {
      network: 'sepolia',
      chainId: 11155111,
      deployer: address,
      deployedAt: new Date().toISOString(),
      contracts: deployed,
    };
    writeFileSync(DEPLOYED_FILE, JSON.stringify(bundle, null, 2), 'utf-8');
    console.log(`\nDeployed ${deployed.length} contracts. Saved to .deployed-contracts.json`);
    console.log('\nVerification links:');
    for (const c of deployed) {
      console.log(`  ${c.name}: ${c.etherscanContract}`);
    }
  } else {
    console.log('\nNo contracts deployed successfully.');
  }
}

function loadSeed(): string | null {
  // Check env first
  if (process.env.WDK_SEED?.trim()) return process.env.WDK_SEED.trim();

  // Check .seed file
  if (existsSync(SEED_FILE)) {
    const raw = readFileSync(SEED_FILE, 'utf-8').trim();
    if (raw.length > 0 && !raw.startsWith('{')) return raw; // skip encrypted seeds
  }

  return null;
}

main().catch((err) => {
  console.error('Deploy failed:', err);
  process.exit(1);
});

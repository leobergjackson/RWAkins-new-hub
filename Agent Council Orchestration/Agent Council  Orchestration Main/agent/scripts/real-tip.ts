/**
 * AeroFyta — Real mainnet USDT tip on Polygon
 *
 * This script sends a real USDT tip on Polygon mainnet
 * using the WDK seed phrase from .env
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(import.meta.dirname, '../.env') });

const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';
const USDT_POLYGON = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'; // Real USDT on Polygon
const USDT_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// Recipient — a known public address (can be your own second wallet or a burn address)
// Using a second address to prove the transfer happened
const RECIPIENT = '0x000000000000000000000000000000000000dEaD'; // burn address as demo recipient

async function main() {
  const seed = process.env.WDK_SEED_PHRASE;
  if (!seed) {
    console.error('WDK_SEED_PHRASE not set in .env');
    process.exit(1);
  }

  console.log('AeroFyta — Real Mainnet Tip');
  console.log('===========================\n');

  // Derive wallet from seed phrase (same as WDK does)
  const wallet = ethers.Wallet.fromPhrase(seed);
  const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
  const signer = wallet.connect(provider);

  console.log(`Wallet: ${wallet.address}`);
  console.log(`Chain: Polygon Mainnet (137)`);
  console.log(`Token: USDT (${USDT_POLYGON})\n`);

  // Check POL balance for gas
  const polBalance = await provider.getBalance(wallet.address);
  console.log(`POL balance: ${ethers.formatEther(polBalance)} POL`);

  if (polBalance === 0n) {
    console.error('No POL for gas! Fund your wallet first.');
    process.exit(1);
  }

  // Check USDT balance
  const usdt = new ethers.Contract(USDT_POLYGON, USDT_ABI, signer);
  const decimals = await usdt.decimals();
  const balance = await usdt.balanceOf(wallet.address);
  console.log(`USDT balance: ${ethers.formatUnits(balance, decimals)} USDT`);

  if (balance === 0n) {
    console.error('No USDT! Fund your wallet first.');
    process.exit(1);
  }

  // Send 0.10 USDT tip
  const tipAmount = ethers.parseUnits('0.10', decimals);
  console.log(`\nSending 0.10 USDT to ${RECIPIENT}...`);

  const tx = await usdt.transfer(RECIPIENT, tipAmount);
  console.log(`TX hash: ${tx.hash}`);
  console.log(`Explorer: https://polygonscan.com/tx/${tx.hash}`);
  console.log('\nWaiting for confirmation...');

  const receipt = await tx.wait();
  console.log(`\n✅ CONFIRMED in block ${receipt.blockNumber}`);
  console.log(`Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`\n🔗 Polygonscan: https://polygonscan.com/tx/${tx.hash}`);
  console.log('\nPaste this link in the README as proof of real mainnet transaction.');
}

main().catch((err) => {
  console.error('Transaction failed:', err.message);
  process.exit(1);
});

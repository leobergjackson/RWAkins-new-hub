import hre from "hardhat";
import { parseEther } from "viem";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

// Deploys the Kubryx AI x RWA stack to Mantle Sepolia:
//   - MockRWAToken          "Kubryx USDY (Testnet Mock)" / kUSDY / 4.80% APY
//   - MockRWAToken          "Kubryx mETH (Testnet Mock)" / kMETH / 3.60% APY
//   - KubryxRWAVault        wired to both tokens
//   - AgentIdentityRegistry ERC-8004 identity NFTs for Kubryx AI agents
//   - LendingSettlement     on-chain settlement for AI-negotiated loans (Lendora)
// Then seeds the deployer with 10,000 of each token, approves the vault, registers
// the Lendora agent + authorizes the settlement contract as an ERC-8004 attestor,
// and writes every address to hub/lib/rwa-deployed.json for the front-end.
async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  if (!deployer) {
    throw new Error(
      "No deployer account. Set DEPLOYER_PRIVATE_KEY in .env.local and fund it with MNT.",
    );
  }
  const deployerAddress = deployer.account.address;
  console.log(`Deployer: ${deployerAddress}`);

  // 1. Mock RWA tokens (yield in basis points)
  const usdy = await hre.viem.deployContract("MockRWAToken", [
    "Kubryx USDY (Testnet Mock)",
    "kUSDY",
    480n,
  ]);
  console.log(`kUSDY  deployed: ${usdy.address}`);

  const meth = await hre.viem.deployContract("MockRWAToken", [
    "Kubryx mETH (Testnet Mock)",
    "kMETH",
    360n,
  ]);
  console.log(`kMETH  deployed: ${meth.address}`);

  // 2. The hero vault
  const vault = await hre.viem.deployContract("KubryxRWAVault", [
    usdy.address,
    meth.address,
  ]);
  console.log(`Vault  deployed: ${vault.address}`);

  // 3. Seed the deployer wallet and pre-approve the vault for a friction-free demo
  const seed = parseEther("10000");
  await usdy.write.mint([deployerAddress, seed]);
  await meth.write.mint([deployerAddress, seed]);
  await usdy.write.approve([vault.address, seed]);
  await meth.write.approve([vault.address, seed]);
  console.log("Minted 10,000 kUSDY + 10,000 kMETH to deployer and approved the vault.");

  // 4. ERC-8004 agent identity registry + Lendora on-chain settlement
  const registry = await hre.viem.deployContract("AgentIdentityRegistry", []);
  console.log(`Registry deployed: ${registry.address}`);

  const settlement = await hre.viem.deployContract("LendingSettlement", [
    registry.address,
  ]);
  console.log(`Settlement deployed: ${settlement.address}`);

  // Register the deployer as the Lendora negotiator agent (mints identity NFT #1),
  // and authorize the settlement contract to attest to its reputation on-chain.
  const registerHash = await registry.write.registerAgent([
    "lendora.kubryx.xyz",
    "AI Loan Negotiator",
  ]);
  await publicClient.waitForTransactionReceipt({ hash: registerHash });
  const attestorHash = await registry.write.setAttestor([settlement.address, true]);
  await publicClient.waitForTransactionReceipt({ hash: attestorHash });
  const agentId = await registry.read.agentIdOf([deployerAddress]);
  console.log(`Registered Lendora agent identity NFT #${agentId} -> ${deployerAddress}`);

  // 5. Publish addresses for the hub UI
  const out = {
    usdy: usdy.address,
    meth: meth.address,
    vault: vault.address,
    registry: registry.address,
    settlement: settlement.address,
    lendoraAgentId: Number(agentId),
    chainId: 5003,
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
  };
  const here = dirname(fileURLToPath(import.meta.url)); // invoices/contracts/scripts
  const target = resolve(here, "../../../hub/lib/rwa-deployed.json");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote addresses -> ${target}`);

  const base = "https://sepolia.mantlescan.xyz/address/";
  console.log("\nMantlescan:");
  console.log(`  kUSDY      : ${base}${usdy.address}`);
  console.log(`  kMETH      : ${base}${meth.address}`);
  console.log(`  Vault      : ${base}${vault.address}`);
  console.log(`  Registry   : ${base}${registry.address}`);
  console.log(`  Settlement : ${base}${settlement.address}`);
  console.log("\nVerify with:");
  const v = `npx hardhat verify --config contracts/hardhat.config.ts --network mantleSepolia`;
  console.log(`  ${v} ${vault.address} ${usdy.address} ${meth.address}`);
  console.log(`  ${v} ${registry.address}`);
  console.log(`  ${v} ${settlement.address} ${registry.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

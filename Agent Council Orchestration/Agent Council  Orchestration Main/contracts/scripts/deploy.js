// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Deploy all 3 smart contracts to Sepolia testnet
//
// Usage:
//   npx hardhat run scripts/deploy.js --network sepolia
//
// Prerequisites:
//   - SEPOLIA_RPC_URL in .env (free from Alchemy or Infura)
//   - Funded deployer wallet with Sepolia ETH (use https://sepoliafaucet.com)
//   - npm install (in contracts/ directory)

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("=== AeroFyta Contract Deployment ===");
  console.log("Network:         ", network);
  console.log("Deployer:        ", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("ERROR: Deployer has 0 ETH. Fund via https://sepoliafaucet.com");
    process.exit(1);
  }

  // Sepolia USDT address (Aave testnet USDT)
  const USDT_ADDRESS = process.env.USDT_ADDRESS || "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06";
  console.log("USDT token:      ", USDT_ADDRESS);
  console.log("");

  const deployed = {};

  // --- Deploy AgentRegistry ---
  console.log("[1/3] Deploying AgentRegistry...");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  deployed.AgentRegistry = registryAddr;
  console.log("      AgentRegistry deployed to:", registryAddr);

  // --- Deploy TipSplitter ---
  console.log("[2/3] Deploying TipSplitter...");
  const TipSplitter = await hre.ethers.getContractFactory("TipSplitter");
  const splitter = await TipSplitter.deploy(USDT_ADDRESS, deployer.address);
  await splitter.waitForDeployment();
  const splitterAddr = await splitter.getAddress();
  deployed.TipSplitter = splitterAddr;
  console.log("      TipSplitter deployed to:", splitterAddr);

  // --- Deploy AgentEscrow ---
  console.log("[3/3] Deploying AgentEscrow...");
  const AgentEscrow = await hre.ethers.getContractFactory("AgentEscrow");
  const escrow = await AgentEscrow.deploy(USDT_ADDRESS, deployer.address);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  deployed.AgentEscrow = escrowAddr;
  console.log("      AgentEscrow deployed to:", escrowAddr);

  // --- Write deployment manifest ---
  const manifest = {
    network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    usdtToken: USDT_ADDRESS,
    deployedAt: new Date().toISOString(),
    contracts: {
      AgentRegistry: {
        address: registryAddr,
        etherscan: `https://sepolia.etherscan.io/address/${registryAddr}`,
        constructorArgs: [deployer.address],
      },
      TipSplitter: {
        address: splitterAddr,
        etherscan: `https://sepolia.etherscan.io/address/${splitterAddr}`,
        constructorArgs: [USDT_ADDRESS, deployer.address],
      },
      AgentEscrow: {
        address: escrowAddr,
        etherscan: `https://sepolia.etherscan.io/address/${escrowAddr}`,
        constructorArgs: [USDT_ADDRESS, deployer.address],
      },
    },
  };

  const manifestPath = path.resolve(__dirname, "..", "deployments", `${network}.json`);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("\nDeployment manifest saved to:", manifestPath);

  // --- Summary ---
  console.log("\n=== Deployment Summary ===");
  console.log("Network:         ", network);
  console.log("Chain ID:        ", manifest.chainId);
  console.log("USDT token:      ", USDT_ADDRESS);
  console.log("AgentRegistry:   ", registryAddr);
  console.log("TipSplitter:     ", splitterAddr);
  console.log("AgentEscrow:     ", escrowAddr);

  console.log("\n=== Etherscan Links ===");
  console.log("AgentRegistry:   ", `https://sepolia.etherscan.io/address/${registryAddr}`);
  console.log("TipSplitter:     ", `https://sepolia.etherscan.io/address/${splitterAddr}`);
  console.log("AgentEscrow:     ", `https://sepolia.etherscan.io/address/${escrowAddr}`);

  console.log("\n=== Verify Commands ===");
  console.log(`npx hardhat verify --network ${network} ${registryAddr} "${deployer.address}"`);
  console.log(`npx hardhat verify --network ${network} ${splitterAddr} "${USDT_ADDRESS}" "${deployer.address}"`);
  console.log(`npx hardhat verify --network ${network} ${escrowAddr} "${USDT_ADDRESS}" "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

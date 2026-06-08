import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Accept either DEPLOYER_PRIVATE_KEY (used by deploy-rwa.ts) or the legacy
// PRIVATE_KEY so the existing Recibo deploy keeps working.
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    mantleSepolia: {
      type: "http",
      url: "https://rpc.sepolia.mantle.xyz",
      chainId: 5003,
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : [],
    },
  },
  // Contract verification on Mantlescan (Etherscan-compatible explorer).
  etherscan: {
    apiKey: { mantleSepolia: process.env.MANTLESCAN_API_KEY || "any" },
    customChains: [
      {
        network: "mantleSepolia",
        chainId: 5003,
        urls: {
          apiURL: "https://api-sepolia.mantlescan.xyz/api",
          browserURL: "https://sepolia.mantlescan.xyz",
        },
      },
    ],
  },
};

export default config;

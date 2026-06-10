# AeroFyta — Deployed Smart Contracts

## Network: Sepolia (Chain ID: 11155111)

| Contract | Address | Etherscan | Purpose |
|----------|---------|-----------|---------|
| **AgentRegistry** | `0x_PENDING_DEPLOYMENT` | [View](https://sepolia.etherscan.io/address/0x_PENDING_DEPLOYMENT) | On-chain identity registry for autonomous payment agents |
| **TipSplitter** | `0x_PENDING_DEPLOYMENT` | [View](https://sepolia.etherscan.io/address/0x_PENDING_DEPLOYMENT) | Splits incoming USDT tips between creators and collaborators |
| **AgentEscrow** | `0x_PENDING_DEPLOYMENT` | [View](https://sepolia.etherscan.io/address/0x_PENDING_DEPLOYMENT) | HTLC escrow — SHA-256 hash-lock + timelock for trustless payments |

## Deployment Parameters

| Parameter | Value |
|-----------|-------|
| USDT Token (Sepolia) | `0x7169D38820dfd117C3FA1f22a697dBA58d90BA06` |
| Deployer | Agent WDK wallet (Sepolia) |
| Solidity | `^0.8.20` |
| OpenZeppelin | `5.x` |

## How to Deploy

```bash
# From repo root
cd contracts
npm install
npx hardhat run scripts/deploy.js --network sepolia
```

Requires:
- `SEPOLIA_RPC_URL` in `.env` (free from Alchemy/Infura)
- Funded deployer wallet with Sepolia ETH (use faucet)

## Verification

After deployment, verify on Etherscan:

```bash
npx hardhat verify --network sepolia <REGISTRY_ADDRESS> <DEPLOYER_ADDRESS>
npx hardhat verify --network sepolia <SPLITTER_ADDRESS> <USDT_ADDRESS> <DEPLOYER_ADDRESS>
npx hardhat verify --network sepolia <ESCROW_ADDRESS> <USDT_ADDRESS> <DEPLOYER_ADDRESS>
```

## On-Chain Proof (Self-Test)

The agent automatically proves WDK wallet liveness via:

```bash
# 0-value self-transfer proving wallet control
curl -X POST http://localhost:3001/api/self-test

# Aggregated proofs with Etherscan links
curl http://localhost:3001/api/proof
```

<!-- DEPLOYMENT_TIMESTAMP_PLACEHOLDER -->

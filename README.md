<div align="center">

# RWAkins

### An AI CFO for Real-World Asset Portfolios

**Autonomous, multi-agent rebalancing of tokenized RWAs (USDY + mETH) on Mantle — with every decision debated by an AI council and recorded on-chain.**

[![Track](https://img.shields.io/badge/Track-AI%20%C3%97%20RWA-F5C518?style=flat-square)](https://dorahacks.io)
[![Network](https://img.shields.io/badge/Network-Mantle%20Sepolia-080808?style=flat-square)](https://sepolia.mantlescan.xyz)
[![Hackathon](https://img.shields.io/badge/Turing%20Test%20Hackathon-2026-F5C518?style=flat-square)](https://dorahacks.io)
[![License](https://img.shields.io/badge/License-MIT-080808?style=flat-square)](#license)

[Live Demo](#) · [Demo Video](#) · [Contracts](#deployed-contracts) · [Architecture](#architecture)

</div>

---

## Overview

**RWAkins** is an autonomous AI CFO for real-world asset portfolios. A user deposits capital, describes their financial goals in plain English, and RWAkins continuously evaluates market conditions and compliance constraints to keep the portfolio rebalanced across tokenized RWAs — **USDY** (Ondo's yield-bearing treasury token) and **mETH** (Mantle's liquid staking token).

What makes RWAkins different from a robo-advisor or a chatbot wrapper: **every rebalancing decision is made by a transparent four-agent AI council that debates, votes, and can veto** — and each decision is logged on-chain via the ERC-8004 agent identity standard. There are no black boxes. The reasoning is visible, the votes are recorded, and the outcomes are verifiable on Mantle.

Built for the **AI × RWA track** of the **Turing Test Hackathon 2026** on Mantle Network.

> **Status:** Deployed on **Mantle Sepolia testnet**. This is a hackathon prototype, not a production financial product. See [Compliance & Scope](#compliance--scope).

---

## The Problem

Managing a tokenized RWA portfolio well requires constant attention: yields shift, the volatile leg (mETH) drifts against the stable leg (USDY), risk limits get breached, and liquidity conditions change. Doing this manually is tedious and error-prone. Existing automated tools are either opaque "set-and-forget" robo-advisors with no transparency, or AI chatbots that *describe* what to do but never actually execute on-chain.

RWAkins closes that gap: an agent that genuinely **perceives, decides, and executes** — and shows its work the entire way.

---

## How It Works

### The Four-Agent Council

Every rebalancing decision is evaluated by four specialized agents that vote independently, with reasoning attached to each vote. A **3-of-4 quorum** is required to act, and the Risk Guardian holds **veto power**.

| Agent | Role | Power |
|-------|------|-------|
| 🔍 **Market Analyst** | Reads live market data (price, volatility, yield spread) and judges whether conditions favor action | Vote |
| 🛡️ **Risk Guardian** | Enforces hard constraints — most importantly that mETH allocation stays within the maximum risk limit | **Veto** |
| 💰 **Yield Optimizer** | Computes the optimal USDY / mETH weighting given current yields and the user's stated goals | Vote |
| ⚙️ **Execution Planner** | Confirms on-chain liquidity is sufficient and estimates slippage before any trade | Vote |

If the council reaches quorum and the Guardian does not veto, the rebalance executes. Every vote, its confidence score, and its rationale are recorded.

### The Rebalance Pipeline

Once approved, a rebalance runs as an eight-stage pipeline, each stage timestamped:

```
ANALYZE → PROPOSE → RISK-CHECK → APPROVE → EXECUTE → CONFIRM → LOG → RECORD
```

`EXECUTE` through `RECORD` are on-chain operations on Mantle, with the final agent reputation update written through the ERC-8004 identity registry.

---

## Features

- **Plain-English onboarding** — describe goals like "60% stable yield, 40% mETH, conservative risk" and the system parses them into machine-readable rules.
- **Four-agent AI council** — transparent, debated, vetoable decision-making rather than a single opaque model.
- **Eight-stage rebalance pipeline** — animated, timestamped, with a live link to the transaction on Mantle Explorer.
- **Portfolio risk dashboard** — a five-dimension risk view (concentration, volatility, yield stability, rebalance frequency, slippage) plus per-asset cards for USDY and mETH.
- **Compliance dashboard** — explicit treatment of KYC/AML, accredited-investor rules, jurisdiction restrictions, and a full on-chain audit trail.
- **RWA analytics** — ecosystem-level stats and allocation views, viewable without connecting a wallet.
- **Comparison view** — how the RWAkins AI CFO stacks up against manual DeFi management and traditional robo-advisors.
- **On-chain agent identity** — every agent carries an ERC-8004 identity NFT, building a permanent on-chain reputation record.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), TypeScript, React |
| Styling | Custom design system — near-black `#080808`, single gold accent `#F5C518`, Playfair Display / Inter / Fira Code |
| AI reasoning | Deterministic council engine with optional Groq (`llama-3.3-70b-versatile`) for natural-language rationale |
| Market data | Live price/volatility feeds (CoinGecko) |
| Smart contracts | Solidity, Hardhat |
| Network | Mantle Sepolia (testnet) |
| Identity | ERC-8004 agent identity standard |

---

## Architecture

```
RWAkins/
├── hub/                              # Next.js application
│   ├── app/
│   │   ├── onboarding/               # Wallet connect + plain-English intent
│   │   ├── portfolio/                # Portfolio dashboard
│   │   ├── activity/                 # Activity / decision feed
│   │   ├── agent-council/            # Live council debate, history, agent status
│   │   ├── insurance-risk-system/    # 5-dimension risk gauge + asset cards
│   │   ├── compliance/               # KYC/AML, jurisdiction, audit trail
│   │   │   └── audit-trail/          # Filterable on-chain decision log
│   │   ├── contracts/                # Deployed contract directory + explorer links
│   │   ├── rwa-analytics/            # Public ecosystem analytics (no wallet)
│   │   ├── compare/                  # RWAkins vs alternatives
│   │   └── api/
│   │       ├── rebalance/trigger/    # Council evaluation + execution endpoint
│   │       ├── saveIntent/           # Intent parsing (Groq + deterministic fallback)
│   │       └── activity/             # Portfolio value-over-time series
│   ├── components/
│   │   ├── aiCouncil/
│   │   │   ├── CouncilDialogue.tsx    # Animated 4-agent debate UI
│   │   │   └── RebalancePipeline.tsx  # 8-stage pipeline visualization
│   │   └── riskManagement/           # Risk gauge, asset cards, formula display
│   └── lib/
│       ├── aiCouncil/
│       │   ├── agents.ts             # Agent configs + vote types
│       │   └── council.ts            # evaluateCouncil() — debate + quorum + veto
│       ├── intent.ts                 # Wealth-rules model + deterministic parser
│       ├── intentStore.ts            # Wallet → parsed rules
│       └── activityStore.ts          # Decision / activity log
│
└── contracts/                        # Solidity (Hardhat)
    ├── KubryxRWAVault.sol            # RWA custody + allocation
    ├── LendingSettlement.sol         # Yield distribution / settlement
    ├── AgentIdentityRegistry.sol     # ERC-8004 agent identity
    ├── CreditPassportNFT.sol         # On-chain credit / reputation passport
    ├── MockRWAToken.sol              # Test RWA tokens (kUSDY, kMETH)
    └── scripts/deploy-rwa.ts         # Deployment script (Mantle Sepolia)
```

---

## Deployed Contracts

> Deployed and verified on **Mantle Sepolia**. Replace the placeholders below with your addresses after running the deploy script.

| Contract | Address | Explorer |
|----------|---------|----------|
| RWAVault | `<VAULT_ADDRESS>` | [View](https://sepolia.mantlescan.xyz/address/<VAULT_ADDRESS>) |
| LendingSettlement | `<SETTLEMENT_ADDRESS>` | [View](https://sepolia.mantlescan.xyz/address/<SETTLEMENT_ADDRESS>) |
| AgentIdentityRegistry (ERC-8004) | `<REGISTRY_ADDRESS>` | [View](https://sepolia.mantlescan.xyz/address/<REGISTRY_ADDRESS>) |
| CreditPassportNFT | `<PASSPORT_ADDRESS>` | [View](https://sepolia.mantlescan.xyz/address/<PASSPORT_ADDRESS>) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A wallet (e.g. MetaMask) configured for **Mantle Sepolia**
- Testnet MNT for gas — [Mantle Sepolia faucet](https://faucet.sepolia.mantle.xyz/)

### Run the frontend

```bash
git clone https://github.com/<your-username>/RWAkins.git
cd RWAkins/hub
npm install
npm run dev
```

Open [http://localhost:3000/onboarding](http://localhost:3000/onboarding), connect your wallet (Mantle Sepolia), and describe your goals.

### Environment variables

Create `hub/.env.local`:

```bash
# Optional — enables natural-language rationale on council decisions.
# Without it, the deterministic council engine still runs fully.
GROQ_API_KEY=your_groq_key

# Filled after deployment
NEXT_PUBLIC_RWA_VAULT=<VAULT_ADDRESS>
NEXT_PUBLIC_RWA_SETTLEMENT=<SETTLEMENT_ADDRESS>
NEXT_PUBLIC_RWA_AGENT_REGISTRY=<REGISTRY_ADDRESS>
NEXT_PUBLIC_RWA_CREDIT_PASSPORT=<PASSPORT_ADDRESS>
NEXT_PUBLIC_MANTLE_RPC=https://rpc.sepolia.mantle.xyz
NEXT_PUBLIC_MANTLE_CHAIN_ID=5003
```

### Deploy the contracts

```bash
cd contracts
npm install
npx hardhat run scripts/deploy-rwa.ts --network mantle-sepolia
# Copy the printed addresses into hub/.env.local, then run the printed
# `npx hardhat verify ...` commands to verify on Mantle Explorer.
```

---

## Demo Flow

1. **Onboard** — connect wallet, type your financial goal in plain English, confirm.
2. **Portfolio** — view current allocation and the five-dimension risk gauge.
3. **Trigger a rebalance** — from the Agent Council page.
4. **Watch the council** — the four agents debate, vote, and reach a decision in real time; the Guardian's veto power is shown explicitly.
5. **Pipeline** — the eight-stage pipeline animates through to on-chain execution.
6. **Verify** — the activity feed shows the completed rebalance with a transaction hash linking to Mantle Explorer; the agent decision is recorded on-chain.

---

## Why Mantle

Mantle is used as the **settlement and execution layer**, not merely a deployment target:

- RWA positions (USDY, mETH) are custodied and rebalanced through the vault on Mantle.
- Agent decisions and reputation are written on-chain via the ERC-8004 registry.
- Low gas costs make frequent, fine-grained rebalancing economically viable in a way it would not be on L1.
- The project leans directly on Mantle's RWA ecosystem — Ondo's USDY and Mantle's own mETH.

---

## Compliance & Scope

RWAkins is a **hackathon prototype on testnet**. It is not a production financial product and has not received any regulatory approval. The in-app compliance dashboard is a demonstration of *awareness* of the real constraints such a product would face, including:

- **KYC/AML** requirements before any real deposit.
- **Accredited-investor** gating for leverage-related features.
- **Jurisdiction** restrictions and sanctions (OFAC) exclusions.
- An **on-chain audit trail** so that every automated decision is independently verifiable.

Nothing here should be construed as financial advice.

---

## Roadmap

- [ ] Mainnet deployment on Mantle
- [ ] Real KYC/AML integration (e.g. Ondo, identity providers)
- [ ] Byreal Agent Skills CLI integration for a fully autonomous loop
- [ ] Additional RWA asset classes beyond USDY / mETH
- [ ] Richer risk models (VaR, Sharpe ratio, position sizing)
- [ ] Multi-chain expansion

---

## Acknowledgements

Built for the **Turing Test Hackathon 2026** on Mantle, co-hosted with Bybit, Byreal, and the Blockchain for Good Alliance, supported by DoraHacks and HackQuest. Uses Ondo's USDY and Mantle's mETH as the underlying real-world assets.

---

## License

Released under the [MIT License](LICENSE).

---

<div align="center">

**RWAkins** — AI agents managing real-world assets, in the open.

Built by Rupesh Kumar V S

</div>

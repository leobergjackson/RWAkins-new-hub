# RWAkins — AI CFO Agent on Mantle

RWAkins is a Personal CFO agent that removes the complexity of real-world asset investing. Instead of manually configuring sliders and monitoring markets, users simply describe their financial goals in a chat interface. The AI agent continuously evaluates live market data against the user's stated wealth rules and autonomously executes on-chain rebalances between two yield-bearing assets:

- **USDY** — Ondo's tokenized US Treasury bonds. The stable, low-risk leg.
- **mETH** — Mantle Staked ETH. The growth, higher-yield leg.

Yields and prices are **not hardcoded** — they are pulled live and synced on-chain (see *Live & Dynamic* below).

---

## Live & Dynamic — nothing hardcoded

Every number the agent reasons over and shows is sourced live; the on-chain state is kept in sync with the real market by the agent itself.

| System | How it's live |
|---|---|
| **Wealth-rule parsing** | An LLM (Groq, OpenAI-compatible) extracts *signals* from your plain-English goal; a deterministic priority-chain turns them into the allocation. No-key fallback is a regex parser. |
| **mETH price** | Fetched live from CoinGecko and pushed **on-chain** via `vault.setMethPrice()` by the agent owner key ([lib/rwa/oracleSync.ts](lib/rwa/oracleSync.ts)). The vault values the mETH leg at this live price — the dashboard reads it back, so `$` and `%` always reconcile. |
| **USDY & mETH yields** | Real reference APYs from DefiLlama, written on-chain via `token.setYield()` each sync; the dashboard reads `currentYield()`. |
| **Volatility** | Annualized **realized volatility** computed from CoinGecko's 7-day hourly ETH series ([lib/api/coingecko.ts](lib/api/coingecko.ts)) — not a formula. |
| **Risk council** | 4 agents (Market Analyst, Risk Guardian, Yield Optimizer, Execution Planner) are **real LLM personas** debating the live numbers ([lib/aiCouncil/council.ts](lib/aiCouncil/council.ts)). The mETH ≤ 70% cap veto is enforced in code, never delegated to the model. Deterministic per-agent fallback when the LLM is unavailable. |
| **Execution** | Real `vault.rebalance()` / `rebalanceFor()` on Mantle Sepolia → real tx hashes. Gas-gated oracle writes only fire when the live value actually drifted. |

> **On the assets:** USDY/mETH are deployed as testnet `MockRWAToken` contracts (real Ondo USDY / Mantle mETH aren't available on testnet). Their **price and yield are driven live from real-world market data**, so the economics the agent reasons over are real even though the tokens are stand-ins.

---


## Architecture

```
┌─────────────────────────────────────────────┐
│              Frontend (Next.js)              │
│  RainbowKit · Wagmi · Vercel AI SDK · Recharts│
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│           Agent Brain (API Routes)           │
│                                             │
│  POST /api/intent/parse                     │
│    └─ GPT-4o-mini: text → WealthRules JSON  │
│                                             │
│  POST /api/rebalance/trigger                │
│    └─ Reads rules + market data             │
│    └─ LLM decides: rebalance or hold        │
│    └─ Returns { usdyBps, methBps, narrative}│
│                                             │
│  GET  /api/portfolio/:wallet                │
│    └─ Reads live vault balances via viem    │
│                                             │
│  GET  /api/activity/:wallet                 │
│    └─ Returns rebalance history + tx hashes │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│         Blockchain Layer (Mantle)            │
│                                             │
│  RWAkinsVault.sol                           │
│    ├─ deposit(asset, amount)                │
│    ├─ rebalance(usdyBps, methBps)           │
│    │    ├─ Enforces usdyBps + methBps = 100%│
│    │    └─ Enforces methBps ≤ 70% (MAX_RISK)│
│    ├─ withdraw(asset, amount)               │
│    └─ getPortfolio(user) → live balances    │
│                                             │
│  MockRWAToken.sol (USDY + mETH testnet)     │
└─────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS |
| Wallet | RainbowKit, Wagmi, viem |
| AI Chat | Vercel AI SDK |
| LLM | Groq (OpenAI-compatible) — provider-agnostic via `OPENAI_BASE_URL` |
| Market data | CoinGecko (price + realized vol), DefiLlama (reference yields) |
| Agent Framework | OpenClaw / RealClaw |
| Charts | Recharts |
| Smart Contracts | Solidity 0.8.24, Foundry |
| Network | Mantle Sepolia Testnet |
| Block Explorer | Mantle Sepolia Explorer |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Foundry (for contract deployment)
- A funded Mantle Sepolia wallet (get MNT from the [Mantle faucet](https://faucet.sepolia.mantle.xyz))

### 1. Clone and install

```bash
git clone https://github.com/<your-repo>/rwakins
cd rwakins
npm install
```

### 2. Set environment variables

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=
OPENAI_API_KEY=
DEPLOYER_PRIVATE_KEY=        # funded Mantle Sepolia key — never commit this
METH_PRICE_USD=3000          # initial mETH/USDY price
```

### 3. Deploy contracts

```bash
cd hub
forge script script/Deploy.s.sol \
  --rpc-url mantle_sepolia \
  --broadcast
```

This deploys MockRWAToken (USDY), MockRWAToken (mETH), and RWAkinsVault to Mantle Sepolia. Contract addresses are written to `lib/rwa-deployed.json` automatically.

### 4. Run the frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect your wallet on Mantle Testnet.

---

## How to Use

1. **Connect** your MetaMask wallet on Mantle Sepolia Testnet
2. **Describe** your financial goals in the chat — plain English, no sliders
3. **Confirm** the AI CFO's parsed allocation plan
4. **Fund** the vault — the agent mints test USDY to your wallet and deposits it
5. **Run Rebalance** — the agent evaluates market conditions and executes on-chain
6. **View Activity** — every decision with its reason and Mantle tx hash

---

## License

MIT
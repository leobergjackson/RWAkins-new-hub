# RWAkins — AI CFO Agent on Mantle

RWAkins is a Personal CFO agent that removes the complexity of real-world asset investing. Instead of manually configuring sliders and monitoring markets, users simply describe their financial goals in a chat interface. The AI agent continuously evaluates live market data against the user's stated wealth rules and autonomously executes on-chain rebalances between two yield-bearing assets:

- **USDY** — Ondo's tokenized US Treasury bonds (~4.8% APY). The stable, low-risk leg.
- **mETH** — Mantle Staked ETH (~3.6% staking APY). The growth, higher-yield leg.

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
| LLM | GPT-4o-mini (OpenAI) |
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
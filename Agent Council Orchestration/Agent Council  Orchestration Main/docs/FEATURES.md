# AeroFyta Features

Complete feature reference for the AeroFyta autonomous payment agent.

---

## Autonomous Intelligence (Agent Brain)
- **10-step decision pipeline** — INTAKE through REPORT with full reasoning transparency
- **Multi-agent orchestration** — 3 sub-agents (TipExecutor, Guardian, TreasuryOptimizer) vote on every action with 2-of-3 consensus and Guardian veto
- **Multi-strategy engine** — Evaluates tipping, lending, DeFi, and wallet health in a unified loop
- **Predictive tipping** — Anticipates tips before the user asks using time patterns, recipient affinity, and streak detection
- **Autonomous loop** — Proposes, evaluates, and executes actions every 60 seconds
- **Memory and learning** — Pattern analysis, confidence scoring (0-100), feedback loop from user approvals/rejections
- **LLM reasoning** — Groq API (free tier) or local Ollama with regex NLP fallback
- **5 agent personalities** — Professional, Friendly, Pirate, Emoji, Minimal
- **Voice commands** — Web Speech API with live transcript

---

## WDK Wallet Integration (12 Packages)
- **9 chains** — Ethereum Sepolia, TON Testnet, TRON Nile, Bitcoin Testnet, Solana Devnet, ERC-4337 Gasless, TON Gasless, Plasma, Stable
- **Gasless transactions** — ERC-4337 (EVM) and TON gasless
- **USDT0 bridge** — Cross-chain transfers via LayerZero OFT protocol
- **Aave V3 lending** — Treasury yield generation on idle funds
- **Velora DEX swap** — Token swaps on-chain
- **HD multi-account** — BIP-44 derivation paths, 5 segregated accounts (Treasury, Hot Wallet, Community Pool, Yield, Reserve)
- **Cryptographic receipts** — WDK `account.sign()` creates tamper-proof Proof-of-Tip
- **WDK Indexer API** — Unified cross-chain balance and transfer data

### WDK Package Details

| WDK Package | Purpose |
|-------------|---------|
| `@tetherto/wdk` | Core SDK — seed generation, wallet orchestration, `dispose()` |
| `@tetherto/wdk-wallet-evm` | Ethereum wallet — `getAccount()`, `sendTransaction()`, `transfer()` |
| `@tetherto/wdk-wallet-ton` | TON wallet — native and USDT transfers |
| `@tetherto/wdk-wallet-tron` | TRON wallet — TRX and TRC-20 transfers |
| `@tetherto/wdk-wallet-btc` | Bitcoin wallet — BTC transactions |
| `@tetherto/wdk-wallet-solana` | Solana wallet — SOL transactions |
| `@tetherto/wdk-wallet-evm-erc-4337` | Gasless EVM transactions via Account Abstraction |
| `@tetherto/wdk-wallet-ton-gasless` | Gasless TON transactions |
| `@tetherto/wdk-protocol-bridge-usdt0-evm` | USDT0 cross-chain bridge (LayerZero OFT) |
| `@tetherto/wdk-protocol-swap-velora-evm` | On-chain token swaps (Velora DEX) |
| `@tetherto/wdk-protocol-lending-aave-evm` | Aave V3 supply/withdraw/borrow |
| `@tetherto/wdk-mcp-toolkit` | MCP server with 35+ built-in wallet tools |

**WDK methods used:** `WDK.getRandomSeedPhrase()`, `registerWallet()`, `getAccount()`, `getAddress()`, `getBalance()`, `getTokenBalance()`, `sendTransaction()`, `transfer()`, `quoteSendTransaction()`, `getFeeRates()`, `account.sign()`, `account.verify()`, `account.keyPair`, `dispose()`, HD derivation path indexing.

### WDK AI Toolkit Alignment

AeroFyta leverages the full [WDK AI toolkit](https://docs.wdk.tether.io/start-building/build-with-ai):

| WDK AI Feature | AeroFyta Implementation |
|---|---|
| [OpenClaw](https://openclaw.ai) ReAct agent | `OpenClawService` — Thought->Action->Observation->Reflection cycle with tool registry |
| [MCP Toolkit](https://docs.wdk.tether.io/ai/mcp-toolkit) (35 tools) | 55+ MCP tools exposed via `/api/mcp/*` — superset of official toolkit |
| [Agent Skills](https://docs.wdk.tether.io/ai/agent-skills) | Self-custodial wallet ops, swap, bridge, lend — all via WDK packages |
| [x402 Protocol](https://docs.wdk.tether.io/ai/x402) | `X402Service` — HTTP 402 micropayments for agent-to-agent commerce |
| [WDK Indexer API](https://docs.wdk.tether.io/tools/indexer-api) | `IndexerService` — on-chain balance/transfer verification |
| [Price Rates](https://docs.wdk.tether.io/tools/price-rates) | Real-time token pricing for gas economics decisions |

> **OpenClaw credit:** AeroFyta's ReAct framework is inspired by [OpenClaw](https://github.com/openclaw/openclaw) ([openclaw.ai](https://openclaw.ai)), the open-source AI agent that integrates with messaging apps and WDK wallets. Our `OpenClawService` implements the same Thought->Action->Observation->Reflection cycle with a registered tool registry, LLM-driven thought generation, and cryptographic reasoning proofs.

---

## Safety and Risk
- **Tiered approval** — Small tips auto-execute, large tips require human confirmation
- **Kill switch** — Emergency stop blocks all autonomous spending instantly
- **Risk engine** — Real-time risk scoring per transaction
- **Spending limits** — Daily, weekly, and per-tip enforcement
- **RPC failover** — Automatic fallback across multiple RPC endpoints
- **Decision logging** — Every autonomous decision logged with full reasoning chain

---

## Lending Bot (Aave V3)
- **Autonomous supply** — Idle USDT auto-deposited to Aave V3 for yield
- **Health factor monitoring** — Continuous check, auto-withdraw if health drops
- **Liquidation protection** — Proactive withdrawal before risk threshold
- **Position tracking** — Real-time view of all lending positions

---

## Autonomous DeFi Agent
- **Token swaps** — Via Velora DEX with slippage protection
- **USDT0 bridging** — Cross-chain via LayerZero OFT
- **Treasury rebalancing** — Automated fund distribution across strategies
- **DCA execution** — Dollar Cost Averaging on schedule
- **Fee arbitrage** — Cross-chain fee monitoring with optimal timing

---

## Economics
- **Treasury management** — Auto-rebalance idle funds to Aave V3 yield
- **Tip escrow** — Hold tips until conditions met (manual, 24h auto, creator confirm)
- **Tip streaming** — Continuous micro-tipping at intervals (pay-per-second)
- **Revenue smoothing** — Predictable creator income from irregular tip patterns
- **Creator analytics** — Engagement scoring, reputation tiers (Bronze to Diamond)
- **Community pools** — Collaborative fundraising with goals

---

## Platform Integration
- **Rumble-native** — Creator profiles, watch-time tracking, event-triggered tipping
- **Telegram bot** — 7 commands for tip notifications and control
- **x402 micropayments** — HTTP 402 Payment Required protocol for agent-to-agent commerce
- **MCP Server** — 55+ tools exposable to any MCP-compatible AI agent (Claude, GPT, Cursor)
- **OpenClaw skills** — Agent skills in standardized format

---

## Dashboard (118 React Components)
- **AI chat interface** — Conversational tipping with NLP intent detection
- **Analytics** — SVG charts, heatmaps, streaks, leaderboards
- **Gamification** — Achievements, daily challenges, tip goals
- **PWA** — Installable to home screen with offline support
- **5 languages** — EN/ES/FR/AR/ZH with RTL support
- **Dark/light theme** — Custom accent colors
- **Mobile responsive** — Full touch navigation with swipe gestures

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, Lucide Icons, Recharts, Framer Motion |
| **Backend** | Node.js 22+, Express 5, TypeScript 5.9, Zod validation |
| **Wallet SDK** | 12 WDK packages (see WDK Integration above) |
| **AI** | Groq API (Llama/Mixtral, free tier) + Ollama (local) + regex NLP fallback |
| **Blockchains** | Ethereum Sepolia, TON Testnet, TRON Nile, Bitcoin Testnet, Solana Devnet + 4 more |
| **Real-Time** | Server-Sent Events (SSE) — dual streams (pipeline + activity) |
| **Voice** | Web Speech API (browser-native) |
| **PWA** | Service Worker + Web App Manifest |
| **Containerization** | Docker multi-stage build + docker-compose |
| **Logging** | Winston structured logging with audit trail |
| **Prices** | Bitfinex public API (no key needed) |
| **DeFi** | Aave V3 (lending), Velora (swap), LayerZero (bridge) |

---

## How AeroFyta Differs

| Approach | Manual Tipping Bots | Rule-Based Bots | AeroFyta |
|----------|-------------------|----------------|----------|
| **Decision Making** | Human clicks every tip | If-then rules | LLM reasoning with 10-step pipeline |
| **Strategies** | Tipping only | Single purpose | 4 strategies (tip + lend + DeFi + wallet) |
| **Chain Support** | Single chain | 1-2 chains | 9 chains with intelligent routing |
| **Autonomy** | None | Basic scheduling | Full autonomous loop with learning |
| **Safety** | None | Hard limits only | Risk engine + kill switch + tiered approval + multi-agent consensus |
| **Economics** | Send and forget | Fixed amounts | Fee arbitrage + yield + escrow + streaming |
| **Verification** | Trust the explorer | Manual check | Cryptographic Proof-of-Tip with WDK signatures |
| **Interoperability** | Closed system | API only | 55+ MCP tools for any AI agent |

---

## Security

- **Self-custodial** — All keys stay local. User controls the seed phrase.
- **Seed phrase protection** — Never logged, never transmitted, never stored in plaintext outside `.seed` file.
- **Tiered approval** — Configurable thresholds determine which actions auto-execute vs. require confirmation.
- **Kill switch** — One click stops all autonomous spending immediately.
- **Rate limiting** — Per-endpoint rate limiting on all API routes.
- **Input validation** — Zod schema validation + sanitization middleware on all inputs.
- **Audit logging** — Winston structured logging with full audit trail.

---

## Known Limitations

| Area | Limitation | Reason |
|------|-----------|--------|
| **USAT/XAUT tokens** | Share USDT testnet contract on Sepolia | Same WDK `transfer()` flow — only the contract address differs. In production, Tether deploys separate USAT/XAUT contracts; the WDK integration is identical |
| **Rumble API** | HTML parsing may break on Rumble layout changes | Rumble has no public API; we parse channel/search pages directly |
| **CoinGecko rate limits** | Free tier: ~10-30 requests/min | $0 budget constraint; responses are cached to minimize calls |
| **Aave V3 on testnets** | Some testnet Aave pools lack liquidity | Lending service falls back to simulated position tracking when contracts unavailable |
| **OpenClaw reasoning** | Rule-based tool selection (no LLM for tool choice) | Minimizes API costs; LLM is used for tip decisions, OpenClaw handles data gathering |
| **Testnet only** | All transactions on Sepolia/Nile/testnet | Production deployment requires mainnet configuration and real token balances |

# AeroFyta Technical PRD

> Autonomous Multi-Chain Payment Agent powered by Tether WDK

**Version:** 1.0 | **Author:** Danish A | **Date:** March 2026 | **License:** Apache 2.0

---

## 1. Executive Summary

AeroFyta is an autonomous AI-powered payment agent that uses the Tether Wallet Development Kit (WDK) to execute intelligent, multi-chain tipping and payment operations. It combines an LLM-driven reasoning engine with real-time cross-chain fee analysis to select the optimal blockchain for every transaction, minimizing cost and maximizing speed for content creators and their audiences.

**Target users:** Content creators, community managers, tipping bot operators, and crypto-native audiences on platforms like YouTube, Telegram, and Rumble.

**Value proposition:** Zero-configuration, multi-chain tipping with AI-driven chain selection, autonomous scheduling, and a 6-layer safety architecture that prevents unauthorized or anomalous payments.

---

## 2. Problem Statement

| Problem | Impact |
|---------|--------|
| Manual chain selection for tips | Users overpay fees or pick slow networks |
| Single-chain tipping bots | Lock users into one ecosystem |
| No autonomous scheduling | Recurring tips require manual intervention each time |
| No safety guardrails | Bots can drain wallets via bugs or exploits |
| Poor creator discovery | Audiences cannot find creators worth supporting |
| No cross-chain reputation | Tipping history is siloed per blockchain |

Current tipping solutions are single-chain, manual, and lack intelligence. AeroFyta solves all six problems with an agent that thinks, decides, and acts across 9 blockchain networks simultaneously.

---

## 3. Solution Architecture

```
+------------------+     +---------------------+     +------------------+
|   Dashboard UI   |<--->|   Express REST API   |<--->|  WDK Wallets     |
|   (React/Vite)   |     |   29 route modules   |     |  (9 chains)      |
+------------------+     +---------------------+     +------------------+
                                  |
                    +-------------+-------------+
                    |             |              |
              +-----------+ +-----------+ +------------+
              | AI Engine | | Safety    | | Autonomous |
              | (Ollama)  | | (6-layer) | | Loop (60s) |
              +-----------+ +-----------+ +------------+
                    |             |              |
              +-----------+ +-----------+ +------------+
              | Memory    | | Reputation| | Economics  |
              | Service   | | Passport  | | Engine     |
              +-----------+ +-----------+ +------------+
```

**Component count:** 93 service modules, 29 route modules, 1 core agent class, 1 MCP server.

---

## 4. Agent Intelligence Design

### 4.1 ReAct Loop

The agent follows a 6-step decision pipeline for every tip:

| Step | Name | Description |
|------|------|-------------|
| 1 | INTAKE | Parse natural language or structured tip command |
| 2 | ANALYZE | Query balances and fees across all initialized chains |
| 3 | REASON | LLM selects optimal chain with confidence score |
| 4 | EXECUTE | Build and broadcast transaction via WDK |
| 5 | VERIFY | Poll for on-chain confirmation |
| 6 | REPORT | Update history, emit events, generate receipt |

### 4.2 Multi-Agent Consensus (OpenClaw)

The orchestrator service runs multiple reasoning agents in parallel:

- **Analyst** -- evaluates fee data and network health
- **Strategist** -- considers portfolio balance and risk
- **Auditor** -- validates compliance with safety policies
- **Consensus** -- majority vote with configurable quorum (default: 2/3)
- **Vote flipping** -- if confidence < 0.6, agents re-deliberate with shared context

### 4.3 Exploration Strategy

- **Epsilon-greedy** (epsilon = 0.1): 10% of decisions explore non-optimal chains to discover better routes
- **Learning**: Decision outcomes feed back into the predictor service, adjusting chain scores over time
- **Memory**: Past decisions stored in memory service with decay factor for relevance weighting

---

## 5. WDK Integration Strategy

### 5.1 Packages Used

| Package | Purpose | Chain |
|---------|---------|-------|
| `@tetherto/wdk` | Core SDK, wallet orchestration | All |
| `@tetherto/wdk-wallet-evm` | Ethereum/EVM wallet operations | Ethereum Sepolia |
| `@tetherto/wdk-wallet-ton` | TON wallet operations | TON Testnet |
| `@tetherto/wdk-wallet-tron` | Tron wallet operations | Tron Nile |
| `@tetherto/wdk-wallet-btc` | Bitcoin wallet operations | Bitcoin Testnet |
| `@tetherto/wdk-wallet-solana` | Solana wallet operations | Solana Devnet |
| `@tetherto/wdk-wallet-evm-erc-4337` | Account abstraction (gasless) | EVM chains |
| `@tetherto/wdk-wallet-ton-gasless` | Gasless TON transactions | TON Testnet |
| `@tetherto/wdk-protocol-bridge-usdt0-evm` | USDT0 cross-chain bridging | EVM-to-EVM |
| `@tetherto/wdk-protocol-swap-velora-evm` | Token swaps via Velora | EVM chains |
| `@tetherto/wdk-protocol-lending-aave-evm` | Aave lending/yield | EVM chains |
| `@tetherto/wdk-mcp-toolkit` | Model Context Protocol tools | All |

### 5.2 Supported Chains

| Chain ID | Network | Token Support |
|----------|---------|---------------|
| `ethereum-sepolia` | Ethereum Sepolia | ETH, USDT |
| `ton-testnet` | TON Testnet | TON, USDT |
| `tron-nile` | Tron Nile | TRX, USDT |
| `bitcoin-testnet` | Bitcoin Testnet | BTC |
| `solana-devnet` | Solana Devnet | SOL, USDT |
| `ethereum-sepolia-gasless` | EVM (ERC-4337) | USDT (gasless) |
| `ton-testnet-gasless` | TON Gasless | USDT (gasless) |
| `plasma` | Plasma Network | USDT |
| `stable` | Stable Network | USDT |

---

## 6. Payment Flow Design

### 6.1 Core Tip Pipeline (10 Steps)

1. User submits tip (NLP, API, Telegram, or scheduled trigger)
2. Input validation and Zod schema parsing
3. Recipient address resolution (ENS, raw address, contact book)
4. Multi-chain balance query (parallel across all wallets)
5. Fee estimation on candidate chains
6. AI chain selection with reasoning trace
7. Safety layer validation (6-layer check)
8. Transaction construction via WDK
9. Broadcast and on-chain confirmation polling
10. Receipt generation, history update, webhook notification

### 6.2 Advanced Payment Modes

| Mode | Service | Description |
|------|---------|-------------|
| **Batch tips** | `agent.ts` | Tip N recipients in a single operation |
| **Split tips** | `agent.ts` | Divide amount by percentage across recipients |
| **Scheduled tips** | `agent.ts` | Recurring daily/weekly/monthly with cron |
| **Conditional tips** | `conditions.service.ts` | Execute only when price/time/event conditions met |
| **Escrow tips** | `escrow.service.ts` | Hold funds until recipient claims or condition triggers |
| **Smart escrow** | `smart-escrow.service.ts` | Multi-party escrow with milestone-based release |
| **Streaming** | `streaming.service.ts` | Continuous micro-payments over time |
| **DCA** | `dca.service.ts` | Dollar-cost-average purchases on schedule |
| **Atomic swaps** | `atomic-swap.service.ts` | Cross-chain trustless token exchange |
| **Auto-payments** | `auto-payments.service.ts` | Rule-based autonomous recurring payments |

---

## 7. Wallet-as-Brain Paradigm

The Financial Pulse system treats wallet state as sensory input that drives agent behavior.

### 7.1 Input: Financial Pulse

```
Treasury Balance + Pending Tips + Fee History + Revenue Rate
          |
    Financial Pulse Score (0-100)
          |
    Agent Mood: conservative | moderate | aggressive
```

### 7.2 Output: 8 Behavioral Dimensions

| Dimension | Conservative | Moderate | Aggressive |
|-----------|-------------|----------|------------|
| Tip approval threshold | $1 auto | $10 auto | $50 auto |
| Chain selection bias | Cheapest only | Balance cost/speed | Speed-first |
| Batch size limit | 5 | 20 | 100 |
| Exploration rate (epsilon) | 0.05 | 0.10 | 0.20 |
| Yield allocation | 0% | 10% of idle | 30% of idle |
| Fee arbitrage | Disabled | Passive | Active |
| Cross-chain bridging | Disabled | On request | Automatic |
| Autonomous loop interval | 120s | 60s | 30s |

---

## 8. Safety and Security Architecture

### 8.1 Six-Layer Safety Model

```
Layer 6: LLM-Cannot-De-Escalate Rule
Layer 5: Guardian Veto (kill switch)
Layer 4: Orchestrator Consensus (2/3 vote)
Layer 3: Risk Engine (anomaly scoring)
Layer 2: Anomaly Detection (statistical)
Layer 1: Policy Enforcement (hard limits)
```

| Layer | Service | Function |
|-------|---------|----------|
| 1 -- Policy | `policy-enforcement.service.ts` | Hard spending limits, blocklists, rate limiting |
| 2 -- Anomaly | `anomaly-detection.service.ts` | Statistical deviation detection on amount/frequency |
| 3 -- Risk | `risk-engine.service.ts` | Composite risk score from multiple signals |
| 4 -- Consensus | `orchestrator.service.ts` | Multi-agent vote; requires 2/3 agreement to proceed |
| 5 -- Guardian | `safety.service.ts` | Master kill switch, spend ceiling, manual approval queue |
| 6 -- Immutable | Architecture rule | Safety tier can only escalate, never de-escalate in a single pipeline run |

### 8.2 Tiered Approval

| Tier | Threshold | Action |
|------|-----------|--------|
| `auto` | Amount < policy limit | Execute immediately |
| `flagged` | Amount triggers anomaly score | Execute with audit log entry |
| `manual_required` | Amount exceeds ceiling or new recipient | Queue for human approval |

### 8.3 Recovery

- Try/catch with rollback on every transaction step
- Failed transactions enter recovery queue with automatic retry (3 attempts, exponential backoff)
- Spend log persisted to disk for crash recovery

---

## 9. Data Pipeline

### 9.1 Four-Tier Priority System

| Tier | Source | Latency | Service |
|------|--------|---------|---------|
| 1 (highest) | YouTube Data API | Real-time | `youtube-api.service.ts` |
| 2 | Platform webhooks | Near-real-time | `webhook-receiver.service.ts` |
| 3 | RSS feeds | 5-minute poll | `rss-aggregator.service.ts` |
| 4 (fallback) | Event simulator | Synthetic | `event-simulator.service.ts` |

The system degrades gracefully: if the YouTube API quota is exhausted, it falls back to webhooks, then RSS, then simulated events for demo purposes.

### 9.2 Platform Adapters

The `platform-adapter.service.ts` normalizes events from YouTube, Telegram, and Rumble into a unified `EngagementEvent` schema, enabling chain-agnostic creator discovery and tipping.

---

## 10. Economic Model

### 10.1 Creator Scoring

Creators receive a composite score (0-100) based on:

- Content frequency and consistency
- Audience engagement rate
- Historical tip acceptance rate
- Cross-platform presence

### 10.2 Revenue Split

| Recipient | Percentage | Purpose |
|-----------|-----------|---------|
| Creator | 90% | Direct payment to content creator |
| Treasury | 5% | Agent operational fund (fees, gas) |
| Protocol | 5% | Platform sustainability |

### 10.3 Fee Optimization

- `fee-arbitrage.service.ts` monitors gas prices across chains in real-time
- Tips are batched during high-fee periods and released when fees drop
- Revenue smoothing spreads income across time windows to avoid spikes

### 10.4 Yield Generation

- Idle treasury funds deposited into Aave via `lending.service.ts`
- Yield earnings fund future gas fees, making the agent self-sustaining
- `economics.service.ts` tracks P&L, burn rate, and runway projections

---

## 11. Cross-Chain Reputation System

### 11.1 Reputation Passport

The `reputation-passport.service.ts` maintains a portable reputation score:

- **Inputs:** Tip count, total volume, chain diversity, consistency, time-weighted history
- **Score range:** 0-1000 with tier labels (Newcomer, Regular, Patron, Benefactor, Legend)
- **Achievements:** 20+ unlockable badges (First Tip, Cross-Chain Explorer, Whale Tipper, etc.)

### 11.2 Portability

- Reputation data serialized as JSON for import/export
- Scores are chain-agnostic (activity on any chain contributes)
- Leaderboard system ranks users by composite score

---

## 12. x402 Micropayment Integration

The `x402-payment.service.ts` implements the HTTP 402 Payment Required standard:

- Paywalled API endpoints return `402` with a payment challenge
- Client submits USDT micropayment via WDK
- Server verifies on-chain payment and grants access
- Enables pay-per-query API monetization for the agent itself

---

## 13. Testing Strategy

### 13.1 Test Suites

| Suite | File | Coverage |
|-------|------|----------|
| Core agent + API | `agent.test.ts`, `api.test.ts` | Agent pipeline, REST endpoints |
| Services | `services.test.ts` | All service modules |
| Analytics & discovery | `analytics-discovery.test.ts` | Creator scoring, fee arbitrage |
| Memory & personality | `memory-personality.test.ts` | Persistent memory, mood system |
| Payments & DeFi | `payments-defi.test.ts` | Escrow, streaming, DCA, lending |
| Safety & risk | `safety-risk.test.ts` | All 6 safety layers, edge cases |
| Integration | `integration.test.ts` | End-to-end flows |

### 13.2 Adversarial Scenarios

The `adversarial-demo.service.ts` tests safety under attack conditions:

- Rapid-fire tip attempts (rate limit testing)
- Oversized tip amounts (budget ceiling enforcement)
- Blocklisted recipient addresses
- Simultaneous multi-chain drain attempts

### 13.3 Running Tests

```bash
npm test                    # All unit/integration tests
npm run test:e2e            # Testnet end-to-end
npm run test:coverage       # Coverage report
```

---

## 14. Deployment Architecture

### 14.1 One-Command Startup

```bash
# Development
npm install && npm run dev

# Production (Docker)
docker compose up --build
```

### 14.2 Container Layout

| Container | Port | Purpose |
|-----------|------|---------|
| `aerofyta-agent` | 3001 | Backend API + autonomous loop |
| `aerofyta-dashboard` | 80 | React dashboard (Nginx) |

### 14.3 Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SEED_PHRASE` | Yes | WDK wallet seed (BIP-39 mnemonic) |
| `OLLAMA_URL` | No | LLM endpoint (default: localhost:11434) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot integration |
| `YOUTUBE_API_KEY` | No | YouTube Data API access |
| `PORT` | No | API port (default: 3001) |

---

## 15. API Reference Summary

### 15.1 Endpoint Categories

| Category | Route Prefix | Endpoints | Module |
|----------|-------------|-----------|--------|
| Wallet | `/api/wallet` | Balance, addresses, status | `wallet.routes.ts` |
| Tips | `/api/tip` | Send, batch, split, schedule | `tip.routes.ts` |
| Chat | `/api/chat` | Natural language interaction | `chat.routes.ts` |
| Autonomy | `/api/autonomy` | Loop control, policies | `autonomy.routes.ts` |
| DeFi | `/api/defi` | Lending, yield, strategies | `defi.routes.ts` |
| Escrow | `/api/escrow` | Create, claim, dispute | `escrow.routes.ts` |
| Streaming | `/api/streaming` | Start, stop, status | `streaming.routes.ts` |
| Reputation | `/api/reputation` | Score, passport, leaderboard | `reputation.routes.ts` |
| Analytics | `/api/analytics` | Creator scores, fee data | `analytics.routes.ts` |
| Rumble | `/api/rumble` | Platform integration | `rumble.routes.ts` |
| Protocol | `/api/protocol` | Bridge, swap, atomic ops | `protocol.routes.ts` |
| Payments | `/api/payments` | Auto-payments, DCA | `payments.routes.ts` |
| Governance | `/api/governance` | Proposals, voting | `governance.routes.ts` |
| Settings | `/api/settings` | Agent configuration | `settings.routes.ts` |
| x402 | `/api/x402` | Micropayment challenges | `x402-payment.routes.ts` |

### 15.2 Key Endpoints

```
POST /api/tip/send              Send a tip (AI selects chain)
POST /api/tip/batch             Batch tip multiple recipients
POST /api/chat/message          Natural language tip command
GET  /api/wallet/balances       All chain balances
GET  /api/autonomy/status       Autonomous loop state
POST /api/escrow/create         Create escrowed tip
GET  /api/reputation/passport   Cross-chain reputation score
GET  /api/analytics/creators    Top creator rankings
```

---

## 16. Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Runtime | Node.js 22+ | Required by WDK; native ESM, test runner |
| Language | TypeScript 5.x | Type safety across 93 service modules |
| Framework | Express 5 | Lightweight, well-known HTTP framework |
| AI/LLM | Ollama (local) | Zero-cost, privacy-preserving, no API keys |
| Validation | Zod 4 | Runtime schema validation for all inputs |
| Logging | Winston | Structured logging with levels |
| Crypto | ethers.js 6 | Ethereum utilities, ABI encoding |
| ZK Proofs | snarkjs | Zero-knowledge proof generation |
| Frontend | React 19 + Vite | Fast builds, modern React features |
| Styling | Tailwind CSS 4 | Utility-first, responsive design |
| Database | JSON files (SQLite optional) | Zero-config persistence |
| Container | Docker + Docker Compose | One-command deployment |
| Bot | Telegram Bot API | Direct messaging integration |

---

## 17. Security Considerations

### 17.1 Seed Phrase Protection

- Seed phrase loaded from environment variable only (never hardcoded)
- `.env` file excluded from version control via `.gitignore`
- AES-256 encryption available for at-rest seed storage

### 17.2 Input Sanitization

- All API inputs validated through Zod schemas (`utils/schemas.ts`)
- SQL injection N/A (no SQL database in default config)
- XSS prevention via React's built-in escaping

### 17.3 Tool Blocklist

The safety service maintains a blocklist of high-risk operations that require elevated approval:
- Direct seed phrase export
- Bulk wallet drain operations
- Policy de-escalation attempts

### 17.4 Rate Limiting

- Per-endpoint rate limiting via `rateLimited` decorator
- Autonomous loop capped at one cycle per 60 seconds minimum
- Batch tip size capped by financial pulse mood

---

## 18. Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Autonomous loop cycle | 60s default | Adjustable 30s-120s by mood |
| Batch settlement window | 10s | Tips grouped for gas efficiency |
| Cache TTL | 5 min | Balance and fee data |
| Chain analysis latency | <2s | Parallel RPC queries |
| LLM reasoning time | 1-5s | Depends on Ollama model size |
| Transaction confirmation | Chain-dependent | ETH ~15s, TON ~5s, Tron ~3s |
| API response time | <100ms | Non-transaction endpoints |
| Max concurrent chains | 9 | All chains queried in parallel |

---

## 19. Scalability Path

| Current (v1) | Near-term (v2) | Long-term (v3) |
|-------------|----------------|----------------|
| JSON file persistence | SQLite via `better-sqlite3` | PostgreSQL + Redis |
| Single agent process | Worker threads for chains | Horizontal agent swarm |
| Local Ollama LLM | Cloud LLM fallback | Multi-model ensemble |
| Event simulator | Real webhook receivers | Full platform API integration |
| Manual Telegram setup | OAuth bot registration | Multi-platform bot deployment |
| Testnet only | Testnet + guarded mainnet | Full mainnet with insurance |

---

## 20. Future Roadmap

### Phase 1: Post-Hackathon (Q2 2026)
- Mainnet deployment with real USDT
- YouTube and Rumble API production credentials
- Mobile-responsive PWA dashboard

### Phase 2: Platform Expansion (Q3 2026)
- Twitch, X (Twitter), Discord bot integrations
- Fiat on-ramp via Tether P2P
- Multi-language support (i18n framework already in place)

### Phase 3: Ecosystem (Q4 2026)
- Agent marketplace for custom tipping strategies
- DAO governance for protocol parameters
- ZK-proof verified tipping for privacy-sensitive creators

---

## 21. Judging Criteria Alignment

| Criterion | Score Target | Key Features |
|-----------|-------------|--------------|
| **1. Agent Intelligence** | High | ReAct loop, OpenClaw multi-agent consensus, epsilon-greedy exploration, memory + learning, predictor service, financial pulse mood system |
| **2. WDK Wallet Integration** | High | 12 WDK packages, 9 chains, gasless transactions, bridging, swaps, lending via Aave, MCP toolkit integration |
| **3. Technical Execution** | High | 93 services, 29 route modules, TypeScript throughout, Zod validation, structured logging, Docker deployment |
| **4. Agentic Payment Design** | High | 10-mode payment system (batch, split, scheduled, conditional, escrow, smart escrow, streaming, DCA, atomic swap, auto-pay), autonomous 60s loop |
| **5. Originality** | High | Wallet-as-Brain paradigm, 6-layer safety architecture, cross-chain reputation passport, x402 micropayments, adversarial safety testing |
| **6. Polish & Ship-ability** | High | One-command startup, Docker Compose, React dashboard, Telegram bot, clean error states, graceful degradation |
| **7. Presentation & Demo** | High | Live testnet transactions, real-time dashboard, natural language chat, demo scenarios with simulated events |

---

## Appendix A: Service Module Inventory

93 service modules organized by domain:

| Domain | Count | Key Services |
|--------|-------|-------------|
| Core AI | 8 | `ai.service`, `ai-llm`, `ai-entities`, `ai-intents`, `ai-analysis`, `openclaw.service`, `openclaw-react`, `openclaw-reasoning` |
| Wallet & Chain | 6 | `wallet.service`, `wallet-ops`, `wallet-chains`, `wallet-swarm`, `rpc-failover`, `ens.service` |
| Payments | 10 | `escrow`, `smart-escrow`, `streaming`, `dca`, `auto-payments`, `atomic-swap`, `tip-queue`, `tip-policy`, `tip-propagation`, `qr-merchant` |
| Safety | 5 | `safety`, `risk-engine`, `anomaly-detection`, `policy-enforcement`, `adversarial-demo` |
| DeFi | 5 | `lending`, `lending-credit`, `swap`, `bridge`, `defi-strategy` |
| Economics | 4 | `economics`, `economics-yield`, `revenue-smoothing`, `fee-arbitrage` |
| Social | 6 | `reputation`, `reputation-passport`, `proof-of-engagement`, `creator-analytics`, `creator-discovery`, `rumble` |
| Platform | 7 | `telegram`, `platform-adapter`, `youtube-api`, `youtube-rss`, `rss-aggregator`, `webhook-receiver`, `webhook-simulator` |
| Intelligence | 8 | `autonomy`, `autonomous-loop`, `orchestrator`, `predictor`, `memory`, `personality`, `decision-log`, `financial-pulse` |
| Infrastructure | 8 | `persistence`, `service-registry`, `event-simulator`, `push-notification`, `x402-payment`, `export`, `demo`, `agent-identity` |
| Advanced | 8 | `multi-strategy`, `multisig`, `governance`, `trading-swarm`, `agent-marketplace`, `self-sustaining`, `tax-reporting`, `zk-privacy` |
| Utilities | 5 | `templates`, `contacts`, `challenges`, `limits`, `goals`, `conditions`, `tags`, `retry`, `credit-scoring` |

---

## Appendix B: Type System

Key TypeScript interfaces (from `src/types/index.ts`):

| Type | Purpose |
|------|---------|
| `ChainId` | Union of 9 supported chain identifiers |
| `TokenType` | `native`, `usdt`, `usat`, `xaut` |
| `TipRequest` | Inbound tip command |
| `TipResult` | Transaction outcome with full trace |
| `AgentDecision` | Chain selection with reasoning steps |
| `ChainAnalysis` | Per-chain fee and status evaluation |
| `BatchTipRequest/Result` | Multi-recipient operations |
| `SplitTipRequest/Result` | Percentage-based splits |
| `ScheduledTip` | Cron-based recurring tips |
| `ApprovalTier` | `auto`, `flagged`, `manual_required` |
| `PolicyValidation` | Safety layer decision record |

---

*This document was generated to accompany the Colibri submission for Ethereum Mexico 2026.*

# Changelog

All notable changes to AeroFyta are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.1.0] — 2026-03-24

### Added
- **Telegram bot** — full agent interaction via `@AeroFytaBot` with 9 commands and natural language support
- **Chrome extension** — in-page tipping on Rumble and YouTube with real-time engagement detection
- **3 smart contracts** deployed to Sepolia: AgentRegistry, TipSplitter, AgentEscrow (HTLC)
- **A2A protocol** — agent-to-agent communication for multi-agent payment coordination
- **Merkle proof audit trail** — tamper-evident logging of all agent decisions
- **Wallet-as-Brain feedback loop** — wallet health drives agent mood and behavior in real-time
- **Kill switch endpoint** — `POST /api/agent/kill` freezes all autonomous operations instantly
- **Self-test endpoint** — `POST /api/self-test` proves WDK wallet liveness with on-chain 0-value transfer
- **Full proof bundle** — `POST /api/proof/generate-all` runs all verification steps with Etherscan links

### Changed
- Agent mood system now uses exponential moving average smoothing instead of threshold-based transitions
- Guardian veto logging includes full 8-dimension risk vector
- Dashboard updated to 42 pages with dark/light theme support

### Fixed
- Crash-proofed all dashboard pages (Demo, Wallets, Escrow, Sparkline)
- Chat action buttons and Tips Send Tip now functional end-to-end
- README corrected with proper project name and YouTube link

---

## [1.0.0] — 2026-03-22

### Added
- **12 WDK packages** integrated — deepest WDK usage in the hackathon
- **9 blockchain support** — Ethereum, Polygon, Arbitrum, Avalanche, Celo, TON, Tron, Bitcoin, Solana
- **603 API endpoints** with OpenAPI documentation
- **97+ MCP tools** for external AI system integration
- **107 CLI commands** via `npx @xzashr/aerofyta`
- **42-page dashboard** — React 19 + Vite + Tailwind with Wallet-as-Brain radar visualization
- **Published npm package** — `@xzashr/aerofyta`
- **Docker support** — `docker-compose up --build` for one-command deployment
- **Render deployment** — live at [aerofyta.xzashr.com](https://aerofyta.xzashr.com)
- **ERC-4337 gasless transactions** on all EVM chains
- **TON gasless tipping** via `wdk-wallet-ton-gasless`
- **Aave V3 yield optimization** — auto-supply idle USDT, track positions
- **USDT0 bridge** — LayerZero OFT cross-chain transfers
- **Velora swap** — DEX aggregation for token swaps
- **x402 machine payments** — HTTP 402 agent-to-agent payment protocol
- **6 payment flows** — direct tip, HTLC escrow, DCA, subscriptions, streaming, multi-party splits
- **Epsilon-greedy exploration** — 10% exploratory decisions for continuous learning

### Changed
- Migrated from single-agent to multi-agent consensus architecture
- Fee optimization now considers all 9 chains simultaneously

---

## [0.9.0] — 2026-03-20

### Added
- **OpenClaw ReAct engine** — 5-iteration reasoning loop (Thought, Action, Observe, Reflect, Decide)
- **Multi-agent consensus** — 3 agents (TipExecutor, Guardian, TreasuryOptimizer) vote on every transaction
- **Guardian veto system** — unilateral override for safety-critical decisions
- **Rumble scraping** — real-time creator engagement data extraction
- **YouTube integration** — channel metrics via YouTube Data API v3
- **LLM cascade** — Groq (llama-3.3-70b) primary, Gemini (2.0 Flash) fallback, rule-based final fallback
- **Risk engine** — 8-dimension scoring (amount, frequency, recipient trust, chain risk, gas ratio, wallet impact, historical pattern, consensus confidence)
- **10-step decision pipeline** — Intake, Limit Check, Analyze, Fee Optimize, Economic Check, Reason, Consensus, Execute, Verify, Report

### Changed
- Agent loop now runs autonomously on configurable intervals
- Decision logging expanded to include full reasoning traces

---

## [0.8.0] — 2026-03-18

### Added
- **WDK wallet management** — create, list, and manage wallets across multiple chains
- **EVM wallet support** — Ethereum, Polygon, Arbitrum, Avalanche, Celo via `wdk-wallet-evm`
- **TON wallet support** — native USDT operations via `wdk-wallet-ton`
- **Tron wallet support** — TRC-20 USDT via `wdk-wallet-tron`
- **Bitcoin wallet support** — native BTC via `wdk-wallet-btc`
- **Solana wallet support** — SPL tokens via `wdk-wallet-solana`
- **HD seed management** — BIP-39 auto-generation, `.seed` file storage, env var override
- **Basic tip flow** — parse intent, select chain, execute transfer, confirm on-chain
- **Wallet health scoring** — liquidity, diversification, velocity metrics
- **Express API server** — initial route structure for wallet and agent operations
- **Rate limiting** — per-minute, per-hour, per-day transaction caps

### Fixed
- WDK initialization timeout handling for slow testnet RPC connections
- Nonce synchronization across concurrent EVM transactions

---

## [0.5.0] — 2026-03-15

### Added
- **Project scaffolding** — monorepo structure with agent, dashboard, contracts, extension, docs
- **Architecture design** — Wallet-as-Brain concept, multi-agent consensus model, 10-step pipeline
- **TypeScript configuration** — strict mode, path aliases, build pipeline
- **Vitest setup** — test framework configuration with coverage reporting
- **Development tooling** — concurrent dev servers (agent + dashboard), hot reload
- **Apache 2.0 license**
- **Initial documentation** — README, design decisions, feature specification

---

[1.1.0]: https://github.com/agdanish/aerofyta/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/agdanish/aerofyta/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/agdanish/aerofyta/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/agdanish/aerofyta/compare/v0.5.0...v0.8.0
[0.5.0]: https://github.com/agdanish/aerofyta/releases/tag/v0.5.0

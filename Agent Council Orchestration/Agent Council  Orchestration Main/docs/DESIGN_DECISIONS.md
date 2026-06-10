# Design Decisions

> Architectural choices made deliberately for AeroFyta, with justifications and production upgrade paths.

---

### Decision: No NestJS

**Why:** Express 5 was chosen for lightweight deployment and zero-config setup. NestJS adds 50+ decorator dependencies and a complex DI system. For a hackathon with a one-command startup requirement (`npm run dev`), Express is the right choice.

**Alternative:** Express 5 with a clean service-layer architecture (90+ services with explicit dependency injection via constructor parameters). Route modules are organized by domain (wallet, tip, defi, chat, etc.).

**Production path:** If the codebase grows beyond 150+ services, migrate to NestJS modules. The existing service classes map 1:1 to NestJS providers.

---

### Decision: No PostgreSQL by Default

**Why:** JSON file persistence enables zero-dependency startup. `npm run dev` works without a database server, Docker, or any external service. This is critical for hackathon judges who need to evaluate quickly.

**Alternative:** JSON file storage with atomic writes and backup rotation. All persistence goes through a single `MemoryService` abstraction, making the storage backend swappable.

**Production path:** Swap `MemoryService` to use PostgreSQL or SQLite. The interface is already abstracted — only the read/write implementation changes. Set `PERSISTENCE_MODE=sqlite` for a single-file database without a server.

---

### Decision: No Monorepo Workspaces

**Why:** Agent and dashboard are separate npm projects with independent `package.json`, `tsconfig.json`, and build pipelines. This simplifies Docker containerization (each gets its own `Dockerfile`) and allows independent deployment and scaling.

**Alternative:** A root `package.json` with a unified `npm run dev` script that starts both projects concurrently using `concurrently`. Each project builds and tests independently.

**Production path:** If a third package (e.g., shared types) is added, adopt npm/pnpm workspaces. The current structure already has clean boundaries that map directly to workspace packages.

---

### Decision: No WebSocket

**Why:** SSE (Server-Sent Events) provides the same real-time capability with simpler infrastructure. SSE works through HTTP proxies, CDNs, and load balancers without special configuration. It uses standard HTTP, so no upgrade handshake or connection management is needed.

**Alternative:** The agent streams reasoning steps, decision outcomes, and wallet events to the dashboard via SSE endpoints (`/api/stream`, `/api/chat`). The dashboard reconnects automatically on disconnect.

**Production path:** If bidirectional communication is needed (e.g., collaborative editing), add a WebSocket layer alongside SSE. The current SSE streams would remain for broadcast events.

---

### Decision: No Bitfinex WDK Pricing Package

**Why:** We use the Bitfinex public REST API directly (free, no API key required) via our own `IndexerService`. The WDK pricing package would add a dependency without additional value since we only need spot prices for a small set of tokens.

**Alternative:** `IndexerService` fetches prices from the Bitfinex v2 public API with caching, retry logic, and fallback to CoinGecko. This gives us full control over caching strategy and error handling.

**Production path:** If Bitfinex adds rate limiting or requires authentication, switch to the WDK pricing package. The `IndexerService` interface remains the same.

---

### Decision: No WDK Secret Manager Package

**Why:** We implement AES-256-GCM encryption directly, giving us full control over the encryption scheme, key derivation (PBKDF2), and storage format. This avoids an opaque dependency for a security-critical component.

**Alternative:** `WalletService` handles seed encryption/decryption using Node.js `crypto` module with AES-256-GCM, random IVs, and authentication tags. Seeds are stored encrypted at rest in `.wdk-seed`.

**Production path:** Adopt the WDK secret manager when it supports HSM backends or cloud KMS integration. Our encryption interface is compatible.

---

### Decision: No WDK Agent-Skills Package

**Why:** We implement OpenClaw interop via `SKILL.md` and `.openclaw/agents/` configuration files, which is the standard approach documented in the OpenClaw specification. The agent-skills package is not required for compliance.

**Alternative:** A hand-written `SKILL.md` declares all agent capabilities, and the MCP server exposes 62 custom tools plus 35 WDK built-in tools. Any OpenClaw-compatible agent can discover and invoke AeroFyta's skills.

**Production path:** If the agent-skills package adds runtime features (skill versioning, capability negotiation), adopt it. Our SKILL.md is already compliant with the spec.

---

### Decision: No Mainnet Deployment

**Why:** $0 budget constraint. Mainnet deployment requires real ETH for gas, real USDT for tipping, and production RPC endpoints. All WDK integration patterns are production-ready and testnet-verified.

**Alternative:** All chains run on testnets (Sepolia, TON Testnet, TRON Nile, BTC Testnet, Solana Devnet). The architecture is identical to mainnet — only RPC URLs and contract addresses differ.

**Production path:** Change `NETWORK=mainnet` in `.env`, update RPC URLs and contract addresses. No code changes required. The WDK SDK handles network-specific logic internally.

---

### Decision: No Candide/Pimlico Bundler

**Why:** ERC-4337 gasless transactions are registered via WDK's `wdk-wallet-evm-erc-4337` package, but bundler services (Candide, Pimlico, Alchemy) require paid API keys or have restrictive free tiers.

**Alternative:** The ERC-4337 account abstraction pattern is fully implemented — UserOperation construction, paymaster integration, and bundler submission are coded. The system falls back to standard transactions when no bundler is configured.

**Production path:** Set `BUNDLER_URL` and `PAYMASTER_URL` in `.env` to activate gasless transactions. Pimlico offers a free tier for hackathon projects.

---

### Decision: No Custom Test Token Deployment

**Why:** We use Aave's official Sepolia faucet for test USDT, which is the standard approach for Aave V3 testing. Deploying a custom ERC-20 would not be recognized by any DeFi protocol.

**Alternative:** `POST /api/advanced/aave/mint-test-usdt` mints test tokens via Aave's faucet contract on Sepolia. This produces real ERC-20 tokens that work with Aave V3's lending pools.

**Production path:** On mainnet, use real USDT (already supported by WDK). No faucet minting needed.

---

### Decision: No MoonPay Fiat On/Off-Ramp

**Why:** MoonPay requires KYC verification, business registration, and a contractual relationship. These are not feasible for a hackathon testnet project with a $0 budget and solo developer.

**Alternative:** The dashboard includes QR code generation for receiving crypto and clear faucet links for testnet funding. The architecture supports adding fiat ramps as a plugin.

**Production path:** Integrate MoonPay, Transak, or Ramp Network SDK. The wallet service already exposes deposit addresses per chain.

---

### Decision: No OTC Desk

**Why:** P2P mobile money exchange requires payment provider partnerships (M-Pesa, GCash), regulatory compliance (money transmitter licenses), and escrow infrastructure. Out of scope for a hackathon.

**Alternative:** HTLC-based escrow provides trustless P2P exchange without custodying funds. Two parties can swap assets atomically using hash-locked contracts on any supported chain.

**Production path:** Partner with a licensed payment provider and use HTLC escrow as the settlement layer. The cryptographic primitives are already implemented.

---

### Decision: No Morpho Blue / Pendle Adapters

**Why:** We focused on Aave V3 (the most widely-used lending protocol with Sepolia deployment) and Uniswap V3 (the most widely-deployed DEX on testnets). Adding more protocols increases surface area without demonstrating new WDK patterns.

**Alternative:** The `LendingService` and `SwapService` use protocol-agnostic interfaces. Aave V3 and Uniswap V3 are implemented as concrete adapters behind these interfaces.

**Production path:** Add `MorphoAdapter` and `PendleAdapter` implementing the same `LendingProtocol` interface. The agent's strategy layer works without modification.

---

### Decision: No Vault Smart Contract

**Why:** We use HD wallet vault derivation (BIP-44 account paths) for escrow fund isolation. This achieves the same fund separation without Solidity deployment costs, contract audit requirements, or chain-specific smart contract logic.

**Alternative:** Each escrow, treasury reserve, and DCA plan gets its own derived HD wallet address. Funds are cryptographically isolated — compromising one path does not expose others. Reference Solidity contracts are included in `/contracts/` for production use.

**Production path:** Deploy the vault contract for on-chain composability (other contracts can interact with escrowed funds). The HD wallet approach continues to work for non-composable use cases.

---

### Decision: No Counter-Offer LLM Negotiation

**Why:** Our multi-agent deliberation with vote flipping achieves a more sophisticated negotiation pattern. Three agents (TipExecutor, Guardian, TreasuryOptimizer) debate with 2-round peer reasoning and can change their votes based on peer evidence. An LLM tie-breaker resolves split decisions.

**Alternative:** The 3-agent consensus system provides structured negotiation: each agent presents evidence, peers can rebut, and votes can flip. This is more predictable and auditable than free-form LLM negotiation.

**Production path:** Add a `NegotiationAgent` that uses the existing deliberation framework for multi-party payment negotiations (e.g., freelancer rate negotiation, invoice disputes).

---

### Decision: No Auto-Collection from Borrower Wallets

**Why:** Auto-collection would require storing borrower seed phrases or private keys, which is a security anti-pattern. Custodying user keys creates liability and trust issues that are inappropriate for an autonomous agent.

**Alternative:** HTLC escrow and atomic swap patterns achieve trustless settlement without custodying borrower keys. The borrower initiates repayment, and the hash-lock ensures atomicity. Overdue loans trigger reputation penalties rather than forced collection.

**Production path:** Use smart contract-based lending pools (like Aave) where repayment is enforced by the protocol's liquidation mechanism, not by key custody.

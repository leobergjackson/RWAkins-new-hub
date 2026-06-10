# AeroFyta Architecture

## System Overview

```
+===========================================================================+
|                           USER LAYER                                      |
|                                                                           |
|   +-------------+  +--------------+  +----------------+  +-----------+   |
|   |  Dashboard   |  | Telegram Bot |  | Chrome         |  |    CLI    |   |
|   |  (React 19)  |  | (@AeroFyta)  |  | Extension      |  | 107 cmds  |   |
|   |  42 pages    |  | Grammy       |  | Rumble/YouTube |  | npm pkg   |   |
|   +------+------+  +------+-------+  +-------+--------+  +-----+-----+   |
|          |                 |                  |                  |         |
+===========================================================================+
           |                 |                  |                  |
           v                 v                  v                  v
+===========================================================================+
|                           API LAYER                                       |
|                                                                           |
|   +-------------------------------------------------------------------+   |
|   |                    Express 5 Server                               |   |
|   |               603 REST Endpoints + WebSocket                      |   |
|   |                  Swagger UI / OpenAPI                             |   |
|   +-------------------------------------------------------------------+   |
|   |  Rate Limiting  |  Circuit Breakers  |  Input Sanitization        |   |
|   +-------------------------------------------------------------------+   |
|                                                                           |
+===========================================================================+
                                    |
                                    v
+===========================================================================+
|                          AGENT LAYER                                      |
|                                                                           |
|   +-------------------+    +---------------------+    +--------------+    |
|   | OpenClaw ReAct    |    | Multi-Agent         |    | Guardian     |    |
|   | Engine            |    | Consensus           |    | Veto         |    |
|   |                   |    |                     |    |              |    |
|   | 1. Thought        |    | TipExecutor   [1v]  |    | Safety       |    |
|   | 2. Action         |--->| Guardian      [1v]  |--->| Override     |    |
|   | 3. Observe        |    | Treasury      [1v]  |    | Kill Switch  |    |
|   | 4. Reflect        |    |                     |    |              |    |
|   | 5. Decide         |    | 2/3 majority needed |    | Unilateral   |    |
|   +-------------------+    +---------------------+    +--------------+    |
|                                                                           |
|   +-------------------+    +---------------------+    +--------------+    |
|   | LLM Cascade       |    | Wallet-as-Brain     |    | Risk Engine  |    |
|   |                   |    |                     |    |              |    |
|   | Groq (llama-3.3)  |    | Health -> Mood      |    | 8-dimension  |    |
|   |   |               |    | Mood -> Behavior    |    | scoring per  |    |
|   |   v               |    |                     |    | transaction  |    |
|   | Gemini (2.0 Flash)|    | Generous  (>70)     |    |              |    |
|   |   |               |    | Strategic (40-70)   |    | Amount       |    |
|   |   v               |    | Cautious  (<40)     |    | Frequency    |    |
|   | Rule-Based        |    |                     |    | Trust        |    |
|   | (never fails)     |    | Epsilon-greedy 10%  |    | Gas ratio    |    |
|   +-------------------+    +---------------------+    +--------------+    |
|                                                                           |
+===========================================================================+
                                    |
                                    v
+===========================================================================+
|                           WDK LAYER                                       |
|                                                                           |
|   +---------------------+  +---------------------+  +-----------------+  |
|   | Core                |  | Chain Wallets        |  | DeFi Protocols  |  |
|   |                     |  |                     |  |                 |  |
|   | @tetherto/wdk       |  | wdk-wallet-evm      |  | wdk-aave-v3     |  |
|   | @tetherto/wdk-utils |  | wdk-wallet-ton      |  | wdk-velora-swap |  |
|   |                     |  | wdk-wallet-tron     |  | wdk-usdt0-bridge|  |
|   | HD key derivation   |  | wdk-wallet-btc      |  |                 |  |
|   | BIP-39 mnemonic     |  | wdk-wallet-solana   |  | Yield optimize  |  |
|   | Wallet factory      |  |                     |  | Cross-chain     |  |
|   +---------------------+  +---------------------+  +-----------------+  |
|                                                                           |
|   +---------------------+  +---------------------+                       |
|   | Gasless             |  | Smart Contracts     |                       |
|   |                     |  |                     |                       |
|   | wdk-wallet-evm-     |  | AgentRegistry.sol   |                       |
|   |   erc-4337          |  | TipSplitter.sol     |                       |
|   | wdk-wallet-ton-     |  | AgentEscrow.sol     |                       |
|   |   gasless           |  |                     |                       |
|   +---------------------+  +---------------------+                       |
|                                                                           |
+===========================================================================+
                                    |
                                    v
+===========================================================================+
|                          CHAIN LAYER                                      |
|                                                                           |
|   +----------+  +---------+  +----------+  +-----------+  +--------+     |
|   | Ethereum |  | Polygon |  | Arbitrum |  | Avalanche |  |  Celo  |     |
|   | Sepolia  |  | Amoy    |  | Sepolia  |  | Fuji      |  | Alfaj. |     |
|   +----------+  +---------+  +----------+  +-----------+  +--------+     |
|                                                                           |
|   +----------+  +---------+  +----------+  +-----------+                 |
|   |   TON    |  |  Tron   |  | Bitcoin  |  |  Solana   |                 |
|   | Testnet  |  |  Nile   |  | Testnet  |  |  Devnet   |                 |
|   +----------+  +---------+  +----------+  +-----------+                 |
|                                                                           |
+===========================================================================+
```

## Decision Pipeline

Every transaction passes through a 10-step pipeline before execution:

```
 +--------+     +-------------+     +---------+     +--------------+     +---------------+
 | INTAKE |---->| LIMIT_CHECK |---->| ANALYZE |---->| FEE_OPTIMIZE |---->| ECONOMIC_CHECK|
 +--------+     +-------------+     +---------+     +--------------+     +---------------+
                                                                                |
                                                                                v
 +--------+     +---------+     +---------+     +-------------+     +--------+
 | REPORT |<----| VERIFY  |<----| EXECUTE |<----| CONSENSUS   |<----| REASON |
 +--------+     +---------+     +---------+     | (3 agents)  |     | (ReAct)|
                                                +-------------+     +--------+
```

## Data Flow: Tip Transaction

```
User: "tip @sarah 2.5 USDT"
         |
         v
  +------+--------+
  | NLP Parser     |  Parse intent, extract: recipient, amount, chain
  +------+--------+
         |
         v
  +------+--------+
  | Limit Check    |  Per-minute, per-hour, per-day spend limits
  +------+--------+
         |
         v
  +------+--------+
  | Fee Optimizer  |  Compare gas across 5 EVM chains + TON + Tron
  +------+--------+  Select cheapest route
         |
         v
  +------+--------+
  | ReAct Engine   |  5-step reasoning: Thought -> Action -> Observe
  +------+--------+  -> Reflect -> Decide
         |
         v
  +------+---------+
  | 3-Agent Vote   |  TipExecutor + Guardian + Treasury
  +------+---------+  2/3 majority required
         |
         v
  +------+---------+
  | Guardian Check |  Final safety override (can veto unanimously)
  +------+---------+
         |
         v
  +------+---------+
  | WDK Execute    |  Sign + broadcast via WDK wallet
  +------+---------+
         |
         v
  +------+---------+
  | Verify + Log   |  Confirm on-chain, update wallet health, log audit
  +------+---------+
         |
         v
  "Sent 2.5 USDT to @sarah on Polygon (fee: $0.002)"
```

## Gasless Transaction Flow

```
                    ERC-4337 (EVM Chains)                    TON Gasless
              +--------------------------+            +---------------------+
              |                          |            |                     |
  User Intent | 1. Build UserOperation   |  User      | 1. Build message    |
       |      | 2. Sign with WDK wallet  |  Intent    | 2. Sign with WDK    |
       v      | 3. Send to Bundler       |    |       | 3. Relayer submits   |
  wdk-wallet- | 4. Bundler pays gas      |    v       | 4. Zero fee to user  |
  evm-erc-4337| 5. TX confirmed          |  wdk-wallet|                     |
              |                          |  ton-gasless|                     |
              | Chains: ETH, POLY, ARB,  |            | Chain: TON          |
              |   AVAX, CELO             |            |                     |
              +--------------------------+            +---------------------+
                         |                                      |
                         v                                      v
                  User pays $0 gas                      User pays $0 gas
                  Bundler sponsors                      Relayer sponsors
```

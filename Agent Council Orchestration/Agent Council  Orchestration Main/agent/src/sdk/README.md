# AeroFyta Agent SDK

Plug autonomous payment intelligence into any Tether WDK application.

## Why Build on AeroFyta?

AeroFyta is a production-ready autonomous payment agent designed for the Tether WDK ecosystem. It adds AI-driven intelligence to any WDK wallet:

- **Wallet-as-Brain** -- Financial Pulse calculates mood from on-chain state, producing 8 behavioral outputs (tip multiplier, risk tolerance, batch size, chain preference, etc.)
- **Multi-Agent Consensus** -- Orchestrator runs 3-agent voting with deliberation rounds, vote flipping, and Guardian veto for safety
- **ReAct Executor** -- OpenClaw service implements think-act-observe reasoning loops with tool calling
- **Safety Stack** -- 6-layer protection: policy enforcement, anomaly detection, risk engine, consensus, Guardian veto, de-escalation prevention
- **Payment Primitives** -- Escrow (HTLC), DCA, streaming payments, subscriptions, atomic swaps, tip splitting
- **Multi-Chain** -- Works with Ethereum, TON, Tron, Bitcoin, and Solana via WDK wallet adapters
- **Zero Lock-In** -- Use as a WDK protocol plugin, Express middleware, standalone agent, or individual services

Each module can be used independently or composed together.

## Installation

```bash
npm install aerofyta-agent
```

Requires Node.js 22+ (WDK requirement).

## Quick Start

```typescript
import { createAeroFytaAgent } from 'aerofyta-agent/create';

const agent = await createAeroFytaAgent({
  seed: 'your twelve word seed phrase here...',
  llmProvider: 'groq',
  llmApiKey: process.env.GROQ_API_KEY,
});

// Send an autonomous tip
await agent.tip('0x1234...', 0.01, 'ethereum-sepolia');

// Ask the agent a question
const answer = await agent.ask('Who should I tip today?');

// Get wallet mood
const mood = await agent.getWalletMood();

// Start autonomous loop
agent.startAutonomousLoop();
```

## Usage Modes

### 1. WDK Protocol Plugin (Recommended for Tether Integration)

Register AeroFyta as a native WDK protocol, just like Aave or Velora:

```typescript
import { AeroFytaProtocol } from 'aerofyta-agent';

// From a WDK account context
const aerofyta = await AeroFytaProtocol.create(account, {
  llmProvider: 'groq',
  llmApiKey: process.env.GROQ_API_KEY,
  autonomousMode: true,
  safetyProfile: 'balanced',
});

// Protocol methods
const pulse = await aerofyta.getFinancialPulse();
const evaluation = await aerofyta.evaluateCreator({ address: '0x...' });
await aerofyta.autonomousTip({ recipient: '0x...', maxAmount: 0.01 });

// Subscribe to events
aerofyta.hooks.onTip((tip) => console.log(`Tipped ${tip.amount}`));
aerofyta.hooks.onBlock((block) => alerting.send(block.reason));
```

Configuration options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `llmProvider` | `'groq' \| 'gemini' \| 'rule-based'` | `'rule-based'` | AI provider |
| `llmApiKey` | `string` | -- | API key (not needed for rule-based) |
| `autonomousMode` | `boolean` | `false` | Enable 60s autonomous loop |
| `safetyProfile` | `'strict' \| 'balanced' \| 'permissive'` | `'balanced'` | Risk tolerance |
| `explorationRate` | `number` | `0.1` | Epsilon-greedy exploration (0-1) |
| `persistence` | `'json' \| 'sqlite' \| 'postgres'` | `'json'` | Storage backend |

### 2. Presets (Quick Setup)

Pick a pre-built configuration for common use cases:

```typescript
import { createFromPreset, listPresets } from 'aerofyta-agent';

// See all available presets
console.log(listPresets());

// Create from preset
const agent = await createFromPreset('tipBot', {
  seed: 'your seed phrase...',
});
```

Available presets:

| Preset | Description | Autonomous | Safety |
|--------|-------------|------------|--------|
| `tipBot` | Creator tipping with engagement-based decisions | Yes | Balanced |
| `treasuryManager` | Yield optimization and rebalancing | Yes | Strict |
| `escrowAgent` | HTLC escrow with atomic swaps | No | Strict |
| `paymentProcessor` | Subscriptions, DCA, streaming | Yes | Balanced |
| `advisor` | Risk assessment and recommendations only | No | Strict |

### 3. Factory Function

```typescript
import { createAeroFytaAgent } from 'aerofyta-agent/create';

const agent = await createAeroFytaAgent({
  seed: 'your seed phrase...',
  llmProvider: 'rule-based',
  autonomousLoop: true,
  safetyLimits: {
    maxSingleTip: 0.5,
    maxDailySpend: 5.0,
    requireConfirmationAbove: 0.25,
  },
});
```

### 4. Express Middleware

```typescript
import express from 'express';
import { aerofytaMiddleware } from 'aerofyta-agent';

const app = express();
app.use(aerofytaMiddleware({ seed: process.env.SEED_PHRASE! }));

app.post('/tip', async (req, res) => {
  const result = await req.aerofyta.tip(req.body.to, req.body.amount);
  res.json(result);
});
```

### 5. Chain Adapters

AeroFyta works with any WDK wallet type through chain adapters:

```typescript
import { UniversalAdapter, EVMAdapter, TONAdapter } from 'aerofyta-agent';

// Auto-detect chain from identifier
const wallet = UniversalAdapter.fromWDKAccount(account, 'ethereum-sepolia');

// Or use a specific adapter
const evmWallet = EVMAdapter.fromWDKAccount(account);
const tonWallet = TONAdapter.fromWDKAccount(account);

// Uniform interface regardless of chain
const address = wallet.getAddress();
const balance = await wallet.getBalance();
await wallet.transfer({ to: '0x...', amount: '1.0' });
```

Supported chains: Ethereum, Polygon, Arbitrum (EVM), TON, Tron, Bitcoin, Solana.

### 6. Lifecycle Hooks

Subscribe to agent events without modifying core code:

```typescript
import { HookRegistry } from 'aerofyta-agent';

const hooks = new HookRegistry();

// Convenience methods
hooks.onTip((tip) => analytics.track('tip_sent', tip));
hooks.onBlock((block) => alerting.send(block.reason));
hooks.onAnomaly((anomaly) => pagerDuty.alert(anomaly));
hooks.onMoodChange((mood) => dashboard.update(mood));
hooks.onCycle((cycle) => metrics.record(cycle));

// Or use the generic API
hooks.on('escrowClaimed', (event, data) => {
  console.log(`Event: ${event}`, data);
});
```

Events: `beforeTip`, `afterTip`, `tipBlocked`, `beforeEscrow`, `afterEscrow`, `escrowClaimed`, `escrowRefunded`, `moodChanged`, `pulseUpdated`, `anomalyDetected`, `policyViolation`, `learningUpdate`, `reputationChanged`, `cycleStart`, `cycleEnd`, `agentStarted`, `agentStopped`.

### 7. Individual Services

```typescript
import { AIService, SafetyService, RiskEngineService } from 'aerofyta-agent';

const ai = new AIService();
await ai.initialize();
const intent = await ai.detectIntent('tip 0.01 USDT to alice');
```

### 8. HTTP Client (Remote Agent)

```typescript
import { TipFlowClient } from 'aerofyta-agent';

const client = new TipFlowClient('http://localhost:3001');
const result = await client.sendTip({
  recipient: '0x1234...',
  amount: '0.01',
  token: 'usdt',
});
```

## API Reference

### Agent Methods

| Method | Description |
|--------|-------------|
| `agent.tip(to, amount, chain?)` | Send a tip on any chain |
| `agent.ask(question)` | Natural language query |
| `agent.reason(goal)` | ReAct reasoning trace |
| `agent.getFinancialPulse()` | Liquidity, diversification, velocity scores |
| `agent.getWalletMood()` | Mood + tip multiplier |
| `agent.getReputation(addr)` | Address reputation score |
| `agent.getBalances()` | All chain balances |
| `agent.validateTip(params)` | Pre-validate against safety policies |
| `agent.escrow.create/claim/refund` | HTLC escrow management |
| `agent.swap.quote/execute` | Token swap via Velora |
| `agent.dca.create/pause/resume` | Dollar-cost averaging plans |
| `agent.stream.start/stop` | Streaming payments |
| `agent.startAutonomousLoop()` | Begin 60s autonomous cycle |

### Protocol Methods (WDK Plugin)

| Method | Description |
|--------|-------------|
| `protocol.autonomousTip(params)` | Mood-aware tip execution |
| `protocol.evaluateCreator(params)` | Reputation + recommendation |
| `protocol.getRecommendations(params)` | AI-powered suggestions |
| `protocol.createEscrow(params)` | Time-locked escrow |
| `protocol.getAgentStatus()` | Operational status |
| `protocol.getFinancialPulse()` | Financial health |
| `protocol.startAutonomous()` | Start autonomous loop |
| `protocol.stopAutonomous()` | Stop autonomous loop |

### Exported Services

See `agent/src/sdk/index.ts` for the full list of 50+ exported services, types, and utilities.

## Supported Chains

| Chain | ID | Tokens |
|-------|----|--------|
| Ethereum Sepolia | `ethereum-sepolia` | ETH, USDT |
| TON Testnet | `ton-testnet` | TON, USDT |
| Tron Nile | `tron-nile` | TRX, USDT |
| Bitcoin Testnet | `bitcoin-testnet` | BTC |
| Solana Devnet | `solana-devnet` | SOL |

## Examples

See the `examples/` directory for complete working examples:

- `basic-usage.ts` -- Core SDK functionality
- `express-integration.ts` -- Adding AeroFyta to an Express app
- `wdk-plugin-usage.ts` -- WDK protocol registration pattern

Run any example:

```bash
npx tsx agent/src/sdk/examples/basic-usage.ts
```

## License

Apache-2.0

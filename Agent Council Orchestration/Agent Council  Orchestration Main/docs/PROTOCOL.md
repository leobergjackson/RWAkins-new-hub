# AeroFyta Protocol Specification v1.0

> **A standard for autonomous, engagement-driven tipping on decentralized infrastructure**

## Abstract

AeroFyta Protocol defines an open standard for AI agents to autonomously discover creators, evaluate engagement, calculate fair compensation, and settle tips onchain — all without human intervention for each transaction. The protocol is chain-agnostic, agent-framework-agnostic, and designed for composability with other agentic finance protocols.

Any conforming implementation can interoperate with AeroFyta agents, enabling a multi-platform tipping ecosystem across Rumble, YouTube, Twitch, and future video platforms.

## 1. Protocol Layers

```
┌─────────────────────────────────────────────────────┐
│  Layer 5: APPLICATION                                │
│  Dashboard, Chat Interface, Voice Commands           │
├─────────────────────────────────────────────────────┤
│  Layer 4: INTELLIGENCE                               │
│  Multi-Agent Consensus, Engagement Scoring,          │
│  Predictive Tipping, Policy Engine                   │
├─────────────────────────────────────────────────────┤
│  Layer 3: ECONOMICS                                  │
│  x402 Micropayments, Treasury Management,            │
│  Fee Arbitrage, Yield Optimization                   │
├─────────────────────────────────────────────────────┤
│  Layer 2: EXECUTION                                  │
│  10-Step Pipeline, Escrow, Streaming, DCA,           │
│  Bridge (USDT0), Lending (Aave V3)                   │
├─────────────────────────────────────────────────────┤
│  Layer 1: WALLET                                     │
│  Tether WDK (10 packages), Multi-Chain,              │
│  Self-Custodial, HD Derivation, Gasless              │
└─────────────────────────────────────────────────────┘
```

## 2. Agent Identity

Every AeroFyta agent derives its identity from its WDK seed phrase:

```
Agent ID = keccak256(WDK_PUBLIC_KEY_ETH + WDK_PUBLIC_KEY_TON + WDK_PUBLIC_KEY_TRON)
```

This produces a deterministic, verifiable identifier tied to the agent's wallet keys. Other agents can verify identity by requesting a signed challenge.

### Identity Verification Flow

```
Agent A                          Agent B
   │                                │
   │  1. GET /agent/identity        │
   │  ─────────────────────────►    │
   │                                │
   │  2. { agentId, publicKeys,     │
   │       capabilities, challenge } │
   │  ◄─────────────────────────    │
   │                                │
   │  3. POST /agent/verify         │
   │     { signature(challenge) }    │
   │  ─────────────────────────►    │
   │                                │
   │  4. { verified: true }         │
   │  ◄─────────────────────────    │
```

## 3. Tip Execution Pipeline

Every tip passes through a 10-step pipeline with full auditability:

```
Step  1: INTAKE           Validate request, assign tip ID
Step  2: LIMIT_CHECK      Enforce spending limits (daily/weekly/per-tip)
Step  3: ANALYZE          Query balances and fees across all chains
Step  4: FEE_OPTIMIZE     Compare fees, identify cheapest chain
Step  5: ECONOMIC_CHECK   Verify fee-to-tip ratio is economically sound
Step  6: REASON           AI selects optimal chain with confidence score
Step  7: CONSENSUS        Multi-agent vote (TipExecutor/Guardian/TreasuryOptimizer)
Step  8: EXECUTE          Send transaction via WDK (with auto-retry)
Step  9: VERIFY           Poll blockchain for confirmation
Step 10: REPORT           Generate receipt, update reputation, fire webhooks
```

Each step produces a `ReasoningStep` record:
```typescript
interface ReasoningStep {
  step: number;
  action: string;
  detail: string;
  timestamp: string;
}
```

The complete reasoning chain is stored with every tip, enabling full transparency and auditability.

## 4. Engagement Score Algorithm

The engagement score creates an economic feedback loop between content quality and creator compensation:

```
Better Content → More Engagement → Higher Tips → Creator Incentive → Better Content
```

### Score Calculation

```
score = watchCompletion × 0.40
      + rewatchBonus    × 0.20
      + frequency       × 0.15
      + loyalty         × 0.15
      + categoryPremium × 0.10
```

| Factor | Range | Weight | Description |
|--------|-------|--------|-------------|
| Watch Completion | 0.0–1.0 | 40% | Average watch percentage across sessions |
| Rewatch Bonus | 0.0–1.0 | 20% | Ratio of rewatched videos (high interest) |
| Session Frequency | 0.0–1.0 | 15% | Sessions per week (10+ = max) |
| Creator Loyalty | 0.0–1.0 | 15% | Days following (30+ = max) |
| Category Premium | 0.5–1.0 | 10% | Premium for education/news/tech content |

### Tip Multiplier

```
multiplier = 0.5 + (score × 2.5)
adjustedTip = baseTip × multiplier
```

Range: 0.5x (low engagement) to 3.0x (maximum engagement)

## 5. TipPolicy Standard

Policies define autonomous tipping behavior in a declarative format:

```json
{
  "version": "1.0",
  "trigger": {
    "type": "watch_time | new_video | milestone | schedule | balance_above | streak",
    "threshold": 80
  },
  "conditions": [
    { "field": "gas_fee_usd", "operator": "<", "value": 0.05 },
    { "field": "creator_category", "operator": "in", "value": ["education"] }
  ],
  "action": {
    "type": "tip | escrow | stream | pool_contribute",
    "amount": {
      "mode": "fixed | engagement_weighted | percentage_of_balance | gas_aware",
      "base": 0.01,
      "min": 0.001,
      "max": 1.0
    },
    "chain": "cheapest | fastest | specific",
    "token": "usdt | native | usat | xaut",
    "escrow": {
      "enabled": true,
      "releaseAfter": "24h",
      "releaseCondition": "auto | manual | creator_confirm"
    }
  },
  "cooldown": {
    "minIntervalMinutes": 60,
    "maxPerDay": 10,
    "maxPerWeek": 50
  }
}
```

### Amount Modes

| Mode | Description |
|------|-------------|
| `fixed` | Exact amount specified in `base` |
| `engagement_weighted` | `base × engagement_multiplier` (0.5x–3.0x) |
| `percentage_of_balance` | `base`% of current wallet balance |
| `gas_aware` | Auto-adjusts so gas never exceeds `feeMaxPercent`% of tip |

## 6. x402 Payment Protocol

HTTP-native micropayments for agent-to-agent commerce:

### Request Flow

```
Agent A                              Agent B (AeroFyta)
   │                                      │
   │  GET /api/predictions/generate       │
   │  ──────────────────────────────►     │
   │                                      │
   │  HTTP 402 Payment Required           │
   │  X-Payment-Amount: 0.001             │
   │  X-Payment-Recipient: 0xABC...       │
   │  X-Payment-Chain: ethereum-sepolia   │
   │  X-Payment-Token: usdt              │
   │  X-Payment-Protocol: x402/1.0       │
   │  ◄──────────────────────────────     │
   │                                      │
   │  [Agent A pays via WDK]              │
   │                                      │
   │  POST /api/x402/pay                  │
   │  { requirementId, txHash, amount }   │
   │  ──────────────────────────────►     │
   │                                      │
   │  { verified: true }                  │
   │  ◄──────────────────────────────     │
   │                                      │
   │  GET /api/predictions/generate       │
   │  X-Payment-Proof: <txHash>           │
   │  ──────────────────────────────►     │
   │                                      │
   │  HTTP 200 OK                         │
   │  { predictions: [...] }              │
   │  ◄──────────────────────────────     │
```

### Standard Headers

| Header | Description |
|--------|-------------|
| `X-Payment-Required` | `true` when payment needed |
| `X-Payment-Id` | Unique requirement ID |
| `X-Payment-Amount` | Amount in token units |
| `X-Payment-Recipient` | Wallet address |
| `X-Payment-Chain` | Blockchain identifier |
| `X-Payment-Token` | Token type (usdt, native) |
| `X-Payment-Protocol` | Protocol version (x402/1.0) |
| `X-Payment-Agent` | Agent identifier |

## 7. Multi-Agent Consensus

Three specialized sub-agents evaluate every tip:

| Agent | Role | Specialization |
|-------|------|----------------|
| **TipExecutor** | Feasibility | Balance check, address validation, gas estimation |
| **Guardian** | Safety | Spending limits, recipient trust, anomaly detection |
| **TreasuryOptimizer** | Economics | Fee comparison, timing optimization, yield impact |

### Consensus Rules

- **Approval**: 2-of-3 agents must approve
- **Guardian Veto**: Guardian can reject even if 2 approve (safety override)
- **Confidence Threshold**: Rejection requires >70% confidence to block
- **Reasoning Chain**: Every vote includes detailed reasoning for auditability

## 8. Integration Points

### For Developers (SDK)

```typescript
import { AeroFytaClient } from 'aerofyta-sdk';
const client = new AeroFytaClient('http://localhost:3001');

// Send tip through full AI pipeline
const result = await client.sendTip({
  recipient: '0x1234...abcd',
  amount: '0.01',
  token: 'usdt',
});

// Get engagement-weighted recommendations
const recs = await client.getEngagementRecommendations('user1');

// Create programmable tip policy
await client.createPolicy({
  name: 'Auto-tip educators',
  trigger: { type: 'watch_time', threshold: 80 },
  conditions: [{ field: 'creator_category', operator: 'in', value: ['education'] }],
  action: {
    type: 'tip',
    amount: { mode: 'engagement_weighted', base: 0.01 },
    chain: 'cheapest',
    token: 'usdt',
  },
});
```

### For AI Agents (MCP)

AeroFyta exposes 35 wallet tools via Model Context Protocol:
```
npx aerofyta-mcp --seed "your seed phrase"
```

Any MCP-compatible agent (Claude, GPT, OpenClaw) can:
- Check balances across chains
- Send tips with chain optimization
- Bridge USDT0 cross-chain
- Supply/withdraw from Aave V3

### For Other Autonomous Payment Agents (TipPolicy)

Export and import policies between compatible agents:
```
GET /api/policies → Export all policies
POST /api/policies → Import a policy
POST /api/policies/evaluate → Test policy against context
```

## 9. WDK Integration Depth

AeroFyta uses 10 official Tether WDK packages:

| Package | Purpose |
|---------|---------|
| `@tetherto/wdk` | Core orchestrator |
| `@tetherto/wdk-wallet-evm` | Ethereum/EVM chains |
| `@tetherto/wdk-wallet-ton` | TON blockchain |
| `@tetherto/wdk-wallet-tron` | TRON blockchain |
| `@tetherto/wdk-wallet-evm-erc-4337` | Gasless (Account Abstraction) |
| `@tetherto/wdk-wallet-ton-gasless` | TON gasless |
| `@tetherto/wdk-protocol-bridge-usdt0-evm` | USDT0 bridge (LayerZero) |
| `@tetherto/wdk-protocol-lending-aave-evm` | Aave V3 lending |
| `@tetherto/wdk-mcp-toolkit` | MCP server for AI agents |
| `@modelcontextprotocol/sdk` | MCP transport layer |

## 10. License

AeroFyta Protocol is released under **Apache License 2.0**.

Any implementation that conforms to this specification may use the AeroFyta Protocol name and interoperate with AeroFyta agents.

---

*AeroFyta Protocol v1.0 — March 2026*
*Built for Ethereum Mexico 2026*

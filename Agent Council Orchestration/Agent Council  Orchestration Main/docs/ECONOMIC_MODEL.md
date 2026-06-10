# Economic Model

AeroFyta's economic model governs how value flows through the system — from tip origination through execution, yield generation, and risk management.

---

## Fee Structure

AeroFyta operates on a zero-platform-fee model for direct tips. Revenue comes from optional advanced features.

### Direct Tips

| Component | Fee | Paid By |
|-----------|-----|---------|
| Platform fee | **0%** | — |
| Network gas | Variable (chain-dependent) | Sender |
| Gasless (ERC-4337/TON) | **0** | Subsidized by paymaster |

The agent optimizes chain selection to minimize gas costs. A $2 tip on Polygon costs ~$0.002 in gas; on Ethereum L1 it could cost $0.50+. The agent always routes to the cheapest viable chain unless the user specifies one.

### HTLC Escrow

| Component | Fee | Details |
|-----------|-----|---------|
| Escrow creation | Gas only | Smart contract deployment cost |
| Escrow claim | Gas only | Preimage reveal transaction |
| Escrow refund | Gas only | Timelock expiry refund |
| Platform fee | **0%** | No intermediary cut |

### A2A Platform Fee (Agent-to-Agent)

| Component | Fee | Details |
|-----------|-----|---------|
| x402 machine payments | 0.1% | Micropayment for API access between agents |
| A2A routing | 0.05% | Cross-agent payment coordination |

These fees are configurable and default to zero in testnet mode.

### Multi-Party Splits (TipSplitter)

| Component | Fee | Details |
|-----------|-----|---------|
| Split creation | Gas only | On-chain TipSplitter contract call |
| Distribution | Gas only | Proportional payout to recipients |
| Basis-point precision | — | Splits defined in bps (1 bps = 0.01%) |

---

## Risk Management

### Per-Transaction Limits

| Tier | Max Transactions | Max Spend | Cooldown on Breach |
|------|-----------------|-----------|-------------------|
| Per-minute | 5 | $50 | 5 minutes |
| Per-hour | 20 | $200 | 30 minutes |
| Per-day | 100 | $1,000 | 24 hours |

Limits are enforced at the transaction intake layer, before any WDK wallet operation begins.

### Guardian Veto

The Guardian agent independently evaluates every transaction against an 8-dimension risk vector:

| Dimension | Weight | Threshold |
|-----------|--------|-----------|
| Amount relative to balance | 20% | > 25% of wallet value |
| Transaction frequency | 15% | > 3x normal rate |
| Recipient trust score | 15% | < 0.3 (unknown/untrusted) |
| Chain risk level | 10% | High-congestion or high-fee |
| Gas-to-amount ratio | 10% | Gas > 10% of tip value |
| Wallet health impact | 10% | Would drop health below 20 |
| Historical pattern match | 10% | Deviation > 2 std from norm |
| Consensus confidence | 10% | < 60% agreement |

Composite risk score > 0.7 triggers an automatic veto. The Guardian can also veto at lower thresholds based on qualitative assessment.

### Emergency Kill Switch

```bash
POST /api/agent/kill
```

Immediately halts all autonomous operations. Pending transactions are cancelled. The agent enters read-only mode until manually restarted. This is the ultimate safety mechanism — it cannot be overridden by the agent or any automated process.

---

## Sustainability Model: Yield on Idle Capital

AeroFyta generates yield on idle wallet balances through Aave V3 integration.

### How It Works

```
Idle USDT in wallet
  → Agent detects balance exceeding operational reserve
  → Supplies excess to Aave V3 lending pool
  → Earns variable APY (typically 2-8% on USDT)
  → Withdraws automatically when funds are needed for tips
```

### Allocation Strategy

| Category | Allocation | Purpose |
|----------|-----------|---------|
| Operational reserve | 30% | Available for immediate tips |
| Yield buffer | 50% | Supplied to Aave V3 |
| Emergency reserve | 20% | Never deployed, safety margin |

The agent dynamically adjusts these ratios based on:
- **Tip frequency**: Higher activity increases operational reserve
- **Wallet mood**: Generous mood increases yield allocation; cautious mood increases emergency reserve
- **Gas conditions**: High gas periods reduce rebalancing frequency

### Yield Projection

| Wallet Balance | Yield Allocation (50%) | APY (est.) | Annual Yield |
|---------------|----------------------|------------|--------------|
| $100 | $50 | 4% | $2.00 |
| $1,000 | $500 | 4% | $20.00 |
| $10,000 | $5,000 | 4% | $200.00 |

Yield is compounded automatically. The agent re-supplies earned interest on a configurable schedule.

---

## Incentive Alignment: Creator Engagement Scoring

Tips are not distributed randomly. The agent evaluates creators across multiple signals to allocate tips proportionally to genuine engagement.

### Engagement Score Components

| Signal | Weight | Source |
|--------|--------|--------|
| View count (normalized) | 20% | YouTube/Rumble API |
| Subscriber growth velocity | 15% | Historical trend analysis |
| Comment sentiment | 15% | NLP sentiment analysis |
| Upload consistency | 15% | Publishing frequency |
| Audience retention | 15% | Watch time metrics |
| Community interaction | 10% | Creator reply rate |
| Content freshness | 10% | Recency of uploads |

### Scoring Formula

```
EngagementScore = Σ (signal_i × weight_i) × trust_multiplier
```

Where `trust_multiplier` ranges from 0.1 (new/unknown creator) to 1.0 (established, verified creator).

### Tip Allocation

The engagement score directly influences tip amounts through the Wallet-as-Brain system:

| Agent Mood | Base Tip | Engagement Multiplier | Result Range |
|-----------|----------|----------------------|-------------|
| Generous (health > 70) | $2.00 | 0.5x - 2.0x | $1.00 - $4.00 |
| Strategic (health 40-70) | $1.00 | 0.5x - 1.5x | $0.50 - $1.50 |
| Cautious (health < 40) | $0.50 | 0.5x - 1.0x | $0.25 - $0.50 |

High-engagement creators receive proportionally larger tips. The epsilon-greedy mechanism (10% exploration) occasionally tips lower-ranked creators to discover emerging talent.

---

## Abuse Resistance: 12 Security Vectors

The economic model is hardened against 12 adversarial attack vectors. Full details in [SECURITY.md](../SECURITY.md).

Summary of economically-relevant defenses:

| Attack | Economic Impact | Defense |
|--------|----------------|---------|
| Sybil (fake engagement) | Undeserved tips | Multi-signal verification, anomaly detection |
| Rapid drain | Wallet depletion | 3-tier rate limits with cooldowns |
| Dust attacks | Mood manipulation | Minimum threshold filtering |
| Flash manipulation | Exploit mood transitions | EMA smoothing, holding periods |
| Consensus gaming | Approve bad transactions | Guardian unilateral veto |
| Gas manipulation | Excessive fees | Multi-source oracle, hard caps |

---

## Unit Economics Analysis

### Cost Per Tip (Sender Perspective)

| Chain | Avg Gas Cost | Tip Amount | Gas Ratio | Verdict |
|-------|-------------|-----------|-----------|---------|
| Polygon | $0.002 | $2.00 | 0.1% | Optimal |
| Arbitrum | $0.01 | $2.00 | 0.5% | Good |
| Celo | $0.005 | $2.00 | 0.25% | Good |
| Avalanche | $0.02 | $2.00 | 1.0% | Acceptable |
| TON | $0.01 | $2.00 | 0.5% | Good |
| TON (gasless) | $0.00 | $2.00 | 0.0% | Best |
| EVM (ERC-4337) | $0.00 | $2.00 | 0.0% | Best |
| Ethereum L1 | $0.50 | $2.00 | 25.0% | Avoid (agent auto-routes away) |

The agent's fee optimization engine ensures tips are always routed to minimize the gas-to-amount ratio. Ethereum L1 is only used when the user explicitly requests it or the tip amount is large enough to justify the gas.

### Break-Even for Yield

| Monthly Tips Sent | Yield Needed to Cover Gas | Min Balance Required |
|-------------------|--------------------------|---------------------|
| 10 tips/month | ~$0.20 | $60 at 4% APY |
| 50 tips/month | ~$1.00 | $300 at 4% APY |
| 100 tips/month | ~$2.00 | $600 at 4% APY |

With sufficient balance, yield on idle capital can fully offset gas costs, making the system economically self-sustaining.

### Value Flow Summary

```
User deposits USDT
  → 30% operational (ready for tips)
  → 50% yield-generating (Aave V3)
  → 20% emergency reserve

Tips executed:
  → Creator receives 100% of tip amount
  → Sender pays gas (or $0 with gasless)
  → Platform takes 0%

Yield earned:
  → Compounds into wallet balance
  → Offsets gas costs over time
  → Enables self-sustaining tipping
```

---

## Future Considerations

- **Cross-chain fee arbitrage**: Route tips through the cheapest bridge path when recipient is on a specific chain
- **Dynamic yield allocation**: ML-driven allocation based on predicted tip demand
- **Creator staking**: Creators stake USDT to boost visibility, earning yield while queued
- **Reputation-weighted fees**: Established agents pay lower A2A fees based on on-chain history

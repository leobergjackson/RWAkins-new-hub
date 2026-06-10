---
name: tip-creator
version: 1.0.0
description: Tip content creators with USDT on the optimal blockchain
author: Danish A
license: Apache-2.0
protocol: openclaw-v1
agent: aerofyta
tags: [tipping, payments, creators, usdt, multi-chain]
requires:
  tools:
    - aerofyta_creator_score
    - aerofyta_get_risk_assessment
    - aerofyta_preflight
    - aerofyta_fee_estimate
    - aerofyta_routing_analysis
    - aerofyta_send_transaction
    - aerofyta_verify_tx
  skills:
    - analyze-creator
    - security-scan
---

# Tip Creator

Send USDT tips to content creators on the most cost-effective blockchain. Includes engagement verification, risk assessment, multi-model consensus for high-value tips, and on-chain confirmation.

## Trigger

Activate this skill when:
- User explicitly requests tipping a creator (e.g., "tip @creator 5 USDT")
- Autonomous loop identifies a high-engagement creator qualifying for auto-tip
- Scheduled DCA plan triggers a periodic tip execution
- Conditional payment trigger fires (engagement milestone reached)

Do NOT activate when:
- User is only asking about a creator's stats (use `analyze-creator` instead)
- Kill switch is engaged
- Daily budget cap has been reached

## Input

| Field | Type | Required | Description |
|---|---|---|---|
| `creator` | string | yes | Creator name, handle, or wallet address |
| `amount` | number | yes | Tip amount in USDT (min: 0.01, max: per risk params) |
| `chain` | string | no | Target chain. If omitted, agent selects cheapest viable chain |
| `reason` | string | no | Human-readable reason for the tip |
| `bypass_consensus` | boolean | no | Skip multi-model consensus (only for tips under 5 USDT) |

## Process

### Step 1: Creator Resolution
Resolve the creator identifier to a tippable wallet address.
- If `creator` is a wallet address, validate format for the target chain
- If `creator` is a handle/name, look up via creator registry or engagement database
- If creator not found, return error with suggestions

### Step 2: Engagement Verification
Call `analyze-creator` skill to get current engagement score.
- Fetch engagement score via `aerofyta_creator_score`
- Reject if score is below minimum threshold (default: 0.3)
- Flag if creator is new (fewer than 5 data points) -- apply caution multiplier

### Step 3: Risk Assessment
Call `security-scan` skill on the proposed transaction.
- Run `aerofyta_get_risk_assessment` with amount, recipient, chain
- Check against 12 attack vectors (address poisoning, dust attack, replay, etc.)
- If risk score exceeds threshold (default: 0.7), reject with explanation
- If risk score is moderate (0.4-0.7), require explicit user confirmation

### Step 4: Consensus Vote (conditional)
For tips above 25 USDT, invoke multi-model consensus.
- Generate proposal: `{ creator, amount, chain, engagement_score, risk_score }`
- Submit to 3-5 LLM evaluators with independent context
- Require majority approval (configurable quorum, default 3/5)
- If rejected, return dissenting reasons to user
- Skip this step if `bypass_consensus` is true AND amount < 5 USDT

### Step 5: Chain Selection & Preflight
Determine the optimal chain and verify readiness.
- If `chain` not specified, call `aerofyta_routing_analysis` for cheapest route
- Call `aerofyta_preflight` to verify: sufficient USDT balance, sufficient gas/native token, no pending conflicting transactions
- Call `aerofyta_fee_estimate` to get exact fee and confirm economic viability
- If fee exceeds 10% of tip amount, warn user and suggest alternative chain

### Step 6: Execute Transaction
Send the tip via WDK.
- Call `aerofyta_send_transaction` with resolved address, amount, chain
- Capture transaction hash immediately
- Begin confirmation monitoring

### Step 7: Verify & Report
Confirm the transaction on-chain and log the decision.
- Call `aerofyta_verify_tx` with transaction hash
- Wait for minimum confirmations (chain-dependent)
- Log full decision trail: engagement score, risk score, consensus votes, fee paid, chain used
- Update creator's tip history and cumulative stats
- Emit event for dashboard real-time feed

## Output

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether the tip was executed successfully |
| `tx_hash` | string | On-chain transaction hash |
| `chain` | string | Chain used for the transaction |
| `amount` | number | Actual amount tipped in USDT |
| `fee` | number | Transaction fee paid in native token |
| `creator` | string | Resolved creator identifier |
| `engagement_score` | number | Creator's engagement score at time of tip |
| `risk_score` | number | Transaction risk score (0.0 = safe, 1.0 = dangerous) |
| `consensus` | object | Consensus vote results (if applicable) |
| `confirmation_block` | number | Block number of confirmation |
| `reasoning` | string | Full decision rationale |

## Examples

### Example 1: Simple tip with auto chain selection
```
Input:
  creator: "CryptoTeacher"
  amount: 2.0

Process:
  1. Resolve "CryptoTeacher" -> 0x1a2b...3c4d (Ethereum Sepolia)
  2. Engagement score: 0.78 (Tier: Gold) -- PASS
  3. Risk assessment: 0.12 -- PASS (low risk)
  4. Consensus: SKIPPED (amount < 25 USDT)
  5. Routing: TON selected (fee: 0.001 USDT vs ETH: 0.45 USDT)
  6. Preflight: Balance 150 USDT, gas OK -- PASS
  7. Execute: TX sent on TON testnet

Output:
  success: true
  tx_hash: "E8f2a...9b1c"
  chain: "ton-testnet"
  amount: 2.0
  fee: 0.001
  engagement_score: 0.78
  risk_score: 0.12
  reasoning: "CryptoTeacher has Gold tier engagement (0.78). TON selected for lowest fee (0.001 vs 0.45 on ETH). Risk low at 0.12."
```

### Example 2: High-value tip with consensus
```
Input:
  creator: "BlockchainDaily"
  amount: 50.0
  chain: "ethereum-sepolia"

Process:
  1. Resolve "BlockchainDaily" -> 0x9f8e...7d6c
  2. Engagement score: 0.91 (Tier: Diamond) -- PASS
  3. Risk assessment: 0.08 -- PASS
  4. Consensus: 4/5 APPROVE (1 flagged high single-tip concentration)
  5. Preflight: Balance 200 USDT, gas 0.05 ETH -- PASS
  6. Fee estimate: 0.32 USDT (0.64% of tip) -- economically viable
  7. Execute: TX sent on Ethereum Sepolia

Output:
  success: true
  tx_hash: "0xabc123..."
  chain: "ethereum-sepolia"
  amount: 50.0
  fee: 0.32
  consensus: { approve: 4, reject: 1, quorum: "passed" }
  reasoning: "BlockchainDaily is Diamond tier (0.91). Consensus passed 4/5. One dissent noted tip concentration risk but majority approved."
```

### Example 3: Rejected tip (low engagement)
```
Input:
  creator: "NewChannel123"
  amount: 10.0

Process:
  1. Resolve "NewChannel123" -> found in registry
  2. Engagement score: 0.15 (Tier: None) -- FAIL (below 0.3 threshold)
  3. ABORT

Output:
  success: false
  reasoning: "Creator 'NewChannel123' has engagement score 0.15, below minimum threshold of 0.3. Tip not executed. Creator needs higher engagement quality to qualify for autonomous tips."
```

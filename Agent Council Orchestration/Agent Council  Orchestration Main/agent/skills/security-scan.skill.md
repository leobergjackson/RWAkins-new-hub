---
name: security-scan
version: 1.0.0
description: Adversarial security scan with 12 attack vector checks on transaction proposals
author: Danish A
license: Apache-2.0
protocol: openclaw-v1
agent: aerofyta
tags: [security, risk, adversarial, scanning, safety]
requires:
  tools:
    - aerofyta_get_risk_assessment
    - aerofyta_get_security_report
    - aerofyta_get_anomaly_stats
    - aerofyta_check_policies
    - aerofyta_get_safety_status
---

# Security Scan

Run a comprehensive adversarial security scan against a proposed transaction. Checks 12 distinct attack vectors and produces a risk score with per-vector breakdown. Used as a prerequisite by other skills before executing any financial operation.

## Trigger

Activate this skill when:
- Any skill requests a security check before transaction execution
- User explicitly asks to assess risk of a transaction
- Autonomous loop evaluates a transaction proposal
- Amount exceeds the risk-check threshold (default: 10 USDT)
- Recipient is new (first interaction) or flagged

Do NOT activate when:
- Transaction is below trivial threshold (< 0.1 USDT) AND recipient is known-safe
- Scan was already performed for this exact proposal within the last 5 minutes (return cached)

## Input

| Field | Type | Required | Description |
|---|---|---|---|
| `proposal` | object | yes | Transaction proposal to evaluate |
| `proposal.type` | string | yes | Transaction type: `tip`, `escrow`, `bridge`, `swap`, `supply`, `withdraw` |
| `proposal.amount` | number | yes | Amount in USDT |
| `proposal.recipient` | string | conditional | Recipient address (required for tip, escrow) |
| `proposal.chain` | string | yes | Target chain |
| `proposal.sender` | string | no | Sender address (auto-filled from agent wallet) |
| `proposal.metadata` | object | no | Additional context (creator score, escrow terms, etc.) |
| `strict_mode` | boolean | no | If true, reject on ANY vector flagged (default: false) |

## Process

### Step 1: Policy Check
Verify the transaction is permitted under current safety configuration.
- Call `aerofyta_check_policies` to get current spend limits and kill switch state
- If kill switch is engaged, reject immediately with reason
- Check daily budget remaining: if amount > remaining, reject
- Check single-transaction limit: if amount > max single, reject
- Verify the transaction type is not in the blocked-types list

### Step 2: Execute 12 Attack Vector Checks
Run each vector check independently and score from 0.0 (safe) to 1.0 (critical).

#### Vector 1: Address Poisoning
Detect if the recipient address is a near-match of a known-good address.
- Compare recipient against address book entries using edit distance
- Flag if the address differs by 1-3 characters from a known address
- Check if the address appeared in dust transactions to the sender's wallet

#### Vector 2: Dust Attack Detection
Check if this transaction pattern matches dust attack characteristics.
- Flag if amount is suspiciously small and recipient is unknown
- Check if the recipient recently sent micro-transactions to the sender
- Verify the recipient is not a known dust attacker address

#### Vector 3: Replay Attack
Verify the transaction cannot be replayed on another chain.
- Check that chain ID is included in transaction signing
- Verify nonce is fresh and sequential
- Confirm the transaction is chain-specific (not valid on forks)

#### Vector 4: Reentrancy Risk
For smart contract interactions, check reentrancy vulnerability.
- Verify the target contract follows checks-effects-interactions pattern
- Flag if the contract has unbounded external calls before state updates
- Only applicable for escrow, swap, and DeFi operations

#### Vector 5: Front-Running Exposure
Assess if the transaction is vulnerable to MEV extraction.
- Check if the transaction reveals a profitable trading opportunity
- For swaps: evaluate if slippage settings allow sandwich attacks
- Recommend private mempool submission if available

#### Vector 6: Oracle Manipulation
For operations relying on price feeds, check oracle integrity.
- Verify the price source uses time-weighted averages (TWAP)
- Check if the oracle can be manipulated with flash loans
- Validate price feed freshness (stale = reject)

#### Vector 7: Rate Limit Breach
Check if the transaction violates rate limiting policies.
- Count transactions to this recipient in the last 24 hours
- Count total transactions in the last hour
- Flag if patterns suggest automated draining or looping

#### Vector 8: Anomaly Detection
Compare against historical transaction patterns.
- Call `aerofyta_get_anomaly_stats` for pattern analysis
- Check: unusual time of day, unusual amount, unusual recipient
- Flag if transaction deviates > 2 standard deviations from normal behavior
- Consider amount relative to typical tip size for this creator

#### Vector 9: Contract Verification
For smart contract targets, verify contract legitimacy.
- Check if contract is verified on block explorer
- Compare bytecode against known-good contracts
- Flag proxy contracts with recent implementation changes
- Reject if contract is unverified and amount > 10 USDT

#### Vector 10: Balance Drain Protection
Ensure the transaction does not dangerously deplete funds.
- Calculate post-transaction balance
- Reject if balance would fall below reserve threshold
- Warn if transaction uses > 50% of available balance in a single operation
- Check if multiple pending transactions could collectively drain the wallet

#### Vector 11: Recipient Reputation
Evaluate the recipient's on-chain and off-chain reputation.
- Check if address is on any known blacklists or sanctions lists
- Look up transaction history: age, activity patterns, interactions
- For creators: cross-reference engagement score from `analyze-creator`
- Flag new addresses (< 7 days old) with cautionary note

#### Vector 12: Timing Attack
Check for time-based vulnerabilities.
- For escrow: verify timelock is reasonable (not too short for claim)
- For bridge: check if bridge contract has pending upgrades
- For DeFi: verify no governance proposals affecting the protocol in voting period
- Flag if transaction coincides with known network congestion periods

### Step 3: Aggregate Risk Score
Calculate the composite risk score from individual vectors.
- Weight each vector by severity: critical vectors (1,5,6,10) weight 1.5x, others 1.0x
- Composite: weighted average of all applicable vector scores
- Classify: LOW (0.0-0.3), MODERATE (0.3-0.5), HIGH (0.5-0.7), CRITICAL (0.7-1.0)
- In `strict_mode`: reject if ANY single vector scores above 0.5

### Step 4: Generate Verdict
Produce the final security assessment.
- APPROVED: composite < 0.3 (or < configured threshold)
- REVIEW: composite 0.3-0.7, requires user confirmation
- REJECTED: composite > 0.7 (or any critical vector, or strict mode violation)
- Include reasoning for every flagged vector
- Suggest mitigations for REVIEW-level findings

## Output

| Field | Type | Description |
|---|---|---|
| `verdict` | string | `APPROVED`, `REVIEW`, or `REJECTED` |
| `risk_score` | number | Composite risk score (0.0 to 1.0) |
| `risk_level` | string | `LOW`, `MODERATE`, `HIGH`, `CRITICAL` |
| `vectors` | array | Per-vector results with scores and findings |
| `blocked_vectors` | array | Vectors that individually exceeded thresholds |
| `flags` | array | Warning messages for attention |
| `mitigations` | array | Suggested actions to reduce risk (for REVIEW verdicts) |
| `reasoning` | string | Human-readable summary of the assessment |
| `scanned_at` | string | ISO timestamp of scan completion |
| `cache_valid_until` | string | ISO timestamp when this scan result expires |

## Examples

### Example 1: Clean transaction (approved)
```
Input:
  proposal:
    type: "tip"
    amount: 5.0
    recipient: "0x1a2b3c4d..."
    chain: "ethereum-sepolia"
    metadata: { creator_score: 0.78, tip_history: 12 }

Process:
  1. Policy check: kill switch OFF, daily budget 450/500 remaining -- PASS
  2. Vector results:
     [1] Address poisoning: 0.00 (no near-matches in address book)
     [2] Dust attack: 0.00 (amount not suspicious, known recipient)
     [3] Replay attack: 0.00 (chain ID included, nonce sequential)
     [4] Reentrancy: N/A (direct transfer, no contract)
     [5] Front-running: 0.02 (transfer, not swap, minimal MEV risk)
     [6] Oracle manipulation: N/A (no price feed dependency)
     [7] Rate limit: 0.05 (2 tips to this recipient today, within bounds)
     [8] Anomaly: 0.08 (5 USDT is typical tip size for this creator)
     [9] Contract verification: N/A (EOA recipient)
     [10] Balance drain: 0.03 (5/450 = 1.1% of balance)
     [11] Recipient reputation: 0.05 (12 prior tips, Gold tier creator)
     [12] Timing: 0.00 (no timing concerns)
  3. Composite: 0.03 -> LOW
  4. Verdict: APPROVED

Output:
  verdict: "APPROVED"
  risk_score: 0.03
  risk_level: "LOW"
  vectors: [... all 12 with scores ...]
  blocked_vectors: []
  flags: []
  reasoning: "Transaction approved. All 12 attack vectors scored low risk. Recipient is a known Gold-tier creator with 12 prior successful tips. Amount is within normal range."
```

### Example 2: Suspicious transaction (needs review)
```
Input:
  proposal:
    type: "tip"
    amount: 80.0
    recipient: "0x9f8e7d6c..."
    chain: "ethereum-sepolia"
    metadata: { creator_score: 0.35, tip_history: 0 }

Process:
  1. Policy check: PASS (within limits)
  2. Vector results:
     [1] Address poisoning: 0.00
     [2] Dust attack: 0.00
     [3] Replay: 0.00
     [4] Reentrancy: N/A
     [5] Front-running: 0.05
     [6] Oracle: N/A
     [7] Rate limit: 0.10
     [8] Anomaly: 0.65 (80 USDT is 4x average tip, first tip to this creator)
     [9] Contract: N/A
     [10] Balance drain: 0.45 (80/180 = 44% of balance in single tip)
     [11] Recipient reputation: 0.55 (new recipient, Bronze tier, no history)
     [12] Timing: 0.00
  3. Composite: 0.42 -> MODERATE
  4. Verdict: REVIEW

Output:
  verdict: "REVIEW"
  risk_score: 0.42
  risk_level: "MODERATE"
  blocked_vectors: []
  flags:
    - "First tip to this recipient (no prior interaction history)"
    - "Amount (80 USDT) is 4x your average tip size"
    - "Transaction uses 44% of available balance"
    - "Creator is Bronze tier (0.35) near minimum threshold"
  mitigations:
    - "Consider a smaller initial tip (10-20 USDT) to establish trust"
    - "Wait for creator to reach Silver tier before high-value tips"
    - "Split into multiple smaller tips over several days"
  reasoning: "Transaction flagged for review. While no single vector is critical, the combination of first interaction, high amount relative to average, and low creator tier warrants user confirmation."
```

### Example 3: Blocked transaction (rejected)
```
Input:
  proposal:
    type: "tip"
    amount: 200.0
    recipient: "0xdeadbeef..."
    chain: "ethereum-sepolia"
  strict_mode: true

Process:
  1. Policy check: FAIL -- 200 USDT exceeds max single tip (100 USDT)
  2. REJECT immediately

Output:
  verdict: "REJECTED"
  risk_score: 1.0
  risk_level: "CRITICAL"
  blocked_vectors: ["policy_violation"]
  flags:
    - "Amount 200 USDT exceeds maximum single transaction limit of 100 USDT"
  mitigations:
    - "Reduce amount to 100 USDT or below"
    - "Adjust max single tip limit in safety settings if intentional"
  reasoning: "Transaction rejected. Amount of 200 USDT exceeds the configured maximum single transaction limit of 100 USDT. This is a hard policy violation that cannot be bypassed without changing safety settings."
```

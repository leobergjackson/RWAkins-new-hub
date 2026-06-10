---
name: manage-escrow
version: 1.0.0
description: Create and manage HTLC escrow payments with conditional release
author: Danish A
license: Apache-2.0
protocol: openclaw-v1
agent: aerofyta
tags: [escrow, htlc, conditional-payments, trustless, multi-chain]
requires:
  tools:
    - aerofyta_create_escrow
    - aerofyta_claim_escrow
    - aerofyta_get_risk_assessment
    - aerofyta_preflight
    - aerofyta_verify_tx
    - aerofyta_get_balance
  skills:
    - security-scan
---

# Manage Escrow

Create, monitor, and resolve hash-timelock contract (HTLC) escrow payments. Funds are locked on-chain and can only be claimed by the recipient with the correct hash preimage before the timelock expires, or refunded to the sender after expiry.

## Trigger

Activate this skill when:
- User requests creating a conditional/escrow payment
- User wants to lock funds until a condition is met
- User wants to claim funds from an existing escrow
- User requests refund of an expired escrow
- Autonomous loop creates escrow for milestone-based creator payments

Do NOT activate when:
- User wants a simple direct tip (use `tip-creator` instead)
- User wants recurring payments without conditions (use DCA/subscription tools)
- Kill switch is engaged

## Input

### For Create Operation

| Field | Type | Required | Description |
|---|---|---|---|
| `operation` | string | yes | One of: `create`, `claim`, `refund`, `status` |
| `recipient` | string | yes | Recipient wallet address or creator handle |
| `amount` | number | yes | Amount to lock in USDT |
| `timelock` | number | yes | Lock duration in hours (max: 168) |
| `hash` | string | no | SHA-256 hash for HTLC. Auto-generated if omitted |
| `chain` | string | no | Target chain. Auto-selected if omitted |
| `condition_description` | string | no | Human-readable description of release condition |

### For Claim Operation

| Field | Type | Required | Description |
|---|---|---|---|
| `operation` | string | yes | Must be `claim` |
| `escrow_id` | string | yes | ID of the escrow to claim |
| `preimage` | string | yes | SHA-256 preimage that hashes to the escrow's hashlock |

### For Refund Operation

| Field | Type | Required | Description |
|---|---|---|---|
| `operation` | string | yes | Must be `refund` |
| `escrow_id` | string | yes | ID of the expired escrow to refund |

### For Status Operation

| Field | Type | Required | Description |
|---|---|---|---|
| `operation` | string | yes | Must be `status` |
| `escrow_id` | string | no | Specific escrow ID, or omit for all active escrows |

## Process

### Create Flow

#### Step 1: Input Validation
Validate all parameters against safety constraints.
- Verify amount is within allowed range (min 0.01, max per risk params)
- Verify timelock is within bounds (min 1 hour, max 168 hours)
- Validate recipient address format or resolve creator handle
- If no hash provided, generate cryptographically secure preimage and compute SHA-256 hash

#### Step 2: Risk Assessment
Run security checks on the escrow creation.
- Call `aerofyta_get_risk_assessment` for the recipient and amount
- Check for duplicate escrows to same recipient within 24 hours
- Verify the escrow amount does not exceed 50% of available balance
- Validate that remaining balance after lock meets reserve requirements

#### Step 3: Preflight Checks
Ensure the transaction can be executed.
- Call `aerofyta_preflight` to verify USDT balance and gas availability
- Confirm the target chain's escrow contract is deployed and operational
- Estimate gas cost for both the lock and future claim/refund transactions

#### Step 4: Create Escrow
Lock the funds on-chain.
- Call `aerofyta_create_escrow` with recipient, amount, hashlock, timelock
- Capture escrow ID and creation transaction hash
- Store preimage securely (if auto-generated) for later claim/share

#### Step 5: Confirm & Monitor
Verify creation and start monitoring.
- Call `aerofyta_verify_tx` to confirm the lock transaction
- Register the escrow in the monitoring system for expiry alerts
- Schedule notification at 75% timelock elapsed (warning) and 100% (expired)
- Log full creation details in decision log

### Claim Flow

#### Step 1: Validate Claim
Verify the claim is legitimate.
- Look up escrow by ID, verify it exists and is in LOCKED state
- Verify the caller is the designated recipient
- Verify the preimage: `SHA-256(preimage) == escrow.hashlock`
- Verify the timelock has NOT expired

#### Step 2: Execute Claim
Release funds to the recipient.
- Call `aerofyta_claim_escrow` with escrow ID and preimage
- Capture claim transaction hash
- Verify on-chain that funds were transferred

#### Step 3: Finalize
Update records and notify.
- Mark escrow as CLAIMED in the database
- Log claim details: timestamp, block number, gas used
- Notify sender that escrow was successfully claimed
- Update creator's trust score (successful escrow completion is positive signal)

### Refund Flow

#### Step 1: Validate Refund
Verify refund eligibility.
- Look up escrow by ID, verify it exists and is in LOCKED state
- Verify the timelock HAS expired (current time > creation time + timelock)
- Verify the caller is the original sender

#### Step 2: Execute Refund
Return funds to the sender.
- Call `aerofyta_claim_escrow` in refund mode with escrow ID
- Capture refund transaction hash
- Verify on-chain that funds returned to sender

#### Step 3: Finalize
Update records.
- Mark escrow as REFUNDED in the database
- Log refund reason and timing
- Update recipient's reliability score (unclaimed escrow is a negative signal)

## Output

### Create Output

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether escrow was created |
| `escrow_id` | string | Unique escrow identifier |
| `tx_hash` | string | Lock transaction hash |
| `chain` | string | Chain where funds are locked |
| `amount` | number | Locked amount in USDT |
| `recipient` | string | Recipient address |
| `hashlock` | string | SHA-256 hash (public) |
| `preimage` | string | Preimage (only shown to sender, SENSITIVE) |
| `timelock_hours` | number | Lock duration in hours |
| `expires_at` | string | ISO timestamp of expiry |
| `status` | string | Current status: LOCKED |

### Claim Output

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether claim succeeded |
| `escrow_id` | string | Escrow that was claimed |
| `tx_hash` | string | Claim transaction hash |
| `amount` | number | Amount released to recipient |
| `claimed_at` | string | ISO timestamp of claim |

### Refund Output

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether refund succeeded |
| `escrow_id` | string | Escrow that was refunded |
| `tx_hash` | string | Refund transaction hash |
| `amount` | number | Amount returned to sender |
| `refunded_at` | string | ISO timestamp of refund |

## Examples

### Example 1: Create escrow for milestone-based tip
```
Input:
  operation: "create"
  recipient: "CryptoTeacher"
  amount: 25.0
  timelock: 48
  condition_description: "Release when creator publishes WDK tutorial"

Process:
  1. Resolve "CryptoTeacher" -> 0x1a2b...3c4d
  2. Generate preimage: "af83b1..." -> hash: "7e92c4..."
  3. Risk: 0.15 (low) -- PASS
  4. Balance: 200 USDT, lock 25 = 175 remaining (above 10 reserve) -- PASS
  5. Gas estimate: 0.003 ETH for lock + 0.002 ETH for future claim
  6. Create escrow on Ethereum Sepolia
  7. Confirmed at block 1234567

Output:
  success: true
  escrow_id: "esc_a1b2c3"
  tx_hash: "0xdef456..."
  amount: 25.0
  hashlock: "7e92c4..."
  preimage: "af83b1..." (share with recipient when condition met)
  expires_at: "2026-03-26T14:00:00Z"
  status: "LOCKED"
```

### Example 2: Claim escrow with preimage
```
Input:
  operation: "claim"
  escrow_id: "esc_a1b2c3"
  preimage: "af83b1..."

Process:
  1. Lookup escrow esc_a1b2c3: LOCKED, 25 USDT, expires 2026-03-26
  2. Verify SHA-256("af83b1...") == "7e92c4..." -- MATCH
  3. Timelock check: current time < expiry -- VALID
  4. Execute claim transaction
  5. Verified: 25 USDT transferred to recipient

Output:
  success: true
  escrow_id: "esc_a1b2c3"
  tx_hash: "0x789abc..."
  amount: 25.0
  claimed_at: "2026-03-25T10:30:00Z"
```

### Example 3: Refund expired escrow
```
Input:
  operation: "refund"
  escrow_id: "esc_x7y8z9"

Process:
  1. Lookup escrow esc_x7y8z9: LOCKED, 10 USDT, expired 2h ago
  2. Timelock check: current time > expiry -- EXPIRED, refund eligible
  3. Execute refund transaction
  4. Verified: 10 USDT returned to sender

Output:
  success: true
  escrow_id: "esc_x7y8z9"
  tx_hash: "0xfed321..."
  amount: 10.0
  refunded_at: "2026-03-24T16:00:00Z"
```

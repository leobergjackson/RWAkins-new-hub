---
name: optimize-yield
version: 1.0.0
description: Deploy idle treasury capital to Aave V3 for yield generation
author: Danish A
license: Apache-2.0
protocol: openclaw-v1
agent: aerofyta
tags: [defi, yield, aave, lending, treasury]
requires:
  tools:
    - aerofyta_get_treasury_status
    - aerofyta_get_yield_opportunities
    - aerofyta_aave_supply
    - aerofyta_aave_withdraw
    - aerofyta_get_yield_rates
    - aerofyta_get_risk_assessment
    - aerofyta_get_balance
    - aerofyta_verify_tx
  skills:
    - security-scan
---

# Optimize Yield

Identify idle treasury capital and deploy it to Aave V3 lending markets to generate yield. Continuously monitors positions, rebalances when rates shift, and withdraws when funds are needed for tipping operations.

## Trigger

Activate this skill when:
- Treasury has idle USDT above the operational reserve threshold
- User requests yield optimization or asks about earning on idle funds
- Autonomous loop detects idle capital exceeding configured threshold for 24+ hours
- Yield rate on current position drops below minimum acceptable APY
- Funds needed for tipping operations require partial withdrawal

Do NOT activate when:
- Kill switch is engaged
- Available balance is at or below reserve threshold
- Market conditions are flagged as high volatility by risk assessment
- User has disabled DeFi operations in safety settings

## Input

| Field | Type | Required | Description |
|---|---|---|---|
| `operation` | string | yes | One of: `supply`, `withdraw`, `rebalance`, `status` |
| `amount` | number | conditional | Amount in USDT for supply/withdraw. Required for supply and withdraw |
| `min_apy` | number | no | Minimum acceptable APY in percent (default: 1.0) |
| `max_allocation` | number | no | Max percentage of treasury to deploy (default: 40%) |
| `chain` | string | no | Target chain for Aave deployment (default: ethereum-sepolia) |

## Process

### Supply Flow

#### Step 1: Treasury Assessment
Evaluate current treasury state and available capital.
- Call `aerofyta_get_treasury_status` for full financial snapshot
- Calculate idle capital: total balance - reserve - pending tips - active escrows
- If `amount` exceeds idle capital, cap at idle capital and warn
- Verify amount meets minimum supply threshold (1 USDT)

#### Step 2: Yield Market Analysis
Evaluate current Aave V3 market conditions.
- Call `aerofyta_get_yield_rates` for current USDT supply APY
- Call `aerofyta_get_yield_opportunities` for alternative rates across protocols
- Compare current APY against `min_apy` threshold
- If best available APY < min_apy, abort and report that yields are too low
- Check utilization rate of the Aave USDT pool (high utilization = withdrawal risk)

#### Step 3: Risk Assessment
Evaluate deployment risk.
- Call `aerofyta_get_risk_assessment` for DeFi supply operation
- Check protocol risk: Aave V3 audit status, TVL stability, governance changes
- Verify that deploying `amount` keeps treasury above 2x reserve requirement
- Validate that `amount` does not exceed `max_allocation` of total treasury
- If risk score > 0.5, require explicit user confirmation

#### Step 4: Consensus (for large deployments)
For deployments above 100 USDT, require multi-model consensus.
- Generate proposal with: amount, APY, risk score, utilization rate, allocation %
- Submit to consensus quorum
- Require majority approval

#### Step 5: Execute Supply
Deploy capital to Aave V3.
- Call `aerofyta_aave_supply` with amount and chain
- Capture supply transaction hash
- Call `aerofyta_verify_tx` to confirm on-chain

#### Step 6: Position Tracking
Register the position for ongoing monitoring.
- Record: amount supplied, APY at entry, timestamp, chain, pool address
- Set up monitoring: APY drift alerts, utilization spike alerts, protocol alerts
- Schedule periodic yield report (every 24 hours)

### Withdraw Flow

#### Step 1: Position Lookup
Verify the current Aave position.
- Call `aerofyta_get_treasury_status` for current DeFi positions
- Verify sufficient aUSDT balance for requested withdrawal
- Calculate accrued yield since last check

#### Step 2: Execute Withdrawal
Remove capital from Aave V3.
- Call `aerofyta_aave_withdraw` with amount and chain
- If pool liquidity is insufficient for full withdrawal, withdraw available and queue remainder
- Capture withdrawal transaction hash
- Call `aerofyta_verify_tx` to confirm

#### Step 3: Update Records
Finalize the withdrawal.
- Record realized yield: withdrawn - originally supplied for that portion
- Update treasury allocation percentages
- Log reason for withdrawal (user request, rebalance, tip funding, etc.)

### Rebalance Flow

#### Step 1: Evaluate Current State
Compare current allocation against targets.
- Get current DeFi positions, idle capital, and pending obligations
- Calculate actual vs target allocation percentages
- Identify drift: over-allocated (need to withdraw) or under-allocated (can supply more)

#### Step 2: Generate Rebalance Plan
Determine optimal adjustments.
- If over-allocated: calculate withdrawal amount to reach target
- If under-allocated and idle capital available: calculate supply amount
- Factor in gas costs -- only rebalance if yield gain exceeds 10x gas cost
- Generate plan with specific supply/withdraw operations

#### Step 3: Execute Plan
Apply rebalance operations.
- Execute each operation in the plan sequentially
- Verify each transaction before proceeding to next
- If any operation fails, halt and report partial state

## Output

### Supply Output

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether supply was executed |
| `tx_hash` | string | Supply transaction hash |
| `amount_supplied` | number | USDT amount deployed to Aave |
| `current_apy` | number | APY at time of supply (percent) |
| `projected_daily_yield` | number | Estimated daily yield in USDT |
| `projected_annual_yield` | number | Estimated annual yield in USDT |
| `total_position` | number | Total USDT now in Aave (including previous) |
| `treasury_allocation` | number | Percent of treasury now in DeFi |
| `chain` | string | Chain of deployment |

### Withdraw Output

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether withdrawal was executed |
| `tx_hash` | string | Withdrawal transaction hash |
| `amount_withdrawn` | number | USDT amount withdrawn |
| `realized_yield` | number | Yield earned on withdrawn portion |
| `remaining_position` | number | USDT still in Aave |
| `available_balance` | number | New idle USDT balance |

### Rebalance Output

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether rebalance completed |
| `operations` | array | List of supply/withdraw operations executed |
| `new_allocation` | object | Updated treasury allocation percentages |
| `net_yield_impact` | number | Projected change in daily yield |

## Examples

### Example 1: Supply idle capital
```
Input:
  operation: "supply"
  amount: 100.0
  min_apy: 2.0

Process:
  1. Treasury: 500 USDT total, 200 idle, 10 reserve, 50 in escrow
  2. Idle available: 200 - 10 reserve = 190 available. 100 requested -- OK
  3. Aave USDT APY: 3.2% -- above 2.0% minimum -- PASS
  4. Pool utilization: 72% -- acceptable
  5. Risk score: 0.18 -- PASS
  6. Consensus: 4/5 APPROVE (amount > 100 threshold)
  7. Supply 100 USDT to Aave V3 on Ethereum Sepolia
  8. Confirmed at block 2345678

Output:
  success: true
  tx_hash: "0xaaa111..."
  amount_supplied: 100.0
  current_apy: 3.2
  projected_daily_yield: 0.00877
  projected_annual_yield: 3.20
  total_position: 100.0
  treasury_allocation: 20.0
  chain: "ethereum-sepolia"
```

### Example 2: Withdraw for tipping operations
```
Input:
  operation: "withdraw"
  amount: 30.0

Process:
  1. Current Aave position: 100 USDT (supplied 7 days ago at 3.2% APY)
  2. Accrued yield: 0.061 USDT
  3. Withdrawal amount: 30 USDT
  4. Pool liquidity: sufficient
  5. Execute withdrawal
  6. Confirmed

Output:
  success: true
  tx_hash: "0xbbb222..."
  amount_withdrawn: 30.0
  realized_yield: 0.018
  remaining_position: 70.061
  available_balance: 130.018
```

### Example 3: Abort due to low yields
```
Input:
  operation: "supply"
  amount: 50.0
  min_apy: 5.0

Process:
  1. Treasury: 300 USDT, 150 idle
  2. Aave USDT APY: 3.2% -- BELOW 5.0% minimum
  3. Alternative protocols checked: none above 5.0%
  4. ABORT

Output:
  success: false
  reasoning: "Best available APY is 3.2% (Aave V3), which is below your minimum threshold of 5.0%. No DeFi protocol currently offers USDT yields meeting your criteria. Consider lowering min_apy or waiting for better market conditions."
```

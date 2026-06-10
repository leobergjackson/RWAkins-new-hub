---
name: cross-chain-swap
version: 1.0.0
description: Bridge and swap tokens across chains via Velora DEX and USDT0 bridge
author: Danish A
license: Apache-2.0
protocol: openclaw-v1
agent: aerofyta
tags: [bridge, swap, cross-chain, usdt0, velora, layerzero]
requires:
  tools:
    - aerofyta_bridge_routes
    - aerofyta_bridge_quote
    - aerofyta_bridge_transfer
    - aerofyta_swap_quote
    - aerofyta_routing_analysis
    - aerofyta_get_balance
    - aerofyta_get_risk_assessment
    - aerofyta_fee_estimate
    - aerofyta_verify_tx
  skills:
    - security-scan
---

# Cross-Chain Swap

Move USDT between supported blockchains using the USDT0 bridge (LayerZero OFT) or swap tokens via Velora DEX aggregator. Automatically selects the optimal route based on fees, speed, and liquidity.

## Trigger

Activate this skill when:
- User requests moving funds between chains (e.g., "bridge 10 USDT from Ethereum to TON")
- `tip-creator` skill determines a cross-chain transfer is needed to tip on a specific chain
- Treasury rebalancing requires redistributing funds across chains
- User requests a token swap on a single chain via Velora

Do NOT activate when:
- Transfer is on the same chain (use direct `send_transaction` instead)
- Kill switch is engaged
- Amount is below minimum bridge threshold (typically 1 USDT)

## Input

| Field | Type | Required | Description |
|---|---|---|---|
| `operation` | string | yes | One of: `bridge`, `swap`, `quote` |
| `from_chain` | string | yes | Source chain identifier |
| `to_chain` | string | conditional | Destination chain (required for bridge, optional for swap) |
| `amount` | number | yes | Amount in USDT to bridge/swap |
| `token_in` | string | no | Input token for swap (default: USDT) |
| `token_out` | string | no | Output token for swap (default: USDT) |
| `max_slippage` | number | no | Maximum acceptable slippage percent (default: 1.0) |

## Process

### Bridge Flow

#### Step 1: Route Discovery
Find available bridge routes between source and destination chains.
- Call `aerofyta_bridge_routes` to list all USDT0 bridge paths
- Filter for routes matching `from_chain` -> `to_chain`
- If no direct route exists, check for multi-hop paths (max 2 hops)
- If no route exists at all, return error with supported chain pairs

#### Step 2: Quote & Fee Analysis
Get exact costs for the bridge transfer.
- Call `aerofyta_bridge_quote` with from_chain, to_chain, amount
- Extract: bridge fee, gas cost (source chain), gas cost (destination chain), estimated time
- Calculate total cost as percentage of transfer amount
- If total cost > 5% of amount, warn user and suggest waiting or using a different route
- Compare against historical fee data for time-of-day optimization

#### Step 3: Risk Assessment
Evaluate bridge security.
- Call `aerofyta_get_risk_assessment` for cross-chain transfer
- Check bridge contract status: is it paused, rate-limited, or degraded?
- Verify LayerZero endpoint health on both chains
- Check recent bridge transaction success rate (abort if < 95%)
- Validate that destination chain has sufficient liquidity

#### Step 4: Balance Verification
Ensure sufficient funds on source chain.
- Call `aerofyta_get_balance` for from_chain
- Verify USDT balance >= amount + any approval gas
- Verify native token balance sufficient for gas on source chain
- If insufficient, suggest depositing funds or using a different source chain

#### Step 5: Execute Bridge
Initiate the cross-chain transfer.
- If USDT needs approval for the bridge contract, execute approval first
- Call `aerofyta_bridge_transfer` with from_chain, to_chain, amount
- Capture source chain transaction hash
- Begin monitoring for destination chain delivery

#### Step 6: Monitor & Confirm
Track the bridge transfer through to completion.
- Call `aerofyta_verify_tx` on source chain to confirm lock/burn
- Monitor LayerZero message status (sent -> inflight -> delivered)
- Call `aerofyta_verify_tx` on destination chain once message arrives
- Typical delivery times: 1-5 minutes depending on chain pair
- If delivery takes > 15 minutes, alert user with tracking details
- Log the complete bridge operation with timing data

### Swap Flow (Single Chain via Velora)

#### Step 1: Quote
Get the best swap rate.
- Call `aerofyta_swap_quote` with token_in, token_out, amount, chain
- Compare rate against external price feeds for fairness check
- Calculate price impact and slippage estimate
- If price impact > max_slippage, abort and warn user

#### Step 2: Risk Check
Validate the swap.
- Call `aerofyta_get_risk_assessment` for the swap operation
- Check token contract addresses against known-good list
- Verify liquidity pool depth supports the trade size

#### Step 3: Execute Swap
Perform the token swap via Velora.
- Execute token approval if needed
- Call swap execution with slippage protection
- Capture transaction hash
- Verify output amount matches expected (within slippage tolerance)

### Quote-Only Flow

Return pricing information without executing.
- Call appropriate quote tool (bridge or swap)
- Return fee breakdown, estimated time, and route details
- Cache quote for 60 seconds for user decision

## Output

### Bridge Output

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether bridge completed |
| `source_tx_hash` | string | Transaction hash on source chain |
| `destination_tx_hash` | string | Transaction hash on destination chain |
| `from_chain` | string | Source chain |
| `to_chain` | string | Destination chain |
| `amount_sent` | number | USDT sent from source |
| `amount_received` | number | USDT received on destination |
| `bridge_fee` | number | Bridge protocol fee in USDT |
| `gas_cost_source` | number | Gas paid on source chain (native token) |
| `gas_cost_destination` | number | Gas paid on destination chain (native token) |
| `total_cost_pct` | number | Total fees as percentage of amount |
| `delivery_time_seconds` | number | Actual delivery time |
| `route` | string | Bridge route used |

### Swap Output

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether swap completed |
| `tx_hash` | string | Swap transaction hash |
| `chain` | string | Chain where swap executed |
| `token_in` | string | Input token |
| `token_out` | string | Output token |
| `amount_in` | number | Amount of input token spent |
| `amount_out` | number | Amount of output token received |
| `effective_rate` | number | Actual exchange rate achieved |
| `slippage` | number | Actual slippage percent |
| `gas_cost` | number | Gas paid (native token) |

### Quote Output

| Field | Type | Description |
|---|---|---|
| `operation` | string | `bridge` or `swap` |
| `amount` | number | Quoted amount |
| `estimated_output` | number | Expected output after fees |
| `fees` | object | Breakdown of all fees |
| `estimated_time` | number | Expected completion time in seconds |
| `route` | string | Proposed route |
| `valid_until` | string | ISO timestamp when quote expires |

## Examples

### Example 1: Bridge USDT from Ethereum to TON
```
Input:
  operation: "bridge"
  from_chain: "ethereum-sepolia"
  to_chain: "ton-testnet"
  amount: 50.0

Process:
  1. Routes: ETH->TON via USDT0 LayerZero OFT -- available
  2. Quote: bridge fee 0.10 USDT, gas source 0.003 ETH, gas dest 0.05 TON
  3. Total cost: 0.32% of amount -- acceptable
  4. Risk: 0.12, bridge status healthy, 99.2% success rate -- PASS
  5. Balance: 200 USDT on ETH, 0.1 ETH for gas -- sufficient
  6. Execute bridge transfer
  7. Source TX confirmed at block 3456789
  8. LayerZero message delivered in 142 seconds
  9. Destination TX confirmed on TON

Output:
  success: true
  source_tx_hash: "0xabc123..."
  destination_tx_hash: "EQdef456..."
  amount_sent: 50.0
  amount_received: 49.90
  bridge_fee: 0.10
  total_cost_pct: 0.32
  delivery_time_seconds: 142
  route: "USDT0 LayerZero OFT (ETH -> TON)"
```

### Example 2: Quote before bridging
```
Input:
  operation: "quote"
  from_chain: "ethereum-sepolia"
  to_chain: "tron-nile"
  amount: 100.0

Process:
  1. Fetch bridge quote for ETH -> TRON
  2. Calculate all fees
  3. Return quote without executing

Output:
  operation: "bridge"
  amount: 100.0
  estimated_output: 99.85
  fees:
    bridge_fee: 0.12
    gas_source: "0.004 ETH (~0.03 USDT)"
    gas_destination: "~0 TRX (energy model)"
  estimated_time: 180
  route: "USDT0 LayerZero OFT (ETH -> TRON)"
  valid_until: "2026-03-24T12:01:00Z"
```

### Example 3: Bridge rejected due to high fees
```
Input:
  operation: "bridge"
  from_chain: "ethereum-sepolia"
  to_chain: "ton-testnet"
  amount: 2.0

Process:
  1. Route available: ETH -> TON via USDT0
  2. Quote: bridge fee 0.10, gas 0.003 ETH (~0.45 USDT)
  3. Total cost: 27.5% of amount -- EXCEEDS 5% threshold
  4. WARN and suggest alternatives

Output:
  success: false
  reasoning: "Bridge fees (0.55 USDT total) represent 27.5% of the 2.0 USDT transfer, which exceeds the 5% cost threshold. Suggestions: (1) Increase transfer amount to amortize fees, (2) Wait for lower gas prices, (3) Fund the destination chain directly."
```

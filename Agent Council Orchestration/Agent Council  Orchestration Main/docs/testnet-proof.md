# Testnet Transaction Proof

AeroFyta executes **real on-chain transactions** on public testnets via Tether WDK.
This document explains how to verify that tips are genuine blockchain transfers.

## Supported Testnet Explorers

| Chain | Explorer URL |
|---|---|
| Ethereum Sepolia | `https://sepolia.etherscan.io/tx/{hash}` |
| TON Testnet | `https://testnet.tonscan.org/tx/{hash}` |
| TRON Nile | `https://nile.tronscan.org/#/transaction/{hash}` |

## Step-by-Step: Fund Wallet, Send Tip, Verify

### 1. Start the Agent

```bash
cd agent && npm install && npm run dev
```

The agent logs its wallet addresses at startup:

```
Wallet address [ethereum-sepolia]: 0x...
Wallet address [ton-testnet]: UQ...
Wallet address [tron-nile]: T...
```

### 2. Fund the Wallet with Testnet Tokens

| Chain | Faucet |
|---|---|
| Ethereum Sepolia ETH | https://sepoliafaucet.com or https://www.alchemy.com/faucets/ethereum-sepolia |
| Sepolia USDT | Deploy a mock ERC-20 or use the WDK-provided test token |
| TON Testnet | https://t.me/testgiver_ton_bot (Telegram bot) |
| TRON Nile TRX | https://nileex.io/join/getJoinPage |

### 3. Send a Tip via the API

```bash
curl -X POST http://localhost:3001/api/tip \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    "amount": "0.001",
    "token": "native",
    "message": "Test tip for verification"
  }'
```

The response includes:

```json
{
  "tipId": "...",
  "status": "confirmed",
  "txHash": "0xabc123...",
  "explorerUrl": "https://sepolia.etherscan.io/tx/0xabc123...",
  "chainId": "ethereum-sepolia"
}
```

### 4. Verify on the Block Explorer

1. Copy the `explorerUrl` from the response (or from the agent logs).
2. Open it in a browser.
3. Confirm that:
   - The `From` address matches the agent wallet.
   - The `To` address matches the recipient.
   - The `Value` matches the tip amount.
   - The `Status` shows **Success**.

The agent also logs the full explorer URL to stdout:

```
Tip confirmed on-chain — verify at: https://sepolia.etherscan.io/tx/0xabc123...
```

## Verification Checklist

Use this checklist to confirm AeroFyta sends real testnet transactions:

- [ ] Agent starts and displays wallet addresses for each chain
- [ ] Wallet addresses are funded with testnet tokens (check balance on explorer)
- [ ] `POST /api/tip` returns a `txHash` (not a simulated/mock hash)
- [ ] `txHash` is visible on the corresponding block explorer
- [ ] Explorer shows correct `From` (agent wallet), `To` (recipient), and `Value`
- [ ] Transaction status is `Success` on the explorer
- [ ] Agent logs include the full explorer URL for each completed tip
- [ ] `GET /api/tip/{tipId}/receipt` returns a receipt with the same `txHash`
- [ ] Repeating the tip produces a different `txHash` (each tip is a unique transaction)
- [ ] Auto-payment subscriptions (when due) produce real `txHash` values logged to stdout

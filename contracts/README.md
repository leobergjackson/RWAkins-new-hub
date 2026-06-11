# RWAkins Contracts (Mantle Sepolia)

Self-contained Foundry project for the RWAkins RWA stack. Zero external
dependencies (no `forge install` / OpenZeppelin needed).

## Contracts

- **`MockRWAToken`** — minimal ERC-20 used for the two legs:
  - `USDY` — Ondo tokenized treasuries (stable yield), ~4.80% APY
  - `mETH` — Mantle staked ETH (growth leg), ~3.60% APY
  - Open `mint` (testnet faucet) and an on-chain `currentYield()` (bps) read live by the dashboard.
- **`RWAkinsVault`** — custodies a user's two-leg position and executes the AI CFO's
  rebalances on-chain. Enforces the hard invariants: `usdyBps + methBps == 10000`
  and `methBps <= 7000` (mETH ≤ 70%). Emits `Rebalanced` on every swap → a real,
  verifiable Mantle tx hash. ABI matches `../lib/rwa/abi.ts` exactly.

## Deploy

```bash
cd contracts
export DEPLOYER_PRIVATE_KEY=0x...      # funded Mantle Sepolia key (faucet: https://faucet.sepolia.mantle.xyz)
export METH_PRICE_USD=3000             # optional initial mETH/USDY price
forge script script/Deploy.s.sol --rpc-url mantle_sepolia --broadcast
```

The script deploys USDY + mETH + the vault, seeds the deployer with test tokens,
and **writes the addresses into `../lib/rwa-deployed.json`** — so the frontend
flips from the demo position to live on-chain reads automatically. Restart
`npm run dev` (or rebuild) after deploying.

## Build / test

```bash
forge build
```

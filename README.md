# Kubryx

One financial OS for Web3. Eight powerful tools — credit scoring, inheritance vaults, private trading, DeFi lending, treasury automation, AI agents, split payments, and a unified dashboard — across four chains.

**Live:** https://kubryx.vercel.app

---

## Tools

| Tool | Route | Chain | Backend |
|------|-------|-------|---------|
| Credit Passport | `/credit` | QIE Mainnet | CreditBlocks |
| Legacy Vault | `/legacy` | QIE Mainnet | EternalVault |
| SyncSplit | `/split` | Stellar Testnet | Soroban RPC |
| AI Lending | `/lend` | Arbitrum | Lendora AI |
| Agent Mesh | `/agents` | Solana Devnet | TrustMesh |
| Shadow OS | `/shadow` | Solana Devnet | ShadowLedger |
| Treasury AI | `/treasury` | Solana Devnet | PalmFlow |
| Private Vault | `/vault` | Multi-chain | CipherVault |

---

## Contracts

| Contract | Address | Chain |
|----------|---------|-------|
| NeuroCredStaking V2 | `0x08DA91C81cebD27d181cA732615379f185FbFb51` | QIE Mainnet |
| SyncSplit Soroban | `CCEIBX7TF3OY5CWE5GDGZPFNNTIRTLLHDYJ4NQG4YLWYTNURUZ4YGKGF` | Stellar Testnet |
| TrustMesh Program | `66DXeSqBccWxWWw9S21vxe2Mvvqqkmw5KsK5jqA42quz` | Solana Devnet |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind v4 |
| Animation | Framer Motion (landing page only) |
| Wallets | MetaMask (EVM/QIE), Phantom (Solana), Freighter (Stellar) |
| Stellar | `@stellar/freighter-api` via CDN dynamic import |
| Toasts | Sonner |
| AI fallback | Groq `llama-3.3-70b-versatile` |
| Deployment | Vercel (frontend), Render (backends) |
| Database | PostgreSQL (schema in `database/schema.sql`) |

---

## Development

```bash
cd hub
npm install
npm run dev
```

Open http://localhost:3000.

### Environment variables

Create `hub/.env.local`:

```env
NEXT_PUBLIC_CREDITBLOCKS_API=https://creditblock-rs-backend.onrender.com
NEXT_PUBLIC_ETERNALVAULT_API=https://your-eternalvault.onrender.com
NEXT_PUBLIC_LENDORA_API=https://your-lendora.onrender.com
NEXT_PUBLIC_TRUSTMESH_API=https://your-trustmesh.onrender.com
NEXT_PUBLIC_SHADOW_API=https://your-shadow.onrender.com
NEXT_PUBLIC_PALMFLOW_API=https://your-palmflow.onrender.com
NEXT_PUBLIC_CIPHER_API=https://your-cipher.onrender.com
NEXT_PUBLIC_STELLAR_RPC=https://soroban-testnet.stellar.org
NEXT_PUBLIC_GROQ_API_KEY=gsk_...
```

All tools degrade gracefully to demo mode when backends are offline.

---

## Deploy

```bash
# Deploy frontend to Vercel
cd hub && vercel --prod

# Check all backend health endpoints
node scripts/health-check.js
```

Backend services deploy to Render using the `render.yaml` in each service directory.

---

## Architecture

- **Offline-first:** every API call falls back to demo data; `DemoBanner` notifies users
- **Wallet persistence:** addresses stored in `sessionStorage` across page navigations
- **Error isolation:** React `ErrorBoundary` wraps each dashboard section independently
- **Health polling:** 60-second auto-refresh of all backend statuses on the dashboard
- **Stellar dynamic import:** `new Function('u', 'return import(u)')` bypasses Turbopack static analysis for CDN import
- **OG images:** `/og-default.svg` (1200×630) used across all routes

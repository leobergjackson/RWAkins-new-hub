# CoverFi Demo Script (5 minutes)

**Target audience:** DoraHacks / BNB Chain judges, RWA Demo Day
**Goal:** Show CoverFi is real, deployed, and solves a problem no one else has touched.

---

## Setup (30 seconds)

- Open the CoverFi landing page in the browser
- Have MetaMask installed and connected to BSC Testnet (Chain ID 97)
- Have deployer wallet loaded (0xce220d...42fb3)
- Keep BNBScan open in a second tab for live verification

---

## Act 1: The Problem (45 seconds)

**On the landing page:**

- Show the hero section. Read the headline aloud.
- State the problem clearly: "There are $26.6 billion in ERC-3643 RWA tokens on public blockchains right now. Every single holder bears 100% unhedged issuer default risk. If the issuer defaults, there is zero automated protection."
- Pause. Let that land.
- "Nexus Mutual, Risk Harbor, Neptune Mutual — they cover smart contract bugs. None of them cover RWA issuer default. This is an architectural limitation, not an oversight."
- Scroll to the "How It Works" section. Point to the 6-step flow diagram.
- "CoverFi fills this gap. It is the first on-chain CDS equivalent for tokenized real-world assets."

---

## Act 2: The Solution — Dashboard (1 minute)

**Navigate to the app:**

- Click "Launch App" on the landing page
- The dashboard opens. Connect MetaMask wallet.
- Wait for on-chain data to load (all data is live from BSC Testnet contracts)

**Walk through the dashboard panels:**

1. **Protocol Overview** — Point out: "3 issuers registered, IRS scores calculated in real-time, insurance pool active with $10 TVL across two tranches."
2. **Issuer Registry** — "Each issuer goes through a state machine: Observation, Active, Monitoring, Defaulted, Wind-Down, Closed. This is a full lifecycle manager."
3. **Insurance Pool Stats** — "Senior tranche: $7 USDT. Junior tranche: $3 USDT. 70/30 split. Junior absorbs losses first — exactly like Centrifuge's TIN/DROP model but applied to insurance."

---

## Act 3: Live Demo — The Core Mechanics (2 minutes)

### IRS Oracle (30 seconds)

- Open the IRS Oracle panel
- Show the radar chart with 5 dimensions:
  - NAV Punctuality (0-250)
  - Attestation Accuracy (0-250)
  - Repayment History (0-300)
  - Collateral Health via Chainlink PoR (0-150)
  - Protocol Activity (0-50)
- "This issuer has an IRS of 600. That maps to a premium of 696 basis points — 6.96% APR. The formula is exponential: 1600 * e^(-0.001386 * IRS). IRS 1000 pays 4%. IRS 0 pays 16%."

### Insurance Pool Mechanics (30 seconds)

- Show the dual-tranche waterfall diagram
- "Three layers of protection before a policyholder loses money: first the issuer's own 5% bond, then junior tranche capital, then senior tranche capital."
- Show srCVR and jrCVR token balances — "These use Compound's cToken exchange rate model. Your share appreciates as premiums flow in."

### Purchase Coverage (45 seconds)

- Click "Purchase Coverage"
- Select the registered issuer from the dropdown
- Enter coverage amount: 100 tokens
- Watch the premium calculation update in real-time: "696 bps on 100 tokens = premium shown"
- Click "Purchase Coverage"
- MetaMask popup appears — confirm the transaction
- Wait for confirmation (~3 seconds on BSC Testnet)
- **Show the ProtectionCert NFT** that appears in the user's portfolio
- "This is an ERC-5192 soulbound token. Non-transferable. It represents your coverage position and includes the estimated recovery ratio."

### Verify on BNBScan (15 seconds)

- Click the TX hash link — opens BNBScan
- "Every transaction is verifiable. This is not a simulation."

---

## Act 4: Default and Payout (30 seconds)

- Return to the dashboard
- Show the Events feed:
  - "Three bonded professionals — a custodian, a legal representative, and an auditor — each submitted independent attestations confirming the issuer missed payment by 30+ days."
  - "2-of-3 threshold met. DefaultOracle confirmed the credit event."
  - "PayoutEngine executed automatically. The investor received $15 USDT after ERC-3643 compliance checks — isVerified() and isFrozen() both passed."
- Show the SubrogationNFT: "This NFT was minted to the CoverFi Foundation. It represents the legal right to pursue recovery against the defaulted issuer. The protocol's loss is not necessarily permanent."
- Switch to BNBScan tab: "25 real transactions on BSC Testnet. All verifiable."

**Key TX hashes to have ready:**
- Payout TX: `0x5381147c824b4006cd95af66434f57795578c050000b24674b06a16078d74c65`
- Default TX: `0xc366dc7e84be2a52ecf4f110c6773b04beba54c40ca9c3503a5ee89872d1fda1`

---

## Closing (15 seconds)

- Return to the dashboard. Face the judges.
- "12 smart contracts. 376 tests. Fully deployed on BSC Testnet."
- "CoverFi is the first CDS equivalent for ERC-3643 RWA tokens. It is infrastructure — the missing credit protection primitive that enables institutional capital to flow into on-chain RWA markets with confidence."
- "Thank you."

---

## Backup: Quick Recovery Notes

| If this happens... | Do this... |
|---|---|
| MetaMask not connecting | Refresh page, check BSC Testnet is selected (Chain ID 97) |
| Transaction stuck | Show pre-recorded TX hashes on BNBScan instead |
| Dashboard data not loading | Switch to BNBScan tab and walk through contracts directly |
| Question about tests | "376 tests across 12 contracts, all passing. Happy to show the test suite after." |
| Question about audits | "External audit planned for Phase 1 (April-July). Code uses OpenZeppelin base contracts and follows CEI pattern throughout." |

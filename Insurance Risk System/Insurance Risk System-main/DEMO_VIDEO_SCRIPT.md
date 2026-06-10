# CoverFi Protocol — Demo Video Script
## HashKey Chain Horizon Hackathon 2026 | DeFi Track

---

## VIDEO STRUCTURE (5-7 minutes)

---

### INTRO (30 seconds)

**[Screen: CoverFi landing page — coverfi-protocol.vercel.app]**

"CoverFi is the first on-chain credit default swap protocol for tokenized real-world assets — deployed on HashKey Chain.

There's 26 billion dollars in tokenized RWA tokens on-chain today. Every single one of them has zero automated protection against issuer default. If an issuer fails, investors lose everything and face years of legal proceedings.

CoverFi fixes this with three innovations: mandatory issuer bonds, algorithmic credit scoring, and compliance-native automated payouts."

---

### THE PROBLEM (45 seconds)

**[Screen: Show the problem section on landing page, scroll through stats]**

"Today, if you hold a tokenized real estate token or a trade finance bond, and the issuer defaults — you have no protection. There's no DeFi insurance product that covers this.

Existing DeFi insurance like Nexus Mutual and Risk Harbor only covers smart contract bugs and hacks. Nobody protects against the issuer simply failing to pay.

CoverFi is the missing infrastructure layer. We're building the CDS — credit default swap — equivalent for on-chain RWA tokens."

---

### THREE CORE INNOVATIONS (90 seconds)

**[Screen: Dashboard page — show IRS section]**

**Innovation 1: Issuer Reputation Score (IRS)**

"Every registered issuer gets a continuous behavioral credit score from 0 to 1000, computed from five on-chain signals:
- NAV Punctuality — do they update net asset value on time?
- Attestation Accuracy — do their attestors verify correctly?
- Repayment History — do they pay obligations on time?
- Collateral Health — is the backing maintained?
- Governance Activity — are they actively participating?

This is the first on-chain credit rating for RWA issuers."

**[Screen: Show premium curve chart on dashboard]**

**Innovation 2: Algorithmic Premium Pricing**

"The IRS score directly drives the insurance premium through an exponential formula: premium equals 1600 times e to the power of negative 0.001386 times the IRS score.

A perfect issuer with IRS 1000 pays only 4% annual premium. A risky issuer with IRS 0 pays 16%. The market prices risk automatically — no human underwriters needed."

**Innovation 3: ERC-3643 Compliance-Native Payout**

"When a default is confirmed, the payout engine checks every token holder's KYC status via ERC-3643's isVerified() and isFrozen() before sending USDT. Compliant holders get paid instantly. Non-compliant holders are held in escrow. This is the only insurance protocol that respects regulatory compliance at the payout level."

---

### LIVE DEMO — THE APP (120 seconds)

**[Screen: Dashboard — connected to HashKey Chain Testnet]**

"Let me show you CoverFi live on HashKey Chain Testnet.

**Dashboard Overview**
Here's the main dashboard. You can see our deployed protocol — 16 smart contracts, all live on HashKey Chain. The network badge confirms we're on HashKey Chain Testnet, Chain ID 133.

The dashboard shows the insurance pool with senior and junior tranches, the IRS radar chart for our demo issuer, and the premium calculator.

**[Screen: Show 'Your Position' section]**

**Real-Time Yield Calculation**
When you deposit into the pool, you see your position with real-time unrealized yield. Senior tranche uses a Compound cToken exchange rate model — as premiums flow in, the exchange rate increases and your srCVR tokens appreciate. Junior tranche uses a pro-rata model. All calculated from live on-chain data, not hardcoded values.

**[Screen: Pool page]**

**Pool Management**
The pool page shows both tranches. Senior earns lower but safer yield. Junior earns higher yield but absorbs first-loss. The 70/30 premium split is enforced on-chain — 70% to senior, 30% to junior, after a 5% protocol fee.

You can deposit, withdraw, and see your exchange rates update after every premium payment.

**[Screen: Show the issuer registration flow]**

**Issuer Registration**
Any RWA token issuer can register by posting a 5% bond as first-loss capital, designating three attestors (custodian, legal representative, auditor), and getting their IRS score initialized.

**[Screen: Attestor page]**

**Default Detection**
When an issuer defaults, our 2-of-3 attestor system kicks in. Two out of three bonded professional attestors must independently confirm the default on-chain. This triggers the payout engine automatically."

---

### THE WATERFALL (45 seconds)

**[Screen: Dashboard — loss waterfall diagram]**

"The payout follows a strict waterfall:

1. First, the issuer's 5% bond is liquidated — this is first-loss capital
2. Then, junior tranche (jrCVR) absorbs remaining losses — this is why junior earns higher yield
3. Finally, senior tranche (srCVR) is tapped only as a last resort

Every dollar is distributed pro-rata to verified ERC-3643 token holders. The payout is fully automated — no human intervention, no claims process, no lawyers."

---

### ON-CHAIN PROOF (30 seconds)

**[Screen: HashKey Chain Explorer — testnet-explorer.hsk.xyz]**

"Everything I've shown you is live on HashKey Chain. Here are verifiable transactions:

- Issuer registration and bond deposit
- Pool deposits and premium payments
- All 16 smart contracts deployed and callable

You can verify every transaction on HashKey Chain's block explorer. 416 tests passing, including 40 edge case tests for the yield calculation system."

---

### TECHNICAL DEPTH (30 seconds)

**[Screen: GitHub repo or code view]**

"Under the hood:
- 12 core smart contracts plus 5 mocks
- Solidity 0.8.19 with ABDKMath64x64 for gas-efficient fixed-point math
- Compound cToken model for senior yield accrual
- ERC-5192 soulbound Protection Certificate NFTs
- ERC-721 SubrogationNFT for recovery rights
- 416 tests passing in 9 seconds
- Complete 9-page frontend with claymorphism design system"

---

### WHY HASHKEY CHAIN (20 seconds)

"We chose HashKey Chain because it's the only SFC-licensed L2 — meaning it's built for regulated financial infrastructure. CoverFi's compliance-native payout engine aligns perfectly with HashKey's vision of technology empowering finance within a regulatory framework.

RWA tokens need regulated infrastructure. HashKey Chain provides it. CoverFi builds on it."

---

### CLOSING (20 seconds)

**[Screen: Landing page with CTA buttons]**

"CoverFi is the first on-chain CDS equivalent for RWA tokens. We're the only protection protocol in this hackathon — and we're live on HashKey Chain.

26 billion dollars in RWA tokens. Zero default protection. Until now.

Thank you."

---

## KEY STATS TO MENTION

| Stat | Value |
|---|---|
| RWA market unprotected | $26.6 billion |
| Smart contracts deployed | 16 on HashKey Chain |
| Tests passing | 416 (unit + integration + edge cases) |
| Frontend pages | 9 pages, ~16,000 lines |
| IRS dimensions | 5 behavioral signals |
| Premium formula | 1600 x e^(-0.001386 x IRS) |
| Tranche split | 70% senior / 30% junior |
| Protocol fee | 5% |
| Default confirmation | 2-of-3 attestors |
| Chain | HashKey Chain Testnet (ID 133) |
| Track | DeFi |

## CONTRACT ADDRESSES FOR SCREEN

```
InsurancePool:  0xa5d64A7770136B1EEade6B980404140D8D5F7C06
srCVR:          0x2Aad26de595752d7D6FCc2f4C79F1Bf15B60E1CD
jrCVR:          0xD01e871c97746FC6a3f4B406aA60BE1Fb7FAcf6B
PayoutEngine:   0x44944cB598A750Df4C4Bf9A7D3FdDDf7575F88F5
IssuerRegistry: 0xc07859b25FC869F0a81fae86b9B5bEa868D08A9f
IRSOracle:      0x8D4C37f45883aAEEd20d2CC1020e6Ab193D3A50C
```

Explorer: https://testnet-explorer.hsk.xyz
Demo: https://coverfi-protocol.vercel.app
GitHub: https://github.com/Sanjay-N23/coverfi-protocol

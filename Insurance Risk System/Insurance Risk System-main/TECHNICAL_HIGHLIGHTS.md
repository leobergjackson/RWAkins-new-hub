# CoverFi — Technical Highlights

Eight technical achievements that distinguish CoverFi from every other submission.

---

## 1. Exponential Premium Formula with Fixed-Point Math

CoverFi prices credit protection using a continuous exponential function:

```
Premium (bps) = 1600 * e^(-0.001386 * IRS)
```

- IRS 1000 (perfect score) = 400 bps (4% APR) — lowest premium
- IRS 500 (median) = 803 bps (8.03% APR)
- IRS 0 (worst score) = 1600 bps (16% APR) — highest premium

Implemented using **ABDKMath64x64** library for 128-bit fixed-point arithmetic. Solidity has no native `exp()` function and floating-point math does not exist in the EVM. The implementation converts basis points to 64.64 fixed-point format, computes the natural exponential via the library, and converts back — all without precision loss exceeding 1 basis point.

**Why it matters:** Every other DeFi insurance protocol uses flat-rate or governance-voted premiums. CoverFi is the first to implement continuous, behavior-driven pricing on-chain.

**Contract:** `IRSOracle.sol` at [0xa4ECEB47F80a32D7176C23e4993cDa4d2337Fc3A](https://testnet.bscscan.com/address/0xa4ECEB47F80a32D7176C23e4993cDa4d2337Fc3A)

---

## 2. Five-Dimension Behavioral Credit Scoring (IRS)

The Issuer Reputation Score is a composite credit score (0-1000) derived from five on-chain signal dimensions:

| Dimension | Max Points | Source |
|---|---|---|
| NAV Punctuality | 250 | On-time NAV reporting frequency |
| Attestation Accuracy | 250 | TIR attestation consistency |
| Repayment History | 300 | Payment obligation fulfillment |
| Collateral Health | 150 | Chainlink Proof of Reserve LTV ratio |
| Protocol Activity | 50 | Governance participation, responsiveness |

The IRS includes a **Time-Weighted Average Score (TWAS)** cache for gas-efficient reads and an **Early Warning System (EWS)** that fires alerts when the score drops 50+ points in a single update — giving investors 24-48 hours to react before formal default proceedings begin.

**Why it matters:** No existing DeFi protocol has a behavioral credit scoring system for RWA issuers. This is a novel primitive.

**Contract:** `IRSOracle.sol` at [0xa4ECEB47F80a32D7176C23e4993cDa4d2337Fc3A](https://testnet.bscscan.com/address/0xa4ECEB47F80a32D7176C23e4993cDa4d2337Fc3A)

---

## 3. Compound cToken Exchange Rate Model

Senior tranche tokens (srCVR) use an exchange rate model directly inspired by Compound Finance:

```
exchangeRate = totalUnderlying / totalSupply
```

When premiums flow into the pool, `totalUnderlying` increases while `totalSupply` stays constant. This means each srCVR token is redeemable for progressively more USDT over time — yield accrual without rebasing, staking, or claiming.

Junior tranche tokens (jrCVR) use a fixed-balance ERC-20 model with higher yield and first-loss risk. Senior tokens have a 30-day lock period; junior tokens have a 14-day lock period.

**Why it matters:** The cToken model is battle-tested (Compound has held $1B+ TVL). Applying it to insurance tranches is novel and gives underwriters a familiar, composable yield token.

**Contracts:**
- `srCVR.sol` at [0xc07859b25FC869F0a81fae86b9B5bEa868D08A9f](https://testnet.bscscan.com/address/0xc07859b25FC869F0a81fae86b9B5bEa868D08A9f)
- `jrCVR.sol` at [0xa5d64A7770136B1EEade6B980404140D8D5F7C06](https://testnet.bscscan.com/address/0xa5d64A7770136B1EEade6B980404140D8D5F7C06)

---

## 4. Two-of-Three Multisig Attestation

Default confirmation requires independent attestations from 2 of 3 bonded professionals registered in the Trusted Issuer Registry (TIR):

| Role | Responsibility |
|---|---|
| Custodian | Confirms asset custody status and collateral availability |
| Legal Representative | Confirms legal default under applicable jurisdiction |
| Auditor | Confirms financial records support the default claim |

Each attestor must post their own bond (sized to make collusion economically unprofitable). Attestations are submitted via BNB Attestation Service (BAS) for on-chain verifiability. Four precisely defined default event types each have specific triggers, grace periods, and evidence requirements:

1. **PAYMENT_DELAY** — >7 days past due, 48h grace, 2-of-3 TIR
2. **GHOST_ISSUER** — 14 days silence, 72h notice, 2-of-3 TIR
3. **COLLATERAL_SHORTFALL** — <80% LTV for 48h, 7-day cure period
4. **MISAPPROPRIATION** — legal rep + custodian confirm, no grace period

**Why it matters:** Eliminates subjective governance votes. Default confirmation is deterministic, auditable, and economically secured against collusion.

**Contracts:**
- `TIR.sol` at [0xB10b1c9D88126965E57cCa2a7ED5a1348dbf7552](https://testnet.bscscan.com/address/0xB10b1c9D88126965E57cCa2a7ED5a1348dbf7552)
- `DefaultOracle.sol` at [0x1Ca7B678BDf1deCe9964c5178C01AB9312F2664D](https://testnet.bscscan.com/address/0x1Ca7B678BDf1deCe9964c5178C01AB9312F2664D)

---

## 5. ERC-3643 Compliant Payouts

Every payout transfer checks two conditions before execution:

```solidity
require(identityRegistry.isVerified(recipient), "Not verified");
require(!token.isFrozen(recipient), "Account frozen");
```

This is not optional decoration. ERC-3643 (T-REX) is the standard for regulated security tokens. If a payout were sent to an unverified address or a frozen account, it would violate securities regulations. CoverFi is the first insurance protocol designed from the ground up to be compliance-native with regulated token standards.

If a recipient fails compliance checks, the payout is routed to a compliance escrow rather than failing entirely — the funds are held safely until the recipient's status is resolved.

**Why it matters:** No existing DeFi insurance protocol can pay out to ERC-3643 security token holders. CoverFi can.

**Contract:** `PayoutEngine.sol` at [0xD01e871c97746FC6a3f4B406aA60BE1Fb7FAcf6B](https://testnet.bscscan.com/address/0xD01e871c97746FC6a3f4B406aA60BE1Fb7FAcf6B)

---

## 6. Soulbound NFTs (ERC-5192)

Protection Certificates are implemented as ERC-5192 soulbound tokens — non-transferable by design. This prevents:

- Secondary market speculation on coverage positions
- Coverage being separated from the actual RWA token holder
- Regulatory arbitrage through coverage trading

Each ProtectionCert contains on-chain metadata: the covered issuer, coverage amount, premium paid, purchase timestamp, and estimated recovery ratio based on current pool TVL. The certificate is burned when payout is executed, completing the lifecycle.

**Why it matters:** Soulbound tokens ensure that protection stays with the actual risk-bearer. This is a deliberate design choice that aligns insurance incentives correctly.

**Contract:** `ProtectionCert.sol` at [0x2Aad26de595752d7D6FCc2f4C79F1Bf15B60E1CD](https://testnet.bscscan.com/address/0x2Aad26de595752d7D6FCc2f4C79F1Bf15B60E1CD)

---

## 7. Dual-Tranche Risk Architecture

CoverFi implements a three-layer loss waterfall that absorbs losses in strict priority order:

```
Loss Event
  |
  v
[1] Issuer Bond (5% first-loss)     -- issuer's own capital
  |
  v
[2] Junior Tranche (30% of pool)    -- higher yield, higher risk
  |
  v
[3] Senior Tranche (70% of pool)    -- lower yield, last-loss protection
```

This directly mirrors the TIN/DROP first-loss model used by Centrifuge ($250M+ TVL) but applied to insurance rather than lending. The mandatory issuer bond ensures the issuer has direct financial skin in the game — their capital is liquidated before any underwriter is exposed.

Expected yield tiers:
- Senior (srCVR): 8-12% APR
- Junior (jrCVR): 20-28% APR

**Why it matters:** Risk tranching enables different risk appetites to participate in the same pool. Institutional LPs can take senior positions; risk-seeking capital can take junior positions for higher yield.

**Contract:** `InsurancePool.sol` at [0xBCF0012388045eA1183c96EEbe24754842a549eA](https://testnet.bscscan.com/address/0xBCF0012388045eA1183c96EEbe24754842a549eA)

---

## 8. SubrogationNFT for Legal Recovery

When a default is confirmed and payout executed, a SubrogationNFT (ERC-721) is minted to the CoverFi Foundation. This NFT represents the Foundation's legal right to pursue recovery against the defaulted issuer — the same "subrogation" principle used by traditional insurance companies.

The NFT contains on-chain metadata: the defaulted issuer address, total payout amount, default event type, confirmation timestamp, and attestor addresses. This creates an immutable, verifiable record that can be presented in legal proceedings across jurisdictions.

**Why it matters:** This bridges on-chain insurance mechanics with off-chain legal recovery. The protocol's loss from a default is not necessarily permanent — the Foundation can pursue the defaulted entity through traditional legal channels using the NFT as evidence.

**Contract:** `SubrogationNFT.sol` at [0x91062e509E75AAe31f1d6425b78D8815Ad941e73](https://testnet.bscscan.com/address/0x91062e509E75AAe31f1d6425b78D8815Ad941e73)

---

## Summary Stats

| Metric | Value |
|---|---|
| Smart Contracts | 12 (+ 3 mock contracts for testnet) |
| Test Cases | 376 |
| Solidity Version | 0.8.19 |
| Deployment Chain | BNB Chain (BSC Testnet, Chain ID 97) |
| Total Deployed Contracts | 16 |
| Demo Transactions | 25 on-chain TXs |
| External Integrations | Chainlink PoR, BNB Attestation Service, ERC-3643 T-REX |
| Math Library | ABDKMath64x64 (128-bit fixed-point) |
| Access Control | OpenZeppelin Ownable, ReentrancyGuard, Pausable |

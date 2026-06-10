# CoverFi Protocol -- Gas Usage Report

**Generated:** 2026-03-27
**Solidity:** 0.8.19 | **Optimizer:** enabled (200 runs) | **viaIR:** true
**Test suite:** 376 passing | **Block limit:** 60,000,000 gas

---

## Deployment Gas Costs

| Contract | Min Gas | Max Gas | Avg Gas | % of Block Limit |
|---|---|---|---|---|
| **IRSOracle** | - | - | 2,214,327 | 3.7% |
| **PayoutEngine** | 1,968,555 | 1,968,567 | 1,968,566 | 3.3% |
| **InsurancePool** | - | - | 1,870,398 | 3.1% |
| **ProtectionCert** | - | - | 1,841,880 | 3.1% |
| **IssuerRegistry** | 1,503,715 | 1,503,739 | 1,503,736 | 2.5% |
| **SubrogationNFT** | 1,436,303 | 1,436,315 | 1,436,313 | 2.4% |
| **TIR** | - | - | 1,340,467 | 2.2% |
| **srCVR** | 1,333,203 | 1,333,227 | 1,333,225 | 2.2% |
| **jrCVR** | 1,238,385 | 1,238,409 | 1,238,407 | 2.1% |
| **IssuerBond** | 952,512 | 952,524 | 952,524 | 1.6% |
| **DefaultOracle** | 835,658 | 835,670 | 835,670 | 1.4% |

**Total deployment gas (core contracts):** ~15,135,513 gas

---

## Function Gas Costs (Core Contracts)

### Most Expensive Operations (>100k gas avg)

| Contract | Function | Min | Max | Avg | Calls |
|---|---|---|---|---|---|
| **PayoutEngine** | executePayout | 296,292 | 661,870 | 546,785 | 25 |
| **PayoutEngine** | purchaseCoverage | 571,477 | 625,177 | 611,397 | 19 |
| **ProtectionCert** | mint | 332,608 | 334,724 | 333,078 | 9 |
| **SubrogationNFT** | mint | 259,729 | 261,857 | 260,264 | 8 |
| **IssuerRegistry** | register | 250,439 | 250,543 | 250,507 | 43 |
| **IRSOracle** | initializeScore | 95,528 | 234,852 | 226,655 | 34 |
| **InsurancePool** | depositSenior | 81,817 | 225,996 | 174,575 | 25 |
| **InsurancePool** | depositJunior | 79,729 | 221,267 | 173,423 | 27 |
| **DefaultOracle** | flagDefaultEvent | 79,670 | 187,904 | 172,745 | 42 |
| **InsurancePool** | payPremium | 127,137 | 177,016 | 143,763 | 3 |
| **srCVR** | mint | - | - | 144,410 | 6 |
| **jrCVR** | mint | 141,769 | 144,398 | 142,209 | 6 |
| **IssuerBond** | deposit | 115,513 | 135,497 | 131,340 | 23 |
| **TIR** | submitDefaultAttestation | 100,732 | 147,843 | 124,461 | 42 |
| **TIR** | registerAttestor | 121,743 | 121,755 | 121,750 | 66 |
| **InsurancePool** | initiateWithdrawalSenior | - | - | 120,992 | 2 |
| **InsurancePool** | liquidateForPayout | - | - | 115,048 | 3 |
| **DefaultOracle** | processConfirmation | 99,510 | 118,738 | 102,470 | 18 |
| **InsurancePool** | initiateWithdrawalJunior | - | - | 101,290 | 4 |

### Medium Cost Operations (40k-100k gas avg)

| Contract | Function | Min | Max | Avg | Calls |
|---|---|---|---|---|---|
| **IRSOracle** | recordRepaymentEvent | 50,170 | 146,583 | 96,347 | 11 |
| **srCVR** | redeem | - | - | 92,926 | 2 |
| **jrCVR** | redeem | - | - | 90,212 | 1 |
| **IssuerBond** | release | - | - | 90,240 | 9 |
| **IssuerRegistry** | initiateWindDown | - | - | 81,713 | 7 |
| **IssuerBond** | liquidate | - | - | 78,680 | 9 |
| **IRSOracle** | updateTWASCache | - | - | 72,833 | 5 |
| **TIR** | forceConfirmDefault | - | - | 69,854 | 2 |
| **jrCVR** | accrueYield | 43,847 | 94,994 | 69,370 | 6 |
| **InsurancePool** | addInsuredAmount | 53,123 | 73,035 | 60,470 | 6 |
| **TIR** | slashAttestor | 61,391 | 61,439 | 61,396 | 10 |
| **IRSOracle** | recordAttestationDispute | 56,188 | 56,205 | 56,197 | 2 |
| **ProtectionCert** | burn | - | - | 55,408 | 2 |
| **SubrogationNFT** | transferFrom | - | - | 57,401 | 3 |
| **IRSOracle** | recordNAVUpdate | 50,667 | 58,376 | 54,256 | 19 |
| **IRSOracle** | recordCollateralHealth | 50,388 | 56,582 | 54,492 | 6 |
| **IRSOracle** | updateCoverageRatio | 48,332 | 50,460 | 49,928 | 4 |
| **IRSOracle** | setScoreToZero | 47,269 | 50,674 | 48,972 | 3 |
| **InsurancePool** | activatePool | 47,801 | 47,813 | 47,813 | 31 |
| **DefaultOracle** | clearMonitoring | - | - | 47,848 | 7 |
| **IRSOracle** | recordActivity | 45,164 | 50,747 | 47,956 | 2 |
| **jrCVR** | advanceEpoch | - | - | 45,761 | 1 |
| **TIR** | resetDefaultConfirmation | - | - | 46,760 | 1 |
| **srCVR** | accrueYield | - | - | 43,847 | 2 |
| **InsurancePool** | activateRedemptionGate | 32,826 | 49,926 | 42,293 | 7 |

### Admin/Setter Operations (~46k gas avg)

All setter functions (setInsurancePool, setPayoutEngine, etc.) consistently cost ~46,000-47,000 gas. These are one-time setup calls.

---

## Highlighted: Most Expensive Operations

The top 5 gas-consuming user-facing operations:

1. **PayoutEngine.purchaseCoverage** -- 611,397 avg gas
   - Most expensive user transaction. Involves premium calculation, pool interaction, NFT minting.

2. **PayoutEngine.executePayout** -- 546,785 avg gas (max 661,870)
   - High variance (296k-662k) depending on payout complexity and subrogation NFT minting.

3. **ProtectionCert.mint** -- 333,078 avg gas
   - ERC-721 minting with on-chain metadata storage.

4. **SubrogationNFT.mint** -- 260,264 avg gas
   - ERC-721 minting with structured payout data.

5. **IssuerRegistry.register** -- 250,507 avg gas
   - Issuer registration with multi-contract state initialization.

---

## Optimization Recommendations

### High Priority

1. **PayoutEngine.purchaseCoverage (611k gas):** This is the primary user entry point. Consider:
   - Batch SSTORE operations by packing related fields into fewer storage slots
   - Move ProtectionCert minting to a lazy pattern (mint on first claim instead of on purchase)
   - Cache frequently read storage variables in memory within the function

2. **PayoutEngine.executePayout (547k avg, 662k max):** The high max gas is concerning for worst-case scenarios:
   - The 2.2x variance (296k-662k) suggests conditional branching with expensive paths
   - Consider splitting SubrogationNFT minting into a separate claimable step
   - Use events instead of storage where historical data does not need on-chain reads

3. **IRSOracle.initializeScore (227k gas):** Called 34 times in tests:
   - Review whether all initial storage writes are necessary
   - Consider a more compact storage layout for score components

### Medium Priority

4. **InsurancePool.depositSenior/depositJunior (174k gas):** Deposit operations are frequent:
   - Evaluate if tranche token minting can be optimized (currently ~144k for srCVR/jrCVR mint)
   - Consider ERC-4626 vault pattern which may be more gas-efficient for deposit/withdraw

5. **DefaultOracle.flagDefaultEvent (173k avg, 188k max):**
   - Review storage writes; consider packing default event data more tightly

6. **TIR.submitDefaultAttestation (124k avg, 148k max):**
   - High call count (42) makes this a good optimization target
   - Consider bitmap-based attestation tracking instead of mapping-based

### Low Priority (One-time Operations)

7. **Deployment costs** are reasonable (all under 4% of block limit). No immediate action needed.

8. **Admin setter functions** at ~46k gas are standard for storage-writing operations.

### General Recommendations

- **Storage packing:** Several contracts could benefit from packing related uint values into single 256-bit slots (e.g., timestamps + small integers)
- **Immutable variables:** Constructor-set addresses that never change should use `immutable` keyword to save ~2,100 gas per SLOAD (verify which ones already do)
- **Short-circuit evaluation:** In validation-heavy functions, order require checks from cheapest to most expensive
- **Consider EIP-2929:** First access to a storage slot costs 2,100 gas (cold) vs 100 gas (warm). Restructure code to access each slot only once where possible

---

## BSC Cost Estimates

At BSC gas price of 3 Gwei and BNB at ~$600:

| Operation | Gas | Cost (USD) |
|---|---|---|
| purchaseCoverage | 611,397 | ~$1.10 |
| executePayout | 546,785 | ~$0.98 |
| depositSenior | 174,575 | ~$0.31 |
| depositJunior | 173,423 | ~$0.31 |
| register (issuer) | 250,507 | ~$0.45 |
| Full deployment (11 core contracts) | ~15,135,513 | ~$27.24 |

All operations are well within practical cost limits for BSC.

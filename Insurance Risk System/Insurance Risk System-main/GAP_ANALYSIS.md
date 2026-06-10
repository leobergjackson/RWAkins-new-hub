# CoverFi Protocol -- Comprehensive Gap Analysis
## Proposal v5 vs. Current Implementation
## Date: 2026-03-27

---

## Summary

This document compares every feature, function, and requirement specified in `CoverFi_Proposal.md` (v5) against the current implementation state as reported in `FINAL_STATUS.md`, the deployed contracts, frontend files, and test suite. Each gap is rated:

- **CRITICAL** -- Blocks demo, judging, or submission. Must fix before March 31.
- **HIGH** -- Missing proposal feature that judges may ask about. Should fix if time permits.
- **MEDIUM** -- Incomplete but not blocking. Nice to have for demo polish.
- **LOW** -- Future-phase feature or minor detail. Document as roadmap item.

---

## 1. Smart Contract Gaps

### 1.1 Missing Functions (specified in proposal interfaces but absent from deployed contracts)

| # | Contract | Missing Function | Proposal Section | Priority |
|---|----------|-----------------|------------------|----------|
| 1 | IssuerRegistry | `challengeWindDown(tokenAddress)` | Section 13 | HIGH |
| 2 | DefaultOracle | `checkStateTransitions(tokenAddress)` | Section 17 | HIGH |
| 3 | DefaultOracle | `submitCureEvidence(tokenAddress, chainlinkResponseUID)` | Section 17 | HIGH |
| 4 | TIR | `submitMonitoringVote(tokenAddress, basAttestUID)` | Section 16 | HIGH |
| 5 | IRSOracle | `openTechnicalChallengeWindow(tokenAddress, basEvidenceUID)` | Section 15 | HIGH |
| 6 | IRSOracle | `resolveTechnicalChallenge(tokenAddress, isTechnicalFailure)` | Section 15 | HIGH |
| 7 | PayoutEngine | `processExpiredEscrow(holder, issuerToken)` | Section 19 | MEDIUM |
| 8 | PayoutEngine | `estimateCurrentPayout(holder, issuerToken)` | Section 19 | MEDIUM |
| 9 | PayoutEngine | `getTotalInsuredAmount(issuerToken)` | Section 19 | MEDIUM |
| 10 | InsurancePool | `getJuniorRatio(issuerToken)` view | Section 18 | LOW |
| 11 | InsurancePool | `getSeniorBalance(depositor, issuerToken)` view | Section 18 | LOW |
| 12 | InsurancePool | `getJuniorBalance(depositor, issuerToken)` view | Section 18 | LOW |
| 13 | IRSOracle | `getComponents(tokenAddress)` as external view | Section 15 | LOW |
| 14 | IRSOracle | `getTWASCache(tokenAddress)` as external view | Section 15 | LOW |
| 15 | TIR | `getMaxPoolTVL(tokenAddress)` | Section 16 | LOW |

### 1.2 Missing Security Features

| # | Feature | Proposal Reference | Priority |
|---|---------|-------------------|----------|
| 1 | **Pausable modifier** on all critical contracts -- Proposal Section 47.2 specifies all state-modifying functions should have `whenNotPaused`. No contract imports or uses `Pausable`. | Section 47 | HIGH |
| 2 | **Timelock on admin functions** (24-hour delay) -- mentioned in Section 47.2. Not implemented. | Section 47 | LOW (post-hackathon) |
| 3 | **Access control on DefaultOracle.flagDefaultEvent** -- currently `onlyOwner`, but proposal says should integrate with TIR attestation flow. | Section 17 | MEDIUM |
| 4 | **Access control on DefaultOracle.processConfirmation** -- proposal says "called by TIR after 2-of-3 votes received" but actual access control not verified as TIR-only. | Section 17 | MEDIUM |

### 1.3 Missing Events

| # | Contract | Missing Event | Proposal Section | Priority |
|---|----------|--------------|------------------|----------|
| 1 | IssuerRegistry | `MonitoringActivated(tokenAddress, irsAtActivation, block)` -- only has generic `StatusChanged` | Section 13 | LOW |
| 2 | IssuerRegistry | `DefaultConfirmed(tokenAddress, confirmationBlock)` -- separate from StatusChanged | Section 13 | LOW |
| 3 | DefaultOracle | `GraceExtended(tokenAddress, eventType, newExpiry)` | Section 17 | LOW |
| 4 | DefaultOracle | `CureWindowOpened(tokenAddress, cureExpiry)` | Section 17 | LOW |
| 5 | IRSOracle | `TechnicalChallengeOpened(tokenAddress, challenger, deadline)` | Section 15 | LOW |

### 1.4 Missing/Incomplete Logic

| # | Issue | Proposal Reference | Priority |
|---|-------|-------------------|----------|
| 1 | **DefaultOracle stores only one active event per issuer** (`activeEvents` is a single mapping, not array). Proposal specifies multiple concurrent event types with bitmask support via `eventTypeFlags`. | Section 17 | MEDIUM |
| 2 | **SubrogationNFT ClaimData struct is simplified** -- missing `issuerEOA`, `defaultEventHash`, `basAttestationUIDs[]`, `ipfsEvidenceHashes[]`, `escrowed`, `foundationAddress` fields compared to proposal Section 20. | Section 20 | MEDIUM |
| 3 | **InsurancePool.PoolState struct** missing `issuerBondBalance`, `srCVRExchangeRate`, `premiumsPaidThisEpoch` fields from proposal. | Section 18 | LOW |
| 4 | **ProtectionCert** -- proposal specifies `burnByHolder(tokenId)` for holders to burn their own cert. Not verified as present. | Section 21 | LOW |
| 5 | **ProtectionCert** -- proposal specifies `getCertByHolder(holder, issuerToken)` view. Not verified. | Section 21 | LOW |
| 6 | **ERC-5192 locked() function** on ProtectionCert -- proposal requires this for soulbound compliance. Implementation needs verification. | Section 21 | MEDIUM |
| 7 | **Wind-down challenge bond** -- proposal specifies 2% of issuer bond as challenge deposit with slashing. `challengeWindDown` function entirely missing. | Section 13 | HIGH |
| 8 | **Bond calculation at deposit** -- proposal specifies bond = 5% x totalSupply x currentNAV. IssuerBond.deposit takes marketCap as parameter (trusts caller). No on-chain verification against Chainlink oracle. | Section 14 | MEDIUM |
| 9 | **Escrow 4% APR accrual** -- proposal says escrowed funds earn 4% APR. Not implemented. | Section 19 | LOW |
| 10 | **Escrow 180-day maximum** with auto-return to pool -- `processExpiredEscrow` function missing. | Section 19 | MEDIUM |

### 1.5 Missing Contract Interactions (Wiring Gaps)

| # | Issue | Priority |
|---|-------|----------|
| 1 | **TIR does not call DefaultOracle.processConfirmation** automatically after 2-of-3 confirmation. Proposal says this should be automatic. | HIGH |
| 2 | **DefaultOracle does not automatically call PayoutEngine.executePayout** on confirmation. Proposal Section 6 Step 6 says payout is triggered automatically. | HIGH |
| 3 | **DefaultOracle does not call InsurancePool.activateRedemptionGate** on monitoring. Proposal Section 6 Step 5 specifies this. | MEDIUM |
| 4 | **IRSOracle EWS does not call DefaultOracle.setMonitoringFlag** automatically. Proposal Section 23.7 specifies this chain. | MEDIUM |
| 5 | **InsurancePool.payPremium does not call IRSOracle.updateCoverageRatio**. Proposal Section 18 specifies this. | LOW |

---

## 2. Frontend Gaps

### 2.1 Missing Pages

| # | Missing Page | Proposal Reference | Priority |
|---|-------------|-------------------|----------|
| 1 | **Issuer Registration Page** -- No UI for issuers to register tokens, deposit bond, or manage their profile. The proposal describes a complete issuer onboarding flow (Section 6, Steps 1-3). | Section 6 | MEDIUM |
| 2 | **Issuer Dashboard** -- No page for issuers to pay premiums, view their IRS score breakdown, initiate wind-down, or see their bond status. | Section 6 | MEDIUM |
| 3 | **TIR Attestor Page** -- No UI for attestors to register, submit default attestations, or submit monitoring votes. | Section 16 | LOW |
| 4 | **Admin/Governance Page** -- No UI for protocol admin actions (wiring, pause, etc.). | Section 47 | LOW |

### 2.2 Missing UI Components on Dashboard

| # | Missing Component | Current State | Priority |
|---|-------------------|--------------|----------|
| 1 | **Coverage Purchase Form** -- Dashboard shows pool info but no interactive form to purchase a ProtectionCert. The `Buy Coverage` button calls `handleBuyCoverage` but actual purchase flow is minimal. | Partial | HIGH |
| 2 | **Withdrawal Flow** -- No UI to initiate or execute srCVR/jrCVR withdrawals (30-day senior lock, 14-day junior lock). | Missing | HIGH |
| 3 | **Premium Payment UI** -- No interface for issuers to pay monthly premiums. | Missing | MEDIUM |
| 4 | **Escrow Status View** -- No UI to see escrowed payouts or release them. | Missing | LOW |
| 5 | **SubrogationNFT View** -- No UI to view minted subrogation claims. | Missing | LOW |
| 6 | **IRS Score History Chart** -- Dashboard shows current score and radar but no time-series history showing score changes over time. | Missing | LOW |
| 7 | **Coverage Ratio Real-time** -- Dashboard shows pool TVL but the coverage ratio display is not clearly tied to live `getCoverageRatio()` call. | Partial | MEDIUM |
| 8 | **Redemption Gate Status Indicator** -- No visual indicator showing if a pool is currently gated. | Missing | MEDIUM |
| 9 | **Wind-Down Status/Challenge UI** -- No interface for wind-down lifecycle. | Missing | LOW |
| 10 | **ProCert NFT Display** -- No view showing the user's Protection Certificate NFT with metadata (coveredAmount, estimatedPayoutPct, etc.). | Missing | MEDIUM |

### 2.3 Frontend-Contract Integration Issues

| # | Issue | Priority |
|---|-------|----------|
| 1 | **ABI completeness** -- `contract-abis.js` needs verification that all deployed contract ABIs are included and match the deployed bytecode. | MEDIUM |
| 2 | **Real-time event listening** -- Dashboard shows "Protocol Events" section but may not be subscribed to all relevant contract events on BSC Testnet. | MEDIUM |
| 3 | **BNBScan links** -- Dashboard has a "View all on BNBScan" link but the href is incomplete (`/address/` with no address). | LOW |
| 4 | **Error handling for BSC Testnet RPC** -- Proposal mentions preconnect to `data-seed-prebsc-1-s1.binance.org:8545` but fallback RPC handling is not specified. | LOW |

---

## 3. Testing Gaps

### 3.1 Missing Test Scenarios from Proposal Section 39-41

| # | Missing Test | Proposal Section | Priority |
|---|-------------|-----------------|----------|
| 1 | **Scenario A: Complete Normal Lifecycle** (Register -> Active -> Premium -> Clean Wind-Down -> Bond Return) -- Full lifecycle integration test. The existing `FullLifecycle.test.ts` covers default path but wind-down path is not verified. | Section 40 | HIGH |
| 2 | **Scenario C: Failed Wind-Down Challenge** -- Challenger loses bond when TIR confirms wind-down is clean. Cannot test because `challengeWindDown` is not implemented. | Section 40 | HIGH |
| 3 | **EWS 49-point threshold test** -- Proposal Section 39 specifies testing that 49-point drop does NOT fire EWS. | Section 39 | MEDIUM |
| 4 | **Redemption Gate activation via monitoring** -- Test that gate blocks deposits AND withdrawals when DefaultOracle sets monitoring. | Section 39 | MEDIUM |
| 5 | **Minimum 25% junior ratio enforcement** -- Test that senior deposits are blocked when they would violate the ratio. | Section 39 | MEDIUM |
| 6 | **srCVR exchange rate after premium accrual** -- Test that 1 srCVR redeems for more USDT after premiums flow. | Section 39 | MEDIUM |
| 7 | **ERC-3643 compliance payout with frozen investor** -- Test that frozen (sanctioned) investor's payout goes to escrow with "REGULATORY_FREEZE" reason. | Section 39 | MEDIUM |
| 8 | **SubrogationNFT metadata verification** -- Test that minted NFT contains correct claim data. | Section 39 | LOW |
| 9 | **Fast Track activation at IRS 650** (vs Standard at 600). | Section 39 | LOW |
| 10 | **Multiple concurrent default events** -- Test that multiple event types can coexist per issuer. | Section 17 | LOW |

### 3.2 Missing Test Coverage Areas

| # | Area | Priority |
|---|------|----------|
| 1 | **Gas optimization tests** -- No automated gas benchmarking tests (gas report exists but not as test assertions). | LOW |
| 2 | **Fuzz testing** -- No randomized input testing for premium formula, score boundaries, etc. | LOW |
| 3 | **Re-entrancy tests** -- No explicit tests verifying ReentrancyGuard protections. | MEDIUM |
| 4 | **Access control tests** -- No comprehensive tests verifying that unauthorized callers cannot call restricted functions across all contracts. | MEDIUM |
| 5 | **Overflow/underflow tests** -- No tests for score component boundary conditions (e.g., score going below 0, above 1000). | MEDIUM |

---

## 4. Integration Gaps

### 4.1 Contract-to-Contract Integration

| # | Gap | Priority |
|---|-----|----------|
| 1 | **Automatic payout trigger chain**: TIR 2-of-3 confirmation -> DefaultOracle.processConfirmation -> PayoutEngine.executePayout. This chain is specified in Section 6 Step 6 but may require manual calls in current implementation. | HIGH |
| 2 | **EWS -> Monitoring -> Gate chain**: IRSOracle EWS fires -> DefaultOracle MONITORING flag -> InsurancePool redemption gate activation. Specified in Section 23.7 but no evidence of automatic chaining. | MEDIUM |
| 3 | **Premium -> Yield accrual chain**: InsurancePool.payPremium -> 5% treasury -> 70% srCVR.accrueYield -> 30% jrCVR. Implementation exists but yield split percentages and treasury routing need verification against proposal constants. | MEDIUM |
| 4 | **Bond liquidation waterfall**: PayoutEngine.executePayout -> IssuerBond.liquidate -> InsurancePool.liquidateForPayout (junior first, senior last). Order and completeness need verification. | HIGH |

### 4.2 Frontend-to-Contract Integration

| # | Gap | Priority |
|---|-----|----------|
| 1 | **Coverage purchase end-to-end**: User clicks "Buy Coverage" -> USDT approve -> PayoutEngine.purchaseCoverage -> ProCert minted -> UI updates. Flow may be incomplete. | HIGH |
| 2 | **Pool deposit end-to-end**: User clicks "Deposit" -> USDT approve -> InsurancePool.depositSenior/Junior -> srCVR/jrCVR minted -> balance displayed. Deposit modal exists but full flow needs verification. | HIGH |
| 3 | **Wallet connection**: MetaMask integration exists but BSC Testnet auto-switch and chain validation completeness unverified. | MEDIUM |
| 4 | **IRS score components display**: Dashboard IRS section exists with radar chart but may not be calling `getComponents()` for live 5-dimension breakdown. | MEDIUM |
| 5 | **Premium curve chart**: Dashboard has premium curve section but data source (live on-chain calculation vs. static) unverified. | MEDIUM |

---

## 5. Documentation Gaps

### 5.1 Submission Documents

| # | Document | Status | Priority |
|---|----------|--------|----------|
| 1 | README.md | EXISTS | -- |
| 2 | SUBMISSION.md | EXISTS with BNBScan links | -- |
| 3 | DEMO_SCRIPT.md | EXISTS | -- |
| 4 | TECHNICAL_HIGHLIGHTS.md | EXISTS | -- |
| 5 | GAS_REPORT.md | EXISTS | -- |
| 6 | **DoraHacks submission form** | NOT VERIFIED -- Section 45 Phase 0 lists this as a deliverable. Status unknown. | CRITICAL |

### 5.2 Missing Documentation

| # | Missing Doc | Proposal Reference | Priority |
|---|------------|-------------------|----------|
| 1 | **Contract address registry file** (`deployments/bscTestnet.json`) -- Proposal Appendix C specifies this. Addresses exist in FINAL_STATUS.md but not in a structured JSON file for programmatic access. | Appendix C | MEDIUM |
| 2 | **Verification checklist** -- Proposal Appendix D describes a checklist. Not found as standalone file. | Appendix D | LOW |
| 3 | **API documentation for IRS Oracle** -- Proposal mentions DeFi protocols querying `getScore()`, `getTWAS()`, `getCoverageRatio()`. No API docs for external consumers. | Section 8 | LOW |
| 4 | **Security architecture document** -- Access control matrix from Section 47 not documented as standalone file. | Section 47 | LOW |

---

## 6. Demo Gaps

### 6.1 Demo Checklist Items (from Proposal Section 41)

| # | Checklist Item | Status | Priority |
|---|---------------|--------|----------|
| 1 | Deployer wallet has >= 0.1 BNB on BSC Testnet | DONE (25 TXs executed) | -- |
| 2 | All 12 core contracts deployed to BSC Testnet | DONE (16 total including mocks) | -- |
| 3 | All contracts verified on BNBScan | DONE | -- |
| 4 | Contract addresses saved | DONE in FINAL_STATUS.md | -- |
| 5 | Mock USDT faucet tested | DONE | -- |
| 6 | TX1: Issuer Registration flow | DONE | -- |
| 7 | TX2: Pool deposits + Coverage purchase | DONE | -- |
| 8 | TX3: Default + Payout + SubrogationNFT | DONE | -- |
| 9 | **Frontend shows live IRS score** | PARTIAL -- IRS section exists in dashboard but live data from BSC Testnet deployment needs verification | MEDIUM |
| 10 | **Frontend shows coverage ratio** | PARTIAL -- Pool section exists but live coverage ratio display needs verification | MEDIUM |
| 11 | **Frontend shows 3 BNBScan links prominently** | NEEDS VERIFICATION -- BNBScan links are in FINAL_STATUS.md but may not be prominently displayed in dashboard UI | MEDIUM |
| 12 | All 3 BNBScan links saved in text file | DONE in FINAL_STATUS.md | -- |
| 13 | Screenshots of verified contracts | NOT VERIFIED | LOW |
| 14 | Backup deployment wallet funded | NOT VERIFIED | LOW |

### 6.2 Missing Demo Scenarios

| # | Scenario | Proposal Reference | Priority |
|---|----------|-------------------|----------|
| 1 | **Live IRS score changing in real-time** -- Demo should show score updating when a repayment event is recorded. Currently only shows static score from deployment. | Section 42-43 | MEDIUM |
| 2 | **Premium calculator in action** -- Demo should show how premium rate changes with IRS score. Dashboard has premium curve chart but live interaction unverified. | Section 43.2 | MEDIUM |
| 3 | **EWS alert demonstration** -- No demo showing the Early Warning System firing when IRS drops 50+ points. This is a key innovation the proposal highlights. | Section 43.2 | MEDIUM |
| 4 | **Coverage ratio before and after deposit** -- Demo should show ratio improving as underwriters deposit. | Section 43.3 | LOW |

### 6.3 Pitch Preparation Gaps

| # | Item | Status | Priority |
|---|------|--------|----------|
| 1 | **5-minute pitch script** | DOCUMENTED in proposal Section 43 but no standalone pitch notes file | LOW |
| 2 | **Judge Q&A answers** | DOCUMENTED in proposal Section 44 but no standalone quick-reference file | LOW |
| 3 | **Backup BNBScan screenshots** | NOT VERIFIED -- proposal says to take screenshots in case of network issues during demo | MEDIUM |

---

## 7. Priority Summary

### CRITICAL (Must do before March 31)

1. **DoraHacks submission form completion** -- Verify this is filled out and submitted.

### HIGH (Should do before March 31)

1. Missing `challengeWindDown()` function in IssuerRegistry
2. Missing `checkStateTransitions()` and `submitCureEvidence()` in DefaultOracle
3. Missing `submitMonitoringVote()` in TIR
4. Missing `openTechnicalChallengeWindow()` and `resolveTechnicalChallenge()` in IRSOracle
5. Missing `Pausable` modifier on all critical contracts
6. TIR -> DefaultOracle -> PayoutEngine automatic call chain not wired
7. Coverage purchase end-to-end frontend flow verification
8. Pool deposit end-to-end frontend flow verification
9. Full lifecycle integration test (including clean wind-down path)
10. Wind-down challenge test scenario (blocked by missing function)
11. Bond liquidation waterfall order verification

### MEDIUM (Nice to have for demo polish)

1. Missing `processExpiredEscrow()`, `estimateCurrentPayout()` in PayoutEngine
2. SubrogationNFT ClaimData struct missing several proposal-specified fields
3. DefaultOracle single-event limitation (proposal specifies multi-event)
4. ERC-5192 `locked()` function verification on ProtectionCert
5. IRS -> DefaultOracle -> InsurancePool EWS chain not wired
6. Coverage ratio display, Redemption Gate indicator in dashboard
7. ProCert NFT display, Withdrawal flow in dashboard
8. Contract address registry JSON file
9. BNBScan links prominently displayed in dashboard
10. Backup BNBScan screenshots for demo day
11. Access control and re-entrancy test coverage
12. Score boundary condition tests

### LOW (Post-hackathon / Phase 1)

1. Issuer Registration page, Issuer Dashboard, TIR Attestor page
2. Timelock on admin functions
3. Various missing view functions
4. Missing events (GraceExtended, CureWindowOpened, etc.)
5. Escrow 4% APR accrual
6. Fuzz testing, gas optimization tests
7. API documentation for IRS Oracle
8. Security architecture standalone document

---

## 8. Risk Assessment for Submission

**Current submission readiness: STRONG for hackathon MVP**

The project has all 12 core contracts + 4 mock contracts deployed and verified on BSC Testnet. 376+ unit tests pass. 25 on-chain demo transactions are executed and verifiable on BNBScan. A complete frontend with landing page and dashboard exists.

**Key risks:**
1. If judges ask about wind-down challenge mechanism or EWS technical challenge, there is no on-chain implementation to demonstrate -- only proposal documentation.
2. If judges probe the automatic chain from TIR confirmation to payout execution, the current implementation may require manual sequential calls rather than automatic triggering.
3. The Pausable security pattern mentioned extensively in the proposal is entirely absent from the deployed contracts.

**Mitigations:**
- The proposal clearly marks many features as Phase 1/Phase 2 roadmap items.
- The 3 core demo transactions (registration, pool+coverage, default+payout) all work end-to-end on-chain.
- The IRS scoring engine with exponential premium formula is fully implemented and verified.
- The ERC-3643 compliance checks (isVerified, isFrozen) are implemented in PayoutEngine.
- The SubrogationNFT minting is functional.

The hackathon MVP scope (Phase 0) as defined in Section 45 is substantially complete. The gaps identified are primarily in secondary flows (wind-down, EWS challenge, multi-event defaults) and frontend completeness beyond the core dashboard.

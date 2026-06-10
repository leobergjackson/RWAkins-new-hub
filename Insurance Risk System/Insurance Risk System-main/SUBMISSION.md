# CoverFi Protocol — DoraHacks Submission
## HashKey Chain Horizon Hackathon 2026

### One-Line Description
The first on-chain RWA issuer-default protection protocol on HashKey Chain —
combining mandatory issuer bonds, behavioral credit scoring (IRS), and
ERC-3643 compliance-native automated payout.

### Project Description

CoverFi solves the most critical missing piece in the $26.6 billion
tokenized RWA market: zero automated protection against issuer default.
Today, every RWA token holder who loses money when an issuer fails must
pursue expensive, slow, multi-year legal proceedings. CoverFi makes
protection automatic, on-chain, and instant.

Three innovations make CoverFi unique: (1) Mandatory Issuer Bond —
issuers post 5% of their token market cap in USDT as first-loss capital
before any coverage activates. (2) Issuer Reputation Score — a continuous
0-1000 behavioral credit score updated by 5 on-chain signals, driving
premiums via the formula: 1600 x e^(-0.001386 x IRS). This creates the
first on-chain equivalent of a credit rating for RWA issuers. (3)
ERC-3643 compliance-native payout — the only insurance protocol that
checks KYC verification status and regulatory freeze status before
distributing USDT to investors.

Built on HashKey Chain with 12 smart contracts, 416 passing tests, 16
deployed contracts on HashKey Chain Testnet, and a complete default +
payout lifecycle demonstrated end-to-end.

### Live Demo
- Frontend: https://coverfi-protocol.vercel.app
- GitHub: https://github.com/Sanjay-N23/coverfi-protocol

### Smart Contract Addresses (HashKey Chain Testnet — Chain ID 133)
- MockUSDT: 0x65A3Ae0e4787856CfcDdE505015c5CC3d5560212
- MockIdentityRegistry: 0x20619c533854C5a0c20284f7Dc7F5Dc3DFdD06B3
- MockERC3643Token: 0xa7C664459C66325Cd9dB15245DD901f1623c9655
- MockBAS: 0xB10b1c9D88126965E57cCa2a7ED5a1348dbf7552
- MockChainlink: 0xF1E25246D7Dcc8E63EAe39BE03DEae0C2Ed93E71
- TIR: 0xa4ECEB47F80a32D7176C23e4993cDa4d2337Fc3A
- IssuerBond: 0x1Ca7B678BDf1deCe9964c5178C01AB9312F2664D
- IRSOracle: 0x8D4C37f45883aAEEd20d2CC1020e6Ab193D3A50C
- DefaultOracle: 0xBCF0012388045eA1183c96EEbe24754842a549eA
- IssuerRegistry: 0xc07859b25FC869F0a81fae86b9B5bEa868D08A9f
- InsurancePool: 0xa5d64A7770136B1EEade6B980404140D8D5F7C06
- srCVR: 0x2Aad26de595752d7D6FCc2f4C79F1Bf15B60E1CD
- jrCVR: 0xD01e871c97746FC6a3f4B406aA60BE1Fb7FAcf6B
- ProtectionCert: 0x91062e509E75AAe31f1d6425b78D8815Ad941e73
- PayoutEngine: 0x44944cB598A750Df4C4Bf9A7D3FdDDf7575F88F5
- SubrogationNFT: 0xbBe8A2840E151cC8BF2B156e5d61a532eFCe2AB9

### Explorer Verification
All contracts viewable at: https://testnet-explorer.hsk.xyz

### What CoverFi Proves
1. Any issuer can register and post first-loss capital trustlessly
2. Underwriters can provide senior tranche liquidity (srCVR with Compound cToken yield model)
3. Underwriters can provide junior tranche liquidity (jrCVR with epoch-based pro-rata yield)
4. Investors can purchase ERC-5192 soulbound Protection Certificates
5. 2-of-3 bonded professional attestors can confirm default on-chain
6. Automated payout execution via bond + junior + senior waterfall

### Technical Highlights
- IRS formula: premium_bps = 1600 x e^(-0.001386 x IRS)
  (4% APR at IRS 1000, 16% APR at IRS 0)
- Compound cToken exchange rate model for srCVR yield accrual
- ERC-3643 isVerified() + isFrozen() compliance checks before payout
- ERC-5192 soulbound Protection Certificate NFT
- ERC-721 SubrogationNFT with complete default evidence package
- 416 tests passing (unit + integration + edge cases)
- ABDKMath64x64 for gas-efficient fixed-point exponential calculation
- Deployed on HashKey Chain Testnet (Chain ID 133)

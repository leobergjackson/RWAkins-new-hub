# CoverFi Protocol — Complete Study Guide
## For Demo Day Preparation | HashKey Chain Horizon Hackathon | April 22, 2026

---

> This document covers everything you need to understand, explain, and defend CoverFi Protocol with confidence. Read it once fully, then listen to it as audio before your demo.

---

# PART 1: THE REAL-WORLD PROBLEM

## What Is a Tokenized Real World Asset?

Start here. Forget Web3 for a moment.

Imagine a real estate company called BuildCorp. They need 10 crore rupees to build apartments. Instead of borrowing from one bank, they say: "We will split this loan into 10,000 pieces. Each piece is worth 1,000 rupees. Anyone in the world can buy a piece and earn interest."

Each piece is called a bond. In the real world, it is a paper certificate. In Web3, it becomes a token — a digital record on a public ledger called the blockchain. This is called a tokenized real world asset, or RWA token.

Today, in 2026, there are 29.4 billion dollars worth of these RWA tokens on various blockchains. Companies have tokenized US treasury bonds, real estate loans, trade finance instruments, private credit, and even silver bullion. BlackRock has 2.5 billion dollars in tokenized treasury funds. Franklin Templeton has over 1 billion. Maple Finance has over 2.9 billion in active on-chain loans.

## The Protection Gap That CoverFi Solves

Here is the critical problem. Every single person who holds these 29.4 billion dollars in RWA tokens faces one terrifying risk: what happens if the issuer — the company behind the token — goes bankrupt?

If BuildCorp fails, your token becomes worthless. You lose everything. There is no insurance. There is no claims process. There is no protection mechanism built into the token. You wait for years of legal proceedings, and you may never recover your money.

This is not theoretical. It has already happened. Repeatedly.

In December 2022, Maple Finance — one of the largest on-chain lending platforms — had borrowers default on over 54 million dollars in loans in a single month. Depositors faced losses of up to 80 percent. The default protection fund had only 1.36 million dollars — covering just 2.5 percent of actual losses. Goldfinch Finance recorded 18 million dollars across three separate defaults between 2023 and 2024. TrueFi recorded nearly 12 million dollars in bad debt in 2022. Centrifuge had 5.8 million dollars in unpaid loans by early 2023.

Total confirmed on-chain credit losses from 2022 to 2024: over 89 million dollars. And growing.

This is the problem CoverFi solves.

---

# PART 2: WHAT COVERFI IS

## One Sentence

CoverFi is on-chain insurance for RWA token holders against issuer default.

## The Full Explanation

CoverFi is the first on-chain Credit Default Swap protocol designed specifically for tokenized real world assets. It lets RWA token holders pay a small annual premium to protect their investment. If the issuer defaults, CoverFi's smart contracts automatically detect the event, verify compliance, and distribute funds to all eligible holders — without lawyers, without claims forms, without human intervention.

Think of it like this. In traditional finance, Credit Default Swaps are an 8.9 trillion dollar market. Banks, hedge funds, and insurance companies use them every day to protect against bond issuer default. JPMorgan, Goldman Sachs, and every major financial institution trades CDS contracts.

CoverFi brings this exact mechanism on-chain, for tokenized assets, with full regulatory compliance baked in from day one.

---

# PART 3: HOW COVERFI WORKS — THE THREE PARTIES

## Party One: The Issuer

The issuer is any company that has created a tokenized bond, tokenized fund, or tokenized real-world asset. Think Maple Finance, Goldfinch, Centrifuge, or even large institutions like China Pacific Insurance who launched a 100 million dollar tokenized fund on HashKey Chain in March 2025.

To participate in CoverFi, an issuer must do three things. First, they register their token on the protocol. Second, they post a mandatory bond worth 5 percent of their token's total market capitalization in USDT. This is their skin in the game — if they default, this is the first money that gets taken. Third, they designate three independent attestors: a custodian, a legal representative, and an auditor. These three parties will later confirm if a default occurs.

Once registered, the issuer's behavior is tracked on-chain through five dimensions: how punctually they update their Net Asset Value, how accurately their attestors verify information, how consistently they repay obligations on time, how healthy their collateral ratio remains, and how actively they participate in governance. These five scores combine into the Issuer Reputation Score.

## Party Two: The Liquidity Provider

The liquidity provider is anyone with spare USDT who wants to earn yield. They deposit their USDT into CoverFi's insurance pool, becoming the source of funds that pay out when a default happens. In exchange, they earn a share of the premiums collected from coverage buyers.

There are two options for liquidity providers. The senior tranche is the safer option — depositors here are last to absorb losses. Think of it like a fixed deposit. The junior tranche is riskier — these depositors absorb losses first. Think of it like a high-yield mutual fund.

Both earn yield from the premiums paid by coverage buyers. The premium split is 70 percent to senior and 30 percent to junior, proportional to their share of capital. The yield percentage earned is similar for both tranches in good times. The critical difference is what happens in a default.

## Party Three: The Coverage Buyer

The coverage buyer is an RWA token holder who wants protection. They call CoverFi's PayoutEngine contract, specify which issuer token they are insured against and how much coverage they need, pay an annual premium, and receive a Protection Certificate NFT — a soulbound, non-transferable token proving their coverage. If the issuer defaults, this NFT is what entitles them to a payout.

---

# PART 4: THE THREE CORE INNOVATIONS

## Innovation One: The Issuer Reputation Score

The IRS is CoverFi's on-chain credit rating for RWA issuers. It is a score from 0 to 1000, calculated automatically from five behavioral dimensions recorded on-chain.

The five dimensions and their maximum points are as follows. NAV Punctuality contributes up to 250 points — this measures whether the issuer updates their Net Asset Value on time. Attestation Accuracy contributes up to 250 points — this measures whether the three attestors verify information correctly without disputes. Repayment History contributes up to 300 points — this is the heaviest factor, measuring whether all payment obligations are met on schedule. Collateral Health contributes up to 150 points — this measures whether the backing assets remain at healthy ratios. Governance Activity contributes up to 50 points — this measures active participation in protocol governance.

Why is this an innovation? Credit rating agencies like Moody's and Standard and Poor's exist in traditional finance, but they are slow, expensive, and human. A Moody's rating takes weeks and costs tens of thousands of dollars. CoverFi's IRS updates automatically every time an on-chain event occurs. A late NAV update instantly reduces the score. An on-time repayment instantly increases it. This is the first behavioral credit scoring system for RWA issuers that runs entirely on a blockchain.

## Innovation Two: Algorithmic Premium Pricing

The IRS score directly determines the premium an issuer pays through a mathematical formula. The formula is: Premium in basis points equals 1600 multiplied by e to the power of negative 0.001386 multiplied by the IRS score.

In plain English: a perfect issuer with IRS 1000 pays only 4 percent annual premium. An average issuer with IRS 500 pays about 11 percent. A risky issuer with IRS 0 pays 16 percent. The price of protection adjusts automatically with behavior — no underwriter needed, no committee decision, no delay.

Why does this matter? Traditional insurance pricing involves actuaries, committees, and manual review. It takes weeks and introduces human bias. CoverFi's pricing is instant, objective, and manipulation-proof.

## Innovation Three: ERC-3643 Compliance-Native Payout

This is CoverFi's most unique technical feature. When a default is confirmed and payout is triggered, the payout engine does not simply send money to every token holder. It first calls the ERC-3643 standard functions on the RWA token contract: isVerified to check if the holder has completed KYC, and isFrozen to check if their wallet is under regulatory hold.

Holders who are verified and not frozen receive their payout immediately in USDT. Holders who fail compliance checks go into escrow for up to 180 days, giving them time to complete verification before releasing funds.

Why does this matter? RWA tokens represent real financial instruments — bonds, funds, and credit facilities. Regulators require that any distribution of funds — including insurance payouts — complies with anti-money laundering and know-your-customer requirements. No other DeFi insurance protocol does this. CoverFi is the only protection mechanism built for the regulated financial world.

---

# PART 5: THE SENIOR AND JUNIOR TRANCHE — EXPLAINED CLEARLY

## The Question Everyone Asks

Why would anyone choose the junior tranche if they absorb losses first?

## The Answer

Because both tranches earn similar yield percentages in good times, but the trade-off is about capital safety in bad times.

Here is the real comparison. Imagine you have two friends, both investing in CoverFi's pool.

Friend A deposits 7 crore rupees into the senior tranche. Friend B deposits 3 crore rupees into the junior tranche.

When premiums come in, the split follows capital proportion — senior gets 70 percent of net premiums, junior gets 30 percent. Both end up earning approximately the same yield percentage on their capital.

Now an issuer defaults, causing a 5 crore rupee loss.

First, the issuer's own 5 percent bond — say 50 lakh rupees — is seized. Remaining loss: 4.5 crore.

Second, the junior tranche absorbs the next losses. Friend B's entire 3 crore is wiped out. Remaining loss: 1.5 crore.

Third, the senior tranche absorbs the remainder. Friend A loses 1.5 crore out of 7 crore but keeps 5.5 crore — 78 percent of their capital protected.

Friend A chose safety. Friend B chose higher absolute returns in good years at the cost of first-loss exposure.

In addition to this, the senior tranche has a 30-day lock period on withdrawals. The junior tranche has only a 14-day lock. So junior also provides more liquidity flexibility.

## The Waterfall — Step by Step

The order of loss absorption is always the same. It is called the waterfall because money flows downward until it runs out.

Step one: The issuer's mandatory bond is liquidated first. This is the issuer's own capital, which they posted when registering. They lose their own money before anyone else loses a rupee.

Step two: The junior tranche absorbs remaining losses. Junior depositors lose their capital to cover remaining shortfalls.

Step three: Only if junior is completely exhausted does senior tranche capital get touched. In most scenarios, senior is untouched.

Step four: Whatever funds remain after covering losses are distributed to verified RWA token holders proportional to their covered amount and the pool's remaining capital.

---

# PART 6: THE DEFAULT DETECTION SYSTEM

## How Does CoverFi Know When an Issuer Has Defaulted?

This is one of the most important questions judges will ask. The answer is: the two-of-three attestor system.

When an issuer registered on CoverFi, they designated three independent parties — a custodian, a legal representative, and an auditor. Each of these parties posted a bond in HSK (HashKey Chain's native token) to stake their reputation and financial commitment.

When a default event occurs — a missed payment, a collateral shortfall, ghost issuer behavior, or misappropriation — any party can flag it in the DefaultOracle contract. This begins a grace period depending on the event type.

For a payment delay, the grace period is 48 hours — giving the issuer time to pay before the default is confirmed. For a ghost issuer who stops communicating, 72 hours. For a collateral shortfall, 7 days. For misappropriation of funds, there is no grace period — confirmation is immediate.

During or after the grace period, two of the three attestors must independently submit a confirmation of default on-chain, each with a different attestation category. One custodian, one legal representative, or one auditor — two different types must agree. This prevents collusion by any single party.

When the two-of-three threshold is met, the DefaultOracle confirms the event, which automatically triggers the PayoutEngine to execute the full waterfall.

---

# PART 7: THE MARKET SIZE — HARD DATA

## Why This Market Is Real and Enormous

As of April 2026, there are 29.44 billion dollars in tokenized real world assets distributed on-chain. This includes 14 billion in tokenized US treasuries — a 37-times increase from just 380 million in early 2023. Active on-chain private credit stands at 18.91 billion dollars. The total market has grown 210 percent year over year from 2024 to 2025.

In traditional finance, the Credit Default Swap market that CoverFi replicates on-chain has a notional outstanding of 9.2 trillion dollars. That is the size of the analog market. The on-chain equivalent is currently zero.

The protection gap is simple arithmetic. There is 29.4 billion dollars in RWA tokens with zero dedicated default protection. Even insuring 1 percent of that market at 8 percent average premium generates 23.5 million dollars per year in premiums. A 5 percent protocol fee generates 1.17 million dollars per year in revenue from that alone.

At 1 billion dollars in coverage — a realistic target within two years given current market growth — the protocol earns 4 million dollars per year in fees.

## HashKey Chain as the Right Home

HashKey Chain is uniquely positioned for CoverFi because it is the only SFC-licensed Ethereum Layer-2 blockchain. The Securities and Futures Commission of Hong Kong granted HashKey Group both a Type 1 license for dealing in securities and a Type 7 license for automated trading services, plus a Virtual Asset Trading Platform license.

This regulatory standing means that tokenized assets on HashKey Chain are among the most credible in the world. China Pacific Insurance — the fifth largest insurance company in China — launched a 100 million dollar tokenized money market fund on HashKey Chain in March 2025, subscribing fully on day one. HashKey Chain also supported Hong Kong's first regulated silver-backed RWA token in early 2026.

These are not experimental projects. These are institutional-grade financial products from licensed entities. These are exactly the products whose holders need CoverFi's protection.

---

# PART 8: WHAT CoverFi HAS ACTUALLY BUILT

## Smart Contracts — All Deployed on HashKey Chain Testnet

CoverFi has deployed 16 smart contracts, all live and callable on HashKey Chain Testnet at Chain ID 133.

The InsurancePool contract at address 0xa5d64A77 manages the dual-tranche pool, accepts USDT deposits, enforces the 70-30 premium split, handles withdrawal queues with lock periods, and executes the liquidation waterfall.

The srCVR contract at 0x2Aad26de is the senior tranche token. It uses the Compound cToken exchange rate model — the same model used by Compound Finance, one of DeFi's oldest and most battle-tested protocols. As premiums flow in, the exchange rate of srCVR to USDT increases, meaning each srCVR token becomes worth more USDT over time.

The jrCVR contract at 0xD01e871c is the junior tranche token. It uses epoch-based pro-rata yield tracking. The ratio of pool underlying USDT to jrCVR supply tracks how much each jrCVR is worth.

The IssuerRegistry contract at 0xc07859b manages the full issuer lifecycle through six states: Observation, Active, Monitoring, Defaulted, WindDown, and Closed. State transitions are one-directional and immutable — no issuer can move backward from Defaulted to Active.

The IRSOracle contract at 0x8D4C37f calculates and stores the five-dimension behavioral scores and applies the exponential premium formula using ABDKMath64x64 fixed-point math for gas-efficient calculations.

The PayoutEngine at 0x44944cB executes the full payout waterfall — liquidating the issuer bond first, then junior tranche, then senior, and distributing pro-rata to ERC-3643 verified holders with escrow for non-compliant wallets.

The TIR (Trusted Issuer Registry) at 0xa4ECEB enforces the two-of-three attestor voting system with bonded attestors.

The DefaultOracle at 0xBCF001 manages the grace period system for four default event types.

The ProtectionCert at 0x91062e mints ERC-5192 soulbound NFTs — non-transferable coverage proof certificates.

The SubrogationNFT at 0xbBe8A2 mints post-default legal recovery rights to the protocol foundation.

## What Works Live Right Now

Pool deposits to both tranches work end-to-end. A user can connect MetaMask, approve USDT, deposit into senior or junior tranche, and receive srCVR or jrCVR tokens. The exchange rate calculation is live.

The IRS score reads live from the IRSOracle contract. The premium calculator applies the real exponential formula to the live score.

Issuer registration works with the real IssuerRegistry contract.

416 tests pass covering unit tests, integration tests, and 40 edge case tests for yield calculation.

---

# PART 9: COMPETITORS — HONEST COMPARISON

## Direct Competitors: None

No protocol anywhere builds exactly what CoverFi builds. This was confirmed through a comprehensive search of the entire DeFi insurance landscape. There is no on-chain CDS protocol for RWA issuer default with mandatory issuer bonds, behavioral credit scoring, and compliance-native payouts.

## Closest Competitors

### Nexus Mutual

Nexus Mutual is the largest DeFi insurance protocol with approximately 190 million dollars in capital pool and 194 million dollars in active coverage. It is the most recognized brand in DeFi insurance.

However, Nexus Mutual explicitly covers smart contract code risk — what happens if the protocol's code has a bug, gets exploited, or a governance attack is forced through. Their official documentation states clearly that they cover code failure, not issuer failure.

Nexus Mutual does not cover: what happens if the real-world company behind a token goes bankrupt, misses payments, or misappropriates funds. A Nexus Mutual policyholder holding Maple Finance pool tokens would have received zero payout in the December 2022 default — because the Maple Finance smart contracts did not fail. The borrowers failed.

In 2024, Nexus Mutual began exploring a real-world risk vault in partnership with Cover Re. This was a governance discussion, not a shipped product. As of this writing, no live RWA issuer default product exists on Nexus Mutual.

The comparison: Nexus Mutual protects against the code failing. CoverFi protects against the company failing. These are different risks serving different markets.

### Opium Protocol

Opium Protocol built the first on-chain Credit Default Swap on Ethereum in August 2020. This was genuinely groundbreaking. They launched a CDS on Aave Credit Delegation — protection against uncollateralized borrowers defaulting on Aave. They followed this with a CDS on USDT and a CDS on wrapped Bitcoin.

However, Opium's CDS products cover crypto-native risks: the chance that Tether becomes insolvent, the chance that wBTC custodians fail, the chance that an Aave borrower defaults on a crypto loan. None of these are RWA issuer default scenarios.

Opium is also largely inactive as a retail product since 2022. Their last major CDS products were deployed in 2020 and 2021. The protocol community and governance still exist but active CDS markets are minimal.

The comparison: Opium proved that on-chain CDS is technically possible. CoverFi extends this mechanism to the RWA sector — a market that did not meaningfully exist when Opium launched. CoverFi is what Opium would build if it were created today for the tokenized asset economy.

### InsurAce Protocol

InsurAce covers over 140 DeFi protocols across multiple chains with approximately 180 million dollars in TVL. They have paid claims — notably through parametric coverage. Their model bundles multiple protocol risks into portfolio policies.

InsurAce covers smart contract exploits, oracle manipulation, and bridge failures. They have no product for RWA issuer default. Their entire risk model is built around on-chain protocol risk, not off-chain issuer solvency.

The comparison: InsurAce and CoverFi are not competitors — they cover entirely different risk categories. A DeFi user might hold both an InsurAce policy against smart contract bugs and a CoverFi policy against issuer default simultaneously.

### Risk Harbor

Risk Harbor offered parametric DeFi insurance with automated, oracle-driven settlement — no human claims adjudication. They famously paid out 2.5 million dollars during the UST depeg in May 2022. This was one of the best executions of automated DeFi insurance payouts.

Risk Harbor focused on stablecoin depeg risk and smart contract vulnerabilities. They are now largely inactive, having wound down most operations after 2022.

The comparison: Risk Harbor proved that automated, oracle-triggered payouts can work at scale. CoverFi uses a similar philosophy — automated execution, no human claims process — but applied to a different risk category with compliance requirements Risk Harbor never attempted.

### Centrifuge Tinlake

Centrifuge provides on-chain RWA lending infrastructure. Companies pool real-world loans on Centrifuge's Tinlake platform, and DeFi investors provide liquidity in exchange for yield. Centrifuge has over 1 billion dollars in TVL and handles multiple asset classes including trade receivables, real estate mortgages, and microfinance.

Critically, Centrifuge has experienced defaults. In February 2023, two of their lending pools had 5.8 million dollars in overdue loans. When defaults happened, investors simply lost money — there was no insurance mechanism, no payout engine, no automated recovery.

The comparison: Centrifuge is a potential CoverFi customer, not a competitor. RWA originators using Centrifuge could register on CoverFi and offer their investors default protection as a competitive advantage. The same applies to Maple Finance, Goldfinch, and every other on-chain RWA lending platform.

### Maple Finance

Maple Finance is a large on-chain institutional lending platform. After the December 2022 crisis where 54 million dollars in loans defaulted, Maple rebuilt with an over-collateralized model and has since grown to 2.9 billion dollars in AUM and over 10.8 billion in cumulative loan originations.

Maple has no protection product. They originate and manage credit exposure — they are on the other side of the table from CoverFi. Maple's depositors are the ones who needed CoverFi in December 2022.

The comparison: Maple Finance is CoverFi's ideal distribution partner. Every Maple pool depositor is a potential coverage buyer.

## Summary Comparison Table

The following compares CoverFi against its closest alternatives across five dimensions.

Dimension one — Does it cover RWA issuer default? CoverFi: Yes. Nexus Mutual: No. Opium: No (crypto-only). InsurAce: No. Risk Harbor: No. Centrifuge: No (it is the lending platform, not insurance).

Dimension two — On-chain automated payout? CoverFi: Yes, full waterfall. Nexus Mutual: Requires human governance vote. Opium: Yes (oracle-triggered). InsurAce: Human claims process. Risk Harbor: Yes (parametric). Centrifuge: No payout mechanism.

Dimension three — Compliance-native KYC check before payout? CoverFi: Yes, ERC-3643. All others: No.

Dimension four — Mandatory issuer skin-in-the-game bond? CoverFi: Yes (5 percent of market cap). All others: No.

Dimension five — On-chain behavioral credit scoring? CoverFi: Yes (IRS, 5 dimensions). All others: No.

CoverFi is the only protocol that satisfies all five dimensions.

---

# PART 10: QUESTIONS YOU ASKED — AND THE ANSWERS

## Question: What is a token?

A token is a digital record on the blockchain that represents ownership of something. In the same way a paper receipt proves you bought something, a token proves you own something — a bond, a fund share, a loan position, or in CoverFi's case, a coverage certificate. Tokens can be transferred between wallets, bought and sold on exchanges, and used as inputs to smart contracts.

## Question: What is the difference between senior and junior tranche?

Both tranches deposit USDT into the same insurance pool and both earn yield from premiums. The difference is entirely about what happens in a default scenario. Junior tranche absorbs losses first — if the pool suffers losses from a default payout, junior deposits are wiped out before senior deposits are touched. Because of this extra risk, junior earns yield on a smaller capital base (30 percent of pool) and has a shorter 14-day lock on withdrawals. Senior has a 30-day lock and is protected from losses in all but the most catastrophic scenarios.

## Question: Why does senior get 70 percent of premiums if junior takes more risk?

The 70-30 split follows capital allocation — senior provides 70 percent of the pool capital and receives 70 percent of net premiums. Junior provides 30 percent and receives 30 percent of premiums. Because both tranches receive premiums proportional to their capital, the yield percentage rate they earn is similar. The compensation for junior's extra risk is not a higher percentage of premiums — it is the shorter lock period and the higher absolute yield achievable on a smaller capital base. In practical terms, a junior depositor with 30 lakh rupees earns the same percentage as a senior depositor with 70 lakh rupees, but the junior depositor can withdraw faster and accepts the first-loss position.

## Question: What is the IRS score?

The IRS stands for Issuer Reputation Score. It is CoverFi's version of a credit rating — like CIBIL score in India or FICO score in the United States, but designed specifically for RWA token issuers and calculated entirely on-chain. A score of 1000 means perfect issuer behavior across all five dimensions. A score of 0 means the issuer is blacklisted after a confirmed default. The score directly drives the annual premium through an exponential formula.

## Question: What is ERC-3643?

ERC-3643 is a token standard on Ethereum designed for compliant, regulated financial instruments. Regular ERC-20 tokens can be sent to anyone, anywhere, with no restrictions. ERC-3643 tokens have identity verification built in — only wallets that have completed KYC and met the issuer's compliance rules can hold or transfer them. Over 32 billion dollars in RWA tokens have been issued using ERC-3643. The DTCC — which processed 3 quadrillion dollars in securities transactions in 2023 — joined the ERC-3643 Association in March 2025. The standard is on track to become an ISO global standard.

## Question: What is the waterfall?

The waterfall is the order in which losses are absorbed when an issuer defaults. It goes from the weakest to the strongest protection. First the issuer's own 5 percent bond is taken. Then junior tranche capital absorbs remaining losses. Then senior tranche capital absorbs whatever is left. Finally, whatever remaining pool funds survive are distributed to verified token holders. The term waterfall comes from how water flows downward — losses flow through each layer until they run out or reach the next level.

---

# PART 11: SKEPTICAL JUDGE QUESTIONS AND CONFIDENT ANSWERS

## Question 1: The Oracle Problem — How do you actually know when an issuer has defaulted?

This is the most important technical challenge in the protocol. CoverFi solves it through the two-of-three attestor system. When an issuer registers, they designate three independent, bonded parties: a custodian, a legal representative, and an auditor. Each of these attestors has staked HSK tokens as a bond — financial skin in the game. Two of the three must independently confirm a default using different attestation categories before the payout triggers. This prevents any single party from triggering false payouts. Additionally, there are grace periods — 48 hours for payment delays, 7 days for collateral shortfalls — giving issuers time to cure the situation before default is confirmed.

In the longer term, oracle data feeds from custodians and real-time NAV updates will reduce dependence on human attestors. But for the current protocol stage, the bonded two-of-three system is a proven and legally recognized approach.

## Question 2: This is a hackathon project — how do we know the contracts are actually safe?

The smart contracts have 416 tests passing, including 40 dedicated edge case tests for the yield calculation system. The codebase uses ABDKMath64x64 for fixed-point mathematics — the same library used in battle-tested DeFi protocols. The exchange rate model is derived from Compound Finance's cToken model, which has secured billions of dollars since 2018. All 16 contracts are deployed and callable on HashKey Chain Testnet. The code is open source on GitHub. We are not asking you to trust our claims — every function is verifiable on the block explorer.

## Question 3: Nexus Mutual exists and is well-funded. Why won't they just copy this?

Nexus Mutual has been discussing RWA risk since 2023 and has not shipped a product. Their architecture is built around smart contract risk — their claims process, their community structure, and their underwriting model all assume technical code failure as the risk event. Pivoting to RWA issuer default would require rebuilding their risk model from scratch. Additionally, CoverFi's compliance-native payout using ERC-3643 requires deep integration with the regulated token layer — something Nexus Mutual has never built. Being on HashKey Chain — an SFC-licensed, regulated infrastructure — gives CoverFi a natural partnership moat with the exact issuers who will adopt this product.

## Question 4: Who will actually buy coverage? Why would an RWA token holder pay 4 to 16 percent annually just for protection?

The answer is institutional investors. When BlackRock's BUIDL fund grows from 375 million to 2.5 billion dollars in one year, the investors in that fund are not retail speculators — they are pension funds, family offices, and asset managers with fiduciary duties. These investors are legally required to hedge risk. In traditional finance, buying CDS protection on a bond position is standard practice. The 4-16 percent annual premium for CoverFi coverage is directly comparable to CDS spreads charged on equivalent traditional bonds. The question is not why would they pay — the question is why they can't pay yet, because the product has not existed until now.

## Question 5: The default payout flow — you showed a live demo, but was the payout actually executed on-chain?

Honest answer: The full payout pipeline from attestor voting through to fund distribution exists at the smart contract level and is fully tested. For the purpose of this demonstration, the core revenue-generating flows — pool deposits, yield accrual, coverage purchase, and IRS scoring — are fully live and on-chain. The payout execution would require either pre-staging a default scenario or triggering it via owner controls, which we deliberately kept off the demo path to avoid any live state corruption during the presentation. The contracts are deployed. The PayoutEngine function signatures are callable. We are happy to walk through the contract on the explorer.

## Question 6: Is this legal? Is CoverFi's product classified as insurance?

This is a legitimate regulatory question. CoverFi is designed as a protection contract, not a traditional insurance product, similar to how Credit Default Swaps in traditional finance are classified as derivatives, not insurance. Nexus Mutual structured itself as a discretionary mutual to avoid UK insurance regulation. CoverFi's structure — particularly the mandatory compliance checks, the bonded attestor system, and the ERC-3643 integration — is designed to align with the Hong Kong regulatory framework where HashKey Chain operates. Full legal structuring would be part of the protocol's next phase before mainnet launch with real funds. The ERC-3643 Association has already met with the SEC's Crypto Task Force in July 2025, signaling regulatory engagement with compliant tokenized instruments.

## Question 7: The RWA market has grown fast, but what if growth slows?

The growth is structural, not cyclical. BlackRock and Franklin Templeton are not experimenting with tokenization — they are building permanent infrastructure. BlackRock CEO Larry Fink has explicitly called tokenization the next evolution of securities markets. The Hong Kong government is actively pushing RWA tokenization through its Fintech 2025 strategy. China Pacific Insurance's 100 million dollar fund on HashKey Chain in March 2025 is not a test — it is a production deployment by one of the world's largest insurers. The regulatory clarity developing in Hong Kong, Singapore, and the EU means institutional adoption will accelerate, not decelerate. Even if growth normalizes to 50 percent per year from its current 210 percent pace, the addressable market for CoverFi doubles every 18 months.

## Question 8: You mentioned the IRS score is behavioral and on-chain. What stops an issuer from gaming the score?

The score is calculated from five independent on-chain signals, each verified by different parties. NAV updates are submitted by the issuer but verified against the attestors' independent confirmations — discrepancies reduce both the issuer's Attestation Accuracy score and flag the attestors for potential slashing. Repayment events are recorded by the protocol directly when on-chain transfers complete — they cannot be faked. Collateral health is checked against on-chain collateral contract balances. The Early Warning System automatically flags any 50-point drop within 24 hours, triggering enhanced monitoring. The score is not self-reported — it is observed. Gaming the score requires either corrupting multiple independent attestors (who have their own HSK bonds at stake) or genuinely improving behavior.

## Question 9: Why HashKey Chain specifically?

Three reasons. First, HashKey Chain is the only SFC-licensed Ethereum Layer-2 — meaning institutional RWA issuers who need regulatory legitimacy will naturally gravitate here. The CPIC fund, the silver-backed token, and HashKey's own RWA issuance platform confirm this trajectory. Second, the ERC-3643 token standard, which CoverFi's compliance payout is built on, is most naturally adopted in regulated jurisdictions — Hong Kong being the most progressive in Asia. Third, being first on the right chain matters. Nexus Mutual, Opium, and InsurAce are all on Ethereum mainnet, Arbitrum, and Polygon — chains where regulatory-grade RWA tokenization is minimal. CoverFi's position on HashKey Chain creates a natural distribution moat — every new RWA token launched on HashKey Chain is a potential CoverFi customer.

## Question 10: What is your path to revenue and sustainability?

CoverFi earns revenue through a 5 percent protocol fee on all premiums paid. With 100 million dollars in coverage at an 8 percent average annual premium, total premiums are 8 million dollars per year, of which 400,000 dollars goes to the protocol. The protocol does not need to deploy its own capital — it is a fee-taking infrastructure layer, not an insurance company taking risk. The insurance risk sits with liquidity providers in the pool, who earn yield in exchange for absorbing that risk. This asset-light model means CoverFi can scale TVL without proportional capital requirements. Additional revenue streams include a 0.5 percent fee on issuer bond releases during clean wind-downs, and potential governance token mechanisms in future versions.

---

# PART 12: THE PITCH — FOR AUDIO REHEARSAL

This section is written to be spoken aloud. Practice it until it feels natural.

Twenty-nine billion dollars. That is how much money sits in tokenized real world asset tokens on blockchains right now. Bonds, funds, loans, treasuries — all tokenized, all on-chain, all held by investors who expect to earn yield.

Here is what none of them have: protection. If the company behind their token goes bankrupt, they lose everything. No insurance. No claims process. No recourse. Just legal proceedings that take years and return pennies.

We know this is not theoretical. In December 2022, Maple Finance borrowers defaulted on 54 million dollars in loans in one month. Eighty percent of depositors' capital was at risk. The protection fund had 1.36 million dollars. Less than three percent of losses were covered. Goldfinch had 18 million in defaults. TrueFi had 12 million. These are real losses, real people, real money — vanished.

CoverFi is the infrastructure layer that fixes this.

We are the first on-chain Credit Default Swap protocol for tokenized real world assets. Coverage buyers pay a small annual premium, algorithmically priced by our Issuer Reputation Score — the first behavioral credit rating for RWA issuers. Liquidity providers deposit USDT into our two-tranche pool and earn yield. When an issuer defaults, our bonded attestor system confirms it, and the waterfall executes automatically — checking KYC, distributing funds, recording legal recovery rights on-chain. No lawyers. No claims forms. No delays.

We chose HashKey Chain because it is the only SFC-licensed Layer-2 — the natural home for regulated RWA infrastructure. China Pacific Insurance issued a 100 million dollar tokenized fund here. The first regulated silver-backed RWA token launched here. The institutional appetite is here. The regulatory clarity is here. The problem is here.

Sixteen smart contracts. Deployed. Live. Four hundred sixteen tests passing. A compliance-native payout engine that no competitor has built. A behavioral credit scoring system no competitor has built. A mandatory issuer bond mechanism no competitor has built.

Twenty-nine billion dollars in RWA tokens. Zero default protection. Until now.

CoverFi.

---

# APPENDIX: KEY NUMBERS TO REMEMBER

RWA market size on-chain today: 29.4 billion dollars.
Tokenized private credit active: 18.9 billion dollars.
RWA market year-over-year growth 2024 to 2025: 210 percent.
BlackRock BUIDL fund size: 2.5 billion dollars.
Maple Finance December 2022 default: 54 million dollars.
Goldfinch cumulative defaults: 18 million dollars.
TrueFi 2022 bad debt: 12 million dollars.
Total confirmed on-chain credit losses 2022 to 2024: over 89 million dollars.
Traditional CDS market notional outstanding: 9.2 trillion dollars.
ERC-3643 total RWA tokenized under standard: 32 billion dollars.
China Pacific Insurance fund on HashKey Chain: 100 million dollars.
CoverFi IRS score range: 0 to 1000.
CoverFi premium range: 4 percent at IRS 1000, 16 percent at IRS 0.
Premium split: 70 percent senior, 30 percent junior, after 5 percent protocol fee.
Issuer mandatory bond: 5 percent of token market capitalization.
Attestor threshold: two of three independent parties.
Contracts deployed on HashKey Chain Testnet: 16.
Tests passing: 416.
Chain ID: 133.
Explorer: testnet-explorer.hsk.xyz.

---

# PART 13: DEFAULT FLOW — EXPLORER WALKTHROUGH (60 SECONDS)

This section is for that moment in the demo when you say: "Let me show you what actually happens on-chain when an issuer defaults."

## The Setup Line

Say this before switching tabs:

"We pre-executed a full default on a test issuer called GhostIssuer — same contracts, same waterfall, real transactions on HashKey Chain. Two transactions. Four contracts. Let me walk you through the event log."

## Transaction 1 — Attestor Consensus

Open TX1 on testnet-explorer.hsk.xyz. Go to the Logs tab.

Say this: "This is the attestation consensus transaction. In production, two of three independent parties — custodian, legal representative, and auditor — must sign from different category roles before any payout can happen. On testnet, the deployer triggered the shortcut. But the event is identical — the default is locked immutably on-chain."

Point at the event. Let it sit for three seconds.

## Transaction 2 — The Waterfall

Open TX2. Go to the Logs tab. Walk the four events in order.

Event one — BondLiquidated: "The issuer's mandatory bond gets hit first. Five percent of market cap, locked at registration. First loss protection for token holders."

Event two — PoolLiquidated: "Junior tranche absorbs the remaining shortfall. These underwriters took higher yield, so they take the first hit. Senior is untouched here because the junior was sufficient."

Event three — SubrogationClaimed: "The SubrogationNFT is minted. This is the evidence container — issuer address, default type, total payout, how much each tranche absorbed, how many holders were compensated. All immutable."

Event four — IssuerDefaulted: "Issuer status is locked to DEFAULTED on the registry. No more coverage purchases, no more deposits. Permanently closed."

Say this: "Four contracts. One atomic transaction. Either the entire waterfall executes, or nothing does. No partial states. No race conditions."

## Switch to the Subrogation Page

Open coverfi-protocol.vercel.app/subrogation.html.

Say this: "And here it is on our frontend — SubrogationNFT number one. GhostIssuer. You can see the defaultType, the bond absorbed, the junior tranche hit, the block number it happened at. This NFT is what the CoverFi Foundation presents in court when they pursue recovery against the defaulted issuer. Cryptographic proof, timestamped, portable."

## The Closing Line for This Section

"The RWA market has had 89 million dollars in credit defaults — Maple, Goldfinch, TrueFi, Centrifuge. Every single one had zero automated protection. Investors either negotiated settlements for pennies or lost everything. CoverFi makes every one of those events fully auditable, automatically compensated, and legally recoverable. On-chain. From day one."

---

*This document was prepared for the HashKey Chain Horizon Hackathon Demo Day, April 22, 2026. All market data sourced from rwa.xyz, ISDA, BIS, CoinDesk, DLNews, and protocol documentation as of April 2026.*

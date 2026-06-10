# CoverFi -- Complete Product Guide
## Everything You Need to Know to Explain CoverFi to Anyone

---

## What is CoverFi? (The Elevator Pitch)

CoverFi is the first on-chain insurance protocol that protects investors who hold tokenized real-world asset (RWA) tokens against the risk that the token issuer defaults -- meaning the issuer fails to pay, disappears, or misuses collateral. Think of it as an insurance policy for your crypto investments in real-world assets like real estate, trade finance, and infrastructure, all running automatically on the HashKey Chain blockchain.

## The Problem We Solve

Imagine you buy car insurance. If your car gets in an accident, the insurance company pays for the damage. Now imagine there is no car insurance at all -- you would be completely exposed if something went wrong.

That is exactly the situation in the $12 billion tokenized RWA market today. Companies issue tokens that represent real-world assets (real estate, loans, invoices), and investors buy these tokens expecting returns. But if the company behind the token goes bankrupt, stops paying, or steals the collateral, investors lose everything with zero automated protection. They would need to hire lawyers and wait years for partial recovery.

CoverFi fills this gap by creating an on-chain insurance system where:
- Investors can buy protection (like buying an insurance policy)
- Liquidity providers can earn yield by funding the insurance pool (like an insurance company earning premiums)
- Issuers must post a bond upfront (like a security deposit proving good faith)
- If a default occurs, payouts happen automatically -- no lawyers, no waiting

## How We Are Different from Competitors

| Feature | CoverFi | Nexus Mutual | Risk Harbor | Neptune Mutual |
|---------|---------|-------------|-------------|----------------|
| **What it covers** | RWA issuer default (payment failure, abandonment, collateral theft) | Smart contract bugs and hacks | Stablecoin depegging | Smart contract bugs + stablecoin depeg |
| **Credit scoring** | Yes -- IRS score with 5 dimensions (0-1000 scale) | No built-in scoring | No built-in scoring | No built-in scoring |
| **Pricing model** | Algorithmic (exponential formula based on credit score) | Community voting | Parametric triggers | Parametric triggers |
| **Payout mechanism** | Automatic via 2-of-3 attestor consensus | Claims assessed by community vote | Automatic on depeg event | Automatic on trigger |
| **First-loss capital** | Yes -- issuer bonds + junior tranche absorb losses first | No issuer bond required | No issuer bond | No issuer bond |
| **Identity compliance** | ERC-3643 verified payouts | Membership-based (KYC) | No identity layer | No identity layer |
| **Proof of coverage** | Soulbound NFT (non-transferable) | Transferable cover tokens | Transferable | Transferable |
| **Target blockchain** | HashKey Chain | Ethereum | Ethereum | Ethereum + others |
| **RWA issuer default coverage** | Yes | No | No | No |

**Key takeaway:** No existing protocol covers RWA issuer default risk. CoverFi is the only one.

---

## Page-by-Page Feature Guide

---

### Landing Page (index.html)

This is the marketing homepage -- the first thing a visitor sees. It explains what CoverFi does and encourages users to launch the app or provide liquidity.

#### Navigation Bar

- **CoverFi Logo** -- The hexagonal gold logo with "CoverFi" text. Clicking it scrolls to the top of the page.
- **Dashboard** -- Links to the main application dashboard (dashboard.html) where all the action happens.
- **Issuers** -- Links to the issuer browsing page (issuers.html) where you can compare all registered RWA issuers.
- **Pool** -- Links to the pool management page (pool.html) where liquidity providers deposit and withdraw funds.
- **Coverage** -- Links to the coverage page (coverage.html) where you can view your active protection positions.
- **Sun/Moon Toggle** -- Switches between light mode (warm cream background) and dark mode. Your preference is saved and persists across all pages.
- **Hamburger Menu (mobile)** -- On small screens, the navigation links collapse into a hamburger menu icon. Tapping it reveals the links in a dropdown.

#### Hero Section

- **"Cover Your Positions."** -- The main headline. "Cover Your" has a gold shimmer animation sweeping across the text. "Positions." glows in gold gradient. This communicates the core value: protecting your RWA token holdings.
- **Subtitle** -- "Decentralized credit protection for the $26.6B RWA token market. Algorithmic premiums. Community-funded pools. Instant payouts." This summarizes the three pillars of the protocol.
- **"Launch App" button** -- Gold pulsing button that takes you to dashboard.html. This is the primary call-to-action for users who want to get started.
- **"Provide Liquidity" button** -- Outlined secondary button that takes you to the Insurance Pool section of the dashboard. This is for users who want to earn yield by underwriting coverage.
- **Shield Illustration** -- A large animated SVG shield with a checkmark inside, surrounded by orbiting particles in gold, blue, and green. Represents protection and security.
- **Trust Strip** -- Three small badges at the bottom of the hero: "Built on HashKey Chain" (with HashKey icon), "ERC-3643 Compliant" (with shield checkmark icon), and "Soulbound Certs" (with lock icon). These communicate credibility at a glance.

#### Protocol Stats Bar

A row of four counters below the hero that communicate the protocol's current state. Each number animates from zero to its final value when it scrolls into view.

- **12 Smart Contracts** -- The number of auditable smart contracts deployed on-chain.
- **356 Tests Passing** -- The number of unit tests passing with 100% coverage.
- **5 Risk Dimensions** -- The five behavioral credit scoring dimensions in the IRS system.
- **25 On-Chain Transactions** -- The number of live transactions on HashKey Chain Testnet.
- **Hackathon Badge** -- A gold star badge reading "Built for the HashKey Chain Hackathon 2026."

#### Stats Bar (Key Metrics)

Four metric cards showing live protocol numbers:

- **$124,500 TVL (Total Value Locked)** -- The total amount of money deposited in the protocol's insurance pools. TVL is the standard DeFi metric for measuring how much capital a protocol holds. Higher TVL means more coverage capacity. The gold coin icon represents money. The "+12.4%" badge shows recent growth.
- **3 Active Issuers** -- The number of RWA token issuers currently registered and active in the protocol. An "issuer" is a company that has tokenized a real-world asset and registered with CoverFi. The people icon represents organizations. "+1" shows a recent addition.
- **$89,200 Coverage Written** -- The total dollar amount of coverage policies currently active. This means investors have collectively purchased $89,200 worth of protection against issuer defaults. The shield-checkmark icon represents protection. "+8.7%" shows growth.
- **$15,000 Payouts Executed** -- The total amount paid out to coverage holders when defaults were confirmed. This proves the system works. The pulse/heartbeat icon represents activity. "-3.2%" is normal fluctuation.

#### How CoverFi Works (6 Steps)

Six cards explaining the protocol lifecycle, each with a step number, icon, title, and description:

1. **Issuer Registers** (clipboard icon, blue) -- RWA issuers post a 5% Bond bond and get attested by 3 independent verifiers. This is the entry point for any company wanting to list their RWA token on CoverFi.
2. **IRS Score Calculated** (heartbeat icon, purple) -- The Issuer Reputation Score is computed across 5 dimensions: NAV accuracy, attestation quality, repayment history, collateral health, and governance activity. This is like a credit score for the issuer.
3. **Coverage Purchased** (shield-checkmark icon, green) -- Token holders buy protection. The premium is set algorithmically using the formula: 1600 x e^(-0.001386 x IRS). Higher IRS score means lower premiums (safer issuer = cheaper insurance).
4. **LPs Provide Liquidity** (lock icon, orange) -- Liquidity providers deposit USDT into Senior (70%) and Junior (30%) tranches to earn yield from premiums. Junior tranche absorbs losses first but earns higher returns.
5. **Default Detected** (warning triangle icon, red) -- When 2 out of 3 trusted attestors (custodian, legal representative, auditor) confirm a default event, the oracle triggers the payout engine automatically.
6. **Payout Executed** (sun/rays icon, gold) -- USDT is sent directly to verified ERC-3643 token holders. A SubrogationNFT is minted so the CoverFi Foundation can pursue legal recovery against the defaulted issuer.

#### Why CoverFi? (4 Feature Cards)

Four clickable cards linking to different dashboard sections:

- **Coverage** (orange) -- "Protect your RWA positions with on-chain credit default coverage for tokenized receivables." Shows a mockup with "TradeFlow Finance" and "$15,000 USDT" active protection. Links to the purchase form.
- **Earn** (blue) -- "Provide liquidity across senior and junior tranches to earn risk-adjusted yield." Shows a Senior/Junior ratio bar (70/30) and "4.2% APY" with an upward yield chart. Links to the pool section.
- **Verified** (purple) -- "2-of-3 attestor network computes on-chain Issuer Risk Scores for every token." Shows a mockup IRS score of 600/1000 with NAV, ATT, and REP dimension bars. Links to the IRS oracle section.
- **Instant Payouts** (green) -- "Automatic claims disbursed to verified coverage holders upon oracle confirmation." Shows "Claim #247" with "$15,000 USDT Disbursed" and "Confirmed" badge plus "SubrogationNFT #1." Links to the events section.

#### Security Section

Four security features displayed with icons:

- **ERC-3643 Compliant** (shield-checkmark, green) -- Identity-verified token transfers with on-chain compliance checks built into every transaction. ERC-3643 is the standard for security tokens that require identity verification.
- **Soulbound NFTs** (lock, blue) -- Non-transferable certificates prove issuer verification status and coverage eligibility. "Soulbound" means the NFT is permanently linked to your wallet and cannot be sold or transferred.
- **On-Chain Oracle** (clock, purple) -- Real-time risk scoring and default detection powered by decentralized oracle networks. Everything is computed on the blockchain, not on some company's server.
- **2-of-3 Attestation** (checkmark-circle, gold) -- Multi-sig verification ensures no single point of failure in default confirmation. At least 2 of the 3 attestors (custodian, legal rep, auditor) must agree before a default is confirmed.

#### Footer

Contains four columns:
- **CoverFi brand** -- Logo, tagline about being built for the HashKey Chain Hackathon 2026.
- **Protocol links** -- Dashboard, Issuers, Insurance Pool, Get Covered, Register Token, For Attestors.
- **Developer links** -- Smart Contracts (links to HashKey Explorer), Documentation, GitHub, HashKey Explorer.
- **Resources** -- Whitepaper, Security Audits, Bug Bounty, Brand Kit (placeholder links).
- **Social icons** -- X (Twitter), GitHub, Discord.

---

### Dashboard (dashboard.html)

This is the main application page. It contains the most functionality of any page and is where users interact with the protocol.

#### Top Navigation Bar

- **CoverFi Logo** -- Links back to the landing page (index.html).
- **Dashboard / Issuers / Pool / Coverage** -- Navigation links. The active page is highlighted in gold.
- **"HashKey Chain Testnet" badge** -- A small pill badge with a pulsing gold dot, indicating you are connected to the HashKey Chain test network (not mainnet with real money).
- **Role Badges** (hidden until wallet connected) -- Shows "LP" if you have pool positions, "ISSUER" if you are a registered issuer. Appears next to the wallet button.
- **Notification Bell** -- Click to see protocol notifications (IRS score changes, payout alerts, etc.). A red badge appears with the count of unread notifications. Click "Clear all" to dismiss.
- **Theme Toggle** -- Sun/moon icon to switch between light and dark mode.
- **"Connect Wallet" button** -- Gold button. Clicking it opens MetaMask (or another Web3 wallet). After connecting, the button shows your shortened wallet address (e.g., "0x742d...4E8c"). Clicking again opens a dropdown with: Copy Address, View on HashKey Explorer, and Disconnect.

#### Network Warning Banner

If you are connected to the wrong blockchain network (not HashKey Chain Testnet), an orange warning banner appears at the top: "Wrong network detected. Please switch to HashKey Chain Testnet to use CoverFi." with a "Switch Network" button that automatically switches your wallet.

#### Live Data Banner

A slim banner below the nav: "Live HashKey Chain Testnet -- Connect wallet to transact" with a "Connect Wallet" button. After connecting, it changes to show your connected status.

#### EWS Alert Banner

An Early Warning System alert that appears when an issuer's IRS score drops significantly. Example: "Early Warning: IRS Score Drop Detected -- TradeFlow Finance IRS dropped 65 points (645 to 580). Monitor closely." Can be dismissed with an X button.

#### Metric Cards (5 cards)

Five cards in a row showing key protocol metrics:

- **Total Value Locked** (gold gradient card, hero styling) -- The total USDT deposited across all pools. This is the headline number that shows protocol size.
- **Active Issuers** (blue icon) -- Count of issuers currently registered and not defaulted.
- **Coverage Written** (orange icon) -- Total dollar value of active coverage policies.
- **Pool Utilization** (purple icon) -- Percentage of pool capital currently backing active coverage. If utilization is high, the pool is heavily used.
- **Pool APY** (green icon) -- The annualized yield that liquidity providers are currently earning from premiums.

#### Registered Issuers Table

A table showing all registered RWA token issuers with these columns:

- **Issuer** -- Shows a colored avatar circle with initials (e.g., "AR" for AsiaReit), the issuer name, and the asset type (Real Estate, Trade Finance, Infrastructure).
- **IRS** -- The Issuer Reputation Score (0-1000). Displayed in green if high/healthy, dark gold if moderate. Higher is better.
- **Bond** -- The amount of USDT the issuer has locked as first-loss collateral (e.g., "5% Bond").
- **Status** -- A colored badge:
  - Green dot + "Active" = Issuer is in good standing, coverage is available
  - Gold/yellow dot + "Monitoring" = Issuer has some risk flags, being watched closely
  - Red dot + "Defaulted" = Issuer has defaulted, payouts may be in process
- **Attestors** -- Shows how many of the required 3 attestors have verified (e.g., "3/3" means fully verified, "2/3" means one attestor is still pending).

Demo data shows three issuers:
1. AsiaReit (Real Estate, IRS 720, Active, 3/3 attestors)
2. TradeFlow (Trade Finance, IRS 580, Monitoring, 2/3 attestors)
3. UrbanBridge (Infrastructure, IRS 650, Active, 3/3 attestors)

#### Protocol Events Feed

A live feed showing recent on-chain events, each with a colored dot and timestamp:

- Green dot: "Payout Executed -- $15,000 USDT to coverage holders via 2-of-3 attestation" with a clickable transaction hash linking to HashKey Explorer
- Red dot: "Default Detected on UrbanBridge REIT -- IRS dropped below 400 threshold"
- Green dot: "AsiaReit registered as issuer. Bond: 5% Bond locked."
- Blue dot: "LP Deposit -- 12,500 USDT added to Senior tranche."
- Gold dot: "IRS Updated -- TradeFlow score recalculated to 580."
- Orange dot: "Coverage Purchased -- 15,000 USDT on AsiaReit @ 696 bps."
- Purple dot: "ProtectionCert #3 minted as soulbound NFT (ERC-721)."

#### IRS Oracle Card

The Issuer Reputation Score panel showing detailed credit scoring:

- **Gauge** -- A semicircular gauge with a gradient from red (left/low) through yellow and green to blue and purple (right/high). The fill level shows the current composite score. The gauge animates when the page loads.
- **Score Display** -- Large number showing the composite IRS score (e.g., "600") in gold with a glow effect, with "of 1,000" subtitle.
- **5 Dimension Bars** -- Five horizontal progress bars showing each component of the IRS score:
  - **NAV Deviation** (blue, 150/200) -- How accurately the issuer reports the Net Asset Value of the underlying assets. Higher = more accurate.
  - **Attestation** (green, 120/200) -- Quality and timeliness of attestor verification reports. Higher = better attestation history.
  - **Repayment** (gold, 110/200) -- Track record of on-time repayment to token holders. Higher = better repayment history.
  - **Collateral** (purple, 120/200) -- Health ratio of the collateral backing the tokens. Higher = better collateralized.
  - **Activity** (orange, 100/200) -- How actively the issuer participates in governance and protocol activities. Higher = more engaged.
- **"Show Advanced Analytics" button** -- Expands to reveal:
  - **Radar Chart** -- A 5-axis spider/radar chart visualizing all dimensions simultaneously, making it easy to spot strengths and weaknesses.
  - **Premium Formula** -- Displays the formula: P = 1600 x e^(-0.001386 x IRS). This shows how the IRS score mathematically determines the insurance premium rate.
  - **Premium Curve** -- An interactive SVG chart plotting premium rate (bps) vs IRS score. Hovering shows exact values. The curve is exponentially decreasing -- higher IRS scores get dramatically lower premiums.
- **Premium Payment Section** -- Shows your current premium details:
  - Current Rate (in basis points)
  - Annual Cost
  - Next Due date
  - Status (Current / Overdue)
  - Payment History log
  - "Pay Premium" button

#### Insurance Pool Card

Shows the state of the protocol's insurance pool:

- **Total TVL** -- Total USDT in the pool.
- **Available** -- How much is available for new coverage (not already backing existing policies).
- **Senior APY** -- Annual yield for the senior tranche (lower risk, lower return, ~4.2%).
- **Junior APY** -- Annual yield for the junior tranche (higher risk, higher return, ~9.8%).
- **Senior/Junior Ratio Bar** -- A horizontal bar split into two colors: blue for Senior and purple for Junior, showing the percentage split (target: 70% Senior / 30% Junior).
- **Loss Absorption Waterfall** -- Three stacked horizontal bars showing the order losses are absorbed:
  1. **Issuer Bond** (red/coral, "First Loss") -- The issuer's deposited bond is consumed first. Example: "5% Bond."
  2. **Junior Tranche (jrCVR)** (purple, "Second Loss") -- Junior LP funds are consumed next. "30%."
  3. **Senior Tranche (srCVR)** (blue, "Last Resort") -- Senior LP funds are only touched after bond and junior are exhausted. "70%."
  - At the bottom: a shield icon with "Investor Protected" text.
- **Your Position** (visible when wallet connected) -- Shows your srCVR balance, jrCVR balance, estimated value, and unrealized yield.
- **"Deposit Senior" / "Deposit Junior" buttons** -- Open deposit flows for each tranche.

#### Get Covered Card

A form for purchasing coverage:

- **Select Issuer dropdown** -- Choose which issuer you want protection against. Options show the issuer name and their IRS score (e.g., "AsiaReit (IRS: 720)"). The IRS score helps you assess how risky the issuer is.
- **Coverage Amount (USDT)** -- Enter how much coverage you want (e.g., 15,000 USDT). Minimum 100, maximum 1,000,000.
- **Duration** -- Select how long you want coverage: 30, 90, 180, or 365 days.
- **Estimated Premium** -- Auto-calculated based on your selections. Shows the dollar amount (e.g., "$587.40") and the annualized rate in basis points (e.g., "696 bps annualized"). Lower IRS score = higher premium = riskier issuer.
- **"Get Coverage" / "Connect Wallet First" button** -- If wallet is not connected, shows "Connect Wallet First." After connecting, shows "Get Coverage" and submits the transaction.

#### Protection Certificate Card

Displays your soulbound NFT coverage certificate:

- **ProtectionCert #3** -- The NFT token name and number.
- **"SOULBOUND - NON-TRANSFERABLE (ERC-5192)"** -- This badge means the NFT is permanently bound to your wallet. It cannot be sold, transferred, or given away. This prevents fraud -- only the actual coverage holder receives payouts.
- **Certificate fields:**
  - Holder: Your wallet address (e.g., "0x742d...4E8c")
  - Issuer: Which issuer you are covered against (e.g., "AsiaReit")
  - Coverage: Amount of protection (e.g., "15,000 USDT")
  - Premium Paid: What you paid for the coverage (e.g., "587.40 USDT")
  - Rate: The premium rate (e.g., "696 bps")
  - Start: Coverage start date (e.g., "Mar 26, 2026")
  - Expiry: Coverage end date (e.g., "Sep 22, 2026")
  - Status: "Active" in green (or "Expired" / "Paid Out")

#### Your Transactions

A full-width card showing your transaction history with the protocol. Links to "View all on HashKey Explorer" which opens HashKey Explorer in a new tab showing all transactions at the contract address.

#### Last Updated Bar

A timestamp at the bottom showing when data was last fetched from the blockchain, with a "Refresh" button to manually reload.

---

### Browse Issuers (issuers.html)

A dedicated page for comparing all registered RWA issuers side-by-side.

#### Page Header

- Title: "Browse Issuers"
- Subtitle: "Compare registered RWA issuers, their IRS credit scores, and buy coverage protection."

#### Metric Cards (4 cards)

- **Registered Issuers** (purple icon) -- Total count of issuers in the system (e.g., 3).
- **Avg IRS Score** (blue pulse icon) -- The average IRS score across all issuers. Gives a quick sense of overall market health.
- **Total Coverage Available** (orange dollar icon) -- How much total coverage capacity exists across all issuers.
- **Lowest Premium** (green chart icon) -- The cheapest premium rate available, so users can find the best deal.

#### Filter/Sort Bar

- **Search box** -- Type to search issuers by name.
- **Sort dropdown** -- Sort by: IRS Score (High to Low), IRS Score (Low to High), Premium (Low to High), Premium (High to Low), or Status.
- **Status filter** -- Show All, Active Only, Observing, or Defaulted issuers.
- **Sector filter** -- Show All Sectors, Real Estate, Trade Finance, or Infrastructure.

#### Issuer Cards

Each issuer is displayed as a card showing:
- Colored avatar with initials
- Issuer name and sector
- IRS score with colored indicator
- Status badge (Active/Monitoring/Defaulted)
- Bond amount
- Attestor count (e.g., 3/3)
- Premium rate in bps
- Coverage capacity

#### "Get Coverage" / "View Details" buttons

- **Get Coverage** -- Takes you directly to the purchase form on the dashboard, pre-selected for this issuer.
- **View Details** -- Opens a modal showing the full IRS breakdown (5 dimension bars), premium calculation details, bond details (amount, market cap ratio, deposit status), registration info (block number, track type), and a link to view the contract on HashKey Explorer.

---

### Pool Management (pool.html)

The dedicated page for liquidity providers (underwriters) to manage their pool positions.

#### Page Header

- Breadcrumb: "Dashboard / Pool Management"
- Title: "Pool Management"
- Subtitle: "Manage your underwriter positions and pool liquidity"

#### Pool Overview Metrics (4 cards)

- **Total Pool TVL** (gold gradient hero card) -- Total USDT across both tranches.
- **Senior TVL** (blue) -- USDT in the senior tranche.
- **Junior TVL** (purple) -- USDT in the junior tranche.
- **Coverage Ratio** (green) -- Percentage of pool funds currently backing active coverage.

#### Pool Composition Card

- **Pool stats grid** -- Total Insured, Pool Health (Active/Warning/Critical), Redemption Gate status (Active/Inactive), Coverage Ratio in BPS.
- **Senior/Junior Ratio Bar** -- Visual split showing how funds are distributed between tranches. Target is 70% Senior / 30% Junior.
- **Health indicator** -- A green dot with "Healthy" label when the pool is well-balanced.

#### Your Pool Position Card

- Shows "Connect Wallet" prompt if not connected.
- When connected, shows two tranche sections:
  - **Senior Tranche (srCVR)**: Balance, Value (USDT), APY (~4.2%), Exchange Rate (USDT/srCVR). Tagged "LOW RISK."
  - **Junior Tranche (jrCVR)**: Balance, Value (USDT), APY (~9.8%), Epoch Yield. Tagged "HIGH YIELD."
- **Total Position** -- Combined value across both tranches.
- **Total Yield Earned** -- Cumulative yield earned in green.
- **Action buttons** -- "Deposit More" and "Request Withdrawal."

#### Deposit into Pool Card

Two side-by-side deposit forms:

- **Senior Tranche**:
  - APY badge: "APY ~4.2%"
  - Risk label: "Low Risk -- First loss absorbed by Junior + Bond"
  - Amount input (USDT), minimum 10 USDT
  - "You will receive srCVR tokens" hint
  - "Deposit Senior" button

- **Junior Tranche**:
  - APY badge: "APY ~9.8%"
  - Risk label: "Higher Risk -- First loss after bond reserve"
  - Amount input (USDT), minimum 10 USDT
  - "You will receive jrCVR tokens" hint
  - "Deposit Junior" button

#### Request Withdrawal Card

- **Redemption gate warning** -- If the gate is active (during high utilization or default events), withdrawals may be delayed.
- **Tranche selector** -- Choose Senior or Junior.
- **Amount input** -- Shows available balance.
- **Redemption preview** -- Token Amount, Exchange Rate, and final Redemption Value in USDT.
- **"Request Withdrawal" button**

#### Loss Waterfall Card

A detailed visual explanation of the 3-layer loss absorption system:

1. **Bond Reserve** (1st Loss, dark purple) -- "Issuer Bond -- Absorbed First." Each issuer posts a bond that acts as first-loss capital.
2. **Junior Tranche (jrCVR)** (2nd Loss, medium purple) -- "Higher Yield -- Higher Risk." Junior LPs earn 9-12% APY in exchange for taking on more risk.
3. **Senior Tranche (srCVR)** (3rd Loss, light purple) -- "Lower Yield -- Protected." Senior LPs earn 3-5% APY with maximum protection.
- "Senior Tranche is Triple-Protected" label at the bottom.

#### Pool Events

A live feed of pool-specific events: deposits, withdrawals, yield distributions, and rebalancing events.

---

### My Coverage (coverage.html)

The page for investors/policyholders to manage their coverage positions.

#### Page Header

- Title: "My Coverage"
- Subtitle: "Monitor your active protection positions and payout history"
- "Dashboard" link button to return to main dashboard.

#### Metrics Row (4 cards)

- **Active Positions** (orange shield) -- Number of currently active coverage policies you hold.
- **Total Coverage** (gold dollar) -- Total dollar value of your active coverage.
- **Premiums Paid** (purple document) -- Total premiums you have paid across all policies.
- **Payouts Received** (green pulse) -- Total payout amounts you have received from defaults.

#### My Active Coverage Card

- Shows your active ProtectionCert NFTs as certificate cards.
- Each card displays: Cert ID, Issuer, Coverage amount, Duration, Status (Active/Expired), and Premium paid.
- **Empty state** -- If no coverage: "No Active Coverage. Connect your wallet to view ProtectionCert NFTs, or purchase coverage from the dashboard." With a "Get Coverage" link button.
- **"LIVE" badge** -- Green pulsing dot indicating real-time data.

#### Payout Status Card

- Only visible if a default event has occurred and you received a payout.
- Shows the payout amount, transaction details, and confirmation status.
- Badge: "RECEIVED"

#### Coverage History Table

A table tracking all your past coverage:

| Column | Description |
|--------|-------------|
| Cert ID | The ProtectionCert NFT number |
| Issuer | Which issuer the coverage was for |
| Coverage | Dollar amount covered |
| Period | Start and end dates |
| Status | Active, Expired, or Paid Out |
| Payout / TX | Payout amount and transaction link to HashKey Explorer |

Empty state: "No coverage history yet. Expired and paid-out positions will appear here."

#### Get Coverage CTA

A call-to-action section at the bottom:
- "Purchase credit protection from verified issuers on the CoverFi protocol. Coverage is backed by the tri-layer waterfall system."
- **"Get Coverage" button** -- Links to dashboard purchase form.
- **"Browse Issuers" button** -- Links to the issuers page.

---

### Protocol Statistics (stats.html)

A public statistics page that does not require a wallet connection. Anyone can view protocol health metrics.

#### Page Header

- Badge: "Public View -- No Wallet Required"
- Title: "Protocol Statistics"
- Subtitle: "Real-time health and performance metrics for the CoverFi protocol on HashKey Chain Testnet"

#### Protocol Health Overview (6 metric cards)

- **Total Value Locked** (gold gradient hero card)
- **Total Coverage Written** (orange)
- **Total Premiums Collected** (gold)
- **Total Payouts Executed** (green)
- **Protocol Coverage Ratio** (blue)
- **Active Issuers** (purple)

#### Pool Composition Section

- **Donut Chart** -- A circular chart showing the breakdown of pool funds by source:
  - Blue segment: Senior Tranche
  - Purple segment: Junior Tranche
  - Gold segment: Bond Capital
- **Legend** -- Lists each segment with its dollar value.
- **Utilization Ratio bar** -- Shows what percentage of pool funds are currently backing active coverage.

#### IRS Score Distribution

- Bar chart showing each issuer's IRS score as a horizontal bar.
- Average IRS Score displayed below.

#### Premium Rate Curve

- A full-width chart plotting the premium formula: P = 1600 x e^(-0.001386 x IRS) bps.
- X-axis: IRS Score (0-1000), Y-axis: Premium Rate (bps).
- The curve shows how premiums decrease exponentially as issuer creditworthiness improves.

#### Recent Events + Contract Addresses

- **Protocol Events** -- Live feed similar to the dashboard events.
- **Contract Addresses table** -- Lists all deployed smart contracts with their HashKey Explorer-linked addresses.
- **Last Updated** -- Timestamp with a Refresh button.

---

### Issuer Registration (register.html)

A 5-step wizard for RWA token issuers to register with CoverFi.

#### Step Indicator

A horizontal progress bar showing steps 1 through 5 as numbered circles connected by lines. Completed steps are highlighted.

#### Step 1: Token Information

- **Token Contract Address input** -- Enter the ERC-3643 token contract address deployed on HashKey Chain Testnet.
- **"Validate Token" button** -- Queries the blockchain to verify the token. Shows validation results:
  - Token Name (checkmark if valid)
  - Symbol (checkmark if valid)
  - Total Supply (checkmark if valid)
  - ERC-3643 compliance (checkmark if the token implements the ERC-3643 standard)
- **"Next Step" button** -- Appears after successful validation.

#### Step 2: Bond Calculation

- **Calculator grid** showing:
  - Token Supply
  - NAV per Token ($0.10)
  - Market Cap (computed)
  - Required Bond (5% of market cap) -- highlighted in gold
  - Your USDT Balance
- **Expandable FAQ** -- "What is the issuer bond?" Explains that the bond is first-loss capital, equals 5% of market cap, is held in the IssuerBond smart contract, and is returned upon successful wind-down.
- **"Approve & Deposit Bond" button** -- Two-step process: first approves USDT spending, then deposits the bond.

#### Step 3: Select Attestors

Three attestor fields, all required:
- **Custodian** -- Holds the underlying assets in custody. Enter their wallet address.
- **Legal Representative** -- Licensed attorney for legal verification.
- **Auditor** -- Financial auditor for compliance.
Each field validates the entered address and shows if the attestor is registered in the system.
- **Track Display** -- Shows whether the issuer qualifies for "Fast Track" (14-day observation) or "Standard Track" (60-day observation).

#### Step 4: Legal Entity Verification

- **BAS Attestation UID input** -- Enter the attestation UID from the Attestation Service.
- **Expandable FAQ** -- Step-by-step instructions for getting a BAS attestation: visit bascan.io, connect wallet, create attestation with CoverFi schema, fill in legal entity details, submit, and copy the UID.

#### Step 5: Registration Summary

Shows all entered information for review:
- Token name and contract address
- Bond deposited (with checkmark)
- Custodian, Legal Rep, and Auditor addresses
- BAS UID
- Track type (Fast/Standard)
- Starting IRS score
- **"Register Now" button** -- Submits the registration transaction on-chain.

#### Success Screen

After successful registration:
- Green checkmark icon
- "Registration Complete!" title
- "You are now in the observation period." subtitle
- Status: OBSERVATION
- Track type
- Attestations needed: "0 / 2 submitted"
- "Go to Dashboard" link

---

### Attestor Dashboard (attestor.html)

The page for attestors (custodians, legal representatives, and auditors) to manage their verification duties.

#### Registration Section (shown when not yet registered)

- **Attestor Type selector** -- Three radio button options with icons:
  - Custodian -- "Holds underlying assets in custody"
  - Legal Rep -- "Licensed attorney for legal verification"
  - Auditor -- "Financial auditor for compliance"
- **Bond Deposit input** -- Minimum 5% Bond (~$3,000). The bond determines max pool TVL coverage capacity.
- **"Register as Attestor" button**
- Hint: "Fast Track eligibility unlocks after 30 days in TIR"

#### Attestor Dashboard (shown when registered)

##### Metric Cards (4 cards)
- **Type** -- Your attestor type (Custodian/Legal Rep/Auditor)
- **Bond Staked** -- Amount of USDT staked
- **Attestations** -- Number of attestations submitted
- **Status** -- Active/Suspended badge

##### Attestor Profile Card
- Wallet address, registration date, successful attestations, disputed attestations, slash count, and Fast Track eligibility.

##### Submit Default Attestation Card
- **Issuer Token Address** -- Which issuer you are attesting a default for.
- **BAS Attestation UID** -- Reference to the Attestation Service evidence.
- **Evidence Hash** -- Keccak256 hash of supporting evidence documents.
- **"Submit Default Attestation" button**

##### Default Event Voting Card
- Shows active default events that need attestor votes.
- Empty state: "No Active Default Events. All issuers are in good standing."
- When events exist, shows the issuer, default type, current vote count, and buttons to vote Yes/No.

##### Lookup Default Confirmation Card
- Enter an issuer token address to check if a default confirmation exists.
- Shows results: Custodian, Legal Rep, and Auditor attestation status, quorum reached status.

---

### Issuer Management (issuer-dashboard.html)

The private dashboard for registered issuers to manage their token and monitor their status.

#### Access Gate

If you are not a registered issuer, shows: "Issuer Access Required. This dashboard is for registered issuers only. Connect your wallet to verify your issuer status." with a Connect Wallet button.

#### Issuer Content (visible after verification)

##### Issuer Status Card
- Token Name, Symbol, Contract Address
- Registration Block, Track type (Fast/Standard), Days Since Registration
- Observation End Block
- **Status Timeline** -- A horizontal timeline showing the issuer lifecycle: Observe -> Active -> Monitor -> Wind Down -> Closed. The current stage is highlighted.

##### IRS Score Card
- Semicircular gauge showing the composite IRS score.
- Premium rate badge (in bps/year).
- 5 dimension bars: NAV, Attestation, Repayment, Collateral, Activity.

##### Bond Status Card
- Large bond amount display.
- Details: Market Cap at Deposit, Bond-to-Market-Cap Ratio, Deposit Block, Liquidated (Yes/No), Released (Yes/No).

##### Attestor Panel Card
- Lists the three assigned attestors (Custodian, Legal Rep, Auditor) with their addresses and attestation status dots (green = attested, gray = pending).
- Attestation count badge.

---

### Subrogation Claims (subrogation.html)

The page for managing SubrogationNFTs -- evidence containers created after a default for legal recovery.

#### Page Header

- Title: "Subrogation Claims"
- Subtitle: "Manage SubrogationNFTs -- post-default evidence containers for legal recovery against defaulted issuers."
- Contract address pills showing SubrogationNFT and PayoutEngine addresses.

#### Overview Metrics (3 cards)

- **NFTs Minted** -- Total SubrogationNFTs created by the protocol.
- **Recovery Pending** -- Dollar value of funds pending legal recovery.
- **Active / Completed** -- Count of active recovery cases vs completed ones.

#### SubrogationNFT Claims List

- Cards showing each SubrogationNFT with: NFT ID, issuer token address, default type, bond amount liquidated, junior tranche amount, senior tranche amount, number of holders compensated, and payout block number.
- **Refresh button** to reload claims.
- **Empty state** -- "No SubrogationNFTs Found. No default events have occurred yet."

#### Recovery Process Info

Four-step explanation of how post-default recovery works:

1. **SubrogationNFT Minted** -- When a default is processed, an NFT is automatically minted recording all evidence on-chain.
2. **Evidence Container** -- The NFT captures bond, junior, and senior amounts liquidated plus holder count.
3. **Foundation Initiates Recovery** -- The CoverFi Foundation uses the NFT as cryptographic proof to pursue legal recovery.
4. **Timeline & Resolution** -- Legal recovery timelines vary; recovered funds return to the protocol treasury.

---

## Icon Guide

| Icon | Where Used | Meaning |
|------|-----------|---------|
| Green pulsing dot | Status badges, "Live" labels | Active, healthy, online |
| Gold/yellow pulsing dot | Testnet badge, monitoring status | Testnet connected, or warning/monitoring state |
| Red dot | Default events | Defaulted, danger, critical issue |
| Blue dot | Pool events | Liquidity-related event (deposit, withdrawal) |
| Orange dot | Coverage events | Coverage purchase or claim activity |
| Purple dot | NFT events, verification | Certificate minting, attestation activity |
| Bell icon | Dashboard nav bar | Notifications panel toggle |
| Sun icon | Nav bar (light mode) | Currently in light theme; click to switch |
| Moon icon | Nav bar (dark mode) | Currently in dark theme; click to switch |
| Shield with checkmark | Coverage, security, protection | Protection active, verified, secure |
| Lock icon | Soulbound badges, wallet | Non-transferable NFT, or wallet/connect |
| Heartbeat/pulse line | IRS Oracle, APY metrics | Risk scoring activity, yield measurement |
| Warning triangle | Default alerts, EWS banner | Danger, default detected, requires attention |
| People/users icon | Issuer count, attestors | Organizations or people in the system |
| Dollar sign | TVL, coverage amounts, bond | Financial value, money-related metrics |
| Clock/timer icon | IRS Oracle, events, history | Time-related: scoring intervals, event timestamps |
| Checkmark in circle | Validation, attestation | Confirmed, verified, approved |
| Document/file icon | Registration, BAS attestation | Documentation, legal records |
| Globe icon | Pool, stats page | Global/public view, network connectivity |
| Lightning bolt | Junior tranche | High energy, high yield, higher risk |
| Chart bars | IRS distribution, stats | Statistical data, score comparisons |
| Hexagonal logo | CoverFi brand, nav | CoverFi protocol identity |

---

## Glossary of Terms

| Term | Simple Explanation |
|------|-------------------|
| TVL | Total Value Locked -- the total amount of money deposited in the protocol. Like the total assets of an insurance company. |
| IRS | Issuer Reputation Score -- a 0-1000 credit score for RWA token issuers, computed from 5 behavioral dimensions. Higher is safer. |
| bps | Basis points -- a unit of measurement. 100 bps = 1%. So 696 bps = 6.96% annual premium rate. |
| APY | Annual Percentage Yield -- how much you earn per year on your deposited funds. 4.2% APY means $100 earns ~$4.20/year. |
| RWA | Real World Assets -- physical or financial assets (real estate, loans, invoices) that have been tokenized on a blockchain. |
| ERC-3643 | A token standard for security tokens that includes built-in identity verification and compliance checks. Only verified holders can receive transfers. |
| ERC-5192 | The soulbound token standard. Tokens minted under this standard are permanently locked to the holder's wallet and cannot be transferred. |
| Soulbound | An NFT that is permanently attached to your wallet. It cannot be sold, transferred, or given away. Used for coverage certificates. |
| Senior Tranche | The lower-risk pool tier. Senior LPs earn lower yields (~4.2% APY) but are protected by the bond and junior tranche absorbing losses first. |
| Junior Tranche | The higher-risk pool tier. Junior LPs earn higher yields (~9.8% APY) but absorb losses after the issuer bond is exhausted. |
| srCVR | Senior CoverFi Receipt token -- an LP token you receive when depositing into the Senior tranche. Redeemable for USDT plus yield. |
| jrCVR | Junior CoverFi Receipt token -- an LP token you receive when depositing into the Junior tranche. Redeemable for USDT plus yield. |
| ProtectionCert | A soulbound NFT representing your active coverage policy. Contains all coverage details (issuer, amount, duration, premium). |
| SubrogationNFT | An NFT minted after a default, containing all evidence of the default event. Used by the Foundation for legal recovery. |
| Attestor | One of three independent verifiers (custodian, legal representative, auditor) who validate issuer behavior and confirm default events. |
| 2-of-3 Attestation | At least 2 out of 3 attestors must agree before a default is officially confirmed and payouts begin. Prevents false positives. |
| NAV | Net Asset Value -- the fair market value of the underlying real-world assets backing a token. |
| Waterfall | The order in which losses are absorbed: first the issuer bond, then junior tranche, then senior tranche. Protects senior LPs. |
| Default | When an issuer fails to meet obligations -- missed payments, abandonment, collateral misuse, or insolvency. |
| Premium | The price paid for coverage. Like an insurance premium. Calculated algorithmically based on the issuer's IRS score. |
| Bond | A deposit of USDT or USDT that issuers must lock as first-loss capital. Shows commitment and protects coverage holders. |
| BAS | Attestation Service -- an on-chain identity attestation platform on HashKey Chain used for legal entity verification. |
| TIR | Trusted Issuer Registry -- the on-chain registry managing attestor assignments and observation periods. |
| Fast Track | An accelerated registration track (14-day observation) for issuers with all 3 attestors pre-registered. Standard track is 60 days. |
| Observation Period | The waiting period after registration before an issuer becomes "Active." Allows attestors to verify the issuer's legitimacy. |
| Redemption Gate | A safety mechanism that can restrict withdrawals during high utilization or default events to protect pool solvency. |
| HashKey Chain | HashKey Chain -- a blockchain network. CoverFi is deployed on HashKey Chain's testnet for the hackathon. |
| HashKey Chain Testnet | The test version of HashKey Chain. Uses fake money for testing. No real funds are at risk. |
| MetaMask | A popular browser-extension crypto wallet used to interact with blockchain applications. |
| HashKey Explorer | The block explorer for HashKey Chain. Like a public ledger viewer where you can look up any transaction or contract. |
| Gas | The fee paid to the blockchain network to process a transaction. Paid in USDT on HashKey Chain. |
| CDS | Credit Default Swap -- the traditional finance equivalent of what CoverFi does. An $8 trillion market. |

---

## Competitor Comparison

| Feature | CoverFi | Nexus Mutual | Risk Harbor | Neptune Mutual |
|---------|---------|-------------|-------------|----------------|
| **What it covers** | RWA issuer default (payment failure, abandonment, collateral theft) | Smart contract bugs, oracle failure, protocol hacks | Stablecoin depegging events | Smart contract exploits + stablecoin depeg |
| **Credit scoring** | IRS with 5 dimensions (0-1000 scale) | None | None | None |
| **Premium pricing** | Algorithmic: 1600 x e^(-0.001386 x IRS) bps | Community staking model | Fixed parametric pricing | Cover creator sets price |
| **Default detection** | 2-of-3 attestor consensus (custodian, legal rep, auditor) | Community claims assessment (advisory board vote) | Automatic depeg trigger | Incident reporting + resolution |
| **First-loss protection** | 3 layers: issuer bond, junior tranche, senior tranche | Mutual fund model (shared risk) | No first-loss layer | No first-loss layer |
| **Identity compliance** | ERC-3643 (verified token holders only) | KYC membership required | No identity requirement | No identity requirement |
| **Coverage proof** | Soulbound NFT (non-transferable) | Transferable cover tokens (NXM) | Transferable tokens | Transferable cxTokens |
| **Target market** | Tokenized RWA holders ($12B+ market) | DeFi protocol users | Stablecoin holders | DeFi users |
| **Blockchain** | HashKey Chain | Ethereum | Ethereum | Ethereum, Arbitrum, others |
| **Post-default recovery** | SubrogationNFT for legal recovery | No recovery mechanism | No recovery mechanism | No recovery mechanism |
| **Issuer bond requirement** | Yes (5% of market cap) | No | No | No |
| **Pool structure** | Two-tranche (Senior/Junior) with different risk/reward | Single pool | Single pool | Single pool |

---

## How to Demo CoverFi (5-Minute Script)

**Preparation:** Open the CoverFi landing page in a browser. Have MetaMask installed with a HashKey Chain Testnet wallet.

**Minute 0-1: The Problem (Landing Page)**

Open index.html. Point to the hero: "Cover Your Positions." Explain: "There is $12 billion in tokenized real-world assets on blockchains today, and zero dollars of automated default protection. If an issuer fails, investors lose everything. CoverFi is the missing insurance layer."

Scroll to the stats bar: "$124,500 TVL, 3 Active Issuers, $89,200 Coverage Written, $15,000 Payouts Executed."

Scroll to "How CoverFi Works" and quickly walk through the 6 steps: Register, Score, Buy Coverage, Fund Pool, Detect Default, Payout.

**Minute 1-2: The Dashboard (Main App)**

Click "Launch App." On the dashboard, point to the 5 metric cards. Show the Registered Issuers table -- 3 issuers with different IRS scores and statuses. Point out that one is "Monitoring" (risky).

Show the Protocol Events feed -- live on-chain events including a payout execution and default detection.

**Minute 2-3: Credit Scoring (IRS Oracle)**

Scroll to the IRS Oracle card. Show the gauge: "This is a 600/1000 credit score computed from 5 behavioral dimensions." Point to each bar: NAV, Attestation, Repayment, Collateral, Activity.

Click "Show Advanced Analytics" to reveal the radar chart and premium curve. Explain: "Higher score means lower premiums. The formula P = 1600 x e^(-0.001386 x IRS) creates an exponential relationship -- the safest issuers get dramatically cheaper coverage."

**Minute 3-4: Buy Coverage + Pool**

Show the "Get Covered" form. Select AsiaReit (IRS: 720), enter $15,000 coverage for 180 days. Show the estimated premium: $587.40 at 696 bps.

Show the Insurance Pool card with the waterfall diagram. Explain the 3-layer loss absorption: "Bond first, then junior, then senior. Senior LP capital is triple-protected."

Show the Protection Certificate (soulbound NFT): "This non-transferable NFT is your proof of coverage. It cannot be sold or faked."

**Minute 4-5: What Makes Us Different**

Connect your wallet (if you have not already). Show the wallet badge, role badges, and live data loading.

Close with: "No existing protocol covers RWA issuer default risk. CoverFi is the only one in the entire 93-participant hackathon building financial infrastructure rather than a tracking app. We are the missing primitive for the $8 trillion CDS market to come on-chain."

Point to the HashKey Explorer link: "Everything you see is live on HashKey Chain Testnet. Twelve smart contracts, 356 tests passing, fully auditable."

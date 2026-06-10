# CoverFi -- User Manual

## Your Complete Guide to Navigating the CoverFi Protocol

> **How to use this manual:** Open CoverFi in your browser alongside this document. Follow along step by step. Each section tells you exactly what you are looking at, what it means, and what to click next.

---

## Before You Start

**What you need:**
- Chrome browser (recommended) or any modern browser
- MetaMask wallet extension installed
- A small amount of HSK (testnet HSK) for gas fees

**URL:**
- Live: `https://coverfi-protocol.vercel.app`
- Local: `http://localhost:8085`

**Network:** HashKey Chain Testnet (Chain ID 133). The app will show a yellow warning banner and prompt you to switch if you are on the wrong network.

**What is CoverFi?** CoverFi is a decentralized insurance protocol for Real World Asset (RWA) tokens. If a company that issued an RWA token goes bankrupt or defaults, CoverFi pays out insurance to the token holders who purchased coverage. Think of it as credit default protection, but on the blockchain.

---

## Chapter 1: Landing Page -- Your First Impression

> **Open:** `index.html` or the root URL

When you first load CoverFi, you land on the marketing page. This page requires no wallet -- it is purely informational. Here is everything you see, from top to bottom.

### Navigation Bar (top of every page)

A horizontal bar fixed at the very top of the screen. It starts transparent and becomes a frosted glass blur when you scroll down.

**Left side:**
- **Gold hexagon + "CoverFi"** -- The logo is a layered hexagon in gold gradient. The word "Cover" is dark and "Fi" is gold. Clicking it scrolls you back to the top of this landing page.

**Center (four links):**
- **Dashboard** -- Takes you to `dashboard.html`, the main application command center where you view live protocol data, registered issuers, IRS scores, the insurance pool, and purchase coverage.
- **Issuers** -- Takes you to `issuers.html`, a dedicated page for browsing all registered RWA token issuers as large cards. You can filter, sort, search, and compare their credit scores before deciding who to buy coverage from.
- **Pool** -- Takes you to `pool.html`, the liquidity management page. Here you deposit money into the insurance pool (senior or junior tranche) to earn yield, withdraw funds, and view the loss waterfall.
- **Coverage** -- Takes you to `coverage.html`, your personal protection portfolio. View your active ProtectionCert NFTs, payout history, and expired positions.

**Right side:**
- **Sun/Moon circle button** -- This is the theme toggle. In light mode you see a crescent moon icon; click it to switch to dark mode (dark backgrounds, light text). In dark mode you see a sun icon; click to return to light mode. Your preference is saved in your browser -- it persists across pages and visits.

**Mobile:** On screens narrower than 768px, the center links collapse into a hamburger menu icon (three horizontal lines). Tap it to expand the navigation vertically.

---

### Hero Section

The large banner area immediately below the navigation bar.

**Background effects:** Three soft gradient orbs float slowly behind the content, plus four small floating geometric shapes. These are decorative only.

**Main headline:** "Cover Your Positions." -- This is the core value proposition. "Positions" refers to your crypto investments in RWA tokens. The word "Cover Your" has a subtle shimmer animation; "Positions." is highlighted in gold.

**Subtitle text:** "Decentralized credit protection for the $26.6B RWA token market. Algorithmic premiums. Community-funded pools. Instant payouts." -- This summarizes the three pillars of the protocol: premiums are calculated by an algorithm (not a committee), the insurance pool is funded by community liquidity providers, and payouts happen automatically when a default is confirmed.

**Two buttons:**
- **"Launch App" (gold, glowing)** -- The primary call to action. Click this to go to the Dashboard (`dashboard.html`). The button has a pulsing gold glow animation to draw your attention.
- **"Provide Liquidity" (outlined)** -- A secondary action. Click this to go directly to the Pool section of the dashboard where you can deposit money to earn yield.

**Shield illustration:** Below the buttons is an animated SVG shield in gold gradient. Small colored dots orbit around it. Two expanding rings pulse outward from the center. This represents protection.

**Trust badges (three small items below the shield):**
- **"Built on HashKey Chain"** -- Shows the CoverFi hexagon logo. Tells you this runs on HashKey Chain (HashKey Chain).
- **"ERC-3643 Compliant"** -- Shows a green shield with checkmark. ERC-3643 is the standard for regulated security tokens with built-in KYC/identity checks.
- **"Soulbound Certs"** -- Shows a purple padlock icon. Protection certificates are soulbound NFTs (ERC-5192), meaning they cannot be transferred or sold -- they are permanently attached to the wallet that purchased them.

---

### Stats Bar (dark strip below hero)

A horizontal row of four cards showing live protocol metrics. Each card has an icon, a label, and an animated counting number.

| Card | Icon | Value | What It Means |
|------|------|-------|---------------|
| **Total Value Locked** | Gold coin circle | $124,500 | The total money deposited into the insurance pool. This is the capital available to pay claims. |
| **Active Issuers** | Blue person silhouette | 3 | Three companies have registered their RWA tokens with CoverFi. |
| **Coverage Written** | Green shield with checkmark | $89,200 | The total face value of all active protection certificates that have been purchased. |
| **Payouts Executed** | Purple zigzag line | $15,000 | Total money that has been paid out to covered investors after a default event. |

Each card also shows a small change indicator in the top-right corner (e.g., "+12.4%" with an up arrow for TVL). The numbers animate upward from zero when you scroll them into view.

---

### Protocol Stats / Social Proof

A centered section with four large animated counters:

| Counter | Value | Meaning |
|---------|-------|---------|
| **Smart Contracts** | 12 | The number of distinct smart contracts deployed on-chain. |
| **Tests Passing** | 356 | Total passing test cases. "100% coverage" means every line of code is tested. |
| **Risk Dimensions** | 5 | The IRS (Issuer Reputation Score) uses 5 behavioral dimensions to compute risk. |
| **On-Chain Transactions** | 25 | The number of live transactions executed on HashKey Chain Testnet. |

Below these counters is a gold star badge: "Built for the HashKey Chain Hackathon 2026" -- this identifies CoverFi as a hackathon project.

---

### How CoverFi Works (6 Steps)

A section titled "How CoverFi Works" with the subtitle "Six steps from registration to payout. Fully on-chain, fully transparent." Above the cards is an illustration of a certification process.

Six cards arranged in a grid, each with a step number, an icon, a title, and a description:

**Step 1: Issuer Registers**
- Icon: Blue clipboard/document
- What happens: An RWA token issuer posts a 5% Bond bond and gets attested by 3 independent verifiers (custodian, legal rep, auditor).
- Who does this: The TOKEN ISSUER (a company), not the investor.

**Step 2: IRS Score Calculated**
- Icon: Purple zigzag line (activity chart)
- What happens: A 5-dimensional risk score is computed across NAV deviation, attestation quality, repayment history, collateral ratio, and activity level. Score ranges from 0 to 1000.

**Step 3: Coverage Purchased**
- Icon: Green shield with checkmark
- What happens: Token holders buy protection. The premium rate is set algorithmically using the formula: P = 1600 x e^(-0.001386 x IRS). Higher IRS score = lower premium.

**Step 4: LPs Provide Liquidity**
- Icon: Orange padlock
- What happens: Liquidity providers deposit USDT into the insurance pool. Senior tranche (70%) earns lower yield but is protected. Junior tranche (30%) earns higher yield but absorbs losses first.

**Step 5: Default Detected**
- Icon: Red warning triangle
- What happens: 2 out of 3 trusted attestors confirm that the issuer has defaulted. The oracle triggers the payout engine automatically.

**Step 6: Payout Executed**
- Icon: Gold sun/rays (starburst)
- What happens: USDT is sent to verified ERC-3643 token holders who have active coverage. A SubrogationNFT is minted for the Foundation to pursue legal recovery.

---

### Why CoverFi? (4 Feature Cards)

Four large gradient cards, each linking to a different section of the dashboard.

**Card 1: Coverage (Orange gradient)**
- Click: Goes to Dashboard -> Get Covered form
- Description: "Protect your RWA positions with on-chain credit default coverage for tokenized receivables."
- Mockup inside: A white mini card showing "PROTECTION", a progress bar, "TradeFlow Finance", "$15,000 USDT", and a green "Active" status dot.
- For: INVESTORS who hold RWA tokens and want protection.

**Card 2: Earn (Blue gradient)**
- Click: Goes to Dashboard -> Insurance Pool
- Description: "Provide liquidity across senior and junior tranches to earn risk-adjusted yield."
- Mockup inside: Shows "POOL YIELD", a blue/purple split bar for Senior 70% / Junior 30%, "4.2% APY", and a small yield trend line.
- For: UNDERWRITERS who want to earn yield by providing insurance capital.

**Card 3: Verified (Purple gradient)**
- Click: Goes to Dashboard -> IRS Oracle
- Description: "2-of-3 attestor network computes on-chain Issuer Risk Scores for every token."
- Mockup inside: Shows "IRS SCORE", "600 / 1000", and three dimension bars (NAV, ATT, REP) with purple fills.
- For: Anyone who wants to understand issuer creditworthiness.

**Card 4: Instant Payouts (Green gradient)**
- Click: Goes to Dashboard -> Events feed
- Description: "Automatic claims disbursed to verified coverage holders upon oracle confirmation."
- Mockup inside: Shows "CLAIM #247", "$15,000", "USDT Disbursed", a green "Confirmed" badge, and "SubrogationNFT #1".
- For: Covered investors who want to know how claims work.

---

### Security First

A centered section with four security feature cards, each with an icon:

- **ERC-3643 Compliant** (green shield) -- Identity-verified token transfers with on-chain compliance checks.
- **Soulbound NFTs** (blue padlock) -- Non-transferable certificates prove verification status and coverage eligibility.
- **On-Chain Oracle** (purple clock) -- Real-time risk scoring and default detection powered by decentralized oracle networks.
- **2-of-3 Attestation** (gold checkmark) -- Multi-sig verification ensures no single point of failure in default confirmation.

---

### Footer

Four columns at the bottom:

- **CoverFi brand** -- Logo + "Decentralized credit protection for RWA token issuers on HashKey Chain."
- **Protocol links** -- Dashboard, Issuers, Insurance Pool, Get Covered, Register Token, For Attestors
- **Developer links** -- Smart Contracts (links to HashKey Explorer), Documentation, GitHub, HashKey Explorer
- **Resources** -- Whitepaper, Security Audits, Bug Bounty, Brand Kit

Social icons: X (Twitter), GitHub, Discord

Copyright: "2026 CoverFi -- HashKey Chain Hackathon"

---

## Chapter 2: Dashboard -- The Command Center

> **How to get here:** Click "Dashboard" in the nav bar, or "Launch App" on the landing page
> **URL:** `dashboard.html`

The dashboard is the heart of CoverFi. It shows everything happening in the protocol in real time and is where you perform all core actions. The background is a warm yellow (#FFF8E1).

### Navigation Bar (App Pages)

The app pages (Dashboard, Issuers, Pool, Coverage) use a slightly different nav bar from the landing page. It is a frosted glass bar with:

**Left:** CoverFi logo (clicking takes you back to `index.html` landing page)

**Center:** Four navigation links -- Dashboard, Issuers, Pool, Coverage. The current page is highlighted in gold.

**Right (from left to right):**
- **HashKey Chain Testnet badge** -- A small pill with a pulsing gold dot and the text "HashKey Chain Testnet". This confirms you are on the test network.
- **Role badges** -- Colored pills that appear after your wallet connects, showing your roles: LP (blue), ISSUER (orange), ATTESTOR (purple). Hidden until wallet is connected.
- **Notification bell** -- A bell icon. When you have unread notifications, a number badge appears. Click to open a dropdown showing recent events (wallet connected, data refreshed, transactions completed, IRS score changes). Click "Clear all" to dismiss all notifications.
- **Theme toggle** -- Sun/moon button, same as landing page.
- **Connect Wallet button** -- Gold gradient button with a padlock icon. Before connecting it reads "Connect Wallet". After connecting it shows your shortened address (e.g., "0x742d...4E8c") and turns green. Click when connected to open a dropdown with: Copy Address, View on HashKey Explorer (opens block explorer), and Disconnect.

---

### Live Data Banner

A colored banner just below the nav bar:
- **Before connecting:** "Live HashKey Chain Testnet -- Connect wallet to transact" with a "Connect Wallet" button.
- **After connecting:** "Connected to HashKey Chain Testnet" with a green dot. Data is loading from the blockchain.

---

### Network Warning

If your MetaMask is set to the wrong network, a yellow/red warning bar appears at the very top: "You are connected to the wrong network" with a "Switch Network" button. Click it to automatically switch to HashKey Chain Testnet.

---

### Early Warning System (EWS) Alert

If an issuer's IRS score drops sharply, a red alert bar appears with a warning icon, describing the event and the affected issuer. Click the X to dismiss.

---

### Metrics Bar (5 Cards)

A row of 5 metric cards spanning the full width:

| Card | Icon Background | Label | Example Value | Meaning |
|------|----------------|-------|---------------|---------|
| **TVL** (hero gradient card) | Gold-to-coral gradient | Total Value Locked | $124,500 | Total capital in the insurance pool |
| **Issuers** | Blue circle | Active Issuers | 3 | Number of registered token issuers |
| **Coverage** | Orange circle | Coverage Written | $89,200 | Total face value of active policies |
| **Utilization** | Purple circle | Pool Utilization | 71% | Percentage of pool capital committed to coverage |
| **APY** | Green circle | Pool APY | 6.8% | Blended annual yield for pool participants |

The TVL card stands out with its multicolor gradient background (gold to orange to coral). The other four are white cards with colored icon backgrounds.

---

### Registered Issuers Table

A card titled "Registered Issuers" with a green "LIVE" badge and green pulsing dot.

The table has 5 columns:

| Column | What It Shows |
|--------|---------------|
| **ISSUER** | Company name + sector type + colored circle avatar with initials. Examples: AR (orange) = AsiaReit (Real Estate), TF (blue) = TradeFlow (Trade Finance), UB (purple) = UrbanBridge (Infrastructure) |
| **IRS** | Issuer Reputation Score (0-1000). Displayed with a color-coded progress bar. Green = high/safe (>700), gold = medium (400-700), red = risky (<400) |
| **BOND** | The collateral the issuer deposited, shown in USDT (e.g., "5% Bond") |
| **STATUS** | Current state with a colored dot: green "Active", yellow "Monitoring", red "Defaulted" |
| **ATTESTORS** | How many of the 3 required verifiers have confirmed, shown as a fraction (e.g., "3/3") with a green checkmark when complete |

**What the statuses mean:**
- **Active** (green dot) -- The issuer is in good standing. You can buy coverage on their tokens.
- **Monitoring** (yellow dot) -- Warning signs detected. The IRS score dropped significantly. Premium prices will be higher.
- **Defaulted** (red dot) -- The issuer failed to meet obligations. Payouts are being processed. No new coverage available.

**Loading states:** Before data loads, you see animated gray skeleton placeholders (shimmering bars). If data fails to load, an error state appears with a "Try Again" button.

---

### Protocol Events Feed

Next to the issuers table, a card titled "Protocol Events" with a gold clock icon and a "LIVE" badge.

This is a real-time feed of everything happening in the protocol. Each event has a colored dot, a description, and a timestamp:

| Dot Color | Event Type | Example |
|-----------|-----------|---------|
| Green | Payout Executed | "$15,000 USDT to coverage holders via 2-of-3 attestation" with a clickable transaction link |
| Red | Default Detected | "on UrbanBridge REIT -- IRS dropped below 400 threshold" |
| Green | Issuer Registered | "AsiaReit registered as issuer. Bond: 5% Bond locked." |
| Blue | LP Deposit | "12,500 USDT added to Senior tranche." |
| Gold | IRS Updated | "TradeFlow score recalculated to 580." |
| Orange | Coverage Purchased | "15,000 USDT on AsiaReit @ 696 bps." |
| Purple | NFT Minted | "ProtectionCert #3 minted as soulbound NFT (ERC-721)." |

Transaction links (e.g., "0x5381...4c65") are clickable and open HashKey Explorer in a new tab.

---

### IRS Oracle Card

A card titled "IRS Oracle" with a purple clock icon and an "On-Chain" badge.

This displays the Issuer Reputation Score for the currently selected issuer.

**Gauge chart:** A semicircular arc with a gradient from red (left) to purple (right), representing scores from 0 to 1000. A black dot indicates the current position. The score number appears below (e.g., "600" with "of 1,000" beneath).

**Five dimension bars:** Below the gauge, five horizontal progress bars show the breakdown:

| Dimension | Color | Score | What It Measures |
|-----------|-------|-------|-----------------|
| NAV Deviation | Blue gradient | 150/200 | How close the token's market price is to its Net Asset Value |
| Attestation | Green gradient | 120/200 | Quality and completeness of attestor verifications |
| Repayment | Gold gradient | 110/200 | Track record of meeting financial obligations |
| Collateral | Purple gradient | 120/200 | Ratio of real collateral backing the token |
| Activity | Orange gradient | 100/200 | On-chain activity level (trading, transfers) |

**"Show Advanced Analytics" button:** Click to expand a collapsible section containing:
- A radar chart (pentagon/spider chart) showing all 5 dimensions visually
- The premium formula: P = 1600 x e^(-0.001386 x IRS) displayed in a styled code block
- A premium curve visualization -- an SVG line chart showing how the premium rate decreases as the IRS score increases. Hover over the curve to see tooltips with exact values.

**Premium Payment section:** Below the analytics, a section showing:
- Current Rate (in bps)
- Annual Cost
- Next Due date
- Status (Current/Overdue)
- Payment History list
- "Pay Premium" button

---

### Insurance Pool Card

Next to the IRS Oracle, a card titled "Insurance Pool" with a blue padlock icon and an "Earning" badge.

**Pool statistics (2x2 grid):**
- Total TVL -- Total capital in the pool
- Available -- Capital not yet committed to coverage
- Senior APY -- Annual yield for the senior tranche (lower risk)
- Junior APY -- Annual yield for the junior tranche (higher risk)

**Ratio bar:** A horizontal split bar showing the proportion between Senior (blue) and Junior (purple) tranches with percentage labels.

**Loss Waterfall Diagram:** A critical visual showing the 3-layer loss absorption mechanism:

1. **Issuer Bond** (red bar, labeled "First Loss") -- "5% Bond". When a default occurs, the issuer's deposited bond is consumed first.
2. **Junior / jrCVR** (purple bar, labeled "Second Loss") -- "30%". After the bond is exhausted, junior tranche funds absorb remaining losses.
3. **Senior / srCVR** (blue bar, labeled "Last Resort") -- "70%". Only after both bond and junior are depleted does the senior tranche take losses.

Down arrows connect the layers. Below the waterfall: a green shield icon with "Investor Protected" text.

**Your Position** (visible after wallet connect): Shows your srCVR Balance, jrCVR Balance, Estimated Value, and Unrealized Yield.

**Two action buttons:**
- **"Deposit Senior"** -- Opens a deposit flow for the safer tranche
- **"Deposit Junior"** -- Opens a deposit flow for the higher-yield tranche

---

### Get Covered (Purchase Form)

A card titled "Get Covered" with an orange shield icon.

This is the form to purchase credit protection. Three form fields:

1. **Select Issuer** (dropdown) -- Choose which issuer to buy coverage on. Options show the issuer name and current IRS score: "AsiaReit (IRS: 720)", "TradeFlow (IRS: 580)", "UrbanBridge (IRS: 650)". A warning appears if the selected issuer has defaulted.

2. **Coverage Amount (USDT)** (number input) -- Enter how much protection you want, from 100 to 1,000,000 USDT. Default is 15,000.

3. **Duration** (dropdown) -- Choose 30, 90, 180, or 365 days. Default is 180 days.

**Estimated Premium display:** A highlighted box showing:
- "Estimated Premium" label
- Dollar amount (e.g., "$587.40")
- Rate in basis points (e.g., "696 bps annualized")
The premium updates in real-time as you change any of the three fields.

**Purchase button:** Before wallet connection, shows "Connect Wallet First" (disabled). After connecting, shows "Purchase Coverage" in gold. Clicking triggers a MetaMask transaction.

---

### Protection Certificate

Next to Get Covered, a card titled "Protection Certificate" with a gold checkmark icon.

This displays your most recent soulbound NFT certificate. Before purchasing, it shows an empty state: "No coverage purchased. Your soulbound protection certificate will appear here after purchasing coverage."

After purchasing, a styled certificate card appears with:

- **Header:** "ProtectionCert #3" with Token ID
- **Soulbound badge:** Purple pill with padlock icon reading "Soulbound - Non-Transferable (ERC-5192)"
- **Details rows:**
  - Holder: your wallet address (shortened)
  - Issuer: company name
  - Coverage: amount in USDT (highlighted)
  - Premium Paid: amount in USDT
  - Rate: in basis points
  - Start: date
  - Expiry: date
  - Status: "Active" in green

---

### Your Transactions

A full-width card at the bottom titled "Your Transactions" with a "View all on HashKey Explorer" link that opens the block explorer.

This shows a chronological list of your on-chain transactions (deposits, purchases, withdrawals). Each entry shows the transaction type, amount, and a link to the transaction on HashKey Explorer.

---

### Last Updated Bar

At the very bottom, a small text bar showing: a clock icon, the last refresh timestamp (e.g., "Last updated: Mar 26, 2026 3:45 PM"), and a "Refresh" button.

---

### Offline Banner

If your internet connection drops, a banner appears at the bottom: "You are offline. Some features may not work."

---

### Toast Notifications

Pop-up messages that appear in the bottom-right corner for 3-5 seconds:
- Green = success ("Wallet connected successfully", "Coverage purchased!")
- Red = error ("Transaction failed", "Please install MetaMask")
- Gold = warning ("Issuer IRS dropped below threshold")

---

### Confirmation Modal

When you click any transactional button (purchase, deposit, withdraw), a modal dialog appears over a blurred background asking you to confirm the action. It shows the transaction details and has "Confirm" and "Cancel" buttons.

---

## Chapter 3: Browse Issuers -- Compare Before You Buy

> **How to get here:** Click "Issuers" in the nav bar
> **URL:** `issuers.html`

This page has a distinctive light cyan/teal background (#E0F7FA) and uses teal as its accent color instead of gold.

### Page Header

Large text: "Browse Issuers" with the word "Issuers" in teal. Subtitle: information about browsing registered RWA token issuers.

### Metrics Bar (4 Cards)

| Card | Icon | Label | Meaning |
|------|------|-------|---------|
| Total TVL | Teal coin | Pool Total | Total capital backing coverage |
| Active Issuers | Blue person | Count | Number of actively registered issuers |
| Coverage Written | Orange shield | Total | Total active coverage value |
| Average IRS | Purple chart | Score | Average credit score across all issuers |

### Filters Bar

A row of filter controls:

- **Sort By** (dropdown): IRS Score (High to Low), IRS Score (Low to High), Name A-Z, Name Z-A, Coverage (High to Low)
- **Status** (dropdown): All Statuses, Active, Observing, Monitoring, Defaulted
- **Sector** (dropdown): All Sectors, Real Estate, Trade Finance, Infrastructure
- **Search** (text input with magnifying glass icon): Search by issuer name

Changing any filter immediately updates the card grid below.

### Issuer Cards Grid

Large cards in a responsive grid (auto-fill, minimum 360px wide). Each card contains:

**Card header:**
- Colored circle avatar with initials (e.g., orange "AR" for AsiaReit)
- Issuer name in bold
- Meta info: sector type + shortened contract address in a code pill

**Card body:**
- **IRS Score section:** Label "IRS SCORE", large score number in teal (e.g., "720"), a horizontal progress bar showing the score as a percentage of 1000, and a percentage label
- **Info grid (2x2):**
  - Bond Amount (e.g., "5% Bond")
  - Status (with colored dot: green Active, blue Observing, red Defaulted)
  - Attestors (e.g., "3/3" with checkmark)
  - Coverage (total coverage written against this issuer)
- **Coverage utilization:** A bar showing what percentage of available coverage has been purchased
- **Premium row:** Shows the calculated premium rate (e.g., "696 bps") based on the IRS score

**Card footer (two buttons):**
- **"Get Coverage"** (teal gradient) -- Navigates to the dashboard purchase form pre-filled with this issuer
- **"View Details"** (outlined) -- Opens a detail modal

### Issuer Detail Modal

When you click "View Details", a slide-up modal appears with:

- **Header:** Issuer name + avatar + close (X) button
- **IRS Breakdown:** All 5 dimension scores with progress bars (NAV Deviation, Attestation, Repayment, Collateral, Activity) and their individual values
- **Detail sections:**
  - Token Information (name, symbol, supply, contract address)
  - Bond Information (amount, deposit block, liquidation status)
  - Attestor Addresses (custodian, legal rep, auditor)
  - Coverage Statistics
- **"View on HashKey Explorer"** button -- Opens the token contract on the block explorer

---

## Chapter 4: Pool Management -- Earn Yield

> **How to get here:** Click "Pool" in the nav bar
> **URL:** `pool.html`

This page has a light lavender/purple background and uses purple (#7C4DFF) as its accent color.

### Page Header

"Pool Management" with subtitle describing the dual-tranche insurance pool.

### Metrics Bar (4 Cards)

| Card | Icon | Label |
|------|------|-------|
| Total Pool TVL | Purple plus | Total capital in pool |
| Senior TVL | Blue shield | Capital in senior tranche |
| Junior TVL | Purple lightning | Capital in junior tranche |
| Coverage Ratio | Green checkmark | (Total Insured / Pool TVL) x 100 |

### Pool Composition Card

Shows the overall pool health:

- **Pool stats (4 items):** Total Insured, Pool Health (Active/Warning), Redemption Gate (Active/Inactive), Coverage Ratio (BPS)
- **Health indicator:** A colored dot next to a "Healthy" label (green = healthy, yellow = warning, red = critical)
- **Ratio bar:** A split horizontal bar showing Senior vs Junior percentages with labels

### Your Pool Position

**Before wallet connection:** Shows a padlock icon with "Connect Wallet" message.

**After wallet connection:** Displays two tranche cards:

**Senior Tranche (srCVR):**
- Badge: "LOW RISK"
- Balance: your srCVR token count
- Value (USDT): dollar value of your position
- APY: current yield (e.g., "4.2%")
- Exchange Rate: current rate (e.g., "1.00 USDT/srCVR")

**Junior Tranche (jrCVR):**
- Badge: "HIGH YIELD"
- Balance: your jrCVR token count
- Value (USDT): dollar value
- APY: current yield (e.g., "9.8%")
- Epoch Yield: yield earned this epoch

**Total Position summary:** Total position value + total yield earned

**Action buttons:** "Deposit More" (scrolls to deposit section) and "Request Withdrawal" (scrolls to withdrawal section)

### Deposit into Pool

Two side-by-side deposit cards:

**Senior Tranche:**
- Title in purple: "Senior Tranche"
- APY badge: "APY ~4.2%"
- Risk badge (green): "Low Risk -- First loss absorbed by Junior + Bond"
- Amount input (USDT) with hint: "Min deposit: 10 USDT. You will receive srCVR tokens."
- "Deposit Senior" button (gold)

**Junior Tranche:**
- Title in purple: "Junior Tranche"
- APY badge: "APY ~9.8%"
- Risk badge (orange): "Higher Risk -- First loss after bond reserve"
- Amount input (USDT) with hint: "Min deposit: 10 USDT. You will receive jrCVR tokens."
- "Deposit Junior" button (purple outline)

Both deposit buttons are disabled until wallet is connected.

### Request Withdrawal

- **Gate warning:** A yellow warning box appears when the redemption gate is active: "Redemption gate is currently active. Withdrawals may be delayed or restricted." The redemption gate activates when an issuer enters MONITORING status.
- **Select Tranche** dropdown: Senior Tranche (srCVR) or Junior Tranche (jrCVR)
- **Amount to Withdraw** input with available balance shown below
- **Redemption Preview:** Shows token amount, exchange rate, and calculated USDT redemption value
- **"Request Withdrawal"** button (outline style)

### Loss Waterfall (Detailed)

A full-width card explaining the 3-layer loss absorption mechanism with detailed descriptions:

**Layer 1 -- Bond Reserve** (dark purple bar): "Issuer Bond -- Absorbed First"
- Description: Each issuer posts a bond that acts as first-loss capital. If losses are small, only the bond is affected.

**Layer 2 -- Junior / jrCVR** (medium purple bar): "Higher Yield -- Higher Risk"
- Description: Absorbs losses after the bond is exhausted. Junior LPs earn higher yields (9-12% APY) in exchange for taking on more risk.

**Layer 3 -- Senior / srCVR** (light purple bar): "Lower Yield -- Protected"
- Description: Only affected after both bond and junior tranche are fully depleted. Senior LPs earn stable yields (3-5% APY) with maximum protection.

At the bottom: A shield icon with "Senior Tranche is Triple-Protected" text.

### Pool Events

A real-time feed of pool-specific activity:

| Dot Color | Event Type | Example |
|-----------|-----------|---------|
| Blue | Senior Deposit | "5,000 USDT deposited into Senior Tranche" |
| Purple | Junior Deposit | "2,000 USDT deposited into Junior Tranche" |
| Gold | Premium Distributed | "125 USDT premium allocated to pool" |
| Green | Withdrawal Executed | "1,000 srCVR redeemed for 1,050 USDT" |

Each event includes a timestamp and transaction hash.

---

## Chapter 5: My Coverage -- Your Protection Portfolio

> **How to get here:** Click "Coverage" in the nav bar
> **URL:** `coverage.html`

This page has a warm cream/green theme with green (#00C853) as its accent color.

### Page Header

"My Coverage" with green accent. Subtitle: "Monitor your active protection positions and payout history." A "Dashboard" link button in the top-right takes you back.

### Metrics Bar (4 Cards)

| Card | Icon | Label | Meaning |
|------|------|-------|---------|
| Active Positions | Orange shield | Count of active policies | How many protection certificates you currently hold |
| Total Coverage | Gold dollar sign | Sum in USDT | Total face value of all your active coverage |
| Premiums Paid | Purple document | Sum in USDT | Total premiums you have spent |
| Payouts Received | Green chart line | Sum in USDT | Total payout money you have received from defaults |

### My Active Coverage

A card with a green "LIVE" badge. Shows your ProtectionCert NFTs as cards in a grid.

**Empty state** (no wallet or no coverage): Shield icon with "No Active Coverage" title and "Connect your wallet to view ProtectionCert NFTs, or purchase coverage from the dashboard." A "Get Coverage" button links to the dashboard purchase form.

**With coverage:** Each certificate card displays the issuer name, coverage amount, premium paid, start/expiry dates, and status.

### Payout Status

This card only appears when a default has occurred on an issuer you have coverage on. It shows a green "RECEIVED" badge and details about the payout amount, the default event, and transaction links.

### Coverage History

A table showing all your past and current coverage positions:

| Column | Content |
|--------|---------|
| Cert ID | ProtectionCert token number |
| Issuer | Company name |
| Coverage | Face value in USDT |
| Period | Start date to end date |
| Status | Active (green), Expired (gray), Paid Out (gold) |
| Payout / TX | Payout amount or transaction link |

Empty state: "No coverage history yet. Expired and paid-out positions will appear here."

### Buy More Coverage CTA

A call-to-action section at the bottom:
- Title: "Get Coverage"
- Description about the tri-layer waterfall system
- Two buttons: "Get Coverage" (green, links to dashboard) and "Browse Issuers" (outline, links to issuers page)

---

## Chapter 6: Other Pages

### Protocol Statistics (`stats.html`)

> **No wallet required.** Badge says "Public View -- No Wallet Required."

Background: Warm peach/salmon (#FBE9E7) with coral/red accent.

**Page header:** "Protocol Statistics" with subtitle about real-time health metrics.

**Hero metrics (6 cards in 3-column grid):**
- Total Value Locked (coral gradient hero card)
- Total Coverage Written
- Total Premiums Collected
- Total Payouts Executed
- Protocol Coverage Ratio
- Active Issuers

**Pool Composition:** A donut chart showing Senior (blue), Junior (purple), and Bond (gold) capital proportions with a legend. Below it, a utilization bar showing how much of the pool is committed.

**IRS Score Distribution:** A horizontal bar chart showing each issuer's IRS score side by side, with an average score displayed below.

**Premium Rate Curve:** A full-width card showing the exponential decay curve of premiums vs. IRS scores. The formula P = 1600 x e^(-0.001386 x IRS) is displayed in the header.

**Protocol Events:** A scrollable list of recent on-chain events.

**Contract Addresses:** A table listing all 12 smart contract names and their deployed addresses on HashKey Chain Testnet.

**Last Updated bar:** Timestamp + Refresh button.

---

### Register Your Token (`register.html`)

> **For: Issuers (companies with RWA tokens)**
> **Wallet required.**

A 5-step wizard with a step indicator at the top (numbered circles 1-5 connected by lines). The active step's circle turns gold; completed steps turn green with checkmarks.

**Step 1: Token Information**
- Card title: "Register Your RWA Token" (Step 1 of 5)
- Input: Token Contract Address (0x... format)
- "Validate Token" button -- checks the contract on-chain
- Validation results appear: Token Name, Symbol, Total Supply, ERC-3643 compliance (each with a green checkmark or red X)
- "Next Step" button appears after successful validation

**Step 2: Required Bond**
- Card title: "Required Bond" (Step 2 of 5)
- Calculation grid showing: Token Supply, NAV/Token, Market Cap, Required Bond (5% of market cap), Your USDT Balance
- Expandable "What is the issuer bond?" explanation
- "Approve & Deposit Bond" button -- two-step transaction (approve USDT spending, then deposit)

**Step 3: Select Attestors**
- Card title: "Select Your Attestors" (Step 3 of 5)
- Three address inputs for: Custodian (Required), Legal Representative (Required), Auditor (Required)
- Each input validates the address on-chain and shows attestor metadata
- Track Display shows Fast Track vs Standard Track eligibility

**Step 4: BAS Attestation**
- Card title: "Legal Entity Verification" (Step 4 of 5)
- Input: BAS Attestation UID (from Attestation Service)
- Expandable guide: "How to get a BAS Attestation UID?" with 7 numbered steps

**Step 5: Registration Summary**
- Card title: "Registration Summary" (Step 5 of 5)
- Summary grid: Token, Contract, Bond Deposited, Custodian, Legal Rep, Auditor, BAS UID, Track, Starting IRS
- "Register Now" button
- On success: A green "Registration Complete!" screen appears with "OBSERVATION" status, track info, and a "Go to Dashboard" link

---

### Attestor Dashboard (`attestor.html`)

> **For: Attestors (custodians, legal reps, auditors)**
> **Wallet required.**

Background: Light lavender/purple.

**Before registration:** Shows a "Register as Attestor" card with:
- Type selector (radio buttons): Custodian, Legal Rep, or Auditor (each with an icon and description)
- Bond Deposit input (minimum 5% Bond)
- "Register as Attestor" button
- Note about Fast Track eligibility after 30 days

**After registration:** Full dashboard with:

**Metrics row (4 cards):** Type, Bond Staked, Attestations count, Status (Active badge)

**Attestor Profile card:** Wallet, Registered date, Successful attestations, Disputed, Slash Count, Fast Track eligibility

**Submit Default Attestation card:** Form with Issuer Token Address, BAS Attestation UID, and Evidence Hash (keccak256). "Submit Default Attestation" button.

**Default Event Voting card:** Shows active default events for voting. Empty state: "No Active Default Events -- All issuers are in good standing." When events exist, each shows the issuer, vote progress (C/L/A dots with connectors), and vote buttons.

**Lookup Default Confirmation card:** Enter an issuer token address to check the current vote status. Shows custodian/legal/auditor vote dots and confirmation status.

---

### Issuer Management (`issuer-dashboard.html`)

> **For: Registered issuers only**
> **Wallet required.**

Background: Light blue/indigo with blue (#2979FF) accent.

**Access gate:** Before verification, shows a padlock icon with "Issuer Access Required" and a "Connect Wallet" button. Only registered issuers see the full dashboard.

**After verification:**

**Row 1: Issuer Status + IRS Score**
- **Issuer Status card:** Token Name, Symbol, Contract Address, Registration Block, Track type, Days Since Registration, Observation End Block. Status timeline showing: Observe -> Active -> Monitor -> Wind Down -> Closed (with highlighted current step).
- **IRS Score card:** Gauge chart (semicircular arc), composite score, premium rate badge, and 5 dimension bars (NAV, Attestation, Repayment, Collateral, Activity).

**Row 2: Bond Status + Attestors**
- **Bond Status card:** Large bond amount, market cap at deposit, bond-to-market-cap ratio, deposit block, liquidated (Yes/No), released (Yes/No).
- **Attestors card:** Lists all 3 attestors (Custodian, Legal Rep, Auditor) with their addresses and colored status dots. Shows attestation count.

**Row 3: Premium Payment + Wind-Down**
- **Premium Payment card:** Current premium rate, total insured amount, estimated monthly payment, payment history, "Pay Premium" button.
- **Wind-Down card:** For issuers wanting to gracefully exit. Shows wind-down requirements and "Initiate Wind-Down" button.

**Row 4: Events card:** Issuer-specific event history.

---

### Subrogation Claims (`subrogation.html`)

> **For: CoverFi Foundation (post-default recovery)**
> **Wallet required.**

Background: Light warm tone with coral accents.

**Page header:** "Subrogation Claims" with subtitle about managing SubrogationNFTs for legal recovery. Shows contract address pills for SubrogationNFT and PayoutEngine.

**Metrics (3 cards):** NFTs Minted, Recovery Pending (USDT), Active / Completed counts.

**SubrogationNFT Claims card:** Lists all minted SubrogationNFTs as cards. Empty state: "No SubrogationNFTs Found -- No default events have occurred yet." A "Refresh" button reloads from chain.

**Recovery Process card:** Four numbered steps explaining the lifecycle:
1. **SubrogationNFT Minted** -- When a default is processed, the NFT records issuer token, default type, liquidation amounts, and payout block.
2. **Evidence Container** -- The NFT captures bond, junior, and senior amounts liquidated plus holder count.
3. **Foundation Initiates Recovery** -- The Foundation uses the NFT as cryptographic proof for legal proceedings.
4. **Timeline & Resolution** -- Recovery timelines vary by jurisdiction. Recovered funds return to protocol treasury.

---

## Three Types of Users

### User Type 1: INVESTOR (Token Holder)

**What you want:** Protect your RWA token investment from issuer default.

**Your journey:**
1. Landing Page -- Read about CoverFi, click "Launch App"
2. Dashboard -- See live metrics, browse registered issuers in the table
3. Issuers page -- Compare IRS scores, filter by sector, check coverage utilization
4. Dashboard -> Get Covered -- Select issuer, enter coverage amount, choose duration
5. Review premium estimate, click "Purchase Coverage", confirm in MetaMask
6. View your Protection Certificate (soulbound NFT) on the Dashboard
7. Coverage page -- Monitor active positions, check expiry dates
8. If default occurs -- Receive automatic USDT payout to your wallet

**Pages you use most:** Dashboard, Issuers, Coverage

---

### User Type 2: UNDERWRITER (Liquidity Provider)

**What you want:** Earn yield by providing insurance capital to the pool.

**Your journey:**
1. Landing Page -- Click "Provide Liquidity"
2. Pool page -- Review pool composition, APY rates, and the loss waterfall
3. Choose your risk level: Senior (safer, ~4% APY) or Junior (higher risk, ~10% APY)
4. Enter deposit amount, click "Deposit Senior" or "Deposit Junior", confirm in MetaMask
5. Receive srCVR or jrCVR receipt tokens representing your pool share
6. Monitor your position on the Pool page -- watch yield accumulate
7. To exit: Use "Request Withdrawal" -- enter amount, review redemption value, confirm

**Pages you use most:** Dashboard, Pool

---

### User Type 3: ISSUER (Token Company)

**What you want:** Register your RWA token to offer protection to your holders.

**Your journey:**
1. Register page -- Enter token contract address, validate on-chain
2. Review bond requirement (5% of market cap), approve and deposit USDT
3. Select 3 attestors (custodian, legal rep, auditor) by entering their addresses
4. Submit BAS Attestation UID for legal entity verification
5. Review summary, click "Register Now", confirm in MetaMask
6. Enter observation period (14-60 days depending on track)
7. Wait for attestors to submit their verifications
8. Upon activation, manage via Issuer Dashboard -- pay premiums, monitor IRS score
9. To exit: Initiate wind-down from the Issuer Dashboard

**Pages you use:** Register, Issuer Dashboard, Dashboard

---

## Icon Reference

| Icon | Description | Where You See It | What It Means |
|------|------------|-----------------|---------------|
| Gold hexagon (layered) | Three nested hexagons in gold gradient | Logo, top-left of every page | CoverFi brand identity |
| Crescent moon | Circle with shadow | Nav bar, right side (light mode) | Click to switch to dark mode |
| Sun with rays | Circle with radiating lines | Nav bar, right side (dark mode) | Click to switch to light mode |
| Bell | Bell outline | Dashboard nav bar | Notifications -- click to see alerts |
| Pulsing green dot | Small circle with glow animation | HashKey Chain Testnet badge, status indicators | Connected / active / healthy |
| Pulsing gold dot | Small circle with gold glow | HashKey Chain Testnet badge on some pages | Network connected indicator |
| Green dot (static) | Solid green circle | Status badges | Active status |
| Gold/yellow dot | Solid gold circle | Status badges | Monitoring/warning status |
| Red dot | Solid red circle | Status badges, events | Defaulted / error / alert |
| Blue dot | Solid blue circle | Events feed | Deposit or pool action |
| Purple dot | Solid purple circle | Events feed | IRS update or attestation action |
| Orange dot | Solid orange circle | Events feed | Coverage purchased |
| Coin/dollar circle | Circle with horizontal lines | TVL metric card | Total Value Locked (money) |
| Person silhouette | Head and shoulders outline | Active Issuers card | User or issuer count |
| Shield with checkmark | Shield outline with check inside | Coverage metric, protection | Protection / coverage / security |
| Zigzag line | Wavy horizontal line | Pool APY card, IRS oracle | Yield performance / scoring |
| Clock face | Circle with clock hands | IRS Oracle header, timestamps | Time-based data / oracle |
| Padlock | Closed padlock | Pool icon, soulbound badge | Locked funds / non-transferable |
| Lightning bolt | Jagged bolt shape | Junior TVL icon | High energy / high risk |
| Checkmark in circle | Circle with check | Bond verified, attestors | Confirmed / verified |
| Warning triangle | Triangle with exclamation | Default events, EWS alerts | Danger / default / warning |
| Document/clipboard | Rectangle with lines | Registration, legal docs | Forms / documents / records |
| People group | Multiple person silhouettes | Attestors card | Team / verifiers / group |
| Plus in circle | Circle with + | Deposit actions, pool | Add / deposit |
| Minus bar | Horizontal line | Withdrawal actions | Remove / withdraw |
| Search magnifier | Circle with handle | Filter bar, lookup | Search functionality |
| External link arrow | Arrow pointing up-right | HashKey Explorer links | Opens in new tab |
| Copy squares | Overlapping rectangles | Wallet dropdown | Copy to clipboard |
| Logout arrow | Arrow pointing right through door | Wallet dropdown | Disconnect wallet |
| LIVE badge | Green pill with pulsing dot | Card headers | Real-time live data |
| ON-CHAIN badge | Purple pill | IRS Oracle header | Data sourced from blockchain |
| EARNING badge | Green pill | Insurance Pool header | Pool is actively earning yield |
| SOULBOUND badge | Purple pill with padlock | Protection Certificate | NFT is permanently bound to wallet |
| LOW RISK badge | Green pill | Senior tranche | Lower risk, lower yield |
| HIGH YIELD badge | Purple pill | Junior tranche | Higher risk, higher reward |
| 3-Layer Protection badge | Orange pill | Loss Waterfall header | Three layers protect investors |

---

## Glossary

| Term | Plain English | Technical Definition |
|------|--------------|---------------------|
| **TVL** | Total money sitting in the insurance pool | Total Value Locked -- sum of all deposits in the InsurancePool smart contract |
| **IRS** | A credit score for token companies, from 0 to 1000. Higher is safer. | Issuer Reputation Score -- 5-dimensional behavioral score computed by the IRSOracle contract |
| **bps** | A way to measure tiny percentages. 100 bps = 1% | Basis points -- 1/100th of a percent |
| **Senior Tranche** | The safer investment option in the pool. Gets hit last if there are losses. Earns ~4% APY. | The 70% layer of the dual-tranche pool that absorbs losses only after issuer bond and junior tranche are exhausted |
| **Junior Tranche** | The riskier but higher-paying pool option. Gets hit before senior if there are losses. Earns ~10% APY. | The 30% layer that absorbs losses after the issuer bond, earning higher yield as compensation for the risk |
| **srCVR** | Your receipt token for depositing into the senior pool | Senior Coverage Receipt -- ERC-20 token using Compound's cToken exchange rate model |
| **jrCVR** | Your receipt token for depositing into the junior pool | Junior Coverage Receipt -- ERC-20 token with epoch-based yield distribution |
| **Soulbound** | An NFT permanently attached to your wallet. You cannot sell, trade, or transfer it. | ERC-5192 token where locked() always returns true and transferFrom() is blocked |
| **Waterfall** | The order in which losses are absorbed: bond first, then junior, then senior | The 3-layer loss absorption mechanism: IssuerBond -> jrCVR -> srCVR |
| **Default** | When a company fails to meet its financial obligations | Status 3 in IssuerRegistry -- triggered by 2-of-3 TIR attestation via DefaultOracle |
| **Attestor** | A professional who independently verifies information about token issuers | A custodian, legal rep, or auditor registered in the TIR with a minimum 5% Bond bond |
| **2-of-3** | Two out of three verifiers must agree for a decision to count | The confirmation threshold in TIR -- requires votes from 2 of the 3 attestor types |
| **Premium** | The price you pay for insurance coverage, expressed as an annual rate | Annual rate in basis points, calculated by the formula 1600 x e^(-0.001386 x IRS) |
| **ProtectionCert** | Your proof of insurance. A soulbound NFT that says you are covered. | ERC-721 NFT minted to the buyer's wallet with coverage amount, issuer, dates, and premium |
| **SubrogationNFT** | A digital receipt proving CoverFi paid out a claim, used by the Foundation for legal recovery | ERC-721 NFT minted to the Foundation containing the complete default evidence package |
| **Gas fee** | A small network fee paid to process your blockchain transaction | The HSK cost of executing a smart contract function on HashKey Chain |
| **ERC-3643** | A standard for regulated security tokens that includes identity checks | The token standard ensuring only verified (KYC'd) holders can hold or receive tokens |
| **Redemption Gate** | A temporary freeze on pool withdrawals during a crisis | Pool mechanism that blocks all withdrawals when an issuer enters MONITORING status |
| **Coverage Ratio** | How much of the pool is committed to covering policies | (Total Insured Amount / Pool TVL) x 100 -- higher means more risk for underwriters |
| **Observation Period** | A waiting period after an issuer registers before they become fully active | 14-60 day period (depending on track) during which the issuer must receive attestor verifications |
| **Fast Track** | An expedited registration path for issuers with well-established attestors | 14-day observation period vs 60 days for standard track |
| **BAS** | Attestation Service -- a blockchain-based identity verification system | On-chain attestation registry used to verify legal entity status of issuers |
| **NAV** | Net Asset Value -- the fair market value of the assets behind a token | Used as one of the 5 IRS dimensions to measure how closely the token price tracks its underlying value |
| **Epoch** | A time period used for calculating and distributing yield | The interval at which premium income is allocated to pool participants |
| **Wind-Down** | The process of an issuer gracefully exiting the protocol | Issuer initiates closure, coverage expires, bond is returned minus protocol fees |
| **Slash** | A penalty applied to an attestor who acts maliciously or negligently | A portion of the attestor's bond is confiscated by the protocol |

---

## Competitor Comparison

| Feature | CoverFi | Nexus Mutual | Risk Harbor | Neptune Mutual |
|---------|---------|-------------|-------------|----------------|
| **What it insures** | RWA issuer DEFAULT (company goes bankrupt) | Smart contract bugs | Stablecoin depegs | Smart contract + depeg |
| **Can it cover a company going bankrupt?** | Yes -- core purpose | No | No | No |
| **Credit scoring for issuers** | IRS: 5-dimension behavioral score (0-1000) | None | None | None |
| **Premium pricing** | Algorithmic (based on IRS score) | Community vote | Fixed tiers | Flat rate |
| **KYC-compliant payouts** | ERC-3643 identity checks | No KYC | No KYC | No KYC |
| **Soulbound coverage proof** | ERC-5192 non-transferable NFT | Transferable token | No NFT | No NFT |
| **Legal recovery after payout** | SubrogationNFT for Foundation | No recovery mechanism | No recovery mechanism | No recovery mechanism |
| **Dual-tranche risk separation** | Senior (safe) + Junior (risky) | Single pool | Single pool | Single pool |
| **Mandatory issuer bond** | 5% first-loss capital deposit | No bond required | No bond required | No bond required |
| **Default confirmation** | 2-of-3 bonded attestor votes | Community governance vote | Automated oracle | Community governance vote |

---

## Frequently Asked Questions

**Q: Do I need a wallet to browse the app?**
A: No. You can view all data on the Dashboard, Issuers, Stats, and Pool pages without connecting a wallet. You only need a wallet to perform transactions (buy coverage, deposit, withdraw).

**Q: What happens if MetaMask is not installed?**
A: When you click "Connect Wallet", a toast notification appears: "Please install MetaMask to use CoverFi." You can still browse all read-only data.

**Q: How is my premium calculated?**
A: The formula is P = 1600 x e^(-0.001386 x IRS) in basis points per year. An issuer with IRS 720 gets a premium of about 696 bps (6.96% per year). An issuer with IRS 900 gets about 432 bps (4.32% per year). The higher the IRS score, the cheaper the premium.

**Q: What is a soulbound NFT?**
A: It is an NFT that cannot be transferred. Once minted to your wallet, it stays there permanently. This prevents people from selling or trading coverage certificates, which could create fraud risks.

**Q: Can I lose money as a liquidity provider?**
A: Yes, if a default occurs and the losses are large enough. However, the waterfall protects you: the issuer's bond is consumed first, then the junior tranche, and only then the senior tranche. Senior LPs are the most protected.

**Q: What network do I need to be on?**
A: HashKey Chain Testnet (Chain ID 133). If you are on the wrong network, a warning banner appears with a one-click "Switch Network" button.

**Q: What does the theme toggle do?**
A: It switches between light mode (warm cream backgrounds) and dark mode (dark gray/black backgrounds). Your preference is saved in localStorage and persists across pages and browser sessions.

**Q: Where can I see my transactions on the blockchain?**
A: Click the "View all on HashKey Explorer" link in the Your Transactions card, or click any transaction hash in the events feed. These open the HashKey Chain Testnet block explorer in a new tab.

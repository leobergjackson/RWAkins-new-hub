# CoverFi Application — Manual Testing Guide
## How to verify every core feature works

---

### Prerequisites
- Browser (Chrome recommended)
- MetaMask extension installed
- HashKey Chain Testnet added to MetaMask (Chain ID: 133, RPC: `https://testnet.hsk.xyz`)
- Some HSK in wallet for gas fees (get from [HashKey Testnet Faucet](https://hashkeychain.net/faucet))
- Start the server:
  ```
  cd D:\COVERFI && npx http-server frontend -p 8082 -c-1
  ```
- Deployer wallet address used in demo: `0xce220d9eD9527f9997c8045844210637F3A42fb3`
- All contract addresses are in `D:\COVERFI\deployments\hashkeyTestnet.json`

---

## PART 1: Landing Page (index.html)

### Test 1.1: Page Loads
**Steps:** Open http://localhost:8082/index.html
**Expected:** Page loads with a clean light background (#fafbfd), hero text reads "Cover Your Positions." with "Positions." highlighted in gold (#F0B90B). Plus Jakarta Sans heading font loads correctly.
**Check:** [ ] Pass / [ ] Fail

### Test 1.2: Hero Entrance Animation
**Steps:** Refresh the page (Ctrl+R)
**Expected:** Badge slides down from above (translateY -20px), title slides up (translateY 30px), subtitle fades in, hero action buttons appear, illustration fades in, trust strip fades in — all staggered over ~1 second with cubic-bezier easing.
**Check:** [ ] Pass / [ ] Fail

### Test 1.3: Theme Toggle (Light to Dark)
**Steps:** Click the moon icon button in the top-right navigation bar
**Expected:** Entire page switches to dark theme — dark backgrounds, light text, gold accents remain. Moon icon changes to sun icon. Theme is saved to localStorage.
**Steps:** Click again (now a sun icon)
**Expected:** Returns to light theme. Sun icon changes back to moon icon.
**Check:** [ ] Pass / [ ] Fail

### Test 1.4: Stats Count-Up Animation
**Steps:** Scroll down to the stats bar (section with 4 stat cards below the hero)
**Expected:** Numbers animate from 0 upward to their target values:
- **$124,500** (TVL)
- **3** (Active Issuers)
- **$89,200** (Coverage Written)
- **$15,000** (Payouts)
**Expected:** Animation triggers when the section enters the viewport (IntersectionObserver).
**Check:** [ ] Pass / [ ] Fail

### Test 1.5: Protocol Stats Count-Up
**Steps:** Continue scrolling to the "Protocol at a Glance" section (gold-tinted background area)
**Expected:** Numbers count up from 0 to their targets:
- **12** (Smart Contracts) — "Fully auditable on-chain"
- **356** (Tests Passing) — "100% coverage"
- **5** (Risk Dimensions) — "Behavioral credit scoring"
- **25** (On-Chain Transactions) — "Live on HashKey Chain Testnet"
**Expected:** "Built for the HashKey Chain Hackathon 2026" badge visible below.
**Check:** [ ] Pass / [ ] Fail

### Test 1.6: Scroll Reveal Animations
**Steps:** Scroll down slowly through the entire page
**Expected:** Each section fades in as you scroll — elements use the `.reveal` class and transition from opacity 0 + translateY(30px) to fully visible. Cards with `.stagger` class animate one by one with 0.1-0.4s delays between siblings.
**Check:** [ ] Pass / [ ] Fail

### Test 1.7: How It Works Cards
**Steps:** Scroll to the "How CoverFi Works" section (id="how-it-works")
**Expected:** 6 cards showing the 6-step process in order:
1. **Register** — Issuer onboarding
2. **IRS Score** — Algorithmic credit scoring
3. **Coverage** — Purchase protection
4. **Liquidity** — Community-funded pool
5. **Default** — Credit event detection
6. **Payout** — Automated settlement
**Expected:** Cards stagger in with reveal animations.
**Check:** [ ] Pass / [ ] Fail

### Test 1.8: Feature Panes ("Why CoverFi?")
**Steps:** Scroll to the "Why CoverFi?" section
**Expected:** 4 colorful gradient cards visible:
- **Coverage** (orange gradient, `#E8760A` to `#FF9533`)
- **Earn** (blue gradient, `#1E7BFF` to `#5DA3FF`)
- **Verified** (purple gradient, `#8B5CF6` to `#A78BFA`)
- **Payouts** (green gradient, `#10B981` to `#34D399`)
Each card contains a white mockup card inside showing a mini UI preview.
**Steps:** Hover over a card
**Expected:** Card lifts slightly with a 3D tilt/scale effect, subtle shadow increase.
**Steps:** Click on the "Coverage" card
**Expected:** Navigates to `dashboard.html#purchase`
**Steps:** Go back, click on the "Earn" card
**Expected:** Navigates to `dashboard.html#pool`
**Steps:** Go back, click on the "Verified" card
**Expected:** Navigates to `dashboard.html#irs`
**Steps:** Go back, click on the "Payouts" card
**Expected:** Navigates to `dashboard.html#events`
**Check:** [ ] Pass / [ ] Fail

### Test 1.9: Security Section
**Steps:** Scroll to the security section
**Expected:** 4 security items displayed in a grid:
- **ERC-3643** — Compliance-first token standard
- **Soulbound NFTs** — Non-transferable coverage certificates
- **On-Chain Oracle** — Chainlink + BAS attestation
- **2-of-3 Attestation** — Multi-party default confirmation
Each item has an icon and description text.
**Check:** [ ] Pass / [ ] Fail

### Test 1.10: Footer Links
**Steps:** Scroll to the footer
**Steps:** Click "Dashboard" under the Protocol column
**Expected:** Navigates to `dashboard.html`
**Steps:** Click "Smart Contracts" under the Developers column
**Expected:** Opens HashKey Explorer in a new tab at: `https://testnet.testnet-explorer.hsk.xyz/address/0xce220d9eD9527f9997c8045844210637F3A42fb3` showing the deployer address with all transactions.
**Steps:** Check other footer links:
- "Issuers" links to `dashboard.html#issuers`
- "Insurance Pool" links to `dashboard.html#pool`
- "Get Covered" links to `dashboard.html#purchase`
**Check:** [ ] Pass / [ ] Fail

### Test 1.11: Navigation Buttons
**Steps:** Click "Dashboard" text link in the top navigation bar
**Expected:** Navigates to `dashboard.html`
**Steps:** Go back. Click the gold "Launch App" button in the hero section
**Expected:** Also navigates to `dashboard.html`
**Steps:** Go back. Click the "Provide Liquidity" secondary button in the hero section
**Expected:** Navigates to `dashboard.html#pool`
**Check:** [ ] Pass / [ ] Fail

### Test 1.12: Mobile Responsiveness
**Steps:** Resize browser to ~375px width (or press F12, toggle device toolbar, select iPhone)
**Expected:** Navigation collapses — nav links hidden, hamburger menu icon (3-line toggle) appears. Cards stack vertically. Text resizes proportionally. All content remains readable. No horizontal overflow.
**Steps:** Click the hamburger icon (nav toggle button)
**Expected:** Mobile menu slides open showing navigation links (Dashboard, How it Works, etc.)
**Steps:** Click a link in the mobile menu
**Expected:** Menu closes and page navigates/scrolls to the target section.
**Check:** [ ] Pass / [ ] Fail

### Test 1.13: Reduced Motion Support
**Steps:** Enable "Reduce motion" in OS accessibility settings (or add `@media (prefers-reduced-motion: reduce)` override in DevTools)
**Expected:** All animations are disabled — reveal elements appear immediately without transitions, hero entrance is instant, count-up animations complete instantly, no pulse effects on dots or buttons.
**Check:** [ ] Pass / [ ] Fail

### Test 1.14: Button Shimmer Effect
**Steps:** Hover over the gold "Launch App" CTA button
**Expected:** A diagonal light shimmer sweeps across the button surface (left to right, ~0.6s). Button also has a pulsing gold glow animation when idle (`btn-glow`).
**Check:** [ ] Pass / [ ] Fail

---

## PART 2: Dashboard (dashboard.html) — Without Wallet Connected

### Test 2.1: Dashboard Loads with Mock Data
**Steps:** Open http://localhost:8082/dashboard.html
**Expected:** Claymorphism design loads — warm cream background (`#F0EBE3`), floating abstract SVG blob shapes animate slowly in the background.
**Expected Data (mock values):**
- TVL: **$124,500** (gradient hero card)
- Active Issuers: **3**
- Coverage Written: **$45,000**
- Utilization: **36%**
- APY: **4.2%**
**Expected:** Gold banner below nav reads: "Connect wallet to see live HashKey Chain Testnet data" with a "Connect" button inside the banner.
**Expected:** "HASHKEY TESTNET" badge visible in nav bar with a pulsing gold dot.
**Check:** [ ] Pass / [ ] Fail

### Test 2.2: Theme Toggle (Dashboard)
**Steps:** Click the theme toggle button (moon/sun icon) in the dashboard nav bar
**Expected:** Dashboard switches between light and dark themes. Dark theme uses dark backgrounds, light text, and gold accents. The claymorphism shadows adapt.
**Steps:** Refresh the page (F5)
**Expected:** Theme persists after refresh (stored in localStorage).
**Check:** [ ] Pass / [ ] Fail

### Test 2.3: IRS Gauge Animation
**Steps:** Look at the IRS Oracle card (on the right side of the dashboard)
**Expected:** Semi-circle gauge rendered with a gradient arc (red on left, yellow in middle, green on right). Mock IRS score displays as **600**. Below the score: "of 1,000" subtitle. A label shows risk level (e.g., "Moderate Risk" for score 600).
**Check:** [ ] Pass / [ ] Fail

### Test 2.4: Radar Chart
**Steps:** Look at the radar chart below/within the IRS Oracle card
**Expected:** Pentagon-shaped radar chart with 5 labeled axes:
- NAV (max 250)
- Attestation (max 250)
- Repayment (max 300)
- Collateral (max 150)
- Activity (max 50)
A gold-filled polygon shows the current data distribution. Mock values: NAV=150, Attestation=120, Repayment=110, Collateral=120, Activity=100.
**Check:** [ ] Pass / [ ] Fail

### Test 2.5: IRS Advanced Analytics Toggle
**Steps:** Click "Show Advanced Analytics" button in the IRS Oracle card
**Expected:** Card expands with a smooth animation to reveal:
- Detailed radar chart dimensions
- Premium formula display: `Premium = 1600 * e^(-0.001386 * IRS)`
- Premium curve chart (SVG) showing the exponential decay curve
**Steps:** Hover over the premium curve chart
**Expected:** A tooltip follows the cursor showing "IRS: X -> Premium: Y bps (Z%)" values.
**Steps:** Click "Hide Advanced Analytics"
**Expected:** Section collapses back to compact view with smooth animation.
**Check:** [ ] Pass / [ ] Fail

### Test 2.6: Premium Calculator
**Steps:** In the "Get Covered" card (id="purchase"), look at the issuer dropdown
**Expected:** Three issuers listed: AsiaReit (IRS: 720), TradeFlow (IRS: 580), UrbanBridge (IRS: 650)
**Steps:** Select "AsiaReit (IRS: 720)" from the dropdown
**Steps:** Enter **10000** in the Coverage Amount input field
**Steps:** Select **365 days** for duration
**Expected:** "Estimated Premium" section updates in real-time showing a calculated dollar amount and bps rate. For IRS 720, premium should be around ~580 bps.
**Steps:** Change the coverage amount to **5000**
**Expected:** Premium halves proportionally (amount is linear, rate stays the same).
**Steps:** Select "TradeFlow (IRS: 580)" from dropdown
**Expected:** Premium rate increases (lower IRS = higher premium). The bps rate should be higher than AsiaReit's.
**Check:** [ ] Pass / [ ] Fail

### Test 2.7: Issuers Table (Mock Data)
**Steps:** Look at the "Registered Issuers" card (id="issuers")
**Expected:** Table shows 3 issuers:
| Issuer | Type | Status | IRS | Bond | Attestors |
|--------|------|--------|-----|------|-----------|
| AsiaReit | Real Estate | ACTIVE | 720 | 5% Bond | 3/3 |
| TradeFlow | Trade Finance | MONITORING | 580 | 5% Bond | 2/3 |
| UrbanBridge | Infrastructure | ACTIVE | 650 | 5% Bond | 3/3 |
**Expected:** Each issuer has a colored circle avatar with initials (AR=orange, TF=blue, UB=purple). Status badges use color coding (ACTIVE=green, MONITORING=yellow).
**Check:** [ ] Pass / [ ] Fail

### Test 2.8: Events Feed (Mock Data)
**Steps:** Look at the "Protocol Events" card (id="events")
**Expected:** Multiple events listed with colored indicator dots, event descriptions, and relative timestamps ("2 min ago", "8 min ago", etc.). Events include entries like:
- "AsiaReit registered as issuer. Bond: 5% Bond locked."
- "LP Deposit — 12,500 USDT added to Senior tranche."
- "IRS Updated — TradeFlow score recalculated to 580."
- "Coverage Purchased — 15,000 USDT on AsiaReit @ 696 bps."
**Check:** [ ] Pass / [ ] Fail

### Test 2.9: Loss Waterfall Diagram
**Steps:** Scroll to the Insurance Pool card (id="pool")
**Expected:** A 3-layer waterfall visualization showing the loss absorption order:
1. **Issuer Bond** (coral/red color, `#FF6B6B`) — First loss, 5% bond
2. **Junior / jrCVR** (purple color, `#6C5CE7`) — Second loss, 30% of pool
3. **Senior / srCVR** (blue color, `#3B8BFF`) — Last loss, 70% of pool
Arrows connect the layers. An "Investor Protected" badge appears at the bottom.
**Expected Pool Stats (mock):**
- Pool TVL: **$124,500**
- Available: **$79,500**
- Senior APY: **4.2%**
- Junior APY: **9.8%**
- Senior/Junior split bar: 70% / 30%
**Check:** [ ] Pass / [ ] Fail

### Test 2.10: Premium Curve Tooltip
**Steps:** In the IRS card, click "Show Advanced Analytics" to expand
**Steps:** Hover your mouse over the premium curve SVG chart
**Expected:** A floating tooltip appears near the cursor showing the IRS value and corresponding premium in bps and percentage. The dot on the curve highlights the current issuer's position.
**Steps:** Move mouse along the curve
**Expected:** Tooltip updates dynamically as you move.
**Steps:** On mobile (touch), tap the curve
**Expected:** Tooltip appears for ~2.5 seconds then fades out.
**Check:** [ ] Pass / [ ] Fail

### Test 2.11: Notification Bell
**Steps:** Click the bell icon in the dashboard nav bar
**Expected:** Dropdown panel slides down showing notification list. If no notifications exist yet, shows an empty state or "No notifications" message.
**Steps:** After connecting a wallet (see Part 3), return and click bell
**Expected:** Shows "Wallet connected" notification with a success indicator.
**Steps:** Click "Clear all" button in the notification header
**Expected:** All notifications are cleared from the list.
**Check:** [ ] Pass / [ ] Fail

### Test 2.12: Metric Cards Claymorphism Style
**Steps:** Inspect the metric cards visually
**Expected:** Cards have the claymorphism shadow effect — a combination of outer shadows (8px 8px 16px dark + -4px -4px 12px white) and inner highlight (inset 0 1px white), giving a soft 3D clay-like appearance.
**Steps:** Hover over a metric card
**Expected:** Shadow intensifies slightly (clay-hover), card lifts subtly.
**Check:** [ ] Pass / [ ] Fail

### Test 2.13: Background Blob Animations
**Steps:** Watch the dashboard background for 10-20 seconds
**Expected:** 5 abstract SVG blob shapes float slowly in the background, animating position and scale on 18-25 second cycles. They are very subtle (opacity 0.08) and do not interfere with readability.
**Check:** [ ] Pass / [ ] Fail

### Test 2.14: Coverage Certificate Card
**Steps:** Look for the "Protection Certificate" card next to the "Get Covered" card
**Expected:** Shows a mock soulbound NFT certificate with fields:
- Issuer: AsiaReit
- Coverage amount and duration
- "ERC-5192 Soulbound" badge indicating non-transferability
- Estimated recovery ratio
**Check:** [ ] Pass / [ ] Fail

---

## PART 3: Dashboard — With MetaMask Connected

### Test 3.1: Connect Wallet
**Steps:** Click the "Connect Wallet" gold button in the dashboard nav bar
**Expected:** MetaMask popup appears requesting connection approval.
**Steps:** Approve the connection in MetaMask
**Expected:**
- Button changes to show a green connected state with truncated wallet address (e.g., "0xce22...2fb3")
- Banner text changes to: a green pulsing dot + "LIVE" badge + "Connected to HashKey Chain Testnet — showing real on-chain data"
- Notification bell shows a "Wallet connected" notification
- Dashboard enters a loading/skeleton state briefly (~1.2s minimum) then populates with live data
**Check:** [ ] Pass / [ ] Fail

### Test 3.2: Live Data Loads from HashKey Chain Testnet
**Steps:** After connecting, observe the dashboard data refresh
**Expected:** All metric cards, issuer table, pool stats, and IRS scores update with real on-chain values read from deployed contracts. Values may differ from mock data depending on current contract state.
**Expected (if demo transactions were run):**
- AsiaReit may show status "DEFAULTED" with IRS = 0
- Pool TVL reflects actual deposited amounts
- Senior TVL: ~$7.0 USDT, Junior TVL: ~$3.0 USDT
**Expected:** A "Last updated" timestamp appears showing when data was last fetched.
**Check:** [ ] Pass / [ ] Fail

### Test 3.3: Wrong Network Detection
**Steps:** In MetaMask, switch to Ethereum Mainnet (or any network other than HashKey Chain Testnet, Chain ID 133)
**Expected:** A red/warning banner appears at the top of the dashboard: "Wrong network detected. Please switch to HashKey Chain Testnet to use CoverFi." with a "Switch Network" button.
**Steps:** Click the "Switch Network" button
**Expected:** MetaMask prompts to switch to HashKey Chain Testnet. After switching, the warning banner disappears and live data reloads.
**Steps:** (Alternative) Manually switch back to HashKey Chain Testnet in MetaMask
**Expected:** Warning disappears automatically, dashboard refreshes.
**Check:** [ ] Pass / [ ] Fail

### Test 3.4: Purchase Coverage (ON-CHAIN TRANSACTION)
**Steps:** Ensure wallet is connected and on HashKey Chain Testnet
**Steps:** In the "Get Covered" card, select an issuer from the dropdown (e.g., AsiaReit)
**Steps:** Enter a coverage amount (e.g., **100**)
**Steps:** Select a duration from the duration dropdown
**Steps:** Click the "Purchase Coverage" button
**Expected:** A confirmation modal slides in showing:
- Selected issuer name
- Coverage amount
- Calculated premium (in USDT and bps)
- Duration
- Note about soulbound NFT certificate
**Steps:** Click "Confirm" in the modal
**Expected:**
1. First MetaMask popup: USDT approval transaction (approve spending)
2. Second MetaMask popup: actual purchase transaction
3. After confirmation (~3s on HashKey Chain Testnet): toast notification appears: "Coverage purchased! TX: 0xabcd..."
4. Transaction appears in "Your Transactions" section with a clickable HashKey Explorer link
5. HSK balance decreases slightly (gas fees)
**Check:** [ ] Pass / [ ] Fail

### Test 3.5: Deposit to Senior Tranche (ON-CHAIN TRANSACTION)
**Steps:** Ensure wallet is connected
**Steps:** In the Insurance Pool card, click the "Deposit Senior" button
**Expected:** A deposit modal appears showing:
- Amount input field
- Tranche info: Senior — 70% of pool, 4-8% APY, Lower Risk
- srCVR token info (you receive srCVR tokens representing your share)
**Steps:** Enter an amount (e.g., **100**) and click the confirm/deposit button
**Expected:**
1. MetaMask popup for USDT approval
2. MetaMask popup for deposit transaction
3. Toast notification: "Senior deposit successful! TX: 0x..."
4. Transaction logged: "Deposit Senior Tranche — 100 USDT - Senior (srCVR)"
5. Pool TVL updates to reflect new deposit
**Check:** [ ] Pass / [ ] Fail

### Test 3.6: Deposit to Junior Tranche (ON-CHAIN TRANSACTION)
**Steps:** Click the "Deposit Junior" button in the Insurance Pool card
**Expected:** Similar deposit modal but showing:
- Tranche info: Junior — 30% of pool, 12-20% APY, Higher Risk (First Loss)
- jrCVR token info
**Steps:** Enter an amount and confirm
**Expected:**
1. MetaMask approval + deposit popups
2. Toast: "Junior deposit successful! TX: 0x..."
3. Transaction logged: "Deposit Junior Tranche — [amount] USDT - Junior (jrCVR)"
**Check:** [ ] Pass / [ ] Fail

### Test 3.7: Wallet Dropdown Menu
**Steps:** Click on the connected wallet address button in the nav bar
**Expected:** A dropdown menu appears showing:
- Full wallet address with a green dot indicator
- "Copy Address" option with clipboard icon
- "View on HashKey Explorer" option with external link icon
- Divider line
- "Disconnect" option in red/danger color
**Steps:** Click "Copy Address"
**Expected:** Wallet address is copied to clipboard. A brief "Copied!" feedback text appears next to the option.
**Steps:** Click "View on HashKey Explorer"
**Expected:** Opens a new browser tab at `https://testnet.testnet-explorer.hsk.xyz/address/[your-address]` showing your wallet's transactions and balances.
**Check:** [ ] Pass / [ ] Fail

### Test 3.8: Disconnect Wallet
**Steps:** Open wallet dropdown, click "Disconnect"
**Expected:**
- Dashboard reverts to mock data view
- Button changes back to gold "Connect Wallet" state
- Banner reverts to "Connect wallet to see live HashKey Chain Testnet data"
- Live data indicators disappear
**Check:** [ ] Pass / [ ] Fail

### Test 3.9: Transaction History Persistence
**Steps:** After making one or more on-chain transactions, refresh the page (F5)
**Expected:** Your transaction history is still displayed in the "Your Transactions" card. Data is saved in localStorage under key `coverfi-tx-history`.
**Steps:** Connect wallet again after refresh
**Expected:** Previous transactions remain listed with clickable HashKey Explorer links (format: `https://testnet.testnet-explorer.hsk.xyz/tx/[hash]`). Each entry shows: transaction type icon, action name, details, truncated TX hash, and status.
**Check:** [ ] Pass / [ ] Fail

### Test 3.10: Toast Notifications
**Steps:** Perform any on-chain action (purchase, deposit)
**Expected:** A toast notification slides in from the right side, positioned below the nav bar. Toast types:
- **Success** (green border): "Coverage purchased!", "Senior deposit successful!"
- **Error** (red border): "Wrong network", failed transactions
- **Warning** (gold border): network or data warnings
**Expected:** Toast auto-dismisses after a few seconds with a slide-out animation.
**Check:** [ ] Pass / [ ] Fail

### Test 3.11: Skeleton Loading States
**Steps:** Connect wallet and observe the brief loading period
**Expected:** Before live data populates, card content shows skeleton loading placeholders (animated shimmer bars). Minimum display time is ~1.2 seconds to prevent flashing. After data loads, skeletons are replaced by actual values with smooth transitions.
**Check:** [ ] Pass / [ ] Fail

### Test 3.12: Confirmation Modal Cancel
**Steps:** Click "Purchase Coverage" with valid inputs
**Expected:** Confirmation modal appears
**Steps:** Click "Cancel" or click outside the modal overlay
**Expected:** Modal closes without submitting any transaction. No MetaMask popup. Form values remain filled.
**Check:** [ ] Pass / [ ] Fail

---

## PART 4: Cross-Page Features

### Test 4.1: Theme Persistence Across Pages
**Steps:** Set dark theme on the landing page (index.html) via the theme toggle
**Steps:** Navigate to the dashboard (click "Dashboard" or "Launch App")
**Expected:** Dashboard loads in dark theme (theme stored in localStorage is shared).
**Steps:** Toggle to light theme on the dashboard
**Steps:** Navigate back to the landing page
**Expected:** Landing page is now in light theme.
**Check:** [ ] Pass / [ ] Fail

### Test 4.2: Feature Deep Links from Landing Page
**Steps:** On the landing page, click the "Coverage" feature card (orange)
**Expected:** Navigates to `dashboard.html#purchase` — the "Get Covered" section should be visible/scrolled into view.
**Steps:** Go back to landing page, click the "Earn" feature card (blue)
**Expected:** Navigates to `dashboard.html#pool` — the Insurance Pool section should be visible.
**Steps:** Go back to landing page, click the "Verified" feature card (purple)
**Expected:** Navigates to `dashboard.html#irs` — the IRS Oracle section should be visible.
**Steps:** Go back to landing page, click the "Payouts" feature card (green)
**Expected:** Navigates to `dashboard.html#events` — the Protocol Events section should be visible.
**Check:** [ ] Pass / [ ] Fail

### Test 4.3: Logo Navigation (Dashboard to Landing)
**Steps:** On the dashboard, click the CoverFi logo in the top-left nav
**Expected:** Navigates back to the landing page (index.html).
**Check:** [ ] Pass / [ ] Fail

### Test 4.4: Dashboard Responsive Layout
**Steps:** On the dashboard, resize browser to tablet width (~768px)
**Expected:** Grid layout adjusts — 5 metric cards may reflow to 3+2 or 2-column layout. Cards stack more vertically. All content remains usable.
**Steps:** Resize to mobile width (~375px)
**Expected:** All cards stack into a single column. Nav actions compress (smaller buttons, reduced padding). Toast notifications span full width. Metric values use smaller font sizes. Pool waterfall diagram adapts.
**Check:** [ ] Pass / [ ] Fail

### Test 4.5: Offline Detection
**Steps:** Open DevTools (F12), go to Network tab, toggle "Offline" mode
**Expected:** An offline banner appears indicating no network connection. Dashboard gracefully shows cached/mock data rather than crashing.
**Steps:** Disable offline mode
**Expected:** Banner disappears. Data can be refreshed.
**Check:** [ ] Pass / [ ] Fail

---

## PART 5: Smart Contract Verification on HashKey Explorer

### Test 5.1: Verify Deployer Transactions
**Steps:** Go to https://testnet.testnet-explorer.hsk.xyz/address/0xce220d9eD9527f9997c8045844210637F3A42fb3
**Expected:** Shows 25+ transactions from the deployer. Transaction methods include: contract creation, Register, Approve, Deposit (Senior + Junior), Purchase Coverage, Execute Payout, Force Confirm Default, and various setup calls.
**Check:** [ ] Pass / [ ] Fail

### Test 5.2: Verify Key Demo Transactions
**Steps:** Check the following transaction hashes on HashKey Explorer:
- **Registration TX:** `0x76654f6954651e6139ec6ffdb51edd5d67000a7e4be8ebc5ec1683a21bba8001`
- **Senior Deposit TX:** `0x983541ce383611f3d1bca92519bf2fb686cee4aa386dd839578adc252530b7f9`
- **Junior Deposit TX:** `0x9aaafc0b7c6927d0ae20578b20a2d57c9a045ddf495429e0cdd66619dcdc5c9b`
- **Coverage Purchase TX:** `0xca3ac579eeffd138e02849203f76f95ec958552cfd117aad65d1ac48a9a1727e`
- **Default TX:** `0xc366dc7e84be2a52ecf4f110c6773b04beba54c40ca9c3503a5ee89872d1fda1`
- **Payout TX:** `0x5381147c824b4006cd95af66434f57795578c050000b24674b06a16078d74c65`
**Expected:** Each transaction shows "Success" status, correct method names, gas used, and contract interactions.
**Check:** [ ] Pass / [ ] Fail

### Test 5.3: Verify Deployed Contracts
**Steps:** Visit HashKey Explorer pages for each contract address from `deployments/hashkeyTestnet.json`:
- MockUSDT: `0x38907cC4E615D3C7BDCBC9910C050260bBC836E5`
- IssuerRegistry: `0x8D4C37f45883aAEEd20d2CC1020e6Ab193D3A50C`
- IRSOracle: `0xa4ECEB47F80a32D7176C23e4993cDa4d2337Fc3A`
- InsurancePool: `0xBCF0012388045eA1183c96EEbe24754842a549eA`
- PayoutEngine: `0xD01e871c97746FC6a3f4B406aA60BE1Fb7FAcf6B`
- srCVR: `0xc07859b25FC869F0a81fae86b9B5bEa868D08A9f`
- jrCVR: `0xa5d64A7770136B1EEade6B980404140D8D5F7C06`
- ProtectionCert: `0x2Aad26de595752d7D6FCc2f4C79F1Bf15B60E1CD`
- SubrogationNFT: `0x91062e509E75AAe31f1d6425b78D8815Ad941e73`
**Expected:** Each contract page loads, shows bytecode, and has transaction history. Contracts with verified source show a green checkmark "Contract Source Code Verified."
**Check:** [ ] Pass / [ ] Fail

### Test 5.4: Verify Demo Results
**Steps:** Check on-chain state matches expected demo results:
- IRS score after registration: **600** (initial)
- Premium in bps: **696** (6.96% APR)
- Senior TVL after deposit: **$7.0 USDT**
- Junior TVL after deposit: **$3.0 USDT**
- Payout amount received: **$15.0 USDT**
- IRS after default: **0**
- Issuer status after default: **3** (DEFAULTED)
- Subrogation NFT minted: token ID **1**
**Check:** [ ] Pass / [ ] Fail

---

## PART 6: Local Development Tests

### Test 6.1: Run Unit Tests
**Steps:** Open a terminal and run:
```
cd D:\COVERFI && npx hardhat test
```
**Expected:** All tests pass with output showing "376 passing" (or current count) with zero failures. Tests cover all 12 smart contracts including: TIR, IssuerBond, IRSOracle, DefaultOracle, IssuerRegistry, InsurancePool, srCVR, jrCVR, ProtectionCert, PayoutEngine, SubrogationNFT, and integration tests.
**Check:** [ ] Pass / [ ] Fail

### Test 6.2: Run Full Demo Script
**Steps:** Run:
```
cd D:\COVERFI && npx hardhat run scripts/run-full-demo.ts
```
**Expected:** Full lifecycle executes end-to-end on a local Hardhat fork:
1. Issuer registration (BAS attestation + bond deposit)
2. IRS scoring (5-dimension calculation)
3. Pool deposits (senior + junior tranches)
4. Coverage purchase (premium calculation + soulbound NFT mint)
5. Default detection (2-of-3 attestor confirmation)
6. Payout execution (waterfall loss distribution + subrogation NFT)
All steps complete with green checkmarks and summary output.
**Check:** [ ] Pass / [ ] Fail

### Test 6.3: Compile Contracts
**Steps:** Run:
```
cd D:\COVERFI && npx hardhat compile
```
**Expected:** All contracts compile without errors or warnings. Output shows "Compiled N Solidity files successfully."
**Check:** [ ] Pass / [ ] Fail

---

## Summary Checklist

| Part | Tests | Description |
|------|-------|-------------|
| Part 1 | 1.1 - 1.14 | Landing page UI, animations, navigation, responsiveness |
| Part 2 | 2.1 - 2.14 | Dashboard without wallet — mock data, charts, interactions |
| Part 3 | 3.1 - 3.12 | Dashboard with wallet — live data, on-chain transactions |
| Part 4 | 4.1 - 4.5 | Cross-page features — theme sync, deep links, responsive |
| Part 5 | 5.1 - 5.4 | Smart contract verification on HashKey Explorer |
| Part 6 | 6.1 - 6.3 | Local development — tests, demo script, compilation |

**Total: 49 test cases**

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| MetaMask not connecting | Refresh page. Ensure HashKey Chain Testnet is selected (Chain ID 133). Check that MetaMask is unlocked. |
| Dashboard shows mock data after connecting | Check you are on HashKey Chain Testnet, not another network. Look for the "Wrong network" banner. |
| Transaction stuck/pending | HashKey Chain Testnet can be slow. Wait 15-30 seconds. Check HashKey Explorer for TX status. Try increasing gas in MetaMask. |
| Theme not persisting | Clear localStorage and try again. Check browser privacy settings are not blocking localStorage. |
| Page not loading at all | Verify the server is running: `npx http-server frontend -p 8082 -c-1`. Check browser console (F12) for errors. |
| Count-up animations not triggering | Scroll the stats section fully into view. Check that "Reduce motion" is not enabled in OS settings. |
| Fonts look wrong | Check internet connection — fonts load from Google Fonts CDN. |
| "Purchase Coverage" button not working | Button requires wallet connection. Connect wallet first. Check that the button does not have a `needs-wallet` disabled state. |

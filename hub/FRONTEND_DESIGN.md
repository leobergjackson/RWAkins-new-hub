# RWAkins / Ruphex — Complete Frontend Design Reference

> The exact design of **kubryx.vercel.app** (the `hub/` app), documented end to end:
> design system, global chrome, every one of the 56 routes, all 65 components,
> hooks, contexts, and the styling conventions used to build them.
>
> Source of truth: `hub/` Next.js App Router project. ~37,900 lines of TS/TSX,
> 56 page routes, 65 components, 10 hooks, 3 contexts, 15 API routes.

---

## 1. App topology

The repo contains two Next.js apps. **kubryx.vercel.app is the `hub` app.**

| App | Role | Landing |
|---|---|---|
| `hub/` | Marketing site **+** "Financial OS" dashboard (brand: **Ruphex**) | `app/page.tsx` |
| `invoices/` | Standalone invoice product (embedded into hub at `/invoice`) | `invoices/app/page.tsx` |

The hub renders in **two distinct visual modes**, decided by `AppShell` based on the URL:

1. **Public marketing mode** (light, no shell) — the landing page `/`.
2. **App / shell mode** (dark sidebar + topbar) — every tool and dashboard route.

There are also **two page families** inside the app:

- **Tool pages** — the real product surfaces (treasury, invoice, credit, lend, vault, agents, split, legacy, shadow, dashboard). Wallet-connected, light "tool" theme, composed from domain components.
- **"Executive intelligence" pages** — dense simulated control-boards (executive, operations, analytics, governance, etc.). Dark, fully inline-styled, driven by in-memory "engine" hooks. They share `ExecutiveWalkthrough` + `CommandPalette`.

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router, `'use client'` pages), React 18 |
| Language | TypeScript |
| Styling | **Inline styles** (primary) + Tailwind v4 import + one `globals.css` + per-page embedded `<style>` blocks |
| Animation | `framer-motion` (landing, modals, hover/tap) |
| Icons | `lucide-react` + literal unicode glyphs (`◇ ◈ ◎ ⬡ ⬟ ▲ 📄 🔐`) |
| Web3 | wagmi / RainbowKit (EVM) + custom Solana/Stellar hooks; custom `WalletContext` |
| Toasts | `sonner` (`<Toaster>` in root layout) + `lib/toast.ts` |
| Fonts | `Plus_Jakarta_Sans` (UI) + `JetBrains_Mono` (mono), via `next/font/google` |

**Styling philosophy:** almost everything is inline `style={{}}`. Only a handful of
reusable visual treatments live in `globals.css`. Tool pages that need keyframes or
pseudo-classes inject a local `<style>` block. Some legacy class names
(`.dashboard-layout`, `.gold-text`, `.btn-outline`) are referenced but **not defined** —
those pages rely entirely on inline styles.

---

## 3. Design system / tokens

### 3.1 Color palette

```
--navy    #0A0F2E   primary text / dark surfaces
--blue    #3B5BFA   primary brand
--violet  #8B5CF6   brand mid
--pink    #EC4899   brand accent
background #ffffff  / foreground #0A0F2E
```

**Signature gradient** (used on logo, buttons, gradient text, CTAs):
`linear-gradient(135deg, #3B5BFA 0%, #8B5CF6 45%, #EC4899 100%)`

**Per-tool accent colors** (from `lib/tools.ts` — also used by the sidebar):

| Tool | Color |
|---|---|
| AI RWA Treasury (`/treasury`) | `#10b981` green |
| Invoice (`/invoice`) | `#C8FF00` lime |
| Credit Passport (`/credit`) | `#06b6d4` cyan |
| AI Lending (`/lend`) | `#f59e0b` amber |
| Private Vault (`/vault`) | `#14b8a6` teal |
| Agent Co-ordinator (`/agents`) | `#6366f1` indigo |
| Bill Split (`/split`) | `#3b82f6` blue |
| Family Vault (`/legacy`) | `#f43f5e` rose |
| Stealth Execution (`/shadow`) | `#8b5cf6` violet |

**Shell chrome colors** (sidebar/topbar): bg `#080808`, border `rgba(255,255,255,0.08)`,
gold accent `#F5C518`, mono font `"Fira Code","JetBrains Mono",monospace`.

**Chain status dots:** QIE `#6366f1`, Solana `#9945FF`, Stellar `#3B9BF5`, Arbitrum `#12AAFF`.

### 3.2 Typography

- **UI font:** Plus Jakarta Sans (weights 400–800), CSS var `--font-jakarta`.
- **Mono font:** JetBrains Mono (500/600), CSS var `--font-mono`; numbers/addresses often `"Fira Code"`.
- **Display headings:** `clamp()` scaling, weight 800–900, tight `letter-spacing: -0.02em … -0.035em`.
- **Tool-page utility type classes** (in `globals.css`): `.page-eyebrow` (Dancing Script cursive),
  `.page-title` (Syne, clamp 32→48px), `.page-subtitle` (DM Sans, muted).

### 3.3 Shape & elevation language

- Buttons / pills / badges: `border-radius: 999`.
- Cards: `border-radius: 16–24`.
- Soft layered shadows, e.g. `0 40px 100px -20px rgba(59,91,250,0.25)`.
- Glass surfaces: `background: rgba(255,255,255,0.82)` + `backdrop-filter: blur(22px) saturate(140%)`.

### 3.4 `globals.css` class reference (the only global stylesheet, 261 lines)

| Class | Purpose |
|---|---|
| `.gradient-text` | clips signature gradient to text |
| `.btn-gradient` | violet→pink gradient button, scale+brighten on hover |
| `.btn-ghost` | white pill button, border darkens on hover |
| `.hero-bg` | layered radial-gradient pastel hero background |
| `.grain` / `.grain::before` | SVG fractal-noise grain overlay (opacity .35, overlay blend) |
| `.module-card` / `:hover` | lift `-6px` + shadow on hover |
| `.live-dot` (`@keyframes pulseDot`) | pulsing green status dot |
| `.float-anim` (`@keyframes float`) | gentle float/rotate |
| `.spin-slow` (`@keyframes spinSlow`) | 26s rotation |
| `.marquee` (`@keyframes marquee`) | infinite logo scroll |
| `.featured-glow::before` | gradient border ring (mask trick) |
| `.dash-tilt` | `perspective(1600px) rotateX(8deg)` 3D tilt |
| `.kbx-tool-page` | applies hero pastel gradient to any tool container |
| `.yield-hub-container`, `.shadow-container`, `.stripe-bg`, `.vault-page`, `.cipher-vault-page` | per-tool background overrides (force light theme) |
| `.page-eyebrow`, `.page-title`, `.page-subtitle` | unified tool typography |
| `.badge-live`, `.badge-demo`, `.badge-network` | status pills (green/amber/violet) |
| `.skeleton-pulse`, `.skeleton-card` (`@keyframes pulse-bg`) | loading skeletons |
| custom scrollbar (`::-webkit-scrollbar`), `.hide-scrollbar` | thin violet scrollbar |
| `@media (max-width:768px)` | mobile: 44px touch targets, full-width buttons |

### 3.5 Shared animation primitives (framer-motion, defined in `app/page.tsx`)

```ts
const fadeUp  = { hidden:{opacity:0,y:40}, visible:{opacity:1,y:0,transition:{duration:0.6,ease:'easeOut'}} }
const stagger = { hidden:{}, visible:{transition:{staggerChildren:0.1}} }
```
Buttons everywhere use `whileHover={{scale:1.03}} whileTap={{scale:0.98}}`.

---

## 4. Global layout & chrome

### 4.1 `app/layout.tsx` (RootLayout)
- Loads the two Google fonts, sets `<body>` font to Jakarta.
- Wraps everything in `<AppShell>` and mounts `<Toaster>` (sonner, bottom-right, white toasts).
- Metadata: title *"Ruphex — The Financial OS for Web3 & Beyond"*.

### 4.2 `app/components/AppShell.tsx` — the mode switch
- Wraps all routes in providers: `WalletProvider → KubrykPlatformProvider → ChainPreferenceProvider`, plus `<WalletPlatformSync/>`.
- Calls `useBackendWarmup()` to keep Render backends warm (anti cold-start).
- **`HUB_PREFIXES`** decides who gets the dark shell. Routes under
  `/dashboard, /credit, /legacy, /agents, /vault, /split, /lend, /treasury, /shadow,
  /performance, /architecture, /developers, /governance, /operations, /executive,
  /security, /coordination, /policies, /integrations, /ecosystem, /analytics, /story, /protocols`
  render inside **Sidebar + TopBar**. Everything else (`/`, `/invoice`, `/ext`) renders bare.
- Shell layout: fixed sidebar (280px expanded / 80px collapsed / off-canvas on mobile) + main column with sticky TopBar; mounts `<WrongNetworkBanner/>` above page content.

### 4.3 `components/KubrykSidebar.tsx` (dark `#080808`)
- Logo "Ruphex / FINANCIAL OS" (gold K tile).
- "Dashboard" link, then **Tools** nav generated from `lib/tools.ts` (`TOOLS` registry) — each row shows icon tile, name, tagline, active accent = tool color.
- **Networks** block (QIE / Solana / Stellar / Arbitrum, all "Live").
- `<WalletPill/>` (connect or address).
- **Platform** quick-stats card (credit Score, Tier, Vault status, Chains) from `KubrykPlatformContext`.
- Collapse toggle (desktop), mobile backdrop + slide-in.

### 4.4 `components/TopBar.tsx` (dark `#080808`, sticky, 60px)
- Breadcrumbs from pathname (with friendly `BREADCRUMB_NAMES` map).
- Right cluster: `<ChainSwitcher/>` (global chain preference) · `<NetworkBadge/>` · "All Live" status pill · notifications dropdown (mock feed) · `<ConnectButton type="auto" size="sm"/>`.

### 4.5 `app/components/Navbar.tsx` (light, landing only)
- Fixed floating **glass pill** centered (`min(960px, 100%-24px)`), shrinks/raises shadow on scroll.
- Logo, nav links (Platform/Tools/Chains/Company → hash anchors), "Explore Tools" ghost + "Launch App" gradient CTAs, mobile hamburger overlay.

---

## 5. Landing page — `app/page.tsx` (780 lines)

Single file, section components rendered in order by `Home`:

| Section | What it is |
|---|---|
| `<Navbar/>` | floating glass nav (§4.5) |
| `<Hero/>` | split hero: eyebrow + clamp(44→88px) headline "Get Paid in USDC. Instantly." + sub + 3 feature pills + Create Invoice / See How It Works CTAs + `<LiveStatsStrip/>` + Arbitrum/USDC badges + floating `<InvoiceCard/>` (animated, glow). `.hero-bg .grain`, bottom white fade. |
| `<TrustBar/>` | infinite `.marquee` of 8 infra logos with gradient swatches |
| `<HowItWorks/>` | 3 `.module-card` steps (Paste / Share link / Get paid) + CTA |
| `<StatsBar/>` | dot-separated facts strip on `#F5F7FF` gradient |
| `<Ecosystem/>` | responsive grid of 6 tool cards (Credit, Lend, Split, Treasury, Vault, Agents) + "View Full Dashboard" |
| `<DashboardPreview/>` | `.dash-tilt` 3D browser mock with sidebar, stat tiles, hand-drawn SVG `ActivityChart` |
| `<FinalCTA/>` | full-width signature-gradient panel, "Ready to get paid in USDC?" |
| `<Footer/>` | dark `#0A0F2E`, 4 link columns (Platform/Chains/Resources/Company), giant "Ruphex" wordmark, copyright |
| `<CookieBanner/>` | localStorage-gated cookie toast |
| `<ScrollTop/>` | scroll-to-top FAB after 400px |

Reusable helpers in this file: `Eyebrow`, `GradBtn`, `GhostBtn`, `useWindowWidth`, `useCountUp`.
(Full hero source is preserved separately; ask if you want each section extracted verbatim.)

---

## 6. Tool registry — `lib/tools.ts`

Single source of truth for the 9 core tools (drives sidebar, landing ecosystem, footer).
Each entry: `route, name, tagline, description, icon, category, chain, status, color, walletType, networkKey`.
Helpers: `getToolByRoute`, `getToolColor`, `getToolName`.

> ⚠️ **Chain inconsistency to know:** `lib/tools.ts` currently labels every tool
> **"Mantle Sepolia"** (`MANTLE_SEPOLIA`, chain 5003, "Turing Test Hackathon"), while the
> landing page, invoice flow, README and recent commits target **Arbitrum Sepolia**
> ("Ethereum Mexico 2026"). The deployed copy you replicate should pick one chain
> consistently — the live site reads "Arbitrum Sepolia".

---

## 7. Route-by-route reference (all 56)

Legend: **[shell]** = renders inside dark sidebar/topbar · **[bare]** = no shell.

### 7.1 Marketing & entry

| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | **[bare]** Landing page (§5) |
| `/ext` | `app/ext/page.tsx` | **[bare]** Chrome-extension SPA wrapper — re-renders `InvoicePage`/`DashboardPage` inside the extension side panel (zero-redirect routing) |

### 7.2 Dashboard — `app/dashboard/page.tsx` (938 lines) **[shell]**
Light "landing aesthetic" home for the app. Sections (from its `/* ── */` dividers):
Theme block, Nav items, Sidebar, **Stat cards**, **Protocol Activity** (chart + controls),
**Invoice Activity card**, **Search**. Composes: `ActivityFeed`, `ToolQuickAccess`,
`PriceTicker`, `LiveCrossChainPulse`, `ChainStatePanel`, `DailyBriefing`, `WalletPortfolio`,
`ArbitrumActivity`, `AgentSafetyWidget`, `PlatformModeBadge`, `ConnectButton`,
`WrongNetworkBanner`; data via `useDashboard`, invoice stats via `lib/invoice/invoiceStore`.

### 7.3 The 9 financial tools

**AI RWA Treasury — `/treasury`** (`#10b981`, 800 lines, **[shell]**, embedded `<style>`)
Landing-style tool page: hero, stat cards (`.stat-eyebrow "✦ Metric"`), cursive eyebrows
(`.eyebrow-cursive`), `.qa-title` CTA "Ready to automate your Yield Operations Hub?".
Uses `ConnectButton`, `WrongNetworkBanner`, `PriceBadge`, `useTrustMesh`, Solana job types.
**20 treasury sub-routes** (all `h1` 24px, palmflow-api backed):

| Route | Title |
|---|---|
| `/treasury/dashboard` | Yield Operations Hub Dashboard |
| `/treasury/analytics` | Yield Operations Hub Analytics |
| `/treasury/agents` | Neural Workforce |
| `/treasury/marketplace` | Agent Marketplace |
| `/treasury/yield` | Yield Optimizer |
| `/treasury/send` | Send Payment |
| `/treasury/receive` | Receive Payment |
| `/treasury/swap` | Swap Assets |
| `/treasury/payroll` | Payroll Streaming |
| `/treasury/pnl` | Profit & Loss |
| `/treasury/tax` | Tax Report |
| `/treasury/transactions` | Transaction History |
| `/treasury/history` | Transaction History |
| `/treasury/policy` | Neural Guardrails |
| `/treasury/settings` | Settings |
| `/treasury/rwa` | RWA Vault panel (`RWAVaultPanel`) |

(plus `/treasury` index). All read from `lib/palmflow-api.ts` + `palmflow-fallbacks.ts`.

**Invoice — `/invoice`** (`#C8FF00`, **[bare]**, 471 lines) — AI-parsed stablecoin invoice
creator; uses `lib/invoice/Recibo.json` artifact. **`/invoice/pay`** (466 lines): payment
flow with `StepRow`, `invoiceCodec` (decode link), `erc20Abi`/`reciboAbi`, Arbitrum Sepolia
config (`USDC_ADDRESS`, `CONTRACT_ADDRESS`), `markPaid`. Has invalid-link state.

**Credit Passport — `/credit`** (`#06b6d4`, 1298 lines, **[shell]**, embedded `<style>`)
On-chain credit score as soulbound NFT. Sections: Gauge math, sub-components, market-context
card (live ETH price), `page-title "Credit Passport"`, `page-eyebrow "On-Chain Identity"`.
Uses `creditPassport` contract reads, `usePrices`, `getCreditTier/getVaultBoost/...`,
`CreditPassportVerifier`, `FeatureOverviewPanel`. Sub-routes:
`/credit/stake` ("Stake NCRD"), `/credit/lend` ("AI-Negotiated Lending"),
`/credit/lending-demo` ("DeFi Lending Demo") — neurocredit-fallbacks + chat.

**AI Lending — `/lend`** (`#f59e0b`, 653 lines, **[shell]**) — `eyebrow "DeFi Loan
Negotiation"`. Composes `LendDashboard, LoanPortfolio, BorrowForm, LendForm, LendMarkets,
DefiTVLWidget`; `usePrices`.

**Private Vault — `/vault`** (`#14b8a6`, **[shell]**, embedded `<style>`) —
`page-eyebrow "◈ Secure & Private"`. Composes `VaultDashboard, CollateralManager,
DWalletManager, FHETradeForm, VaultHistory, FeatureOverviewPanel`; reads `eternalVault`
contract; `ColdStartBanner`, `PlatformModeBadge`.

**Agent Co-ordinator — `/agents`** (`#6366f1`, **[shell]**, embedded `<style>`) — composes
`AgentDashboard, JobsExplorer, NodeRegistry, DeployWizard, AgentAnalytics`,
`FeatureOverviewPanel`. Sub-routes: `/agents/analytics`, `/agents/deploy`, `/agents/explorer`,
`/agents/nodes`, `/agents/jobs/[id]` (job detail: `StatusBadge`, `LiveBadge`,
`DecisionTreeSVG`, "Coordination log"). Backed by `trustmesh-api`.

**Bill Split — `/split`** (`#3b82f6`, **2553 lines — largest page**, **[shell]**, big embedded
`<style>`) — Stellar Soroban bill splitting. Strong editorial design: `.eyebrow-cursive`
(✦ the process / split something / in progress / settlement history / under the hood),
`.section-title` ("Three steps to a settled bill", "Create a new bill", "Your active bills",
"Powered by Stellar Soroban"), `.stat-eyebrow` tiles. Uses `useStellar`, `simTx`,
`getExplorerUrl`, `EmptyState`, `ColdStartBanner`, `FeatureOverviewPanel`.

**Family Vault — `/legacy`** (`#f43f5e`, **[shell]**, embedded `<style>`) — encrypted
inheritance (AES-GCM). Sub-routes: `/legacy/upload` (514 lines, `encryptFile`+`uploadMemory`),
`/legacy/heir` (decrypt modal, heir files), `/legacy/timeline` (473 lines: Decrypt Modal,
AI Story Modal, File Card), `/legacy/validator` (`registerValidator`),
`/legacy/tokenization` (token profile). Backed by `eternavault-api` + `eternavault-encryption`.

**Stealth Execution Suite — `/shadow`** (`#8b5cf6`, 908 lines, **[shell]**, embedded `<style>`)
— autonomous ops grid. Sections: Types, Constants, **AgentCard**, Main Page;
`h2 "AI Department Grid"`. Uses `agent-policies` (`POLICIES`), `PolicyBadge`, `simTx`,
`fallbackShadowAgents`, `PriceBadge`, `PlatformModeBadge`, `getCreditTier`.

### 7.4 "Executive intelligence" family **[shell]** (dark, inline-styled, simulated)

All share `ExecutiveWalkthrough` + `CommandPalette` and one or more in-memory engine hooks.
They render dense control-board UIs (panels, metrics, simulation toggles, snapshots/epochs).
Class names like `.dashboard-layout`/`.gold-text`/`.btn-outline` appear but are undefined —
appearance is 100% inline styles.

| Route | File | Title / focus | Engine hooks |
|---|---|---|---|
| `/executive` | 802 ln | 👑 Sovereign Executive Command Board | sovereign, economic, global-memory, platform, autonomous, cognition, fabric, global-ops, strategic-intel, civilization |
| `/operations` | | Autonomous operations + recommendations | platform, org-context, autonomous-ops, digital-twin |
| `/coordination` | | Agent coordination | platform, org-context, agent-economy, predictive-ops, global-memory |
| `/governance` | 585 ln | Proposals / voting | sovereign-ops, org-context, global-ops, strategic-intel, civilization |
| `/policies` | | Policy management | sovereign-ops, org-context |
| `/analytics` | | Cross-engine analytics | platform, global-ops, fabric, strategic-intel, civilization |
| `/ecosystem` | 638 ln | Institutional agents / negotiations | global-ops, strategic-intel, civilization |
| `/security` | | 🔒 Digital-twin sim + suspicious-activity feed | platform (+SIMULATION_SCENARIOS), autonomous, digital-twin |
| `/architecture` | | Interactive Topology Map / OS System Layers | platform-engine |
| `/protocols` | | Smart-contract / chain registry (CHAIN_REGISTRY) | platform, autonomous |
| `/developers` | 855 ln | API explorer, webhook simulator, event schema, diagnostics | platform, telemetry |
| `/performance` | | Failover + diagnostics logs | platform-engine |
| `/integrations` | 570 ln | Integration catalog | platform-engine |
| `/story` | 524 ln | About / narrative | (walkthrough + palette only) |

---

## 8. Component catalog (65)

### Top-level (`components/`)
- `ActivityFeed.tsx` — dashboard activity stream
- `KubrykSidebar.tsx` — dark app sidebar (§4.3)
- `TopBar.tsx` — dark app topbar (§4.4)
- `ToolQuickAccess.tsx` — grid of tool shortcuts (dashboard)

### `components/ui/` (widgets)
- `LiveStatsStrip` — live price/slot ribbon (landing hero)
- `PriceTicker`, `PriceBadge` — live price displays
- `LiveCrossChainPulse` — animated 4-chain flow showcase
- `DailyBriefing` — light briefing card
- `WalletPortfolio` — cross-chain portfolio (`/api/portfolio`, Moralis)
- `ArbitrumActivity` — recent on-chain activity for connected wallet
- `AgentSafetyWidget` — aggregate agent policy-enforcement stats
- `ColdStartBanner` — "service waking up (~30s)" auto-retry banner
- `PlatformModeBadge` — LIVE vs DEMO mode pill
- `PolicyBadge` — agent spend/quota policy pill
- `FeatureOverviewPanel` — per-tool feature explainer
- `EmptyState`, `ErrorState` — placeholder states

### `components/wallet/`
- `ConnectButton` — universal connect (`type="auto"`), opens `WalletModal`
- `WalletModal` — provider picker
- `WalletPill` — connected address pill (sidebar)
- `NetworkBadge` — current EVM chain badge
- `WrongNetwork` / `WrongNetworkBanner` — wrong-chain warning (route-aware)
- `WalletPlatformSync` — resets platform context to DEMO on disconnect

### `components/chain/`
- `ChainSwitcher` — global chain preference selector (topbar)
- `ChainStatePanel` — live proof of end-to-end chain selection

### Domain bundles
- `components/agents/` — `AgentDashboard, AgentAnalytics, JobsExplorer, NodeRegistry, DeployWizard, MiniMesh, TrustMeshHero, TrustMeshTabBar`
- `components/lend/` — `LendDashboard, LoanPortfolio, BorrowForm, LendForm, LendMarkets, DefiTVLWidget, LendoraHero, LendoraTabBar`
- `components/vault/` — `VaultDashboard, CollateralManager, DWalletManager, FHETradeForm, VaultHistory, CipherVaultHero, CipherVaultTabBar`
- `components/treasury/` — `RWAVaultPanel` (live RWAkinsRWAVault, the AI×RWA hero panel)
- `components/credit/` — `CreditPassportVerifier`
- `components/invoice/` — `StepRow, EcosystemPanel, EcosystemSidebar, EcosystemWrapper`

### `app/components/` (app-shell-scoped)
`AppShell, Navbar, CommandPalette, OnboardingTour, ExecutiveWalkthrough, DemoBanner,
ErrorBoundary, Skeleton, EmptyState, CopyButton`.

---

## 9. Hooks & contexts

**Contexts (`context/`)** — provider order in `AppShell`:
- `WalletContext` — wallet connection / address / chain (custom, wraps wagmi + Solana/Stellar)
- `KubrykPlatformContext` — platform state: `creditScore`, `vaultActive`, LIVE/DEMO mode
- `ChainPreferenceContext` — global default chain every tool follows

**Hooks (`hooks/`)**
`useBackendWarmup` (keep Render warm), `useChainState`, `useDashboard`, `useDashboardActivity`,
`useNavigation`, `usePrices` (CoinGecko), `useStellar`, `useToolInfo`, `useTrustMesh`
(Solana jobs/slot), `useWalletForTool` (per-tool required-chain wallet).

**`lib/` (logic layer, ~60 files)** — grouped:
- Per-tool API + fallbacks: `palmflow-*` (treasury), `neurocredit-*` (credit), `eternavault-*`
  (legacy), `trustmesh-*` (agents), `syncsplit-*` (split), `lend-fallbacks`, `vault-fallbacks`.
- "Engine" hooks (executive family): `platform-engine, sovereign-ops, economic-ops,
  autonomous-ops, cognition-engine, fabric-engine, global-operations-engine,
  strategic-intelligence-engine, civilization-orchestration-engine, digital-twin,
  agent-economy, predictive-ops, global-memory, org-context, sovereign-ops`.
- Web3/infra: `contracts/*, contract.ts, networks.ts, wallet-providers.ts, wallet-utils.ts,
  blockchain-connector.ts, chainlink.ts, explorer.ts, sim-tx.ts, rwa/*, invoice/*, portfolio/*`.
- Cross-cutting: `tools.ts, platform/scoring.ts, toast.ts, telemetry.ts, observability.ts,
  event-bus.ts, api.ts, api-resilience.ts, fallback.ts, sync-manager.ts`.

---

## 10. How to replicate the design (cheat-sheet)

1. **Two themes:** light pastel marketing (`.hero-bg` + `.grain`, navy text, signature
   gradient accents) **vs** near-black app shell (`#080808` sidebar/topbar, gold `#F5C518`,
   Fira Code mono numerals).
2. **Everything is a rounded pill or soft card.** Buttons `radius:999`; cards `radius:16–24`
   with big soft blue/violet shadows.
3. **One gradient rules them all:** `135deg #3B5BFA→#8B5CF6→#EC4899` for logos, primary
   buttons, gradient text, hero glows, final CTA.
4. **Each tool owns one accent color** (table §3.1) used for its icon tile, active sidebar
   state, eyebrows, and chart strokes.
5. **Motion:** `fadeUp`+`stagger` on scroll-in; `scale 1.03/0.98` on hover/tap; floating
   hero card; pulsing live dots; marquee logos; 3D-tilt dashboard mock.
6. **Inline styles first.** Reach for `globals.css` only for the reusable treatments in §3.4;
   inject a local `<style>` block when a tool page needs keyframes / pseudo-classes.
7. **Chrome composition:** `RootLayout(fonts+Toaster) → AppShell(providers + mode switch) →
   [Sidebar + TopBar + WrongNetworkBanner + page]`. Landing/invoice/ext opt out of the shell.
8. **Pick one chain** and apply it consistently (the live site = Arbitrum Sepolia; the tool
   registry still says Mantle Sepolia — reconcile before shipping).

---

*Generated from the `hub/` source. For verbatim code of any single route or component,
ask for it by path (e.g. "give me `/treasury` page in full").*

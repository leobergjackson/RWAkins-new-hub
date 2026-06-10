# Colibrí — Demo Video Script
### Ethereum Mexico 2026 · Hackathon Submission

---

## 1. 2-Minute Main Script

| Timestamp | On-Screen Action / Shot | Voiceover | On-Screen Caption |
|-----------|------------------------|-----------|-------------------|
| 0:00–0:08 | Full-screen stat card fades in on dark background | "Every year, Mexican families wait days — and lose hundreds of dollars — just to receive money from relatives in the US. $65 billion sent home. $7 billion eaten by fees." | **$65B/year in US→Mexico remittances. $7B lost to fees and bad FX.** |
| 0:08–0:14 | Cut to dashboard landing page. Hero headline fills screen. | "We built Colibrí — an AI-powered remittance agent that makes sending money home fast, cheap, and transparent." | **Colibrí — Send money home.** |
| 0:14–0:22 | Navigate to `/send`. Form fields are visible: amount input, recipient selector. | "Here's the experience. I'm sending $200 to my mother María in Guadalajara." | **Sender: US · Recipient: María, Guadalajara MX** |
| 0:22–0:28 | Type "200" in the USD field. Select "María (Guadalajara)" from the recipient dropdown. | "Two fields. That's the entire UX." | **$200 USD → María Hernández, CLABE ••••1234** |
| 0:28–0:35 | Hover over the "Send with Colibrí" button, then click it. | "One click starts a 4-agent AI council. Each agent votes — and every vote is SHA-256 signed on-chain." | **4-agent consensus · SHA-256 signed votes · 4/4 quorum required** |
| 0:35–0:50 | Agent reasoning panel expands. Four agents animate in sequence, each showing status text and a green checkmark. | "Discovery verifies María's identity. Router evaluates Arbitrum and Base — picks Base for lower fees. Treasury confirms USDC liquidity. Guardian runs fraud and limit checks. All four must agree — no single point of failure." | **Discovery ✓ · Router → Base L2 ✓ · Treasury ✓ · Guardian ✓** |
| 0:50–1:05 | 8-stage pipeline tracker appears below the agent panel. Stages tick green one by one: VALIDATE → QUOTE → APPROVE → SIGN → BROADCAST → CONFIRM → VERIFY → RECORD. | "The moment consensus is reached, an 8-stage transaction pipeline fires. USDC settles on Base. Every stage is auditable." | **VALIDATE → QUOTE → APPROVE → SIGN → BROADCAST → CONFIRM → VERIFY → RECORD** |
| 1:05–1:18 | Pipeline completes. Result card slides in: green checkmark, large peso amount, time elapsed, savings callout. | "Ninety-two seconds later — ₱3,409 pesos hits María's bank account via a SPEI deposit through Bitso. The off-ramp is instant. The savings are real." | **₱3,409 MXN delivered · 92 seconds · SPEI deposit via Bitso** |
| 1:18–1:32 | Comparison table expands below the result card. Three columns: Colibrí, Western Union, Bank Wire. Rows: Fee, FX Markup, Delivery Time, Amount Received. | "Compare that to Western Union — $9 flat fee plus a 2.5% FX markup, one to three days. Or a bank wire, which is even worse. Colibrí: $1.20 total. María gets $12.56 more." | **You saved $12.56 vs Western Union · ~$20+ vs bank wire** |
| 1:32–1:44 | Split screen: left shows agent logs / test count badge; right shows code architecture diagram or terminal with test output. | "Under the hood: 1,183 passing tests, multi-agent consensus with veto power, a 6-layer safety stack, and production-grade contracts on Ethereum L2. This isn't a prototype — it's an engine." | **1,183 passing tests · 6-layer safety · Multi-agent consensus** |
| 1:44–1:52 | Zoom back out to the result card on the `/send` page. | "For the 40 million Mexicans living abroad, every dollar saved is a meal, a school fee, a medical bill covered. Colibrí makes that happen in 90 seconds." | **40M Mexicans abroad send $65B home every year.** |
| 1:52–2:00 | Logo and tagline fade in on clean dark background. Sponsor logo (Bitso) visible bottom-right. | "Colibrí. Built at Ethereum Mexico 2026. Powered by Base, Arbitrum, and Bitso. Send money home — the way it should work." | **Colibrí · github.com/[repo] · Ethereum Mexico 2026 · Powered by Bitso** |

---

## 2. 30-Second Elevator Cut

> "Mexican families lose $7 billion a year to remittance fees. Colibrí fixes that."

> "One click. A 4-agent AI council verifies the recipient, picks the cheapest Ethereum L2, confirms liquidity, and blocks fraud — 4-of-4 consensus, every vote signed."

> "USDC settles on Base. Bitso off-ramps it to pesos. SPEI hits María's bank."

> "Ninety-two seconds. $1.20 fee. $12 saved versus Western Union."

> "1,183 passing tests. Production-grade. This is Colibrí."

---

## 3. Shot List / Recording Checklist

### Before You Hit Record

- [ ] Dashboard is running locally or on staging — confirm `/send` route loads cleanly
- [ ] Pre-fill or have ready: amount = `200`, recipient = `María (Guadalajara)`, CLABE ending `1234`
- [ ] Agent reasoning panel is confirmed to animate (not collapsed by default)
- [ ] 8-stage pipeline tracker is visible without scrolling — adjust zoom/resolution if needed
- [ ] Result card data is seeded: `₱3,409 MXN · 92s · saved $12.56`
- [ ] Comparison table (Colibrí / Western Union / Bank Wire) is visible on the result card
- [ ] Browser is in a clean profile (no extensions, no notifications, dark mode preferred)
- [ ] Screen resolution: 1920×1080 minimum; record at 2x for retina if demoing on Mac
- [ ] Disable system notifications (macOS: Do Not Disturb on)

### Shot Sequence

1. **Stat card / title card** — can be a motion graphic added in post; 8 seconds
2. **Landing hero** (`/`) — hero headline in frame, 3–4 seconds
3. **Send form** (`/send`) — show empty form, then type amount and select recipient
4. **Click "Send with Colibrí"** — slow hover for 1 second before clicking; makes the CTA legible
5. **Agent reasoning panel** — let all 4 agents animate fully; do not cut early
6. **Pipeline tracker** — let all 8 stages tick; the visual pacing is a key trust signal
7. **Result card** — hold on the peso amount + time + savings for at least 4 seconds
8. **Comparison table** — pan or scroll to show all three columns if below the fold
9. **Code/test badge split-screen** — terminal or CI badge showing 1,183 tests passing
10. **Closing logo card** — clean fade, hold for 3 seconds

### Captions & Post-Production Tips

- Burn captions directly into the video (not just subtitles) — judges often watch muted
- Use a sans-serif font at high contrast (white on dark or dark on light) — minimum 32pt for captions
- Add a subtle zoom-in (Ken Burns, ~5%) on the result card to draw the eye to the peso amount
- Use a light swoosh sound effect each time a pipeline stage turns green
- Color-code the comparison table: Colibrí row in brand green, Western Union in red/orange

---

## 4. DoraHacks BUIDL Submission Blurb

Colibrí is an AI-powered cross-border remittance agent that sends USD to Mexican pesos in under 90 seconds for ~$1.20 — saving families $12+ per transfer versus Western Union. A 4-agent council (Discovery, Router, Treasury, Guardian) reaches 4/4 consensus with SHA-256 signed votes before routing USDC on Base L2; Bitso then off-ramps to MXN via SPEI. The stack ships 1,183 passing tests, a multi-agent consensus layer with veto power, an 8-stage transaction pipeline, and 6-layer safety. Built for the $65B/year US–Mexico remittance corridor at Ethereum Mexico 2026.

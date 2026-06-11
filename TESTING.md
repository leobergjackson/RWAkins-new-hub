# RWAkins — Manual Test Guide

Confirms every route + process works, and that the two recent bugs
("falls to demo position" and "shows the previous query's portfolio") are fixed.

Dev server: `npm run dev` → http://localhost:3000
Use the wallet that owns the deployed vault (the one in the screenshots,
`0x0ab1…d727`), connected to **Mantle Sepolia (chain 5003)**.

---

## A. Quick API smoke test (no browser, ~1 min)

Run these in a terminal. All should return JSON with `"ok":true` (or `200`).

```bash
BASE=http://localhost:3000
W=0x0AB1EE996D99C492530dF8316d7aC75eBAb9d727

# 1. Health
curl -s $BASE/api/health | grep -q '"status":"ok"' && echo "✅ health" || echo "❌ health"

# 2. Reliable portfolio read — run 10×, expect 10/10 ok (this was ~50% before)
ok=0; for i in $(seq 1 10); do curl -s "$BASE/api/portfolio?wallet=$W" | grep -q '"ok":true' && ok=$((ok+1)); done
echo "portfolio read: $ok/10 ok  (want 10/10)"

# 3. Live market snapshot (price/yields/volatility)
curl -s $BASE/api/market | python3 -m json.tool

# 4. Oracle sync (pushes live price/yields on-chain; gas-gated)
curl -s -X POST $BASE/api/oracle/sync | python3 -m json.tool

# 5. Decision brain + real LLM council
curl -s -X POST $BASE/api/rebalance/trigger -H 'Content-Type: application/json' \
  -d "{\"wallet\":\"$W\",\"currentMethPct\":50,\"targetUsdyBps\":3000,\"targetMethBps\":7000,\"usdyApyBps\":355,\"methApyBps\":240}" \
  | python3 -m json.tool | head -40
```

**Pass criteria:** step 2 shows **10/10 ok** (the RPC-resilience fix), step 3 shows
non-zero `volatility`, step 5 returns a `council` with **4 votes**.

---

## B. Routing test (browser, click every page)

Connect your wallet first (top-right). Then visit each — all should render, no blank screens:

- [ ] **/** — landing page loads
- [ ] **/onboarding** — intent chat box appears (after wallet connect)
- [ ] **/portfolio** — dashboard with the **LIVE** data badge + metric cards
- [ ] **/activity** — rebalance history / tx list
- [ ] **/agent-council** — council view renders
- [ ] Left-rail nav (Portfolio / Activity / Settings) routes between pages

---

## C. Bug 1 — "falls to demo position" is fixed

1. Open **/portfolio** (wallet connected, on Mantle Sepolia).
2. **Hard refresh 5–6 times** in a row (Cmd/Ctrl-R).

**Expected (fixed):** every refresh shows your **real** position — the same numbers
each time (≈ **50% USDY / 50% mETH**, total ≈ $3.6k), the **LIVE** badge shows the
synced mETH price, and you do **NOT** see the yellow *"Showing a demo position"*
banner or a jumpy $8,689 figure.

**If the RPC ever does blip:** you'll briefly see a *"Reconnecting to Mantle… showing
your last known balances"* notice — **not** a fake demo. That's the new behaviour.

> The old bug: ~1-in-2 refreshes flipped to a fabricated demo ($8,689, 6800 USDY).

---

## D. Bug 2 — "shows the previous query's portfolio" is fixed

1. Go to **/onboarding**.
2. Type a clearly different policy, e.g. **"go aggressive, mostly mETH"**, hit **Send**.
3. Click **Confirm and activate agent** → you land on **/portfolio**.

**Expected:**
- [ ] The **Active Wealth Rules** panel shows the **new** target (e.g. 30% USDY / 70% mETH) immediately.
- [ ] A purple banner appears: **"Your saved target is 30% USDY / 70% mETH, but you're currently at 50% / 50% — Hit Run Rebalance to apply."** (This is the key fix — the old position is correctly labelled as *not yet applied*, instead of looking "stuck".)

4. Click **Run Rebalance**.

**Expected:**
- [ ] It runs (market sync → council → on-chain tx), then the dashboard updates to the **new** split (≈ 70% mETH) and the purple "apply" banner disappears.
- [ ] A real tx hash appears (you're routed to /activity).

---

## E. Full happy path (end-to-end)

1. **/onboarding** → describe a goal → **Send** → confirm → **/portfolio**.
2. Dashboard shows live price/yields/volatility in the **LIVE** badge.
3. If target ≠ current, the purple banner prompts a rebalance.
4. **Run Rebalance** → council decides → on-chain execution → **/activity** shows the new entry + tx hash.
5. Back to **/portfolio** → split now matches your target, banner gone.

If all of A–E pass, every route and process is wired correctly. ✅

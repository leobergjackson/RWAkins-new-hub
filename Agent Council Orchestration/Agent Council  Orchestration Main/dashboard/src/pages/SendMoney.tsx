import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Check,
  Clock,
  Cpu,
  Loader2,
  Route,
  Search,
  Shield,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// USD → MXN mid-market rate (illustrative; the live agent pulls a spot quote at send time).
const FX = 17.15;

// A small book of saved beneficiaries — the kind of recipients a remittance sender keeps.
const CONTACTS = [
  { id: "maria", name: "María G.", relation: "Mamá", city: "Guadalajara, MX", clabe: "****1234", transfers: 14 },
  { id: "luis", name: "Luis R.", relation: "Hermano", city: "Puebla, MX", clabe: "****8890", transfers: 6 },
  { id: "rosa", name: "Rosa M.", relation: "Tía", city: "Mérida, MX", clabe: "****4471", transfers: 21 },
];

const PIPELINE_STAGES = [
  "VALIDATE", "QUOTE", "APPROVE", "SIGN", "BROADCAST", "CONFIRM", "VERIFY", "RECORD",
];

type Phase = "idle" | "running" | "done";

interface AgentEvent {
  icon: typeof Shield;
  actor: string;
  title: string;
  detail: string;
}

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SendMoney() {
  const [usd, setUsd] = useState("200");
  const [contactId, setContactId] = useState(CONTACTS[0].id);
  const [deliverAs, setDeliverAs] = useState<"mxn" | "usdc">("mxn");
  const [split, setSplit] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const contact = CONTACTS.find((c) => c.id === contactId) ?? CONTACTS[0];
  const n = Math.max(0, parseFloat(usd) || 0);

  // Economics — all derived from the amount so the demo recomputes live.
  const mid = n * FX;
  const colibriCostUsd = Math.max(0.5, n * 0.006); // ~0.6% all-in (off-ramp spread + L2 gas)
  const colibriRecv = Math.round(mid - colibriCostUsd * FX);
  const wuFeeUsd = 9;
  const wuRecv = Math.round((n - wuFeeUsd) * FX * 0.975); // flat fee + ~2.5% FX markup
  const wuCostUsd = Math.max(0, Math.round(((mid - wuRecv) / FX) * 100) / 100);
  const bankFeeUsd = 30;
  const bankRecv = Math.round((n - bankFeeUsd) * FX * 0.97);
  const savingsUsd = Math.max(0, Math.round((wuCostUsd - colibriCostUsd) * 100) / 100);

  const events: AgentEvent[] = [
    {
      icon: Search,
      actor: "Discovery",
      title: "Recipient verified",
      detail: `${contact.name} · ${contact.city} — KYC on file, ${contact.transfers} prior transfers, low risk`,
    },
    {
      icon: Route,
      actor: "Router",
      title: "Cheapest L2 route selected",
      detail: "Base $0.01 vs Arbitrum $0.04 vs Ethereum $3.20 → routing USDC via Base",
    },
    {
      icon: Wallet,
      actor: "Treasury",
      title: "Liquidity confirmed",
      detail: "Wallet mood Strategic (1.0×) — sufficient USDC reserves, no rebalance needed",
    },
    {
      icon: Shield,
      actor: "Guardian",
      title: "Risk cleared — no veto",
      detail: "Amount within policy limits · no anomaly · 4/4 council quorum, SHA-256 signed",
    },
    {
      icon: Cpu,
      actor: "Pipeline",
      title: "8-stage pipeline settled",
      detail: PIPELINE_STAGES.join(" → "),
    },
    {
      icon: Banknote,
      actor: "Bitso off-ramp",
      title: deliverAs === "mxn" ? "USDC → MXN, SPEI deposit" : "USDC delivered to wallet",
      detail:
        deliverAs === "mxn"
          ? `Converted at ₱${FX.toFixed(2)} · SPEI to CLABE ${contact.clabe}`
          : `USDC sent to ${contact.name}'s self-custodial wallet on Base`,
    },
  ];

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("idle");
    setStep(0);
  }

  function send() {
    if (n <= 0) {
      toast.error("Enter an amount to send");
      return;
    }
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("running");
    setStep(0);
    events.forEach((_, i) => {
      timers.current.push(setTimeout(() => setStep(i + 1), 700 * (i + 1)));
    });
    timers.current.push(
      setTimeout(() => {
        setPhase("done");
        toast.success(`₱${money(colibriRecv)} MXN delivered to ${contact.name}`);
      }, 700 * (events.length + 1)),
    );
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Send money home</h1>
          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
            USD → MXN
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Cross-border remittance settled on an L2 in seconds. Your AI agent finds the cheapest route,
          checks the recipient, and off-ramps to pesos via Bitso — for a fraction of Western Union.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* ── Compose ── */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
          <label className="text-xs font-medium text-muted-foreground">You send (USD)</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
            <span className="text-2xl font-semibold text-muted-foreground">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={usd}
              onChange={(e) => {
                setUsd(e.target.value);
                if (phase !== "idle") reset();
              }}
              className="w-full bg-transparent text-3xl font-semibold outline-none"
              placeholder="200"
            />
            <span className="text-sm text-muted-foreground">USDC</span>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
            <span className="text-sm text-muted-foreground">They receive</span>
            <span className="text-xl font-bold text-primary">
              {deliverAs === "mxn" ? `₱${money(colibriRecv)} MXN` : `$${money(Math.round(n - colibriCostUsd))} USDC`}
            </span>
          </div>

          <div className="mt-5">
            <label className="text-xs font-medium text-muted-foreground">Recipient</label>
            <div className="mt-2 space-y-2">
              {CONTACTS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setContactId(c.id);
                    if (phase !== "idle") reset();
                  }}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                    c.id === contactId
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 bg-background/40 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {c.name} <span className="text-muted-foreground font-normal">· {c.relation}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{c.city}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    CLABE {c.clabe} · {c.transfers} transfers
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            {(["mxn", "usdc"] as const).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDeliverAs(d);
                  if (phase !== "idle") reset();
                }}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                  deliverAs === d ? "border-primary/50 bg-primary/10 text-primary" : "border-border/50 text-muted-foreground"
                }`}
              >
                {d === "mxn" ? "MXN to bank (SPEI)" : "USDC to wallet"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSplit((s) => !s)}
            className="mt-3 flex w-full items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Users className="h-3.5 w-3.5" />
            <span className={split ? "text-primary" : ""}>
              {split ? "Splitting 70/30 across two family members" : "Split this transfer across family"}
            </span>
          </button>

          <Button
            onClick={phase === "done" ? reset : send}
            disabled={phase === "running"}
            className="mt-6 h-12 w-full bg-primary hover:bg-primary/90 text-sm font-medium"
            style={{ boxShadow: "0 0 24px rgba(255,78,0,0.25)" }}
          >
            {phase === "running" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Agent working…</>
            ) : phase === "done" ? (
              <>Send another</>
            ) : (
              <>Send with Colibrí <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
          <p className="mt-3 text-center text-[10px] text-muted-foreground/70">
            Rates illustrative · the agent fetches a live FX + gas quote at send time
          </p>
        </div>

        {/* ── Agent timeline + result ── */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-6 min-h-[420px]">
          {phase === "idle" && (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Cpu className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-medium">Colibrí's 4-agent council is ready</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Hit send and watch Discovery, Router, Treasury, and Guardian reason, vote, and settle the
                transfer through the 8-stage pipeline.
              </p>
            </div>
          )}

          {phase !== "idle" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Agent council
                </span>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                  {phase === "done" ? "4/4 quorum · settled" : "deliberating…"}
                </Badge>
              </div>

              {events.map((ev, i) => {
                const active = step > i;
                const Icon = ev.icon;
                return (
                  <div
                    key={i}
                    className={`flex gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300 ${
                      active ? "border-border/60 bg-background/50 opacity-100" : "border-transparent opacity-30"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        active ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {active ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">{ev.actor}</span>
                        <span className="text-xs font-medium">{ev.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground break-words">{ev.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {phase === "done" && (
            <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-5 animate-fade-in">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Delivered to {contact.name}</span>
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <Clock className="h-3 w-3" /> 92 seconds
                </span>
              </div>
              <div className="mt-1 text-3xl font-bold text-primary">
                {deliverAs === "mxn" ? `₱${money(colibriRecv)} MXN` : `$${money(Math.round(n - colibriCostUsd))} USDC`}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Total cost ${colibriCostUsd.toFixed(2)} ({((colibriCostUsd / Math.max(n, 1)) * 100).toFixed(1)}%) ·
                settled on Base ·{" "}
                <a
                  href="https://basescan.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  view on Basescan
                </a>
              </div>

              {savingsUsd > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <TrendingDown className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">
                    You saved ${savingsUsd.toFixed(2)} vs Western Union
                  </span>
                </div>
              )}

              <div className="mt-4 overflow-hidden rounded-lg border border-border/50 text-xs">
                <div className="grid grid-cols-4 bg-muted/40 px-3 py-2 font-medium text-muted-foreground">
                  <span>Rail</span><span>Fee</span><span>Speed</span><span className="text-right">They get</span>
                </div>
                {[
                  { rail: "Colibrí", fee: `$${colibriCostUsd.toFixed(2)}`, speed: "~90s", recv: colibriRecv, good: true },
                  { rail: "Western Union", fee: `$${wuFeeUsd.toFixed(2)}`, speed: "1–3 days", recv: wuRecv, good: false },
                  { rail: "Bank wire", fee: `$${bankFeeUsd.toFixed(2)}`, speed: "2–5 days", recv: bankRecv, good: false },
                ].map((r) => (
                  <div key={r.rail} className={`grid grid-cols-4 px-3 py-2 ${r.good ? "bg-primary/5" : ""}`}>
                    <span className={r.good ? "font-semibold text-primary" : ""}>{r.rail}</span>
                    <span>{r.fee}</span>
                    <span>{r.speed}</span>
                    <span className="text-right font-medium">₱{money(r.recv)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

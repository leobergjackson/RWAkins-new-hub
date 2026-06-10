import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import CountUp from "@/components/shared/CountUp";
import { Sparkles, CheckCircle2, Youtube, Radio, Webhook, Eye, Heart, MessageCircle, Share2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const attestations = [
  { creator: "María García", platform: "Bitso SPEI", metric: "views", value: "45.2K MXN", timestamp: "2m ago", verified: true },
  { creator: "María García", platform: "Bitso SPEI", metric: "likes", value: "3.8K MXN", timestamp: "2m ago", verified: true },
  { creator: "Luis Hernández", platform: "Bitso SPEI", metric: "views", value: "12.1K MXN", timestamp: "5h ago", verified: true },
  { creator: "Rosa Martínez", platform: "Arbitrum", metric: "views", value: "8.7K MXN", timestamp: "8h ago", verified: true },
  { creator: "Carlos López", platform: "Base", metric: "comments", value: "847 MXN", timestamp: "12h ago", verified: true },
  { creator: "Luis Hernández", platform: "Bitso SPEI", metric: "watch_time", value: "4,200 MXN", timestamp: "1d ago", verified: false },
];

const metricIcons: Record<string, typeof Eye> = {
  views: Eye,
  likes: Heart,
  comments: MessageCircle,
  shares: Share2,
  watch_time: TrendingUp,
};

const propagation = [
  { from: "Colibrí Agent", to: "María García", amount: "2.5 USDC", chain: "Base" },
  { from: "María García", to: "Ana Rodríguez", amount: "0.5 USDC", chain: "Arbitrum" },
  { from: "María García", to: "Carlos López", amount: "0.3 USDC", chain: "Base" },
];

const platforms = [
  { name: "Bitso SPEI", status: "connected", events: 847, adapter: "Official API" },
  { name: "Arbitrum One", status: "connected", events: 234, adapter: "Alchemy RPC" },
  { name: "Base Mainnet", status: "connected", events: 56, adapter: "Coinbase RPC" },
  { name: "Optimism", status: "disconnected", events: 0, adapter: "Not configured" },
];

const autoTipRules = [
  { metric: "transfers", threshold: "> 10,000 MXN", action: "Auto-send 1 USDC", enabled: true },
  { metric: "verifications", threshold: "> 1,000", action: "Auto-send 0.5 USDC", enabled: true },
  { metric: "settlements", threshold: "> 500", action: "Auto-send 0.25 USDC", enabled: true },
  { metric: "growth_rate", threshold: "> 20% week/week", action: "Bonus send 2 USDC", enabled: false },
];

const recommendations = [
  { creator: "Elena Peña", score: 89, reason: "High transfer frequency, verified KYC", platform: "Bitso SPEI" },
  { creator: "Hugo Navarro", score: 82, reason: "Consistent settlements, active corridor", platform: "Arbitrum" },
  { creator: "Sofía Guerrero", score: 78, reason: "Trusted beneficiary, fast SPEI off-ramp", platform: "Base" },
];

export default function Engagement() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Proof of Transfer & Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">Verified transfer attestations, remittance propagation, and recipient discovery.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Attestations", value: 2847, icon: Sparkles },
          { label: "Verified", value: 98, suffix: "%", icon: CheckCircle2 },
          { label: "Networks", value: 3, icon: Youtube },
          { label: "Auto-Transfers Triggered", value: 156, icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight">
              <CountUp target={s.value} />{s.suffix}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Attestations */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Transfer Attestations</h3>
          </div>
          <ScrollArea className="h-[300px]">
            <div className="divide-y divide-border/20">
              {attestations.map((a, i) => {
                const MetricIcon = metricIcons[a.metric] || Eye;
                return (
                  <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-accent/30 transition-colors">
                    <MetricIcon className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium">{a.creator}</span>
                        <Badge variant="outline" className="text-[9px]">{a.platform}</Badge>
                        {a.verified && <CheckCircle2 className="h-3 w-3" style={{ color: "#50AF95" }} />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{a.metric}</span>
                        <span className="text-xs font-medium tabular-nums">{a.value}</span>
                        <span className="text-[10px] text-muted-foreground/60 ml-auto">{a.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Tip Propagation */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Remittance Propagation</h3>
          <div className="space-y-3">
            {propagation.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs font-medium">{p.from}</span>
                  <span className="text-muted-foreground/40">&rarr;</span>
                  <span className="text-xs font-medium">{p.to}</span>
                </div>
                <span className="text-xs tabular-nums">{p.amount}</span>
                <Badge variant="outline" className="text-[9px]">{p.chain}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-accent/20 p-3">
            <p className="text-[10px] text-muted-foreground leading-relaxed">Remittances can propagate downstream when beneficiaries share funds with family members. The agent tracks the full transfer chain for transparency.</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Platforms */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Platform Adapters</h3>
          </div>
          <div className="divide-y divide-border/20">
            {platforms.map((p) => (
              <div key={p.name} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{p.name}</span>
                    <Badge variant="outline" className={`text-[9px] ${p.status === "connected" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>{p.status}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{p.adapter}</p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{p.events}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-Tip Rules */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Auto-Transfer Rules</h3>
          </div>
          <div className="divide-y divide-border/20">
            {autoTipRules.map((r) => (
              <div key={r.metric} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium capitalize">{r.metric.replace("_", " ")}</span>
                  <Badge variant="outline" className={`text-[9px] ${r.enabled ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"}`}>{r.enabled ? "Active" : "Off"}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{r.threshold} &rarr; {r.action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Recommended Recipients</h3>
          </div>
          <div className="divide-y divide-border/20">
            {recommendations.map((r) => (
              <div key={r.creator} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{r.creator}</span>
                  <Badge variant="outline" className="text-[9px]">{r.platform}</Badge>
                  <span className="text-xs tabular-nums font-medium ml-auto" style={{ color: "#FF4E00" }}>{r.score}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{r.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

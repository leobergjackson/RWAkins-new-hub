import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CountUp from "@/components/shared/CountUp";
import { Calculator, Gauge, BarChart3, PieChart, Sliders } from "lucide-react";

const scoringFactors = [
  { name: "View Count", weight: 30, score: 87 },
  { name: "Likes / Reactions", weight: 25, score: 92 },
  { name: "Comments", weight: 20, score: 78 },
  { name: "Watch Time", weight: 15, score: 84 },
  { name: "Growth Rate", weight: 10, score: 96 },
];

const gasComparison = [
  { chain: "Base", gas: "0.005 gwei", cost: "$0.01", recommended: true },
  { chain: "Arbitrum One", gas: "0.1 gwei", cost: "$0.04", recommended: true },
  { chain: "Base Sepolia", gas: "0.003 gwei", cost: "$0.005", recommended: false },
  { chain: "Arbitrum Sepolia", gas: "0.08 gwei", cost: "$0.02", recommended: false },
  { chain: "Optimism", gas: "0.2 gwei", cost: "$0.06", recommended: false },
  { chain: "Ethereum", gas: "12 gwei", cost: "$0.85", recommended: false },
];

const smoothingCreators = [
  { name: "María García", enrolled: true, reserve: "$45.20", avgIncome: "$12.50/wk" },
  { name: "Luis Hernández", enrolled: true, reserve: "$32.10", avgIncome: "$8.30/wk" },
  { name: "Rosa Martínez", enrolled: false, reserve: "$0", avgIncome: "$6.70/wk" },
];

export default function Economics() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Economic Engine</h1>
        <p className="text-sm text-muted-foreground mt-1">Recipient scoring, fee optimization, revenue smoothing, and sustainability.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Avg Trust Score", value: 87, suffix: "/100", icon: Calculator },
          { label: "Fee Savings", value: 94, suffix: "%", icon: Gauge },
          { label: "Revenue Smoothed", value: 77, prefix: "$", icon: BarChart3 },
          { label: "Sustainability", value: 91, suffix: "%", icon: PieChart },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight">
              {s.prefix}<CountUp target={s.value} />{s.suffix}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Creator Scoring */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <h3 className="text-sm font-semibold">Recipient Trust Scoring</h3>
          </div>
          <div className="space-y-4">
            {scoringFactors.map((f) => (
              <div key={f.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs">{f.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] tabular-nums">{f.weight}% weight</Badge>
                    <span className="text-xs font-mono tabular-nums w-8 text-right">{f.score}</span>
                  </div>
                </div>
                <Progress value={f.score} className="h-2 bg-secondary" />
              </div>
            ))}
          </div>
        </div>

        {/* Fee Optimization */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Fee Optimization by L2 Network</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-5 py-2 font-medium">Chain</th>
                  <th className="text-left px-3 py-2 font-medium">Gas</th>
                  <th className="text-right px-3 py-2 font-medium">Cost</th>
                  <th className="text-center px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {gasComparison.map((g) => (
                  <tr key={g.chain} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-2.5 text-xs font-medium">{g.chain}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">{g.gas}</td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums">{g.cost}</td>
                    <td className="px-5 py-2.5 text-center">
                      {g.recommended && <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Recommended</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Smoothing */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Revenue Smoothing</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-5 py-2 font-medium">Recipient</th>
                  <th className="text-center px-3 py-2 font-medium">Enrolled</th>
                  <th className="text-right px-3 py-2 font-medium">Reserve</th>
                  <th className="text-right px-5 py-2 font-medium">Avg Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {smoothingCreators.map((c) => (
                  <tr key={c.name} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-2.5 text-xs font-medium">{c.name}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant="outline" className={`text-[9px] ${c.enrolled ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"}`}>
                        {c.enrolled ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums">{c.reserve}</td>
                    <td className="px-5 py-2.5 text-right text-xs tabular-nums text-muted-foreground">{c.avgIncome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Split Config */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Revenue Split</h3>
          <div className="space-y-3">
            {[
              { label: "Recipient", pct: 85, color: "bg-primary" },
              { label: "Platform", pct: 10, color: "bg-blue-500" },
              { label: "Community", pct: 5, color: "bg-emerald-500" },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                    <span className="text-xs">{s.label}</span>
                  </div>
                  <span className="text-xs font-mono tabular-nums">{s.pct}%</span>
                </div>
                <Progress value={s.pct} className="h-1.5 bg-secondary" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

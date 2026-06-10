import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CountUp from "@/components/shared/CountUp";
import { Landmark, TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";

const allocation = [
  { name: "Operational", pct: 42, amount: "$5,395.87", color: "bg-primary" },
  { name: "Yield", pct: 28, amount: "$3,597.25", color: "bg-emerald-500" },
  { name: "Reserve", pct: 20, amount: "$2,569.46", color: "bg-blue-500" },
  { name: "Community", pct: 10, amount: "$1,284.74", color: "bg-yellow-500" },
];

const yields = [
  { protocol: "Aave V3", chain: "Ethereum", apy: 4.2, risk: "Low", deployed: "500 USDT", earned: "$3.42" },
  { protocol: "Compound", chain: "Ethereum", apy: 3.8, risk: "Low", deployed: "300 USDT", earned: "$1.87" },
  { protocol: "JustLend", chain: "Tron", apy: 5.1, risk: "Medium", deployed: "200 USDT", earned: "$1.64" },
  { protocol: "Marinade", chain: "Solana", apy: 6.8, risk: "Medium", deployed: "150 SOL equiv", earned: "$2.12" },
  { protocol: "Beefy", chain: "Polygon", apy: 8.4, risk: "High", deployed: "100 USDT", earned: "$1.35" },
];

const riskBadge = (r: string) => {
  if (r === "Low") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (r === "Medium") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
};

export default function Treasury() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Treasury Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Fund allocation, yield strategies, and sustainability metrics.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Value", value: 12847, prefix: "$", icon: Landmark },
          { label: "Monthly Income", value: 847, prefix: "$", icon: TrendingUp },
          { label: "Sustainability", value: 94, suffix: "%", icon: ShieldCheck },
          { label: "Risk Score", value: 23, suffix: "/100", icon: AlertTriangle },
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

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Allocation */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Fund Allocation</h3>
          <div className="flex h-4 rounded-full overflow-hidden mb-4">
            {allocation.map((a) => (
              <div key={a.name} className={`${a.color}`} style={{ width: `${a.pct}%` }} />
            ))}
          </div>
          <div className="space-y-2.5">
            {allocation.map((a) => (
              <div key={a.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${a.color}`} />
                  <span className="text-xs">{a.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{a.amount}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/60 w-8 text-right">{a.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Active Strategy</h3>
          <div className="rounded-lg bg-accent/30 p-4 mb-4">
            <p className="text-sm font-medium mb-1">Conservative Growth</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Maintain 60% in stable assets, allocate 28% to low-risk yield protocols, keep 12% liquid for operational needs.
              Auto-rebalance when allocation drifts &gt;5% from target. Maximum single-protocol exposure: 40%.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Rebalance Interval", value: "Weekly" },
              { label: "Last Rebalance", value: "2 days ago" },
              { label: "Max Protocol Exposure", value: "40%" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{item.label}</p>
                <p className="text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Yield Opportunities */}
      <div className="rounded-xl border border-border/50 bg-card/50">
        <div className="px-5 py-3 border-b border-border/40">
          <h3 className="text-sm font-semibold">Yield Opportunities</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-5 py-2 font-medium">Protocol</th>
                <th className="text-left px-3 py-2 font-medium">Chain</th>
                <th className="text-center px-3 py-2 font-medium">APY</th>
                <th className="text-center px-3 py-2 font-medium">Risk</th>
                <th className="text-right px-3 py-2 font-medium">Deployed</th>
                <th className="text-right px-5 py-2 font-medium">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {yields.map((y) => (
                <tr key={y.protocol} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-2.5 font-medium text-xs">{y.protocol}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{y.chain}</td>
                  <td className="px-3 py-2.5 text-center text-xs font-mono tabular-nums">{y.apy}%</td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant="outline" className={`text-[9px] ${riskBadge(y.risk)}`}>{y.risk}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">{y.deployed}</td>
                  <td className="px-5 py-2.5 text-right text-xs font-medium" style={{ color: "#50AF95" }}>{y.earned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

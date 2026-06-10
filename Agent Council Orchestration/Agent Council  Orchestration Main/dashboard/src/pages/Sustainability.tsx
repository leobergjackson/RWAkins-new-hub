import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CountUp from "@/components/shared/CountUp";
import { Leaf, Zap, Award, TrendingDown, BarChart3 } from "lucide-react";

const chainEfficiency = [
  { chain: "Base", energyPerTx: "0.008 Wh", co2: "0.004g", grade: "A+", efficient: true },
  { chain: "Arbitrum", energyPerTx: "0.015 Wh", co2: "0.008g", grade: "A", efficient: true },
  { chain: "Ethereum L1", energyPerTx: "0.03 Wh", co2: "0.015g", grade: "B", efficient: true },
  { chain: "Bitso (off-ramp)", energyPerTx: "0.001 Wh", co2: "0.0005g", grade: "A+", efficient: true },
  { chain: "SPEI (MXN rail)", energyPerTx: "0.0005 Wh", co2: "0.0002g", grade: "A+", efficient: true },
  { chain: "Bitcoin", energyPerTx: "707 kWh", co2: "338kg", grade: "D", efficient: false },
];

const gradeBadge = (g: string) => {
  if (g.startsWith("A")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (g === "B") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (g === "C") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
};

export default function Sustainability() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">ESG & Environmental Impact</h1>
        <p className="text-sm text-muted-foreground mt-1">Carbon footprint tracking, chain efficiency, and sustainability scoring.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Sustainability Score", value: 87, suffix: "/100", icon: Leaf },
          { label: "CO2 per Tx (avg)", value: 0.004, suffix: "g", icon: TrendingDown },
          { label: "Total Offset", value: 12, suffix: "kg", icon: Award },
          { label: "Green Tx Ratio", value: 94, suffix: "%", icon: Zap },
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

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Score Gauge */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 flex flex-col items-center justify-center text-center">
          <Leaf className="h-10 w-10 mb-3" strokeWidth={1.5} style={{ color: "#50AF95" }} />
          <p className="text-4xl font-bold tabular-nums" style={{ color: "#50AF95" }}>87</p>
          <Badge variant="outline" className="mt-2 text-sm px-3 py-0.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Grade A</Badge>
          <p className="text-xs text-muted-foreground mt-3 max-w-[200px]">Colibrí routes transfers through Arbitrum + Base — the most energy-efficient L2 settlement layers.</p>
        </div>

        {/* Recommendation */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Green Chain Recommendation</h3>
          <div className="rounded-lg bg-accent/30 p-4 mb-3">
            <p className="text-sm font-medium mb-1">Use Base for small remittances</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Base has the lowest energy consumption per transaction. For transfers under $50, routing through Base reduces carbon impact by 97% vs Ethereum L1.</p>
          </div>
          <div className="rounded-lg bg-accent/30 p-4">
            <p className="text-sm font-medium mb-1">Arbitrum for larger transfers</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Transfers $50–$1000: Arbitrum offers the best balance of cost, speed, and environmental efficiency for USD→MXN remittances.</p>
          </div>
        </div>

        {/* Monthly Report */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <h3 className="text-sm font-semibold">March Report</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Transactions", value: "1,834" },
              { label: "Total Energy", value: "0.047 kWh" },
              { label: "Carbon Equivalent", value: "0.023 kg CO2" },
              { label: "Offset Purchased", value: "0.05 kg CO2" },
              { label: "Net Impact", value: "Carbon Negative" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <span className="text-xs font-medium tabular-nums">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chain Efficiency */}
      <div className="rounded-xl border border-border/50 bg-card/50">
        <div className="px-5 py-3 border-b border-border/40">
          <h3 className="text-sm font-semibold">Chain Efficiency Ranking</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-5 py-2 font-medium">Chain</th>
                <th className="text-center px-3 py-2 font-medium">Energy/Tx</th>
                <th className="text-center px-3 py-2 font-medium">CO2/Tx</th>
                <th className="text-center px-5 py-2 font-medium">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {chainEfficiency.map((c) => (
                <tr key={c.chain} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-2.5 text-xs font-medium">{c.chain}</td>
                  <td className="px-3 py-2.5 text-center text-xs font-mono tabular-nums text-muted-foreground">{c.energyPerTx}</td>
                  <td className="px-3 py-2.5 text-center text-xs font-mono tabular-nums text-muted-foreground">{c.co2}</td>
                  <td className="px-5 py-2.5 text-center">
                    <Badge variant="outline" className={`text-[9px] ${gradeBadge(c.grade)}`}>{c.grade}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

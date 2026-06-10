import { demoAgentStatus, demoTipsPerDay, demoChainDistribution, demoCreators, demoDecisionLog } from "@/lib/demo-data";
import CountUp from "@/components/shared/CountUp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Medal } from "lucide-react";
import { toast } from "sonner";

const decisionColors: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-800/25 text-red-400 border-red-700/40",
  veto: "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse",
  flip: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const statAccents = [
  { border: "#FF4E00", bg: "rgba(255,78,0,0.03)" },
  { border: "#50AF95", bg: "rgba(80,175,149,0.03)" },
  { border: "#3B82F6", bg: "rgba(59,130,246,0.03)" },
  { border: "#EF4444", bg: "rgba(239,68,68,0.03)" },
];

const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function Analytics() {
  const stats = [
    { label: "Transfers Sent", value: demoAgentStatus.stats.tipsSent.value },
    { label: "Total Managed", value: 12847, prefix: "$" },
    { label: "Health Score", value: demoAgentStatus.pulse.healthScore, suffix: "%" },
    { label: "Security Events", value: 6 },
  ];

  const topCreators = Array.isArray(demoCreators) ? demoCreators.slice(0, 5) : [];
  const maxTips = topCreators.length > 0 ? Math.max(...topCreators.map((c) => c.tips)) : 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance metrics, decision logs, and trends.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => toast.success("Analytics exported to CSV")}>
          <Download className="h-3.5 w-3.5 mr-2" />Export
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4 relative overflow-hidden"
            style={{
              borderTop: `2px solid ${statAccents[i].border}`,
              background: `linear-gradient(180deg, ${statAccents[i].bg} 0%, hsl(var(--card)) 60%)`,
            }}
          >
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums">
              {s.prefix}<CountUp target={s.value} />{s.suffix}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-5 relative">
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ boxShadow: "inset 0 0 40px rgba(255,78,0,0.03)" }}
          />
          <h3 className="text-sm font-semibold mb-4 relative z-10">Transfers per Day</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={Array.isArray(demoTipsPerDay) ? demoTipsPerDay : []}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#FF4E00" />
                  <stop offset="100%" stopColor="#FF8C42" />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(240, 5%, 50%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(240, 5%, 50%)" }} axisLine={false} tickLine={false} width={30} />
              <RTooltip
                contentStyle={{ background: "hsl(240, 5%, 9%)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: "hsl(0, 0%, 95%)" }}
              />
              <Bar dataKey="tips" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 relative">
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ boxShadow: "inset 0 0 40px rgba(255,78,0,0.03)" }}
          />
          <h3 className="text-sm font-semibold mb-4 relative z-10">Chain Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={Array.isArray(demoChainDistribution) ? demoChainDistribution : []} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                {(Array.isArray(demoChainDistribution) ? demoChainDistribution : []).map((entry) => (
                  <Cell key={entry.chain} fill={entry.color} />
                ))}
              </Pie>
              <RTooltip
                contentStyle={{ background: "hsl(240, 5%, 9%)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: "hsl(0, 0%, 95%)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center relative z-10">
            {(Array.isArray(demoChainDistribution) ? demoChainDistribution : []).map((c) => (
              <div key={c.chain} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.chain} ({c.value}%)
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Creator Leaderboard + Decision Log */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Recipient Leaderboard</h3>
          </div>
          <div className="divide-y divide-border">
            {topCreators.map((c, i) => (
              <div key={c.id} className="px-5 py-2.5 flex items-center gap-3">
                {i < 3 ? (
                  <Medal className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: medalColors[i] }} />
                ) : (
                  <span className="text-xs text-muted-foreground w-4 tabular-nums text-center">{i + 1}</span>
                )}
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium">{c.avatar}</div>
                <span className="text-sm flex-1 truncate">{c.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,78,0,0.1)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(c.tips / maxTips) * 100}%`, background: "#FF4E00" }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">{c.tips} sent</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Decision Log</h3>
          </div>
          <div className="divide-y divide-border">
            {(Array.isArray(demoDecisionLog) ? demoDecisionLog : []).map((d) => (
              <div key={d.id} className="px-5 py-2.5 flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground font-mono tabular-nums w-10 shrink-0">{d.time}</span>
                <span className="text-sm flex-1 truncate min-w-0">{d.decision}</span>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${decisionColors[d.result] || ""}`}>{d.result}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

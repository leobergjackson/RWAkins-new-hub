import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, PieChart, Download, Clock,
  Zap, Fuel, DollarSign, Activity, CheckCircle2, XCircle,
  Brain, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Area, AreaChart,
} from "recharts";
import { toast } from "sonner";

// ── Demo data generators ────────────────────────────────────────

function generateDailyTransfers() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({
    day,
    tips: Math.floor(Math.random() * 20 + 5),
    amount: Math.round((Math.random() * 50 + 10) * 100) / 100,
  }));
}

function generateConfidenceOverTime() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    confidence: Math.min(0.98, 0.6 + Math.random() * 0.3),
    threshold: 0.7,
  }));
}

function generateResponseTimes() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    responseMs: Math.floor(Math.random() * 800 + 200),
    avgMs: 450,
  }));
}

function generateHealthTrend() {
  let health = 85;
  return Array.from({ length: 7 }, (_, i) => {
    health = Math.max(60, Math.min(100, health + (Math.random() - 0.4) * 5));
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return { day: days[i], health: Math.round(health * 10) / 10 };
  });
}

const APPROVAL_DATA = [
  { name: "Approved", value: 72, color: "#50AF95" },
  { name: "Rejected", value: 18, color: "#EF4444" },
  { name: "Deferred", value: 7, color: "#EAB308" },
  { name: "Vetoed", value: 3, color: "#FF4E00" },
];

interface KPICard {
  label: string;
  value: string;
  change: number;
  icon: typeof TrendingUp;
  color: string;
  suffix?: string;
}

// ── Component ───────────────────────────────────────────────────

export default function AgentPerformance() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");

  const dailyTips = useMemo(() => generateDailyTransfers(), []);
  const confidenceData = useMemo(() => generateConfidenceOverTime(), []);
  const responseData = useMemo(() => generateResponseTimes(), []);
  const healthTrend = useMemo(() => generateHealthTrend(), []);

  const kpis: KPICard[] = [
    { label: "Transfers (7d)", value: "87", change: 12.5, icon: Zap, color: "#FF4E00" },
    { label: "Avg Confidence", value: "0.84", change: 3.2, icon: Brain, color: "#627EEA" },
    { label: "Fee Savings", value: "$14.32", change: 8.1, icon: Fuel, color: "#50AF95" },
    { label: "Yield Earned", value: "$2.87", change: -1.4, icon: DollarSign, color: "#F7931A" },
    { label: "LLM Cost/Decision", value: "$0.002", change: -15.3, icon: TrendingUp, color: "#9945FF" },
    { label: "Agent Uptime", value: "99.7%", change: 0.1, icon: Activity, color: "#35D07F" },
  ];

  const benchmarks = [
    { metric: "Decisions/Day", yours: 47, average: 12, unit: "" },
    { metric: "Avg Confidence", yours: 0.84, average: 0.62, unit: "" },
    { metric: "Approval Rate", yours: 72, average: 58, unit: "%" },
    { metric: "Avg Response", yours: 450, average: 1200, unit: "ms" },
    { metric: "Fee Optimized", yours: 82, average: 35, unit: "%" },
    { metric: "L2s Active", yours: 2, average: 1, unit: "" },
  ];

  const handleExport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      timeRange,
      kpis: kpis.map((k) => ({ label: k.label, value: k.value, change: k.change })),
      dailyTips,
      approvalRates: APPROVAL_DATA,
      benchmarks,
      healthTrend,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-performance-${timeRange}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Performance report exported");
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-orange-500" />
            Agent Performance
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive KPIs and benchmarks for the Colibrí remittance agent
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["24h", "7d", "30d"] as const).map((range) => (
              <button
                key={range}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === range ? "bg-orange-500/20 text-orange-400" : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="border-orange-500/30 hover:bg-orange-500/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.change > 0;
          const isNeutral = Math.abs(kpi.change) < 0.5;
          // For cost metrics, negative change is good
          const isCost = kpi.label.includes("Cost");
          const isGood = isCost ? !isPositive : isPositive;

          return (
            <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-4 w-4" style={{ color: kpi.color }} />
                <div className="flex items-center gap-0.5 text-[10px]">
                  {isNeutral ? (
                    <Minus className="h-3 w-3 text-muted-foreground" />
                  ) : isGood ? (
                    <ArrowUpRight className="h-3 w-3 text-green-400" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-400" />
                  )}
                  <span className={isNeutral ? "text-muted-foreground" : isGood ? "text-green-400" : "text-red-400"}>
                    {Math.abs(kpi.change)}%
                  </span>
                </div>
              </div>
              <p className="text-xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tips per Day */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Transfers Sent Per Day</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTips}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="day" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis tick={{ fill: "#888", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="tips" fill="#FF4E00" radius={[4, 4, 0, 0]} name="Transfers" />
                <Bar dataKey="amount" fill="#50AF95" radius={[4, 4, 0, 0]} name="USDC Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Approval Rate Pie */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Decision Outcomes</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={APPROVAL_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {APPROVAL_DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                />
                <Legend
                  formatter={(value) => <span style={{ color: "#888", fontSize: 11 }}>{value}</span>}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence Over Time */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Confidence Score Over Time</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={confidenceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "#888", fontSize: 10 }}
                  interval={3}
                />
                <YAxis domain={[0.4, 1]} tick={{ fill: "#888", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="#627EEA"
                  strokeWidth={2}
                  dot={false}
                  name="Confidence"
                />
                <Line
                  type="monotone"
                  dataKey="threshold"
                  stroke="#EF4444"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Threshold"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Response Time */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Response Time Per Cycle</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={responseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "#888", fontSize: 10 }}
                  interval={3}
                />
                <YAxis tick={{ fill: "#888", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Area
                  type="monotone"
                  dataKey="responseMs"
                  stroke="#FF4E00"
                  fill="#FF4E0020"
                  strokeWidth={2}
                  name="Response (ms)"
                />
                <Line
                  type="monotone"
                  dataKey="avgMs"
                  stroke="#50AF95"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Avg"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Health Trend + Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Score Trend */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Health Score Trend (7 Days)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="day" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis domain={[50, 100]} tick={{ fill: "#888", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Area
                  type="monotone"
                  dataKey="health"
                  stroke="#35D07F"
                  fill="#35D07F20"
                  strokeWidth={2}
                  name="Health %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Benchmarks */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Your Agent vs Average Agent</h3>
          <div className="space-y-3">
            {benchmarks.map((b) => {
              const yoursNorm = b.metric === "Avg Response" ? 100 - (b.yours / 1500) * 100 : (b.yours / Math.max(b.yours, b.average)) * 100;
              const avgNorm = b.metric === "Avg Response" ? 100 - (b.average / 1500) * 100 : (b.average / Math.max(b.yours, b.average)) * 100;
              const better = b.metric === "Avg Response" ? b.yours < b.average : b.yours > b.average;

              return (
                <div key={b.metric}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{b.metric}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-orange-400 font-mono">
                        {b.yours}{b.unit}
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="text-muted-foreground font-mono">
                        {b.average}{b.unit}
                      </span>
                      {better ? (
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 h-2">
                    <div
                      className="rounded-full transition-all duration-500"
                      style={{
                        width: `${yoursNorm}%`,
                        backgroundColor: "#FF4E00",
                      }}
                    />
                    <div
                      className="rounded-full transition-all duration-500"
                      style={{
                        width: `${avgNorm}%`,
                        backgroundColor: "#444",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-4 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">Your Agent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-[#444]" />
              <span className="text-muted-foreground">Average Agent</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

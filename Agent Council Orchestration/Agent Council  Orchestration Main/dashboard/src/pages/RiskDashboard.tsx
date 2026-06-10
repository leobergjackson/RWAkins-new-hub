import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Activity,
  Lock, Eye, Zap, Bug, Brain, Fingerprint, Globe,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ── Threat categories (from adversarial testing) ──────────────────

interface ThreatCategory {
  id: string;
  name: string;
  icon: typeof Shield;
  status: "safe" | "warning" | "critical";
  score: number;
  description: string;
  lastTested: string;
}

const THREAT_CATEGORIES: ThreatCategory[] = [
  { id: "overflow", name: "Amount Overflow", icon: AlertTriangle, status: "safe", score: 98, description: "Integer overflow & underflow attacks on transfer amounts", lastTested: "2m ago" },
  { id: "replay", name: "Replay Attack", icon: Lock, status: "safe", score: 95, description: "Duplicate transaction submission prevention", lastTested: "5m ago" },
  { id: "injection", name: "Prompt Injection", icon: Bug, status: "safe", score: 97, description: "LLM prompt injection via user inputs", lastTested: "3m ago" },
  { id: "sybil", name: "Sybil Attack", icon: Fingerprint, status: "safe", score: 92, description: "Fake identity & multi-account exploits", lastTested: "8m ago" },
  { id: "frontrun", name: "Front-Running", icon: Zap, status: "warning", score: 78, description: "MEV sandwich & front-running detection", lastTested: "1m ago" },
  { id: "reentrancy", name: "Reentrancy", icon: Activity, status: "safe", score: 96, description: "Smart contract reentrancy protection", lastTested: "4m ago" },
  { id: "phishing", name: "Phishing", icon: Eye, status: "safe", score: 94, description: "Address spoofing & phishing detection", lastTested: "6m ago" },
  { id: "dos", name: "DoS / Rate Limit", icon: Globe, status: "safe", score: 99, description: "Denial-of-service & rate limit bypass", lastTested: "1m ago" },
  { id: "oracle", name: "Oracle Manipulation", icon: Brain, status: "warning", score: 82, description: "Price feed manipulation & stale data", lastTested: "10m ago" },
  { id: "governance", name: "Governance Attack", icon: Shield, status: "safe", score: 91, description: "Voting manipulation & proposal spam", lastTested: "7m ago" },
  { id: "draining", name: "Wallet Draining", icon: ShieldAlert, status: "safe", score: 99, description: "Unauthorized fund transfer attempts", lastTested: "30s ago" },
  { id: "social", name: "Social Engineering", icon: Eye, status: "safe", score: 93, description: "Identity impersonation & trust exploitation", lastTested: "12m ago" },
];

// ── Chain risk heatmap data ───────────────────────────────────────

const CHAIN_RISKS = [
  { chain: "Arbitrum", risk: 14, txCount: 2341, blocked: 1 },
  { chain: "Base", risk: 12, txCount: 1892, blocked: 0 },
  { chain: "Bitso MXN", risk: 8, txCount: 987, blocked: 0 },
  { chain: "SPEI Rail", risk: 5, txCount: 645, blocked: 0 },
  { chain: "Ethereum L1", risk: 22, txCount: 234, blocked: 2 },
  { chain: "Bridge ARB", risk: 18, txCount: 423, blocked: 1 },
];

// ── Alert feed ────────────────────────────────────────────────────

const ALERTS = [
  { id: 1, type: "blocked", message: "Blocked suspicious tx: amount overflow attempt ($999,999)", time: "30s ago", severity: "critical" },
  { id: 2, type: "warning", message: "Front-running risk detected on Arbitrum — delayed execution by 2 blocks", time: "2m ago", severity: "warning" },
  { id: 3, type: "blocked", message: "Rate limit exceeded: 45 requests in 10s from 192.168.1.42", time: "5m ago", severity: "critical" },
  { id: 4, type: "info", message: "Bitso FX rate refreshed — USD/MXN deviation within 0.3% tolerance", time: "8m ago", severity: "info" },
  { id: 5, type: "blocked", message: "Phishing address detected: 0x7f2e...3a4b flagged by community", time: "12m ago", severity: "critical" },
  { id: 6, type: "warning", message: "Unusual Arbitrum gas spike — routing next transfer via Base", time: "15m ago", severity: "warning" },
  { id: 7, type: "info", message: "Guardian multi-agent consensus: 3/3 approved remittance batch #1834", time: "18m ago", severity: "info" },
  { id: 8, type: "blocked", message: "Replay attack prevented — duplicate nonce rejected", time: "22m ago", severity: "critical" },
];

// ── Guardian veto rate data ───────────────────────────────────────

const VETO_DATA = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}:00`,
  approved: 40 + Math.round(Math.random() * 20),
  vetoed: Math.round(Math.random() * 5),
}));

// ── Portfolio health vs risk ──────────────────────────────────────

const HEALTH_VS_RISK = Array.from({ length: 14 }, (_, i) => ({
  day: `Mar ${12 + i}`,
  health: 75 + Math.round(Math.sin(i * 0.5) * 15 + Math.random() * 5),
  risk: 20 + Math.round(Math.cos(i * 0.7) * 12 + Math.random() * 8),
}));

// ── Radar chart data ──────────────────────────────────────────────

const RADAR_DATA = THREAT_CATEGORIES.slice(0, 8).map((t) => ({
  category: t.name.split(" ")[0],
  score: t.score,
  fullMark: 100,
}));

export default function RiskDashboard() {
  const [riskAppetite, setRiskAppetite] = useState(35);

  const overallScore = useMemo(
    () => Math.round(THREAT_CATEGORIES.reduce((sum, t) => sum + t.score, 0) / THREAT_CATEGORIES.length),
    []
  );

  const totalBlocked = useMemo(
    () => CHAIN_RISKS.reduce((sum, c) => sum + c.blocked, 0),
    []
  );

  const statusColor = (s: string) =>
    s === "safe" ? "text-emerald-400" : s === "warning" ? "text-amber-400" : "text-red-400";
  const statusBg = (s: string) =>
    s === "safe" ? "bg-emerald-500/15 border-emerald-500/30" : s === "warning" ? "bg-amber-500/15 border-amber-500/30" : "bg-red-500/15 border-red-500/30";

  const sevColor = (s: string) =>
    s === "critical" ? "text-red-400" : s === "warning" ? "text-amber-400" : "text-blue-400";

  // Gauge arc
  const gaugeArc = (score: number) => {
    const pct = score / 100;
    const startAngle = -135;
    const endAngle = startAngle + pct * 270;
    const r = 50;
    const cx = 60, cy = 60;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const largeArc = pct * 270 > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const scoreColor = overallScore >= 90 ? "#22c55e" : overallScore >= 70 ? "#eab308" : "#ef4444";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Risk Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time threat monitoring across 12 categories, Arbitrum + Base, and guardian consensus.
        </p>
      </div>

      {/* Top row: Overall score + stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Gauge */}
        <Card className="border-border/50">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <svg viewBox="0 0 120 100" className="w-32 h-24">
              <path
                d={gaugeArc(100)}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-muted/20"
              />
              <path
                d={gaugeArc(overallScore)}
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
              />
              <text x="60" y="65" textAnchor="middle" fill={scoreColor} fontSize="22" fontWeight="bold">
                {overallScore}
              </text>
              <text x="60" y="80" textAnchor="middle" fill="#888" fontSize="8">
                Overall Risk Score
              </text>
            </svg>
            <Badge className={`mt-1 ${overallScore >= 90 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
              {overallScore >= 90 ? "Low Risk" : overallScore >= 70 ? "Medium Risk" : "High Risk"}
            </Badge>
          </CardContent>
        </Card>

        {/* Stats */}
        {[
          { label: "Threats Blocked", value: totalBlocked, icon: ShieldAlert, color: "text-red-400" },
          { label: "Categories Safe", value: `${THREAT_CATEGORIES.filter((t) => t.status === "safe").length}/${THREAT_CATEGORIES.length}`, icon: ShieldCheck, color: "text-emerald-400" },
          { label: "Guardian Vetoes", value: VETO_DATA.reduce((s, d) => s + d.vetoed, 0), icon: Shield, color: "text-amber-400" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Threat categories */}
      <Card className="border-border/50 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#FF4E00]" />
            12 Threat Categories (Adversarial Tested)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {THREAT_CATEGORIES.map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.id}
                  className={`p-3 rounded-lg border ${statusBg(t.status)} transition-all hover:scale-[1.02]`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`h-4 w-4 ${statusColor(t.status)}`} />
                    <span className="text-xs font-medium">{t.name}</span>
                    <Badge variant="outline" className={`ml-auto text-[9px] ${statusColor(t.status)}`}>
                      {t.score}/100
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-2">{t.description}</div>
                  <div className="h-1.5 bg-background/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${t.score}%`,
                        backgroundColor: t.status === "safe" ? "#22c55e" : t.status === "warning" ? "#eab308" : "#ef4444",
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-muted-foreground/60 mt-1">Tested {t.lastTested}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Middle row: heatmap + radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Chain risk heatmap */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Chain Risk Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {CHAIN_RISKS.map((c) => {
                const hue = c.risk < 20 ? 142 : c.risk < 30 ? 48 : 0;
                const sat = Math.min(80, c.risk * 2);
                return (
                  <div
                    key={c.chain}
                    className="p-3 rounded-lg border border-border/20 text-center transition-all hover:scale-105"
                    style={{ backgroundColor: `hsla(${hue}, ${sat}%, 50%, 0.15)` }}
                  >
                    <div className="text-xs font-medium">{c.chain}</div>
                    <div className="text-lg font-bold" style={{ color: `hsl(${hue}, ${sat}%, 60%)` }}>
                      {c.risk}
                    </div>
                    <div className="text-[9px] text-muted-foreground">{c.txCount} txs &middot; {c.blocked} blocked</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Radar chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Threat Coverage Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "#888", fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#666", fontSize: 9 }} />
                <Radar name="Score" dataKey="score" stroke="#FF4E00" fill="#FF4E00" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alert feed + Risk appetite */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Alert feed */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Threat Alert Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-auto">
              {ALERTS.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/5 border border-border/10">
                  {alert.type === "blocked" ? (
                    <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  ) : alert.type === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs">{alert.message}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{alert.time}</span>
                      <Badge variant="outline" className={`text-[8px] ${sevColor(alert.severity)}`}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk appetite */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Risk Appetite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Conservative</span>
                <span className="text-xs font-bold">{riskAppetite}%</span>
                <span className="text-xs text-muted-foreground">Aggressive</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={riskAppetite}
                onChange={(e) => setRiskAppetite(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#FF4E00]"
                style={{
                  background: `linear-gradient(90deg, #22c55e ${riskAppetite}%, #333 ${riskAppetite}%)`,
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <div>Max single transfer: <span className="text-foreground font-medium">${(riskAppetite * 2).toFixed(0)} USDC</span></div>
              <div>Max daily spend: <span className="text-foreground font-medium">${(riskAppetite * 10).toFixed(0)} USDC</span></div>
              <div>Auto-pause threshold: <span className="text-foreground font-medium">{100 - riskAppetite}% drawdown</span></div>
              <div>Guardian strictness: <span className="text-foreground font-medium">{riskAppetite < 30 ? "Maximum" : riskAppetite < 60 ? "Standard" : "Relaxed"}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom charts: veto rate + health vs risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guardian veto rate */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Guardian Veto Rate (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={VETO_DATA}>
                <XAxis dataKey="hour" tick={{ fill: "#888", fontSize: 9 }} interval={3} />
                <YAxis tick={{ fill: "#888", fontSize: 9 }} />
                <ReTooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="approved" fill="#22c55e80" radius={[2, 2, 0, 0]} name="Approved" />
                <Bar dataKey="vetoed" fill="#ef444480" radius={[2, 2, 0, 0]} name="Vetoed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Portfolio health vs risk */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Portfolio Health vs Risk Correlation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={HEALTH_VS_RISK}>
                <XAxis dataKey="day" tick={{ fill: "#888", fontSize: 9 }} interval={2} />
                <YAxis tick={{ fill: "#888", fontSize: 9 }} />
                <ReTooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="health" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} name="Health" />
                <Area type="monotone" dataKey="risk" stroke="#ef4444" fill="#ef444420" strokeWidth={2} name="Risk" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

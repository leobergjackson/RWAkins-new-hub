import { useUptime } from "@/hooks/useUptime";
import { useFetch } from "@/hooks/useFetch";
import { useWebSocket } from "@/hooks/useWebSocket";
import { demoAgentStatus, demoWallets } from "@/lib/demo-data";
import CountUp from "@/components/shared/CountUp";
import CopyButton from "@/components/shared/CopyButton";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";
import {
  SendHorizontal, Lock, Smile, Meh, TrendingUp, Brain,
  Package, Globe, CheckCircle, Terminal, Wrench, LayoutDashboard,
  Play, Eye, Pause, Square, RotateCcw, Shield, Wifi, WifiOff, ClipboardCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type LucideIcon } from "lucide-react";

/* ── Decision feed data ── */
const decisionFeed = [
  { time: "14:32", icon: "✅", text: "APPROVED $200 → María (Base · $0.01 fee · 87% confidence)", color: "#50AF95" },
  { time: "14:31", icon: "🛡️", text: "GUARDIAN VETO: unknown recipient, 0 history", color: "#EF4444" },
  { time: "14:30", icon: "🔄", text: "FLIP: TreasuryOptimizer changed reject→approve", color: "#627EEA" },
  { time: "14:29", icon: "⏭️", text: "SKIPPED: recipient liquidity below threshold", color: "#666" },
  { time: "14:27", icon: "✅", text: "APPROVED $500 → Carlos (Arbitrum · $0.04 fee · 91% confidence)", color: "#50AF95" },
  { time: "14:25", icon: "🔀", text: "ROUTER: Base cheaper than Arbitrum ($0.01 vs $0.04)", color: "#50AF95" },
  { time: "14:22", icon: "🛡️", text: "GUARDIAN VETO: $600 exceeds daily transfer limit", color: "#EF4444" },
  { time: "14:20", icon: "⏭️", text: "SKIPPED: new recipient pending KYC verification", color: "#666" },
];

/* ── Chain balances for portfolio bar ── */
const chainSegments = [
  { chain: "USDC (Arbitrum)", color: "#28A0F0", pct: 58, bal: "7,451.32" },
  { chain: "USDC (Base)", color: "#0052FF", pct: 42, bal: "5,396.00" },
];

const moodColors: Record<string, string> = { optimistic: "#FF4E00", cautious: "#627EEA", strategic: "#50AF95" };
const moodIcons: Record<string, LucideIcon> = { optimistic: Smile, cautious: Meh, strategic: TrendingUp };

const innovationCards = [
  { icon: CheckCircle, value: 1183, label: "Tests" },
  { icon: Globe, value: 2, label: "L2 Networks" },
  { icon: Brain, value: 4, label: "AI Agents" },
  { icon: ClipboardCheck, value: 8, label: "Pipeline Stages" },
  { icon: Terminal, value: 90, label: "Avg Settlement (s)" },
  { icon: Package, value: 1, label: "Avg Fee (USD)" },
  { icon: LayoutDashboard, value: 42, label: "Dashboard Pages" },
];

/* ── Blinking cursor component ── */
function BlinkingCursor() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, []);
  return <span className={visible ? "opacity-100" : "opacity-0"}>█</span>;
}

interface DecisionEntry {
  time: string;
  icon: string;
  text: string;
  color: string;
}

interface TipNotification {
  id: string;
  message: string;
  timestamp: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const uptime = useUptime();
  const { data: agent, isDemo } = useFetch("/api/agent/status", demoAgentStatus);
  const { isConnected, subscribe } = useWebSocket();

  // Real-time decision feed — starts with static data, appends live events
  const [liveDecisions, setLiveDecisions] = useState<DecisionEntry[]>(decisionFeed);
  // Real-time tip notifications
  const [tipNotifications, setTipNotifications] = useState<TipNotification[]>([]);

  // Subscribe to agent:decision events
  useEffect(() => {
    return subscribe("agent:decision", (data: unknown) => {
      const d = data as { text?: string; icon?: string; color?: string };
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setLiveDecisions((prev) => [
        { time, icon: d.icon || "⚡", text: d.text || "Decision received", color: d.color || "#50AF95" },
        ...prev.slice(0, 19),
      ]);
    });
  }, [subscribe]);

  // Subscribe to tip:sent events
  useEffect(() => {
    return subscribe("tip:sent", (data: unknown) => {
      const d = data as { recipient?: string; amount?: string; chain?: string };
      const id = `tip-${Date.now()}`;
      const message = `Transfer ${d.amount || "?"} sent to ${(d.recipient || "?").slice(0, 12)}... on ${d.chain || "?"}`;
      setTipNotifications((prev) => [
        { id, message, timestamp: new Date().toISOString() },
        ...prev.slice(0, 4),
      ]);
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setTipNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 8000);
    });
  }, [subscribe]);

  const moodType = agent?.mood?.moodType || agent?.loop?.walletMood?.mood || "optimistic";
  const MoodIcon = moodIcons[moodType] || Smile;
  const moodGlow = moodColors[moodType] || "#FF4E00";

  const pulse = agent?.pulse || agent?.loop?.financialPulse || { liquidity: 50, diversification: 0, velocity: 40, healthScore: 35 };
  const radarData = [
    { axis: "Liquidity", value: pulse.liquidity ?? pulse.liquidityScore ?? 50 },
    { axis: "Diversification", value: pulse.diversification ?? pulse.diversificationScore ?? 0 },
    { axis: "Velocity", value: pulse.velocity ?? pulse.velocityScore ?? 40 },
    { axis: "Health", value: pulse.healthScore ?? 35 },
  ];

  return (
    <div className="relative space-y-8">
      {/* Grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor, control, and interact with your autonomous agent</p>
        </div>
        <div className="flex items-center gap-2">
          {/* WebSocket connection indicator */}
          <Badge
            variant="outline"
            className={`text-[10px] uppercase tracking-wider gap-1 ${
              isConnected
                ? "border-emerald-500/40 text-emerald-400"
                : "border-red-500/40 text-red-400"
            }`}
          >
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? "Live" : "Offline"}
          </Badge>
          {isDemo && (
            <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-500 uppercase tracking-wider">
              Demo Mode
            </Badge>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ROW 1: AGENT STATUS ORB + PORTFOLIO (40/60)
         ═══════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* LEFT: Agent Status Orb */}
        <div className="lg:col-span-5 rounded-xl bg-card border border-border p-6 flex flex-col items-center text-center">
          {/* Breathing orb */}
          <div className="relative mb-5">
            <div
              className="h-20 w-20 rounded-full"
              style={{
                background: `radial-gradient(circle, ${agent?.online ?? agent?.loop?.running ?? false ? "#50AF9544" : "#66666644"} 0%, transparent 70%)`,
                boxShadow: `0 0 40px ${agent?.online ?? agent?.loop?.running ?? false ? "#50AF9522" : "#66666622"}, 0 0 80px ${agent?.online ?? agent?.loop?.running ?? false ? "#50AF9511" : "#66666611"}`,
                animation: agent?.online ?? agent?.loop?.running ?? false ? "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite" : "none",
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="h-10 w-10 rounded-full"
                style={{ background: agent?.online ?? agent?.loop?.running ?? false ? "#50AF95" : "#666", boxShadow: `0 0 20px ${agent?.online ?? agent?.loop?.running ?? false ? "#50AF9566" : "#66666666"}` }}
              />
            </div>
          </div>

          <h3 className="text-base font-bold">Colibrí Agent</h3>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            {agent?.online ?? agent?.loop?.running ?? false ? `Running — Cycle #${agent?.stats?.cyclesRun?.value || agent?.loop?.currentCycle || 0}` : "Stopped"}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">{uptime}</span>
            <span className="w-px h-3 bg-border" />
            <span className="tabular-nums">{agent?.stats?.tipsSent?.value || agent?.loop?.tipsExecuted || 0} transfers</span>
            <span className="w-px h-3 bg-border" />
            <Badge variant="outline" className="text-[10px] px-2 py-0" style={{ borderColor: `${moodGlow}66`, color: moodGlow }}>
              {agent?.mood?.name || moodType}
            </Badge>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-5">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground">
              <Pause className="h-3 w-3" /> Pause
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-emerald-400 border-emerald-500/30">
              <RotateCcw className="h-3 w-3" /> Resume
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-red-400 border-red-500/30">
              <Square className="h-3 w-3" /> Stop
            </Button>
          </div>
        </div>

        {/* RIGHT: Portfolio Overview */}
        <div className="lg:col-span-7 rounded-xl bg-card border border-border p-6">
          {/* Balance header */}
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-3xl font-bold tabular-nums tracking-tight">{agent?.balance || "$0.00"}</span>
            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
              +2.3% 24h
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-5">USDC treasury across Arbitrum + Base</p>

          {/* Chain balance bar */}
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
            {chainSegments.map((seg) => (
              <div
                key={seg.chain}
                className="h-full transition-all duration-500"
                style={{ width: `${seg.pct}%`, background: seg.color }}
                title={`${seg.chain}: ${seg.pct}%`}
              />
            ))}
          </div>

          {/* Chain chips */}
          <div className="flex flex-wrap gap-2">
            {chainSegments.map((seg) => (
              <div
                key={seg.chain}
                className="flex items-center gap-1.5 bg-secondary/50 rounded-lg px-2.5 py-1.5 text-xs"
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: seg.color }} />
                <span className="font-medium">{seg.chain}</span>
                <span className="text-muted-foreground font-mono tabular-nums text-[11px]">{seg.bal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ROW 2: BRAIN | DECISIONS | ACTIONS
         ═══════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* LEFT: Wallet-as-Brain™ */}
        <div
          className="lg:col-span-4 rounded-xl bg-card border border-border p-5 cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          style={{ borderColor: `${moodGlow}33` }}
          onClick={() => navigate("/wallet-brain")}
          title="Open Wallet-as-Brain details"
        >
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold">Route Intelligence™</h3>
            <Eye className="h-3 w-3 text-muted-foreground/50 ml-auto" />
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">Treasury state drives routing decisions</p>

          {/* Radar chart */}
          <div className="h-48 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="hsl(240 4% 16%)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "hsl(240 5% 50%)", fontSize: 10 }}
                />
                <Radar
                  dataKey="value"
                  stroke="#FF4E00"
                  fill="#FF4E00"
                  fillOpacity={0.2}
                  strokeWidth={1.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Mood badge */}
          <div className="flex items-center justify-center gap-2 mt-2 mb-3">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center"
              style={{ background: `${moodGlow}22` }}
            >
              <MoodIcon className="h-4 w-4" style={{ color: moodGlow }} />
            </div>
            <span className="text-sm font-semibold">{agent?.mood?.name || moodType}</span>
            <Badge variant="outline" className="text-[10px]" style={{ borderColor: `${moodGlow}44`, color: moodGlow }}>
              ×{agent?.mood?.multiplier || 1.0}
            </Badge>
          </div>

          <p className="text-[10px] text-center text-muted-foreground mb-2">Driving 8 pipeline stages</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {["Route: Base", "Fee: $0.01", "KYC: on"].map((tag) => (
              <span key={tag} className="text-[10px] font-mono bg-secondary text-muted-foreground px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* CENTER: Live Decision Stream */}
        <div className="lg:col-span-4 rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between" style={{ background: "#0d0d0d" }}>
            <div className="flex items-center gap-2">
              <span className="flex gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              </span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                Agent Decision Log (Live)
              </span>
            </div>
          </div>
          <div
            className="p-4 font-mono text-xs space-y-2 overflow-y-auto"
            style={{ background: "#0d0d0d", height: 280 }}
          >
            {liveDecisions.map((d, i) => (
              <div key={i} className="flex gap-2 leading-relaxed">
                <span className="text-muted-foreground/50 shrink-0 tabular-nums">{d.time}</span>
                <span className="shrink-0">{d.icon}</span>
                <span style={{ color: d.color }}>{d.text}</span>
              </div>
            ))}
            <div className="text-muted-foreground/40 mt-2">
              <span className="text-muted-foreground/50">{">"}</span>{" "}
              <BlinkingCursor />
            </div>
          </div>
        </div>

        {/* RIGHT: Quick Actions */}
        <div className="lg:col-span-4 rounded-xl bg-card border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold">Command Panel</h3>

          <div className="grid grid-cols-2 gap-2.5">
            {([
              { route: "/tips", icon: SendHorizontal, accent: "#FF4E00", title: "Send Money", desc: "USD→MXN via Arbitrum or Base" },
              { route: "/escrow", icon: Lock, accent: "#50AF95", title: "New Recipient", desc: "Add & verify a MXN recipient" },
              { route: "/reasoning", icon: Brain, accent: "#9945FF", title: "Watch Agent Think", desc: "Live ReAct reasoning stream" },
              { route: "/demo", icon: Play, accent: "#627EEA", title: "Run Full Demo", desc: "10-step guided walkthrough" },
            ] as const).map((card) => {
              const CardIcon = card.icon;
              return (
                <button
                  key={card.route}
                  onClick={() => navigate(card.route)}
                  className="group text-left rounded-xl p-3.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.borderColor = `${card.accent}44`;
                    e.currentTarget.style.boxShadow = `0 0 20px ${card.accent}11`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${card.accent}18` }}
                    >
                      <CardIcon className="h-4 w-4" style={{ color: card.accent }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold mb-0.5">{card.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug">{card.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Terminal code blocks */}
          <div className="space-y-2 pt-1">
            <div
              className="relative rounded-lg p-3 font-mono text-xs"
              style={{ background: "#0d0d0d", borderLeft: "2px solid #50AF95" }}
            >
              <code>
                <span className="text-muted-foreground/50">$ </span>
                <span style={{ color: "#50AF95" }}>git clone https://github.com/agdanish/ETHMexico.git</span>
              </code>
              <div className="absolute top-2 right-2">
                <CopyButton text="git clone https://github.com/agdanish/ETHMexico.git" />
              </div>
            </div>
            <div
              className="relative rounded-lg p-3 font-mono text-xs"
              style={{ background: "#0d0d0d", borderLeft: "2px solid #50AF95" }}
            >
              <code>
                <span className="text-muted-foreground/50">$ </span>
                <span style={{ color: "#50AF95" }}>cd ETHMexico && npm run dev</span>
              </code>
              <div className="absolute top-2 right-2">
                <CopyButton text="cd ETHMexico && npm run dev" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ROW 3: INNOVATION STRIP
         ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {innovationCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="group rounded-xl bg-card border border-border p-4 text-center transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
            >
              <Icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
              <div className="text-lg font-bold tabular-nums">
                <CountUp target={card.value} />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Real-time tip notifications (bottom-right toast area) ── */}
      {tipNotifications.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
          {tipNotifications.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border border-emerald-500/30 bg-card/95 backdrop-blur-sm px-4 py-3 text-xs shadow-lg animate-in slide-in-from-right-5 fade-in duration-300"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-emerald-400 font-medium">{n.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useFetch } from "@/hooks/useFetch";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";
import { Brain, Heart, Zap, Shield, TrendingUp, RefreshCw, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/hooks/useFetch";

/* ── Types ─────────────────────────────────────────────── */
type BrainMood = "generous" | "strategic" | "cautious" | "survival";

interface BrainState {
  health: number;
  mood: BrainMood;
  liquidity: number;
  diversification: number;
  velocity: number;
  riskAppetite: number;
  maxTipUsdt: number;
  policy: string;
  timestamp: string;
}

interface BrainTransition {
  from: BrainMood;
  to: BrainMood;
  health: number;
  reason: string;
  timestamp: string;
}

/* ── Constants ─────────────────────────────────────────── */

const MOOD_COLORS: Record<BrainMood, string> = {
  generous: "#22c55e",
  strategic: "#3b82f6",
  cautious: "#eab308",
  survival: "#ef4444",
};

const MOOD_GLOW: Record<BrainMood, string> = {
  generous: "0 0 80px #22c55e44, 0 0 160px #22c55e22",
  strategic: "0 0 80px #3b82f644, 0 0 160px #3b82f622",
  cautious: "0 0 80px #eab30844, 0 0 160px #eab30822",
  survival: "0 0 80px #ef444444, 0 0 160px #ef444422",
};

const MOOD_LABELS: Record<BrainMood, string> = {
  generous: "Generous",
  strategic: "Strategic",
  cautious: "Cautious",
  survival: "Survival",
};

const MOOD_DESCRIPTIONS: Record<BrainMood, string> = {
  generous: "Send transfers aggressively, explore new beneficiaries, maximize remittance throughput",
  strategic: "Selective transfers, fee optimization, favor proven recipients",
  cautious: "Conservation mode, essential transfers only, minimize gas spend",
  survival: "EMERGENCY -- no transfers, consolidate funds, alert user",
};

const demoBrainState: BrainState = {
  health: 72,
  mood: "strategic",
  liquidity: 68,
  diversification: 44,
  velocity: 35,
  riskAppetite: 58,
  maxTipUsdt: 2,
  policy: "Selective transfers, fee optimization, favor proven recipients",
  timestamp: new Date().toISOString(),
};

const demoHistory = {
  transitions: [
    { from: "generous" as BrainMood, to: "strategic" as BrainMood, health: 65, reason: "Liquidity dropped below 70 — switching to selective remittance mode", timestamp: new Date(Date.now() - 3600000).toISOString() },
    { from: "strategic" as BrainMood, to: "cautious" as BrainMood, health: 38, reason: "Health dropped to 38 after large escrow commitment", timestamp: new Date(Date.now() - 7200000).toISOString() },
    { from: "cautious" as BrainMood, to: "strategic" as BrainMood, health: 55, reason: "Funds replenished from pending transfers resolved", timestamp: new Date(Date.now() - 5400000).toISOString() },
    { from: "strategic" as BrainMood, to: "generous" as BrainMood, health: 85, reason: "Arbitrum + Base diversification improved, health above 80", timestamp: new Date(Date.now() - 1800000).toISOString() },
    { from: "generous" as BrainMood, to: "strategic" as BrainMood, health: 72, reason: "Transfer velocity spike detected — tempering throughput", timestamp: new Date(Date.now() - 600000).toISOString() },
  ] as BrainTransition[],
  stateSnapshots: [],
};

/* ── Pulsing Brain SVG ─────────────────────────────────── */

function BrainVisualization({ mood, health }: { mood: BrainMood; health: number }) {
  const color = MOOD_COLORS[mood];
  const pulseSpeed = mood === "survival" ? "0.8s" : mood === "cautious" ? "2s" : mood === "strategic" ? "3s" : "4s";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
      {/* Outer glow rings */}
      <div
        className="absolute rounded-full"
        style={{
          width: 280, height: 280,
          background: `radial-gradient(circle, ${color}08 0%, transparent 70%)`,
          animation: `brainPulse ${pulseSpeed} ease-in-out infinite`,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 220, height: 220,
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          animation: `brainPulse ${pulseSpeed} ease-in-out infinite`,
          animationDelay: "0.3s",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 160, height: 160,
          background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
          animation: `brainPulse ${pulseSpeed} ease-in-out infinite`,
          animationDelay: "0.6s",
        }}
      />

      {/* Neural network lines */}
      <svg className="absolute" width="280" height="280" viewBox="0 0 280 280" style={{ opacity: 0.3 }}>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x1 = 140 + Math.cos(angle) * 40;
          const y1 = 140 + Math.sin(angle) * 40;
          const x2 = 140 + Math.cos(angle) * 110;
          const y2 = 140 + Math.sin(angle) * 110;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="4 4"
              style={{
                animation: `neuralFlow 2s linear infinite`,
                animationDelay: `${i * 0.25}s`,
              }}
            />
          );
        })}
        {/* Neural nodes at endpoints */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x = 140 + Math.cos(angle) * 110;
          const y = 140 + Math.sin(angle) * 110;
          return (
            <circle
              key={`node-${i}`}
              cx={x} cy={y} r="3"
              fill={color}
              style={{
                animation: `nodePulse 2s ease-in-out infinite`,
                animationDelay: `${i * 0.25}s`,
              }}
            />
          );
        })}
      </svg>

      {/* Center brain icon */}
      <div
        className="relative z-10 rounded-full flex items-center justify-center"
        style={{
          width: 96, height: 96,
          background: `linear-gradient(135deg, ${color}30, ${color}10)`,
          border: `2px solid ${color}50`,
          boxShadow: MOOD_GLOW[mood],
        }}
      >
        <Brain className="h-12 w-12" style={{ color }} strokeWidth={1.5} />
      </div>

      {/* Health ring */}
      <svg className="absolute" width="120" height="120" viewBox="0 0 120 120" style={{ zIndex: 10 }}>
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(health / 100) * 339.3} 339.3`}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dasharray 1s ease-out" }}
        />
      </svg>
    </div>
  );
}

/* ── Health Gauge ──────────────────────────────────────── */

function HealthGauge({ health, mood }: { health: number; mood: BrainMood }) {
  const color = MOOD_COLORS[mood];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-full h-4 rounded-full overflow-hidden bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${health}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 12px ${color}44`,
          }}
        />
        {/* Threshold markers */}
        <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: "25%" }} />
        <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: "50%" }} />
        <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: "80%" }} />
      </div>
      <div className="flex justify-between w-full text-[9px] text-muted-foreground uppercase tracking-wider">
        <span>Survival</span>
        <span>Cautious</span>
        <span>Strategic</span>
        <span>Generous</span>
      </div>
    </div>
  );
}

/* ── Dimension Card ───────────────────────────────────── */

function DimensionCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Heart;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
        <span className="text-sm text-muted-foreground font-normal">/100</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────── */

export default function WalletBrain() {
  const { data: brainState, isDemo } = useFetch<BrainState>("/api/brain/state", demoBrainState);
  const { data: historyData } = useFetch<{ transitions: BrainTransition[]; stateSnapshots: never[] }>(
    "/api/brain/history",
    demoHistory,
  );
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastPulse, setLastPulse] = useState(0);

  // Simulate heartbeat counter
  useEffect(() => {
    const id = setInterval(() => setLastPulse((p) => p + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const handleRecalculate = useCallback(async () => {
    setIsRecalculating(true);
    try {
      await fetch(`${API_BASE}/api/brain/recalculate`, { method: "POST" });
    } catch {
      // will fall back to demo
    }
    setIsRecalculating(false);
  }, []);

  const mood = brainState.mood;
  const moodColor = MOOD_COLORS[mood];

  const radarData = [
    { axis: "Liquidity", value: brainState.liquidity },
    { axis: "Diversification", value: brainState.diversification },
    { axis: "Velocity", value: brainState.velocity },
    { axis: "Risk Appetite", value: brainState.riskAppetite },
  ];

  const transitions = historyData?.transitions ?? demoHistory.transitions;

  return (
    <div className="relative space-y-8">
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes brainPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.7; }
        }
        @keyframes neuralFlow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -16; }
        }
        @keyframes nodePulse {
          0%, 100% { opacity: 0.4; r: 3; }
          50% { opacity: 1; r: 5; }
        }
        @keyframes moodShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

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
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6" style={{ color: moodColor }} strokeWidth={1.5} />
            <h1 className="text-2xl font-bold tracking-tight">Wallet-as-Brain</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            The wallet IS the brain. Financial state drives agent cognition in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] uppercase tracking-wider gap-1"
            style={{ borderColor: `${moodColor}44`, color: moodColor }}
          >
            <Activity className="h-3 w-3" />
            {60 - (lastPulse % 60)}s to next heartbeat
          </Badge>
          {isDemo && (
            <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-500 uppercase tracking-wider">
              Demo Mode
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-3 w-3 ${isRecalculating ? "animate-spin" : ""}`} />
            Recalculate
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          ROW 1: BRAIN VISUALIZATION + MOOD + HEALTH
         ═══════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* LEFT: Brain Orb */}
        <div className="lg:col-span-5 rounded-2xl bg-card border border-border p-8 flex flex-col items-center text-center">
          <BrainVisualization mood={mood} health={brainState.health} />

          {/* Mood label */}
          <div className="mt-6 flex items-center gap-3">
            <div
              className="px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider"
              style={{
                color: moodColor,
                background: `${moodColor}15`,
                border: `1px solid ${moodColor}30`,
              }}
            >
              {MOOD_LABELS[mood]}
            </div>
            <span className="text-2xl font-bold tabular-nums" style={{ color: moodColor }}>
              {brainState.health}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-3 max-w-xs">
            {MOOD_DESCRIPTIONS[mood]}
          </p>

          {/* Max transfer indicator */}
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Max transfer:</span>
            <span className="font-bold tabular-nums" style={{ color: moodColor }}>
              {brainState.maxTipUsdt === 0 ? "BLOCKED" : `${brainState.maxTipUsdt} USDC`}
            </span>
          </div>

          {/* Tagline */}
          <div
            className="mt-6 text-[10px] uppercase tracking-[0.2em] font-medium"
            style={{
              background: `linear-gradient(90deg, transparent, ${moodColor}88, transparent)`,
              backgroundSize: "200% auto",
              animation: "moodShimmer 3s linear infinite",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            The wallet IS the brain
          </div>
        </div>

        {/* RIGHT: Health + Radar + Dimensions */}
        <div className="lg:col-span-7 space-y-5">
          {/* Health gauge */}
          <div className="rounded-xl bg-card border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4" style={{ color: moodColor }} strokeWidth={1.5} />
              <h3 className="text-sm font-semibold">Brain Health</h3>
              <span className="text-xl font-bold tabular-nums ml-auto" style={{ color: moodColor }}>
                {brainState.health}/100
              </span>
            </div>
            <HealthGauge health={brainState.health} mood={mood} />
          </div>

          {/* Radar chart */}
          <div className="rounded-xl bg-card border border-border p-5">
            <h3 className="text-sm font-semibold mb-2">Behavioral Dimensions</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="hsl(240 4% 16%)" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: "hsl(240 5% 55%)", fontSize: 11 }}
                  />
                  <Radar
                    dataKey="value"
                    stroke={moodColor}
                    fill={moodColor}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4 dimension cards */}
          <div className="grid grid-cols-2 gap-3">
            <DimensionCard icon={Zap} label="Liquidity" value={brainState.liquidity} color="#22c55e" />
            <DimensionCard icon={Shield} label="Diversification" value={brainState.diversification} color="#3b82f6" />
            <DimensionCard icon={TrendingUp} label="Velocity" value={brainState.velocity} color="#eab308" />
            <DimensionCard icon={Activity} label="Risk Appetite" value={brainState.riskAppetite} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          ROW 2: MOOD TRANSITION HISTORY
         ═══════════════════════════════════════════ */}
      <div className="rounded-xl bg-card border border-border p-6">
        <h3 className="text-sm font-semibold mb-4">Mood Transition Timeline</h3>
        <div className="space-y-4">
          {transitions.length === 0 && (
            <p className="text-xs text-muted-foreground">No mood transitions yet. The brain is warming up.</p>
          )}
          {transitions.map((t, i) => {
            const fromColor = MOOD_COLORS[t.from];
            const toColor = MOOD_COLORS[t.to];
            const ago = Math.round((Date.now() - new Date(t.timestamp).getTime()) / 60000);
            const agoLabel = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
            return (
              <div key={i} className="flex items-start gap-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center shrink-0 mt-1">
                  <div className="h-3 w-3 rounded-full" style={{ background: toColor, boxShadow: `0 0 8px ${toColor}66` }} />
                  {i < transitions.length - 1 && (
                    <div className="w-px h-8 bg-border mt-1" />
                  )}
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-2" style={{ borderColor: `${fromColor}44`, color: fromColor }}>
                      {t.from}
                    </Badge>
                    <span className="text-muted-foreground text-xs">-&gt;</span>
                    <Badge variant="outline" className="text-[10px] px-2" style={{ borderColor: `${toColor}44`, color: toColor }}>
                      {t.to}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">{agoLabel}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {t.reason}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          ROW 3: HOW IT WORKS
         ═══════════════════════════════════════════ */}
      <div className="rounded-xl bg-card border border-border p-6">
        <h3 className="text-sm font-semibold mb-3">How Wallet-as-Brain Works</h3>
        <div className="grid md:grid-cols-4 gap-4 text-xs text-muted-foreground">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <span className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${MOOD_COLORS.generous}22`, color: MOOD_COLORS.generous }}>1</span>
              Read Wallets
            </div>
            <p>Every 60s, the brain reads balances across Arbitrum and Base via RPC.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <span className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${MOOD_COLORS.strategic}22`, color: MOOD_COLORS.strategic }}>2</span>
              Compute Health
            </div>
            <p>Liquidity, diversification, velocity, and risk are scored 0-100.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <span className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${MOOD_COLORS.cautious}22`, color: MOOD_COLORS.cautious }}>3</span>
              Derive Mood
            </div>
            <p>Health maps to mood: generous, strategic, cautious, or survival.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <span className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${MOOD_COLORS.survival}22`, color: MOOD_COLORS.survival }}>4</span>
              Drive Behavior
            </div>
            <p>Mood controls transfer limits, beneficiary selection, L2 routing, and risk tolerance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Calculator, Play, Loader2, TrendingUp, Shield, Smile,
  Meh, Frown, Zap, Fuel, DollarSign, BarChart3, ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

// ── Simulation engine ───────────────────────────────────────────

interface SimParams {
  portfolioHealth: number;
  gasSpike: number;
  creatorEngagement: number;
  riskLevel: number;
}

interface SimResult {
  mood: string;
  moodColor: string;
  maxTip: number;
  chosenChain: string;
  yieldAllocation: number;
  riskScore: number;
  guardianThreshold: number;
  gasEstimate: number;
  confidenceScore: number;
  budgetUtilization: number;
}

interface SimDecision {
  id: number;
  type: string;
  action: string;
  outcome: "approved" | "rejected" | "deferred";
  confidence: number;
  reasoning: string;
}

function computeSimulation(params: SimParams): SimResult {
  const { portfolioHealth, gasSpike, creatorEngagement, riskLevel } = params;

  // Mood determination
  let mood = "strategic";
  let moodColor = "#627EEA";
  if (portfolioHealth > 70 && riskLevel < 40) {
    mood = "optimistic";
    moodColor = "#50AF95";
  } else if (portfolioHealth < 40 || riskLevel > 70) {
    mood = "cautious";
    moodColor = "#EF4444";
  }

  // Max tip scales with portfolio health and inversely with risk
  const maxTip = Math.max(0.5, (portfolioHealth / 100) * 25 * (1 - riskLevel / 200));

  // Chain selection based on gas costs
  const chains = [
    { name: "Base Mainnet", baseCost: 0.01 },
    { name: "Arbitrum One", baseCost: 0.03 },
    { name: "Base Sepolia", baseCost: 0.005 },
    { name: "Arbitrum Sepolia", baseCost: 0.008 },
    { name: "Ethereum Mainnet", baseCost: 0.5 },
  ];
  const withGas = chains.map((c) => ({ ...c, cost: c.baseCost * gasSpike }));
  withGas.sort((a, b) => a.cost - b.cost);
  const chosenChain = gasSpike > 5 ? withGas[0].name : withGas[Math.min(1, withGas.length - 1)].name;

  // Yield allocation: high portfolio health + low risk = more deployed
  const yieldAllocation = Math.min(80, Math.max(5, portfolioHealth * 0.7 - riskLevel * 0.3));

  // Risk score composite
  const riskScore = Math.min(100, riskLevel * 0.6 + (100 - portfolioHealth) * 0.2 + gasSpike * 3);

  // Guardian veto threshold tightens with risk
  const guardianThreshold = Math.max(0.5, 0.9 - riskLevel / 200);

  // Gas estimate
  const gasEstimate = (0.002 * gasSpike).toFixed(4) as unknown as number;

  // Confidence
  const confidenceScore = Math.min(0.98, (portfolioHealth / 100) * 0.5 + (creatorEngagement / 100) * 0.3 + (1 - riskLevel / 100) * 0.2);

  // Budget utilization
  const budgetUtilization = Math.min(95, creatorEngagement * 0.6 + portfolioHealth * 0.3 - riskLevel * 0.1);

  return {
    mood,
    moodColor,
    maxTip: Math.round(maxTip * 100) / 100,
    chosenChain,
    yieldAllocation: Math.round(yieldAllocation),
    riskScore: Math.round(riskScore),
    guardianThreshold: Math.round(guardianThreshold * 100) / 100,
    gasEstimate: Number(gasEstimate),
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    budgetUtilization: Math.max(0, Math.round(budgetUtilization)),
  };
}

function simulateDecisions(params: SimParams): SimDecision[] {
  const result = computeSimulation(params);
  const types = ["transfer", "rebalance", "yield-deploy", "bridge", "swap", "transfer", "transfer", "stake", "transfer", "governance-vote"];

  return types.map((type, i) => {
    const baseConf = result.confidenceScore - 0.1 + Math.random() * 0.2;
    const conf = Math.min(0.99, Math.max(0.3, baseConf));
    const passesGuardian = conf >= result.guardianThreshold && result.riskScore < 80;
    const highRisk = result.riskScore > 70 && type !== "tip";

    let outcome: SimDecision["outcome"] = "approved";
    if (!passesGuardian || highRisk) outcome = "rejected";
    else if (conf < 0.6) outcome = "deferred";

    const reasonings: Record<string, string> = {
      transfer: `Recipient activity ${params.creatorEngagement}% ${params.creatorEngagement > 50 ? "exceeds" : "below"} threshold. Max transfer: ${result.maxTip} USDC.`,
      rebalance: `Portfolio health ${params.portfolioHealth}%. ${params.portfolioHealth < 50 ? "Rebalance needed." : "Portfolio balanced."}`,
      "yield-deploy": `Deploying ${result.yieldAllocation}% to yield. Risk score: ${result.riskScore}.`,
      bridge: `L2 fee spike ${params.gasSpike}x. Routing via ${result.chosenChain}.`,
      swap: `Optimizing fees: ${result.chosenChain} selected at ${result.gasEstimate} gwei effective.`,
      stake: `Staking allocation based on ${result.mood} mood. Yield target: ${result.yieldAllocation}%.`,
      "governance-vote": `Agent voting based on portfolio alignment. Confidence: ${(conf * 100).toFixed(0)}%.`,
    };

    return {
      id: i + 1,
      type,
      action: type === "transfer" ? `Send ${(Math.random() * result.maxTip).toFixed(2)} USDC` : `Execute ${type}`,
      outcome,
      confidence: Math.round(conf * 100) / 100,
      reasoning: reasonings[type] || `Processing ${type} with ${result.mood} mood.`,
    };
  });
}

// ── Mood icon helper ────────────────────────────────────────────

function MoodIcon({ mood }: { mood: string }) {
  if (mood === "optimistic") return <Smile className="h-6 w-6 text-green-400" />;
  if (mood === "cautious") return <Frown className="h-6 w-6 text-red-400" />;
  return <Meh className="h-6 w-6 text-blue-400" />;
}

// ── Component ───────────────────────────────────────────────────

export default function EconomicSimulator() {
  const [params, setParams] = useState<SimParams>({
    portfolioHealth: 75,
    gasSpike: 1,
    creatorEngagement: 60,
    riskLevel: 30,
  });
  const [simResults, setSimResults] = useState<SimDecision[] | null>(null);
  const [simulating, setSimulating] = useState(false);

  const result = useMemo(() => computeSimulation(params), [params]);

  const radarData = useMemo(
    () => [
      { metric: "Confidence", value: result.confidenceScore * 100 },
      { metric: "Budget Use", value: result.budgetUtilization },
      { metric: "Yield", value: result.yieldAllocation },
      { metric: "Risk", value: result.riskScore },
      { metric: "Guardian", value: result.guardianThreshold * 100 },
      { metric: "Health", value: params.portfolioHealth },
    ],
    [result, params.portfolioHealth]
  );

  const handleSimulate = useCallback(() => {
    setSimulating(true);
    setSimResults(null);
    // Simulate async processing
    setTimeout(() => {
      setSimResults(simulateDecisions(params));
      setSimulating(false);
    }, 1200);
  }, [params]);

  const handleReset = () => {
    setParams({ portfolioHealth: 75, gasSpike: 1, creatorEngagement: 60, riskLevel: 30 });
    setSimResults(null);
  };

  const sliders: { key: keyof SimParams; label: string; min: number; max: number; step: number; unit: string; icon: typeof TrendingUp; color: string }[] = [
    { key: "portfolioHealth", label: "Portfolio Health", min: 0, max: 100, step: 1, unit: "%", icon: TrendingUp, color: "#50AF95" },
    { key: "gasSpike", label: "L2 Fee Spike", min: 1, max: 10, step: 0.5, unit: "x", icon: Fuel, color: "#F7931A" },
    { key: "creatorEngagement", label: "Recipient Activity", min: 0, max: 100, step: 1, unit: "%", icon: Zap, color: "#627EEA" },
    { key: "riskLevel", label: "Risk Level", min: 0, max: 100, step: 1, unit: "%", icon: Shield, color: "#EF4444" },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Calculator className="h-7 w-7 text-orange-500" />
            Economic Simulator
          </h1>
          <p className="text-muted-foreground mt-1">
            Test &quot;what if&quot; scenarios to see how the agent adapts its behavior in real time
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="border-orange-500/30 hover:bg-orange-500/10">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
        {/* Left: Controls */}
        <div className="space-y-6">
          {/* Sliders */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold mb-5">Scenario Parameters</h3>
            <div className="space-y-6">
              {sliders.map(({ key, label, min, max, step, unit, icon: Icon, color }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color }} />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <span className="text-sm font-mono" style={{ color }}>
                      {params[key]}{unit}
                    </span>
                  </div>
                  <Slider
                    value={[params[key]]}
                    min={min}
                    max={max}
                    step={step}
                    onValueChange={([v]) => setParams((p) => ({ ...p, [key]: v }))}
                  />
                </div>
              ))}
            </div>

            <Button
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleSimulate}
              disabled={simulating}
            >
              {simulating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Simulating 10 Decisions...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>
          </div>

          {/* Radar Chart */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold mb-3">Agent Profile</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "#888", fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  <Radar
                    name="Agent"
                    dataKey="value"
                    stroke="#FF4E00"
                    fill="#FF4E00"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-6">
          {/* Live Output */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold mb-4">Real-Time Agent Behavior</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Mood */}
              <div className="rounded-lg border border-border bg-background/50 p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Mood State</p>
                <div className="flex items-center gap-2">
                  <MoodIcon mood={result.mood} />
                  <span className="text-lg font-semibold capitalize" style={{ color: result.moodColor }}>
                    {result.mood}
                  </span>
                </div>
              </div>

              {/* Max Tip */}
              <div className="rounded-lg border border-border bg-background/50 p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Max Transfer</p>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  <span className="text-lg font-mono font-semibold text-green-400">{result.maxTip} USDC</span>
                </div>
              </div>

              {/* Chosen Chain */}
              <div className="rounded-lg border border-border bg-background/50 p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Chosen Chain</p>
                <p className="text-sm font-medium text-foreground">{result.chosenChain}</p>
              </div>

              {/* Yield Allocation */}
              <div className="rounded-lg border border-border bg-background/50 p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Yield Allocation</p>
                <p className="text-lg font-mono font-semibold text-blue-400">{result.yieldAllocation}%</p>
              </div>

              {/* Risk Score */}
              <div className="rounded-lg border border-border bg-background/50 p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Risk Score</p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-lg font-mono font-semibold"
                    style={{ color: result.riskScore > 70 ? "#EF4444" : result.riskScore > 40 ? "#EAB308" : "#50AF95" }}
                  >
                    {result.riskScore}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${result.riskScore}%`,
                        backgroundColor: result.riskScore > 70 ? "#EF4444" : result.riskScore > 40 ? "#EAB308" : "#50AF95",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Guardian Threshold */}
              <div className="rounded-lg border border-border bg-background/50 p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Guardian Veto</p>
                <p className="text-lg font-mono font-semibold text-orange-400">
                  {(result.guardianThreshold * 100).toFixed(0)}% min
                </p>
              </div>
            </div>
          </div>

          {/* Simulation Results */}
          {simResults && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-500" />
                Simulation Results (10 Decisions)
              </h3>

              {/* Summary bar chart */}
              <div className="h-40 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={simResults}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="id" tick={{ fill: "#888", fontSize: 10 }} />
                    <YAxis domain={[0, 1]} tick={{ fill: "#888", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Bar
                      dataKey="confidence"
                      fill="#FF4E00"
                      radius={[4, 4, 0, 0]}
                      name="Confidence"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Decision list */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {simResults.map((d) => (
                  <div
                    key={d.id}
                    className={`rounded-lg border p-3 text-xs ${
                      d.outcome === "approved"
                        ? "border-green-500/20 bg-green-500/5"
                        : d.outcome === "rejected"
                          ? "border-red-500/20 bg-red-500/5"
                          : "border-yellow-500/20 bg-yellow-500/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-muted-foreground/30">
                          {d.type}
                        </Badge>
                        <span className="text-muted-foreground">{d.action}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          d.outcome === "approved"
                            ? "border-green-500/30 text-green-400 text-[9px]"
                            : d.outcome === "rejected"
                              ? "border-red-500/30 text-red-400 text-[9px]"
                              : "border-yellow-500/30 text-yellow-400 text-[9px]"
                        }
                      >
                        {d.outcome.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{d.reasoning}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="font-mono" style={{ color: d.confidence > 0.7 ? "#50AF95" : "#EAB308" }}>
                        {(d.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary stats */}
              <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-green-400">
                    {simResults.filter((d) => d.outcome === "approved").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Approved</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-red-400">
                    {simResults.filter((d) => d.outcome === "rejected").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Rejected</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-yellow-400">
                    {simResults.filter((d) => d.outcome === "deferred").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Deferred</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Brain, Play, Pause, SkipForward, SkipBack, FastForward,
  Rewind, ChevronRight, Eye, Lightbulb, Zap, MessageSquare,
  CheckCircle2, XCircle, Shield, Users, Clock,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────

interface AgentVote {
  agent: string;
  vote: "approve" | "reject" | "abstain";
  confidence: number;
  reasoning: string;
}

interface ReasoningStep {
  phase: "input" | "thought" | "action" | "observation" | "reflection" | "decision";
  content: string;
  timestamp: number;
}

interface Decision {
  id: number;
  decisionId: string;
  type: string;
  input: string;
  steps: ReasoningStep[];
  agentVotes: AgentVote[];
  guardianVerdict: "approved" | "vetoed" | "override";
  outcome: "executed" | "rejected" | "deferred";
  confidence: number;
  timestamp: string;
  executionTimeMs: number;
}

// ── Demo decisions ──────────────────────────────────────────────

function generateDemoDecisions(): Decision[] {
  const types = ["remittance", "swap", "rebalance", "rebalance", "remittance", "remittance", "bridge", "remittance", "rebalance", "remittance"];
  const creators = ["María García", "Luis Hernández", "Rosa Martínez", "Carlos Ruiz", "Ana Flores"];
  const chains = ["arbitrum-one", "base", "base", "arbitrum-one"];
  const verdicts: Decision["guardianVerdict"][] = ["approved", "approved", "vetoed", "approved", "approved"];
  const outcomes: Decision["outcome"][] = ["executed", "executed", "rejected", "executed", "executed"];

  return Array.from({ length: 50 }, (_, i) => {
    const type = types[i % types.length];
    const creator = creators[i % creators.length];
    const chain = chains[i % chains.length];
    const confidence = 0.55 + Math.random() * 0.4;
    const verdict = verdicts[i % verdicts.length];
    const outcome = outcomes[i % outcomes.length];

    const inputText = type === "remittance"
      ? `Evaluate transfer 50 USDC to ${creator} on ${chain}`
      : type === "swap"
        ? `Swap 100 USDC → MXN via Bitso for optimal FX rate`
        : type === "bridge"
          ? `Bridge 50 USDC from Arbitrum to Base`
          : `Rebalance USDC across Arbitrum + Base: target 60/40 split`;

    return {
      id: i + 1,
      decisionId: `dec-${(1000 + i).toString(36)}`,
      type,
      input: inputText,
      steps: [
        { phase: "input", content: inputText, timestamp: 0 },
        { phase: "thought", content: `Analyzing ${type} request. Checking beneficiary SPEI status, risk parameters, USDC fees, and L2 liquidity. Current mood: ${confidence > 0.75 ? "optimistic" : "cautious"}.`, timestamp: 120 },
        { phase: "action", content: `Querying on-chain data: beneficiary history (${Math.floor(Math.random() * 50 + 5)} transfers received), Base fee (${(Math.random() * 0.03 + 0.01).toFixed(3)} USDC), chain congestion (${(Math.random() * 100).toFixed(0)}%).`, timestamp: 340 },
        { phase: "observation", content: `Beneficiary has ${Math.floor(Math.random() * 4.5 + 0.5)}/5 reliability score. L2 liquidity: ${(70 + Math.random() * 25).toFixed(0)}%. Daily transfer budget remaining: ${(Math.random() * 80 + 20).toFixed(0)}%.`, timestamp: 520 },
        { phase: "reflection", content: `Risk assessment: ${confidence > 0.8 ? "LOW" : confidence > 0.6 ? "MEDIUM" : "HIGH"}. ${verdict === "vetoed" ? "Guardian flags excessive amount relative to beneficiary history." : "All safety checks pass. Fee under $1.20 cap. Economic model supports this action."}`, timestamp: 680 },
        { phase: "decision", content: `${outcome === "executed" ? "APPROVE" : "REJECT"}: ${type === "remittance" ? `Send ${(Math.random() * 50 + 10).toFixed(0)} USDC to ${creator}` : inputText}. Confidence: ${(confidence * 100).toFixed(0)}%. ${verdict === "vetoed" ? "VETOED by Guardian." : "All agents concur."}`, timestamp: 800 },
      ],
      agentVotes: [
        { agent: "Discovery", vote: confidence > 0.6 ? "approve" : "reject", confidence: confidence + (Math.random() * 0.1 - 0.05), reasoning: "Beneficiary SPEI status verified" },
        { agent: "Guardian", vote: confidence > 0.5 ? "approve" : "reject", confidence: confidence - 0.05 + Math.random() * 0.1, reasoning: "Risk within acceptable bounds" },
        { agent: "Treasury", vote: confidence > 0.65 ? "approve" : "abstain", confidence: confidence + Math.random() * 0.08, reasoning: "USDC budget allocation optimal" },
        { agent: "Router", vote: "approve", confidence: 0.85 + Math.random() * 0.1, reasoning: `${chain} offers lowest fee` },
      ],
      guardianVerdict: verdict,
      outcome,
      confidence: Math.min(confidence, 0.99),
      timestamp: new Date(Date.now() - (50 - i) * 600000).toISOString(),
      executionTimeMs: Math.floor(Math.random() * 1500 + 200),
    };
  });
}

const PHASE_META: Record<string, { icon: typeof Brain; color: string; label: string }> = {
  input: { icon: MessageSquare, color: "#627EEA", label: "Input" },
  thought: { icon: Lightbulb, color: "#F7931A", label: "Thought" },
  action: { icon: Zap, color: "#FF4E00", label: "Action" },
  observation: { icon: Eye, color: "#50AF95", label: "Observation" },
  reflection: { icon: Brain, color: "#9945FF", label: "Reflection" },
  decision: { icon: CheckCircle2, color: "#35D07F", label: "Decision" },
};

// ── Component ───────────────────────────────────────────────────

export default function ReasoningReplay() {
  const [decisions] = useState<Decision[]>(() => generateDemoDecisions());
  const [currentDecision, setCurrentDecision] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [confidenceAnimated, setConfidenceAnimated] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const decision = decisions[currentDecision];
  const totalSteps = decision.steps.length;

  // Animate confidence as steps progress
  useEffect(() => {
    const targetConfidence = (currentStep / (totalSteps - 1)) * decision.confidence * 100;
    const timer = setTimeout(
      () => setConfidenceAnimated(Math.min(targetConfidence, decision.confidence * 100)),
      100
    );
    return () => clearTimeout(timer);
  }, [currentStep, decision.confidence, totalSteps]);

  // Playback timer
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep((s) => s + 1);
      } else if (currentDecision < decisions.length - 1) {
        setCurrentDecision((d) => d + 1);
        setCurrentStep(0);
      } else {
        setPlaying(false);
      }
    }, 1200 / speed);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, currentStep, currentDecision, totalSteps, speed, decisions.length]);

  const jumpToDecision = useCallback(
    (idx: number) => {
      setCurrentDecision(idx);
      setCurrentStep(0);
      setPlaying(false);
    },
    []
  );

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
    else if (currentDecision > 0) {
      setCurrentDecision((d) => d - 1);
      setCurrentStep(decisions[currentDecision - 1].steps.length - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
    else if (currentDecision < decisions.length - 1) {
      setCurrentDecision((d) => d + 1);
      setCurrentStep(0);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Brain className="h-7 w-7 text-orange-500" />
          Agent Reasoning Replay
        </h1>
        <p className="text-muted-foreground mt-1">
          Step-by-step replay of autonomous agent decisions — visual proof of intelligence
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Main Replay Area */}
        <div className="space-y-4">
          {/* Decision Header */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-orange-500/30 text-orange-400 font-mono">
                  #{decision.id}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    decision.outcome === "executed"
                      ? "border-green-500/30 text-green-400"
                      : decision.outcome === "rejected"
                        ? "border-red-500/30 text-red-400"
                        : "border-yellow-500/30 text-yellow-400"
                  }
                >
                  {decision.outcome.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">{decision.type}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {decision.executionTimeMs}ms
              </div>
            </div>
          </div>

          {/* Step Display */}
          <div className="rounded-xl border border-border bg-card p-6 min-h-[280px]">
            {/* Phase progress indicators */}
            <div className="flex items-center gap-1 mb-6">
              {decision.steps.map((step, idx) => {
                const meta = PHASE_META[step.phase];
                const Icon = meta.icon;
                const isActive = idx === currentStep;
                const isDone = idx < currentStep;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? "ring-2 ring-offset-1 ring-offset-background"
                        : isDone
                          ? "opacity-60"
                          : "opacity-30"
                    }`}
                    style={{
                      backgroundColor: isActive ? `${meta.color}20` : isDone ? `${meta.color}10` : "transparent",
                      color: meta.color,
                      borderColor: meta.color,
                      ringColor: isActive ? meta.color : undefined,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Current step content */}
            <div className="space-y-3">
              <div
                className="rounded-lg border p-4 transition-all duration-300"
                style={{
                  borderColor: `${PHASE_META[decision.steps[currentStep].phase].color}40`,
                  backgroundColor: `${PHASE_META[decision.steps[currentStep].phase].color}08`,
                }}
              >
                <p className="text-sm leading-relaxed text-foreground">
                  {decision.steps[currentStep].content}
                </p>
              </div>
            </div>

            {/* Confidence Meter */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Confidence Building</span>
                <span className="text-xs font-mono text-orange-400">{confidenceAnimated.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${confidenceAnimated}%`,
                    background: `linear-gradient(90deg, #FF4E00, ${confidenceAnimated > 75 ? "#35D07F" : "#F7931A"})`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => jumpToDecision(Math.max(0, currentDecision - 1))}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePrev}>
                <Rewind className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-10 w-10 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => setPlaying(!playing)}
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNext}>
                <FastForward className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => jumpToDecision(Math.min(decisions.length - 1, currentDecision + 1))}>
                <SkipForward className="h-4 w-4" />
              </Button>

              <div className="ml-6 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Speed:</span>
                {[0.5, 1, 2, 4].map((s) => (
                  <Button
                    key={s}
                    variant={speed === s ? "default" : "ghost"}
                    size="sm"
                    className={`text-xs h-7 px-2 ${speed === s ? "bg-orange-500/20 text-orange-400" : ""}`}
                    onClick={() => setSpeed(s)}
                  >
                    {s}x
                  </Button>
                ))}
              </div>
            </div>

            {/* Timeline scrubber */}
            <div className="mt-4">
              <Slider
                value={[currentDecision]}
                min={0}
                max={decisions.length - 1}
                step={1}
                onValueChange={([v]) => jumpToDecision(v)}
                className="w-full"
              />
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>Decision #1</span>
                <span>Decision #{currentDecision + 1} of {decisions.length}</span>
                <span>Decision #{decisions.length}</span>
              </div>
            </div>
          </div>

          {/* Agent Votes */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              Agent Votes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {decision.agentVotes.map((vote) => (
                <div
                  key={vote.agent}
                  className={`rounded-lg border p-3 ${
                    vote.vote === "approve"
                      ? "border-green-500/30 bg-green-500/5"
                      : vote.vote === "reject"
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-yellow-500/30 bg-yellow-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{vote.agent}</span>
                    {vote.vote === "approve" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    ) : vote.vote === "reject" ? (
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                    ) : (
                      <Shield className="h-3.5 w-3.5 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{vote.reasoning}</p>
                  <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(vote.confidence * 100, 100)}%`,
                        backgroundColor: vote.vote === "approve" ? "#35D07F" : vote.vote === "reject" ? "#EF4444" : "#EAB308",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                    {(Math.min(vote.confidence, 0.99) * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>

            {/* Guardian verdict */}
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Guardian Verdict:</span>
              <Badge
                variant="outline"
                className={
                  decision.guardianVerdict === "approved"
                    ? "border-green-500/30 text-green-400"
                    : decision.guardianVerdict === "vetoed"
                      ? "border-red-500/30 text-red-400"
                      : "border-yellow-500/30 text-yellow-400"
                }
              >
                {decision.guardianVerdict.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Timeline Sidebar */}
        <div className="rounded-xl border border-border bg-card p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-card pb-2">
            All Decisions ({decisions.length})
          </h3>
          <div className="space-y-1">
            {decisions.map((d, idx) => (
              <button
                key={d.id}
                onClick={() => jumpToDecision(idx)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-xs ${
                  idx === currentDecision
                    ? "bg-orange-500/15 border border-orange-500/30"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-muted-foreground">#{d.id}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 ${
                      d.outcome === "executed"
                        ? "border-green-500/30 text-green-400"
                        : "border-red-500/30 text-red-400"
                    }`}
                  >
                    {d.outcome === "executed" ? "OK" : "REJ"}
                  </Badge>
                </div>
                <p className="text-muted-foreground truncate mt-0.5">{d.type}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

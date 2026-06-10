import { useState, useRef, useEffect, useCallback } from "react";
import { demoReasoningSteps } from "@/lib/demo-data";
import ConfidenceMeter from "@/components/shared/ConfidenceMeter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Play, Square, Brain, Zap, Eye, MessageCircle, CheckCircle } from "lucide-react";
import { type LucideIcon } from "lucide-react";

interface ReasoningCard {
  type: string;
  label: string;
  content: string;
  confidence: number;
  source: string;
}

const typeIcons: Record<string, LucideIcon> = {
  thought: Brain,
  action: Zap,
  observation: Eye,
  reflection: MessageCircle,
  decision: CheckCircle,
};

const prefilledTrace: ReasoningCard[] = [
  { type: "thought", label: "Thought", content: "Analyzing top beneficiary transfer history and SPEI verification status...", confidence: 22, source: "Discovery Agent" },
  { type: "action", label: "Action", content: "Calling fx_check tool for USD/MXN pair on Bitso oracle.", confidence: 40, source: "Tool Executor" },
  { type: "observation", label: "Observation", content: "USD/MXN: 17.82. Base fee: 0.02 USDC. Fee ratio: 0.04% for a 50 USDC remittance.", confidence: 58, source: "FX Oracle" },
  { type: "reflection", label: "Reflection", content: "Fee ratio is 0.04% — well below $1.20 cap. Beneficiary María García is SPEI-verified with 94% reliability.", confidence: 74, source: "Risk Engine" },
  { type: "decision", label: "Decision", content: "Approve transfer of 50 USDC to 0xABC...def on Base. Confidence: 87%. Guardian review: PASS.", confidence: 87, source: "Consensus Engine" },
];

export default function Reasoning() {
  const [prompt, setPrompt] = useState("Analyze USDC balance and recommend next remittance action");
  const [cards, setCards] = useState<ReasoningCard[]>(prefilledTrace);
  const [isStreaming, setIsStreaming] = useState(false);
  const [confidence, setConfidence] = useState(87);
  const [hasRun, setHasRun] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [cards, scrollToBottom]);

  const startReasoning = () => {
    setIsStreaming(true);
    setCards([]);
    setConfidence(0);
    setHasRun(true);
    let i = 0;

    intervalRef.current = setInterval(() => {
      const safeSteps = Array.isArray(demoReasoningSteps) ? demoReasoningSteps : [];
      if (i >= safeSteps.length) {
        clearInterval(intervalRef.current);
        setIsStreaming(false);
        return;
      }
      const step = safeSteps[i];
      setCards((prev) => [...prev, step]);
      setConfidence(step.confidence);
      i++;
    }, 1400);
  };

  const stopReasoning = () => {
    clearInterval(intervalRef.current);
    setIsStreaming(false);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Live Agent Reasoning</h1>
        <p className="text-sm text-muted-foreground mt-1">Watch the agent think in real time.</p>
      </div>

      {/* Input */}
      <div className="flex gap-3 mb-6 flex-wrap sm:flex-nowrap">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a prompt for the agent..."
          className="bg-card border-border/50"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <Button onClick={stopReasoning} variant="outline" className="shrink-0">
            <Square className="h-4 w-4 mr-2" />Stop
          </Button>
        ) : (
          <Button onClick={startReasoning} className="bg-primary hover:bg-primary/90 shrink-0">
            <Play className="h-4 w-4 mr-2" />Start
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_160px] gap-6">
        {/* Reasoning Stream */}
        <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
          <div ref={scrollRef} className="h-[500px] overflow-y-auto">
            <div className="p-4 space-y-3">
              {cards.length === 0 && !isStreaming && (
                <p className="text-sm text-muted-foreground text-center py-16">
                  Enter a prompt and click Start to begin reasoning.
                </p>
              )}
              {cards.map((card, i) => {
                const Icon = typeIcons[card.type] || Brain;
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-border/40 bg-card/50 p-4 animate-fade-in"
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground/60 bg-secondary/50 px-1.5 py-0.5 rounded">{card.source}</span>
                    </div>
                    <p className="text-sm leading-relaxed mb-3">{card.content}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={card.confidence} className="h-1 flex-1 bg-secondary" />
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{card.confidence}%</span>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isStreaming && (
                <div className="flex items-center gap-1.5 px-4 py-3">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "200ms" }} />
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "400ms" }} />
                  <span className="text-xs text-muted-foreground ml-2">Agent thinking...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="flex flex-row lg:flex-col items-center lg:items-center gap-4">
          <div className="rounded-xl border border-border/50 bg-card/50 p-5 flex flex-col items-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 font-medium">Confidence</p>
            <ConfidenceMeter value={confidence} size={110} />
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4 w-full text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Steps</p>
            <p className="text-lg font-bold tabular-nums">{cards.length}<span className="text-muted-foreground text-sm font-normal">/{hasRun ? (Array.isArray(demoReasoningSteps) ? demoReasoningSteps.length : 0) : prefilledTrace.length}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

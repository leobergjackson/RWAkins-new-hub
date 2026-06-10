import { useState, useRef } from "react";
import { demoSteps } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play, CheckCircle2, Loader2, Wallet, LockKeyhole, Unlock,
  Bot, CalendarClock, Heart, Award, Activity, BarChart3,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

const stepPreviews: { id: number; name: string; icon: LucideIcon }[] = [
  { id: 1, name: "Wallet Info", icon: Wallet },
  { id: 2, name: "Create Escrow", icon: LockKeyhole },
  { id: 3, name: "Claim Escrow", icon: Unlock },
  { id: 4, name: "Autonomous Cycle", icon: Bot },
  { id: 5, name: "DCA Plan", icon: CalendarClock },
  { id: 6, name: "Engagement", icon: Heart },
  { id: 7, name: "YouTube Data", icon: Play },
  { id: 8, name: "Reputation", icon: Award },
  { id: 9, name: "Mood / Pulse", icon: Activity },
  { id: 10, name: "Full Stats", icon: BarChart3 },
];

export default function Demo() {
  const [mode, setMode] = useState("full");
  const [fullResults, setFullResults] = useState<typeof demoSteps>([]);
  const [fullRunning, setFullRunning] = useState(false);
  const [fullProgress, setFullProgress] = useState(0);
  const [stepResults, setStepResults] = useState<Record<number, string>>({});
  const [stepLoading, setStepLoading] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const runFull = () => {
    if (!demoSteps?.length) return;
    setFullRunning(true);
    setFullResults([]);
    setFullProgress(0);
    let i = 0;
    intervalRef.current = setInterval(() => {
      if (!demoSteps?.length || i >= demoSteps.length) {
        clearInterval(intervalRef.current);
        setFullRunning(false);
        return;
      }
      const idx = i; // capture by value — closure over mutable `i` would race with `i++`
      i++;
      const step = demoSteps[idx];
      if (!step) return; // guard against undefined entries
      setFullResults((prev) => [...prev, step]);
      setFullProgress((idx + 1) / demoSteps.length * 100);
    }, 800);
  };

  const runStep = async (step: typeof demoSteps[0]) => {
    if (!step) return;
    setStepLoading(step.id);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    setStepResults((prev) => ({ ...prev, [step.id]: step.result ?? "Done" }));
    setStepLoading(null);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Interactive Demo</h1>
        <p className="text-sm text-muted-foreground mt-1">Experience every capability. No terminal required.</p>
      </div>

      <Tabs value={mode} onValueChange={setMode}>
        <TabsList className="bg-secondary/50 mb-6">
          <TabsTrigger value="full">Full Demo</TabsTrigger>
          <TabsTrigger value="step">Step-by-Step</TabsTrigger>
        </TabsList>

        <TabsContent value="full">
          <div className="rounded-xl border border-border/50 bg-card/50 p-6">
            {!fullRunning && fullResults.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Run all 10 demo steps in sequence</p>
                <Button onClick={runFull} className="bg-primary hover:bg-primary/90 h-12 px-8 mb-8">
                  <Play className="h-4 w-4 mr-2" />Run Full Demo
                </Button>

                {/* Step preview cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-2xl mx-auto">
                  {(stepPreviews ?? []).filter(Boolean).map((s) => (
                    <div key={s.id} className="rounded-lg border border-border/40 bg-card/30 px-3 py-2.5 text-center">
                      <s.icon className="h-5 w-5 mx-auto mb-1" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
                      <div className="text-[10px] font-mono text-muted-foreground/60 mb-0.5">{s.id}</div>
                      <div className="text-[11px] font-medium text-foreground/80">{s.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(fullRunning || fullResults.length > 0) && (
              <div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className="text-xs font-mono tabular-nums">{fullResults.length}/{demoSteps.length}</span>
                  </div>
                  <Progress value={fullProgress} className="h-2 bg-secondary" />
                </div>
                <div className="space-y-2">
                  {fullResults.filter((s): s is NonNullable<typeof s> => s != null && typeof s === 'object' && 'id' in s).map((step) => (
                    <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-accent/20 animate-fade-in">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} style={{ color: "#50AF95" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{step?.name ?? "Unknown Step"}</span>
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Done</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{step?.result ?? ""}</p>
                      </div>
                    </div>
                  ))}
                  {fullRunning && (
                    <div className="flex items-center gap-2 px-3 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Running next step...</span>
                    </div>
                  )}
                </div>
                {!fullRunning && fullResults.length === demoSteps.length && (
                  <div className="mt-6 text-center">
                    <Button variant="outline" onClick={() => { setFullResults([]); setFullProgress(0); }}>Reset Demo</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="step">
          <div className="grid sm:grid-cols-2 gap-3">
            {(demoSteps ?? []).filter(Boolean).map((step) => (
              <div key={step.id} className="rounded-xl border border-border/50 bg-card/50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-muted-foreground w-5">{String(step?.id ?? 0).padStart(2, "0")}</span>
                  <span className="text-sm font-medium">{step?.name ?? "Unknown"}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3 ml-8">{step?.description ?? ""}</p>
                {stepResults[step.id] ? (
                  <div className="ml-8 p-2.5 rounded-md bg-emerald-500/8 border border-emerald-500/20 text-xs text-emerald-400 animate-fade-in">
                    {stepResults[step.id]}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-8 h-7 text-xs"
                    disabled={stepLoading !== null}
                    onClick={() => runStep(step)}
                  >
                    {stepLoading === step.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                    Run
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

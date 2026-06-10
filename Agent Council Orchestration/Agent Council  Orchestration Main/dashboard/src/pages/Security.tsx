import { useState } from "react";
import { demoAdversarialTests, demoPolicies } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield, ShieldCheck, Play, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Security() {
  const [testsRun, setTestsRun] = useState(false);
  const [visibleTests, setVisibleTests] = useState<number[]>([]);
  const [allPassed, setAllPassed] = useState(false);
  const [policies, setPolicies] = useState(Array.isArray(demoPolicies) ? demoPolicies : []);
  const [creditAddr, setCreditAddr] = useState("0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28");
  const [creditScore, setCreditScore] = useState<number | null>(null);

  const runTests = () => {
    setTestsRun(true);
    setVisibleTests([]);
    setAllPassed(false);
    const tests = Array.isArray(demoAdversarialTests) ? demoAdversarialTests : [];
    tests.forEach((_, i) => {
      setTimeout(() => {
        setVisibleTests((prev) => [...prev, i]);
        if (i === tests.length - 1) setAllPassed(true);
      }, (i + 1) * 300);
    });
  };

  const getCreditScore = () => {
    setCreditScore(null);
    setTimeout(() => setCreditScore(782), 500);
  };

  const scoreColor = (s: number) => s >= 750 ? "text-success" : s >= 600 ? "text-yellow-400" : "text-destructive";
  const scoreLabel = (s: number) => s >= 750 ? "Excellent" : s >= 600 ? "Good" : "Poor";

  const gaugeArc = (score: number) => {
    const min = 300, max = 850;
    const pct = Math.max(0, Math.min(1, (score - min) / (max - min)));
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Security Architecture</h1>
        <p className="text-sm text-muted-foreground mt-1">Twelve layers of defense. Adversarial-tested.</p>
      </div>

      {/* Adversarial Tests */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Button onClick={runTests} className="bg-primary hover:bg-primary/90" size="sm">
            <Play className="h-3.5 w-3.5 mr-2" />
            {allPassed ? "Re-run Tests" : "Run Adversarial Tests"}
          </Button>
          {allPassed && (
            <div className="flex items-center gap-2 animate-fade-in">
              <ShieldCheck className="h-5 w-5 text-success" style={{ animation: "pulse-glow 2s ease-in-out infinite" }} />
              <span className="text-sm text-success font-medium">All Attacks Blocked</span>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Array.isArray(demoAdversarialTests) ? demoAdversarialTests : []).map((test, i) => (
            <div
              key={test.name}
              className={`rounded-xl border border-border/50 bg-card/50 p-4 transition-all duration-500 ${
                visibleTests.includes(i) ? "opacity-100 translate-y-0" : testsRun ? "opacity-0 translate-y-3" : "opacity-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{test.name}</span>
                {visibleTests.includes(i) && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-scale-in">
                    Blocked
                  </Badge>
                )}
              </div>
              {visibleTests.includes(i) && (
                <div className="animate-fade-in">
                  <p className="text-xs text-muted-foreground mb-1">
                    Blocked by: <span className="text-foreground">{test.blockedBy}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{test.reason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Policies */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Security Policies</h3>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.info("Add policy dialog")}>
              <Plus className="h-3 w-3 mr-1" />Add
            </Button>
          </div>
          <div className="divide-y divide-border/30">
            {policies.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-sm">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.value}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setPolicies(policies.filter(x => x.id !== p.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Score */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Credit Score</h3>
          <div className="flex gap-3 mb-4 flex-wrap sm:flex-nowrap">
            <Input value={creditAddr} onChange={(e) => setCreditAddr(e.target.value)} placeholder="Wallet address" className="bg-background text-xs font-mono" />
            <Button size="sm" variant="outline" onClick={getCreditScore} className="shrink-0">Check</Button>
          </div>
          {creditScore !== null && (
            <div className="flex flex-col items-center animate-fade-in">
              <svg width="140" height="100" viewBox="0 0 120 100">
                <path d={gaugeArc(850)} fill="none" stroke="hsl(240, 4%, 16%)" strokeWidth="8" strokeLinecap="round" />
                <path d={gaugeArc(creditScore)} fill="none" stroke="hsl(161, 37%, 50%)" strokeWidth="8" strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <span className={`text-3xl font-bold tabular-nums -mt-2 ${scoreColor(creditScore)}`}>{creditScore}</span>
              <span className={`text-xs mt-1 ${scoreColor(creditScore)}`}>{scoreLabel(creditScore)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, ArrowRight, Check, Loader2, DollarSign, Fuel, Shield, Clock } from "lucide-react";
import { toast } from "sonner";

// ── Chain gasless data ────────────────────────────────────────────

interface ChainGasless {
  chain: string;
  name: string;
  standard: string;
  supported: boolean;
  normalGasCostUsd: number;
  blockTime: number;
  color: string;
}

const CHAINS: ChainGasless[] = [
  { chain: "arbitrum", name: "Arbitrum", standard: "ERC-4337", supported: true, normalGasCostUsd: 0.0025, blockTime: 0.3, color: "#28A0F0" },
  { chain: "base", name: "Base", standard: "ERC-4337", supported: true, normalGasCostUsd: 0.001, blockTime: 2, color: "#0052FF" },
];

// ── Flow steps ────────────────────────────────────────────────────

interface FlowStep {
  id: string;
  label: string;
  icon: typeof Zap;
  color: string;
  description: string;
}

const FLOW_STEPS: FlowStep[] = [
  { id: "user", label: "User", icon: Shield, color: "bg-blue-500", description: "Signs transfer intent (no gas needed)" },
  { id: "userop", label: "UserOperation", icon: Zap, color: "bg-purple-500", description: "ERC-4337 UserOp built with calldata" },
  { id: "bundler", label: "Bundler", icon: ArrowRight, color: "bg-amber-500", description: "Batches UserOps for efficiency" },
  { id: "paymaster", label: "Paymaster", icon: DollarSign, color: "bg-emerald-500", description: "Sponsors gas — user pays $0.00" },
  { id: "entrypoint", label: "EntryPoint", icon: Shield, color: "bg-red-500", description: "Validates signatures & nonce" },
  { id: "chain", label: "On-Chain", icon: Check, color: "bg-[#FF4E00]", description: "Transfer executes — 0 gas for user" },
];

export default function GaslessDemo() {
  const [selectedChain, setSelectedChain] = useState("arbitrum");
  const [amount, setAmount] = useState("10");
  const [simulating, setSimulating] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [simDone, setSimDone] = useState(false);

  const chain = CHAINS.find((c) => c.chain === selectedChain)!;

  const handleSimulate = () => {
    setSimulating(true);
    setActiveStep(0);
    setSimDone(false);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= FLOW_STEPS.length) {
        clearInterval(interval);
        setSimulating(false);
        setSimDone(true);
        setActiveStep(FLOW_STEPS.length);
        toast.success(`Gasless simulation complete on ${chain.name} — user saved $${chain.normalGasCostUsd.toFixed(4)}`);
        return;
      }
      setActiveStep(step);
    }, 800);
  };

  const totalSaved = useMemo(
    () => CHAINS.reduce((sum, c) => sum + c.normalGasCostUsd, 0),
    []
  );

  const maxGas = Math.max(...CHAINS.map((c) => c.normalGasCostUsd));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Gasless Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ERC-4337 Account Abstraction demo — paymaster-sponsored gas on Arbitrum + Base.
        </p>
      </div>

      {/* Visual Flow Diagram */}
      <Card className="border-border/50 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#FF4E00]" />
            Gasless Transfer Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-2 py-4">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${
                    activeStep > i
                      ? "opacity-100 scale-100"
                      : activeStep === i
                        ? "opacity-100 scale-110"
                        : "opacity-40 scale-95"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${step.color} ${
                      activeStep === i ? "animate-pulse ring-2 ring-white/30" : ""
                    } ${activeStep > i ? "ring-2 ring-emerald-400/50" : ""}`}
                  >
                    {activeStep > i ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : activeStep === i && simulating ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <step.icon className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-center w-20 truncate">
                    {step.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground text-center w-24 leading-tight">
                    {step.description}
                  </span>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <ArrowRight
                    className={`h-4 w-4 transition-colors ${
                      activeStep > i ? "text-emerald-400" : "text-muted-foreground/30"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Simulation Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Simulate Transfer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Chain</label>
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAINS.map((c) => (
                    <SelectItem key={c.chain} value={c.chain}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                        <Badge variant="outline" className="text-[9px] ml-1">{c.standard}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Amount (USDC)</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background/50"
                min={0.01}
                step={0.1}
              />
            </div>
            <Button
              onClick={handleSimulate}
              disabled={simulating}
              className="w-full bg-[#FF4E00] hover:bg-[#FF4E00]/80 text-white gap-2"
            >
              {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Simulate Gasless Transfer
            </Button>

            {simDone && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                <div className="text-emerald-400 font-medium">Simulation Complete</div>
                <div className="text-muted-foreground">
                  User gas cost: <span className="text-emerald-400 font-bold">$0.00</span>
                </div>
                <div className="text-muted-foreground">
                  Normal gas cost: <span className="text-red-400">${chain.normalGasCostUsd.toFixed(4)}</span>
                </div>
                <div className="text-muted-foreground">
                  Gas saved: <span className="text-emerald-400 font-bold">${chain.normalGasCostUsd.toFixed(4)}</span>
                </div>
                <div className="text-muted-foreground">
                  Finality: <span className="text-blue-400">{chain.blockTime}s</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gas savings comparison */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Fuel className="h-4 w-4 text-amber-400" />
              Gas Savings by Chain (per transfer)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CHAINS.sort((a, b) => b.normalGasCostUsd - a.normalGasCostUsd).map((c) => {
                const pct = maxGas > 0 ? (c.normalGasCostUsd / maxGas) * 100 : 0;
                return (
                  <div key={c.chain} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-medium truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </div>
                    <div className="flex-1 h-6 bg-muted/20 rounded-md overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-700"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          backgroundColor: c.color + "80",
                        }}
                      />
                      <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-mono text-muted-foreground">
                        ${c.normalGasCostUsd.toFixed(4)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px] shrink-0">
                      Save ${c.normalGasCostUsd.toFixed(4)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0">
                      <Clock className="h-3 w-3 inline mr-0.5" />{c.blockTime}s
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chain comparison table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Full Chain Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Chain</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Standard</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Gasless</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Normal Gas</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Gasless Cost</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Savings</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Finality</th>
                </tr>
              </thead>
              <tbody>
                {CHAINS.map((c) => (
                  <tr key={c.chain} className="border-b border-border/10 hover:bg-muted/10">
                    <td className="py-2.5 px-3 font-medium flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[10px]">{c.standard}</Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      {c.supported ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                          <Check className="h-3 w-3 mr-0.5" />Supported
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">N/A</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-red-400">${c.normalGasCostUsd.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">$0.0000</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">${c.normalGasCostUsd.toFixed(4)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{c.blockTime}s</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/30 font-medium">
                  <td colSpan={5} className="py-2.5 px-3 text-right text-muted-foreground">
                    Total savings per Arbitrum + Base sweep:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">
                    ${totalSaved.toFixed(4)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

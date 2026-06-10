import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import CountUp from "@/components/shared/CountUp";
import { Network, Bot, Cpu, Shield, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const agents = [
  { id: "Discovery", role: "Rate Scout", status: "active", task: "Fetching live USD/MXN rates from Bitso and Chainlink" },
  { id: "Router", role: "L2 Selector", status: "active", task: "Choosing optimal route: Arbitrum vs Base for next batch" },
  { id: "Treasury", role: "Executor", status: "idle", task: "Waiting for consensus on remittance batch approval" },
  { id: "Guardian", role: "Overseer", status: "active", task: "Reviewing pending high-value SPEI disbursement" },
];

const rules = [
  { name: "Majority Vote", condition: "2-of-3 agents agree", action: "Execute remittance", priority: 1 },
  { name: "Guardian Veto", condition: "Guardian flags anomaly", action: "Block and review", priority: 1 },
  { name: "High Value Alert", condition: "Amount > 500 USDC", action: "Require unanimous vote", priority: 2 },
  { name: "Gas Threshold", condition: "Gas > 30 gwei on ARB", action: "Defer to Base", priority: 3 },
  { name: "Cooldown Period", condition: "3+ transfers in 5 minutes", action: "Pause for 10 minutes", priority: 2 },
  { name: "New Beneficiary", condition: "Recipient KYC < 50", action: "Cap transfer at 10 USDC", priority: 2 },
];

const decisions = [
  { id: 1, decision: "Send 50 USDC to María López via Bitso/SPEI", votes: "2/3 approve", outcome: "executed", time: "14:32" },
  { id: 2, decision: "Create escrow E-0048 for Rosa García", votes: "3/3 approve", outcome: "executed", time: "14:28" },
  { id: 3, decision: "Transfer 500 USDC to unverified address", votes: "1/3 approve", outcome: "blocked", time: "14:15" },
  { id: 4, decision: "Route batch via Arbitrum (Base congested)", votes: "3/3 approve", outcome: "executed", time: "13:55" },
  { id: 5, decision: "Send 120 USDC to Carlos Mendoza — MXN 2,340", votes: "2/3 approve", outcome: "executed", time: "13:40" },
];

const networkHealth = [
  { chain: "Arbitrum", block: 198765432, rpc: "healthy", latency: "18ms" },
  { chain: "Base", block: 14823456, rpc: "healthy", latency: "12ms" },
  { chain: "Ethereum L1", block: 19847234, rpc: "healthy", latency: "45ms" },
  { chain: "Bitso API", block: 0, rpc: "healthy", latency: "28ms" },
  { chain: "SPEI Rail", block: 0, rpc: "healthy", latency: "35ms" },
];

export default function Swarm() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">4-Agent Council</h1>
        <p className="text-sm text-muted-foreground mt-1">Discovery · Router · Treasury · Guardian — coordinated consensus for every remittance.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Agents", value: 3, icon: Bot },
          { label: "Consensus Mode", value: "Majority", isText: true, icon: Network },
          { label: "Decisions Today", value: 47, icon: Cpu },
          { label: "Veto Count", value: 3, icon: Shield },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            </div>
            {s.isText ? (
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
            ) : (
              <div className="text-2xl font-bold tabular-nums tracking-tight"><CountUp target={s.value as number} /></div>
            )}
          </div>
        ))}
      </div>

      {/* Agent Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {agents.map((a) => (
          <div key={a.id} className="rounded-xl border border-border/50 bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-5 w-5" strokeWidth={1.5} style={{ color: a.id === "Guardian" ? "#FF4E00" : "#C6B6B1" }} />
              <div>
                <p className="text-sm font-semibold">{a.id}</p>
                <p className="text-[10px] text-muted-foreground">{a.role}</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-[9px] mb-2 ${a.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"}`}>{a.status}</Badge>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{a.task}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Rules */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Swarm Rules</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-5 py-2 font-medium">Rule</th>
                  <th className="text-left px-3 py-2 font-medium">Condition</th>
                  <th className="text-left px-3 py-2 font-medium">Action</th>
                  <th className="text-center px-5 py-2 font-medium">P</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {rules.map((r) => (
                  <tr key={r.name} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-2.5 text-xs font-medium">{r.name}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.condition}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.action}</td>
                    <td className="px-5 py-2.5 text-center"><Badge variant="outline" className="text-[9px]">P{r.priority}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Decisions */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Collective Decisions</h3>
          </div>
          <ScrollArea className="h-[260px]">
            <div className="divide-y divide-border/20">
              {decisions.map((d) => (
                <div key={d.id} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium">{d.decision}</p>
                    <span className="text-[10px] font-mono text-muted-foreground/60">{d.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{d.votes}</span>
                    <Badge variant="outline" className={`text-[9px] ml-auto ${d.outcome === "executed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>{d.outcome}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Network Health */}
      <div className="rounded-xl border border-border/50 bg-card/50">
        <div className="px-5 py-3 border-b border-border/40">
          <h3 className="text-sm font-semibold">Network Health</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-5 py-2 font-medium">Chain</th>
                <th className="text-right px-3 py-2 font-medium">Block</th>
                <th className="text-center px-3 py-2 font-medium">RPC</th>
                <th className="text-right px-5 py-2 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {networkHealth.map((n) => (
                <tr key={n.chain} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-2.5 text-xs font-medium">{n.chain}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-mono tabular-nums text-muted-foreground">{n.block.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-center">
                    {n.rpc === "healthy" ? <CheckCircle2 className="h-3.5 w-3.5 mx-auto" style={{ color: "#50AF95" }} /> : <Clock className="h-3.5 w-3.5 mx-auto text-yellow-400" />}
                  </td>
                  <td className="px-5 py-2.5 text-right text-xs tabular-nums text-muted-foreground">{n.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

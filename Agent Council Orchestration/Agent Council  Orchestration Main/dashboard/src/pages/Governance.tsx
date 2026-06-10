import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import CountUp from "@/components/shared/CountUp";
import { Vote, Plus, Check, X, Users, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

const proposals = [
  { id: "PROP-012", title: "Increase max transfer to 250 USDC", status: "voting", votesFor: 2, votesAgainst: 1, deadline: "2h 15m", description: "Raise the per-transaction transfer limit from 100 to 250 USDC." },
  { id: "PROP-011", title: "Add Base Mainnet as primary route", status: "approved", votesFor: 3, votesAgainst: 0, deadline: "Closed", description: "Make Base the default L2 for sub-$50 transfers due to lower fees." },
  { id: "PROP-010", title: "Reduce rebalance interval to daily", status: "rejected", votesFor: 1, votesAgainst: 2, deadline: "Closed", description: "Switch treasury rebalance from weekly to daily." },
  { id: "PROP-009", title: "Enable ZK proofs for KYC attestations", status: "approved", votesFor: 3, votesAgainst: 0, deadline: "Closed", description: "Use zero-knowledge proofs for privacy-preserving KYC verification." },
  { id: "PROP-008", title: "Whitelist Aave V3 yield vault", status: "voting", votesFor: 1, votesAgainst: 1, deadline: "5h 42m", description: "Add Aave V3 vault on Arbitrum to approved yield strategies." },
];

const consensusLog = [
  { id: 1, decision: "Transfer 2.5 USDC → María García (Base)", agents: ["approve", "approve", "deny"], outcome: "approved", time: "14:32" },
  { id: 2, decision: "Create escrow E-0047", agents: ["approve", "approve", "approve"], outcome: "approved", time: "14:28" },
  { id: 3, decision: "Swap 200 USDC to USDC (rebalance)", agents: ["approve", "approve", "approve"], outcome: "approved", time: "14:15" },
  { id: 4, decision: "Transfer 50 USDC → unverified recipient", agents: ["deny", "deny", "approve"], outcome: "rejected", time: "13:55" },
  { id: 5, decision: "Supply to Aave V3 (Arbitrum)", agents: ["approve", "approve", "deny"], outcome: "approved", time: "13:40" },
  { id: 6, decision: "Bridge USDC Arbitrum → Base", agents: ["approve", "approve", "approve"], outcome: "approved", time: "13:22" },
  { id: 7, decision: "Off-ramp 25 USDC via Bitso SPEI", agents: ["approve", "approve", "approve"], outcome: "approved", time: "13:10" },
  { id: 8, decision: "Transfer 100 USDC → unknown address", agents: ["deny", "deny", "deny"], outcome: "rejected", time: "12:55" },
  { id: 9, decision: "Rebalance Arbitrum/Base treasury", agents: ["approve", "approve", "approve"], outcome: "approved", time: "12:30" },
  { id: 10, decision: "Withdraw to external wallet", agents: ["deny", "approve", "deny"], outcome: "rejected", time: "12:15" },
];

const statusBadge = (s: string) => {
  if (s === "voting") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (s === "approved") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
};

export default function Governance() {
  const [voted, setVoted] = useState<Record<string, string>>({});

  const vote = (id: string, direction: string) => {
    setVoted((v) => ({ ...v, [id]: direction }));
    toast.success(`Vote recorded: ${direction} on ${id}`);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Democratic Decision-Making</h1>
        <p className="text-sm text-muted-foreground mt-1">Multi-agent governance with proposal voting and consensus tracking.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Proposals", value: 12, icon: Vote },
          { label: "Approval Rate", value: 75, suffix: "%", icon: ThumbsUp },
          { label: "Avg Participation", value: 96, suffix: "%", icon: Users },
          { label: "Active Votes", value: 2, icon: ThumbsDown },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight">
              <CountUp target={s.value} />{s.suffix}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Proposals */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Proposals</h3>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.info("Create proposal modal coming soon")}>
              <Plus className="h-3 w-3 mr-1" />New
            </Button>
          </div>
          <ScrollArea className="h-[380px]">
            <div className="divide-y divide-border/20">
              {proposals.map((p) => (
                <div key={p.id} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground/60">{p.id}</span>
                    <Badge variant="outline" className={`text-[9px] ${statusBadge(p.status)}`}>{p.status}</Badge>
                    {p.status === "voting" && <span className="text-[10px] text-muted-foreground ml-auto">{p.deadline}</span>}
                  </div>
                  <p className="text-sm font-medium mb-1">{p.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">{p.description}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Progress value={(p.votesFor + p.votesAgainst) > 0 ? (p.votesFor / (p.votesFor + p.votesAgainst)) * 100 : 0} className="h-1.5 bg-secondary" />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground">{p.votesFor}/{p.votesFor + p.votesAgainst}</span>
                    {p.status === "voting" && !voted[p.id] && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => vote(p.id, "for")}>
                          <Check className="h-3 w-3" style={{ color: "#50AF95" }} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => vote(p.id, "against")}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                    {voted[p.id] && <Badge variant="outline" className="text-[9px]">Voted</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Consensus Log */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Orchestrator Consensus Log</h3>
          </div>
          <ScrollArea className="h-[380px]">
            <div className="divide-y divide-border/20">
              {consensusLog.map((c) => (
                <div key={c.id} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium">{c.decision}</p>
                    <span className="text-[10px] font-mono text-muted-foreground/60">{c.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {c.agents.map((a, i) => (
                        <div key={i} className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-mono ${a === "approve" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                          {a === "approve" ? "Y" : "N"}
                        </div>
                      ))}
                    </div>
                    <Badge variant="outline" className={`text-[9px] ml-auto ${c.outcome === "approved" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                      {c.outcome}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

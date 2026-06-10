import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import CountUp from "@/components/shared/CountUp";
import { KeyRound, Plus, Check, X, Users, Clock } from "lucide-react";
import { toast } from "sonner";

const wallets = [
  { address: "0x7a3B...f82d", signers: 3, threshold: 2, balance: "$8,234.50", chain: "Arbitrum" },
  { address: "0x4bA8...d67f", signers: 3, threshold: 2, balance: "$3,120.00", chain: "Base" },
  { address: "0x2eC1...b45a", signers: 5, threshold: 3, balance: "$1,450.80", chain: "Arbitrum" },
];

const pendingTxs = [
  { id: "TX-001", description: "Transfer 500 USDC to remittance vault", signatures: 1, required: 2, signers: ["Agent A"], time: "5m ago" },
  { id: "TX-002", description: "Approve Bitso off-ramp spending", signatures: 1, required: 2, signers: ["Agent B"], time: "12m ago" },
  { id: "TX-003", description: "Bridge 200 USDC from Arbitrum to Base", signatures: 2, required: 3, signers: ["Agent A", "Agent C"], time: "25m ago" },
];

const history = [
  { id: "TX-098", description: "Transfer 50 USDC → María García on Base", signers: ["Agent A", "Agent B"], time: "1h ago", status: "executed" },
  { id: "TX-097", description: "Create escrow E-0047", signers: ["Agent A", "Agent B"], time: "2h ago", status: "executed" },
  { id: "TX-096", description: "Withdraw 1000 USDC", signers: ["Agent C"], time: "3h ago", status: "rejected" },
  { id: "TX-095", description: "Rebalance USDC across Arbitrum + Base", signers: ["Agent A", "Agent B", "Agent C"], time: "4h ago", status: "executed" },
  { id: "TX-094", description: "Fund Bitso off-ramp with 500 USDC", signers: ["Agent A", "Agent B"], time: "5h ago", status: "executed" },
];

export default function Multisig() {
  const [signed, setSigned] = useState<Record<string, boolean>>({});

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Multi-Signature Security</h1>
          <p className="text-sm text-muted-foreground mt-1">Multi-sig wallets with threshold signing and transaction approval.</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toast.info("Create multisig form coming soon")}>
          <Plus className="h-3 w-3 mr-1" />New Wallet
        </Button>
      </div>

      {/* Wallets */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {wallets.map((w) => (
          <div key={w.address} className="rounded-xl border border-border/50 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <span className="text-xs font-mono text-muted-foreground">{w.address}</span>
            </div>
            <p className="text-xl font-bold tabular-nums mb-2">{w.balance}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px]">{w.threshold}-of-{w.signers}</Badge>
              <Badge variant="outline" className="text-[9px]">{w.chain}</Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pending */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Pending Transactions</h3>
            <Badge className="text-[9px] bg-yellow-500/15 text-yellow-400 border-yellow-500/30" variant="outline">{pendingTxs.length}</Badge>
          </div>
          <ScrollArea className="h-[320px]">
            <div className="divide-y divide-border/20">
              {pendingTxs.map((tx) => (
                <div key={tx.id} className="px-5 py-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground/60">{tx.id}</span>
                    <Clock className="h-3 w-3 text-muted-foreground/40" />
                    <span className="text-[10px] text-muted-foreground/60">{tx.time}</span>
                  </div>
                  <p className="text-sm font-medium mb-2">{tx.description}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <Progress value={(tx.signatures / tx.required) * 100} className="h-1.5 flex-1 bg-secondary" />
                    <span className="text-[10px] tabular-nums text-muted-foreground">{tx.signatures}/{tx.required}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {tx.signers.map((s) => <Badge key={s} variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{s}</Badge>)}
                    </div>
                    {!signed[tx.id] && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setSigned((s) => ({ ...s, [tx.id]: true })); toast.success(`Signed ${tx.id}`); }}>
                          <Check className="h-3 w-3" style={{ color: "#50AF95" }} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toast.error(`Rejected ${tx.id}`)}>
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                    {signed[tx.id] && <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Signed</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* History */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Transaction History</h3>
          </div>
          <ScrollArea className="h-[320px]">
            <div className="divide-y divide-border/20">
              {history.map((tx) => (
                <div key={tx.id} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground/60">{tx.id}</span>
                    <Badge variant="outline" className={`text-[9px] ${tx.status === "executed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                      {tx.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground/60 ml-auto">{tx.time}</span>
                  </div>
                  <p className="text-xs mb-1">{tx.description}</p>
                  <div className="flex gap-1">
                    {tx.signers.map((s) => <Badge key={s} variant="outline" className="text-[8px]">{s}</Badge>)}
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

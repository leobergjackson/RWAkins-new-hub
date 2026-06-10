import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeftRight, Search, ExternalLink, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const recentTxs = [
  { hash: "0xabc1...def2", type: "transfer", amount: "50.0 USDC", chain: "Arbitrum", status: "confirmed", confirmations: 24, time: "2m ago", to: "María López → Bitso/SPEI" },
  { hash: "0xfed3...ba45", type: "escrow", amount: "120.0 USDC", chain: "Base", status: "confirmed", confirmations: 128, time: "12m ago", to: "Escrow E-0048 (Rosa García)" },
  { hash: "0x123a...789b", type: "swap", amount: "100.0 USDC", chain: "Arbitrum", status: "confirmed", confirmations: 18, time: "18m ago", to: "Uniswap V3" },
  { hash: "0xcc2d...8f3a", type: "transfer", amount: "35.0 USDC", chain: "Base", status: "confirmed", confirmations: 12, time: "25m ago", to: "Luis Torres → Bitso/SPEI" },
  { hash: "0x456c...012d", type: "yield", amount: "500.0 USDC", chain: "Arbitrum", status: "confirmed", confirmations: 45, time: "35m ago", to: "Aave V3" },
  { hash: "0x789e...345f", type: "bridge", amount: "200.0 USDC", chain: "Base", status: "confirmed", confirmations: 256, time: "1h ago", to: "Base Bridge" },
];

const pendingTxs = [
  { hash: "0xpnd1...abc2", type: "transfer", amount: "75.0 USDC", chain: "Arbitrum", status: "pending", time: "10s ago" },
  { hash: "0xpnd2...def3", type: "dca", amount: "25 USDC", chain: "Base", status: "mempool", time: "30s ago" },
];

const typeBadge = (t: string) => {
  const colors: Record<string, string> = {
    transfer: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    escrow: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    swap: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    yield: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    bridge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    dca: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };
  return colors[t] || "";
};

const explorerUrl = (chain: string, hash: string) => {
  const urls: Record<string, string> = {
    Arbitrum: `https://arbiscan.io/tx/${hash}`,
    Base: `https://basescan.org/tx/${hash}`,
    Ethereum: `https://etherscan.io/tx/${hash}`,
  };
  return urls[chain] || "#";
};

export default function Transactions() {
  const [lookupHash, setLookupHash] = useState("");
  const [looked, setLooked] = useState(false);

  const lookup = () => {
    if (!lookupHash.trim()) return;
    setLooked(true);
    toast.success("Transaction found");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">On-Chain Transaction Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">Track, verify, and explore all remittance transactions on Arbitrum + Base.</p>
      </div>

      {/* Lookup */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-5 mb-6">
        <h3 className="text-sm font-semibold mb-3">Transaction Lookup</h3>
        <div className="flex gap-2">
          <Input value={lookupHash} onChange={(e) => { setLookupHash(e.target.value); setLooked(false); }} placeholder="Enter transaction hash..." className="bg-card border-border/50 font-mono text-xs" />
          <Button onClick={lookup} variant="outline" className="shrink-0">
            <Search className="h-4 w-4 mr-2" />Lookup
          </Button>
        </div>
        {looked && (
          <div className="mt-4 rounded-lg bg-accent/30 p-4 grid sm:grid-cols-2 gap-3">
            {[
              { label: "Status", value: "Confirmed" },
              { label: "Confirmations", value: "24" },
              { label: "Block", value: "#19,847,234" },
              { label: "Gas Used", value: "21,000" },
              { label: "Gas Price", value: "12 gwei" },
              { label: "Total Fee", value: "$0.85" },
            ].map((f) => (
              <div key={f.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{f.label}</span>
                <span className="text-xs font-medium tabular-nums">{f.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        {/* Recent */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Recent Transactions</h3>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border/20">
              {recentTxs.map((tx) => (
                <div key={tx.hash} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#50AF95" }} />
                    <span className="text-xs font-mono text-muted-foreground">{tx.hash}</span>
                    <a href={explorerUrl(tx.chain, tx.hash)} target="_blank" rel="noopener noreferrer" className="ml-auto">
                      <ExternalLink className="h-3 w-3 text-muted-foreground/40 hover:text-foreground transition-colors" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[9px] ${typeBadge(tx.type)}`}>{tx.type}</Badge>
                    <span className="text-xs font-medium">{tx.amount}</span>
                    <span className="text-[10px] text-muted-foreground">&rarr; {tx.to}</span>
                    <Badge variant="outline" className="text-[9px]">{tx.chain}</Badge>
                    <span className="text-[10px] text-muted-foreground/60 ml-auto">{tx.confirmations} conf &middot; {tx.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Pending */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Pending Queue</h3>
            <Badge className="text-[9px] bg-yellow-500/15 text-yellow-400 border-yellow-500/30" variant="outline">{pendingTxs.length}</Badge>
          </div>
          <div className="divide-y divide-border/20">
            {pendingTxs.map((tx) => (
              <div key={tx.hash} className="px-5 py-4 hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400 shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground">{tx.hash}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[9px] ${typeBadge(tx.type)}`}>{tx.type}</Badge>
                  <span className="text-xs font-medium">{tx.amount}</span>
                  <Badge variant="outline" className="text-[9px] bg-yellow-500/15 text-yellow-400 border-yellow-500/30">{tx.status}</Badge>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground/40" />
                  <span className="text-[10px] text-muted-foreground/60">{tx.time}</span>
                </div>
              </div>
            ))}
          </div>
          {pendingTxs.length === 0 && <div className="p-8 text-center text-xs text-muted-foreground">No pending transactions</div>}
        </div>
      </div>
    </div>
  );
}

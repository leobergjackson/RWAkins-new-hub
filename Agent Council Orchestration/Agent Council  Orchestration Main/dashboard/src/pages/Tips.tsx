import { useState } from "react";
import { demoTipHistory, demoWallets, SUPPORTED_TOKENS } from "@/lib/demo-data";
import { useFetch } from "@/hooks/useFetch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};

const chainColors: Record<string, string> = {
  Arbitrum: "bg-[#28A0F0]/15 text-[#28A0F0] border-[#28A0F0]/30",
  Base: "bg-[#0052FF]/15 text-[#0052FF] border-[#0052FF]/30",
  Ethereum: "bg-[#627EEA]/15 text-[#627EEA] border-[#627EEA]/30",
};

function randomHex(len: number) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export default function Tips() {
  const { data: tips } = useFetch("/api/wallet/history", demoTipHistory);
  const [localTips, setLocalTips] = useState<typeof demoTipHistory>([]);
  const [search, setSearch] = useState("");
  const [chainFilter, setChainFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [tipForm, setTipForm] = useState({ address: "", amount: "", chain: "Arbitrum", token: "USDC" });

  const safeTips = Array.isArray(tips) ? tips : demoTipHistory;
  const allTips = [...localTips, ...safeTips];
  const filtered = allTips.filter((t) => {
    if (chainFilter !== "all" && t.chain !== chainFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search && !t.recipient.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sendTip = () => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const chain = tipForm.chain;
    const token = tipForm.token;
    const newTip = {
      id: Date.now(),
      date,
      recipient: tipForm.address.startsWith("@") || tipForm.address.startsWith("0x") ? tipForm.address : `@${tipForm.address}`,
      amount: tipForm.amount,
      token,
      chain,
      status: "pending" as const,
      txHash: `0x${randomHex(64)}`,
    };
    setLocalTips((prev) => [newTip, ...prev]);
    toast.success(`Transfer of ${tipForm.amount} ${token} sent to ${newTip.recipient} on ${chain}`);
    setOpen(false);
    setTipForm({ address: "", amount: "", chain: "Arbitrum", token: "USDC" });

    // Simulate confirmation after 2 seconds
    setTimeout(() => {
      setLocalTips((prev) =>
        prev.map((t) => (t.id === newTip.id ? { ...t, status: "confirmed" as const } : t))
      );
      toast.success(`Transfer of ${newTip.amount} ${token} to ${newTip.recipient} confirmed on ${chain}`);
    }, 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transfer History</h1>
          <p className="text-sm text-muted-foreground mt-1">Every remittance, every chain, fully auditable.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Send className="h-3.5 w-3.5 mr-2" />Send Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Send Transfer</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs">Recipient Address</Label>
                <Input placeholder="0x... or beneficiary name" value={tipForm.address} onChange={(e) => setTipForm({ ...tipForm, address: e.target.value })} className="mt-1 bg-background" />
              </div>
              <div>
                <Label className="text-xs">Token</Label>
                <Select value={tipForm.token} onValueChange={(v) => setTipForm({ ...tipForm, token: v })}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_TOKENS.map((t) => <SelectItem key={t.id} value={t.label}>{t.label} — {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Amount ({tipForm.token})</Label>
                <Input type="number" placeholder={tipForm.token === "XAU₮" ? "0.005" : "2.50"} value={tipForm.amount} onChange={(e) => setTipForm({ ...tipForm, amount: e.target.value })} className="mt-1 bg-background" />
              </div>
              <div>
                <Label className="text-xs">Chain</Label>
                <Select value={tipForm.chain} onValueChange={(v) => setTipForm({ ...tipForm, chain: v })}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(demoWallets) ? demoWallets : []).map((w) => <SelectItem key={w.chain} value={w.chain}>{w.chain}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={sendTip} className="w-full bg-primary hover:bg-primary/90" disabled={!tipForm.address || !tipForm.amount}>
                Send Transfer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search beneficiaries..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border/50" />
        </div>
        <Select value={chainFilter} onValueChange={setChainFilter}>
          <SelectTrigger className="w-[140px] bg-card border-border/50"><SelectValue placeholder="Chain" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Chains</SelectItem>
            {["Arbitrum", "Base", "Ethereum"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-card border-border/50"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[130px_1fr_60px_70px_90px_70px_1fr] gap-3 px-5 py-3 border-b border-border/40 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              <span>Date</span><span>Recipient</span><span className="text-right">Amount</span><span>Token</span><span>Chain</span><span>Status</span><span>TX Hash</span>
            </div>
            <div className="divide-y divide-border/30">
              {filtered.map((tip) => (
                <div key={tip.id} className="grid grid-cols-[130px_1fr_60px_70px_90px_70px_1fr] gap-3 px-5 py-3 text-sm items-center hover:bg-accent/30 transition-colors">
                  <span className="text-xs text-muted-foreground tabular-nums">{tip.date}</span>
                  <span className="font-medium truncate">{tip.recipient}</span>
                  <span className="text-right tabular-nums font-medium">{tip.amount}</span>
                  <span className={`text-xs font-medium ${(tip as Record<string, unknown>).token === "XAU₮" ? "text-[#D4A843]" : (tip as Record<string, unknown>).token === "USA₮" ? "text-[#1A3C6E]" : "text-[#26A17B]"}`}>{(tip as Record<string, unknown>).token ?? "USDC"}</span>
                  <Badge variant="outline" className={`text-[10px] w-fit ${chainColors[tip.chain] || ""}`}>{tip.chain}</Badge>
                  <Badge variant="outline" className={`text-[10px] w-fit ${statusColors[tip.status] || ""}`}>{tip.status}</Badge>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${tip.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
                  >
                    <span className="font-mono truncate">{tip.txHash.slice(0, 10)}...{tip.txHash.slice(-6)}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

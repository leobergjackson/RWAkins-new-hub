import { useState, useEffect } from "react";
import { demoEscrows, demoEscrowStats, demoWallets } from "@/lib/demo-data";
import { useFetch } from "@/hooks/useFetch";
import CountUp from "@/components/shared/CountUp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Lock, Plus, Key, RotateCcw } from "lucide-react";
import { toast } from "sonner";

function Countdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return <span className="font-mono tabular-nums">{h}h {m}m {s}s</span>;
}

const statusStyle: Record<string, string> = {
  locked: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  claimed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  refunded: "bg-zinc-400/15 text-zinc-300 border-zinc-400/30",
};

export default function Escrow() {
  const { data: rawEscrows } = useFetch("/api/escrow", demoEscrows);
  const escrows = Array.isArray(rawEscrows) ? rawEscrows : demoEscrows;
  const [createOpen, setCreateOpen] = useState(false);

  const statCards = [
    { label: "Created", value: demoEscrowStats.created },
    { label: "Claimed", value: demoEscrowStats.claimed },
    { label: "Refunded", value: demoEscrowStats.refunded },
    { label: "Locked", value: demoEscrowStats.locked },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Smart Escrow</h1>
          <p className="text-sm text-muted-foreground mt-1">Hash-locked. Time-bound. Trustless.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90"><Plus className="h-3.5 w-3.5 mr-2" />Create Escrow</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Create HTLC Escrow</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label className="text-xs">Recipient</Label><Input placeholder="0x..." className="mt-1 bg-background" /></div>
              <div><Label className="text-xs">Amount (USDT)</Label><Input type="number" placeholder="50.00" className="mt-1 bg-background" /></div>
              <div>
                <Label className="text-xs">Timelock</Label>
                <Select defaultValue="7200">
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3600">1 hour</SelectItem>
                    <SelectItem value="7200">2 hours</SelectItem>
                    <SelectItem value="14400">4 hours</SelectItem>
                    <SelectItem value="86400">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => { toast.success("Escrow E-0048 created — secret copied to clipboard"); setCreateOpen(false); }}>
                Create Escrow
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card/50 p-4 text-center">
            <CountUp target={s.value} className="text-2xl font-bold tabular-nums" />
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Escrow Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {escrows.map((esc) => (
          <div key={esc.id} className="rounded-xl border border-border/50 bg-card/50 p-5 hover:border-border transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{esc.id}</span>
              </div>
              <Badge variant="outline" className={`text-[10px] ${statusStyle[esc.status] || ""}`}>{esc.status}</Badge>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground mb-4">
              <div className="flex justify-between"><span>Recipient</span><code className="font-mono">{esc.recipient}</code></div>
              <div className="flex justify-between"><span>Amount</span><span className="font-medium text-foreground">{esc.amount} USDT</span></div>
              <div className="flex justify-between"><span>Chain</span><span>{esc.chain}</span></div>
              {esc.status === "locked" && (
                <div className="flex justify-between items-center">
                  <span>Time Left</span>
                  <span className="text-yellow-400 text-xs"><Countdown seconds={esc.timeLeft} /></span>
                </div>
              )}
            </div>
            {esc.status === "locked" && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => toast.success(`Escrow ${esc.id} claimed`)}>
                  <Key className="h-3 w-3 mr-1" />Claim
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs text-muted-foreground" onClick={() => toast.info(`Escrow ${esc.id} refunded`)}>
                  <RotateCcw className="h-3 w-3 mr-1" />Refund
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

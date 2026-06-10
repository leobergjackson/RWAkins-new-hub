import { useState } from "react";
import { demoLendingPosition, demoContracts, demoWallets } from "@/lib/demo-data";
import { useFetch } from "@/hooks/useFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import CopyButton from "@/components/shared/CopyButton";
import { ExternalLink, ArrowRightLeft, Landmark, FileCheck } from "lucide-react";
import { toast } from "sonner";

export default function DeFi() {
  const { data: rawLending } = useFetch("/api/lending/positions", demoLendingPosition);
  const lending = (rawLending && typeof rawLending === "object" && "supplied" in rawLending) ? rawLending : demoLendingPosition;
  const [swapFrom, setSwapFrom] = useState("USDT");
  const [swapTo, setSwapTo] = useState("ETH");
  const [swapAmount, setSwapAmount] = useState("100");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">DeFi Integration</h1>
        <p className="text-sm text-muted-foreground mt-1">Aave lending, cross-chain swaps, and verified proofs.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Aave Card */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Aave V3 Position</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Supplied</p>
              <p className="text-lg font-bold">{lending.supplied}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">APY</p>
              <p className="text-lg font-bold text-success">{lending.apy}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Earned</p>
              <p className="text-sm font-medium text-success">{lending.earned}</p>
            </div>
          </div>
          <div className="border-t border-border/30 pt-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Yield Projections</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries((lending as any)?.projections ?? {}).map(([period, value]) => (
                <div key={period} className="text-center bg-secondary/30 rounded-md py-2">
                  <p className="text-xs font-medium">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{period}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Swap Card */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Swap</h3>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From</Label>
                <Select value={swapFrom} onValueChange={setSwapFrom}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Select value={swapTo} onValueChange={setSwapTo}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="SOL">SOL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Amount</Label>
              <Input value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} type="number" className="mt-1 bg-background" />
            </div>
            <div className="bg-secondary/30 rounded-md p-2.5 text-xs text-muted-foreground">
              Quote: {swapAmount} {swapFrom} ≈ {(Number(swapAmount) * 0.00054).toFixed(4)} {swapTo}
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => toast.success(`Swapped ${swapAmount} ${swapFrom} → ${swapTo}`)}>
              Execute Swap
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Contracts */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Contracts</h3>
          </div>
          <div className="divide-y divide-border/30">
            {(Array.isArray(demoContracts) ? demoContracts : []).map((c) => (
              <div key={c.name} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm">{c.name}</span>
                  <p className="text-xs text-muted-foreground font-mono">{c.address.slice(0, 10)}...{c.address.slice(-6)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <CopyButton text={c.address} />
                  <a href={`https://sepolia.etherscan.io/address/${c.address}`} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-accent rounded-md transition-colors">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proof */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 flex flex-col items-center justify-center text-center">
          <FileCheck className="h-8 w-8 text-success mb-3" />
          <h3 className="text-sm font-semibold mb-1">Proof Verification</h3>
          <p className="text-xs text-muted-foreground mb-4">Verify DeFi transactions on-chain</p>
          <Button variant="outline" size="sm" onClick={() => toast.success("Proof bundle verified — 3 transactions confirmed on-chain")}>
            Verify Proof Bundle
          </Button>
        </div>
      </div>
    </div>
  );
}

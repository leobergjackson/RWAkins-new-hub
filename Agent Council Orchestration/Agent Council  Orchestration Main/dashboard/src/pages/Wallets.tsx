import { demoWallets } from "@/lib/demo-data";
import { useFetch } from "@/hooks/useFetch";
import CopyButton from "@/components/shared/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";

export default function Wallets() {
  const { data: rawWallets } = useFetch("/api/wallet/addresses", demoWallets);
  const wallets = Array.isArray(rawWallets) ? rawWallets : demoWallets;

  const truncate = (addr: string) =>
    addr.length > 16 ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : addr;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Multi-Chain Wallets</h1>
        <p className="text-sm text-muted-foreground mt-1">One seed. Nine chains. Non-custodial.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map((w) => (
          <div
            key={w.chain}
            className="rounded-xl border border-border/50 bg-card/50 overflow-hidden hover:border-border transition-all group"
            style={{ borderLeftWidth: 3, borderLeftColor: w.color }}
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: w.color }}
                  >
                    {w.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{w.chain}</h3>
                    <p className="text-[11px] text-muted-foreground">{w.symbol}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`h-1.5 w-1.5 rounded-full ${w.status === "active" ? "bg-success" : "bg-yellow-500"}`} />
                  <span className="text-[10px] text-muted-foreground capitalize">{w.status}</span>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-center gap-1 mb-4 bg-secondary/40 rounded-md px-2.5 py-1.5">
                <code className="text-[11px] font-mono text-muted-foreground flex-1 truncate">
                  {truncate(w.address)}
                </code>
                <CopyButton text={w.address} />
              </div>

              {/* Balances */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">USD₮</p>
                  <p className="text-sm font-semibold tabular-nums">${w.usdt}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{w.nativeSymbol}</p>
                  <p className="text-sm font-semibold tabular-nums">{w.native}</p>
                </div>
                {w.xaut && parseFloat(w.xaut) > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#D4A843" }}>XAU₮</p>
                    <p className="text-sm font-semibold tabular-nums">{w.xaut} <span className="text-[10px] text-muted-foreground">oz</span></p>
                  </div>
                )}
                {w.usat && parseFloat(w.usat) > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#1A3C6E" }}>USA₮</p>
                    <p className="text-sm font-semibold tabular-nums">${w.usat}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-border/30 px-5 py-2.5 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => toast.info(`Faucet link for ${w.chain} opened`)}
              >
                Fund
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => toast.success(`Gasless test sent on ${w.chain}`)}
              >
                Gasless Test
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

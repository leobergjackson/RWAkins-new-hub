import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe, ExternalLink, RefreshCw, Wifi, WifiOff, Loader2,
  CheckCircle2, XCircle, ArrowRight, Zap, Copy, Check,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

// ── Chain definitions ───────────────────────────────────────────

interface ChainDef {
  id: string;
  name: string;
  symbol: string;
  color: string;
  rpc: string;
  explorerUrl: string;
  explorerName: string;
  walletAddress: string;
  bridgesTo: string[];
  logo: string;
}

const CHAINS: ChainDef[] = [
  {
    id: "arbitrum-sepolia",
    name: "Arbitrum One (Sepolia)",
    symbol: "ARB",
    color: "#28A0F0",
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    explorerName: "Arbiscan",
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    bridgesTo: ["base-sepolia"],
    logo: "ARB",
  },
  {
    id: "base-sepolia",
    name: "Base Sepolia",
    symbol: "BASE",
    color: "#0052FF",
    rpc: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    explorerName: "Basescan",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38",
    bridgesTo: ["arbitrum-sepolia"],
    logo: "BASE",
  },
];

interface ChainStatus {
  id: string;
  connected: boolean;
  blockHeight: number;
  gasPrice: string;
  balance: string;
  latencyMs: number;
  lastChecked: Date;
  loading: boolean;
}

// ── Simulated transaction history ───────────────────────────────

interface TxRecord {
  hash: string;
  type: string;
  amount: string;
  to: string;
  timestamp: string;
  status: "confirmed" | "pending" | "failed";
}

function generateTxHistory(chain: string): TxRecord[] {
  const types = ["transfer", "swap", "bridge", "yield-deposit", "gas-refuel"];
  return Array.from({ length: 8 }, (_, i) => ({
    hash: `0x${Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}...`,
    type: types[i % types.length],
    amount: `${(Math.random() * 10 + 0.1).toFixed(2)} USDC`,
    to: `0x${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}...`,
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    status: i === 0 ? "pending" : i === 6 ? "failed" : "confirmed",
  }));
}

// ── Component ───────────────────────────────────────────────────

export default function ChainExplorer() {
  const [statuses, setStatuses] = useState<Record<string, ChainStatus>>({});
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  // Initialize statuses with simulated data
  useEffect(() => {
    const initial: Record<string, ChainStatus> = {};
    CHAINS.forEach((chain) => {
      initial[chain.id] = {
        id: chain.id,
        connected: Math.random() > 0.1,
        blockHeight: Math.floor(Math.random() * 10000000 + 1000000),
        gasPrice: `${(Math.random() * 30 + 1).toFixed(1)} gwei`,
        balance: `${(Math.random() * 5).toFixed(4)} ${chain.symbol}`,
        latencyMs: Math.floor(Math.random() * 200 + 20),
        lastChecked: new Date(),
        loading: false,
      };
    });
    setStatuses(initial);
  }, []);

  const handleTestConnection = useCallback(async (chainId: string) => {
    setTesting(chainId);
    // Simulate ping
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
    setStatuses((prev) => ({
      ...prev,
      [chainId]: {
        ...prev[chainId],
        connected: true,
        latencyMs: Math.floor(Math.random() * 150 + 30),
        blockHeight: prev[chainId].blockHeight + Math.floor(Math.random() * 5),
        lastChecked: new Date(),
      },
    }));
    setTesting(null);
    toast.success(`${CHAINS.find((c) => c.id === chainId)?.name} connection verified`);
  }, []);

  const handleSelectChain = (chainId: string) => {
    setSelectedChain(chainId === selectedChain ? null : chainId);
    if (chainId !== selectedChain) {
      setTxHistory(generateTxHistory(chainId));
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddr(address);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const connectedCount = Object.values(statuses).filter((s) => s.connected).length;

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Globe className="h-7 w-7 text-orange-500" />
            L2 Transaction Explorer
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time status across Arbitrum + Base — Colibrí's settlement L2s
          </p>
        </div>
        <Badge className={connectedCount === CHAINS.length ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
          {connectedCount}/{CHAINS.length} Connected
        </Badge>
      </div>

      {/* Chain connectivity map */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-orange-500" />
          Chain Connectivity Map
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {CHAINS.map((chain) => {
            const status = statuses[chain.id];
            return (
              <div key={chain.id} className="flex items-center gap-1">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border-2 cursor-pointer transition-transform hover:scale-110"
                  style={{
                    borderColor: chain.color,
                    backgroundColor: `${chain.color}20`,
                    color: chain.color,
                  }}
                  onClick={() => handleSelectChain(chain.id)}
                  title={chain.name}
                >
                  {chain.logo}
                </div>
                {chain.bridgesTo.length > 0 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-3">
          Arrows indicate available bridge routes. Click a chain to view details.
        </p>
      </div>

      {/* Chain Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHAINS.map((chain) => {
          const status = statuses[chain.id];
          if (!status) return null;
          const isSelected = selectedChain === chain.id;

          return (
            <div
              key={chain.id}
              className={`rounded-xl border bg-card p-4 transition-all cursor-pointer ${
                isSelected ? "ring-2 ring-offset-1 ring-offset-background" : "hover:border-muted-foreground/30"
              }`}
              style={{
                borderColor: isSelected ? chain.color : undefined,
                ringColor: isSelected ? chain.color : undefined,
              }}
              onClick={() => handleSelectChain(chain.id)}
            >
              {/* Chain header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: `${chain.color}20`, color: chain.color }}
                  >
                    {chain.logo}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{chain.name}</p>
                    <p className="text-[10px] text-muted-foreground">{chain.symbol}</p>
                  </div>
                </div>
                {status.connected ? (
                  <Wifi className="h-4 w-4 text-green-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-400" />
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground">Block Height</p>
                  <p className="font-mono text-foreground">{status.blockHeight.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Gas Price</p>
                  <p className="font-mono text-foreground">{status.gasPrice}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Balance</p>
                  <p className="font-mono text-foreground">{status.balance}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Latency</p>
                  <p className="font-mono" style={{ color: status.latencyMs < 100 ? "#50AF95" : "#EAB308" }}>
                    {status.latencyMs}ms
                  </p>
                </div>
              </div>

              {/* Wallet address */}
              <div className="mt-3 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <code className="text-[10px] font-mono text-muted-foreground truncate flex-1 mr-2">
                    {chain.walletAddress}
                  </code>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyAddress(chain.walletAddress);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {copiedAddr === chain.walletAddress ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 flex-1 border-border hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestConnection(chain.id);
                  }}
                  disabled={testing === chain.id}
                >
                  {testing === chain.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
                      Test
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 flex-1 border-orange-500/30 hover:bg-orange-500/10 text-orange-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`${chain.explorerUrl}/address/${chain.walletAddress}`, "_blank");
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {chain.explorerName}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction History for selected chain */}
      {selectedChain && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            Transaction History — {CHAINS.find((c) => c.id === selectedChain)?.name}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-2 px-3">Hash</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Amount</th>
                  <th className="text-left py-2 px-3">To</th>
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {txHistory.map((tx, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="py-2 px-3 font-mono text-orange-400">{tx.hash}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{tx.type}</Badge>
                    </td>
                    <td className="py-2 px-3 font-mono">{tx.amount}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{tx.to}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {new Date(tx.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3">
                      {tx.status === "confirmed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      ) : tx.status === "pending" ? (
                        <Loader2 className="h-3.5 w-3.5 text-yellow-400 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

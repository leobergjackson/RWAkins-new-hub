import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import CountUp from "@/components/shared/CountUp";
import { CandlestickChart, TrendingUp, TrendingDown, Play, Pause, Check, X, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const strategies = [
  { name: "ETH DCA Weekly", type: "DCA", status: "active", pnl: "+$127.45", pnlPositive: true },
  { name: "Stablecoin Yield", type: "yield", status: "active", pnl: "+$43.21", pnlPositive: true },
  { name: "ETH/USDT Rebalance", type: "rebalance", status: "active", pnl: "+$18.90", pnlPositive: true },
  { name: "Cross-DEX Arb", type: "arbitrage", status: "paused", pnl: "-$3.12", pnlPositive: false },
];

const traders = [
  { id: "T-001", strategy: "ETH DCA Weekly", status: "active", trades: 47, winRate: 82 },
  { id: "T-002", strategy: "Stablecoin Yield", status: "active", trades: 23, winRate: 91 },
  { id: "T-003", strategy: "ETH/USDT Rebalance", status: "active", trades: 12, winRate: 75 },
  { id: "T-004", strategy: "Cross-DEX Arb", status: "paused", trades: 156, winRate: 64 },
];

const trades = [
  { id: 1, pair: "ETH/USDT", side: "buy", entry: "$3,180", exit: "$3,245", chain: "Ethereum", pnl: "+$6.50", positive: true, time: "14:32" },
  { id: 2, pair: "USDT/USDC", side: "swap", entry: "$1.0001", exit: "$1.0003", chain: "Polygon", pnl: "+$0.02", positive: true, time: "14:28" },
  { id: 3, pair: "ETH/USDT", side: "buy", entry: "$3,165", exit: "$3,180", chain: "Arbitrum", pnl: "+$1.50", positive: true, time: "14:15" },
  { id: 4, pair: "SOL/USDT", side: "sell", entry: "$178", exit: "$175", chain: "Solana", pnl: "-$3.00", positive: false, time: "13:55" },
  { id: 5, pair: "ETH/USDT", side: "buy", entry: "$3,150", exit: "$3,165", chain: "Ethereum", pnl: "+$1.50", positive: true, time: "13:40" },
  { id: 6, pair: "TRX/USDT", side: "buy", entry: "$0.118", exit: "$0.121", chain: "Tron", pnl: "+$0.90", positive: true, time: "13:22" },
];

const predictions = [
  { id: 1, prediction: "ETH likely to test $3,300 resistance within 24h", confidence: 78, status: "pending" },
  { id: 2, prediction: "Gas fees will drop below 10 gwei tonight (UTC 22:00-06:00)", confidence: 85, status: "pending" },
  { id: 3, prediction: "SOL/USDT showing bearish divergence on 4h chart", confidence: 62, status: "pending" },
];

const typeBadge = (t: string) => {
  if (t === "DCA") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (t === "yield") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (t === "rebalance") return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
};

const dexVolumes = [
  { name: "Uniswap V3", volume: "$2.1B", share: 42 },
  { name: "PancakeSwap", volume: "$890M", share: 18 },
  { name: "SushiSwap", volume: "$340M", share: 7 },
  { name: "Curve", volume: "$520M", share: 10 },
  { name: "1inch", volume: "$780M", share: 16 },
  { name: "Others", volume: "$370M", share: 7 },
];

export default function Trading() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">DeFi Strategies & Predictions</h1>
        <p className="text-sm text-muted-foreground mt-1">Active trading strategies, execution history, and AI-powered market predictions.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Strategies", value: 3, icon: CandlestickChart },
          { label: "Total Trades", value: 238, icon: BarChart3 },
          { label: "Win Rate", value: 78, suffix: "%", icon: TrendingUp },
          { label: "Total P&L", value: 189, prefix: "+$", icon: TrendingDown },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight">
              {s.prefix}<CountUp target={s.value} />{s.suffix}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Strategies */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Active Strategies</h3>
          </div>
          <div className="divide-y divide-border/20">
            {strategies.map((s) => (
              <div key={s.name} className="px-5 py-3 flex items-center gap-3 hover:bg-accent/30 transition-colors">
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-[9px] ${typeBadge(s.type)}`}>{s.type}</Badge>
                    <Badge variant="outline" className={`text-[9px] ${s.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"}`}>{s.status}</Badge>
                  </div>
                </div>
                <span className={`text-sm font-mono tabular-nums ${s.pnlPositive ? "text-emerald-400" : "text-red-400"}`}>{s.pnl}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toast.success(`${s.status === "active" ? "Paused" : "Resumed"} ${s.name}`)}>
                  {s.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Traders */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Traders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-5 py-2 font-medium">ID</th>
                  <th className="text-left px-3 py-2 font-medium">Strategy</th>
                  <th className="text-center px-3 py-2 font-medium">Trades</th>
                  <th className="text-right px-5 py-2 font-medium">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {traders.map((t) => (
                  <tr key={t.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-2.5 text-xs font-mono">{t.id}</td>
                    <td className="px-3 py-2.5 text-xs">{t.strategy}</td>
                    <td className="px-3 py-2.5 text-center text-xs tabular-nums">{t.trades}</td>
                    <td className="px-5 py-2.5 text-right text-xs tabular-nums font-medium" style={{ color: t.winRate >= 75 ? "#50AF95" : undefined }}>{t.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Trade History */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Recent Trades</h3>
          </div>
          <ScrollArea className="h-[220px]">
            <div className="divide-y divide-border/20">
              {trades.map((t) => (
                <div key={t.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-accent/30 transition-colors">
                  <span className="text-xs font-medium w-20">{t.pair}</span>
                  <Badge variant="outline" className="text-[9px]">{t.side}</Badge>
                  <span className="text-[10px] text-muted-foreground">{t.entry} &rarr; {t.exit}</span>
                  <span className="text-[10px] text-muted-foreground/60 bg-secondary/50 px-1.5 py-0.5 rounded">{t.chain}</span>
                  <span className={`text-xs font-mono tabular-nums ml-auto ${t.positive ? "text-emerald-400" : "text-red-400"}`}>{t.pnl}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">{t.time}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Predictions */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">AI Predictions</h3>
          </div>
          <div className="divide-y divide-border/20">
            {predictions.map((p) => (
              <div key={p.id} className="px-5 py-3">
                <p className="text-xs leading-relaxed mb-2">{p.prediction}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tabular-nums text-muted-foreground">{p.confidence}%</span>
                  <div className="flex gap-1 ml-auto">
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => toast.success("Prediction accepted")}>
                      <Check className="h-3 w-3" style={{ color: "#50AF95" }} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => toast.info("Prediction dismissed")}>
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

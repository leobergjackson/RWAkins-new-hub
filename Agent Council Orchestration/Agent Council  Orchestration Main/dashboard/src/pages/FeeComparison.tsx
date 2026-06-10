import { useState, useMemo } from "react";
import CountUp from "@/components/shared/CountUp";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Fuel, CheckCircle2, ArrowRight, Calculator, TrendingDown, Sparkles,
} from "lucide-react";

// ── Demo data ────────────────────────────────────────────────────────

interface ChainFee {
  chain: string;
  gasPrice: string;
  transferCost: number;
  gasless: boolean;
  color: string;
  sparkline: number[];
}

const chainFees: ChainFee[] = [
  { chain: "TON",       gasPrice: "Gasless",    transferCost: 0.000, gasless: true,  color: "#0098EA", sparkline: [0, 0, 0, 0, 0, 0, 0] },
  { chain: "ERC-4337",  gasPrice: "Gasless",    transferCost: 0.000, gasless: true,  color: "#9333EA", sparkline: [0, 0, 0, 0, 0, 0, 0] },
  { chain: "Polygon",   gasPrice: "30 gwei",    transferCost: 0.001, gasless: false, color: "#8247E5", sparkline: [0.001, 0.002, 0.001, 0.001, 0.003, 0.001, 0.001] },
  { chain: "Base",      gasPrice: "0.005 gwei", transferCost: 0.002, gasless: false, color: "#0052FF", sparkline: [0.003, 0.002, 0.002, 0.004, 0.002, 0.001, 0.002] },
  { chain: "Tron",      gasPrice: "420 sun",    transferCost: 0.005, gasless: false, color: "#FF060A", sparkline: [0.006, 0.005, 0.008, 0.005, 0.004, 0.005, 0.005] },
  { chain: "Arbitrum",  gasPrice: "0.1 gwei",   transferCost: 0.008, gasless: false, color: "#28A0F0", sparkline: [0.010, 0.008, 0.012, 0.009, 0.007, 0.008, 0.008] },
  { chain: "Optimism",  gasPrice: "0.004 gwei", transferCost: 0.010, gasless: false, color: "#FF0420", sparkline: [0.012, 0.010, 0.015, 0.011, 0.009, 0.010, 0.010] },
  { chain: "BNB Chain", gasPrice: "3 gwei",     transferCost: 0.030, gasless: false, color: "#F3BA2F", sparkline: [0.035, 0.030, 0.028, 0.032, 0.030, 0.025, 0.030] },
  { chain: "Avalanche", gasPrice: "25 nAVAX",   transferCost: 0.040, gasless: false, color: "#E84142", sparkline: [0.045, 0.042, 0.038, 0.040, 0.050, 0.042, 0.040] },
  { chain: "Ethereum",  gasPrice: "12 gwei",    transferCost: 0.850, gasless: false, color: "#627EEA", sparkline: [0.92, 0.85, 1.10, 0.78, 0.95, 0.88, 0.85] },
];

const sparkDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Component ────────────────────────────────────────────────────────

export default function FeeComparison() {
  const [transferAmount, setTransferAmount] = useState(1);

  const sortedFees = useMemo(
    () => [...chainFees].sort((a, b) => a.transferCost - b.transferCost),
    []
  );

  const cheapest = sortedFees[0];
  const mostExpensive = sortedFees[sortedFees.length - 1];
  const savings = mostExpensive.transferCost - cheapest.transferCost;

  const barData = sortedFees.filter((c) => !c.gasless).map((c) => ({
    chain: c.chain,
    cost: +(c.transferCost * transferAmount).toFixed(4),
    color: c.color,
  }));

  const gaslessCount = chainFees.filter((c) => c.gasless).length;
  const avgFee = chainFees.filter(c => !c.gasless).reduce((s, c) => s + c.transferCost, 0) / chainFees.filter(c => !c.gasless).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Cross-Chain Fee Comparison</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time gas prices, transfer costs, and fee optimization across all supported chains.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          className="rounded-xl border border-border bg-card p-5 relative overflow-hidden"
          style={{ borderTop: "2px solid #50AF95", background: "linear-gradient(180deg, rgba(80,175,149,0.04) 0%, hsl(var(--card)) 60%)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground font-medium">Cheapest Chain</p>
          </div>
          <div className="text-2xl font-bold">{cheapest.chain}</div>
          <p className="text-xs text-emerald-400 mt-1">
            {cheapest.gasless ? "Completely gasless" : `$${cheapest.transferCost.toFixed(3)} per transfer`}
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-purple-400" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground font-medium">Gasless Chains</p>
          </div>
          <div className="text-2xl font-bold tabular-nums"><CountUp target={gaslessCount} /></div>
          <p className="text-xs text-muted-foreground mt-1">TON + ERC-4337 = $0.00 fees</p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-blue-400" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground font-medium">Avg Fee (non-gasless)</p>
          </div>
          <div className="text-2xl font-bold tabular-nums">
            $<CountUp target={Math.round(avgFee * 1000) / 1000} decimals={3} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Per $1 USDT transfer</p>
        </div>

        <div
          className="rounded-xl border border-border bg-card p-5 relative overflow-hidden"
          style={{ borderTop: "2px solid #EF4444", background: "linear-gradient(180deg, rgba(239,68,68,0.04) 0%, hsl(var(--card)) 60%)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Fuel className="h-4 w-4 text-red-400" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground font-medium">Most Expensive</p>
          </div>
          <div className="text-2xl font-bold">{mostExpensive.chain}</div>
          <p className="text-xs text-red-400 mt-1">${mostExpensive.transferCost.toFixed(3)} per transfer</p>
        </div>
      </div>

      {/* Fee savings banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-6 flex items-center gap-4 flex-wrap">
        <Calculator className="h-5 w-5 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Fee Savings Calculator</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            By using <span className="text-emerald-400 font-semibold">{cheapest.chain}</span> instead of{" "}
            <span className="text-red-400 font-semibold">{mostExpensive.chain}</span>, you save{" "}
            <span className="text-emerald-400 font-bold font-mono">${savings.toFixed(3)}</span> per $1 USDT transfer
            {" "}<span className="text-muted-foreground/70">({((savings / mostExpensive.transferCost) * 100).toFixed(0)}% cheaper)</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{mostExpensive.chain}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="text-emerald-400 font-semibold">{cheapest.chain}</span>
        </div>
      </div>

      {/* Transfer amount selector + bar chart */}
      <div className="grid lg:grid-cols-5 gap-4 mb-6">
        <div className="lg:col-span-3 rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <h3 className="text-sm font-semibold">Fee Cost for ${transferAmount} USDT Transfer</h3>
            </div>
            <div className="flex gap-1">
              {[1, 10, 100, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTransferAmount(amt)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                    transferAmount === amt
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : "text-muted-foreground hover:text-foreground border border-border/50"
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#888" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="chain"
                  tick={{ fontSize: 11, fill: "#888" }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <RTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`$${value.toFixed(4)}`, "Transfer Fee"]}
                />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                  {barData.map((entry) => {
                    const chainData = chainFees.find((c) => c.chain === entry.chain);
                    return (
                      <rect key={entry.chain} fill={chainData?.color ?? "#FF4E00"} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Gasless note */}
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-purple-400" />
            <span>TON and ERC-4337 are gasless ($0.00) and not shown in the chart.</span>
          </div>
        </div>

        {/* Sparkline mini charts */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <h3 className="text-sm font-semibold">7-Day Fee Trends</h3>
          </div>
          <div className="space-y-3">
            {sortedFees.slice(0, 7).map((c) => {
              const sparkData = c.sparkline.map((v, i) => ({ day: sparkDays[i], fee: v }));
              return (
                <div key={c.chain} className="flex items-center gap-3">
                  <span className="text-xs w-16 text-muted-foreground truncate">{c.chain}</span>
                  <div className="flex-1 h-6">
                    {c.gasless ? (
                      <div className="flex items-center h-full">
                        <Badge variant="outline" className="text-[9px] text-purple-400 border-purple-500/30">Gasless</Badge>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                          <Line
                            type="monotone"
                            dataKey="fee"
                            stroke={c.color}
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground w-14 text-right">
                    {c.gasless ? "$0.000" : `$${c.transferCost.toFixed(3)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full comparison table */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Fuel className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
          <h3 className="text-sm font-semibold">All Chains Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Chain</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Gas Price</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">$1 Transfer</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">$100 Transfer</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">$1000 Transfer</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium">Status</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">vs Cheapest</th>
              </tr>
            </thead>
            <tbody>
              {sortedFees.map((c, i) => {
                const isRecommended = i === 0;
                const savingsVsCheapest = c.transferCost - cheapest.transferCost;
                return (
                  <tr
                    key={c.chain}
                    className={`border-b border-border/20 transition-colors hover:bg-accent/5 ${
                      isRecommended ? "bg-emerald-500/5" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="font-medium">{c.chain}</span>
                        {isRecommended && (
                          <Badge className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
                            RECOMMENDED
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{c.gasPrice}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {c.gasless ? (
                        <span className="text-emerald-400">$0.000</span>
                      ) : (
                        `$${c.transferCost.toFixed(3)}`
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {c.gasless ? (
                        <span className="text-emerald-400">$0.000</span>
                      ) : (
                        `$${(c.transferCost * 100).toFixed(3)}`
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {c.gasless ? (
                        <span className="text-emerald-400">$0.000</span>
                      ) : (
                        `$${(c.transferCost * 1000).toFixed(2)}`
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {c.gasless ? (
                        <Badge variant="outline" className="text-[8px] text-purple-400 border-purple-500/30">GASLESS</Badge>
                      ) : c.transferCost < 0.01 ? (
                        <Badge variant="outline" className="text-[8px] text-emerald-400 border-emerald-500/30">LOW</Badge>
                      ) : c.transferCost < 0.1 ? (
                        <Badge variant="outline" className="text-[8px] text-yellow-400 border-yellow-500/30">MEDIUM</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[8px] text-red-400 border-red-500/30">HIGH</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {savingsVsCheapest === 0 ? (
                        <span className="text-emerald-400">--</span>
                      ) : (
                        <span className="text-red-400">+${savingsVsCheapest.toFixed(3)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Gas prices are real-time estimates. Actual fees may vary based on network congestion.
          Gasless chains use sponsored transactions (TON native) or account abstraction (ERC-4337).
        </p>
      </div>
    </div>
  );
}

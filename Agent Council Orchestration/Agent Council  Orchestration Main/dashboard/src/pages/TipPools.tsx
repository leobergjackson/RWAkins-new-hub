import { useState, useEffect } from "react";
import { useFetch } from "@/hooks/useFetch";
import CountUp from "@/components/shared/CountUp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Send, Trophy, Clock, Coins, ArrowRight } from "lucide-react";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────

interface Contributor {
  address: string;
  amount: number;
  timestamp: string;
}

interface Pool {
  id: string;
  creatorHandle: string;
  targetAmount: number;
  currentAmount: number;
  contributors: Contributor[];
  status: "active" | "filled" | "distributed" | "expired";
  chain: string;
  expiresAt: string;
  createdAt: string;
  distributedTxHash?: string;
}

interface PoolStats {
  totalPools: number;
  activePools: number;
  filledPools: number;
  distributedPools: number;
  expiredPools: number;
  totalContributed: number;
  totalDistributed: number;
  uniqueContributors: number;
}

// ── Demo fallback data ──────────────────────────────────────────────

const now = Date.now();
const demoPools: Pool[] = [
  {
    id: "pool-bongino-001",
    creatorHandle: "María López (Guadalajara)",
    targetAmount: 50,
    currentAmount: 35,
    contributors: Array.from({ length: 8 }, (_, i) => ({
      address: `0x${(i + 1).toString(16).padStart(40, "a")}`,
      amount: [10, 5, 3, 5, 2, 4, 3, 3][i],
      timestamp: new Date(now - (8 - i) * 3600000).toISOString(),
    })),
    status: "active",
    chain: "arbitrum",
    expiresAt: new Date(now + 5 * 86400000).toISOString(),
    createdAt: new Date(now - 2 * 86400000).toISOString(),
  },
  {
    id: "pool-tucker-001",
    creatorHandle: "Rosa García (Monterrey)",
    targetAmount: 50,
    currentAmount: 50,
    contributors: Array.from({ length: 12 }, (_, i) => ({
      address: `0x${(i + 10).toString(16).padStart(40, "b")}`,
      amount: [8, 5, 3, 5, 2, 4, 3, 5, 3, 4, 5, 3][i],
      timestamp: new Date(now - (20 - i * 1.5) * 3600000).toISOString(),
    })),
    status: "filled",
    chain: "base",
    expiresAt: new Date(now + 5 * 86400000).toISOString(),
    createdAt: new Date(now - 3 * 86400000).toISOString(),
  },
  {
    id: "pool-timpool-001",
    creatorHandle: "Carlos Mendoza (CDMX)",
    targetAmount: 25,
    currentAmount: 10,
    contributors: Array.from({ length: 3 }, (_, i) => ({
      address: `0x${(i + 20).toString(16).padStart(40, "c")}`,
      amount: [5, 3, 2][i],
      timestamp: new Date(now - (10 - i * 3) * 3600000).toISOString(),
    })),
    status: "active",
    chain: "base",
    expiresAt: new Date(now + 5 * 86400000).toISOString(),
    createdAt: new Date(now - 86400000).toISOString(),
  },
];

const demoStats: PoolStats = {
  totalPools: 3,
  activePools: 2,
  filledPools: 1,
  distributedPools: 0,
  expiredPools: 0,
  totalContributed: 95,
  totalDistributed: 0,
  uniqueContributors: 23,
};

// ── Helpers ─────────────────────────────────────────────────────────

const statusStyle: Record<string, string> = {
  active: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  filled: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  distributed: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  expired: "bg-zinc-400/15 text-zinc-300 border-zinc-400/30",
};

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);
  const d = Math.floor(remaining / 86400);
  const h = Math.floor((remaining % 86400) / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  return (
    <span className="font-mono tabular-nums text-xs text-muted-foreground">
      {d}d {h}h {m}m
    </span>
  );
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{current} / {target} USDC</span>
        <span className="font-semibold text-primary">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── API helpers ────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL || "http://localhost:3141/api";

async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Main Component ──────────────────────────────────────────────────

export default function TipPools() {
  const { data: rawPools } = useFetch("/api/pools", { pools: demoPools });
  const { data: rawStats } = useFetch("/api/pools/stats", demoStats);

  const pools: Pool[] = Array.isArray(rawPools) ? rawPools : (rawPools as { pools?: Pool[] })?.pools ?? demoPools;
  const stats: PoolStats = (rawStats && typeof rawStats === "object" && "totalPools" in rawStats)
    ? rawStats as PoolStats
    : demoStats;

  const [createOpen, setCreateOpen] = useState(false);
  const [contributePoolId, setContributePoolId] = useState<string | null>(null);
  const [expandedPool, setExpandedPool] = useState<string | null>(null);

  // Create pool form
  const [newHandle, setNewHandle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newChain, setNewChain] = useState("ethereum-sepolia");

  // Contribute form
  const [contribAmount, setContribAmount] = useState("");
  const [contribAddress, setContribAddress] = useState("");

  const handleCreate = async () => {
    if (!newHandle || !newTarget) { toast.error("All fields required"); return; }
    try {
      const res = await apiPost("/pools", { creatorHandle: newHandle, targetAmount: newTarget, chain: newChain });
      if (res.pool) {
        toast.success(`Pool created for ${newHandle}`);
        setCreateOpen(false);
        setNewHandle(""); setNewTarget(""); setNewChain("ethereum-sepolia");
      } else {
        toast.error(res.error || "Failed to create pool");
      }
    } catch { toast.error("Network error"); }
  };

  const handleContribute = async (poolId: string) => {
    if (!contribAmount || !contribAddress) { toast.error("Amount and address required"); return; }
    try {
      const res = await apiPost(`/pools/${poolId}/contribute`, { amount: contribAmount, contributorAddress: contribAddress });
      if (res.pool) {
        toast.success(`Contributed ${contribAmount} USDC`);
        setContributePoolId(null);
        setContribAmount(""); setContribAddress("");
      } else {
        toast.error(res.error || "Contribution failed");
      }
    } catch { toast.error("Network error"); }
  };

  const handleDistribute = async (poolId: string) => {
    try {
      const res = await apiPost(`/pools/${poolId}/distribute`, {});
      if (res.pool) {
        toast.success(`Distributed! TX: ${res.txHash?.slice(0, 12)}...`);
      } else {
        toast.error(res.error || "Distribution failed");
      }
    } catch { toast.error("Network error"); }
  };

  const statCards = [
    { label: "Total Pools", value: stats.totalPools, icon: Users },
    { label: "Active", value: stats.activePools, icon: Clock },
    { label: "Total Contributed", value: stats.totalContributed, suffix: " USDC", icon: Coins },
    { label: "Contributors", value: stats.uniqueContributors, icon: Trophy },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Group Remittances</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Family pools for collective remittances. Contributors send USDC, beneficiary collects via Bitso/SPEI when the target is hit.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5 mr-2" />Create Family Pool
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Create Family Pool</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs">Beneficiary Name</Label>
                <Input placeholder="e.g. María López (Guadalajara)" value={newHandle} onChange={(e) => setNewHandle(e.target.value)} className="mt-1 bg-background" />
              </div>
              <div>
                <Label className="text-xs">Target Amount (USDC)</Label>
                <Input type="number" placeholder="50" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} className="mt-1 bg-background" />
              </div>
              <div>
                <Label className="text-xs">Chain</Label>
                <Select value={newChain} onValueChange={setNewChain}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="ethereum-sepolia">Ethereum Sepolia (testnet)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreate}>Create Family Pool</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </div>
            <div className="text-xl font-bold">
              <CountUp end={s.value} duration={1.2} />{s.suffix || ""}
            </div>
          </div>
        ))}
      </div>

      {/* Pool Cards */}
      <div className="space-y-4">
        {pools.map((pool) => (
          <div
            key={pool.id}
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
          >
            {/* Pool Header */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                  {pool.creatorHandle.replace("@", "").charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold">{pool.creatorHandle}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{pool.chain}</span>
                    <span>|</span>
                    <span>{pool.contributors.length} contributors</span>
                    {(pool.status === "active") && (
                      <>
                        <span>|</span>
                        <Clock className="h-3 w-3 inline" />
                        <Countdown expiresAt={pool.expiresAt} />
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusStyle[pool.status] || ""}>
                  {pool.status}
                </Badge>
                {pool.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setContributePoolId(contributePoolId === pool.id ? null : pool.id)}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />Contribute
                  </Button>
                )}
                {pool.status === "filled" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleDistribute(pool.id)}
                  >
                    <ArrowRight className="h-3.5 w-3.5 mr-1" />Distribute
                  </Button>
                )}
              </div>
            </div>

            {/* Progress */}
            <ProgressBar current={pool.currentAmount} target={pool.targetAmount} />

            {/* Contribute Form (inline) */}
            {contributePoolId === pool.id && (
              <div className="mt-4 p-3 rounded-lg border border-border bg-background space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Amount (USDC)</Label>
                    <Input type="number" placeholder="5" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Your Address</Label>
                    <Input placeholder="0x..." value={contribAddress} onChange={(e) => setContribAddress(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={() => handleContribute(pool.id)}>
                  Send Contribution
                </Button>
              </div>
            )}

            {/* Distributed tx hash */}
            {pool.distributedTxHash && (
              <div className="mt-3 text-xs text-muted-foreground">
                TX: <span className="font-mono text-purple-400">{pool.distributedTxHash}</span>
              </div>
            )}

            {/* Contributor List (expandable) */}
            <div className="mt-3">
              <button
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setExpandedPool(expandedPool === pool.id ? null : pool.id)}
              >
                {expandedPool === pool.id ? "Hide" : "Show"} contributors ({pool.contributors.length})
              </button>
              {expandedPool === pool.id && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {pool.contributors.map((c, i) => (
                    <div
                      key={`${c.address}-${i}`}
                      className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30"
                    >
                      <span className="font-mono text-muted-foreground">
                        {c.address.slice(0, 8)}...{c.address.slice(-6)}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{c.amount} USDT</span>
                        <span className="text-muted-foreground">
                          {new Date(c.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

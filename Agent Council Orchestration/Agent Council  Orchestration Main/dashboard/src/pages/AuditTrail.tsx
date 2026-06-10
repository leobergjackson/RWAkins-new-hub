import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck, Download, ExternalLink, Filter,
  RefreshCw, Shield, TrendingUp, Clock, Hash,
  CheckCircle2, XCircle, AlertTriangle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// ── Types ──────────────────────────────────────────────────────

interface AgentVote {
  agent: string;
  vote: string;
  confidence: number;
}

interface AuditDecision {
  timestamp: string;
  decisionId: string;
  type: string;
  input: string;
  reasoning: string;
  agentVotes: AgentVote[];
  guardianVerdict: string;
  outcome: string;
  txHash?: string;
  chain?: string;
  gasUsed?: string;
  executionTimeMs: number;
  riskScore?: number;
  hash?: string;
}

interface AuditStats {
  totalDecisions: number;
  approvalRate: number;
  rejectionRate: number;
  vetoRate: number;
  avgConfidence: number;
  avgExecutionTimeMs: number;
  byType: Record<string, number>;
  byOutcome: Record<string, number>;
  byChain: Record<string, number>;
  transactionsWithHash: number;
  cycleCount: number;
  uptimeMs: number;
}

// ── Explorer URLs ──────────────────────────────────────────────

const EXPLORER_MAP: Record<string, string> = {
  "arbitrum": "https://arbiscan.io/tx/",
  "base": "https://basescan.org/tx/",
  "ethereum": "https://etherscan.io/tx/",
};

function getExplorerUrl(chain: string, txHash: string): string {
  const base = EXPLORER_MAP[chain?.toLowerCase()] ?? EXPLORER_MAP["arbitrum"];
  return `${base}${txHash}`;
}

// ── Helpers ────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function avgConfidence(votes: AgentVote[]): number {
  if (!votes || votes.length === 0) return 0;
  return Math.round((votes.reduce((s, v) => s + v.confidence, 0) / votes.length) * 100);
}

const typeBadge = (t: string) => {
  const map: Record<string, string> = {
    transfer: "bg-primary/15 text-primary border-primary/30",
    escrow: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    swap: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    yield: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    security: "bg-red-500/15 text-red-400 border-red-500/30",
    dca: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    bridge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    governance: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  };
  return map[t] ?? "bg-muted text-muted-foreground border-muted";
};

const outcomeBadge = (o: string) => {
  if (o === "approved" || o === "executed") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (o === "rejected" || o === "failed") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (o === "vetoed") return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  return "bg-muted text-muted-foreground border-muted";
};

const outcomeIcon = (o: string) => {
  if (o === "approved" || o === "executed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (o === "rejected" || o === "failed") return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  if (o === "vetoed") return <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
};

// ── Fallback data (shown before API connects) ──────────────────

const FALLBACK_STATS: AuditStats = {
  totalDecisions: 47,
  approvalRate: 78,
  rejectionRate: 12,
  vetoRate: 4,
  avgConfidence: 0.84,
  avgExecutionTimeMs: 342,
  byType: { transfer: 22, escrow: 8, swap: 6, yield: 5, security: 3, dca: 2, bridge: 1 },
  byOutcome: { executed: 32, rejected: 6, vetoed: 2, failed: 3, approved: 4 },
  byChain: { "arbitrum": 28, "base": 19 },
  transactionsWithHash: 32,
  cycleCount: 53,
  uptimeMs: 7_200_000,
};

const FALLBACK_DECISIONS: AuditDecision[] = [
  {
    timestamp: new Date(Date.now() - 120_000).toISOString(),
    decisionId: "dec_transfer_001",
    type: "transfer",
    input: "Beneficiary María Flores requested remittance of 2.5 USDC, KYC verified, Bitso account active",
    reasoning: "ReAct chain: OBSERVE -> recipient KYC score 0.94 exceeds threshold 0.7 -> THINK -> beneficiary verified, SPEI off-ramp ready -> ACT -> send 2.5 USDC via Arbitrum, off-ramp to MXN via Bitso/SPEI -> REFLECT -> transfer completed in 88s, recipient confirmed payout",
    agentVotes: [
      { agent: "AnalystAgent", vote: "approve", confidence: 0.91 },
      { agent: "RiskAgent", vote: "approve", confidence: 0.87 },
      { agent: "TreasuryAgent", vote: "approve", confidence: 0.82 },
    ],
    guardianVerdict: "approved",
    outcome: "executed",
    txHash: "0xabc123def456789012345678901234567890abcdef1234567890abcdef123456",
    chain: "arbitrum",
    gasUsed: "21000",
    executionTimeMs: 287,
    riskScore: 0.12,
    hash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
  {
    timestamp: new Date(Date.now() - 300_000).toISOString(),
    decisionId: "dec_security_002",
    type: "security",
    input: "Anomaly detected: unusual transfer pattern from wallet 0x742d...bD28",
    reasoning: "ReAct chain: OBSERVE -> anomaly score 0.82 detected -> THINK -> potential sybil attack, risk exceeds safety threshold -> ACT -> block transaction and flag wallet -> REFLECT -> guardian agrees, wallet added to watchlist",
    agentVotes: [
      { agent: "AnalystAgent", vote: "reject", confidence: 0.88 },
      { agent: "RiskAgent", vote: "reject", confidence: 0.95 },
      { agent: "TreasuryAgent", vote: "abstain", confidence: 0.60 },
    ],
    guardianVerdict: "vetoed",
    outcome: "vetoed",
    executionTimeMs: 156,
    riskScore: 0.82,
    hash: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
  },
  {
    timestamp: new Date(Date.now() - 480_000).toISOString(),
    decisionId: "dec_yield_003",
    type: "yield",
    input: "Aave V3 yield opportunity: 4.2% APY on USDC, current allocation is 0%",
    reasoning: "ReAct chain: OBSERVE -> Aave yield 4.2% > threshold 3% -> THINK -> treasury has idle funds, yield strategy approved -> ACT -> supply 50 USDC to Aave V3 pool on Arbitrum -> REFLECT -> supply confirmed, monitoring position",
    agentVotes: [
      { agent: "AnalystAgent", vote: "approve", confidence: 0.89 },
      { agent: "RiskAgent", vote: "approve", confidence: 0.78 },
      { agent: "TreasuryAgent", vote: "approve", confidence: 0.92 },
    ],
    guardianVerdict: "approved",
    outcome: "executed",
    txHash: "0xdef789abc012345678901234567890abcdef1234567890abcdef1234567890ab",
    chain: "arbitrum",
    gasUsed: "145000",
    executionTimeMs: 512,
    riskScore: 0.25,
    hash: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
  },
  {
    timestamp: new Date(Date.now() - 600_000).toISOString(),
    decisionId: "dec_escrow_004",
    type: "escrow",
    input: "Milestone delivery confirmed for project #E-0047 by beneficiary Carlos Mendoza",
    reasoning: "ReAct chain: OBSERVE -> milestone proof submitted with 3/3 validator signatures -> THINK -> escrow conditions met, release funds -> ACT -> release 50 USDC from escrow to Carlos Mendoza on Base -> REFLECT -> escrow completed successfully",
    agentVotes: [
      { agent: "AnalystAgent", vote: "approve", confidence: 0.95 },
      { agent: "RiskAgent", vote: "approve", confidence: 0.90 },
      { agent: "TreasuryAgent", vote: "approve", confidence: 0.88 },
    ],
    guardianVerdict: "not_required",
    outcome: "executed",
    txHash: "0x456789abcdef012345678901234567890abcdef1234567890abcdef12345678",
    chain: "base",
    gasUsed: "35000",
    executionTimeMs: 390,
    riskScore: 0.08,
    hash: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
  },
  {
    timestamp: new Date(Date.now() - 900_000).toISOString(),
    decisionId: "dec_swap_005",
    type: "swap",
    input: "Cross-L2 rebalancing: Base USDC balance low (< 10 USDC), Arbitrum has surplus",
    reasoning: "ReAct chain: OBSERVE -> Base balance 3.2 USDC < threshold 10 -> THINK -> need to bridge funds for upcoming remittances -> ACT -> bridge 25 USDC from Arbitrum to Base -> REFLECT -> bridge initiated, confirming in ~5 min",
    agentVotes: [
      { agent: "AnalystAgent", vote: "approve", confidence: 0.86 },
      { agent: "RiskAgent", vote: "approve", confidence: 0.81 },
      { agent: "TreasuryAgent", vote: "approve", confidence: 0.93 },
    ],
    guardianVerdict: "approved",
    outcome: "executed",
    txHash: "0x789abcdef0123456789012345678901234567890abcdef1234567890abcdef01",
    chain: "arbitrum",
    gasUsed: "89000",
    executionTimeMs: 445,
    riskScore: 0.18,
    hash: "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
  },
];

// ── Component ──────────────────────────────────────────────────

export default function AuditTrail() {
  const [decisions, setDecisions] = useState<AuditDecision[]>(FALLBACK_DECISIONS);
  const [stats, setStats] = useState<AuditStats>(FALLBACK_STATS);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/audit/stats`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok !== false && data.totalDecisions !== undefined) {
          setStats(data);
        }
      }
    } catch {
      // Use fallback
    }
  }, []);

  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`${API_BASE}/audit/decisions?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok !== false && data.decisions?.length > 0) {
          setDecisions(data.decisions);
          setTotalPages(data.totalPages ?? 1);
        }
      }
    } catch {
      // Use fallback
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchDecisions(); }, [fetchDecisions]);

  const handleExportProof = async () => {
    try {
      const res = await fetch(`${API_BASE}/audit/proof`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `colibri-proof-bundle-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Proof bundle exported");
      } else {
        toast.error("Failed to export proof bundle");
      }
    } catch {
      toast.error("Failed to connect to agent API");
    }
  };

  const statCards = [
    { label: "Total Decisions", value: stats.totalDecisions, icon: ClipboardCheck, color: "text-primary" },
    { label: "Approval Rate", value: `${stats.approvalRate}%`, icon: TrendingUp, color: "text-emerald-400" },
    { label: "Avg Confidence", value: `${Math.round((stats.avgConfidence ?? 0) * 100)}%`, icon: Shield, color: "text-blue-400" },
    { label: "On-Chain TXs", value: stats.transactionsWithHash, icon: Hash, color: "text-purple-400" },
    { label: "Autonomous Cycles", value: stats.cycleCount, icon: RefreshCw, color: "text-yellow-400" },
    { label: "Uptime", value: formatUptime(stats.uptimeMs), icon: Clock, color: "text-cyan-400" },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold mb-1 flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              Decision Audit Trail
            </h1>
            <p className="text-muted-foreground text-sm">
              Verifiable proof of every autonomous decision made by the Colibrí agent.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchStats(); fetchDecisions(); }}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleExportProof}
              className="gap-1.5 bg-primary hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              Export Proof Bundle
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/50 bg-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="text-xl font-bold font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Type breakdown */}
      <div className="rounded-lg border border-border/50 bg-card p-4 mb-6">
        <h3 className="text-sm font-semibold mb-3">Decision Breakdown by Type</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2 rounded-md border border-border/30 px-3 py-1.5">
              <Badge variant="outline" className={`text-[10px] ${typeBadge(type)}`}>{type}</Badge>
              <span className="font-mono text-sm font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="escrow">Escrow</SelectItem>
            <SelectItem value="swap">Swap</SelectItem>
            <SelectItem value="yield">Yield</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="dca">DCA</SelectItem>
            <SelectItem value="bridge">Bridge</SelectItem>
            <SelectItem value="governance">Governance</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          Page {page} of {totalPages}
        </span>
      </div>

      {/* Decision Timeline */}
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-3">
          {loading && (
            <div className="text-center py-8 text-muted-foreground">Loading decisions...</div>
          )}
          {!loading && decisions.map((d) => {
            const isExpanded = expanded === d.decisionId;
            const conf = avgConfidence(d.agentVotes);

            return (
              <div
                key={d.decisionId}
                className="rounded-lg border border-border/50 bg-card hover:border-border transition-colors cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : d.decisionId)}
              >
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {outcomeIcon(d.outcome)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className={`text-[10px] ${typeBadge(d.type)}`}>
                        {d.type}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">{d.decisionId}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{d.input}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {d.txHash && (
                      <a
                        href={getExplorerUrl(d.chain ?? "ethereum-sepolia", d.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:underline text-[10px] font-mono flex items-center gap-1"
                      >
                        {d.txHash.slice(0, 8)}...
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <div className="text-right">
                      <div className="text-xs font-mono">{conf}%</div>
                      <div className="text-[10px] text-muted-foreground">confidence</div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${outcomeBadge(d.outcome)}`}>
                      {d.outcome}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatTime(d.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border/30 px-4 py-3 space-y-3 text-xs">
                    {/* Reasoning */}
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">ReAct Reasoning Chain</div>
                      <p className="text-muted-foreground leading-relaxed font-mono bg-muted/30 rounded p-2">
                        {d.reasoning}
                      </p>
                    </div>

                    {/* Agent votes */}
                    {d.agentVotes.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground mb-1 tracking-wider">Agent Consensus Votes</div>
                        <div className="flex gap-2">
                          {d.agentVotes.map((v, i) => (
                            <div key={i} className="rounded border border-border/30 px-2.5 py-1.5 bg-muted/20">
                              <div className="font-medium">{v.agent}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className={`text-[9px] ${v.vote === "approve" ? "text-emerald-400 border-emerald-500/30" : v.vote === "reject" ? "text-red-400 border-red-500/30" : "text-muted-foreground"}`}>
                                  {v.vote}
                                </Badge>
                                <span className="font-mono text-muted-foreground">{Math.round(v.confidence * 100)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Guardian & metadata */}
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Guardian</div>
                        <Badge variant="outline" className={`text-[10px] mt-0.5 ${d.guardianVerdict === "approved" || d.guardianVerdict === "not_required" ? "text-emerald-400 border-emerald-500/30" : "text-orange-400 border-orange-500/30"}`}>
                          {d.guardianVerdict}
                        </Badge>
                      </div>
                      {d.chain && (
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Chain</div>
                          <span className="font-mono">{d.chain}</span>
                        </div>
                      )}
                      {d.gasUsed && (
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Gas Used</div>
                          <span className="font-mono">{parseInt(d.gasUsed).toLocaleString()}</span>
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Execution Time</div>
                        <span className="font-mono">{d.executionTimeMs}ms</span>
                      </div>
                      {d.riskScore !== undefined && (
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Risk Score</div>
                          <span className={`font-mono ${d.riskScore > 0.7 ? "text-red-400" : d.riskScore > 0.4 ? "text-yellow-400" : "text-emerald-400"}`}>
                            {d.riskScore.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {d.hash && (
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground tracking-wider">SHA-256 Hash</div>
                          <span className="font-mono text-muted-foreground">{d.hash.slice(0, 16)}...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          className="gap-1"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </Button>
        <span className="text-xs text-muted-foreground px-3">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage(p => p + 1)}
          className="gap-1"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

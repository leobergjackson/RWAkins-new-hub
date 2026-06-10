import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrainCircuit, CheckCircle, XCircle } from "lucide-react";

const memoryEntries = [
  { key: "trusted_beneficiaries", value: "María García, Luis Hernández, Rosa Martínez", confidence: 94, importance: 92, source: "observed", lastAccessed: "2m ago" },
  { key: "arbitrum_fee_threshold", value: "0.05 USDC (optimal)", confidence: 88, importance: 85, source: "inferred", lastAccessed: "5m ago" },
  { key: "best_transfer_hours", value: "14:00–18:00 UTC", confidence: 82, importance: 78, source: "inferred", lastAccessed: "12m ago" },
  { key: "max_safe_transfer", value: "500 USDC per tx", confidence: 96, importance: 95, source: "user", lastAccessed: "1h ago" },
  { key: "base_preferred", value: "true (lowest fees for transfers)", confidence: 91, importance: 80, source: "observed", lastAccessed: "18m ago" },
  { key: "recipient_tier_weights", value: "Diamond:3x, Platinum:2x, Gold:1.5x", confidence: 90, importance: 88, source: "user", lastAccessed: "30m ago" },
  { key: "risk_tolerance", value: "moderate", confidence: 97, importance: 93, source: "user", lastAccessed: "2h ago" },
  { key: "bitso_rate_min", value: "17.50 MXN/USD", confidence: 85, importance: 72, source: "inferred", lastAccessed: "45m ago" },
];

const contextPreview = `{
  "wallet_state": { "total": "$12,847.32", "chains": "Arbitrum + Base" },
  "mood": "optimistic", "multiplier": 1.2,
  "top_beneficiaries": ["María García (94%)", "Luis Hernández (87%)"],
  "fees": { "arbitrum": "0.04 USDC", "base": "0.02 USDC" },
  "risk_tolerance": "moderate",
  "recent_actions": ["transfer 50 USDC → María García", "escrow E-0047"],
  "memory_count": ${memoryEntries.length},
  "session_decisions": 20
}`;

const decisions = [
  { id: 1, time: "14:32", action: "Transfer 50 USDC → María García on Base", outcome: "success", learned: "Settlement confirmed in ~90s via Bitso SPEI" },
  { id: 2, time: "14:28", action: "Skip transfer to unverified recipient", outcome: "success", learned: "Unverified beneficiaries correctly filtered" },
  { id: 3, time: "14:15", action: "Swap 100 USDC → MXN via Bitso", outcome: "success", learned: "Bitso rate 17.82 MXN/USD optimal window" },
  { id: 4, time: "13:55", action: "Transfer 75 USDC → Luis Hernández on Arbitrum", outcome: "success", learned: "Arbitrum saves 98% on fees vs Ethereum mainnet" },
  { id: 5, time: "13:40", action: "Create Escrow E-0047", outcome: "success", learned: "2h timelock sufficient for beneficiary claims" },
  { id: 6, time: "13:22", action: "Transfer 500 USDC → unknown address", outcome: "fail", learned: "Guardian veto: amount exceeded risk threshold" },
  { id: 7, time: "13:10", action: "Route 25 USDC via Base (lower fee)", outcome: "success", learned: "Base fee ~$0.01 vs Arbitrum ~$0.04 for small transfers" },
  { id: 8, time: "12:55", action: "Batch 3 remittances → Bitso SPEI", outcome: "success", learned: "Batching reduces per-transfer overhead by 40%" },
  { id: 9, time: "12:30", action: "Bridge 200 USDC Arbitrum→Base", outcome: "success", learned: "Bridge time ~4min acceptable" },
  { id: 10, time: "12:15", action: "Transfer 30 USDC → Rosa Martínez on Base", outcome: "success", learned: "Base ideal for micro remittances under $50" },
  { id: 11, time: "11:58", action: "Reject suspicious withdraw", outcome: "success", learned: "Anomaly score >0.9 warrants block" },
  { id: 12, time: "11:42", action: "Rebalance USDC across L2s", outcome: "success", learned: "Monthly rebalance keeps L2 liquidity >80%" },
  { id: 13, time: "11:20", action: "Transfer 100 USDC → Carlos Ruiz on Arbitrum", outcome: "success", learned: "Arbitrum ideal for mid-range remittances" },
  { id: 14, time: "11:05", action: "Skip low-rate Bitso window", outcome: "fail", learned: "Missed 17.9 MXN/USD — raise rate threshold awareness" },
  { id: 15, time: "10:48", action: "Update fee threshold", outcome: "success", learned: "0.04 USDC new Arbitrum baseline after upgrade" },
];

const sourceBadge = (s: string) => {
  if (s === "user") return "bg-primary/15 text-primary border-primary/30";
  if (s === "observed") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  return "bg-blue-500/15 text-blue-400 border-blue-500/30";
};

export default function Memory() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Agent Memory & Learning</h1>
        <p className="text-sm text-muted-foreground mt-1">Persistent memory, learned transfer patterns, and decision history.</p>
      </div>

      {/* Memory Entries */}
      <div className="rounded-xl border border-border/50 bg-card/50 mb-6">
        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Memory Store</h3>
          <span className="text-[10px] text-muted-foreground tabular-nums">{memoryEntries.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-5 py-2 font-medium">Key</th>
                <th className="text-left px-3 py-2 font-medium">Value</th>
                <th className="text-center px-3 py-2 font-medium">Confidence</th>
                <th className="text-center px-3 py-2 font-medium">Importance</th>
                <th className="text-center px-3 py-2 font-medium">Source</th>
                <th className="text-right px-5 py-2 font-medium">Accessed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {memoryEntries.map((m) => (
                <tr key={m.key} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-2.5 font-mono text-xs">{m.key}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{m.value}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 justify-center">
                      <Progress value={m.confidence} className="h-1 w-12 bg-secondary" />
                      <span className="text-[10px] tabular-nums text-muted-foreground w-7 text-right">{m.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 justify-center">
                      <Progress value={m.importance} className="h-1 w-12 bg-secondary" />
                      <span className="text-[10px] tabular-nums text-muted-foreground w-7 text-right">{m.importance}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant="outline" className={`text-[9px] ${sourceBadge(m.source)}`}>{m.source}</Badge>
                  </td>
                  <td className="px-5 py-2.5 text-right text-[11px] text-muted-foreground">{m.lastAccessed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* What the Agent Learned */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            What the Agent Has Learned
          </h3>
          <div className="space-y-3">
            {[
              { title: "Trusted Beneficiaries", detail: "María García (Diamond, 94%), Luis Hernández (Platinum, 87%), Rosa Martínez (Gold, 82%)" },
              { title: "Fee Thresholds", detail: "Base: <$0.02 optimal, Arbitrum: <$0.05 acceptable" },
              { title: "Best Transfer Hours", detail: "14:00–18:00 UTC yields 23% faster SPEI settlement" },
              { title: "Chain Selection", detail: "Base for transfers <$50, Arbitrum for >$100, batch for multiple" },
              { title: "Risk Patterns", detail: "Anomaly scores >0.9 always block, 0.7–0.9 require consensus" },
            ].map((item) => (
              <div key={item.title} className="rounded-lg bg-accent/30 p-3">
                <p className="text-xs font-medium mb-0.5">{item.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Context Builder Preview */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Context Sent to LLM</h3>
          <pre className="text-[11px] font-mono text-foreground/80 bg-secondary/30 rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed">
            {contextPreview}
          </pre>
          <p className="text-[10px] text-muted-foreground mt-3">This context is assembled from memory + wallet state before every agent reasoning cycle.</p>
        </div>
      </div>

      {/* Decision History */}
      <div className="rounded-xl border border-border/50 bg-card/50">
        <div className="px-5 py-3 border-b border-border/40">
          <h3 className="text-sm font-semibold">Decision History</h3>
        </div>
        <ScrollArea className="h-[360px]">
          <div className="divide-y divide-border/20">
            {decisions.map((d) => (
              <div key={d.id} className="px-5 py-3 flex items-start gap-3 hover:bg-accent/30 transition-colors">
                {d.outcome === "success" ? (
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} style={{ color: "#50AF95" }} />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} style={{ color: "#ef4444" }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{d.action}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{d.learned}</p>
                  <span className="text-[10px] text-muted-foreground/60 mt-0.5 block">{d.time}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCheck, Download } from "lucide-react";
import { toast } from "sonner";

const taxEvents = [
  { id: 1, date: "2025-03-22", type: "transfer", amount: "2.50 USDC", recipient: "María García", chain: "Base", taxLot: "TL-0247" },
  { id: 2, date: "2025-03-22", type: "escrow", amount: "50.00 USDC", recipient: "0x742d...bD28", chain: "Arbitrum", taxLot: "TL-0246" },
  { id: 3, date: "2025-03-22", type: "yield", amount: "3.42 USDC", recipient: "Aave V3", chain: "Arbitrum", taxLot: "TL-0245" },
  { id: 4, date: "2025-03-22", type: "transfer", amount: "5.00 USDC", recipient: "Luis Hernández", chain: "Base", taxLot: "TL-0244" },
  { id: 5, date: "2025-03-21", type: "swap", amount: "100.00 USDC", recipient: "Bitso Off-ramp", chain: "Arbitrum", taxLot: "TL-0243" },
  { id: 6, date: "2025-03-21", type: "transfer", amount: "1.50 USDC", recipient: "Rosa Martínez", chain: "Base", taxLot: "TL-0242" },
  { id: 7, date: "2025-03-21", type: "yield", amount: "1.87 USDC", recipient: "Compound", chain: "Arbitrum", taxLot: "TL-0241" },
  { id: 8, date: "2025-03-21", type: "escrow", amount: "25.00 USDC", recipient: "0x8626...1199", chain: "Base", taxLot: "TL-0240" },
  { id: 9, date: "2025-03-20", type: "transfer", amount: "3.00 USDC", recipient: "Carlos López", chain: "Arbitrum", taxLot: "TL-0239" },
  { id: 10, date: "2025-03-20", type: "dca", amount: "25.00 USDC", recipient: "ETH", chain: "Base", taxLot: "TL-0238" },
];

const reports = [
  { id: "RPT-2025-Q1", period: "Q1 2025", status: "draft", transactions: 247 },
  { id: "RPT-2024-Q4", period: "Q4 2024", status: "finalized", transactions: 892 },
  { id: "RPT-2024-Q3", period: "Q3 2024", status: "finalized", transactions: 1204 },
];

const auditTrail = [
  { id: 1, action: "transfer_sent", time: "14:32:15", detail: "2.5 USDC → María García on Base. TX: 0xabc...def" },
  { id: 2, action: "escrow_created", time: "14:28:00", detail: "E-0047: 50 USDC, 2h timelock, SHA-256 hash lock" },
  { id: 3, action: "consensus_vote", time: "14:27:55", detail: "Discovery: SEND (0.87), Router: SEND (0.91), Treasury: HOLD (0.62)" },
  { id: 4, action: "guardian_review", time: "14:27:50", detail: "Guardian review: APPROVED — no anomalies detected" },
  { id: 5, action: "policy_check", time: "14:27:48", detail: "Policy check: amount 2.5 USDC < 100 USDC limit — PASS" },
  { id: 6, action: "anomaly_scan", time: "14:27:45", detail: "Anomaly score: 0.12 — well below 0.7 threshold" },
  { id: 7, action: "balance_update", time: "14:27:40", detail: "USDC balance: 12,848.32 → 12,845.82 (fee deducted)" },
  { id: 8, action: "memory_write", time: "14:27:38", detail: "Updated: trusted_recipients confidence 94% → 95%" },
  { id: 9, action: "yield_harvest", time: "14:15:00", detail: "Harvested 3.42 USDC from Aave V3" },
  { id: 10, action: "offramp_executed", time: "14:00:00", detail: "Bitso SPEI: 25 USDC → 425.00 MXN at $17.00" },
];

const typeBadge = (t: string) => {
  if (t === "transfer") return "bg-primary/15 text-primary border-primary/30";
  if (t === "escrow") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (t === "yield") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (t === "swap") return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
};

export default function Compliance() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Tax & Audit Compliance</h1>
        <p className="text-sm text-muted-foreground mt-1">Tax lot tracking, audit trail, and regulatory reporting.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Tax Settings */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <FileCheck className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            Tax Settings
          </h3>
          <div className="space-y-3">
            <div className="rounded-lg bg-accent/30 p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cost Basis Method</span>
              <span className="text-xs font-medium">FIFO</span>
            </div>
            <div className="rounded-lg bg-accent/30 p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Reporting Currency</span>
              <span className="text-xs font-medium">USD</span>
            </div>
            <div className="rounded-lg bg-accent/30 p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Fiscal Year</span>
              <span className="text-xs font-medium">Calendar (Jan–Dec)</span>
            </div>
            <div className="rounded-lg bg-accent/30 p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Auto-Classification</span>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Enabled</Badge>
            </div>
          </div>
        </div>

        {/* Reports */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Tax Reports</h3>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="rounded-lg bg-accent/30 p-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono">{r.id}</span>
                  <span className="text-xs text-muted-foreground">{r.period}</span>
                  <Badge variant="outline" className={`text-[9px] ${r.status === "finalized" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"}`}>
                    {r.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground/60">{r.transactions} txns</span>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.success(`Downloaded ${r.id}`)}>
                  <Download className="h-3 w-3 mr-1" />Export
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tax Events */}
      <div className="rounded-xl border border-border/50 bg-card/50 mb-6">
        <div className="px-5 py-3 border-b border-border/40">
          <h3 className="text-sm font-semibold">Tax Events</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-5 py-2 font-medium">Date</th>
                <th className="text-center px-3 py-2 font-medium">Type</th>
                <th className="text-right px-3 py-2 font-medium">Amount</th>
                <th className="text-left px-3 py-2 font-medium">Recipient</th>
                <th className="text-left px-3 py-2 font-medium">Chain</th>
                <th className="text-right px-5 py-2 font-medium">Tax Lot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {taxEvents.map((e) => (
                <tr key={e.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">{e.date}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant="outline" className={`text-[9px] ${typeBadge(e.type)}`}>{e.type}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-mono tabular-nums">{e.amount}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.recipient}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.chain}</td>
                  <td className="px-5 py-2.5 text-right text-[10px] font-mono text-muted-foreground/60">{e.taxLot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="rounded-xl border border-border/50 bg-card/50">
        <div className="px-5 py-3 border-b border-border/40">
          <h3 className="text-sm font-semibold">Audit Trail</h3>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="divide-y divide-border/20">
            {auditTrail.map((a) => (
              <div key={a.id} className="px-5 py-2.5 flex items-start gap-3 hover:bg-accent/30 transition-colors">
                <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 w-16 shrink-0">{a.time}</span>
                <Badge variant="outline" className="text-[9px] shrink-0">{a.action}</Badge>
                <span className="text-xs text-muted-foreground">{a.detail}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

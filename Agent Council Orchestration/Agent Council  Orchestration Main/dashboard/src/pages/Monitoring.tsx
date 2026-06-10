import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, Square, MonitorCheck, AlertTriangle, Info, AlertCircle } from "lucide-react";
import CountUp from "@/components/shared/CountUp";

const alerts = [
  { id: 1, severity: "critical", message: "Anomaly score 0.92 on tx from 0xdead...beef — blocked", time: "2m ago", ack: false },
  { id: 2, severity: "warning", message: "Arbitrum fee spike: 0.12 USDC — pausing non-urgent transfers", time: "8m ago", ack: false },
  { id: 3, severity: "info", message: "FX rate updated: 1 USD = 17.82 MXN via Bitso oracle", time: "15m ago", ack: true },
  { id: 4, severity: "warning", message: "Recipient Carlos Torres flagged by anomaly detector", time: "22m ago", ack: true },
  { id: 5, severity: "info", message: "USDC rebalanced across L2s: liquidity now 85%", time: "35m ago", ack: true },
  { id: 6, severity: "critical", message: "Replay attack detected — nonce validator blocked tx", time: "1h ago", ack: true },
  { id: 7, severity: "info", message: "New beneficiary registered: Ana Flores (SPEI verified)", time: "1h ago", ack: true },
  { id: 8, severity: "warning", message: "Bitso MXN rate dropped below threshold: 17.5 → 17.2", time: "2h ago", ack: true },
];

const events = [
  { time: "14:32:15", event: "cycle_complete", detail: "Cycle #1834 completed in 2.3s" },
  { time: "14:32:14", event: "transfer_sent", detail: "Transferred 50 USDC → María García on Base" },
  { time: "14:32:12", event: "consensus", detail: "Multi-agent vote: 2/3 approve transfer" },
  { time: "14:32:10", event: "guardian", detail: "Guardian review: APPROVED" },
  { time: "14:32:08", event: "tool_call", detail: "fx_check USD/MXN → 17.82 via Bitso" },
  { time: "14:32:05", event: "memory_read", detail: "Read 8 memory entries for context" },
  { time: "14:31:58", event: "cycle_start", detail: "Cycle #1834 started" },
  { time: "14:30:22", event: "cycle_complete", detail: "Cycle #1833 completed in 1.8s" },
  { time: "14:30:20", event: "escrow_created", detail: "Escrow E-0047: 50 USDC, 2h timelock" },
  { time: "14:28:15", event: "cycle_complete", detail: "Cycle #1832 completed in 2.1s" },
  { time: "14:28:12", event: "scan_complete", detail: "Scanned 89 beneficiaries, 3 verified" },
  { time: "14:26:08", event: "alert", detail: "Fee spike detected on Arbitrum" },
  { time: "14:24:00", event: "route_selected", detail: "Router: Base selected (fee $0.02 vs $0.04)" },
  { time: "14:22:15", event: "rebalance", detail: "USDC rebalance across Arbitrum + Base triggered" },
  { time: "14:20:00", event: "rate_check", detail: "Bitso MXN rate: 17.82, threshold: 17.50 — OK" },
];

const severityBadge = (s: string) => {
  if (s === "critical") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (s === "warning") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-blue-500/15 text-blue-400 border-blue-500/30";
};

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === "critical") return <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "#ef4444" }} />;
  if (severity === "warning") return <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "#eab308" }} />;
  return <Info className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "#3b82f6" }} />;
};

export default function Monitoring() {
  const [loopStatus, setLoopStatus] = useState<"running" | "paused" | "stopped">("running");

  const statusColor = loopStatus === "running" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : loopStatus === "paused" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
    : "bg-red-500/15 text-red-400 border-red-500/30";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Agent Observability</h1>
        <p className="text-sm text-muted-foreground mt-1">Production-grade monitoring, alerts, and event logging.</p>
      </div>

      {/* Loop Status + Controls */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-1">
            <MonitorCheck className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <p className="text-xs text-muted-foreground font-medium">Loop Status</p>
          </div>
          <Badge variant="outline" className={`text-xs mt-1 ${statusColor}`}>
            {loopStatus.toUpperCase()}
          </Badge>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <p className="text-xs text-muted-foreground font-medium mb-1">Cycles Run</p>
          <CountUp target={1834} className="text-2xl font-bold tabular-nums tracking-tight" />
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <p className="text-xs text-muted-foreground font-medium mb-1">Last Cycle</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight">2.3<span className="text-sm text-muted-foreground font-normal">s</span></p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 flex items-center gap-2">
          <Button size="sm" variant={loopStatus === "running" ? "default" : "outline"} onClick={() => setLoopStatus("running")} className="h-8 text-xs flex-1">
            <Play className="h-3 w-3 mr-1" />Start
          </Button>
          <Button size="sm" variant="outline" onClick={() => setLoopStatus("paused")} className="h-8 text-xs flex-1">
            <Pause className="h-3 w-3 mr-1" />Pause
          </Button>
          <Button size="sm" variant="outline" onClick={() => setLoopStatus("stopped")} className="h-8 text-xs flex-1">
            <Square className="h-3 w-3 mr-1" />Stop
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Alerts */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Alerts</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] bg-red-500/15 text-red-400 border-red-500/30">2 critical</Badge>
              <Badge variant="outline" className="text-[9px] bg-yellow-500/15 text-yellow-400 border-yellow-500/30">3 warning</Badge>
            </div>
          </div>
          <ScrollArea className="h-[320px]">
            <div className="divide-y divide-border/20">
              {alerts.map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-start gap-3 hover:bg-accent/30 transition-colors">
                  <SeverityIcon severity={a.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className={`text-[9px] ${severityBadge(a.severity)}`}>{a.severity}</Badge>
                      {!a.ack && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs">{a.message}</p>
                    <span className="text-[10px] text-muted-foreground/60">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Event Log */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Event Log</h3>
          </div>
          <ScrollArea className="h-[320px]">
            <div className="divide-y divide-border/20">
              {events.map((e, i) => (
                <div key={i} className="px-5 py-2.5 flex items-start gap-3 hover:bg-accent/30 transition-colors">
                  <span className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 w-16 shrink-0">{e.time}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">{e.event}</Badge>
                  <span className="text-xs text-muted-foreground">{e.detail}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Alerts", value: 8 },
          { label: "Acknowledged", value: 6 },
          { label: "Critical", value: 2 },
          { label: "Warnings", value: 3 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card/50 p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
            <CountUp target={s.value} className="text-xl font-bold tabular-nums" />
          </div>
        ))}
      </div>
    </div>
  );
}

import { demoDCA, demoSubscriptions, demoStreaming, demoSplits, demoX402 } from "@/lib/demo-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play, X } from "lucide-react";
import { toast } from "sonner";

const statusBadge = (s: string) => {
  if (s === "active") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (s === "paused") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-zinc-400/15 text-zinc-300 border-zinc-400/30";
};

export default function Payments() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Programmable Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">DCA, subscriptions, streaming, splits, and x402.</p>
      </div>

      <Tabs defaultValue="dca">
        <div className="overflow-x-auto -mx-6 px-6 mb-6">
          <TabsList className="bg-secondary/50 w-max">
            <TabsTrigger value="dca">DCA</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="streaming">Streaming</TabsTrigger>
            <TabsTrigger value="splits">Splits</TabsTrigger>
            <TabsTrigger value="x402">x402</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dca">
          <div className="space-y-3">
            {(Array.isArray(demoDCA) ? demoDCA : []).map((d) => (
              <div key={d.id} className="rounded-xl border border-border/50 bg-card/50 p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div>
                  <span className="text-sm font-medium">{d.amount} → {d.asset}</span>
                  <p className="text-xs text-muted-foreground">{d.frequency} · Next: {d.next}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{d.totalInvested}</span>
                  <Badge variant="outline" className={`text-[10px] ${statusBadge(d.status)}`}>{d.status}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info(`${d.status === "active" ? "Paused" : "Resumed"} DCA`)}>
                    {d.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subscriptions">
          <div className="space-y-3">
            {(Array.isArray(demoSubscriptions) ? demoSubscriptions : []).map((s) => (
              <div key={s.id} className="rounded-xl border border-border/50 bg-card/50 p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="min-w-0">
                  <span className="text-sm font-medium truncate block">{s.name}</span>
                  <p className="text-xs text-muted-foreground">{s.amount} · {s.chain} · Next: {s.nextPayment}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${statusBadge(s.status)}`}>{s.status}</Badge>
                  {s.status === "active" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info("Subscription cancelled")}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="streaming">
          <div className="space-y-3">
            {(Array.isArray(demoStreaming) ? demoStreaming : []).map((s) => (
              <div key={s.id} className="rounded-xl border border-border/50 bg-card/50 p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div>
                  <span className="text-sm font-medium">→ {s.recipient}</span>
                  <p className="text-xs text-muted-foreground">{s.rate} · Streamed: {s.streamed} · {s.chain}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${statusBadge(s.status)}`}>{s.status}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info(`Stream ${s.status === "active" ? "paused" : "resumed"}`)}>
                    {s.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="splits">
          <div className="space-y-3">
            {(Array.isArray(demoSplits) ? demoSplits : []).map((s) => (
              <div key={s.id} className="rounded-xl border border-border/50 bg-card/50 p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div>
                  <span className="text-sm font-medium">{s.name}</span>
                  <p className="text-xs text-muted-foreground">{s.recipients} recipients · {s.total} · {s.chain}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${statusBadge(s.status)}`}>{s.status}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="x402">
          <div className="space-y-3">
            {(Array.isArray(demoX402) ? demoX402 : []).map((x) => (
              <div key={x.id} className="rounded-xl border border-border/50 bg-card/50 p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="min-w-0">
                  <code className="text-sm font-mono text-primary break-all">{x.endpoint}</code>
                  <p className="text-xs text-muted-foreground">{x.price} · {x.requests} requests · Revenue: {x.revenue}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${statusBadge(x.status)}`}>{x.status}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

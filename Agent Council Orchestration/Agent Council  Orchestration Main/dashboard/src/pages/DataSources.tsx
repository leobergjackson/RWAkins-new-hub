import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import CountUp from "@/components/shared/CountUp";
import { Database, Youtube, Webhook, Rss, Radio, CheckCircle2, XCircle, Clock } from "lucide-react";

const pipeline = [
  { name: "YouTube API", icon: Youtube, status: "active", priority: 1, detail: "Real-time channel monitoring" },
  { name: "Webhooks", icon: Webhook, status: "active", priority: 2, detail: "Event-driven notifications" },
  { name: "RSS Feeds", icon: Rss, status: "active", priority: 3, detail: "Periodic content polling" },
  { name: "Simulator", icon: Radio, status: "standby", priority: 4, detail: "Synthetic event generation" },
];

const youtubeChannels = [
  { name: "María González", subscribers: "124K", recentVideo: "Sending USDC via Colibrí in 90 seconds", views: "45.2K", posted: "2h ago" },
  { name: "Carlos Ramírez", subscribers: "89K", recentVideo: "Arbitrum vs Base for Remittances", views: "12.1K", posted: "5h ago" },
  { name: "Ana Martínez", subscribers: "67K", recentVideo: "Bitso SPEI Off-Ramp Guide 2025", views: "8.7K", posted: "8h ago" },
  { name: "Luis Hernández", subscribers: "45K", recentVideo: "Cross-Border Payments Deep Dive", views: "6.3K", posted: "12h ago" },
];

const webhooks = [
  { id: "WH-001", endpoint: "/webhooks/youtube", events: 847, lastEvent: "2m ago", hmac: true },
  { id: "WH-002", endpoint: "/webhooks/github", events: 234, lastEvent: "15m ago", hmac: true },
  { id: "WH-003", endpoint: "/webhooks/stripe", events: 56, lastEvent: "1h ago", hmac: true },
  { id: "WH-004", endpoint: "/webhooks/discord", events: 1203, lastEvent: "30s ago", hmac: false },
];

const rssFeeds = [
  { source: "YouTube", feeds: 12, items: 847, lastRefresh: "2m ago" },
  { source: "Reddit", feeds: 5, items: 234, lastRefresh: "5m ago" },
  { source: "Medium", feeds: 8, items: 156, lastRefresh: "10m ago" },
  { source: "Dev.to", feeds: 4, items: 89, lastRefresh: "15m ago" },
  { source: "Bitso", feeds: 3, items: 67, lastRefresh: "8m ago" },
];

export default function DataSources() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Real-Time Data Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">4-tier prioritized ingestion from live APIs, webhooks, RSS, and simulation.</p>
      </div>

      {/* Pipeline Flow */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Data Priority Pipeline</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {pipeline.map((p, i) => (
            <div key={p.name} className="flex items-center gap-2 shrink-0">
              <div className="rounded-lg border border-border/50 bg-card/30 px-4 py-3 flex items-center gap-3 min-w-[180px]">
                <p.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{p.name}</span>
                    <div className={`h-2 w-2 rounded-full ${p.status === "active" ? "bg-emerald-500" : "bg-yellow-500"}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">P{p.priority} — {p.detail}</span>
                </div>
              </div>
              {i < pipeline.length - 1 && <span className="text-muted-foreground/40 text-lg shrink-0">&rarr;</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* YouTube */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Youtube className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <h3 className="text-sm font-semibold">YouTube API</h3>
            </div>
            <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Connected</Badge>
          </div>
          <div className="divide-y divide-border/20">
            {youtubeChannels.map((c) => (
              <div key={c.name} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">{c.subscribers}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-0.5">{c.recentVideo}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                  <span>{c.views} views</span>
                  <span>{c.posted}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhooks */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <h3 className="text-sm font-semibold">Webhooks</h3>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">4 registered</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-5 py-2 font-medium">Endpoint</th>
                  <th className="text-center px-3 py-2 font-medium">Events</th>
                  <th className="text-center px-3 py-2 font-medium">HMAC</th>
                  <th className="text-right px-5 py-2 font-medium">Last</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {webhooks.map((w) => (
                  <tr key={w.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-2.5 text-xs font-mono">{w.endpoint}</td>
                    <td className="px-3 py-2.5 text-center text-xs tabular-nums">{w.events}</td>
                    <td className="px-3 py-2.5 text-center">
                      {w.hmac ? <CheckCircle2 className="h-3.5 w-3.5 mx-auto" style={{ color: "#50AF95" }} /> : <XCircle className="h-3.5 w-3.5 mx-auto text-destructive" />}
                    </td>
                    <td className="px-5 py-2.5 text-right text-[10px] text-muted-foreground">{w.lastEvent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RSS + Simulator */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
            <Rss className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <h3 className="text-sm font-semibold">RSS Feeds</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-5 py-2 font-medium">Source</th>
                  <th className="text-center px-3 py-2 font-medium">Feeds</th>
                  <th className="text-center px-3 py-2 font-medium">Items</th>
                  <th className="text-right px-5 py-2 font-medium">Last Refresh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {rssFeeds.map((f) => (
                  <tr key={f.source} className="hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-2.5 text-xs font-medium">{f.source}</td>
                    <td className="px-3 py-2.5 text-center text-xs tabular-nums">{f.feeds}</td>
                    <td className="px-3 py-2.5 text-center text-xs tabular-nums">{f.items}</td>
                    <td className="px-5 py-2.5 text-right text-[10px] text-muted-foreground">{f.lastRefresh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/50 p-5 flex flex-col items-center justify-center text-center">
          <Radio className="h-8 w-8 mb-3" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
          <h3 className="text-sm font-semibold mb-1">Event Simulator</h3>
          <p className="text-xs text-muted-foreground mb-3">Generates synthetic events when live sources are unavailable.</p>
          <Badge variant="outline" className="text-[9px] bg-yellow-500/15 text-yellow-400 border-yellow-500/30 mb-3">Standby</Badge>
          <div className="text-lg font-bold tabular-nums"><CountUp target={2847} /></div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Events Generated</p>
        </div>
      </div>
    </div>
  );
}

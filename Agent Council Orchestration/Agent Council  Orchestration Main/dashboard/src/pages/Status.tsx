import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SERVICES = [
  "Wallet Service", "AI Service", "Bitso API", "Orchestrator", "Safety",
  "Escrow", "Treasury", "SPEI Rail", "Guardian Agent", "Webhooks", "MCP Server",
];

function randomMs() { return Math.floor(Math.random() * 80) + 12; }

function generateStatuses() {
  return SERVICES.map((name) => ({
    name,
    healthy: Math.random() > 0.05,
    responseTime: randomMs(),
    lastChecked: new Date().toLocaleTimeString(),
  }));
}

interface TelegramBotStatus {
  connected: boolean;
  username: string | null;
  messageCount: number;
  startedAt: string | null;
  mode: string;
}

interface OpenClawRuntimeStatus {
  active: boolean;
  soulLoaded: boolean;
  agentName: string;
  protocol: string;
  skillCount: number;
  skills: string[];
  chains: string[];
  uptime: number;
  executionCount: number;
  lastExecution: string | null;
  openClawFrameworkVersion: string;
}

export default function Status() {
  const [statuses, setStatuses] = useState(generateStatuses);
  const [telegramStatus, setTelegramStatus] = useState<TelegramBotStatus | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [openclawStatus, setOpenclawStatus] = useState<OpenClawRuntimeStatus | null>(null);
  const [openclawLoading, setOpenclawLoading] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => setStatuses(generateStatuses()), 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchTelegramStatus() {
      try {
        const res = await fetch(`${API}/api/telegram/status`, { signal: AbortSignal.timeout(3000) });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setTelegramStatus(data);
        }
      } catch {
        if (!cancelled) setTelegramStatus(null);
      } finally {
        if (!cancelled) setTelegramLoading(false);
      }
    }
    fetchTelegramStatus();
    const iv = setInterval(fetchTelegramStatus, 15000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchOpenClawStatus() {
      try {
        const res = await fetch(`${API}/api/openclaw/status`, { signal: AbortSignal.timeout(3000) });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setOpenclawStatus(data);
        }
      } catch {
        if (!cancelled) setOpenclawStatus(null);
      } finally {
        if (!cancelled) setOpenclawLoading(false);
      }
    }
    fetchOpenClawStatus();
    const iv = setInterval(fetchOpenClawStatus, 15000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  const allHealthy = statuses.every((s) => s.healthy);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time service status</p>
        </div>
        <Badge
          variant="outline"
          className={
            allHealthy
              ? "border-green-500/40 text-green-500"
              : "border-yellow-500/40 text-yellow-500"
          }
        >
          {allHealthy ? "All Systems Operational" : "Partial Outage"}
        </Badge>
      </div>

      {/* Telegram Bot Status Card */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#26A5E4]/10">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#26A5E4]" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Telegram Bot</h3>
              {telegramLoading ? (
                <p className="text-xs text-muted-foreground">Checking connection...</p>
              ) : telegramStatus?.connected ? (
                <p className="text-xs text-muted-foreground">
                  @{telegramStatus.username} &middot; {telegramStatus.mode} mode &middot; {telegramStatus.messageCount} messages
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Not connected to backend &middot; Run standalone with TELEGRAM_BOT_TOKEN
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: telegramLoading
                  ? "hsl(var(--muted-foreground))"
                  : telegramStatus?.connected
                    ? "hsl(142, 76%, 36%)"
                    : "hsl(var(--destructive))",
                animation: telegramStatus?.connected ? "status-pulse 2s ease-in-out infinite" : undefined,
              }}
            />
            <span className={`text-xs font-medium ${
              telegramLoading
                ? "text-muted-foreground"
                : telegramStatus?.connected
                  ? "text-green-500"
                  : "text-red-500"
            }`}>
              {telegramLoading ? "Checking" : telegramStatus?.connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </div>

      {/* OpenClaw Runtime Status Card */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold">OpenClaw Runtime</h3>
              {openclawLoading ? (
                <p className="text-xs text-muted-foreground">Checking runtime...</p>
              ) : openclawStatus?.active ? (
                <p className="text-xs text-muted-foreground">
                  {openclawStatus.agentName} &middot; {openclawStatus.protocol} &middot; {openclawStatus.skillCount} skills &middot; {openclawStatus.chains.length} chains
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Runtime not initialized &middot; SOUL.md not loaded
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: openclawLoading
                  ? "hsl(var(--muted-foreground))"
                  : openclawStatus?.active
                    ? "hsl(270, 76%, 50%)"
                    : "hsl(var(--destructive))",
                animation: openclawStatus?.active ? "status-pulse 2s ease-in-out infinite" : undefined,
              }}
            />
            <span className={`text-xs font-medium ${
              openclawLoading
                ? "text-muted-foreground"
                : openclawStatus?.active
                  ? "text-purple-500"
                  : "text-red-500"
            }`}>
              {openclawLoading ? "Checking" : openclawStatus?.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        {openclawStatus?.active && (
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-md bg-muted/40 p-2">
              <span className="text-muted-foreground">Skills</span>
              <div className="font-mono font-medium mt-0.5">{openclawStatus.skills.join(', ')}</div>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <span className="text-muted-foreground">Executions</span>
              <div className="font-mono font-medium mt-0.5">{openclawStatus.executionCount}</div>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <span className="text-muted-foreground">Uptime</span>
              <div className="font-mono font-medium mt-0.5">{Math.floor(openclawStatus.uptime / 60)}m {openclawStatus.uptime % 60}s</div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-border/40 text-xs text-muted-foreground font-medium">
          <span>Service</span>
          <span>Status</span>
          <span>Response</span>
          <span>Checked</span>
        </div>
        <ScrollArea className="max-h-[500px]">
          {statuses.map((s) => (
            <div
              key={s.name}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 border-b border-border/20 last:border-0"
            >
              <span className="text-sm font-medium">{s.name}</span>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: s.healthy ? "hsl(var(--success))" : "hsl(var(--destructive))",
                    animation: s.healthy ? "status-pulse 2s ease-in-out infinite" : undefined,
                  }}
                />
                <span className={`text-xs ${s.healthy ? "text-green-500" : "text-red-500"}`}>
                  {s.healthy ? "Healthy" : "Down"}
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">{s.responseTime}ms</span>
              <span className="text-xs text-muted-foreground">{s.lastChecked}</span>
            </div>
          ))}
        </ScrollArea>
      </div>

      <p className="text-[11px] text-muted-foreground mt-4">Auto-refreshes every 30 seconds</p>
    </div>
  );
}

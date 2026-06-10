import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Copy, Clock, Check, Loader2, Zap, Send, Lock, Brain, Wallet } from "lucide-react";
import { toast } from "sonner";

// ── API Endpoint Catalog ──────────────────────────────────────────

interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  label: string;
  category: string;
  description: string;
  exampleBody?: string;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  // Wallets
  { id: "balances", method: "GET", path: "/api/wallet/balances", label: "Get Balances", category: "Wallets", description: "Get wallet balances across Arbitrum + Base" },
  { id: "addresses", method: "GET", path: "/api/wallet/addresses", label: "Get Addresses", category: "Wallets", description: "Get wallet addresses for every supported L2" },
  // Remittance
  { id: "tip", method: "POST", path: "/api/tip", label: "Send Transfer", category: "Remittance", description: "Send a remittance through the full 8-stage AI reasoning pipeline", exampleBody: JSON.stringify({ recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28", amount: "2.5", token: "usdc", message: "For the family!" }, null, 2) },
  { id: "tip-parse", method: "POST", path: "/api/tip/parse", label: "Parse Transfer Intent", category: "Remittance", description: "Parse natural language into a structured transfer intent", exampleBody: JSON.stringify({ text: "send María 50 USDC on Arbitrum for rent" }, null, 2) },
  { id: "tip-history", method: "GET", path: "/api/agent/history?limit=10", label: "Transfer History", category: "Remittance", description: "Get recent remittance transfer history" },
  // Escrow
  { id: "escrow-create", method: "POST", path: "/api/escrow", label: "Create Escrow", category: "Escrow", description: "Create a new HTLC escrow with timelock", exampleBody: JSON.stringify({ recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28", amount: "50", timelock: 3600, chain: "arbitrum" }, null, 2) },
  { id: "escrow-list", method: "GET", path: "/api/escrow", label: "List Escrows", category: "Escrow", description: "List all active escrow contracts" },
  // Agent Intelligence
  { id: "agent-state", method: "GET", path: "/api/agent/state", label: "Agent Status", category: "Agent", description: "Get current agent state, mood, and decision info" },
  { id: "brain-state", method: "GET", path: "/api/brain/state", label: "Brain State", category: "Agent", description: "Get Wallet-as-Brain state: mood, pulse, preferences" },
  { id: "chat", method: "POST", path: "/api/chat", label: "Chat with Agent", category: "Agent", description: "Send a message to the AI agent", exampleBody: JSON.stringify({ message: "What's the best L2 for remittances under $50?" }, null, 2) },
  { id: "reasoning", method: "POST", path: "/api/openclaw/reason", label: "Run Reasoning", category: "Agent", description: "Run a full ReAct reasoning cycle", exampleBody: JSON.stringify({ prompt: "Should I route this transfer via Arbitrum or Base?" }, null, 2) },
  // DeFi
  { id: "fee-compare", method: "GET", path: "/api/fees/compare?recipient=0x742d&amount=10", label: "Compare Fees", category: "DeFi", description: "Compare transaction fees across Arbitrum + Base" },
  { id: "gasless-sim", method: "GET", path: "/api/gasless/simulate?chain=arbitrum&amount=10", label: "Simulate Gasless", category: "DeFi", description: "Simulate an ERC-4337 gasless transfer on Arbitrum" },
  { id: "gasless-chains", method: "GET", path: "/api/gasless/chains", label: "Gasless L2 Support", category: "DeFi", description: "Get gasless support across Arbitrum + Base" },
  // Security
  { id: "health", method: "GET", path: "/api/health/full", label: "Health Check", category: "System", description: "Full Colibrí agent health report" },
  { id: "a2a-discover", method: "GET", path: "/api/a2a/discover", label: "Discover Agents", category: "A2A", description: "Discover other agents on the network" },
  { id: "policies", method: "GET", path: "/api/policies", label: "List Policies", category: "Security", description: "List all active tip policies" },
  { id: "audit-recent", method: "GET", path: "/api/audit/recent?limit=10", label: "Audit Trail", category: "Security", description: "Get recent audit log entries" },
];

const CATEGORIES = [...new Set(API_ENDPOINTS.map((e) => e.category))];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

const categoryIcons: Record<string, typeof Wallet> = {
  Wallets: Wallet,
  Remittance: Send,
  Escrow: Lock,
  Agent: Brain,
  DeFi: Zap,
  System: Check,
  A2A: Brain,
  Security: Lock,
};

// ── Component ─────────────────────────────────────────────────────

export default function ApiPlayground() {
  const [selected, setSelected] = useState<string>(API_ENDPOINTS[0].id);
  const [body, setBody] = useState<string>(API_ENDPOINTS[0].exampleBody ?? "");
  const [response, setResponse] = useState<string>("");
  const [status, setStatus] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const endpoint = API_ENDPOINTS.find((e) => e.id === selected)!;
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const handleSelect = useCallback((id: string) => {
    setSelected(id);
    const ep = API_ENDPOINTS.find((e) => e.id === id);
    setBody(ep?.exampleBody ?? "");
    setResponse("");
    setStatus(null);
    setDuration(null);
  }, []);

  const handleSend = useCallback(async () => {
    setLoading(true);
    setResponse("");
    setStatus(null);
    setDuration(null);
    const start = performance.now();

    try {
      const options: RequestInit = {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
      };
      if (endpoint.method !== "GET" && body.trim()) {
        options.body = body;
      }

      const res = await fetch(`${baseUrl}${endpoint.path}`, options);
      const elapsed = Math.round(performance.now() - start);
      setDuration(elapsed);
      setStatus(res.status);

      const text = await res.text();
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setDuration(elapsed);
      setStatus(0);
      // Show demo fallback
      const demoResponse = generateDemoResponse(endpoint);
      setResponse(demoResponse);
      toast.info("Using demo response — agent not running");
    } finally {
      setLoading(false);
    }
  }, [endpoint, body, baseUrl]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    toast.success("Response copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [response]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">API Playground</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive API explorer — select an endpoint, edit the request, and execute live.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Endpoint selector */}
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Select Endpoint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selected} onValueChange={handleSelect}>
                <SelectTrigger className="w-full bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <div key={cat}>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {cat}
                      </div>
                      {API_ENDPOINTS.filter((e) => e.category === cat).map((ep) => (
                        <SelectItem key={ep.id} value={ep.id}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${methodColors[ep.method]}`}>
                              {ep.method}
                            </Badge>
                            {ep.label}
                          </span>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${methodColors[endpoint.method]}`}>
                    {endpoint.method}
                  </Badge>
                  <code className="text-[11px] text-muted-foreground break-all">{endpoint.path}</code>
                </div>
                <p className="text-muted-foreground">{endpoint.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { id: "tip", label: "Try Transfer", icon: Send, color: "text-[#FF4E00]" },
                { id: "gasless-sim", label: "Simulate Gasless", icon: Zap, color: "text-emerald-400" },
                { id: "chat", label: "Chat with Agent", icon: Brain, color: "text-blue-400" },
                { id: "balances", label: "Check Balances", icon: Wallet, color: "text-purple-400" },
              ].map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sm"
                  onClick={() => handleSelect(action.id)}
                >
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Endpoint count */}
          <div className="text-center text-xs text-muted-foreground/60">
            {API_ENDPOINTS.length} endpoints across {CATEGORIES.length} categories
          </div>
        </div>

        {/* Right: Request/Response */}
        <div className="lg:col-span-2 space-y-4">
          {/* Request body */}
          {endpoint.method !== "GET" && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Request Body
                  <Badge variant="outline" className="text-[10px]">JSON</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full h-40 bg-zinc-950 border border-border/30 rounded-lg p-3 font-mono text-xs text-emerald-400 resize-y focus:outline-none focus:ring-1 focus:ring-[#FF4E00]/50"
                  spellCheck={false}
                  placeholder="{ }"
                />
              </CardContent>
            </Card>
          )}

          {/* Send button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSend}
              disabled={loading}
              className="bg-[#FF4E00] hover:bg-[#FF4E00]/80 text-white gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Send Request
            </Button>
            <code className="text-xs text-muted-foreground font-mono">
              {endpoint.method} {baseUrl}{endpoint.path}
            </code>
          </div>

          {/* Response */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Response
                  {status !== null && (
                    <Badge
                      variant="outline"
                      className={
                        status >= 200 && status < 300
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : status === 0
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                      }
                    >
                      {status === 0 ? "DEMO" : status}
                    </Badge>
                  )}
                  {duration !== null && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {duration}ms
                    </span>
                  )}
                </span>
                {response && (
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1 text-xs h-7">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Executing request...
                </div>
              ) : response ? (
                <pre className="bg-zinc-950 border border-border/30 rounded-lg p-3 font-mono text-xs text-blue-300 overflow-auto max-h-[500px] whitespace-pre-wrap">
                  {response}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  Select an endpoint and click Send to see the response
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Demo responses ────────────────────────────────────────────────

function generateDemoResponse(ep: ApiEndpoint): string {
  const demos: Record<string, unknown> = {
    balances: {
      balances: {
        arbitrum: { nativeBalance: "0.324", usdcBalance: "890.25" },
        base: { nativeBalance: "0.187", usdcBalance: "1200.50" },
      },
    },
    addresses: {
      addresses: {
        arbitrum: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
        base: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
      },
    },
    tip: {
      id: "transfer_demo_001", status: "completed", chainId: "arbitrum",
      txHash: "0xabc123...def456", from: "0x742d...bD28", to: "0x123...456",
      amount: "2.5", token: "USDC", fee: "0.002",
      decision: { selectedChain: "arbitrum", reasoning: "Lowest fee ($0.002) with ~90s SPEI settlement", confidence: 0.94 },
    },
    "agent-state": {
      status: "online", mood: "optimistic", cyclesRun: 1834,
      tipsProcessed: 247, activeEscrows: 12, uptime: 86400,
    },
    "brain-state": {
      mood: { type: "optimistic", multiplier: 1.2, reason: "Portfolio up 3.2%" },
      pulse: { liquidity: 78, diversification: 85, velocity: 62, healthScore: 91 },
      preferredChain: "polygon", riskTolerance: 0.65, batchSize: 5,
    },
    health: { status: "healthy", uptime: 86400, version: "1.1.0", chains: 2, services: 48 },
    "gasless-sim": {
      chain: "arbitrum", supported: true, standard: "ERC-4337",
      estimatedGasSavedUsd: "$1.2500", normalGasCostUsd: "$1.2500",
      bundlerEndpoint: "https://api.pimlico.io/v2/42161/rpc",
    },
  };
  const data = demos[ep.id] ?? { message: "Demo response", endpoint: ep.path, method: ep.method };
  return JSON.stringify(data, null, 2);
}

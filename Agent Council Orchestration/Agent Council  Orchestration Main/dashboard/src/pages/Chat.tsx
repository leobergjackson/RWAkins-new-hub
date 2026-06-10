import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizontal, Bot, User, Sparkles, Cpu } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: number;
  role: "user" | "agent";
  text: string;
  intent?: string;
  confidence?: number;
  actions?: string[];
}

const capabilities = [
  "check_balance", "send_transfer", "create_escrow", "claim_escrow",
  "swap_tokens", "check_gas", "analyze_recipient", "get_reputation",
  "dca_setup", "yield_check", "portfolio_report", "security_scan", "explain_reasoning",
];

const demoMessages: Message[] = [
  { id: 1, role: "user", text: "Who should I send money to today?" },
  {
    id: 2, role: "agent", text: "Based on pending remittances, I recommend sending to María García (verified, Bitso account active, 94% trust score) and Luis Hernández (Platinum tier, ready for SPEI payout). Both route via Arbitrum for lowest fees.",
    intent: "analyze_recipient", confidence: 91,
    actions: ["Transfer 2.5 USDC to María", "Transfer 1.0 USDC to Luis", "View recipient profiles"],
  },
];

const suggestions = ["Who should I send to?", "Check my balance", "Analyze gas fees", "Show portfolio health"];

const actionRoutes: Record<string, string> = {
  "View wallets": "/wallets",
  "View dashboard": "/dashboard",
  "View recipient profiles": "/creators",
  "View yield options": "/defi",
  "Transfer funds": "/wallets",
  "Rebalance now": "/trading",
  "Switch to Base": "/wallets",
};

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(demoMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const agentResponses: Record<string, Omit<Message, "id" | "role">> = {
    "check my balance": { text: "Your total balance is $12,847.32 across Arbitrum + Base. USDC on Arbitrum: $8,234 | USDC on Base: $3,597 | ETH (gas): $1,016. Liquidity ratio: 78%.", intent: "check_balance", confidence: 98, actions: ["View wallets", "Transfer funds"] },
    "analyze gas fees": { text: "Current gas: Arbitrum ~0.002 USDC (very low), Base ~0.001 USDC (ultra-low). Recommendation: use Base for transfers under $20, Arbitrum for amounts over $50. Both settle MXN via Bitso/SPEI in ~90s.", intent: "check_gas", confidence: 94, actions: ["Set gas alert", "Switch to Base"] },

    "show portfolio health": { text: "Health Score: 87/100. Diversification: 85% (good). Risk: 23/100 (low). Yield: 4.2% avg APY. Suggestion: consider rebalancing 5% from idle USDC to Aave yield on Arbitrum.", intent: "portfolio_report", confidence: 89, actions: ["Rebalance now", "View yield options"] },
    "who should i send to?": { text: "Based on pending remittances, I recommend sending to María García (verified, Bitso account active, 94% trust score) and Luis Hernández (Platinum tier, ready for SPEI payout). Both route via Arbitrum for lowest fees.", intent: "analyze_recipient", confidence: 91, actions: ["Transfer 2.5 USDC to María", "Transfer 1.0 USDC to Luis", "View recipient profiles"] },
  };

  const handleSuggestion = useCallback((suggestion: string) => {
    if (loading) return;
    const userMsg: Message = { id: Date.now(), role: "user", text: suggestion };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    const q = suggestion.toLowerCase().trim();
    setTimeout(() => {
      const match = agentResponses[q];
      const agentMsg: Message = {
        id: Date.now() + 1, role: "agent",
        text: match?.text || `I've analyzed your request: "${suggestion}". Based on current wallet state and market conditions, I'd recommend reviewing your active positions. Would you like me to run a detailed analysis?`,
        intent: match?.intent || "explain_reasoning",
        confidence: match?.confidence || 72,
        actions: match?.actions || ["Run analysis", "View dashboard"],
      };
      setMessages((m) => [...m, agentMsg]);
      setLoading(false);
    }, 800 + Math.random() * 600);
  }, [loading]);

  const handleAction = useCallback((action: string) => {
    // Navigation actions
    const route = actionRoutes[action];
    if (route) {
      toast.info(`Navigating to ${action}...`);
      navigate(route);
      return;
    }

    // Transfer actions
    if (action.toLowerCase().startsWith("transfer ")) {
      toast.success("Transfer sent successfully!", {
        description: action,
      });
      return;
    }

    // Alert / config actions — show toast confirmation
    if (action.toLowerCase().includes("alert") || action.toLowerCase().includes("set ")) {
      toast.success(`${action} configured!`, {
        description: "You'll be notified when conditions are met.",
      });
      return;
    }

    // Analysis / run actions — add agent message to chat
    const userMsg: Message = { id: Date.now(), role: "user", text: action };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    setTimeout(() => {
      const analysisResponses: Record<string, Omit<Message, "id" | "role">> = {
        "run analysis": {
          text: "Running full portfolio analysis... Scanning 5 chains, 12 tokens, 3 active positions. Results: Portfolio health 87/100. Top performer: ETH (+4.2% 24h). Recommendation: consider taking partial profits on ETH position.",
          intent: "portfolio_report", confidence: 92,
          actions: ["View dashboard", "View wallets"],
        },
      };
      const key = action.toLowerCase();
      const matched = analysisResponses[key];
      const agentMsg: Message = {
        id: Date.now() + 1, role: "agent",
        text: matched?.text || `Analysis complete for "${action}". All systems nominal. Portfolio health: 87/100, liquidity ratio: 78%, diversification: 85%. No immediate action required.`,
        intent: matched?.intent || "explain_reasoning",
        confidence: matched?.confidence || 88,
        actions: matched?.actions || ["View dashboard", "View wallets"],
      };
      setMessages((m) => [...m, agentMsg]);
      setLoading(false);
    }, 1000 + Math.random() * 500);
  }, [navigate]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    const q = input.toLowerCase().trim();
    setInput("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
    const match = agentResponses[q];
    const agentMsg: Message = {
      id: Date.now() + 1, role: "agent",
      text: match?.text || `I've analyzed your request: "${q}". Based on current wallet state and market conditions, I'd recommend reviewing your active positions. Would you like me to run a detailed analysis?`,
      intent: match?.intent || "explain_reasoning",
      confidence: match?.confidence || 72,
      actions: match?.actions || ["Run analysis", "View dashboard"],
    };
    setMessages((m) => [...m, agentMsg]);
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Talk to the Agent</h1>
        <p className="text-sm text-muted-foreground mt-1">Natural language interface to Colibrí's 97+ MCP tools.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        {/* Chat */}
        <div className="rounded-xl border border-border/50 bg-card/50 flex flex-col h-[560px]">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${m.role === "user" ? "bg-primary/10 border border-primary/20" : "bg-accent/40 border border-border/40"}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {m.role === "agent" ? <Bot className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "#C6B6B1" }} /> : <User className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />}
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.role === "user" ? "You" : "Colibrí"}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{m.text}</p>
                    {m.intent && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-[9px]">{m.intent}</Badge>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{m.confidence}% confidence</span>
                      </div>
                    )}
                    {m.actions && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {m.actions.map((a) => (
                          <button key={a} onClick={() => handleAction(a)} className="text-[10px] px-2 py-1 rounded-md border border-border/50 bg-card/50 hover:bg-accent/50 transition-colors cursor-pointer">{a}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-1.5 px-4">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "200ms" }} />
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "400ms" }} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggestions */}
          <div className="px-4 py-2 border-t border-border/30 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} onClick={() => handleSuggestion(s)} disabled={loading} className="text-[10px] px-2.5 py-1 rounded-full border border-border/40 bg-card/30 hover:bg-accent/40 transition-colors text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed">
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border/40 flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask the agent anything..." className="bg-card border-border/50" disabled={loading} />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="bg-primary hover:bg-primary/90 shrink-0">
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Capabilities Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <h3 className="text-sm font-semibold">AI Provider</h3>
            </div>
            <div className="space-y-2">
              {["Groq (Llama 3)", "Gemini 2.0 Flash", "Rule-Based Fallback"].map((p, i) => (
                <div key={p} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${i === 0 ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  <span className="text-xs">{p}</span>
                  {i === 0 && <Badge variant="outline" className="text-[9px] ml-auto bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Active</Badge>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <h3 className="text-sm font-semibold">Supported Intents</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {capabilities.map((c) => (
                <Badge key={c} variant="outline" className="text-[9px]">{c}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/hooks/useFetch";
import {
  MessageSquare, Shield, TrendingUp, Send, Play, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertTriangle, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ── Types ─────────────────────────────────────────────── */

type AgentName = "Router" | "Guardian" | "TreasuryOptimizer";
type Stance = "approve" | "reject" | "conditional";
type Consensus = "approved" | "rejected" | "escalated";

interface DialogueTurn {
  agent: AgentName;
  role: "proposer" | "challenger" | "mediator";
  message: string;
  reasoning: string;
  stance: Stance;
  confidence: number;
}

interface DialogueSession {
  id: string;
  topic: string;
  turns: DialogueTurn[];
  consensus: Consensus;
  consensusConfidence: number;
  duration: number;
  timestamp: string;
}

/* ── Constants ─────────────────────────────────────────── */

const AGENT_CONFIG: Record<AgentName, { color: string; bg: string; border: string; icon: typeof Send; label: string }> = {
  Router: {
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.25)",
    icon: Send,
    label: "Router",
  },
  Guardian: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    icon: Shield,
    label: "Guardian",
  },
  TreasuryOptimizer: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.25)",
    icon: TrendingUp,
    label: "Treasury Optimizer",
  },
};

const STANCE_ICONS: Record<Stance, typeof CheckCircle2> = {
  approve: CheckCircle2,
  reject: XCircle,
  conditional: AlertTriangle,
};

const STANCE_COLORS: Record<Stance, string> = {
  approve: "#22c55e",
  reject: "#ef4444",
  conditional: "#eab308",
};

const CONSENSUS_STYLES: Record<Consensus, { color: string; label: string }> = {
  approved: { color: "#22c55e", label: "Approved" },
  rejected: { color: "#ef4444", label: "Rejected" },
  escalated: { color: "#eab308", label: "Escalated to Human" },
};

/* ── Demo proposal presets ─────────────────────────────── */
const DEMO_PROPOSALS = [
  { action: "Remittance", recipient: "María García", amount: 3.0, token: "USDC", chain: "Arbitrum" },
  { action: "Remittance", recipient: "Luis Hernández", amount: 10.0, token: "USDC", chain: "Base" },
  { action: "Cross-chain rebalance", amount: 25, token: "USDC", chain: "Arbitrum", details: "rebalance treasury" },
  { action: "Yield deposit", amount: 40, token: "USDC", chain: "Base", details: "Aave V3 lending pool" },
  { action: "Escrow creation", recipient: "Rosa Martínez", amount: 15, token: "USDC", chain: "Arbitrum" },
];

/* ── Demo seed data (fallback when API is unreachable) ── */
const DEMO_SESSIONS: DialogueSession[] = [
  {
    id: "dlg_demo_001",
    topic: "Transfer 8.0 USDC to María González on Base",
    turns: [
      { agent: "Router", role: "proposer", message: "I propose transferring 8.0 USDC to María González on Base. KYC verified, Bitso off-ramp ready for MXN payout.", reasoning: "Recipient score 9.2/10. Historical transfer average: 3.5 USDC.", stance: "approve", confidence: 0.88 },
      { agent: "Guardian", role: "challenger", message: "Risk alert: 8.0 USDC is 2.3x our average. Daily budget at 78%. Base gas at 0.002 USDC. Recommend reducing to 5.0 USDC.", reasoning: "Daily limit 78% used. OFAC check passed.", stance: "reject", confidence: 0.82 },
      { agent: "TreasuryOptimizer", role: "mediator", message: "Compromise: approve 5.5 USDC on Base. Saves ~$0.12 in fees, keeps budget at 83%. Bitso MXN rate locked.", reasoning: "Gas savings on Base. Treasury reserve healthy.", stance: "conditional", confidence: 0.91 },
    ],
    consensus: "approved",
    consensusConfidence: 0.87,
    duration: 340,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "dlg_demo_002",
    topic: "Transfer 1.5 USDC to Luis Ramírez on Arbitrum",
    turns: [
      { agent: "Router", role: "proposer", message: "Standard remittance for Luis Ramírez — 1.5 USDC on Arbitrum, SPEI off-ramp to Bitso.", reasoning: "Beneficiary trust score 8.5/10.", stance: "approve", confidence: 0.92 },
      { agent: "Guardian", role: "challenger", message: "No concerns. Budget at 45%, recipient KYC 98/100. Approved.", reasoning: "All metrics within safe bounds.", stance: "approve", confidence: 0.95 },
      { agent: "TreasuryOptimizer", role: "mediator", message: "Arbitrum gas ~0.0008 USDC — optimal. Full approval. ~90s to SPEI settlement.", reasoning: "No optimization required.", stance: "approve", confidence: 0.96 },
    ],
    consensus: "approved",
    consensusConfidence: 0.943,
    duration: 180,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "dlg_demo_003",
    topic: "Create escrow 50 USDC for unverified beneficiary",
    turns: [
      { agent: "Router", role: "proposer", message: "Proposing escrow: 50 USDC for unverified beneficiary. Bitso account pending KYC.", reasoning: "No prior transfer history with this beneficiary.", stance: "approve", confidence: 0.55 },
      { agent: "Guardian", role: "challenger", message: "VETO. Zero reputation, unverified identity, 34% of treasury. Too risky.", reasoning: "Risk score 9.1/10 (critical).", stance: "reject", confidence: 0.94 },
      { agent: "TreasuryOptimizer", role: "mediator", message: "Agree with Guardian. Escalating to human operator.", reasoning: "Treasury impact critical. Human oversight warranted.", stance: "reject", confidence: 0.91 },
    ],
    consensus: "rejected",
    consensusConfidence: 0.80,
    duration: 290,
    timestamp: new Date(Date.now() - 14400000).toISOString(),
  },
];

/* ── Component ─────────────────────────────────────────── */

export default function AgentDialogue() {
  const [sessions, setSessions] = useState<DialogueSession[]>(DEMO_SESSIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState<Record<string, boolean>>({});
  const [simulating, setSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dialogue/sessions?limit=20`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.sessions && Array.isArray(data.sessions) && data.sessions.length > 0) {
        setSessions(data.sessions);
      }
    } catch {
      // keep demo data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const runDebate = useCallback(async () => {
    setSimulating(true);
    const proposal = DEMO_PROPOSALS[Math.floor(Math.random() * DEMO_PROPOSALS.length)];
    try {
      const res = await fetch(`${API_BASE}/api/dialogue/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSessions(prev => [data.session, ...prev]);
          setExpandedId(data.session.id);
        }
      } else {
        // Fallback: generate a local demo session
        const fakeSession: DialogueSession = {
          id: `dlg_local_${Date.now().toString(36)}`,
          topic: `${proposal.action} ${proposal.recipient ? "to " + proposal.recipient + " " : ""}${proposal.amount} ${proposal.token} on ${proposal.chain}`,
          turns: [
            { agent: "Router", role: "proposer", message: `Proposing: ${proposal.action} ${proposal.amount} ${proposal.token} on ${proposal.chain}.`, reasoning: "Beneficiary metrics indicate high value.", stance: "approve", confidence: 0.85 },
            { agent: "Guardian", role: "challenger", message: `Moderate risk. Budget usage acceptable. Conditionally approve with gas monitoring.`, reasoning: "Within safe bounds.", stance: "conditional", confidence: 0.78 },
            { agent: "TreasuryOptimizer", role: "mediator", message: `Gas on ${proposal.chain} is optimal. Treasury healthy. Approve.`, reasoning: "No treasury concerns.", stance: "approve", confidence: 0.90 },
          ],
          consensus: "approved",
          consensusConfidence: 0.843,
          duration: 250 + Math.floor(Math.random() * 200),
          timestamp: new Date().toISOString(),
        };
        setSessions(prev => [fakeSession, ...prev]);
        setExpandedId(fakeSession.id);
      }
    } catch {
      // offline fallback handled above
    } finally {
      setSimulating(false);
    }
  }, []);

  const toggleReasoning = (turnKey: string) => {
    setShowReasoning(prev => ({ ...prev, [turnKey]: !prev[turnKey] }));
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" style={{ color: "#FF4E00" }} />
            Agent Dialogue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Three AI agents debate every decision before execution — Router proposes, Guardian challenges, TreasuryOptimizer mediates.
          </p>
        </div>
        <Button
          onClick={runDebate}
          disabled={simulating}
          className="gap-2"
          style={{ backgroundColor: "#FF4E00" }}
        >
          <Play className="h-4 w-4" />
          {simulating ? "Debating..." : "Run Debate"}
        </Button>
      </div>

      {/* Agent legend */}
      <div className="flex gap-4 flex-wrap">
        {(Object.entries(AGENT_CONFIG) as [AgentName, typeof AGENT_CONFIG[AgentName]][]).map(([name, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={name} className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cfg.color }} />
              <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Sessions list */}
      {loading && sessions.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">Loading dialogue sessions...</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const expanded = expandedId === session.id;
            const cStyle = CONSENSUS_STYLES[session.consensus];
            return (
              <div
                key={session.id}
                className="rounded-xl border border-border/50 bg-card overflow-hidden transition-all"
                style={expanded ? { boxShadow: `0 0 30px ${cStyle.color}15` } : {}}
              >
                {/* Session header — clickable */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : session.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{session.topic}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {timeAgo(session.timestamp)}
                      </span>
                      <span>{session.duration}ms</span>
                      <span>{session.turns.length} turns</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold"
                      style={{ color: cStyle.color, borderColor: cStyle.color }}
                    >
                      {cStyle.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {(session.consensusConfidence * 100).toFixed(0)}%
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded: chat-style conversation */}
                {expanded && (
                  <div className="px-5 pb-5 space-y-3 border-t border-border/30 pt-4">
                    {session.turns.map((turn, idx) => {
                      const cfg = AGENT_CONFIG[turn.agent];
                      const Icon = cfg.icon;
                      const StanceIcon = STANCE_ICONS[turn.stance];
                      const stanceColor = STANCE_COLORS[turn.stance];
                      const turnKey = `${session.id}-${idx}`;
                      const showR = showReasoning[turnKey];

                      return (
                        <div
                          key={idx}
                          className="rounded-lg p-4 transition-all"
                          style={{
                            backgroundColor: cfg.bg,
                            borderLeft: `3px solid ${cfg.color}`,
                          }}
                        >
                          {/* Agent header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                              <span className="font-semibold text-sm" style={{ color: cfg.color }}>
                                {cfg.label}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ color: cfg.color, borderColor: cfg.border }}>
                                {turn.role}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <StanceIcon className="h-3.5 w-3.5" style={{ color: stanceColor }} />
                              <span className="text-xs font-medium capitalize" style={{ color: stanceColor }}>
                                {turn.stance}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono ml-1">
                                {(turn.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>

                          {/* Message */}
                          <p className="text-sm text-foreground/90 leading-relaxed">{turn.message}</p>

                          {/* Reasoning toggle */}
                          <button
                            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            onClick={() => toggleReasoning(turnKey)}
                          >
                            {showR ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {showR ? "Hide reasoning" : "Show reasoning"}
                          </button>
                          {showR && (
                            <div className="mt-1.5 text-xs text-muted-foreground/80 italic bg-background/40 rounded px-3 py-2">
                              {turn.reasoning}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Consensus bar */}
                    <div className="flex items-center gap-3 pt-2 border-t border-border/20">
                      <span className="text-xs text-muted-foreground">Consensus:</span>
                      <Badge style={{ backgroundColor: cStyle.color + "20", color: cStyle.color, border: `1px solid ${cStyle.color}40` }}>
                        {cStyle.label}
                      </Badge>
                      <div className="flex-1 h-1.5 bg-border/30 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${session.consensusConfidence * 100}%`,
                            backgroundColor: cStyle.color,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {(session.consensusConfidence * 100).toFixed(1)}% confidence
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

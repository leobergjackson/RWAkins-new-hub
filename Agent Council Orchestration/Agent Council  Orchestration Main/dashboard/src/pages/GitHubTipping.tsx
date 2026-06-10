import { useState } from "react";
import { useFetch, API_BASE } from "@/hooks/useFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GitBranch, GitPullRequest, Trophy, Users, DollarSign,
  Send, Zap, Copy, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { toast } from "sonner";

// ── Demo data (fallback when backend is offline) ──────────────────

const demoStats = {
  totalPRsTipped: 24,
  totalBountiesPaid: 7,
  totalUSDTDistributed: 68.50,
  avgTipAmount: 2.21,
  topContributors: [
    { username: "alice-dev", totalAmount: 18.50, tipCount: 6 },
    { username: "bob-crypto", totalAmount: 12.00, tipCount: 4 },
    { username: "charlie-colibri", totalAmount: 9.75, tipCount: 3 },
    { username: "dana-rust", totalAmount: 8.25, tipCount: 3 },
    { username: "eve-frontend", totalAmount: 6.00, tipCount: 2 },
  ],
  recentTips: [
    { id: "t1", type: "pr", githubUsername: "alice-dev", walletAddress: "0x1234...abcd", amount: 3.75, currency: "USDC", reason: "well-scoped change, includes tests, conventional commit title", prNumber: 142, prTitle: "feat: add Arbitrum + Base routing", repoFullName: "colibri/remittance", qualityScore: 85, status: "sent", createdAt: "2026-03-23T14:30:00Z" },
    { id: "t2", type: "pr", githubUsername: "bob-crypto", walletAddress: "0x5678...efgh", amount: 2.50, currency: "USDC", reason: "medium-sized change, descriptive title", prNumber: 139, prTitle: "fix: fee estimation on Base", repoFullName: "colibri/remittance", qualityScore: 62, status: "sent", createdAt: "2026-03-23T10:15:00Z" },
    { id: "t3", type: "issue_bounty", githubUsername: "charlie-colibri", walletAddress: "0x9abc...ijkl", amount: 5.00, currency: "USDC", reason: "Bounty payout for issue #87", issueNumber: 87, issueTitle: "Implement Bitso SPEI off-ramp", repoFullName: "colibri/remittance", qualityScore: 100, status: "pending", createdAt: "2026-03-22T18:00:00Z" },
    { id: "t4", type: "pr", githubUsername: "dana-rust", walletAddress: "0xdef0...mnop", amount: 1.25, currency: "USDC", reason: "small change, has description", prNumber: 135, prTitle: "docs: update README setup", repoFullName: "colibri/remittance", qualityScore: 30, status: "sent", createdAt: "2026-03-22T09:45:00Z" },
  ],
  activeBounties: 3,
};

const demoContributors = [
  { id: "c1", githubUsername: "alice-dev", walletAddress: "0x1234567890abcdef1234567890abcdef12345678", totalTipsReceived: 6, totalTipAmount: 18.50, registeredAt: "2026-03-15T12:00:00Z" },
  { id: "c2", githubUsername: "bob-crypto", walletAddress: "0x5678901234abcdef5678901234abcdef56789012", totalTipsReceived: 4, totalTipAmount: 12.00, registeredAt: "2026-03-16T08:00:00Z" },
  { id: "c3", githubUsername: "charlie-colibri", walletAddress: "0x9abcdef012345678abcdef012345678abcdef0123", totalTipsReceived: 3, totalTipAmount: 9.75, registeredAt: "2026-03-17T10:00:00Z" },
];

// ── Helpers ────────────────────────────────────────────────────────

function statusBadge(status: string) {
  switch (status) {
    case "sent":
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>;
    case "pending":
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case "failed":
      return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

function qualityColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-yellow-400";
  return "text-orange-400";
}

function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// ── Component ──────────────────────────────────────────────────────

export default function GitHubTipping() {
  const { data: stats, refetch: refetchStats } = useFetch("/api/github/stats", demoStats);
  const { data: contributors, refetch: refetchContributors } = useFetch("/api/github/contributors", demoContributors);

  const [regUsername, setRegUsername] = useState("");
  const [regWallet, setRegWallet] = useState("");
  const [registering, setRegistering] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const safeStats = stats ?? demoStats;
  const safeContributors = Array.isArray(contributors) ? contributors : demoContributors;
  const safeRecentTips = Array.isArray(safeStats.recentTips) ? safeStats.recentTips : demoStats.recentTips;
  const safeTopContributors = Array.isArray(safeStats.topContributors) ? safeStats.topContributors : demoStats.topContributors;

  async function handleRegister() {
    if (!regUsername.trim() || !regWallet.trim()) {
      toast.error("Both GitHub username and wallet address are required");
      return;
    }
    setRegistering(true);
    try {
      const res = await fetch(`${API_BASE}/api/github/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUsername: regUsername.trim(), walletAddress: regWallet.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Registered @${regUsername} successfully`);
        setRegUsername("");
        setRegWallet("");
        refetchContributors();
        refetchStats();
      } else {
        toast.error(data.error ?? "Registration failed");
      }
    } catch {
      toast.error("Could not reach backend");
    } finally {
      setRegistering(false);
    }
  }

  async function handleTestWebhook() {
    setTestingWebhook(true);
    try {
      const res = await fetch(`${API_BASE}/api/github/test-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Test PR transfer: ${data.tip?.amount ?? "?"} USDC for quality ${data.tip?.qualityScore ?? "?"}%`);
        refetchStats();
      } else {
        toast.error("Test webhook failed");
      }
    } catch {
      toast.error("Could not reach backend");
    } finally {
      setTestingWebhook(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GitHub Contributor Rewards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatic USDC transfers for merged PRs and bounty payouts via GitHub webhooks.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={handleTestWebhook}
          disabled={testingWebhook}
        >
          <Zap className="h-3.5 w-3.5 mr-2" />
          {testingWebhook ? "Sending..." : "Test Webhook"}
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-border/50 p-4 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <GitPullRequest className="h-3.5 w-3.5" /> PRs Tipped
          </div>
          <div className="text-2xl font-bold">{safeStats.totalPRsTipped}</div>
        </div>
        <div className="rounded-xl border border-border/50 p-4 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Trophy className="h-3.5 w-3.5" /> Bounties Paid
          </div>
          <div className="text-2xl font-bold">{safeStats.totalBountiesPaid}</div>
        </div>
        <div className="rounded-xl border border-border/50 p-4 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <DollarSign className="h-3.5 w-3.5" /> Total Distributed
          </div>
          <div className="text-2xl font-bold">{safeStats.totalUSDTDistributed} <span className="text-sm text-muted-foreground">USDC</span></div>
        </div>
        <div className="rounded-xl border border-border/50 p-4 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Send className="h-3.5 w-3.5" /> Avg Transfer
          </div>
          <div className="text-2xl font-bold">{safeStats.avgTipAmount} <span className="text-sm text-muted-foreground">USDC</span></div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent Tips */}
        <div className="md:col-span-2 rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Recent Transfers</span>
          </div>
          <div className="divide-y divide-border/30">
            {safeRecentTips.map((tip: Record<string, unknown>) => (
              <div key={tip.id as string} className="px-5 py-3 flex items-center gap-4 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {tip.type === "pr" ? (
                      <GitPullRequest className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    ) : (
                      <Trophy className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                    )}
                    <span className="font-medium truncate">
                      {tip.type === "pr" ? `PR #${tip.prNumber}` : `Issue #${tip.issueNumber}`}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {(tip.prTitle as string) ?? (tip.issueTitle as string) ?? ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>@{tip.githubUsername as string}</span>
                    <span className={qualityColor(tip.qualityScore as number)}>
                      Q:{tip.qualityScore as number}%
                    </span>
                    <span>{formatDate(tip.createdAt as string)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-medium">{tip.amount as number} USDC</div>
                  <div className="mt-0.5">{statusBadge(tip.status as string)}</div>
                </div>
              </div>
            ))}
            {safeRecentTips.length === 0 && (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                No transfers yet. Set up a GitHub webhook to get started.
              </div>
            )}
          </div>
        </div>

        {/* Right column: Leaderboard + Register */}
        <div className="space-y-6">
          {/* Contributor Leaderboard */}
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium">Top Contributors</span>
            </div>
            <div className="divide-y divide-border/30">
              {safeTopContributors.slice(0, 5).map((c: Record<string, unknown>, i: number) => (
                <div key={c.username as string} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                  <span className="w-5 text-center text-muted-foreground font-mono text-xs">
                    {i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}`}
                  </span>
                  <span className="flex-1 font-medium truncate">@{c.username as string}</span>
                  <span className="text-muted-foreground text-xs">{c.tipCount as number} transfers</span>
                  <span className="font-mono text-primary">{c.totalAmount as number}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Register Form */}
          <div className="rounded-xl border border-border/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Register Contributor</span>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="GitHub username"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="bg-background border-border/50 text-sm"
              />
              <Input
                placeholder="0x... wallet address"
                value={regWallet}
                onChange={(e) => setRegWallet(e.target.value)}
                className="bg-background border-border/50 text-sm font-mono"
              />
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleRegister}
                disabled={registering}
              >
                {registering ? "Registering..." : "Register"}
              </Button>
            </div>
          </div>

          {/* Registered Contributors */}
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Registered ({safeContributors.length})</span>
            </div>
            <div className="divide-y divide-border/30 max-h-48 overflow-y-auto">
              {safeContributors.map((c: Record<string, unknown>) => (
                <div key={c.id as string} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                  <span className="flex-1 font-medium truncate">@{c.githubUsername as string}</span>
                  <button
                    className="text-xs text-muted-foreground font-mono hover:text-foreground transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(c.walletAddress as string);
                      toast.success("Address copied");
                    }}
                    title={c.walletAddress as string}
                  >
                    {truncateAddress(c.walletAddress as string)}
                    <Copy className="h-3 w-3 inline ml-1" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Setup Instructions */}
      <div className="mt-8 rounded-xl border border-border/50 p-5">
        <h3 className="text-sm font-medium mb-3">Webhook Setup</h3>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>1. Go to your GitHub repo Settings &gt; Webhooks &gt; Add webhook</p>
          <p>2. Set Payload URL to: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">https://your-domain/api/github/webhook</code></p>
          <p>3. Content type: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">application/json</code></p>
          <p>4. Secret: Set <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">GITHUB_WEBHOOK_SECRET</code> env var to match</p>
          <p>5. Events: Select <strong>Pull requests</strong>, <strong>Issues</strong>, <strong>Issue comments</strong>, and <strong>Pushes</strong></p>
          <p className="text-primary/80 pt-1">
            Merged PRs are auto-scored on quality (lines changed, tests, commit conventions) and rewarded 0.50-5.00 USDC.
            Issues labeled &quot;bounty&quot; pay the assignee on close.
          </p>
        </div>
      </div>
    </div>
  );
}

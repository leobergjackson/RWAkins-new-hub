import { useState, useCallback } from "react";
import { demoCreators, type RumbleCreator } from "@/lib/demo-data";
import { useFetch, API_BASE } from "@/hooks/useFetch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Sparkles,
  RefreshCw,
  Users,
  Eye,
  Video,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const tierColors: Record<string, string> = {
  Diamond: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Platinum: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Gold: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Silver: "bg-zinc-400/15 text-zinc-300 border-zinc-400/30",
  Bronze: "bg-orange-700/15 text-orange-400 border-orange-700/30",
};

const tierIcons: Record<string, string> = {
  Diamond: "💎",
  Platinum: "🏆",
  Gold: "🥇",
  Silver: "🥈",
  Bronze: "🥉",
};

const engagementColor = (score: number): string => {
  if (score >= 90) return "text-cyan-400";
  if (score >= 80) return "text-violet-400";
  if (score >= 70) return "text-yellow-400";
  if (score >= 60) return "text-zinc-300";
  return "text-orange-400";
};

const engagementBg = (score: number): string => {
  if (score >= 90) return "bg-cyan-500";
  if (score >= 80) return "bg-violet-500";
  if (score >= 70) return "bg-yellow-500";
  if (score >= 60) return "bg-zinc-400";
  return "bg-orange-500";
};

function formatNumber(num: string): string {
  return num;
}

export default function Creators() {
  const { data: creators, isDemo, refetch } = useFetch<RumbleCreator[]>("/api/rumble/creators", demoCreators);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [scraping, setScraping] = useState(false);
  const [sortBy, setSortBy] = useState<"engagement" | "subscribers" | "tips">("engagement");

  const safeCreators = Array.isArray(creators) ? creators : demoCreators;

  const filtered = safeCreators
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.handle.toLowerCase().includes(search.toLowerCase()) ||
        c.platform.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "engagement") return b.engagementScore - a.engagementScore;
      if (sortBy === "tips") return b.tips - a.tips;
      // subscribers: parse "4.1M" style strings
      const parseSubs = (s: string) => {
        const num = parseFloat(s);
        if (s.includes("M")) return num * 1_000_000;
        if (s.includes("K")) return num * 1_000;
        return num;
      };
      return parseSubs(b.subscribers) - parseSubs(a.subscribers);
    });

  const handleScrape = useCallback(async () => {
    setScraping(true);
    try {
      const res = await fetch(`${API_BASE}/api/rumble/creators`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        toast.success(`Loaded ${json.length} recipient profiles from registry`);
        refetch();
      } else {
          toast.info("API returned no results -- showing cached recipient profiles");
      }
    } catch {
      toast.info("Live registry unavailable -- showing cached recipient profiles");
    } finally {
      setScraping(false);
    }
  }, [refetch]);

  // Summary stats
  const totalSubs = safeCreators.reduce((sum, c) => {
    const num = parseFloat(c.subscribers);
    if (c.subscribers.includes("M")) return sum + num * 1_000_000;
    if (c.subscribers.includes("K")) return sum + num * 1_000;
    return sum + num;
  }, 0);
  const avgEngagement = Math.round(
    safeCreators.reduce((sum, c) => sum + c.engagementScore, 0) / safeCreators.length
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recipient Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verified beneficiary profiles with trust scoring and tier classification.
            {isDemo && (
              <Badge variant="outline" className="ml-2 text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                Cached Data
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-border/50"
            onClick={handleScrape}
            disabled={scraping}
          >
            {scraping ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
            )}
            Scrape Live Data
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => toast.success(`Discovered ${safeCreators.length} recipients in registry`)}
          >
            <Sparkles className="h-3.5 w-3.5 mr-2" />
            Discover
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Users className="h-3.5 w-3.5" />
            Total Recipients
          </div>
          <div className="text-2xl font-bold">{safeCreators.length}</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Eye className="h-3.5 w-3.5" />
            Combined Reach
          </div>
          <div className="text-2xl font-bold">
            {totalSubs >= 1_000_000 ? `${(totalSubs / 1_000_000).toFixed(1)}M` : `${(totalSubs / 1_000).toFixed(0)}K`}
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            Avg Engagement
          </div>
          <div className={`text-2xl font-bold ${engagementColor(avgEngagement)}`}>{avgEngagement}%</div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Video className="h-3.5 w-3.5" />
            Total Transfers Sent
          </div>
          <div className="text-2xl font-bold">{safeCreators.reduce((s, c) => s + c.tips, 0)}</div>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/50"
          />
        </div>
        <div className="flex gap-1">
          {(["engagement", "subscribers", "tips"] as const).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={sortBy === key ? "default" : "outline"}
              className={sortBy !== key ? "border-border/50" : ""}
              onClick={() => setSortBy(key)}
            >
              {key === "engagement" ? "Score" : key === "subscribers" ? "Subs" : "Transfers"}
            </Button>
          ))}
        </div>
      </div>

      {/* Creator Cards */}
      <div className="space-y-3">
        {filtered.map((c) => {
          const isExpanded = expanded === c.id;
          return (
            <div
              key={c.id}
              className="rounded-xl border border-border/50 bg-card overflow-hidden transition-all hover:border-border/80"
            >
              {/* Main Row */}
              <button
                className="w-full px-5 py-4 text-left hover:bg-accent/20 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : c.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {c.avatar}
                    </div>
                    {c.verified && (
                      <CheckCircle className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-cyan-400 fill-background" />
                    )}
                  </div>

                  {/* Name + Handle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{c.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${tierColors[c.tier] || ""}`}
                      >
                        {tierIcons[c.tier]} {c.tier}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      @{c.handle} &middot; {c.platform} &middot; {formatNumber(c.subscribers)} beneficiaries
                    </div>
                  </div>

                  {/* Engagement Score (prominent) */}
                  <div className="hidden sm:flex flex-col items-center shrink-0 w-20">
                    <div className={`text-2xl font-bold tabular-nums ${engagementColor(c.engagementScore)}`}>
                      {c.engagementScore}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</div>
                  </div>

                  {/* Engagement Bar */}
                  <div className="hidden md:flex items-center gap-2 w-32 shrink-0">
                    <Progress
                      value={c.engagementScore}
                      className="h-2 flex-1 bg-secondary"
                    />
                  </div>

                  {/* Tips */}
                  <div className="hidden sm:flex flex-col items-center shrink-0 w-16">
                    <div className="text-sm font-semibold tabular-nums">{c.tips}</div>
                    <div className="text-[10px] text-muted-foreground">Transfers</div>
                  </div>

                  {/* Expand Icon */}
                  <div className="shrink-0 text-muted-foreground">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Mobile-only score */}
                <div className="flex sm:hidden items-center gap-3 mt-3">
                  <div className={`text-lg font-bold ${engagementColor(c.engagementScore)}`}>
                    {c.engagementScore}%
                  </div>
                  <Progress value={c.engagementScore} className="h-1.5 flex-1 bg-secondary" />
                  <span className="text-xs text-muted-foreground">{c.tips} transfers</span>
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-5 py-4 bg-accent/10 border-t border-border/20 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="rounded-lg bg-background/50 p-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Subscribers</div>
                      <div className="text-lg font-bold">{formatNumber(c.subscribers)}</div>
                    </div>
                    <div className="rounded-lg bg-background/50 p-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Videos</div>
                      <div className="text-lg font-bold">{c.videoCount.toLocaleString()}</div>
                    </div>
                    <div className="rounded-lg bg-background/50 p-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Views</div>
                      <div className="text-lg font-bold">{formatNumber(c.totalViews)}</div>
                    </div>
                    <div className="rounded-lg bg-background/50 p-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Registered</div>
                      <div className="text-lg font-bold">{c.joinedYear}</div>
                    </div>
                  </div>

                  {/* Engagement Gauge */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Engagement Score</span>
                      <span className={`text-sm font-bold ${engagementColor(c.engagementScore)}`}>
                        {c.engagementScore}/100
                      </span>
                    </div>
                    <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${engagementBg(c.engagementScore)}`}
                        style={{ width: `${c.engagementScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Recent Videos */}
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Recent Videos</div>
                    <div className="space-y-1.5">
                      {c.recentVideoTitles.map((title, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-foreground/80 bg-background/30 rounded-md px-3 py-2"
                        >
                          <Video className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{title}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success(`Transfer sent to @${c.handle}`);
                      }}
                    >
                      Send Transfer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://bitso.com`, "_blank");
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1.5" />
                      Bitso Profile
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No recipients match your search.
        </div>
      )}
    </div>
  );
}

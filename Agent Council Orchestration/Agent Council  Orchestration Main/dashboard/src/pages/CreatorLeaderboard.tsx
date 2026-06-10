import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy, Users, TrendingUp, Search, ChevronDown, ChevronUp,
  Send, Loader2, Star, Crown, Award, Medal, Zap, Play,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────

interface Creator {
  rank: number;
  name: string;
  handle: string;
  subscribers: number;
  engagementScore: number;
  tier: "Diamond" | "Platinum" | "Gold" | "Silver" | "Bronze";
  totalTipsReceived: number;
  recentActivity: string;
  avatar: string;
  trendWeek: number[];
  recentVideos: { title: string; views: number; likes: number; date: string }[];
  tipHistory: { amount: number; date: string; chain: string }[];
}

// ── Demo data ─────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof Crown; min: number }> = {
  Diamond: { color: "text-cyan-300", bg: "bg-cyan-500/15", border: "border-cyan-500/30", icon: Crown, min: 90 },
  Platinum: { color: "text-purple-300", bg: "bg-purple-500/15", border: "border-purple-500/30", icon: Star, min: 75 },
  Gold: { color: "text-amber-300", bg: "bg-amber-500/15", border: "border-amber-500/30", icon: Award, min: 60 },
  Silver: { color: "text-slate-300", bg: "bg-slate-500/15", border: "border-slate-500/30", icon: Medal, min: 40 },
  Bronze: { color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/30", icon: Medal, min: 0 },
};

function getTier(score: number): Creator["tier"] {
  if (score >= 90) return "Diamond";
  if (score >= 75) return "Platinum";
  if (score >= 60) return "Gold";
  if (score >= 40) return "Silver";
  return "Bronze";
}

function genTrend(): number[] {
  const base = 40 + Math.random() * 50;
  return Array.from({ length: 7 }, (_, i) => Math.round(base + Math.sin(i * 0.8) * 15 + Math.random() * 10));
}

const DEMO_CREATORS: Creator[] = [
  { name: "María García", handle: "@maria_garcia", subscribers: 892000, engagementScore: 96 },
  { name: "Luis Hernández", handle: "@luis_hdz", subscribers: 1240000, engagementScore: 93 },
  { name: "Rosa Martínez", handle: "@rosa_mtz", subscribers: 456000, engagementScore: 91 },
  { name: "Carlos López", handle: "@carlos_lop", subscribers: 723000, engagementScore: 88 },
  { name: "Ana Rodríguez", handle: "@ana_rdz", subscribers: 310000, engagementScore: 85 },
  { name: "Fernando Torres", handle: "@fer_torres", subscribers: 580000, engagementScore: 82 },
  { name: "Gabriela Sánchez", handle: "@gabi_san", subscribers: 1100000, engagementScore: 78 },
  { name: "Miguel Flores", handle: "@miguel_flrs", subscribers: 195000, engagementScore: 76 },
  { name: "Isabel Ramírez", handle: "@isabel_rmz", subscribers: 420000, engagementScore: 72 },
  { name: "Javier Cruz", handle: "@javier_cruz", subscribers: 680000, engagementScore: 69 },
  { name: "Patricia Morales", handle: "@paty_mor", subscribers: 250000, engagementScore: 65 },
  { name: "Roberto Jiménez", handle: "@roberto_jim", subscribers: 890000, engagementScore: 62 },
  { name: "Diana Vargas", handle: "@diana_vrg", subscribers: 340000, engagementScore: 58 },
  { name: "Eduardo Reyes", handle: "@edu_reyes", subscribers: 175000, engagementScore: 52 },
  { name: "Claudia Mendoza", handle: "@clau_men", subscribers: 410000, engagementScore: 47 },
  { name: "Andrés Castillo", handle: "@andres_cas", subscribers: 760000, engagementScore: 44 },
  { name: "Sofía Guerrero", handle: "@sofia_gue", subscribers: 130000, engagementScore: 39 },
  { name: "Hugo Navarro", handle: "@hugo_nav", subscribers: 220000, engagementScore: 35 },
  { name: "Elena Peña", handle: "@elena_pen", subscribers: 95000, engagementScore: 28 },
  { name: "Marcos Ibarra", handle: "@marcos_iba", subscribers: 67000, engagementScore: 22 },
].map((c, i) => ({
  ...c,
  rank: i + 1,
  tier: getTier(c.engagementScore),
  totalTipsReceived: Math.round(c.engagementScore * (10 + Math.random() * 20)),
  recentActivity: ["2m ago", "15m ago", "1h ago", "3h ago", "6h ago"][i % 5],
  avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${c.handle}&backgroundColor=1a1a2e`,
  trendWeek: genTrend(),
  recentVideos: [
    { title: `${c.name} - Transfer Request`, views: Math.round(50000 + Math.random() * 500000), likes: Math.round(2000 + Math.random() * 30000), date: "2026-03-24" },
    { title: `${c.name} - Remittance History`, views: Math.round(20000 + Math.random() * 200000), likes: Math.round(1000 + Math.random() * 15000), date: "2026-03-22" },
  ],
  tipHistory: [
    { amount: +(1 + Math.random() * 10).toFixed(2), date: "2026-03-24", chain: ["Base", "Arbitrum", "Base", "Arbitrum"][i % 4] },
    { amount: +(0.5 + Math.random() * 5).toFixed(2), date: "2026-03-23", chain: ["Arbitrum", "Base", "Arbitrum"][i % 3] },
  ],
}));

// ── Sort options ──────────────────────────────────────────────────

type SortKey = "engagement" | "subscribers" | "tips" | "recent";

export default function CreatorLeaderboard() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("engagement");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoTipping, setAutoTipping] = useState(false);

  const filtered = useMemo(() => {
    let list = [...DEMO_CREATORS];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q));
    }
    if (tierFilter !== "all") {
      list = list.filter((c) => c.tier === tierFilter);
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case "subscribers": return b.subscribers - a.subscribers;
        case "tips": return b.totalTipsReceived - a.totalTipsReceived;
        case "recent": return 0; // already sorted by engagement
        default: return b.engagementScore - a.engagementScore;
      }
    });
    return list;
  }, [search, tierFilter, sortBy]);

  const handleAutoTip = useCallback(() => {
    setAutoTipping(true);
    setTimeout(() => {
      setAutoTipping(false);
      toast.success("Auto-transferred to top 5 recipients based on trust scores!");
    }, 2500);
  }, []);

  const toggleExpand = (handle: string) => {
    setExpandedId(expandedId === handle ? null : handle);
  };

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { Diamond: 0, Platinum: 0, Gold: 0, Silver: 0, Bronze: 0 };
    DEMO_CREATORS.forEach((c) => { counts[c.tier]++; });
    return counts;
  }, []);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Top Recipients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top 20 beneficiaries ranked by trust score and remittance activity.
          </p>
        </div>
        <Button
          onClick={handleAutoTip}
          disabled={autoTipping}
          className="bg-[#FF4E00] hover:bg-[#FF4E00]/80 text-white gap-2"
        >
          {autoTipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Auto-Transfer Top 5
        </Button>
      </div>

      {/* Tier distribution */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries(TIER_CONFIG).map(([tier, cfg]) => {
          const TierIcon = cfg.icon;
          return (
            <Card
              key={tier}
              className={`border-border/50 cursor-pointer transition-all hover:scale-[1.02] ${
                tierFilter === tier ? "ring-1 ring-[#FF4E00]/50" : ""
              }`}
              onClick={() => setTierFilter(tierFilter === tier ? "all" : tier)}
            >
              <CardContent className="p-3 flex items-center gap-2">
                <TierIcon className={`h-4 w-4 ${cfg.color}`} />
                <div>
                  <div className={`text-xs font-medium ${cfg.color}`}>{tier}</div>
                  <div className="text-lg font-bold">{tierCounts[tier]}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-36 bg-background/50">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            {Object.keys(TIER_CONFIG).map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-44 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="engagement">Sort: Engagement</SelectItem>
            <SelectItem value="subscribers">Sort: Subscribers</SelectItem>
            <SelectItem value="tips">Sort: Transfers Received</SelectItem>
            <SelectItem value="recent">Sort: Recent Activity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leaderboard */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="divide-y divide-border/10">
            {filtered.map((creator) => {
              const cfg = TIER_CONFIG[creator.tier];
              const TierIcon = cfg.icon;
              const expanded = expandedId === creator.handle;
              const maxEng = 100;

              return (
                <div key={creator.handle}>
                  <div
                    className="flex items-center gap-4 p-4 hover:bg-muted/5 cursor-pointer transition-colors"
                    onClick={() => toggleExpand(creator.handle)}
                  >
                    {/* Rank */}
                    <div className={`w-8 text-center font-bold text-lg ${
                      creator.rank <= 3 ? "text-[#FF4E00]" : "text-muted-foreground"
                    }`}>
                      {creator.rank <= 3 ? (
                        <Trophy className={`h-5 w-5 mx-auto ${
                          creator.rank === 1 ? "text-amber-400" : creator.rank === 2 ? "text-slate-300" : "text-orange-400"
                        }`} />
                      ) : (
                        `#${creator.rank}`
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-muted/30 border border-border/30 overflow-hidden shrink-0">
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {creator.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{creator.name}</span>
                        <Badge variant="outline" className={`${cfg.bg} ${cfg.color} ${cfg.border} text-[9px] px-1.5`}>
                          <TierIcon className="h-2.5 w-2.5 mr-0.5" />{creator.tier}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{creator.handle}</div>
                    </div>

                    {/* Subscribers */}
                    <div className="hidden md:block text-right">
                      <div className="text-sm font-medium">{(creator.subscribers / 1000).toFixed(0)}K</div>
                      <div className="text-[10px] text-muted-foreground">subscribers</div>
                    </div>

                    {/* Engagement bar */}
                    <div className="hidden md:flex items-center gap-2 w-32">
                      <div className="flex-1 h-2 bg-muted/20 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(creator.engagementScore / maxEng) * 100}%`,
                            background: `linear-gradient(90deg, #FF4E00, ${
                              creator.engagementScore >= 80 ? "#22c55e" : creator.engagementScore >= 50 ? "#eab308" : "#ef4444"
                            })`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold w-8 text-right">{creator.engagementScore}</span>
                    </div>

                    {/* Tips */}
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-emerald-400">${creator.totalTipsReceived}</div>
                      <div className="text-[10px] text-muted-foreground">total received</div>
                    </div>

                    {/* Activity */}
                    <div className="text-[10px] text-muted-foreground hidden lg:block w-16 text-right">
                      {creator.recentActivity}
                    </div>

                    {/* Expand */}
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>

                  {/* Expanded details */}
                  {expanded && (
                    <div className="px-4 pb-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/5 border-t border-border/10">
                      {/* Engagement trend */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> Weekly Engagement Trend
                        </div>
                        <div className="flex items-end gap-1 h-16">
                          {creator.trendWeek.map((v, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t bg-[#FF4E00]/60 hover:bg-[#FF4E00] transition-colors"
                              style={{ height: `${(v / 100) * 100}%` }}
                              title={`Day ${i + 1}: ${v}`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>Mon</span><span>Sun</span>
                        </div>
                      </div>

                      {/* Recent videos */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Play className="h-3 w-3" /> Recent Videos
                        </div>
                        {creator.recentVideos.map((v, i) => (
                          <div key={i} className="p-2 rounded bg-background/50 border border-border/20 text-xs">
                            <div className="font-medium truncate">{v.title}</div>
                            <div className="text-muted-foreground mt-0.5">
                              {(v.views / 1000).toFixed(0)}K views &middot; {(v.likes / 1000).toFixed(1)}K likes &middot; {v.date}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Tip history */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Send className="h-3 w-3" /> Transfer History
                        </div>
                        {creator.tipHistory.map((t, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/20 text-xs">
                            <span className="text-emerald-400 font-medium">${t.amount} USDC</span>
                            <Badge variant="outline" className="text-[9px]">{t.chain}</Badge>
                            <span className="text-muted-foreground">{t.date}</span>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full gap-1 text-xs mt-1">
                          <Send className="h-3 w-3" /> Send to {creator.name.split(" ")[0]}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No recipients match your filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

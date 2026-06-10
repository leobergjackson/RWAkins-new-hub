import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import CountUp from "@/components/shared/CountUp";
import { Award, Search, Download, Upload, Trophy, Star, Zap, Globe, Heart, Shield } from "lucide-react";
import { toast } from "sonner";

const achievements = [
  { id: "first_tip", name: "First Transfer", icon: Zap, unlocked: true },
  { id: "consistent", name: "Consistent", icon: Star, unlocked: true },
  { id: "generous", name: "Frequent Sender", icon: Heart, unlocked: true },
  { id: "multi_chain", name: "Multi-L2", icon: Globe, unlocked: true },
  { id: "guardian", name: "Guardian", icon: Shield, unlocked: true },
  { id: "whale", name: "Whale", icon: Trophy, unlocked: false },
  { id: "pioneer", name: "Pioneer", icon: Award, unlocked: false },
  { id: "speed_demon", name: "Speed Demon", icon: Zap, unlocked: false },
];

const leaderboard = [
  { rank: 1, address: "0x7a3B...f82d", score: 97, tier: "Diamond" },
  { rank: 2, address: "0x1cE4...a91b", score: 94, tier: "Diamond" },
  { rank: 3, address: "0x9fD2...c34e", score: 91, tier: "Diamond" },
  { rank: 4, address: "0x4bA8...d67f", score: 87, tier: "Platinum" },
  { rank: 5, address: "0x2eC1...b45a", score: 84, tier: "Platinum" },
  { rank: 6, address: "0x8dF3...e92c", score: 82, tier: "Gold" },
  { rank: 7, address: "0x5aB7...f18d", score: 78, tier: "Gold" },
  { rank: 8, address: "0x3cD9...a73e", score: 74, tier: "Gold" },
  { rank: 9, address: "0x6eE2...b56f", score: 71, tier: "Silver" },
  { rank: 10, address: "0x0fA4...c89a", score: 68, tier: "Silver" },
];

const tierBadge = (t: string) => {
  if (t === "Diamond") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (t === "Platinum") return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  if (t === "Gold") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
};

export default function Reputation() {
  const [lookupAddress, setLookupAddress] = useState("0x7a3B...f82d");
  const [looked, setLooked] = useState(true);

  const lookup = () => {
    if (!lookupAddress.trim()) return;
    setLooked(true);
    toast.success("Reputation fetched");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Remittance Reputation Passport</h1>
        <p className="text-sm text-muted-foreground mt-1">ZK-verified reputation scores, transfer achievements, and exportable passports.</p>
      </div>

      {/* Lookup */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-5 mb-6">
        <h3 className="text-sm font-semibold mb-3">Reputation Lookup</h3>
        <div className="flex gap-2 mb-4">
          <Input value={lookupAddress} onChange={(e) => { setLookupAddress(e.target.value); setLooked(false); }} placeholder="Enter wallet address..." className="bg-card border-border/50 font-mono text-xs" />
          <Button onClick={lookup} variant="outline" className="shrink-0">
            <Search className="h-4 w-4 mr-2" />Lookup
          </Button>
        </div>

        {looked && (
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-center rounded-lg bg-accent/30 p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Reputation Score</p>
              <div className="text-4xl font-bold tabular-nums" style={{ color: "#FF4E00" }}><CountUp target={97} /></div>
              <p className="text-[10px] text-muted-foreground mt-1">out of 100</p>
              <Progress value={97} className="h-2 bg-secondary mt-3 w-full" />
            </div>
            <div className="flex flex-col items-center rounded-lg bg-accent/30 p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Tier</p>
              <Badge variant="outline" className={`text-sm px-4 py-1 ${tierBadge("Diamond")}`}>Diamond</Badge>
              <p className="text-xs text-muted-foreground mt-2">Top 3% of all addresses</p>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-accent/30 p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Actions</p>
              <div className="flex gap-2 mt-1">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toast.success("Passport JSON exported with ZK proof")}>
                  <Download className="h-3 w-3 mr-1" />Export
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toast.info("Upload passport JSON to verify")}>
                  <Upload className="h-3 w-3 mr-1" />Import
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Achievements */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Achievements</h3>
          <div className="grid grid-cols-4 gap-3">
            {achievements.map((a) => (
              <div key={a.id} className={`flex flex-col items-center rounded-lg border p-3 text-center transition-colors ${a.unlocked ? "border-border/50 bg-accent/20" : "border-border/20 bg-card/20 opacity-40"}`}>
                <a.icon className="h-6 w-6 mb-1.5" strokeWidth={1.5} style={{ color: a.unlocked ? "#FF4E00" : "#C6B6B1" }} />
                <span className="text-[10px] font-medium">{a.name}</span>
                {a.unlocked && <div className="h-1 w-1 rounded-full bg-emerald-500 mt-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
            <Trophy className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <h3 className="text-sm font-semibold">Leaderboard</h3>
          </div>
          <div className="divide-y divide-border/20">
            {leaderboard.map((l) => (
              <div key={l.rank} className="px-5 py-2.5 flex items-center gap-3 hover:bg-accent/30 transition-colors">
                <span className="text-xs font-bold tabular-nums w-5 text-center" style={{ color: l.rank <= 3 ? "#FF4E00" : undefined }}>{l.rank}</span>
                <span className="text-xs font-mono flex-1">{l.address}</span>
                <span className="text-xs tabular-nums font-medium">{l.score}</span>
                <Badge variant="outline" className={`text-[9px] ${tierBadge(l.tier)}`}>{l.tier}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

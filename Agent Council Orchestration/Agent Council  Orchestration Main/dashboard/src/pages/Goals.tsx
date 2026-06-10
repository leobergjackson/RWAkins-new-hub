import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CountUp from "@/components/shared/CountUp";
import { Target, CheckCircle2, Flame, Trophy, Zap, Star, Heart, Globe, Shield, Award } from "lucide-react";

const activeGoals = [
  { title: "Complete 50 remittances this month", progress: 68, target: "50 transfers", deadline: "8 days left" },
  { title: "Maintain 90%+ health score", progress: 94, target: "90% minimum", deadline: "Ongoing" },
  { title: "Expand to 3 new corridors", progress: 33, target: "3 corridors", deadline: "14 days left" },
  { title: "Reach $500 monthly savings for users", progress: 72, target: "$500/mo", deadline: "22 days left" },
];

const completedGoals = [
  { title: "Process first 100 remittances", completedAt: "Mar 15" },
  { title: "Achieve Diamond reputation tier", completedAt: "Mar 12" },
  { title: "Block 50 security threats", completedAt: "Mar 10" },
  { title: "Integrate Arbitrum + Base", completedAt: "Mar 7" },
];

const achievements = [
  { id: "first_100", name: "Century Club", icon: Trophy, date: "Mar 15", unlocked: true },
  { id: "diamond", name: "Diamond Tier", icon: Star, date: "Mar 12", unlocked: true },
  { id: "guardian", name: "Guardian Angel", icon: Shield, date: "Mar 10", unlocked: true },
  { id: "multi_chain", name: "L2 Pioneer", icon: Globe, date: "Mar 7", unlocked: true },
  { id: "generous", name: "Top Sender", icon: Heart, date: "Mar 5", unlocked: true },
  { id: "speed", name: "Speed Demon", icon: Zap, date: null, unlocked: false },
  { id: "whale", name: "Whale Status", icon: Award, date: null, unlocked: false },
  { id: "streak30", name: "30-Day Streak", icon: Flame, date: null, unlocked: false },
];

const challenges = [
  { title: "Complete 5 remittances today", progress: 60, reward: "Speed Demon badge" },
  { title: "Keep fee spending under $2", progress: 85, reward: "+5 reputation points" },
  { title: "Complete 10 agent cycles", progress: 40, reward: "Efficiency bonus" },
];

export default function Goals() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals & Achievements</h1>
          <p className="text-sm text-muted-foreground mt-1">Track remittance milestones, earn badges, and maintain your streak.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-2">
          <Flame className="h-5 w-5" strokeWidth={1.5} style={{ color: "#FF4E00" }} />
          <div>
            <p className="text-lg font-bold tabular-nums leading-none"><CountUp target={12} /></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Day Streak</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Active Goals */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Active Goals</h3>
          <div className="space-y-4">
            {activeGoals.map((g) => (
              <div key={g.title}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">{g.title}</span>
                  <span className="text-[10px] text-muted-foreground">{g.deadline}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={g.progress} className="h-2 flex-1 bg-secondary" />
                  <span className="text-xs font-mono tabular-nums w-10 text-right">{g.progress}%</span>
                </div>
                <span className="text-[10px] text-muted-foreground/60">Target: {g.target}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Completed Goals */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Completed</h3>
          <div className="space-y-3">
            {completedGoals.map((g) => (
              <div key={g.title} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: "#50AF95" }} />
                <span className="text-xs flex-1">{g.title}</span>
                <span className="text-[10px] text-muted-foreground">{g.completedAt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Achievements */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Achievements</h3>
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
            {achievements.map((a) => (
              <div key={a.id} className={`flex flex-col items-center rounded-lg border p-3 text-center transition-colors ${a.unlocked ? "border-border/50 bg-accent/20" : "border-border/20 bg-card/20 opacity-40"}`}>
                <a.icon className="h-6 w-6 mb-1.5" strokeWidth={1.5} style={{ color: a.unlocked ? "#FF4E00" : "#C6B6B1" }} />
                <span className="text-[10px] font-medium">{a.name}</span>
                {a.date && <span className="text-[9px] text-muted-foreground/60 mt-0.5">{a.date}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Daily Challenges */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <h3 className="text-sm font-semibold">Daily Challenges</h3>
          </div>
          <div className="space-y-4">
            {challenges.map((c) => (
              <div key={c.title}>
                <p className="text-xs font-medium mb-1">{c.title}</p>
                <Progress value={c.progress} className="h-1.5 bg-secondary mb-1" />
                <span className="text-[10px] text-muted-foreground/60">Reward: {c.reward}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

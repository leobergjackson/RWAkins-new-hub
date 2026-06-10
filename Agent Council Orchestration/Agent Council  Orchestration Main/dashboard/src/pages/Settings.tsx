import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, User, Shield, Link, Database, Info, Save } from "lucide-react";
import { toast } from "sonner";
import { useUptime } from "@/hooks/useUptime";

export default function Settings() {
  const uptime = useUptime();
  const [agentName, setAgentName] = useState("Colibrí");
  const [personality, setPersonality] = useState("balanced");
  const [autonomous, setAutonomous] = useState(true);
  const [dailyLimit, setDailyLimit] = useState("100");
  const [perTipMax, setPerTipMax] = useState("10");
  const [weeklyCap, setWeeklyCap] = useState("500");

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">Agent settings, limits, integrations, and system info.</p>
        </div>
        <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90" onClick={() => toast.success("Settings saved")}>
          <Save className="h-3 w-3 mr-1" />Save Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* General */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <h3 className="text-sm font-semibold">General</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Agent Name</label>
              <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} className="bg-card border-border/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Personality</label>
              <Select value={personality} onValueChange={setPersonality}>
                <SelectTrigger className="bg-card border-border/50 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="cautious">Cautious</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Autonomous Mode</p>
                <p className="text-[10px] text-muted-foreground">Agent operates without manual approval</p>
              </div>
              <Switch checked={autonomous} onCheckedChange={setAutonomous} />
            </div>
          </div>
        </div>

        {/* Limits */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <h3 className="text-sm font-semibold">Limits</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Daily Transfer Limit (USDC)</label>
              <Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} className="bg-card border-border/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Per-Transfer Maximum (USDC)</label>
              <Input type="number" value={perTipMax} onChange={(e) => setPerTipMax(e.target.value)} className="bg-card border-border/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Weekly Cap (USDC)</label>
              <Input type="number" value={weeklyCap} onChange={(e) => setWeeklyCap(e.target.value)} className="bg-card border-border/50 text-sm" />
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Link className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <h3 className="text-sm font-semibold">Integrations</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: "Bitso Off-Ramp API", status: "connected" },
              { name: "SPEI Transfer Rail", status: "connected" },
              { name: "Groq (Llama 3)", status: "active" },
              { name: "Gemini 2.0 Flash", status: "standby" },
              { name: "Arbitrum RPC", status: "connected" },
            ].map((i) => (
              <div key={i.name} className="flex items-center justify-between">
                <span className="text-xs">{i.name}</span>
                <Badge variant="outline" className={`text-[9px] ${i.status === "connected" || i.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : i.status === "standby" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                  {i.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Security + Persistence */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <h3 className="text-sm font-semibold">Security & Persistence</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Seed Encryption", value: "AES-256-GCM" },
              { label: "API Key", value: "Configured" },
              { label: "Tool Policy", value: "6 layers active" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">{s.value}</Badge>
              </div>
            ))}
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
                <span className="text-xs font-medium">Persistence Backend</span>
              </div>
              <Badge variant="outline" className="text-[9px]">JSON File System</Badge>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            <h3 className="text-sm font-semibold">About</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Version", value: "v1.1.0" },
              { label: "Uptime", value: uptime },
              { label: "Total Services", value: "97+" },
              { label: "Source", value: "github.com/agdanish/ETHMexico" },
            ].map((a) => (
              <div key={a.label} className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{a.label}</p>
                <p className="text-sm font-medium font-mono">{a.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

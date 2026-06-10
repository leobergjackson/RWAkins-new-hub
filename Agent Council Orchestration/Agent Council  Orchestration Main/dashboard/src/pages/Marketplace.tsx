import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import CountUp from "@/components/shared/CountUp";
import { Store, Download, Package, Wrench, Puzzle, Code, Cpu, Globe } from "lucide-react";
import { toast } from "sonner";
import { type LucideIcon } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  installed: boolean;
  enabled: boolean;
  author: string;
  permissions: string[];
}

const initialSkills: Skill[] = [
  { id: "remittance-engine", name: "Remittance Engine", description: "Automated USD→MXN transfers with route optimization", icon: Package, installed: true, enabled: true, author: "Colibrí Core", permissions: ["wallet.send", "beneficiary.read"] },
  { id: "escrow-manager", name: "Escrow Manager", description: "HTLC escrow creation and claim management", icon: Wrench, installed: true, enabled: true, author: "Colibrí Core", permissions: ["wallet.send", "escrow.create"] },
  { id: "fx-optimizer", name: "FX Optimizer", description: "Real-time USD/MXN rate optimization via Bitso oracle", icon: Puzzle, installed: true, enabled: true, author: "Colibrí Core", permissions: ["fx.read", "wallet.send"] },
  { id: "zk-proofs", name: "ZK Proofs", description: "Zero-knowledge proof generation and verification", icon: Code, installed: true, enabled: false, author: "Colibrí Labs", permissions: ["crypto.compute"] },
  { id: "l2-bridge", name: "L2 Bridge", description: "Trustless USDC bridging between Arbitrum and Base", icon: Globe, installed: false, enabled: false, author: "Community", permissions: ["wallet.send", "bridge.execute"] },
  { id: "compliance-scanner", name: "Compliance Scanner", description: "AML/KYC screening for remittance recipients", icon: Cpu, installed: false, enabled: false, author: "Community", permissions: ["kyc.read", "beneficiary.read"] },
  { id: "spei-rail", name: "SPEI Rail", description: "Direct SPEI bank transfer integration for MXN delivery", icon: Puzzle, installed: false, enabled: false, author: "Community", permissions: ["spei.send", "ai.infer"] },
  { id: "tax-reporter", name: "Tax Reporter", description: "Automated tax lot tracking and report generation", icon: Wrench, installed: false, enabled: false, author: "Colibrí Labs", permissions: ["tx.read", "report.generate"] },
];

export default function Marketplace() {
  const [skills, setSkills] = useState(initialSkills);

  const toggleEnabled = (id: string) => {
    setSkills((s) => s.map((sk) => sk.id === id ? { ...sk, enabled: !sk.enabled } : sk));
  };

  const install = (id: string) => {
    setSkills((s) => s.map((sk) => sk.id === id ? { ...sk, installed: true, enabled: true } : sk));
    toast.success("Skill installed and enabled");
  };

  const installed = skills.filter((s) => s.installed);
  const available = skills.filter((s) => !s.installed);

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Skills Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse, install, and manage agent capabilities.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-center">
            <p className="text-lg font-bold tabular-nums leading-none"><CountUp target={97} /></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">MCP Tools</p>
          </div>
          <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">OpenClaw Connected</Badge>
        </div>
      </div>

      {/* Installed */}
      <div className="rounded-xl border border-border/50 bg-card/50 mb-6">
        <div className="px-5 py-3 border-b border-border/40">
          <h3 className="text-sm font-semibold">Installed Skills</h3>
        </div>
        <div className="divide-y divide-border/20">
          {installed.map((s) => (
            <div key={s.id} className="px-5 py-4 flex items-center gap-4 hover:bg-accent/30 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-accent/30 border border-border/40 flex items-center justify-center shrink-0">
                <s.icon className="h-5 w-5" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground/60">{s.author}</span>
                </div>
                <p className="text-xs text-muted-foreground">{s.description}</p>
                <div className="flex gap-1 mt-1">
                  {s.permissions.map((p) => <Badge key={p} variant="outline" className="text-[8px]">{p}</Badge>)}
                </div>
              </div>
              <Switch checked={s.enabled} onCheckedChange={() => toggleEnabled(s.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* Available */}
      <h3 className="text-sm font-semibold mb-3">Available Skills</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {available.map((s) => (
          <div key={s.id} className="rounded-xl border border-border/50 bg-card/50 p-4 hover:border-border/70 transition-colors">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/30 border border-border/40 flex items-center justify-center shrink-0">
                <s.icon className="h-5 w-5" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground/60">{s.author}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{s.description}</p>
                <div className="flex gap-1 mb-3">
                  {s.permissions.map((p) => <Badge key={p} variant="outline" className="text-[8px]">{p}</Badge>)}
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => install(s.id)}>
                  <Download className="h-3 w-3 mr-1" />Install
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

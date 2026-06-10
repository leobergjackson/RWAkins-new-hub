import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Check, Loader2, Lock, Eye, Hash } from "lucide-react";
import CountUp from "@/components/shared/CountUp";
import { toast } from "sonner";

export default function Privacy() {
  const [commitInput, setCommitInput] = useState("87");
  const [commitHash, setCommitHash] = useState("");
  const [commitLoading, setCommitLoading] = useState(false);

  const [proveThreshold, setProveThreshold] = useState("70");
  const [proof, setProof] = useState("");
  const [proveLoading, setProveLoading] = useState(false);

  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleCommit = () => {
    setCommitLoading(true);
    setTimeout(() => {
      setCommitHash("0x7f3a9c2e1d4b8f6a5c3e7d9b0a1f2e4c6d8b0a3e5f7c9d1b3a5e7f9c1d3b5a");
      setCommitLoading(false);
      toast.success("Commitment created");
    }, 1200);
  };

  const handleProve = () => {
    setProveLoading(true);
    setTimeout(() => {
      setProof("π = { A: [0x1a2b...3c4d], B: [[0x5e6f...7a8b], [0x9c0d...1e2f]], C: [0x3a4b...5c6d] }");
      setProveLoading(false);
      toast.success("Proof generated");
    }, 1800);
  };

  const handleVerify = () => {
    setVerifyLoading(true);
    setTimeout(() => {
      setVerifyResult(true);
      setVerifyLoading(false);
      toast.success("Proof verified — score ≥ threshold confirmed");
    }, 1000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Zero-Knowledge Proofs</h1>
        <p className="text-sm text-muted-foreground mt-1">Prove properties about data without revealing the data itself.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Commitments", value: 142, icon: Hash },
          { label: "Proofs Generated", value: 89, icon: Lock },
          { label: "Verifications", value: 76, icon: Eye },
          { label: "Success Rate", value: 98, suffix: "%", icon: ShieldCheck },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight">
              <CountUp target={s.value} />{s.suffix}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Capabilities */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            ZK Capabilities
          </h3>
          <div className="space-y-3">
            <div className="rounded-lg bg-accent/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Hash-Based Commitments</span>
                <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Active</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">SHA-256 Pedersen commitments for score hiding</p>
            </div>
            <div className="rounded-lg bg-accent/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Groth16 SNARKs</span>
                <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Active</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Range proofs: "score ≥ threshold" without revealing score</p>
            </div>
            <div className="rounded-lg bg-accent/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Trusted Setup</span>
                <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Complete</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Powers of Tau ceremony completed, CRS generated</p>
            </div>
          </div>
        </div>

        {/* Create Commitment + Generate Proof */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
                Create Commitment
              </CardTitle>
              <CardDescription>Hide a reputation score behind a cryptographic commitment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Score (0–100)</label>
                  <Input value={commitInput} onChange={(e) => setCommitInput(e.target.value)} className="bg-secondary/30 border-border/40 mt-1 h-9 text-sm" />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCommit} disabled={commitLoading} size="sm" className="h-9">
                    {commitLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Commit"}
                  </Button>
                </div>
              </div>
              {commitHash && (
                <div className="rounded-lg bg-secondary/30 p-2.5 text-[11px] font-mono break-all animate-fade-in">
                  <span className="text-muted-foreground">Hash: </span>{commitHash}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
                Generate Proof
              </CardTitle>
              <CardDescription>Prove your score is above a threshold without revealing it</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Threshold</label>
                  <Input value={proveThreshold} onChange={(e) => setProveThreshold(e.target.value)} className="bg-secondary/30 border-border/40 mt-1 h-9 text-sm" />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleProve} disabled={proveLoading || !commitHash} size="sm" className="h-9">
                    {proveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Prove"}
                  </Button>
                </div>
              </div>
              {proof && (
                <div className="rounded-lg bg-secondary/30 p-2.5 text-[11px] font-mono break-all animate-fade-in">
                  <span className="text-muted-foreground">Proof: </span>{proof}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Verify */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
            Verify Proof
          </CardTitle>
          <CardDescription>Verify a zero-knowledge proof against its commitment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleVerify} disabled={verifyLoading || !proof} size="sm">
              {verifyLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Verifying...</> : "Verify Proof"}
            </Button>
            {verifyResult !== null && (
              <div className="flex items-center gap-1.5 text-sm animate-fade-in" style={{ color: "#50AF95" }}>
                <Check className="h-4 w-4" />
                <span>Verified — score ≥ {proveThreshold} confirmed without revealing actual value</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

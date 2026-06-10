import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CopyButton from "@/components/shared/CopyButton";
import { ExternalLink, Package, Cpu, Zap, Link2, Hexagon, Diamond, CircleDot, Bitcoin, Sun } from "lucide-react";
import { type LucideIcon } from "lucide-react";

const codeBlocks = [
  { label: "Install", code: "git clone https://github.com/agdanish/ETHMexico.git" },
  { label: "Try", code: "cd ETHMexico && npm run dev" },
  { label: "Build", code: `curl "localhost:3001/api/remittance/quote?usd=200"` },
];

const presets = [
  { name: "remittanceBot", desc: "Auto-route USD→MXN transfers via Arbitrum + Base with Bitso/SPEI off-ramp.", config: `{ preset: 'remittanceBot', chains: ['arbitrum', 'base'], maxTransfer: 10 }` },
  { name: "treasuryManager", desc: "Manage a multi-sig treasury with DeFi yield and rebalancing strategies.", config: `{ preset: 'treasuryManager', chains: ['arbitrum'], aaveEnabled: true }` },
  { name: "escrowAgent", desc: "HTLC escrow creation, monitoring, claim/refund with timelock automation.", config: `{ preset: 'escrowAgent', defaultTimelock: 7200 }` },
  { name: "paymentProcessor", desc: "Subscriptions, streaming payments, splits, and x402 micropayments.", config: `{ preset: 'paymentProcessor', x402: true, streaming: true }` },
  { name: "advisor", desc: "Portfolio analysis, risk scoring, and remittance corridor recommendations.", config: `{ preset: 'advisor', riskTolerance: 'moderate' }` },
];

const hooks = [
  "onAgentBoot", "onCycleStart", "onCycleEnd", "onTransferQueued", "onTransferSent",
  "onEscrowCreated", "onEscrowClaimed", "onEscrowRefunded", "onSwapExecuted",
  "onRiskAlert", "onGuardianVeto", "onConsensusReached", "onPolicyViolation",
  "onChainSwitch", "onBalanceChange", "onRecipientDiscovered", "onDCAExecuted", "onError",
];

const adapters: { name: string; chains: string; icon: LucideIcon }[] = [
  { name: "Arbitrum", chains: "Arbitrum One (L2)", icon: Hexagon },
  { name: "Base", chains: "Base (L2 by Coinbase)", icon: Diamond },
  { name: "Bitso", chains: "MXN off-ramp / SPEI", icon: CircleDot },
  { name: "ERC-4337", chains: "Gasless transfers", icon: Bitcoin },
  { name: "EVM", chains: "Any EVM-compatible", icon: Sun },
];

export default function Build() {
  return (
    <div>
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Build on Colibrí</h1>
          <p className="text-sm text-muted-foreground mt-1">SDK-first platform — install, import, extend.</p>
        </div>
        <a
          href="https://github.com/agdanish/ETHMexico"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Package className="h-4 w-4" />GitHub <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Getting Started */}
      <div className="grid md:grid-cols-3 gap-3 mb-10">
        {codeBlocks.map((block) => (
          <div key={block.label} className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
            <div className="px-4 py-2 border-b border-border/40 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{block.label}</span>
              <CopyButton text={block.code} />
            </div>
            <pre className="px-4 py-3 text-sm font-mono text-foreground/90 overflow-x-auto whitespace-pre">
              <code>{block.code}</code>
            </pre>
          </div>
        ))}
      </div>

      {/* Presets */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Cpu className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />5 Ready-Made Presets
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {presets.map((p) => (
            <Card key={p.name} className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono flex items-center justify-between">
                  {p.name}
                  <CopyButton text={p.config} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{p.desc}</p>
                <pre className="text-[11px] font-mono text-foreground/70 bg-secondary/30 rounded p-2 overflow-x-auto">
                  {p.config}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Hooks */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />18 Lifecycle Hooks
        </h2>
        <div className="flex flex-wrap gap-2">
          {hooks.map((h) => (
            <span key={h} className="text-xs font-mono bg-secondary/40 text-foreground/80 px-2.5 py-1 rounded-md border border-border/30">
              {h}
            </span>
          ))}
        </div>
      </div>

      {/* Adapters */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Link2 className="h-4 w-4" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />L2 + Off-Ramp Adapters
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {adapters.map((a) => (
            <div key={a.name} className="rounded-xl border border-border/50 bg-card/50 p-4 text-center">
              <a.icon className="h-6 w-6 mx-auto mb-2" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <div className="text-sm font-medium">{a.name}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{a.chains}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

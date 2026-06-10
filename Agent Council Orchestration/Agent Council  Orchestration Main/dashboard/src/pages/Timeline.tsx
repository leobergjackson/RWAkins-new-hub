import { Rocket, Brain, Link2, CreditCard, Shield, Terminal, Sparkles } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

const milestones = [
  {
    day: "Day 1",
    title: "Project Kickoff — Ethereum Mexico 2026",
    desc: "Colibrí concept defined: USD→MXN cross-border remittances on Arbitrum + Base. Architecture designed, monorepo scaffolded, Bitso API integration planned.",
    icon: Rocket,
    color: "text-primary",
  },
  {
    day: "Day 2",
    title: "4-Agent Council",
    desc: "Discovery, Router, Treasury, and Guardian agents built. ReAct executor, multi-agent consensus (3 agents + guardian veto), and memory system deployed.",
    icon: Brain,
    color: "text-blue-400",
  },
  {
    day: "Day 3",
    title: "Arbitrum + Base Integration",
    desc: "USDC settlement on Arbitrum and Base connected. Bitso off-ramp API integrated for MXN delivery via SPEI within ~90 seconds.",
    icon: Link2,
    color: "text-cyan-400",
  },
  {
    day: "Day 4",
    title: "Remittance Flows",
    desc: "End-to-end USD→USDC→MXN pipeline. HTLC escrow, group remittance pools, family recurring transfers, and ~$1.20 flat fee engine.",
    icon: CreditCard,
    color: "text-emerald-400",
  },
  {
    day: "Day 5",
    title: "Security Hardening",
    desc: "6-layer security architecture. Adversarial testing suite: Sybil, flash loan, replay, oracle, reentrancy, social engineering — 1,183 tests passing.",
    icon: Shield,
    color: "text-yellow-400",
  },
  {
    day: "Day 6",
    title: "SDK + CLI Published",
    desc: "Open-sourced on GitHub — 8-stage pipeline, full TypeScript SDK, remittance presets.",
    icon: Terminal,
    color: "text-orange-400",
  },
  {
    day: "Day 7",
    title: "Polish & Ship",
    desc: "Enterprise dashboard UI, 1,183 tests, competitor analysis vs Western Union, documentation, and final deployment for Ethereum Mexico 2026.",
    icon: Sparkles,
    color: "text-primary",
  },
];

export default function Timeline() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Project Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1">7-day build journey — Colibrí at Ethereum Mexico 2026.</p>
      </div>

      <div className="relative max-w-2xl">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border/50" />

        <div className="space-y-8">
          {milestones.map((m, i) => (
            <ScrollReveal key={m.day} delay={i * 120}>
              <div className="relative flex gap-4">
                <div className={`relative z-10 h-10 w-10 rounded-xl border border-border/50 bg-card flex items-center justify-center shrink-0 ${m.color}`}>
                  <m.icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="pt-1 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{m.day}</span>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{m.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}

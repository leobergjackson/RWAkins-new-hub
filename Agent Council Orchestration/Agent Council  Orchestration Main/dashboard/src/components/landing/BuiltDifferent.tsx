import { BrainCircuit, Users, Lock } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

const features = [
  {
    icon: BrainCircuit,
    title: "Route Intelligence",
    description: "A 4-agent AI council reasons about exchange rates and gas fees in real time. Not rules. Not scripts. Financial intelligence.",
  },
  {
    icon: Users,
    title: "Multi-Agent Consensus",
    description: "Discovery, Router, Treasury, and Guardian deliberate on every transfer. The Guardian holds veto power before any money moves.",
  },
  {
    icon: Lock,
    title: "Safe Settlement",
    description: "USDC settles on Arbitrum or Base. Bitso off-ramps to MXN via SPEI — straight to the recipient's Mexican bank account.",
  },
];

export default function BuiltDifferent() {
  return (
    <section className="py-24 md:py-32" style={{ background: "#0A0A0B" }}>
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-1 h-8 rounded-full" style={{ background: "#FF4E00" }} />
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-white text-balance">
              Built Different
            </h2>
          </div>
          <p className="mb-16 max-w-xl" style={{ color: "hsl(240 5% 50%)" }}>
            Not another money-transfer app. An autonomous remittance agent built for LATAM.
          </p>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 100}>
              <div
                className="group rounded-xl p-6 transition-all duration-300 active:scale-[0.98] hover:translate-y-[-4px] hover:shadow-[0_4px_20px_rgba(255,78,0,0.15)]"
                style={{
                  background: "rgba(255,78,0,0.03)",
                  border: "1px solid rgba(255,78,0,0.1)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,78,0,0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,78,0,0.1)"; }}
              >
                <f.icon className="h-8 w-8 mb-5" strokeWidth={1.5} style={{ color: "#FF4E00" }} />
                <h3 className="font-heading text-base font-semibold mb-2 text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(240 5% 50%)" }}>
                  {f.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

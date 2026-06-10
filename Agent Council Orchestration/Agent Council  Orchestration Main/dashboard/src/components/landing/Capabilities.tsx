import { Lock, DollarSign, RefreshCw, ShieldCheck, BarChart3, Globe } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

const capabilities = [
  { icon: Lock, title: "Recipient Safety Check", desc: "Guardian agent verifies the recipient address before any funds are released" },
  { icon: DollarSign, title: "USD → MXN Remittance", desc: "Send dollars from the US; pesos land in a Mexican bank account via SPEI" },
  { icon: RefreshCw, title: "Arbitrum + Base Settlement", desc: "USDC settles on whichever L2 offers the cheapest gas at transfer time" },
  { icon: ShieldCheck, title: "6-Layer Safety Stack", desc: "Policy, anomaly detection, risk engine, consensus, veto, and de-escalation guard" },
  { icon: BarChart3, title: "8-Stage Pipeline", desc: "Every transfer passes through a deterministic 8-stage transaction pipeline" },
  { icon: Globe, title: "Bitso Off-Ramp", desc: "MXN delivered straight to any SPEI-enabled Mexican bank — no crypto wallet needed on the receiving end" },
];

export default function Capabilities() {
  return (
    <section className="py-24 md:py-32" style={{ background: "#0A0A0B", borderTop: "1px solid rgba(255,78,0,0.06)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-1 h-8 rounded-full" style={{ background: "#FF4E00" }} />
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-white text-balance">
              Capabilities
            </h2>
          </div>
          <p className="mb-14 max-w-xl" style={{ color: "hsl(240 5% 50%)" }}>
            Everything an autonomous remittance agent needs to move money from the US to Mexico.
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map((cap, i) => (
            <ScrollReveal key={cap.title} delay={i * 80}>
              <div
                className="rounded-xl p-5 transition-all duration-300 active:scale-[0.98] hover:shadow-[0_4px_20px_rgba(255,78,0,0.15)]"
                style={{
                  background: "rgba(255,78,0,0.03)",
                  border: "1px solid rgba(255,78,0,0.1)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,78,0,0.25)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,78,0,0.1)"; }}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: "rgba(255,78,0,0.06)",
                      border: "1px solid rgba(255,78,0,0.12)",
                    }}
                  >
                    <cap.icon className="h-4 w-4" strokeWidth={1.5} style={{ color: "#FF4E00" }} />
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-semibold mb-1 text-white">{cap.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "hsl(240 5% 50%)" }}>{cap.desc}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

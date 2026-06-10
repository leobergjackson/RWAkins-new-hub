import CountUp from "@/components/shared/CountUp";
import ScrollReveal from "@/components/shared/ScrollReveal";

const metrics = [
  { value: 1183, label: "passing tests" },
  { value: 90, label: "sec settlement" },
  { value: 2, label: "L2 networks" },
  { value: 8, label: "pipeline stages" },
  { value: 4, label: "AI agents" },
];

export default function MetricsRibbon() {
  return (
    <div style={{ background: "#0A0A0B" }}>
      <ScrollReveal>
        <div
          className="border-y"
          style={{
            borderColor: "rgba(255,78,0,0.08)",
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-wrap items-center justify-center gap-x-0 gap-y-6">
            {metrics.map((m, i) => (
              <div key={m.label} className="flex flex-col items-center px-8">
                <CountUp
                  target={m.value}
                  className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight text-primary"
                />
                <span className="text-xs mt-1" style={{ color: "hsl(240 5% 45%)" }}>
                  {m.label}
                </span>
                {i < metrics.length - 1 && (
                  <div className="hidden" />
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

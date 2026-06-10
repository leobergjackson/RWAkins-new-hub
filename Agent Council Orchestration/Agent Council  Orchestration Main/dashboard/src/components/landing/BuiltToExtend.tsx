import ScrollReveal from "@/components/shared/ScrollReveal";
import CopyButton from "@/components/shared/CopyButton";

const codeBlocks = [
  { label: "Install", code: "git clone https://github.com/agdanish/ETHMexico.git" },
  { label: "Try", code: "cd ETHMexico && npm run dev" },
  { label: "Build", code: `curl "localhost:3001/api/remittance/quote?usd=200"` },
];

export default function BuiltToExtend() {
  return (
    <section
      className="py-24 md:py-32"
      style={{ background: "#0A0A0B", borderTop: "1px solid rgba(255,78,0,0.06)" }}
    >
      <div className="max-w-5xl mx-auto px-6">
        <ScrollReveal>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-1 h-8 rounded-full" style={{ background: "#FF4E00" }} />
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-white text-balance">
              SDK-First Platform
            </h2>
          </div>
          <p className="mb-12 max-w-xl" style={{ color: "hsl(240 5% 50%)" }}>
            Colibrí is an SDK-first platform. Install it. Import it. Build USD→MXN remittances into any app.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-4">
          {codeBlocks.map((block, i) => (
            <ScrollReveal key={block.label} delay={i * 100}>
              <div
                className="rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_4px_20px_rgba(255,78,0,0.15)]"
                style={{
                  background: "rgba(255,78,0,0.03)",
                  border: "1px solid rgba(255,78,0,0.1)",
                }}
              >
                {/* Terminal header */}
                <div
                  className="px-4 py-2.5 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgba(255,78,0,0.08)" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#FF5F57" }} />
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#28CA41" }} />
                    </div>
                    <span className="text-[11px] uppercase tracking-wider font-medium ml-2" style={{ color: "hsl(240 5% 40%)" }}>
                      {block.label}
                    </span>
                  </div>
                  <CopyButton text={block.code} />
                </div>
                <pre className="px-4 py-4 text-sm font-mono overflow-x-auto relative" style={{ color: "#FF4E00" }}>
                  <code>{block.code}</code>
                  <span
                    className="inline-block w-[7px] h-[14px] ml-0.5 align-middle"
                    style={{
                      background: "#50AF95",
                      animation: "blink-caret 1s step-end infinite",
                    }}
                  />
                </pre>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

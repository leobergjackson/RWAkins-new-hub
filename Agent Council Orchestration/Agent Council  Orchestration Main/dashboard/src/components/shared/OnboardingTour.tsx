import { useState, useEffect, useCallback } from "react";

const STEPS = [
  {
    target: "[data-tour='sidebar']",
    title: "Navigation",
    desc: "Navigate 39 pages of features",
  },
  {
    target: "[data-tour='pulse']",
    title: "Financial Pulse",
    desc: "Your wallet's state drives agent behavior",
  },
  {
    target: "[data-tour='mood']",
    title: "Agent Mood",
    desc: "The agent adapts: generous, cautious, or strategic",
  },
  {
    target: "[data-tour='cmdk']",
    title: "Quick Search",
    desc: "Press ⌘K to quickly navigate anywhere",
  },
  {
    target: "[data-tour='demo']",
    title: "Interactive Demo",
    desc: "Try the interactive demo — no terminal needed",
  },
];

export default function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("aerofyta-onboarded")) return;
    const t = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!show) return;
    const el = document.querySelector(STEPS[step]?.target);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [step, show]);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) {
      localStorage.setItem("aerofyta-onboarded", "true");
      setShow(false);
    } else {
      setStep((s) => s + 1);
    }
  }, [step]);

  const skip = useCallback(() => {
    localStorage.setItem("aerofyta-onboarded", "true");
    setShow(false);
  }, []);

  if (!show) return null;

  const pad = 8;

  return (
    <div className="fixed inset-0 z-[9000]">
      {/* Dark overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - pad}
                y={rect.top - pad}
                width={rect.width + pad * 2}
                height={rect.height + pad * 2}
                rx={8}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Spotlight border */}
      {rect && (
        <div
          className="absolute rounded-lg pointer-events-none"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            border: "2px solid rgba(255,78,0,0.5)",
            boxShadow: "0 0 20px rgba(255,78,0,0.2)",
          }}
        />
      )}

      {/* Tooltip card */}
      {rect && (
        <div
          className="absolute rounded-xl p-4 shadow-2xl animate-fade-in"
          style={{
            left: Math.min(rect.left, window.innerWidth - 300),
            top: rect.bottom + pad + 12,
            width: 280,
            background: "hsl(240 5% 10%)",
            border: "1px solid rgba(255,78,0,0.2)",
          }}
        >
          <div className="text-[10px] text-muted-foreground mb-1 font-mono">
            {step + 1}/{STEPS.length}
          </div>
          <h3 className="font-heading text-sm font-semibold text-white mb-1">
            {STEPS[step].title}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">{STEPS[step].desc}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={skip}
              className="text-xs text-muted-foreground hover:text-white transition-colors"
            >
              Skip tour
            </button>
            <button
              onClick={next}
              className="text-xs font-medium px-4 py-1.5 rounded-md transition-all active:scale-[0.95]"
              style={{ background: "#FF4E00", color: "white" }}
            >
              {step === STEPS.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Terminal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TITLE = "Colibrí";

export default function Hero() {
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(TITLE.slice(0, i));
      if (i >= TITLE.length) {
        clearInterval(iv);
        setTimeout(() => setShowSubtitle(true), 300);
        setTimeout(() => setShowButtons(true), 700);
      }
    }, 110);
    return () => clearInterval(iv);
  }, []);

  const handleMouse = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
  }, []);

  const orbs = useMemo(() => [
    { size: 500, x: "15%", y: "20%", dur: "25s", delay: "0s" },
    { size: 350, x: "70%", y: "60%", dur: "30s", delay: "-8s" },
    { size: 420, x: "50%", y: "30%", dur: "22s", delay: "-14s" },
    { size: 280, x: "80%", y: "15%", dur: "28s", delay: "-5s" },
  ], []);

  const copyInstall = async () => {
    await navigator.clipboard.writeText("git clone https://github.com/agdanish/ETHMexico.git");
    toast.success("Copied to clipboard");
  };

  const cursorVisible = typed.length < TITLE.length;

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "#0A0A0B" }}
      onMouseMove={handleMouse}
    >
      {/* Scan-line CRT effect */}
      <div className="absolute inset-0 pointer-events-none z-20" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)",
        animation: "scanlines 8s linear infinite",
      }} />

      {/* Hex grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23FF4E00' fill-opacity='0.03'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        opacity: 0.5,
      }} />

      {/* Grid dots */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, rgba(255,78,0,0.05) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        animation: "grid-pulse 8s ease-in-out infinite",
      }} />

      {/* Floating orbs */}
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: "radial-gradient(circle, rgba(255,78,0,0.08) 0%, rgba(255,78,0,0.02) 40%, transparent 70%)",
            filter: "blur(60px)",
            animation: `orb-drift ${orb.dur} ease-in-out infinite`,
            animationDelay: orb.delay,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Mouse-following gradient */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600,
          height: 600,
          left: `${mousePos.x * 100}%`,
          top: `${mousePos.y * 100}%`,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(255,78,0,0.06) 0%, transparent 60%)",
          transition: "left 0.3s ease-out, top 0.3s ease-out",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
        {/* Logo above title */}
        <div className="flex justify-center mb-6 relative">
          {/* Pulsing glow behind logo */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 300,
              height: 300,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, rgba(255,78,0,0.15) 0%, transparent 70%)",
              animation: "logo-glow-pulse 2s ease-in-out infinite",
            }}
          />
          <img
            src="/logo-orange.png"
            alt="Colibrí"
            className="h-48 w-auto relative z-10"
            style={{
              filter: "drop-shadow(0 0 30px rgba(255,78,0,0.4))",
              animation: "logo-entry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both, logo-float 3s ease-in-out 0.8s infinite",
            }}
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
              svg.setAttribute("viewBox", "0 0 32 32");
              svg.setAttribute("width", "192");
              svg.setAttribute("height", "192");
              svg.style.filter = "drop-shadow(0 0 30px rgba(255,78,0,0.4))";
              svg.style.animation = "logo-entry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both, logo-float 3s ease-in-out 0.8s infinite";
              svg.innerHTML = `<path d="M6 22c2-4 6-7 11-8l-3-5c6 1 11 5 13 10-3-2-7-3-10-2 1 2 1 5-1 7-2-3-6-4-10-2z" fill="#FF4E00" stroke="#FF4E00" stroke-width="0.5" stroke-linejoin="round"/>`;
              el.parentElement?.appendChild(svg);
            }}
          />
        </div>

        <h1
          className="font-heading text-7xl sm:text-8xl md:text-[100px] font-bold mb-6 text-white overflow-visible"
          style={{
            lineHeight: "1.3",
            paddingBottom: "0.1em",
            letterSpacing: "0.05em",
            textShadow: "0 0 40px rgba(255,78,0,0.3), 0 0 80px rgba(255,78,0,0.1)",
            backgroundImage: "linear-gradient(90deg, #FF4E00, #ffffff, #FF4E00)",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "hero-text-shimmer 8s ease-in-out infinite",
          }}
        >
          {typed}
          {cursorVisible && (
            <span
              className="inline-block align-middle"
              style={{
                width: 0,
                height: "0.75em",
                borderRight: "2px solid #FF4E00",
                marginLeft: "2px",
                animation: "blink-caret 0.8s step-end infinite",
              }}
            />
          )}
        </h1>

        <p
          className="text-lg md:text-xl mb-12 text-balance transition-all duration-700"
          style={{
            color: "hsl(240 5% 50%)",
            opacity: showSubtitle ? 1 : 0,
            transform: showSubtitle ? "translateY(0)" : "translateY(12px)",
            filter: showSubtitle ? "blur(0)" : "blur(4px)",
          }}
        >
          Send money home. Your AI agent finds the cheapest route and settles in seconds.
        </p>

        <div
          className="flex items-center justify-center gap-4 flex-wrap transition-all duration-700"
          style={{
            opacity: showButtons ? 1 : 0,
            transform: showButtons ? "translateY(0)" : "translateY(16px)",
            filter: showButtons ? "blur(0)" : "blur(4px)",
          }}
        >
          <Button
            onClick={() => navigate("/send")}
            className="h-12 px-8 text-sm font-medium bg-primary hover:bg-primary/90 active:scale-[0.97] transition-all"
            style={{ boxShadow: "0 0 24px rgba(255,78,0,0.3)" }}
          >
            Send money home
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={copyInstall}
            className="h-12 px-6 text-sm font-mono border-[rgba(255,78,0,0.2)] text-[hsl(240,5%,70%)] hover:border-[rgba(255,78,0,0.4)] hover:bg-[rgba(255,78,0,0.05)] active:scale-[0.97] transition-all bg-transparent"
          >
            <Terminal className="mr-2 h-4 w-4" style={{ color: "#C6B6B1" }} />
            git clone https://github.com/agdanish/ETHMexico.git
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{
        animation: "bounce-chevron 2s ease-in-out infinite",
        opacity: showButtons ? 0.4 : 0,
        transition: "opacity 0.5s",
      }}>
        <ChevronDown className="h-6 w-6 text-white/40" />
      </div>
    </section>
  );
}

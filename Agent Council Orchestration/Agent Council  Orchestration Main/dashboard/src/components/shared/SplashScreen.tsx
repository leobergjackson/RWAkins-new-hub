import { useState, useEffect } from "react";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const duration = 2000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (elapsed < duration) {
        requestAnimationFrame(tick);
      } else {
        setFadeOut(true);
        setTimeout(onDone, 400);
      }
    };
    requestAnimationFrame(tick);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: "#0A0A0B",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.4s ease",
      }}
    >
      <svg viewBox="0 0 32 32" width="64" height="64" className="animate-fade-in mb-6">
        <path
          d="M6 22c2-4 6-7 11-8l-3-5c6 1 11 5 13 10-3-2-7-3-10-2 1 2 1 5-1 7-2-3-6-4-10-2z"
          fill="#FF4E00"
          stroke="#FF4E00"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </svg>
      <h1
        className="font-heading text-2xl font-bold text-white mb-8 animate-fade-in"
        style={{ animationDelay: "0.5s", animationFillMode: "both" }}
      >
        Colibrí
      </h1>
      <div className="w-48 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,78,0,0.15)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: "#FF4E00",
            transition: "width 0.05s linear",
          }}
        />
      </div>
    </div>
  );
}

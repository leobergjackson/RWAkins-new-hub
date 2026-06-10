import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

const SHORTCUTS = [
  { keys: ["⌘", "K"], desc: "Command palette" },
  { keys: ["?"], desc: "This help menu" },
  { keys: ["G", "D"], desc: "Go to Dashboard" },
  { keys: ["G", "W"], desc: "Go to Wallets" },
  { keys: ["G", "C"], desc: "Go to Creators" },
  { keys: ["G", "T"], desc: "Go to Tips" },
  { keys: ["G", "E"], desc: "Go to Escrow" },
  { keys: ["G", "R"], desc: "Go to Reasoning" },
  { keys: ["G", "M"], desc: "Go to Demo" },
  { keys: ["G", "S"], desc: "Go to Security" },
  { keys: ["Esc"], desc: "Close any modal" },
];

const NAV_MAP: Record<string, string> = {
  d: "/dashboard", w: "/wallets", c: "/creators", t: "/tips",
  e: "/escrow", r: "/reasoning", m: "/demo", s: "/security",
};

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const gPending = useRef(false);
  const navigate = useNavigate();

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        setOpen(false);
        gPending.current = false;
        return;
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }

      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        gPending.current = true;
        setTimeout(() => { gPending.current = false; }, 800);
        return;
      }

      if (gPending.current && NAV_MAP[e.key]) {
        e.preventDefault();
        gPending.current = false;
        navigate(NAV_MAP[e.key]);
        return;
      }
    },
    [navigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative rounded-xl p-6 w-full max-w-lg animate-scale-in"
        style={{ background: "hsl(240 5% 8%)", border: "1px solid rgba(255,78,0,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-lg font-semibold text-white mb-5">Keyboard Shortcuts</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {SHORTCUTS.map((s) => (
            <div key={s.desc} className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(255,78,0,0.1)", border: "1px solid rgba(255,78,0,0.2)", color: "#FF4E00" }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-5 text-center">
          Press <kbd className="font-mono px-1 py-0.5 rounded text-[10px]" style={{ background: "rgba(255,78,0,0.08)" }}>Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}

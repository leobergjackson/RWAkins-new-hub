import { useState } from "react";
import { X } from "lucide-react";

export default function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem("colibri-banner-dismissed") === "true"
  );

  if (dismissed) return null;

  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 text-xs shrink-0"
      style={{
        background: "rgba(255,78,0,0.08)",
        borderBottom: "1px solid rgba(255,78,0,0.15)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ background: "hsl(var(--success))", animation: "status-pulse 2s ease-in-out infinite" }}
        />
        <span className="text-foreground/80">
          Built for <strong className="font-medium text-foreground">Ethereum Mexico 2026</strong>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground hidden sm:inline">USD→MXN · ~90s · ~$1.20</span>
        <button
          onClick={() => {
            localStorage.setItem("colibri-banner-dismissed", "true");
            setDismissed(true);
          }}
          className="text-muted-foreground hover:text-foreground transition-colors active:scale-[0.9]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

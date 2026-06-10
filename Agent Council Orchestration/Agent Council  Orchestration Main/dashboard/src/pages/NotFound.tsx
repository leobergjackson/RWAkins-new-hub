import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "hsl(var(--background))" }}>
      <div className="text-center animate-fade-in">
        <h1
          className="font-heading text-[120px] font-bold leading-none mb-4"
          style={{
            color: "#FF4E00",
            textShadow: "0 0 60px rgba(255,78,0,0.3), 0 0 120px rgba(255,78,0,0.1)",
          }}
        >
          404
        </h1>
        <p className="text-lg text-muted-foreground mb-8">Page not found</p>
        <Button
          onClick={() => navigate("/dashboard")}
          className="h-11 px-6 bg-primary hover:bg-primary/90 active:scale-[0.97] transition-all"
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground mt-6">
          Or press <kbd className="font-mono px-1.5 py-0.5 rounded text-[11px]" style={{ background: "rgba(255,78,0,0.1)", border: "1px solid rgba(255,78,0,0.2)", color: "#FF4E00" }}>⌘K</kbd> to search
        </p>
      </div>
    </div>
  );
}

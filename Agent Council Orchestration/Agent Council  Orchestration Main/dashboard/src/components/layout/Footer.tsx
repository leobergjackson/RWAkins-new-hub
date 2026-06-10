import { Github } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/40 py-4 px-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
    <span>Built on Arbitrum + Base</span>
    <span className="opacity-40">·</span>
    <span>USD → MXN via Bitso</span>
    <span className="opacity-40">·</span>
    <span>Apache 2.0</span>
    <span className="opacity-40">·</span>
    <a
      href="https://github.com/agdanish/ETHMexico"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      <Github className="h-3.5 w-3.5" />
    </a>
  </footer>
);

export default Footer;

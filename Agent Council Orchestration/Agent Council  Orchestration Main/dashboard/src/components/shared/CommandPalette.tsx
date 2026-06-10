import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  LayoutDashboard, Wallet, Users, Send, Lock, Brain,
  Play, Shield, CreditCard, TrendingUp, BarChart3,
  Gamepad2, Network, Hammer, CalendarDays, Plug, Home,
  BrainCircuit, Landmark, MonitorCheck, FileCheck, ShieldCheck,
  MessageSquare, Vote, Database, Award, CandlestickChart,
  Bell, Target, BookUser, Calculator, Store, KeyRound, Settings,
  Leaf, QrCode, ArrowLeftRight, Sparkles, Activity, FileText,
} from "lucide-react";

const pages = [
  { title: "Home", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Wallets", url: "/wallets", icon: Wallet },
  { title: "Creators", url: "/creators", icon: Users },
  { title: "Tips", url: "/tips", icon: Send },
  { title: "Escrow", url: "/escrow", icon: Lock },
  { title: "Reasoning", url: "/reasoning", icon: Brain },
  { title: "Demo", url: "/demo", icon: Play },
  { title: "Security", url: "/security", icon: Shield },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "DeFi", url: "/defi", icon: TrendingUp },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Playground", url: "/playground", icon: Gamepad2 },
  { title: "Architecture", url: "/architecture", icon: Network },
  { title: "Build", url: "/build", icon: Hammer },
  { title: "Timeline", url: "/timeline", icon: CalendarDays },
  { title: "Memory", url: "/memory", icon: BrainCircuit },
  { title: "Treasury", url: "/treasury", icon: Landmark },
  { title: "Monitoring", url: "/monitoring", icon: MonitorCheck },
  { title: "Compliance", url: "/compliance", icon: FileCheck },
  { title: "Privacy", url: "/privacy", icon: ShieldCheck },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Governance", url: "/governance", icon: Vote },
  { title: "Data Sources", url: "/data-sources", icon: Database },
  { title: "Reputation", url: "/reputation", icon: Award },
  { title: "Trading", url: "/trading", icon: CandlestickChart },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Contacts", url: "/contacts", icon: BookUser },
  { title: "Economics", url: "/economics", icon: Calculator },
  { title: "Marketplace", url: "/marketplace", icon: Store },
  { title: "MultiSig", url: "/multisig", icon: KeyRound },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Sustainability", url: "/sustainability", icon: Leaf },
  { title: "QR Codes", url: "/qr", icon: QrCode },
  { title: "Swarm", url: "/swarm", icon: Network },
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
  { title: "Engagement", url: "/engagement", icon: Sparkles },
  { title: "Status", url: "/status", icon: Activity },
  { title: "Changelog", url: "/changelog", icon: FileText },
  { title: "API Explorer", url: "/explorer", icon: Plug },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages… (⌘K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {pages.map((page) => (
            <CommandItem
              key={page.url}
              onSelect={() => {
                navigate(page.url);
                setOpen(false);
              }}
            >
              <page.icon className="mr-3 h-4 w-4 text-muted-foreground" />
              {page.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

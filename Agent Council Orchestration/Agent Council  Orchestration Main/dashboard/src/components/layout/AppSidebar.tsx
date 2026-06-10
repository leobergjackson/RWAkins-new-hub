import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, Wallet, Users, Send, Lock, Brain,
  Play, Shield, CreditCard, TrendingUp, BarChart3,
  Gamepad2, Network, Hammer, CalendarDays, Plug,
  BrainCircuit, Landmark, MonitorCheck, FileCheck, ShieldCheck,
  MessageSquare, Vote, Database, Award, CandlestickChart,
  Bell, Target, BookUser, Calculator, Store, KeyRound, Settings,
  Leaf, QrCode, ArrowLeftRight, Sparkles, Activity, FileText,
  ClipboardCheck, GitMerge, PieChart, Fuel, MessagesSquare, UsersRound,
  BadgeCheck, Clapperboard, FlaskConical, Globe, Gauge,
  Code2, Zap, Trophy, ShieldAlert,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Remittance",
    items: [
      { title: "Send Money Home", url: "/send", icon: Send },
    ],
  },
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Notifications", url: "/notifications", icon: Bell },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Wallets", url: "/wallets", icon: Wallet },
      { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
      { title: "Escrow", url: "/escrow", icon: Lock },
      { title: "Payments", url: "/payments", icon: CreditCard },
      { title: "QR Codes", url: "/qr", icon: QrCode },
      { title: "Treasury", url: "/treasury", icon: Landmark },
      { title: "Economics", url: "/economics", icon: Calculator },
      { title: "Portfolio Analytics", url: "/portfolio-analytics", icon: PieChart },
      { title: "Economic Simulator", url: "/economic-simulator", icon: FlaskConical },
      { title: "Chain Explorer", url: "/chain-explorer", icon: Globe },
    ],
  },
  {
    label: "DeFi & Trading",
    items: [
      { title: "DeFi", url: "/defi", icon: TrendingUp },
      { title: "Fee Comparison", url: "/fee-comparison", icon: Fuel },
      { title: "Trading", url: "/trading", icon: CandlestickChart },
      { title: "MultiSig", url: "/multisig", icon: KeyRound },
      { title: "Gasless Demo", url: "/gasless-demo", icon: Zap },
    ],
  },
  {
    label: "Recipients",
    items: [
      { title: "Beneficiaries", url: "/contacts", icon: BookUser },
      { title: "Data Sources", url: "/data-sources", icon: Database },
    ],
  },
  {
    label: "AI & Agent",
    items: [
      { title: "Wallet Brain", url: "/wallet-brain", icon: BrainCircuit },
      { title: "Agent Dialogue", url: "/agent-dialogue", icon: MessagesSquare },
      { title: "Reasoning Replay", url: "/reasoning-replay", icon: Clapperboard },
      { title: "Agent Performance", url: "/agent-performance", icon: Gauge },
      { title: "Reasoning", url: "/reasoning", icon: Brain },
      { title: "Memory", url: "/memory", icon: BrainCircuit },
      { title: "Chat", url: "/chat", icon: MessageSquare },
      { title: "Swarm", url: "/swarm", icon: Network },
      { title: "Governance", url: "/governance", icon: Vote },
      { title: "Goals", url: "/goals", icon: Target },
    ],
  },
  {
    label: "Security & Compliance",
    items: [
      { title: "Security", url: "/security", icon: Shield },
      { title: "Privacy", url: "/privacy", icon: ShieldCheck },
      { title: "Monitoring", url: "/monitoring", icon: MonitorCheck },
      { title: "Compliance", url: "/compliance", icon: FileCheck },
      { title: "Audit Trail", url: "/audit-trail", icon: ClipboardCheck },
      { title: "Risk Dashboard", url: "/risk-dashboard", icon: ShieldAlert },
      { title: "Sustainability", url: "/sustainability", icon: Leaf },
    ],
  },
  {
    label: "Platform",
    items: [
      { title: "Live Proof", url: "/live-proof", icon: BadgeCheck },
      { title: "Demo", url: "/demo", icon: Play },
      { title: "Playground", url: "/playground", icon: Gamepad2 },
      { title: "API Playground", url: "/api-playground", icon: Code2 },
      { title: "Marketplace", url: "/marketplace", icon: Store },
      { title: "Architecture", url: "/architecture", icon: Network },
      { title: "Build", url: "/build", icon: Hammer },
      { title: "Timeline", url: "/timeline", icon: CalendarDays },
      { title: "Settings", url: "/settings", icon: Settings },
      { title: "Status", url: "/status", icon: Activity },
      { title: "Changelog", url: "/changelog", icon: FileText },
      { title: "Explorer", url: "/explorer", icon: Plug },
    ],
  },
];

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar" data-tour="sidebar">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border shrink-0 gap-2">
        <img
          src="/logo-orange.png"
          alt="Colibrí"
          className="h-8 w-8 shrink-0"
          onError={(e) => {
            const parent = e.currentTarget.parentElement;
            if (!parent) return;
            e.currentTarget.style.display = "none";
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 32 32");
            svg.setAttribute("width", "32");
            svg.setAttribute("height", "32");
            svg.setAttribute("class", "shrink-0");
            svg.innerHTML = `<path d="M6 22c2-4 6-7 11-8l-3-5c6 1 11 5 13 10-3-2-7-3-10-2 1 2 1 5-1 7-2-3-6-4-10-2z" fill="#FF4E00" stroke="#FF4E00" stroke-width="0.5" stroke-linejoin="round"/>`;
            parent.insertBefore(svg, parent.children[0]);
          }}
        />
        {!collapsed && (
          <span className="font-heading font-semibold text-sm text-foreground tracking-tight leading-none">Colibrí</span>
        )}
      </div>

      <SidebarContent className="pt-1">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium px-3 mb-0.5">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  const isDemoItem = item.url === "/demo";

                  const linkContent = (
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
                        activeClassName="!bg-primary/8 font-medium"
                        {...(isDemoItem ? { "data-tour": "demo" } : {})}
                      >
                        <item.icon
                          className="h-4 w-4 shrink-0"
                          strokeWidth={1.5}
                          style={{ color: isActive ? "#FF4E00" : "#C6B6B1" }}
                        />
                        {!collapsed && (
                          <span style={{ color: isActive ? "#FF4E00" : undefined }}>
                            {item.title}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  );

                  return (
                    <SidebarMenuItem key={item.title}>
                      {collapsed ? (
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        linkContent
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="text-[11px] text-muted-foreground font-mono space-y-0.5">
            <div>Colibrí · remittance agent</div>
            <div className="text-muted-foreground/60">USD → MXN · Arbitrum + Base</div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

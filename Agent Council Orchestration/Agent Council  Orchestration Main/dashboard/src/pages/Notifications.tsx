import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, SendHorizontal, Lock, ShieldCheck, Monitor, CheckCheck, X } from "lucide-react";
import { type LucideIcon } from "lucide-react";

interface Notification {
  id: number;
  type: "transfer" | "escrow" | "security" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const typeIcons: Record<string, LucideIcon> = {
  transfer: SendHorizontal,
  escrow: Lock,
  security: ShieldCheck,
  system: Monitor,
};

const initialNotifications: Notification[] = [
  { id: 1, type: "transfer", title: "Transfer Sent", message: "50 USDC transferred to María García on Base", time: "2m ago", read: false },
  { id: 2, type: "security", title: "Threat Blocked", message: "Anomaly score 0.92 on tx from 0xdead...beef", time: "5m ago", read: false },
  { id: 3, type: "escrow", title: "Escrow Created", message: "Escrow E-0048: 50 USDC with 2h timelock", time: "12m ago", read: false },
  { id: 4, type: "system", title: "Rebalance Complete", message: "USDC rebalanced across Arbitrum + Base: liquidity 85%", time: "18m ago", read: true },
  { id: 5, type: "transfer", title: "Transfer Sent", message: "75 USDC transferred to Luis Hernández on Arbitrum", time: "25m ago", read: true },
  { id: 6, type: "security", title: "Guardian Review", message: "Guardian approved transfer to Rosa Martínez", time: "32m ago", read: true },
  { id: 7, type: "escrow", title: "Escrow Claimed", message: "Escrow E-0045 claimed by Carlos Ruiz", time: "45m ago", read: true },
  { id: 8, type: "system", title: "FX Rate Updated", message: "1 USD = 17.82 MXN via Bitso oracle", time: "1h ago", read: true },
  { id: 9, type: "transfer", title: "Transfer Failed", message: "Insufficient USDC for transfer to new beneficiary", time: "1h ago", read: true },
  { id: 10, type: "system", title: "Cycle Complete", message: "Agent cycle #1834 completed in 2.3s", time: "2h ago", read: true },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [tab, setTab] = useState("all");

  const filtered = tab === "all" ? notifications : notifications.filter((n) => n.type === tab);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  const dismiss = (id: number) => setNotifications((ns) => ns.filter((n) => n.id !== id));

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alert Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time notifications from agent activity.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />Mark all read
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary/50 mb-6">
          <TabsTrigger value="all">All {unreadCount > 0 && <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[9px] bg-primary text-primary-foreground">{unreadCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="transfer">Transfers</TabsTrigger>
          <TabsTrigger value="escrow">Escrow</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <div className="rounded-xl border border-border/50 bg-card/50">
            <ScrollArea className="h-[520px]">
              <div className="divide-y divide-border/20">
                {filtered.length === 0 && (
                  <div className="p-12 text-center text-sm text-muted-foreground">No notifications in this category.</div>
                )}
                {filtered.map((n) => {
                  const Icon = typeIcons[n.type] || Bell;
                  return (
                    <div key={n.id} className={`px-5 py-4 flex items-start gap-3 hover:bg-accent/30 transition-colors ${!n.read ? "bg-accent/10" : ""}`}>
                      <Icon className="h-5 w-5 mt-0.5 shrink-0" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                          <span className="text-sm font-medium">{n.title}</span>
                          <Badge variant="outline" className="text-[9px]">{n.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{n.message}</p>
                        <span className="text-[10px] text-muted-foreground/60 mt-0.5 block">{n.time}</span>
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => dismiss(n.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

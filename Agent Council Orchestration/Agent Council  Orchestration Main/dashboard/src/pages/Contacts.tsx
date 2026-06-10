import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookUser, Plus, Copy, Download, Upload, Search } from "lucide-react";
import { toast } from "sonner";
import CopyButton from "@/components/shared/CopyButton";

const initialContacts = [
  { id: 1, name: "María García", address: "0x7a3B...f82d", chain: "Base", tags: ["recipient", "diamond"], tips: 47, group: "Recipients" },
  { id: 2, name: "Luis Hernández", address: "0x1cE4...a91b", chain: "Arbitrum", tags: ["recipient", "platinum"], tips: 23, group: "Recipients" },
  { id: 3, name: "Rosa Martínez", address: "0xBv...x4Rq", chain: "Base", tags: ["recipient", "gold"], tips: 18, group: "Recipients" },
  { id: 4, name: "Carlos López", address: "0x9fD2...c34e", chain: "Arbitrum", tags: ["recipient"], tips: 12, group: "Recipients" },
  { id: 5, name: "Treasury Vault", address: "0x4bA8...d67f", chain: "Arbitrum", tags: ["internal"], tips: 0, group: "Internal" },
  { id: 6, name: "Yield Reserve", address: "0x2eC1...b45a", chain: "Base", tags: ["internal", "yield"], tips: 0, group: "Internal" },
  { id: 7, name: "Bitso Hot Wallet", address: "0x8dF3...e92c", chain: "Arbitrum", tags: ["exchange"], tips: 0, group: "Exchanges" },
];

const chainBadge = (c: string) => {
  if (c === "Arbitrum") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (c === "Base") return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  if (c === "Ethereum") return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
  if (c === "Solana") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
};

export default function Contacts() {
  const [contacts] = useState(initialContacts);
  const [search, setSearch] = useState("");
  const [ensInput, setEnsInput] = useState("");

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.address.toLowerCase().includes(search.toLowerCase()) ||
    c.tags.some((t) => t.includes(search.toLowerCase()))
  );

  const groups = [...new Set(contacts.map((c) => c.group))];

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Address Book</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage contacts, resolve ENS names, and organize recipients.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toast.success("Contacts exported as JSON")}>
            <Download className="h-3 w-3 mr-1" />Export
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toast.info("Upload JSON or CSV to import contacts")}>
            <Upload className="h-3 w-3 mr-1" />Import
          </Button>
          <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90" onClick={() => toast.info("Add contact form coming soon")}>
            <Plus className="h-3 w-3 mr-1" />Add
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        {/* Contact List */}
        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="px-5 py-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts..." className="bg-transparent border-0 h-7 text-sm p-0 focus-visible:ring-0" />
            </div>
          </div>
          <ScrollArea className="h-[480px]">
            {groups.map((group) => {
              const groupContacts = filtered.filter((c) => c.group === group);
              if (groupContacts.length === 0) return null;
              return (
                <div key={group}>
                  <div className="px-5 py-2 bg-accent/20 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{group}</div>
                  <div className="divide-y divide-border/20">
                    {groupContacts.map((c) => (
                      <div key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-accent/30 transition-colors">
                        <div className="h-8 w-8 rounded-full bg-accent/40 flex items-center justify-center text-xs font-semibold">{c.name.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium">{c.name}</span>
                            <Badge variant="outline" className={`text-[9px] ${chainBadge(c.chain)}`}>{c.chain}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">{c.address}</span>
                            <CopyButton text={c.address} />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((t) => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
                        </div>
                        {c.tips > 0 && <span className="text-xs tabular-nums text-muted-foreground">{c.tips} transfers</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </div>

        {/* ENS + Stats */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold mb-3">ENS Resolution</h3>
            <Input value={ensInput} onChange={(e) => setEnsInput(e.target.value)} placeholder="vitalik.eth" className="bg-card border-border/50 text-xs mb-2" />
            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => { if (ensInput) toast.success(`Resolved: 0xd8dA...6045`); }}>
              <Search className="h-3 w-3 mr-1" />Resolve
            </Button>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold mb-3">Summary</h3>
            <div className="space-y-2">
              {[
                { label: "Total Contacts", value: "7" },
                { label: "Recipients", value: "4" },
                { label: "Networks", value: "2" },
                { label: "Total Transfers Sent", value: "100" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="text-xs font-medium tabular-nums">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

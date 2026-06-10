import { useState, useMemo } from "react";
import { demoApiSpec } from "@/lib/demo-data";
import JsonViewer from "@/components/shared/JsonViewer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Send, ChevronDown, Loader2, Menu } from "lucide-react";

type Endpoint = typeof demoApiSpec.endpoints[0];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PUT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
};

const timeColor = (ms: number) => ms < 200 ? "bg-emerald-500/15 text-emerald-400" : ms < 500 ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400";

function EndpointList({ search, setSearch, grouped, selected, selectEndpoint }: {
  search: string;
  setSearch: (v: string) => void;
  grouped: Record<string, Endpoint[]>;
  selected: Endpoint | null;
  selectEndpoint: (ep: Endpoint) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(grouped).map(([tag, endpoints]) => (
            <Collapsible key={tag} defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium hover:text-foreground transition-colors">
                {tag}
                <ChevronDown className="h-3 w-3" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0.5 mb-2">
                  {endpoints.map((ep) => (
                    <button
                      key={`${ep.method}-${ep.path}`}
                      onClick={() => selectEndpoint(ep)}
                      className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 text-xs transition-colors ${
                        selected?.path === ep.path && selected?.method === ep.method
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 font-mono ${methodColors[ep.method] || ""}`}>
                        {ep.method}
                      </Badge>
                      <span className="truncate font-mono">{ep.path}</span>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t border-border/40 px-3 py-2 text-[10px] text-muted-foreground/60">
        {Array.isArray(demoApiSpec?.endpoints) ? demoApiSpec.endpoints.length : 0} endpoints
      </div>
    </div>
  );
}

export default function Explorer() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Endpoint | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [bodyValue, setBodyValue] = useState("");
  const [response, setResponse] = useState<unknown>(null);
  const [responseTime, setResponseTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const safeEndpoints = Array.isArray(demoApiSpec?.endpoints) ? demoApiSpec.endpoints : [];

  const grouped = useMemo(() => {
    const filtered = safeEndpoints.filter(
      (e) =>
        e.path.toLowerCase().includes(search.toLowerCase()) ||
        e.summary.toLowerCase().includes(search.toLowerCase())
    );
    const groups: Record<string, Endpoint[]> = {};
    for (const ep of filtered) {
      (groups[ep.tag] = groups[ep.tag] || []).push(ep);
    }
    return groups;
  }, [search, safeEndpoints]);

  const selectEndpoint = (ep: Endpoint) => {
    setSelected(ep);
    setResponse(null);
    setResponseTime(0);
    setFormValues({});
    setBodyValue(ep.body ? JSON.stringify(ep.body, null, 2) : "");
    setMobileOpen(false);
  };

  const sendRequest = async () => {
    if (!selected) return;
    setLoading(true);
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 120 + Math.random() * 350));
    setResponseTime(Date.now() - start);
    setResponse(selected.response);
    setLoading(false);
  };

  const detailPanel = selected ? (
    <div className="rounded-xl border border-border/50 bg-card/50 p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <Badge variant="outline" className={`text-xs font-mono ${methodColors[selected.method] || ""}`}>
          {selected.method}
        </Badge>
        <code className="text-sm font-mono break-all">{selected.path}</code>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{selected.summary}</p>

      {/* Parameters */}
      {selected.params && selected.params.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Parameters</p>
          <div className="space-y-2">
            {selected.params.map((p: any) => (
              <div key={p.name} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <Label className="text-xs w-24 shrink-0">
                  {p.name}
                  {p.required && <span className="text-primary ml-0.5">*</span>}
                </Label>
                <Input
                  placeholder={p.description || p.type}
                  value={formValues[p.name] || ""}
                  onChange={(e) => setFormValues({ ...formValues, [p.name]: e.target.value })}
                  className="h-8 text-xs bg-background"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Body */}
      {selected.body && (
        <div className="mb-4">
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Request Body</p>
          <Textarea
            value={bodyValue}
            onChange={(e) => setBodyValue(e.target.value)}
            className="font-mono text-xs bg-background min-h-[100px]"
          />
        </div>
      )}

      {/* Send */}
      <Button onClick={sendRequest} disabled={loading} className="bg-primary hover:bg-primary/90 mb-5">
        {loading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-2" />}
        Send Request
      </Button>

      {/* Response */}
      {response && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30">200 OK</Badge>
            <Badge variant="outline" className={`text-[10px] ${timeColor(responseTime)}`}>
              {responseTime}ms
            </Badge>
          </div>
          <JsonViewer data={response} />
        </div>
      )}
    </div>
  ) : (
    <div className="rounded-xl border border-border/50 bg-card/30 flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center text-muted-foreground">
        <p className="text-sm mb-1">Select an endpoint to explore</p>
        <p className="text-xs text-muted-foreground/60">Or press ⌘K to search</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">603 API Endpoints</h1>
          <p className="text-sm text-muted-foreground mt-1">Interactive explorer with auto-generated forms.</p>
        </div>
        {/* Mobile endpoint list trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden">
              <Menu className="h-4 w-4 mr-2" />Endpoints
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-card border-border">
            <EndpointList search={search} setSearch={setSearch} grouped={grouped} selected={selected} selectEndpoint={selectEndpoint} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-4 min-h-[600px]">
        {/* Left panel: endpoint list — hidden on mobile */}
        <div className="w-72 shrink-0 rounded-xl border border-border/50 bg-card/50 overflow-hidden hidden lg:flex flex-col">
          <EndpointList search={search} setSearch={setSearch} grouped={grouped} selected={selected} selectEndpoint={selectEndpoint} />
        </div>

        {/* Right panel: details */}
        <div className="flex-1 min-w-0">
          {detailPanel}
        </div>
      </div>
    </div>
  );
}

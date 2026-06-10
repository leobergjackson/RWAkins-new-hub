import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QrCode, Copy, Download, Link, Plus } from "lucide-react";
import { toast } from "sonner";

const qrHistory = [
  { id: 1, recipient: "0x7a3B...f82d", amount: "2.5 USDT", chain: "Ethereum", created: "2m ago" },
  { id: 2, recipient: "UQBv...x4Rq", amount: "1.0 USDT", chain: "TON", created: "15m ago" },
  { id: 3, recipient: "0x4bA8...d67f", amount: "5.0 USDT", chain: "Polygon", created: "1h ago" },
  { id: 4, recipient: "TVj3...9kLm", amount: "10 USDT", chain: "Tron", created: "3h ago" },
  { id: 5, recipient: "0x2eC1...b45a", amount: "0.5 USDT", chain: "Arbitrum", created: "5h ago" },
];

export default function QRCodes() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [token, setToken] = useState("USDT");
  const [memo, setMemo] = useState("");
  const [generated, setGenerated] = useState(false);

  const generate = () => {
    if (!recipient || !amount) { toast.error("Recipient and amount required"); return; }
    setGenerated(true);
    toast.success("QR code generated");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Payment QR Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate payment QR codes, shareable links, and batch codes.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 mb-6">
        {/* Form */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5">
          <h3 className="text-sm font-semibold mb-4">Generate QR Code</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Recipient Address</label>
              <Input value={recipient} onChange={(e) => { setRecipient(e.target.value); setGenerated(false); }} placeholder="0x..." className="bg-card border-border/50 text-sm font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                <Input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setGenerated(false); }} placeholder="0.00" className="bg-card border-border/50 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Token</label>
                <Select value={token} onValueChange={setToken}>
                  <SelectTrigger className="bg-card border-border/50 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="SOL">SOL</SelectItem>
                    <SelectItem value="TRX">TRX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Chain</label>
              <Select value={chain} onValueChange={setChain}>
                <SelectTrigger className="bg-card border-border/50 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="ton">TON</SelectItem>
                  <SelectItem value="tron">Tron</SelectItem>
                  <SelectItem value="solana">Solana</SelectItem>
                  <SelectItem value="arbitrum">Arbitrum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Memo (optional)</label>
              <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Payment for..." className="bg-card border-border/50 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={generate} className="flex-1 bg-primary hover:bg-primary/90">
                <QrCode className="h-4 w-4 mr-2" />Generate
              </Button>
              <Button variant="outline" onClick={() => toast.info("Batch generation: upload CSV with recipient,amount,chain columns")}>
                <Plus className="h-4 w-4 mr-1" />Batch
              </Button>
            </div>
          </div>
        </div>

        {/* QR Preview */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 flex flex-col items-center justify-center">
          {generated ? (
            <>
              {/* SVG QR Placeholder */}
              <div className="h-48 w-48 rounded-xl border border-border/40 bg-white p-3 mb-4 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full">
                  <rect width="100" height="100" fill="white"/>
                  {/* Simplified QR pattern */}
                  {[0,1,2,3,4,5,6].map(r => [0,1,2,3,4,5,6].map(c => {
                    if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
                      return <rect key={`tl-${r}-${c}`} x={5+r*4} y={5+r===0?5+c*4:5+c*4} width="3.5" height="3.5" fill="#1a1a1a"/>;
                    return null;
                  }))}
                  {Array.from({length: 60}, (_, i) => (
                    <rect key={i} x={5 + (Math.floor(Math.random()*22))*4} y={5 + (Math.floor(Math.random()*22))*4} width="3.5" height="3.5" fill={Math.random() > 0.5 ? "#1a1a1a" : "white"}/>
                  ))}
                </svg>
              </div>
              <p className="text-xs font-medium mb-1">{amount} {token}</p>
              <p className="text-[10px] font-mono text-muted-foreground mb-3">{recipient.slice(0, 12)}...</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.success("QR code copied")}>
                  <Copy className="h-3 w-3 mr-1" />Copy
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.success("QR code downloaded")}>
                  <Download className="h-3 w-3 mr-1" />Save
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.success("Payment link copied")}>
                  <Link className="h-3 w-3 mr-1" />Link
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <QrCode className="h-12 w-12 mx-auto mb-3" strokeWidth={1} style={{ color: "#C6B6B1" }} />
              <p className="text-sm text-muted-foreground">Fill in the form to generate a QR code</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="rounded-xl border border-border/50 bg-card/50">
        <div className="px-5 py-3 border-b border-border/40">
          <h3 className="text-sm font-semibold">QR History</h3>
        </div>
        <div className="divide-y divide-border/20">
          {qrHistory.map((q) => (
            <div key={q.id} className="px-5 py-3 flex items-center gap-3 hover:bg-accent/30 transition-colors">
              <QrCode className="h-5 w-5 shrink-0" strokeWidth={1.5} style={{ color: "#C6B6B1" }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono">{q.recipient}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium">{q.amount}</span>
                  <Badge variant="outline" className="text-[9px]">{q.chain}</Badge>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">{q.created}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

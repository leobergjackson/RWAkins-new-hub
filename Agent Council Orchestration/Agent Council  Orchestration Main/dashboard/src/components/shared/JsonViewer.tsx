import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: unknown;
  className?: string;
}

export default function JsonViewer({ data, className }: JsonViewerProps) {
  return (
    <pre className={cn("font-mono text-xs leading-relaxed overflow-auto p-4 rounded-lg bg-background border border-border/50", className)}>
      <JsonNode data={data} indent={0} />
    </pre>
  );
}

function JsonNode({ data, indent }: { data: unknown; indent: number }) {
  const pad = "  ".repeat(indent);
  const pad1 = "  ".repeat(indent + 1);

  if (data === null) return <span className="text-muted-foreground/60">null</span>;
  if (typeof data === "boolean") return <span className="text-blue-400">{String(data)}</span>;
  if (typeof data === "number") return <span className="text-primary">{data}</span>;
  if (typeof data === "string") return <span className="text-emerald-400">"{data}"</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span>{"[]"}</span>;
    return (
      <span>
        {"[\n"}
        {data.map((item, i) => (
          <span key={i}>
            {pad1}
            <JsonNode data={item} indent={indent + 1} />
            {i < data.length - 1 ? ",\n" : "\n"}
          </span>
        ))}
        {pad}{"]"}
      </span>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span>{"{}"}</span>;
    return (
      <span>
        {"{\n"}
        {entries.map(([key, val], i) => (
          <span key={key}>
            {pad1}
            <span className="text-muted-foreground">"{key}"</span>
            <span className="text-muted-foreground/60">{": "}</span>
            <JsonNode data={val} indent={indent + 1} />
            {i < entries.length - 1 ? ",\n" : "\n"}
          </span>
        ))}
        {pad}{"}"}
      </span>
    );
  }

  return <span>{String(data)}</span>;
}

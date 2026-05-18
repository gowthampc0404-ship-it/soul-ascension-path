import { useEffect, useRef, useState } from "react";

export interface LogEntry {
  ts: string;
  kind: "INFO" | "QUEST" | "LEVEL" | "WARN" | "SYS";
  text: string;
}

interface Props {
  external: LogEntry[];
}

const AMBIENT = [
  { kind: "SYS" as const, text: "Synchronizing dungeon timestamps..." },
  { kind: "SYS" as const, text: "Shadow soldiers patrolling perimeter." },
  { kind: "INFO" as const, text: "Mana flow nominal. Aegis core stable." },
  { kind: "SYS" as const, text: "Crystal matrix re-indexed." },
  { kind: "INFO" as const, text: "Hunter biorhythm: optimal." },
  { kind: "SYS" as const, text: "Background sensor stream: ACTIVE." },
];

const KIND_CLS: Record<LogEntry["kind"], string> = {
  INFO: "text-muted-foreground",
  QUEST: "neon-text",
  LEVEL: "cyan-text",
  WARN: "danger-text",
  SYS: "text-foreground/70",
};

function nowStamp() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

export function StatusLog({ external }: Props) {
  const [feed, setFeed] = useState<LogEntry[]>([
    { ts: nowStamp(), kind: "SYS", text: "AEGIS SYSTEM booted." },
    { ts: nowStamp(), kind: "INFO", text: "Connection to shadow realm established." },
  ]);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef<number>(0);

  // ambient ticker
  useEffect(() => {
    const id = setInterval(() => {
      const sample = AMBIENT[Math.floor(Math.random() * AMBIENT.length)];
      setFeed(prev => [...prev.slice(-40), { ts: nowStamp(), ...sample }]);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  // append external when new
  useEffect(() => {
    if (external.length <= seen.current) return;
    const fresh = external.slice(seen.current);
    seen.current = external.length;
    setFeed(prev => [...prev.slice(-40), ...fresh]);
  }, [external]);

  // autoscroll
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [feed]);

  return (
    <div className="glass-panel-cyan glass-panel angular-clip p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ STATUS LOG ]</div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest cyan-text">
          <span className="h-1.5 w-1.5 animate-pulse bg-[oklch(0.78_0.18_220)]" /> LIVE
        </div>
      </div>
      <div ref={ref} className="h-44 overflow-y-auto pr-1 font-mono text-[11px] leading-relaxed">
        {feed.map((e, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-muted-foreground/60">{e.ts}</span>
            <span className={`shrink-0 ${KIND_CLS[e.kind]}`}>[{e.kind}]</span>
            <span className={KIND_CLS[e.kind]}>{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

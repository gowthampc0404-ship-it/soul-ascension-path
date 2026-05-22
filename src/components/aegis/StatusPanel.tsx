import { rankForLevel, nextRankAt } from "@/lib/ranks";
import { Check, Pencil } from "lucide-react";
import { useState } from "react";

interface Props {
  hunterName: string;
  level: number;
  xp: number;
  streak: number;
  rank: string;
  onRename?: (name: string) => Promise<void> | void;
}

export function StatusPanel({ hunterName, level, xp, streak, rank, onRename }: Props) {
  const next = nextRankAt(level);
  const nextRank = next ? rankForLevel(next) : null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(hunterName || "HUNTER");

  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRename) return;
    await onRename(draft);
    setEditing(false);
  };

  return (
    <div className="glass-panel angular-clip relative p-5 sm:p-6 scanlines overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">[ STATUS ]</div>
          {editing ? (
            <form onSubmit={submitRename} className="mt-2 flex max-w-sm items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={32}
                autoFocus
                className="min-w-0 flex-1 border border-primary/40 bg-black/50 px-3 py-2 font-display text-sm uppercase tracking-wider neon-text outline-none focus:border-primary focus:shadow-[var(--glow-neon)]"
              />
              <button type="submit" aria-label="save hunter name" className="grid h-9 w-9 place-items-center border border-accent/60 bg-accent/15 cyan-text transition hover:bg-accent/30">
                <Check className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <h2 className="truncate font-display text-2xl neon-text sm:text-3xl">{hunterName?.toUpperCase() || "HUNTER"}</h2>
              {onRename && (
                <button onClick={() => { setDraft(hunterName || "HUNTER"); setEditing(true); }} aria-label="rename hunter" className="grid h-8 w-8 shrink-0 place-items-center border border-primary/30 text-muted-foreground transition hover:border-primary hover:neon-text">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="mt-1 text-xs uppercase tracking-widest text-accent cyan-text">{rank}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Level</div>
          <div className="font-display text-4xl neon-text sm:text-5xl">{level}</div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Stat label="EXP" value={`${xp} / 100`} pct={xp} color="neon" />
        <Stat label="STREAK" value={`${streak} DAY${streak === 1 ? "" : "S"}`} pct={Math.min(100, streak * 6.66)} color="cyan" />
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>NEXT TIER</span>
        <span className="text-foreground/80">{nextRank ? `${nextRank} · LV ${next}` : "APEX REACHED"}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, pct, color }: { label: string; value: string; pct: number; color: "neon" | "cyan" }) {
  const fill = color === "neon"
    ? "linear-gradient(90deg, oklch(0.55 0.25 290), oklch(0.78 0.22 290))"
    : "linear-gradient(90deg, oklch(0.6 0.2 220), oklch(0.85 0.18 210))";
  const shadow = color === "neon" ? "var(--glow-neon)" : "var(--glow-cyan)";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest">
        <span className="text-muted-foreground">{label}</span>
        <span className={color === "neon" ? "neon-text" : "cyan-text"}>{value}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden bg-secondary/60" style={{ clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 100%, 6px 100%)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: fill, boxShadow: shadow }}
        />
      </div>
    </div>
  );
}

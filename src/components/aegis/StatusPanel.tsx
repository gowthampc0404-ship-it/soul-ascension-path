import { rankForLevel, nextRankAt } from "@/lib/ranks";

interface Props {
  hunterName: string;
  level: number;
  xp: number;
  streak: number;
  rank: string;
}

export function StatusPanel({ hunterName, level, xp, streak, rank }: Props) {
  const next = nextRankAt(level);
  const nextRank = next ? rankForLevel(next) : null;
  return (
    <div className="glass-panel angular-clip relative p-5 sm:p-6 scanlines overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">[ STATUS ]</div>
          <h2 className="mt-1 font-display text-2xl neon-text sm:text-3xl">{hunterName?.toUpperCase() || "HUNTER"}</h2>
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

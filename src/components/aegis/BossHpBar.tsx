interface Props {
  completed: number;
  total: number;
}

export function BossHpBar({ completed, total }: Props) {
  const remaining = Math.max(0, total - completed);
  const pct = total === 0 ? 0 : (remaining / total) * 100;
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-1 flex items-end justify-between text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
        <span>SHADOW BOSS · DAILY DUNGEON</span>
        <span className="cyan-text">{remaining} / {total} HP</span>
      </div>
      <div className="relative h-5 w-full overflow-hidden border border-primary/40 bg-black/60"
        style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%)" }}>
        <div className="absolute inset-0 system-grid opacity-40" />
        <div
          className="hp-bar-fill relative h-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] animate-[border-scan_2s_linear_infinite] bg-[length:200%_100%]" />
        </div>
        {pct === 0 && total > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-xs neon-text">[ BOSS DEFEATED ]</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  data: { date: string; steps: number }[];
}

export function StepsChart({ data }: Props) {
  const max = Math.max(1000, ...data.map(d => d.steps));
  return (
    <div className="glass-panel-cyan glass-panel angular-clip p-5">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ TELEMETRY ]</div>
          <h3 className="font-display text-lg cyan-text">STEP CRYSTAL · 7 DAYS</h3>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">MAX {max.toLocaleString()}</div>
      </div>
      <div className="flex h-40 items-end gap-2">
        {data.map((d) => {
          const h = (d.steps / max) * 100;
          return (
            <div key={d.date} className="group flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className="w-full transition-all"
                  style={{
                    height: `${h}%`,
                    background: "linear-gradient(180deg, oklch(0.85 0.18 220), oklch(0.5 0.22 260))",
                    boxShadow: "0 0 12px oklch(0.78 0.18 220 / 0.6)",
                    clipPath: "polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)",
                  }}
                />
              </div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{d.date.slice(5)}</div>
              <div className="text-[10px] cyan-text">{d.steps}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

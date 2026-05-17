import { useEffect } from "react";

interface Props {
  open: boolean;
  oldRank: string;
  newRank: string;
  newLevel: number;
  onClose: () => void;
}

export function SystemWarningModal({ open, oldRank, newRank, newLevel, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 animate-flash-red" />
      <div className="glass-panel-red glass-panel angular-clip relative w-[92vw] max-w-lg p-6 animate-shake">
        <div className="text-[10px] uppercase tracking-[0.5em] danger-text">[ SYSTEM WARNING ]</div>
        <h2 className="mt-2 font-display text-2xl danger-text sm:text-3xl">RANK DEGRADATION</h2>
        <p className="mt-4 text-sm leading-relaxed text-foreground/85">
          Due to <span className="danger-text">7 days of extreme fatigue and inactivity</span>, your Rank has been degraded.
          The Shadow has lost its edge.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="border border-destructive/40 p-3 corner-clip">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">PREVIOUS</div>
            <div className="mt-1 font-display text-sm line-through opacity-70">{oldRank}</div>
          </div>
          <div className="border border-destructive/60 bg-destructive/10 p-3 corner-clip">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">CURRENT</div>
            <div className="mt-1 font-display text-sm danger-text">{newRank}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">LV {newLevel}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full border border-destructive/70 bg-destructive/20 px-4 py-3 font-display text-sm uppercase tracking-[0.4em] danger-text transition hover:bg-destructive/40 hover:shadow-[var(--glow-red)]"
        >
          ACCEPT PENALTY
        </button>
      </div>
    </div>
  );
}

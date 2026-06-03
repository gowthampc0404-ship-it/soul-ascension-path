import { useEffect, useState } from "react";
import shadowHunter from "@/assets/shadow-hunter.png";

interface Props {
  text: string;
  speedMs?: number;
  className?: string;
}

/** Typewriter dialogue box anchored to the shadow hunter portrait. */
export function HunterDialogue({ text, speedMs = 28, className = "" }: Props) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    const id = setInterval(() => {
      setShown(s => {
        if (s >= text.length) { clearInterval(id); return s; }
        return s + 1;
      });
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);

  return (
    <div className={`pointer-events-none flex items-end gap-3 ${className}`}>
      <img
        src={shadowHunter}
        alt="Shadow Hunter"
        width={280}
        height={280}
        className="relative h-64 w-auto select-none drop-shadow-[0_0_28px_oklch(0.55_0.2_290/0.7)] sm:h-80"
        style={{ animation: "breathe 5s ease-in-out infinite" }}
      />
      <div className="glass-panel angular-clip mb-6 max-w-md p-4 text-sm leading-relaxed text-foreground/90">
        <div className="text-[9px] uppercase tracking-[0.4em] cyan-text">[ SHADOW REGISTRY ]</div>
        <p className="mt-2 min-h-[5.5rem] font-sans">
          {text.slice(0, shown)}
          <span className="inline-block w-2 animate-pulse text-primary">▌</span>
        </p>
      </div>
    </div>
  );
}

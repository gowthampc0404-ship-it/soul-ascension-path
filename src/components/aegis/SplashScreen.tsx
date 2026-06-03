import { useEffect, useState } from "react";
import { VortexGrid } from "./VortexGrid";

interface Props { onDone: () => void }

/**
 * AEGIS SYSTEM splash. Holds for 2.5s then triggers a fullscreen vortex wipe.
 * onDone fires after the wipe completes (~3.2s total).
 */
export function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<"hold" | "wipe">("hold");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("wipe"), 2500);
    const t2 = setTimeout(() => onDone(), 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-black">
      <VortexGrid />
      <h1
        className="relative z-10 font-display text-5xl tracking-[0.25em] sm:text-7xl md:text-8xl"
        style={{
          color: "oklch(0.95 0.08 300)",
          textShadow:
            "0 0 18px oklch(0.65 0.27 300 / 0.95), 0 0 48px oklch(0.65 0.27 300 / 0.7), 0 0 120px oklch(0.65 0.27 300 / 0.45)",
          animation: "aegis-pulse 2.2s ease-in-out infinite",
        }}
      >
        AEGIS SYSTEM
      </h1>
      {/* vortex wipe overlay */}
      {phase === "wipe" && <div className="pointer-events-none absolute inset-0 z-20 animate-vortex-wipe" />}
    </div>
  );
}

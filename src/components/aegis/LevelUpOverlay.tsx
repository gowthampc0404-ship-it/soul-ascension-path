import { useEffect, useState } from "react";

interface Props {
  trigger: number;             // increments to fire
  newLevel: number;
  newRank: string;
  rankChanged: boolean;
}

export function LevelUpOverlay({ trigger, newLevel, newRank, rankChanged }: Props) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (trigger === 0) return;
    setActive(trigger);
    const t = setTimeout(() => setActive(0), 2400);
    return () => clearTimeout(t);
  }, [trigger]);
  if (active === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 animate-lightning bg-[radial-gradient(circle_at_50%_30%,oklch(0.85_0.18_220/0.35),transparent_55%),radial-gradient(circle_at_50%_70%,oklch(0.65_0.27_300/0.4),transparent_60%)]" />
      {/* Lightning grid */}
      <svg className="absolute inset-0 h-full w-full animate-lightning opacity-80" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <polyline
            key={i}
            points={`${100 + i * 110},0 ${120 + i * 110},250 ${80 + i * 110},520 ${140 + i * 110},760 ${100 + i * 110},1000`}
            fill="none" stroke="white" strokeWidth="1.4" opacity="0.7"
            style={{ filter: "drop-shadow(0 0 8px white) drop-shadow(0 0 18px oklch(0.78 0.18 220))" }}
          />
        ))}
      </svg>
      <div className="relative z-10 text-center animate-level-up">
        <div className="text-xs uppercase tracking-[0.6em] cyan-text">[ SYSTEM ]</div>
        <div className="font-display text-7xl font-black neon-text sm:text-8xl">LEVEL UP</div>
        <div className="mt-2 font-display text-2xl cyan-text">LV {newLevel}</div>
        {rankChanged && (
          <div className="mt-2 font-display text-lg uppercase tracking-[0.4em] danger-text" style={{ color: "oklch(0.92 0.07 290)", textShadow: "0 0 8px oklch(0.78 0.18 220), 0 0 24px oklch(0.65 0.27 300)" }}>
            ≫ RANK UP ≫ {newRank}
          </div>
        )}
      </div>
    </div>
  );
}

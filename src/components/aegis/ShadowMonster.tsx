import { useEffect, useState } from "react";

interface Props {
  slashKey: number;            // increments per attack
  damageText: string | null;   // floating text
}

export function ShadowMonster({ slashKey, damageText }: Props) {
  const [showSlash, setShowSlash] = useState(0);
  const [showDmg, setShowDmg] = useState<string | null>(null);

  useEffect(() => {
    if (slashKey === 0) return;
    setShowSlash(slashKey);
    setShowDmg(damageText);
    const t1 = setTimeout(() => setShowSlash(0), 600);
    const t2 = setTimeout(() => setShowDmg(null), 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [slashKey, damageText]);

  return (
    <div className="relative mx-auto flex h-[280px] w-[280px] items-center justify-center sm:h-[340px] sm:w-[340px]">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border border-primary/30 animate-pulse-glow" />
      <div className="absolute inset-4 rounded-full border border-primary/20" />
      <div className="absolute inset-8 rounded-full border border-accent/15" />

      {/* Shadow silhouette */}
      <div className="relative h-[78%] w-[78%] animate-breathe">
        <svg viewBox="0 0 200 220" className="absolute inset-0 h-full w-full drop-shadow-[0_0_30px_rgba(168,85,247,0.55)]">
          <defs>
            <radialGradient id="shadow-grad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="oklch(0.18 0.05 290)" />
              <stop offset="60%" stopColor="oklch(0.08 0.03 270)" />
              <stop offset="100%" stopColor="oklch(0.04 0.01 270)" />
            </radialGradient>
            <radialGradient id="eye-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.92 0.2 290)" />
              <stop offset="100%" stopColor="oklch(0.5 0.25 290 / 0)" />
            </radialGradient>
          </defs>
          {/* hooded humanoid silhouette */}
          <path
            d="M100 18 C 70 18 52 42 56 78 C 40 96 36 130 48 168 C 56 196 78 212 100 212 C 122 212 144 196 152 168 C 164 130 160 96 144 78 C 148 42 130 18 100 18 Z"
            fill="url(#shadow-grad)"
            stroke="oklch(0.55 0.2 290 / 0.45)"
            strokeWidth="1"
          />
          {/* glowing eyes */}
          <circle cx="84" cy="86" r="9" fill="url(#eye-grad)" />
          <circle cx="116" cy="86" r="9" fill="url(#eye-grad)" />
          <circle cx="84" cy="86" r="3" fill="oklch(0.95 0.2 290)" />
          <circle cx="116" cy="86" r="3" fill="oklch(0.95 0.2 290)" />
        </svg>
      </div>

      {/* Slash */}
      {showSlash > 0 && (
        <div key={showSlash} className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 h-[6px] w-[140%] -translate-x-1/2 -translate-y-1/2 animate-slash"
            style={{
              background:
                "linear-gradient(90deg, transparent, white 40%, oklch(0.92 0.18 290) 50%, white 60%, transparent)",
              boxShadow: "0 0 24px white, 0 0 48px oklch(0.78 0.18 220)",
              filter: "blur(0.4px)",
            }}
          />
        </div>
      )}

      {/* Damage text */}
      {showDmg && (
        <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 animate-damage">
          <span className="font-display text-2xl font-bold danger-text sm:text-3xl">{showDmg}</span>
        </div>
      )}
    </div>
  );
}

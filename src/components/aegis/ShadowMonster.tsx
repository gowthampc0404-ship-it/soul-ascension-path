import { useEffect, useState } from "react";

interface Props {
  slashKey: number;            // increments per attack
  damageText: string | null;   // floating text
  dimmed?: boolean;            // reduce aura when user inactive 7+ days
}

export function ShadowMonster({ slashKey, damageText, dimmed = false }: Props) {
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
    <div
      className="relative mx-auto flex h-[320px] w-[320px] items-center justify-center sm:h-[400px] sm:w-[400px] transition-opacity duration-700"
      style={{ opacity: dimmed ? 0.35 : 1, filter: dimmed ? "grayscale(0.6) brightness(0.6)" : undefined }}
    >
      {/* Deep ambient backdrop glow */}
      {!dimmed && (
        <div className="absolute inset-[-40px] rounded-full opacity-60"
          style={{
            background: "radial-gradient(circle, oklch(0.65 0.27 300 / 0.35) 0%, oklch(0.55 0.2 290 / 0.15) 35%, transparent 70%)",
            filter: "blur(24px)",
          }}
        />
      )}

      {/* Outer rotating energy ring */}
      {!dimmed && (
        <div className="absolute inset-[-12px] rounded-full border-2 border-dashed border-primary/20 animate-spin-slow" 
          style={{ animationDuration: "12s" }} 
        />
      )}

      {/* Concentric pulse rings */}
      <div className={`absolute inset-0 rounded-full border border-primary/30 ${dimmed ? "" : "animate-pulse-glow"}`} />
      <div className="absolute inset-3 rounded-full border border-primary/25" />
      <div className="absolute inset-6 rounded-full border border-accent/20" />
      <div className="absolute inset-10 rounded-full border border-primary/15" />

      {/* Inner hexagonal aura ring (rotating) */}
      {!dimmed && (
        <svg className="absolute inset-2 h-[calc(100%-16px)] w-[calc(100%-16px)] animate-spin-slow opacity-30" style={{ animationDuration: "18s", animationDirection: "reverse" }} viewBox="0 0 100 100">
          <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="none" stroke="oklch(0.65 0.27 300 / 0.45)" strokeWidth="0.5" />
        </svg>
      )}

      {/* Shadow silhouette with enhanced glow */}
      <div className={`relative h-[78%] w-[78%] ${dimmed ? "" : "animate-breathe"}`}>
        <svg viewBox="0 0 200 220" className="absolute inset-1 h-[96%] w-[96%]"
          style={{
            filter: dimmed 
              ? "drop-shadow(0 0 20px rgba(168,85,247,0.3))" 
              : "drop-shadow(0 0 30px rgba(168,85,247,0.6)) drop-shadow( 0 0 60px rgba(168,85,247, 0.35)) drop-shadow(0 0 100px rgba(168,85,247, 0.18))",
          }}
        >
          <defs>
            <radialGradient id="shadow-grad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="oklch(0.22 0.06 290)" />
              <stop offset="50%" stopColor="oklch(0.1 0.04 280)" />
              <stop offset="100%" stopColor="oklch(0.04 0.01 270)" />
            </radialGradient>
            <radialGradient id="eye-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.95 1.22 290)" />
              <stop offset="70%" stopColor="oklch(0.75 1.25 290)" />
              <stop offset="100%" stopColor="oklch(0.5 0.25 290 /  0)" />
            </radialGradient>
            <filter id="eye-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* hooded humanoid silhouette */}
          <path
            d="M100 18 C 70 18 52 42 56 78 C 40 96 36 130 48 168 C 56 196 78 212 100 212 C 122 212 144 196 152 168 C 164 130 160 96 144 78 C 148 42 130 18 100 18 Z"
            fill="url(#shadow-grad)"
            stroke="oklch(0.6 0.22 290 / 0.55)"
            strokeWidth="1.2"
          />
          {/* outer eye halos */}
          <circle cx="84" cy="86" r="14" fill="oklch(0.75 1.25 290 / 0.15)" filter="url(#eye-glow)" />
          <circle cx="116" cy="86" r="14" fill="oklch(0.75 1.25 290 / 0.15)" filter="url(#eye-glow)" />
          {/* glowing eyes */}
          <circle cx="84" cy="86" r="9" fill="url(#eye-grad)" filter="url(#eye-glow)" />
          <circle cx="116" cy="86" r="9" fill="url(#eye-grad)" filter="url(#eye-glow)" />
          {/* eye cores */}
          <circle cx="84" cy="86" r="3.5" fill="oklch(0.98 0.02 290)" />
          <circle cx="116" cy="86" r="3.5" fill="oklch(0.98 0.02 290)" />
          {/* eye spark */}
          <circle cx="85" cy="85" r="1" fill="white" />
          <circle cx="117" cy="85" r="1" fill="white" />
        </svg>
      </div>

      {/* Floating ember particles */}
      {!dimmed && (
        <>
          <div className="absolute left-[20%] top-[25%] h-1 w-1 rounded-full bg-primary/70 animate-ember-1" />
          <div className="absolute right-[18%] top-[32%] h-1.5 w-1.5 rounded-full bg-primary/60 animate-ember-2" />
          <div className="absolute left-[30%] bottom-[22%] h-1 w-1 rounded-full bg-accent/60 animate-ember-3" />
          <div className="absolute right-[28%] bottom-[28%] h-1 w-1 rounded-full bg-primary/50 animate-ember-4" />
          <div className="absolute left-[15%] top-[55%] h-0.5 w-0.5 rounded-full bg-primary/80 animate-ember-2" />
          <div className="absolute right-[22%] top-[48%] h-0.5 w-0.5 rounded-full bg-accent/70 animate-ember-1" />
        </>
      )}

      {/* Slash */}
      {showSlash > 0 && (
        <div key={showSlash} className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 h-[6px] w-[140%] -translate-x-1/2 -translate-y-1/2 animate-slash"
            style={{
              background:
                "linear-gradient(90deg, transparent, white 35%, oklch(0.92 0.18 290) 50%, white 65%, transparent)",
              boxShadow: "0 0 32px white, 0 0 64px oklch(0.78 0.18 220), 0 0 100px oklch(0.65 0.27 300)",
              filter: "blur(0.3px)",
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

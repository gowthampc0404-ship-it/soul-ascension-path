import { useEffect, useState } from "react";

interface Props { trigger: number; isMonarch: boolean; }

export function MidnightBanner({ trigger, isMonarch }: Props) {
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState("");
  const full = isMonarch
    ? "Dungeon Restored. New Quests Loaded. Welcome back, Master. Quests resolved."
    : "Dungeon Restored. New Quests Loaded. Arise, Hunter.";
  useEffect(() => {
    if (trigger === 0) return;
    setActive(trigger); setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i++; setTyped(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 26);
    const close = setTimeout(() => setActive(0), 5200);
    return () => { clearInterval(id); clearTimeout(close); };
  }, [trigger, full]);
  if (active === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4">
      <div className="glass-panel-cyan glass-panel angular-clip max-w-xl px-5 py-3 animate-fade-in-up">
        <div className="text-[10px] uppercase tracking-[0.5em] cyan-text">[ MIDNIGHT REFRESH ]</div>
        <div className="mt-1 font-mono text-sm text-foreground/90">
          {typed}<span className="ml-0.5 inline-block h-3 w-2 animate-pulse bg-[oklch(0.78_0.18_220)]" />
        </div>
      </div>
    </div>
  );
}

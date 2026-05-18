import { Link, useRouterState } from "@tanstack/react-router";
import { Swords, BarChart3 } from "lucide-react";

export function NavBar() {
  const { location } = useRouterState();
  const path = location.pathname;
  const tab = (to: string, label: string, icon: React.ReactNode) => {
    const active = path === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-1.5 border px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] transition ${
          active
            ? "border-primary bg-primary/15 neon-text shadow-[var(--glow-neon)]"
            : "border-primary/25 text-muted-foreground hover:border-primary/60"
        }`}
      >
        {icon}{label}
      </Link>
    );
  };
  return (
    <nav className="flex items-center gap-2">
      {tab("/", "QUEST CORE", <Swords className="h-3 w-3" />)}
      {tab("/dashboard", "CRYSTAL MATRIX", <BarChart3 className="h-3 w-3" />)}
    </nav>
  );
}

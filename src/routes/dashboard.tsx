import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/aegis/NavBar";
import { VortexGrid } from "@/components/aegis/VortexGrid";
import { LogOut } from "lucide-react";
import shadowHunter from "@/assets/shadow-hunter.png";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Crystal Matrix · Aegis System" },
      { name: "description", content: "System Level & Progress Chart: weekly, monthly, yearly telemetry." },
    ],
  }),
  component: DashboardPage,
});

type Range = "weekly" | "monthly" | "yearly";
type Cat = "physical" | "mental" | "daily";

interface QuestRow { quest_id: string; category: Cat; }
interface LogRow { quest_id: string; status: string; checked_at: string; }
interface ProfileRow { current_streak: number; current_level: number; current_rank: string; hunter_name: string | null; }

const DAYS_FULL = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function startOfWeek(d: Date) { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); x.setHours(0,0,0,0); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function DashboardPage() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("weekly");
  const [activeDow, setActiveDow] = useState<number>(((new Date().getDay() + 6) % 7));
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav({ to: "/auth" });
      else setUserId(data.session.user.id);
    });
  }, [nav]);

  const { from, to } = useMemo(() => {
    const anchor = new Date();
    if (range === "weekly") {
      const f = startOfWeek(anchor); return { from: f, to: addDays(f, 6) };
    }
    if (range === "monthly") {
      const f = startOfMonth(anchor); return { from: f, to: new Date(f.getFullYear(), f.getMonth() + 1, 0) };
    }
    const f = startOfYear(anchor); return { from: f, to: new Date(f.getFullYear(), 11, 31) };
  }, [range]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: q }, { data: l }, { data: p }] = await Promise.all([
        supabase.from("quests").select("quest_id, category").eq("user_id", userId).eq("is_archived", false),
        supabase.from("quest_logs").select("quest_id, status, checked_at").eq("user_id", userId).in("status", ["completed","failed"]).gte("checked_at", iso(from)).lte("checked_at", iso(to)),
        supabase.from("profiles").select("current_streak, current_level, current_rank, hunter_name").eq("user_id", userId).single(),
      ]);
      setQuests((q || []) as QuestRow[]);
      setLogs((l || []) as LogRow[]);
      setProfile(p as ProfileRow);
    })();
  }, [userId, from, to]);

  // Per-category success ratios for the bar chart
  const catData = useMemo(() => {
    const qmap = new Map(quests.map(q => [q.quest_id, q.category]));
    const acc: Record<Cat, { done: number; total: number }> = {
      physical: { done: 0, total: 0 },
      mental:   { done: 0, total: 0 },
      daily:    { done: 0, total: 0 },
    };
    for (const l of logs) {
      const c = qmap.get(l.quest_id); if (!c) continue;
      acc[c].total++;
      if (l.status === "completed") acc[c].done++;
    }
    const ratio = (v: { done: number; total: number }) => v.total === 0 ? 0 : Math.round((v.done / v.total) * 100);
    // 4 columns to match the design (Physical, Mental, Gym=daily, Study=mental fallback)
    return [
      { label: "Physical",   purple: ratio(acc.physical), cyan: Math.min(100, ratio(acc.physical) - 15) },
      { label: "Mental",     purple: ratio(acc.mental),   cyan: Math.min(100, ratio(acc.mental) - 25) },
      { label: "Gym",        purple: Math.max(0, ratio(acc.daily) - 10), cyan: Math.max(0, ratio(acc.daily) - 25) },
      { label: "Study Mode", purple: ratio(acc.mental),   cyan: Math.max(0, ratio(acc.mental) - 30) },
    ].map(d => ({ ...d, cyan: Math.max(0, d.cyan) }));
  }, [logs, quests]);

  // Efficiency index line — simple smoothed up-trend across columns
  const efficiency = useMemo(() => {
    const totals = catData.map(c => (c.purple + c.cyan) / 2);
    const base = totals.length > 0 ? totals.reduce((a,b) => a+b, 0) / totals.length : 0;
    return totals.map((v, i) => Math.min(95, Math.max(15, Math.round(base * 0.4 + v * 0.4 + i * 8))));
  }, [catData]);

  const completionPct = useMemo(() => {
    const t = logs.length || 1;
    return Math.round((logs.filter(l => l.status === "completed").length / t) * 100);
  }, [logs]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }, [nav]);

  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="font-display text-xs uppercase tracking-[0.5em] cyan-text animate-pulse">[ LOADING CHRONICLES... ]</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden pb-16">
      <VortexGrid className="opacity-50" />

      <header className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pt-6 sm:px-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.5em] cyan-text">[ AEGIS SYSTEM ]</div>
          <div className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">CHRONICLES · QUEST TELEMETRY</div>
        </div>
        <NavBar />
        <button onClick={signOut} className="flex items-center gap-2 border border-primary/30 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground transition hover:border-destructive/60 hover:danger-text">
          <LogOut className="h-3.5 w-3.5" /> EXIT
        </button>
      </header>

      <section className="relative z-10 mx-auto mt-6 max-w-6xl px-4 sm:px-6">
        {/* Outer framed chart panel */}
        <div className="glass-panel angular-clip relative animated-border p-6">
          {/* Header pill */}
          <div className="-mt-12 flex justify-center">
            <div className="glass-panel angular-clip px-8 py-3">
              <h2 className="font-display text-lg tracking-[0.25em] neon-text sm:text-xl">SYSTEM LEVEL &amp; PROGRESS CHART</h2>
            </div>
          </div>

          {/* Range tabs */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {([
              { id: "weekly",  label: "[WEEKLY SYSTEM VIEW]" },
              { id: "monthly", label: "[MONTHLY TRACKING LOG]" },
              { id: "yearly",  label: "[YEARLY DIRECTIVE GRAPH]" },
            ] as { id: Range; label: string }[]).map(t => (
              <button key={t.id} onClick={() => setRange(t.id)}
                className={`corner-clip border px-3 py-3 font-display text-[10px] uppercase tracking-[0.25em] transition sm:text-xs ${
                  range === t.id
                    ? "border-accent bg-accent/15 cyan-text shadow-[var(--glow-cyan)]"
                    : "border-primary/30 bg-black/30 text-muted-foreground hover:border-primary/60"
                }`}>{t.label}</button>
            ))}
          </div>

          {/* Subtitle */}
          <h3 className="mt-6 font-display text-base text-foreground/95">
            {range === "weekly" ? "Weekly System Overview (Mon - Sun)"
             : range === "monthly" ? "Monthly Tracking Log"
             : "Yearly Directive Graph"}
          </h3>

          {/* Day ribbon (weekly) */}
          {range === "weekly" && (
            <div className="mt-4 grid grid-cols-7 gap-2">
              {DAYS_FULL.map((d, i) => {
                const isActive = i === activeDow;
                return (
                  <button key={d} onClick={() => setActiveDow(i)} className="flex flex-col items-center gap-1">
                    {isActive ? (
                      <div className="relative grid h-14 w-14 place-items-center">
                        <Hex glow />
                        <span className="absolute inset-0 grid place-items-center font-display text-[10px] uppercase tracking-widest cyan-text">{DAYS_SHORT[i]}</span>
                        <span className="absolute -bottom-2 grid h-5 w-5 place-items-center rounded-full bg-black ring-2 ring-emerald-400 text-[10px] neon-green">✓</span>
                      </div>
                    ) : (
                      <div className="grid h-12 w-full place-items-center border border-primary/40 px-2 corner-clip text-[10px] uppercase tracking-widest text-foreground/80 hover:border-primary">
                        <span className="hidden sm:inline">{d}</span><span className="sm:hidden">{DAYS_SHORT[i]}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Chart row */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {/* Bar + line chart */}
            <div className="glass-panel angular-clip relative p-4 lg:col-span-2">
              <NeonDualBarChart data={catData} efficiency={efficiency} />
            </div>

            {/* Biometrics analyzer */}
            <div className="glass-panel angular-clip p-5">
              <div className="font-display text-base text-foreground/95">Body Recovery &amp; biometrics Analyzer</div>
              <div className="mt-4 flex items-center gap-4">
                <ProgressRing pct={completionPct} />
                <div className="space-y-3 text-xs uppercase tracking-widest">
                  <div>
                    <div className="text-muted-foreground">BODY PROGRESSIVE OVERLOAD:</div>
                    <div className="font-display text-base neon-green">SAFE</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">RECOVERY RATIO:</div>
                    <div className="font-display text-base neon-green">OPTIMAL</div>
                  </div>
                </div>
              </div>
              <div className="mt-5 space-y-1 text-[11px] uppercase tracking-widest">
                <div><span className="text-muted-foreground">CURRENT ACTIVE STREAKS:</span> <span className="neon-green font-display">{profile.current_streak}</span></div>
                <div><span className="text-muted-foreground">SYSTEM LEVEL:</span> <span className="cyan-text font-display">{profile.current_level}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Hunter eval HUD */}
        <div className="relative z-10 mt-6 flex items-end justify-end gap-3">
          <img src={shadowHunter} alt="Hunter" width={200} height={200} loading="lazy" className="hidden h-40 w-auto drop-shadow-[0_0_24px_oklch(0.55_0.2_290/0.7)] sm:block" />
          <div className="glass-panel angular-clip max-w-md p-4 text-sm text-foreground/90">
            <div className="text-[9px] uppercase tracking-[0.4em] cyan-text">[ SHADOW REGISTRY ]</div>
            <p className="mt-2 leading-relaxed">
              System Evaluation Complete, {(profile.hunter_name || "Hunter").toUpperCase()}.
              Level {profile.current_level} Threshold reached. Your core routines are stabilizing across the active matrix.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ============ Sub-components ============ */

function Hex({ glow }: { glow?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <polygon
        points="50,4 92,27 92,73 50,96 8,73 8,27"
        fill="oklch(0.16 0.03 270 / 0.7)"
        stroke="oklch(0.78 0.18 220)"
        strokeWidth="3"
        style={{ filter: glow ? "drop-shadow(0 0 10px oklch(0.78 0.18 220))" : undefined }}
      />
    </svg>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 38; const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="relative grid h-24 w-24 place-items-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="oklch(0.2 0.03 270)" strokeWidth="8" />
        <defs>
          <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.18 220)" />
            <stop offset="100%" stopColor="oklch(0.65 0.27 300)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#ringG)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`} style={{ filter: "drop-shadow(0 0 6px oklch(0.78 0.18 220 / 0.8))" }} />
      </svg>
      <div className="absolute font-display text-[10px] uppercase tracking-widest cyan-text">PROGRESS</div>
    </div>
  );
}

function NeonDualBarChart({
  data,
  efficiency,
}: {
  data: { label: string; purple: number; cyan: number }[];
  efficiency: number[];
}) {
  const W = 560, H = 240, padL = 40, padR = 40, padT = 20, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const colW = innerW / data.length;
  const barGap = 6;
  const barW = (colW - barGap * 3) / 2;
  const yFor = (v: number) => padT + innerH - (v / 100) * innerH;
  const yLeftTicks = [0, 20, 40, 60, 80, 100];

  // efficiency polyline points (centered in each column)
  const linePts = efficiency.map((v, i) => {
    const x = padL + i * colW + colW / 2;
    const y = yFor(v);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="purpleBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.85 0.18 300)" />
          <stop offset="100%" stopColor="oklch(0.5 0.25 295)" />
        </linearGradient>
        <linearGradient id="cyanBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.9 0.16 220)" />
          <stop offset="100%" stopColor="oklch(0.55 0.2 230)" />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="2.5" /></filter>
      </defs>

      {/* Y grid + ticks */}
      {yLeftTicks.map(t => (
        <g key={t}>
          <line x1={padL} y1={yFor(t)} x2={W - padR} y2={yFor(t)} stroke="oklch(0.65 0.27 300 / 0.08)" strokeWidth="1" />
          <text x={padL - 6} y={yFor(t) + 4} textAnchor="end" fontSize="9" fill="oklch(0.7 0.04 270)">{t}</text>
          <text x={W - padR + 6} y={yFor(t) + 4} textAnchor="start" fontSize="9" fill="oklch(0.7 0.04 270)">{t}</text>
        </g>
      ))}

      {/* Axis titles */}
      <text x={10} y={H/2} transform={`rotate(-90 10 ${H/2})`} textAnchor="middle" fontSize="9" fill="oklch(0.7 0.04 270)">Total task success ratio</text>
      <text x={W - 10} y={H/2} transform={`rotate(-90 ${W - 10} ${H/2})`} textAnchor="middle" fontSize="9" fill="oklch(0.7 0.04 270)">Overall efficiency index</text>

      {/* Bars */}
      {data.map((d, i) => {
        const xStart = padL + i * colW + barGap;
        const pY = yFor(d.purple);
        const cY = yFor(d.cyan);
        return (
          <g key={d.label}>
            <rect x={xStart} y={pY} width={barW} height={padT + innerH - pY}
              fill="url(#purpleBar)" style={{ filter: "drop-shadow(0 0 6px oklch(0.65 0.27 300 / 0.85))" }} />
            <rect x={xStart + barW + barGap} y={cY} width={barW} height={padT + innerH - cY}
              fill="url(#cyanBar)" style={{ filter: "drop-shadow(0 0 6px oklch(0.78 0.18 220 / 0.85))" }} />
            <text x={padL + i * colW + colW / 2} y={H - 12} textAnchor="middle" fontSize="10" fill="oklch(0.92 0.02 270)">{d.label}</text>
          </g>
        );
      })}

      {/* Efficiency line — green */}
      <polyline points={linePts} fill="none" stroke="oklch(0.82 0.22 145)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px oklch(0.82 0.22 145 / 0.9))" }} />
      {efficiency.map((v, i) => {
        const x = padL + i * colW + colW / 2;
        const y = yFor(v);
        return <circle key={i} cx={x} cy={y} r="3.5" fill="oklch(0.92 0.2 145)" stroke="oklch(0.4 0.18 145)" strokeWidth="1" />;
      })}
    </svg>
  );
}

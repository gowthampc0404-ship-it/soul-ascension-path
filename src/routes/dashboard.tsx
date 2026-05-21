import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParticleBackground } from "@/components/aegis/ParticleBackground";
import { NavBar } from "@/components/aegis/NavBar";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Crystal Matrix · Aegis System" },
      { name: "description", content: "Quest completion telemetry: weekly, monthly, yearly chronicles." },
    ],
  }),
  component: DashboardPage,
});

type Range = "weekly" | "monthly" | "yearly";
type Cat = "physical" | "mental" | "daily";
type Mode = "combined" | "split";

interface QuestRow { quest_id: string; category: Cat; scheduled_days: boolean[]; }
interface LogRow { quest_id: string; status: string; checked_at: string; }
interface ProfileRow { current_streak: number; current_level: number; current_rank: string; hunter_name: string | null; }

const CAT_META: Record<Cat, { label: string; color: string }> = {
  physical: { label: "PHYSICAL", color: "oklch(0.65 0.27 300)" },
  mental:   { label: "MENTAL",   color: "oklch(0.78 0.18 220)" },
  daily:    { label: "DAILY",    color: "oklch(0.62 0.25 27)" },
};

function startOfWeek(d: Date) { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); x.setHours(0,0,0,0); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function iso(d: Date) { return d.toISOString().slice(0, 10); }

function DashboardPage() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("weekly");
  const [mode, setMode] = useState<Mode>("combined");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav({ to: "/auth" });
      else setUserId(data.session.user.id);
    });
  }, [nav]);

  // Range bounds
  const { from, to, label } = useMemo(() => {
    if (range === "weekly") {
      const f = startOfWeek(anchor);
      const t = addDays(f, 6);
      const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
      return { from: f, to: t, label: `${fmt(f)} — ${fmt(t)}` };
    }
    if (range === "monthly") {
      const f = startOfMonth(anchor);
      const t = new Date(f.getFullYear(), f.getMonth() + 1, 0);
      return { from: f, to: t, label: f.toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase() };
    }
    const f = startOfYear(anchor);
    const t = new Date(f.getFullYear(), 11, 31);
    return { from: f, to: t, label: String(f.getFullYear()) };
  }, [range, anchor]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: q }, { data: l }, { data: p }] = await Promise.all([
        supabase.from("quests").select("quest_id, category, scheduled_days").eq("user_id", userId).eq("is_archived", false),
        supabase.from("quest_logs").select("quest_id, status, checked_at").eq("user_id", userId).gte("checked_at", iso(from)).lte("checked_at", iso(to)),
        supabase.from("profiles").select("current_streak, current_level, current_rank, hunter_name").eq("user_id", userId).single(),
      ]);
      setQuests((q || []) as QuestRow[]);
      setLogs((l || []) as LogRow[]);
      setProfile(p as ProfileRow);
    })();
  }, [userId, from, to]);

  // Bar chart buckets (counts of completed + failed quests)
  const buckets = useMemo(() => {
    const make = (labels: string[]) => labels.map(l => ({ label: l, completed: 0, failed: 0 }));
    let arr: { label: string; completed: number; failed: number }[];
    let getIdx: (log: LogRow) => number;
    if (range === "weekly") {
      arr = make(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]);
      getIdx = (l) => (new Date(l.checked_at + "T00:00:00").getDay() + 6) % 7;
    } else if (range === "monthly") {
      const dim = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
      arr = make(Array.from({ length: dim }, (_, i) => String(i+1)));
      getIdx = (l) => parseInt(l.checked_at.slice(8, 10), 10) - 1;
    } else {
      arr = make(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]);
      getIdx = (l) => parseInt(l.checked_at.slice(5, 7), 10) - 1;
    }
    for (const log of logs) {
      const i = getIdx(log);
      if (i < 0 || i >= arr.length) continue;
      if (log.status === "completed") arr[i].completed++;
      else if (log.status === "failed") arr[i].failed++;
    }
    return arr;
  }, [logs, range, from]);

  // Stats
  const stats = useMemo(() => {
    const completed = logs.filter(l => l.status === "completed").length;
    const failed = logs.filter(l => l.status === "failed").length;
    const total = logs.length;
    const remaining = Math.max(0, total - completed - failed);
    const completionPct = total === 0 ? 0 : Math.round((completed / total) * 100);

    // active units
    const activeSet = new Set<string>();
    for (const l of logs) {
      if (l.status !== "completed") continue;
      if (range === "yearly") activeSet.add(l.checked_at.slice(0, 7));
      else activeSet.add(l.checked_at);
    }
    return { completed, failed, remaining, total, completionPct, active: activeSet.size };
  }, [logs, range]);

  // Pie: completed/failed/remaining
  const pie = useMemo(() => {
    const t = stats.total || 1;
    return [
      { key: "COMPLETED", value: stats.completed, pct: (stats.completed / t) * 100, color: "oklch(0.78 0.18 220)" },
      { key: "FAILED",    value: stats.failed,    pct: (stats.failed / t) * 100,    color: "oklch(0.62 0.25 27)" },
      { key: "REMAINING", value: stats.remaining, pct: (stats.remaining / t) * 100, color: "oklch(0.55 0.22 300)" },
    ];
  }, [stats]);

  // Category breakdown
  const catBreakdown = useMemo(() => {
    const qmap = new Map(quests.map(q => [q.quest_id, q.category]));
    const init = (): { done: number; total: number } => ({ done: 0, total: 0 });
    const acc: Record<Cat, { done: number; total: number }> = { physical: init(), mental: init(), daily: init() };
    for (const l of logs) {
      const c = qmap.get(l.quest_id); if (!c) continue;
      acc[c].total++;
      if (l.status === "completed") acc[c].done++;
    }
    return acc;
  }, [logs, quests]);

  const shift = (delta: number) => {
    const d = new Date(anchor);
    if (range === "weekly") d.setDate(d.getDate() + delta * 7);
    else if (range === "monthly") d.setMonth(d.getMonth() + delta);
    else d.setFullYear(d.getFullYear() + delta);
    setAnchor(d);
  };

  const signOut = useCallback(async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }, [nav]);

  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="font-display text-xs uppercase tracking-[0.5em] cyan-text animate-pulse">[ LOADING CHRONICLES... ]</div>
      </main>
    );
  }

  const activeLabel = range === "yearly" ? "ACTIVE MOS" : "ACTIVE DAYS";

  return (
    <main className="relative min-h-screen overflow-x-hidden pb-16">
      <ParticleBackground streak={profile.current_streak} />

      <header className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 pt-6 sm:px-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.5em] cyan-text">[ AEGIS SYSTEM ]</div>
          <div className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">CHRONICLES · QUEST TELEMETRY</div>
        </div>
        <NavBar />
        <button onClick={signOut} className="flex items-center gap-2 border border-primary/30 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground transition hover:border-destructive/60 hover:danger-text">
          <LogOut className="h-3.5 w-3.5" /> EXIT
        </button>
      </header>

      {/* Range selector */}
      <section className="relative mx-auto mt-6 max-w-5xl px-4 sm:px-6">
        <div className="glass-panel-cyan glass-panel angular-clip grid grid-cols-3 gap-2 p-2">
          {(["weekly","monthly","yearly"] as Range[]).map(r => (
            <button key={r} onClick={() => { setRange(r); setAnchor(new Date()); }} className={`border px-4 py-2 font-display text-[11px] uppercase tracking-[0.35em] transition ${
              range === r ? "border-accent bg-accent/20 cyan-text shadow-[var(--glow-cyan)]" : "border-primary/20 text-muted-foreground hover:border-primary/60"
            }`}>{r}</button>
          ))}
        </div>

        {/* Period nav */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <button onClick={() => shift(-1)} className="grid h-9 w-9 place-items-center border border-primary/30 transition hover:border-accent hover:cyan-text"><ChevronLeft className="h-4 w-4" /></button>
          <div className="font-display text-base uppercase tracking-[0.3em] text-foreground/90">{label}</div>
          <button onClick={() => shift(1)} className="grid h-9 w-9 place-items-center border border-primary/30 transition hover:border-accent hover:cyan-text"><ChevronRight className="h-4 w-4" /></button>
        </div>

        {/* Stat tiles */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatTile value={`${stats.completionPct}%`} label="COMPLETION" tone="cyan" />
          <StatTile value={String(stats.completed)} label="CLEARED" tone="pink" />
          <StatTile value={String(stats.active)} label={activeLabel} tone="white" />
        </div>
      </section>

      <section className="relative mx-auto mt-6 grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
        <div className="glass-panel-cyan glass-panel angular-clip p-5 lg:col-span-2">
          <div className="mb-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ TELEMETRY ]</div>
          <h3 className="mb-3 font-display text-lg cyan-text">
            {range === "weekly" ? "DAILY ACTIVITY" : range === "monthly" ? "DAILY ACTIVITY" : "MONTHLY ACTIVITY"}
          </h3>
          <BarChartNeon data={buckets} dense={range !== "weekly"} />
        </div>

        <div className="glass-panel angular-clip p-5">
          <div className="mb-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ QUEST DISTRIBUTION ]</div>
          <div className="flex items-center justify-center gap-6">
            <PieChartNeon slices={pie} hasData={stats.total > 0} />
          </div>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[10px] uppercase tracking-widest">
            {pie.map(s => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                <span className="text-foreground/80">{s.key}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel angular-clip p-5">
          <div className="mb-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ CATEGORY BREAKDOWN ]</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.keys(CAT_META) as Cat[]).map(c => {
              const m = CAT_META[c];
              const v = catBreakdown[c];
              const pct = v.total === 0 ? 0 : Math.round((v.done / v.total) * 100);
              return (
                <div key={c} className="border border-primary/25 p-3 corner-clip" style={{ background: `color-mix(in oklab, ${m.color} 8%, transparent)` }}>
                  <div className="flex items-center justify-between">
                    <div className="font-display text-sm uppercase tracking-[0.2em]" style={{ color: m.color }}>{m.label}</div>
                    <div className="font-display text-base text-foreground">{v.done}</div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden bg-black/50">
                    <div className="h-full transition-all" style={{ width: `${pct}%`, background: m.color, boxShadow: `0 0 10px ${m.color}` }} />
                  </div>
                  <div className="mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">{v.done}/{v.total} QUESTS</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatTile({ value, label, tone }: { value: string; label: string; tone: "cyan" | "pink" | "white" }) {
  const cls = tone === "cyan" ? "cyan-text" : tone === "pink" ? "danger-text" : "text-foreground";
  return (
    <div className="glass-panel angular-clip p-4 text-center">
      <div className={`font-display text-2xl ${cls}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
    </div>
  );
}

function BarChartNeon({ data, dense }: { data: { label: string; value: number }[]; dense?: boolean }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="flex h-44 items-end gap-1">
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        const showLabel = !dense || i % Math.ceil(data.length / 12) === 0;
        return (
          <div key={i} className="group flex flex-1 flex-col items-center gap-1">
            <div className="relative flex w-full flex-1 items-end">
              <div className="relative w-full transition-all" style={{
                height: `${h}%`,
                background: "linear-gradient(180deg, oklch(0.85 0.18 220), oklch(0.5 0.22 260))",
                boxShadow: d.value > 0 ? "0 0 14px oklch(0.78 0.18 220 / 0.7)" : "none",
                clipPath: "polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)",
              }}>
                {d.value > 0 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-[9px] cyan-text opacity-0 transition-opacity group-hover:opacity-100">{d.value}</div>
                )}
              </div>
            </div>
            <div className={`text-[9px] uppercase tracking-widest text-muted-foreground ${showLabel ? "" : "opacity-0"}`}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function PieChartNeon({ slices, hasData }: { slices: { key: string; pct: number; color: string }[]; hasData: boolean }) {
  const r = 60, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="-80 -80 160 160" className="h-44 w-44 -rotate-90">
      <circle r={r} cx="0" cy="0" fill="none" stroke="oklch(0.2 0.02 270)" strokeWidth="22" />
      {hasData && slices.map((s, i) => {
        const len = (s.pct / 100) * c;
        const el = (
          <circle key={i} r={r} cx="0" cy="0" fill="none" stroke={s.color} strokeWidth="22"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
            style={{ filter: `drop-shadow(0 0 6px ${s.color})` }} />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

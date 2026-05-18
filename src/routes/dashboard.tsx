import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParticleBackground } from "@/components/aegis/ParticleBackground";
import { NavBar } from "@/components/aegis/NavBar";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Crystal Matrix · Aegis System" },
      { name: "description", content: "Telemetry dashboard: step crystals, completion ratio, accuracy engine." },
    ],
  }),
  component: DashboardPage,
});

type Range = "weekly" | "monthly" | "daily";

interface QuestRow { quest_id: string; category: "physical" | "mental" | "daily"; scheduled_days: boolean[]; is_archived: boolean; }
interface LogRow { quest_id: string; status: string; checked_at: string; }
interface StepRow { logged_date: string; step_count: number; }
interface ProfileRow { current_streak: number; current_level: number; current_rank: string; hunter_name: string | null; }

function DashboardPage() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("weekly");
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav({ to: "/auth" });
      else setUserId(data.session.user.id);
    });
  }, [nav]);

  const days = range === "daily" ? 1 : range === "weekly" ? 7 : 30;

  useEffect(() => {
    if (!userId) return;
    const since = new Date(); since.setDate(since.getDate() - (days - 1));
    const sinceIso = since.toISOString().slice(0, 10);
    (async () => {
      const [{ data: q }, { data: l }, { data: s }, { data: p }] = await Promise.all([
        supabase.from("quests").select("quest_id, category, scheduled_days, is_archived").eq("user_id", userId).eq("is_archived", false),
        supabase.from("quest_logs").select("quest_id, status, checked_at").eq("user_id", userId).gte("checked_at", sinceIso),
        supabase.from("step_logs").select("logged_date, step_count").eq("user_id", userId).gte("logged_date", sinceIso).order("logged_date", { ascending: true }),
        supabase.from("profiles").select("current_streak, current_level, current_rank, hunter_name").eq("user_id", userId).single(),
      ]);
      setQuests((q || []) as QuestRow[]);
      setLogs((l || []) as LogRow[]);
      setSteps((s || []) as StepRow[]);
      setProfile(p as ProfileRow);
    })();
  }, [userId, days]);

  const stepBuckets = useMemo(() => {
    const buckets: { label: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const found = steps.find(s => s.logged_date === iso);
      buckets.push({
        label: d.toLocaleDateString(undefined, { weekday: days <= 7 ? "short" : undefined, day: "2-digit" }),
        value: found?.step_count ?? 0,
      });
    }
    return buckets;
  }, [steps, days]);

  const pie = useMemo(() => {
    const completed = logs.filter(l => l.status === "completed");
    const byCat: Record<"physical"|"mental"|"daily", number> = { physical: 0, mental: 0, daily: 0 };
    const qmap = new Map(quests.map(q => [q.quest_id, q.category]));
    for (const l of completed) {
      const c = qmap.get(l.quest_id); if (c) byCat[c]++;
    }
    const total = byCat.physical + byCat.mental + byCat.daily || 1;
    return {
      total: byCat.physical + byCat.mental + byCat.daily,
      slices: [
        { key: "PHYSICAL", value: byCat.physical, pct: (byCat.physical / total) * 100, color: "oklch(0.65 0.27 300)" },
        { key: "MENTAL", value: byCat.mental, pct: (byCat.mental / total) * 100, color: "oklch(0.78 0.18 220)" },
        { key: "DAILY", value: byCat.daily, pct: (byCat.daily / total) * 100, color: "oklch(0.62 0.25 27)" },
      ],
    };
  }, [logs, quests]);

  const accuracy = useMemo(() => {
    // Expected = Σ scheduled days per quest within range, times the user's weekly cadence rolled up by `days`.
    // Simple model: for each active quest, count scheduled day-of-week occurrences in the last `days` days.
    const now = new Date();
    let expected = 0;
    for (const q of quests) {
      for (let i = 0; i < days; i++) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const dow = ((d.getDay() + 6) % 7); // 0..6 Mon..Sun
        if (q.scheduled_days?.[dow]) expected++;
      }
    }
    const actual = logs.filter(l => l.status === "completed").length;
    if (expected === 0) return { pct: 0, actual, expected };
    return { pct: Math.min(100, Math.round((actual / expected) * 100)), actual, expected };
  }, [quests, logs, days]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }, [nav]);

  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="font-display text-xs uppercase tracking-[0.5em] cyan-text animate-pulse">[ LOADING CRYSTAL MATRIX... ]</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden pb-16">
      <ParticleBackground streak={profile.current_streak} />

      <header className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 pt-6 sm:px-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.5em] cyan-text">[ AEGIS SYSTEM ]</div>
          <div className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">CRYSTAL MATRIX · TELEMETRY</div>
        </div>
        <NavBar />
        <button onClick={signOut} className="flex items-center gap-2 border border-primary/30 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground transition hover:border-destructive/60 hover:danger-text">
          <LogOut className="h-3.5 w-3.5" /> EXIT
        </button>
      </header>

      <section className="relative mx-auto mt-6 max-w-5xl px-4 sm:px-6">
        <div className="glass-panel-cyan glass-panel angular-clip flex items-center justify-between p-3">
          <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ RANGE ]</div>
          <div className="grid grid-cols-3 gap-2">
            {(["weekly","monthly","daily"] as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)} className={`border px-4 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] transition ${
                range === r ? "border-accent bg-accent/20 cyan-text shadow-[var(--glow-cyan)]" : "border-primary/25 text-muted-foreground hover:border-primary/60"
              }`}>{r}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto mt-6 grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
        <div className="glass-panel-cyan glass-panel angular-clip p-5">
          <div className="mb-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ STEP CRYSTAL ]</div>
          <h3 className="mb-3 font-display text-lg cyan-text">MOVEMENT TELEMETRY</h3>
          <BarChartNeon data={stepBuckets} />
        </div>

        <div className="glass-panel angular-clip p-5">
          <div className="mb-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ TASK COMPLETION RATIO ]</div>
          <h3 className="mb-3 font-display text-lg neon-text">CATEGORY MATRIX</h3>
          <div className="flex items-center gap-5">
            <PieChartNeon slices={pie.slices} />
            <ul className="space-y-2 text-[11px] uppercase tracking-widest">
              {pie.slices.map(s => (
                <li key={s.key} className="flex items-center gap-2">
                  <span className="h-3 w-3" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                  <span className="text-foreground/80">{s.key}</span>
                  <span className="text-muted-foreground">{Math.round(s.pct)}%</span>
                </li>
              ))}
              <li className="pt-2 text-[10px] text-muted-foreground">TOTAL CLEARED: {pie.total}</li>
            </ul>
          </div>
        </div>

        <div className="glass-panel angular-clip p-5 lg:col-span-2">
          <div className="mb-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ ACCURACY ENGINE ]</div>
          <h3 className="mb-4 font-display text-lg neon-text">SCHEDULED vs ACTUAL</h3>
          <div className="flex flex-wrap items-center gap-6">
            <AccuracyRing pct={accuracy.pct} />
            <div className="space-y-1 text-[11px] uppercase tracking-widest">
              <div><span className="text-muted-foreground">ACTUAL COMPLETIONS:</span> <span className="neon-text">{accuracy.actual}</span></div>
              <div><span className="text-muted-foreground">EXPECTED:</span> <span className="cyan-text">{accuracy.expected}</span></div>
              <div><span className="text-muted-foreground">MAX STREAK:</span> <span className="danger-text">{profile.current_streak} DAYS</span></div>
              <div><span className="text-muted-foreground">CURRENT RANK:</span> <span className="neon-text">{profile.current_rank}</span></div>
              <div className="pt-1 text-[10px] text-muted-foreground/80">FORMULA = (ACTUAL / SCHEDULED OCCURRENCES) × 100</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function BarChartNeon({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="flex h-44 items-end gap-1.5">
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        return (
          <div key={i} className="group flex flex-1 flex-col items-center gap-1">
            <div className="relative flex w-full flex-1 items-end">
              <div className="relative w-full transition-all" style={{
                height: `${h}%`,
                background: "linear-gradient(180deg, oklch(0.85 0.18 220), oklch(0.5 0.22 260))",
                boxShadow: "0 0 14px oklch(0.78 0.18 220 / 0.7)",
                clipPath: "polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)",
              }}>
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-[9px] cyan-text opacity-0 transition-opacity group-hover:opacity-100">{d.value}</div>
              </div>
            </div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function PieChartNeon({ slices }: { slices: { key: string; pct: number; color: string }[] }) {
  const r = 60, c = 2 * Math.PI * r;
  let offset = 0;
  const total = slices.reduce((a, b) => a + b.pct, 0);
  return (
    <svg viewBox="-80 -80 160 160" className="h-36 w-36 -rotate-90">
      <circle r={r} cx="0" cy="0" fill="none" stroke="oklch(0.2 0.02 270)" strokeWidth="22" />
      {total > 0 && slices.map((s, i) => {
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

function AccuracyRing({ pct }: { pct: number }) {
  const r = 56, c = 2 * Math.PI * r;
  const len = (pct / 100) * c;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="-70 -70 140 140" className="h-full w-full -rotate-90">
        <circle r={r} cx="0" cy="0" fill="none" stroke="oklch(0.2 0.02 270)" strokeWidth="10" />
        <circle r={r} cx="0" cy="0" fill="none" stroke="oklch(0.78 0.18 220)" strokeWidth="10"
          strokeDasharray={`${len} ${c - len}`} strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 8px oklch(0.78 0.18 220))" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-3xl cyan-text">{pct}%</div>
          <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">ACCURACY</div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParticleBackground } from "@/components/aegis/ParticleBackground";
import { StatusPanel } from "@/components/aegis/StatusPanel";
import { ShadowMonster } from "@/components/aegis/ShadowMonster";
import { BossHpBar } from "@/components/aegis/BossHpBar";
import { QuestList, type QuestRow } from "@/components/aegis/QuestList";
import { LevelUpOverlay } from "@/components/aegis/LevelUpOverlay";
import { SystemWarningModal } from "@/components/aegis/SystemWarningModal";
import { StepsChart } from "@/components/aegis/StepsChart";
import { sfxLevelUp, sfxQuestComplete, sfxSlash, sfxFailure, speak } from "@/lib/sfx";
import { LogOut, Footprints, Swords } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aegis System · Solo Quest" },
      { name: "description", content: "Single-player gamified habit tracker. Arise, Hunter." },
    ],
  }),
  component: SystemPage,
});

interface Profile {
  user_id: string;
  hunter_name: string | null;
  current_level: number;
  current_xp: number;
  current_streak: number;
  current_rank: string;
  last_active_date: string | null;
}

function SystemPage() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [steps, setSteps] = useState<{ date: string; steps: number }[]>([]);
  const [stepInput, setStepInput] = useState("");
  const [locked, setLocked] = useState(false);
  const [slashKey, setSlashKey] = useState(0);
  const [damageText, setDamageText] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [redFlashKey, setRedFlashKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [levelUpTrigger, setLevelUpTrigger] = useState(0);
  const [levelInfo, setLevelInfo] = useState<{ level: number; rank: string; rankChanged: boolean }>({ level: 1, rank: "E-RANK HUNTER", rankChanged: false });
  const [penalty, setPenalty] = useState<{ open: boolean; oldRank: string; newRank: string; newLevel: number }>({ open: false, oldRank: "", newRank: "", newLevel: 1 });
  const lastResetDayRef = useRef<string>(new Date().toDateString());

  // ---- Auth gate ----
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) nav({ to: "/auth" });
      else setUserId(session.user.id);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) nav({ to: "/auth" });
      else setUserId(data.session.user.id);
    });
    return () => subscription.unsubscribe();
  }, [nav]);

  // ---- Initial load: profile, spawn today's logs, check inactivity, load quests & steps ----
  const refresh = useCallback(async (uid: string) => {
    // ensure today's pending logs exist
    await supabase.rpc("spawn_daily_quest_logs", { p_user: uid });

    const [{ data: prof }, { data: logs }, { data: stepRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", uid).single(),
      supabase
        .from("quest_logs")
        .select("log_id, quest_id, status, quests(title)")
        .eq("user_id", uid)
        .eq("checked_at", new Date().toISOString().slice(0, 10)),
      supabase
        .from("step_logs")
        .select("logged_date, step_count")
        .eq("user_id", uid)
        .order("logged_date", { ascending: true })
        .limit(30),
    ]);

    if (prof) setProfile(prof as Profile);
    setQuests(
      (logs || []).map((l: any) => ({
        log_id: l.log_id,
        quest_id: l.quest_id,
        status: l.status,
        title: l.quests?.title ?? "UNKNOWN QUEST",
      }))
    );

    // build 7 day trailing window
    const days: { date: string; steps: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const found = (stepRows || []).find((r: any) => r.logged_date === iso);
      days.push({ date: iso, steps: found?.step_count ?? 0 });
    }
    setSteps(days);
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      // inactivity penalty check
      const { data: prevProf } = await supabase.from("profiles").select("current_rank,current_level").eq("user_id", userId).single();
      const { data: penaltyApplied } = await supabase.rpc("apply_inactivity_penalty", { p_user: userId });
      if (penaltyApplied) {
        sfxFailure();
        speak("System warning. Rank degradation protocol activated.");
        const { data: newProf } = await supabase.from("profiles").select("current_rank,current_level").eq("user_id", userId).single();
        setPenalty({
          open: true,
          oldRank: prevProf?.current_rank ?? "",
          newRank: newProf?.current_rank ?? "",
          newLevel: newProf?.current_level ?? 1,
        });
      }
      await refresh(userId);
    })();
  }, [userId, refresh]);

  // ---- Local midnight reset watcher (client-side; server cron is the source of truth) ----
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== lastResetDayRef.current) {
        lastResetDayRef.current = today;
        // play failure sequence then refresh
        setRedFlashKey(k => k + 1);
        setShakeKey(k => k + 1);
        sfxFailure();
        speak("Midnight dungeon reset. New quests deployed.");
        setTimeout(() => refresh(userId), 800);
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [userId, refresh]);

  // ---- Quest completion pipeline ----
  const handleComplete = useCallback(async (log_id: string) => {
    if (!userId || locked) return;
    const target = quests.find(q => q.log_id === log_id);
    if (!target || target.status !== "pending") return;

    const totalToday = quests.length;
    const hpClip = totalToday > 0 ? Math.floor(100 / totalToday) : 100;

    setLocked(true);
    setFlashKey(k => k + 1);
    setSlashKey(k => k + 1);
    setDamageText(`CRITICAL HIT! -${hpClip} HP`);
    sfxSlash();

    // optimistic local
    setQuests(prev => prev.map(q => q.log_id === log_id ? { ...q, status: "completed" } : q));

    const { data, error } = await supabase.rpc("complete_quest", { p_log_id: log_id });
    if (error) {
      // rollback
      setQuests(prev => prev.map(q => q.log_id === log_id ? { ...q, status: "pending" } : q));
      setLocked(false);
      return;
    }
    const res = data as any;
    sfxQuestComplete();

    if (res?.leveled_up) {
      setTimeout(() => {
        setLevelInfo({ level: res.new_level, rank: res.new_rank, rankChanged: !!res.rank_changed });
        setLevelUpTrigger(k => k + 1);
        sfxLevelUp();
        speak(profile?.current_rank === "SHADOW MONARCH"
          ? "Welcome back, Master. Aegis System quest resolved."
          : "Quest completed. Level up.");
      }, 350);
    } else {
      speak(profile?.current_rank === "SHADOW MONARCH"
        ? "Welcome back, Master. Aegis System quest resolved."
        : "Quest completed.");
    }

    setTimeout(() => setLocked(false), 400);
    refresh(userId);
  }, [userId, locked, quests, profile, refresh]);

  // ---- Quest CRUD ----
  const addQuest = useCallback(async (title: string) => {
    if (!userId) return;
    const { data: q } = await supabase.from("quests").insert({
      user_id: userId, title, frequency_type: "daily",
      scheduled_days: [true, true, true, true, true, true, true],
    }).select().single();
    if (q) {
      await supabase.from("quest_logs").insert({
        quest_id: q.quest_id, user_id: userId, status: "pending",
        checked_at: new Date().toISOString().slice(0, 10),
      });
      refresh(userId);
    }
  }, [userId, refresh]);

  const deleteQuest = useCallback(async (quest_id: string) => {
    if (!userId) return;
    await supabase.from("quests").delete().eq("quest_id", quest_id);
    refresh(userId);
  }, [userId, refresh]);

  // ---- Steps ----
  const logSteps = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const n = parseInt(stepInput, 10);
    if (!Number.isFinite(n) || n < 0) return;
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("step_logs").upsert(
      { user_id: userId, step_count: n, logged_date: today },
      { onConflict: "user_id,logged_date" }
    );
    setStepInput("");
    refresh(userId);
  }, [userId, stepInput, refresh]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  }, [nav]);

  const completed = useMemo(() => quests.filter(q => q.status === "completed").length, [quests]);

  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="font-display text-xs uppercase tracking-[0.5em] neon-text animate-pulse">
          [ INITIALIZING SYSTEM... ]
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden pb-16">
      <ParticleBackground streak={profile.current_streak} />

      {/* Purple combat flash */}
      {flashKey > 0 && (
        <div key={`pf-${flashKey}`} className="pointer-events-none fixed inset-0 z-40 animate-flash-purple" />
      )}
      {/* Red failure flash */}
      {redFlashKey > 0 && (
        <div key={`rf-${redFlashKey}`} className="pointer-events-none fixed inset-0 z-40 animate-flash-red" />
      )}

      <div key={`shake-${shakeKey}`} className={shakeKey > 0 ? "animate-shake" : ""}>
        <header className="relative mx-auto flex max-w-5xl items-center justify-between px-4 pt-6 sm:px-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5em] cyan-text">[ AEGIS SYSTEM ]</div>
            <div className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">SOLO QUEST · v1.0</div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 border border-primary/30 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground transition hover:border-destructive/60 hover:danger-text"
          >
            <LogOut className="h-3.5 w-3.5" /> EXIT
          </button>
        </header>

        <section className="relative mx-auto mt-6 max-w-5xl px-4 sm:px-6">
          <StatusPanel
            hunterName={profile.hunter_name || "HUNTER"}
            level={profile.current_level}
            xp={profile.current_xp}
            streak={profile.current_streak}
            rank={profile.current_rank}
          />
        </section>

        <section className="relative mx-auto mt-8 max-w-5xl px-4 sm:px-6">
          <div className="mb-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.5em] cyan-text">
            <Swords className="h-3.5 w-3.5" /> [ DAILY DUNGEON · ENGAGE BOSS ]
          </div>
          <ShadowMonster slashKey={slashKey} damageText={damageText} />
          <div className="mt-4">
            <BossHpBar completed={completed} total={quests.length} />
          </div>
        </section>

        <section className="relative mx-auto mt-10 grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
          <QuestList
            rows={quests}
            onComplete={handleComplete}
            onDelete={deleteQuest}
            onAdd={addQuest}
            locked={locked}
          />

          <div className="space-y-6">
            <StepsChart data={steps} />
            <form onSubmit={logSteps} className="glass-panel angular-clip flex items-center gap-2 p-4">
              <Footprints className="h-4 w-4 cyan-text" />
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">LOG TODAY'S STEPS</div>
              <input
                inputMode="numeric"
                value={stepInput}
                onChange={(e) => setStepInput(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="ml-auto w-24 border border-accent/40 bg-black/50 px-2 py-1 text-right font-display text-sm cyan-text outline-none focus:border-accent focus:shadow-[var(--glow-cyan)]"
              />
              <button className="border border-accent/60 bg-accent/15 px-3 py-1 text-[10px] uppercase tracking-widest cyan-text hover:bg-accent/30">
                LOG
              </button>
            </form>
          </div>
        </section>

        <footer className="mx-auto mt-12 max-w-5xl px-4 text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground sm:px-6">
          [ SINGLE PLAYER · NO LEADERBOARDS · ONLY YOU VS YOURSELF ]
        </footer>
      </div>

      <LevelUpOverlay
        trigger={levelUpTrigger}
        newLevel={levelInfo.level}
        newRank={levelInfo.rank}
        rankChanged={levelInfo.rankChanged}
      />

      <SystemWarningModal
        open={penalty.open}
        oldRank={penalty.oldRank}
        newRank={penalty.newRank}
        newLevel={penalty.newLevel}
        onClose={() => setPenalty(p => ({ ...p, open: false }))}
      />
    </main>
  );
}

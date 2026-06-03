import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParticleBackground } from "@/components/aegis/ParticleBackground";
import { StatusPanel } from "@/components/aegis/StatusPanel";
import { ShadowMonster } from "@/components/aegis/ShadowMonster";
import { BossHpBar } from "@/components/aegis/BossHpBar";
import { CategorizedQuests, type ActiveQuest } from "@/components/aegis/CategorizedQuests";
import { QuestForms, type NewQuestPayload } from "@/components/aegis/QuestForms";
import { StatusLog, type LogEntry } from "@/components/aegis/StatusLog";
import { PermissionsMatrix } from "@/components/aegis/PermissionsMatrix";
import { MidnightBanner } from "@/components/aegis/MidnightBanner";
import { NavBar } from "@/components/aegis/NavBar";
import { LevelUpOverlay } from "@/components/aegis/LevelUpOverlay";
import { SystemWarningModal } from "@/components/aegis/SystemWarningModal";
import { sfxLevelUp, sfxQuestComplete, sfxSlash, sfxFailure, speak } from "@/lib/sfx";
import { requestNotificationPermission, notify } from "@/lib/notifications";
import { SplashScreen } from "@/components/aegis/SplashScreen";

import { LogOut, Swords, RotateCcw } from "lucide-react";

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
  pending_ambush_alert?: boolean;
  active_monster_id?: string | null;
  last_ambush_summary?: { failed_count?: number; hp_lost?: number; xp_lost?: number; date?: string } | null;
}

interface Monster { monster_id: string; name: string; rank_tier: string; aura_color: string; }

function nowStamp() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

function localIso(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function SystemPage() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [monster, setMonster] = useState<Monster | null>(null);
  const [quests, setQuests] = useState<ActiveQuest[]>([]);
  const [locked, setLocked] = useState(false);
  const [slashKey, setSlashKey] = useState(0);
  const [damageText, setDamageText] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [redFlashKey, setRedFlashKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [levelUpTrigger, setLevelUpTrigger] = useState(0);
  const [midnightTrigger, setMidnightTrigger] = useState(0);
  const [levelInfo, setLevelInfo] = useState<{ level: number; rank: string; rankChanged: boolean }>({ level: 1, rank: "E-RANK HUNTER", rankChanged: false });
  const [penalty, setPenalty] = useState<{ open: boolean; oldRank: string; newRank: string; newLevel: number }>({ open: false, oldRank: "", newRank: "", newLevel: 1 });
  const [ambush, setAmbush] = useState<{ open: boolean; failed: number; hp: number; xp: number; date: string } | null>(null);
  const [externalLogs, setExternalLogs] = useState<LogEntry[]>([]);
  const lastResetDayRef = useRef<string>(new Date().toDateString());
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("aegis-splashed") !== "1";
  });


  const pushLog = useCallback((kind: LogEntry["kind"], text: string) => {
    setExternalLogs(prev => [...prev, { ts: nowStamp(), kind, text }]);
  }, []);

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

  const refresh = useCallback(async (uid: string) => {
    await supabase.rpc("spawn_daily_quest_logs", { p_user: uid });
    const today = localIso();
    const [{ data: prof }, { data: logs }, { data: floats }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", uid).single(),
      supabase
        .from("quest_logs")
        .select("log_id, quest_id, status, quests(title, category, task_type, target_duration_mins, target_reps, target_distance_km, current_progress_count, difficulty)")
        .eq("user_id", uid)
        .eq("checked_at", today),
      supabase
        .from("quests")
        .select("quest_id, title, category, task_type, target_duration_mins, target_reps, current_progress_count, difficulty")
        .eq("user_id", uid)
        .eq("is_archived", false)
        .eq("task_type", "floating"),
    ]);

    if (prof) {
      setProfile(prof as Profile);
      if ((prof as Profile).active_monster_id) {
        const { data: m } = await supabase.from("monsters").select("*").eq("monster_id", (prof as Profile).active_monster_id!).maybeSingle();
        if (m) setMonster(m as Monster);
      }
    }

    const dailyRows: ActiveQuest[] = (logs || []).map((l: any) => ({
      log_id: l.log_id,
      quest_id: l.quest_id,
      status: l.status,
      title: l.quests?.title ?? "UNKNOWN QUEST",
      category: (l.quests?.category as ActiveQuest["category"]) ?? "daily",
      task_type: l.quests?.task_type ?? "time_based",
      target_duration_mins: l.quests?.target_duration_mins,
      target_reps: l.quests?.target_reps,
      target_distance_km: l.quests?.target_distance_km,
      current_progress_count: l.quests?.current_progress_count ?? 0,
      difficulty: l.quests?.difficulty,
    }));
    const floatRows: ActiveQuest[] = (floats || []).map((q: any) => ({
      log_id: `float-${q.quest_id}`,
      quest_id: q.quest_id,
      status: "pending",
      title: q.title,
      category: q.category,
      task_type: "floating",
      target_reps: q.target_reps,
      target_duration_mins: q.target_duration_mins,
      current_progress_count: q.current_progress_count ?? 0,
      difficulty: q.difficulty,
    }));
    setQuests([...dailyRows, ...floatRows]);
  }, []);

  // Initial load + ambush + penalty check
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: prevProf } = await supabase.from("profiles").select("current_rank,current_level,pending_ambush_alert,last_ambush_summary").eq("user_id", userId).single();

      // Ambush reveal (next-open trigger)
      if (prevProf?.pending_ambush_alert) {
        const sum = (prevProf as any).last_ambush_summary || {};
        setRedFlashKey(k => k + 1);
        setShakeKey(k => k + 1);
        sfxFailure();
        setAmbush({
          open: true,
          failed: sum.failed_count ?? 0,
          hp: sum.hp_lost ?? 0,
          xp: sum.xp_lost ?? 0,
          date: sum.date ?? "",
        });
        pushLog("WARN", "NIGHT AMBUSH · Dungeon boss counter-attacked while you rested.");
        notify("Night Ambush", `${sum.failed_count ?? 0} quest(s) failed. -${sum.hp_lost ?? 0} HP, -${sum.xp_lost ?? 0} XP.`);
        await supabase.rpc("acknowledge_ambush", { p_user: userId });
      }

      const { data: penaltyApplied } = await supabase.rpc("apply_inactivity_penalty", { p_user: userId });
      if (penaltyApplied) {
        sfxFailure();
        speak("System warning. Rank degradation protocol activated.");
        setRedFlashKey(k => k + 1);
        setShakeKey(k => k + 1);
        const { data: newProf } = await supabase.from("profiles").select("current_rank,current_level").eq("user_id", userId).single();
        setPenalty({
          open: true,
          oldRank: prevProf?.current_rank ?? "",
          newRank: newProf?.current_rank ?? "",
          newLevel: newProf?.current_level ?? 1,
        });
        pushLog("WARN", "Inactivity protocol triggered: -10 levels.");
      }
      await refresh(userId);
      pushLog("SYS", "Daily quest matrix synchronized.");
      // Phase 4: request notification permission once per session
      requestNotificationPermission().then((ok) => {
        if (ok) pushLog("SYS", "Notification channel armed.");
      });
    })();
  }, [userId, refresh, pushLog]);

  // Midnight watcher
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== lastResetDayRef.current) {
        lastResetDayRef.current = today;
        setRedFlashKey(k => k + 1);
        setShakeKey(k => k + 1);
        sfxFailure();
        pushLog("WARN", "Midnight dungeon reset detected.");
        setTimeout(() => {
          refresh(userId);
          setMidnightTrigger(k => k + 1);
          pushLog("SYS", "Dungeon restored. New quests loaded.");
        }, 900);
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [userId, refresh, pushLog]);

  // Completion pipeline
  const handleComplete = useCallback(async (log_id: string) => {
    if (!userId || locked) return;
    const target = quests.find(q => q.log_id === log_id);
    if (!target || target.status !== "pending") return;

    // Floating quests: just award via inserting a synthetic log
    if (target.task_type === "floating") {
      setLocked(true);
      setFlashKey(k => k + 1);
      setSlashKey(k => k + 1);
      setDamageText(`CRITICAL HIT! +XP`);
      sfxSlash();
      const { data: inserted } = await supabase.from("quest_logs").insert({
        quest_id: target.quest_id, user_id: userId, status: "pending", checked_at: localIso(),
      }).select("log_id").single();
      if (inserted) {
        const { data, error } = await supabase.rpc("complete_quest", { p_log_id: inserted.log_id });
        if (!error) {
          const res = data as any;
          sfxQuestComplete();
          pushLog("QUEST", `Floating cleared: ${target.title} (+${res?.xp_gain ?? 0} XP)`);
          if (res?.leveled_up) {
            setTimeout(() => {
              setLevelInfo({ level: res.new_level, rank: res.new_rank, rankChanged: !!res.rank_changed });
              setLevelUpTrigger(k => k + 1);
              sfxLevelUp();
              speak(res.new_rank === "SHADOW MONARCH" ? "Welcome back, Master. Quests resolved." : "Quest completed. Level up.");
            }, 350);
          }
        }
      }
      setTimeout(() => setLocked(false), 400);
      refresh(userId);
      return;
    }

    const totalToday = quests.filter(q => q.task_type !== "floating").length;
    const hpClip = totalToday > 0 ? Math.floor(100 / totalToday) : 100;

    setLocked(true);
    setFlashKey(k => k + 1);
    setSlashKey(k => k + 1);
    setDamageText(`CRITICAL HIT! -${hpClip} HP`);
    sfxSlash();

    setQuests(prev => prev.map(q => q.log_id === log_id ? { ...q, status: "completed" } : q));

    const { data, error } = await supabase.rpc("complete_quest", { p_log_id: log_id });
    if (error) {
      setQuests(prev => prev.map(q => q.log_id === log_id ? { ...q, status: "pending" } : q));
      setLocked(false);
      pushLog("WARN", `Quest commit failed: ${error.message}`);
      return;
    }
    const res = data as any;
    sfxQuestComplete();
    pushLog("QUEST", `Cleared: ${target.title} (+${res?.xp_gain ?? 0} XP)`);

    if (res?.leveled_up) {
      setTimeout(() => {
        setLevelInfo({ level: res.new_level, rank: res.new_rank, rankChanged: !!res.rank_changed });
        setLevelUpTrigger(k => k + 1);
        sfxLevelUp();
        pushLog("LEVEL", `LEVEL UP → LV ${res.new_level} · ${res.new_rank}`);
        notify("LEVEL UP", `You are now LV ${res.new_level} · ${res.new_rank}`);
        speak(res.new_rank === "SHADOW MONARCH"
          ? "Welcome back, Master. Quests resolved."
          : "Quest completed. Level up.");
      }, 350);
    } else {
      speak(profile?.current_rank === "SHADOW MONARCH"
        ? "Welcome back, Master. Quest resolved."
        : "Quest completed.");
    }

    setTimeout(() => setLocked(false), 400);
    refresh(userId);
  }, [userId, locked, quests, profile, refresh, pushLog]);

  const handleRepDelta = useCallback(async (quest_id: string, delta: number) => {
    const { data, error } = await supabase.rpc("increment_rep_progress", { p_quest: quest_id, p_delta: delta });
    if (error) {
      pushLog("WARN", `Rep update failed: ${error.message}`);
      return { reached: false };
    }
    const r = data as any;
    setQuests(prev => prev.map(q => q.quest_id === quest_id ? { ...q, current_progress_count: r?.current ?? q.current_progress_count } : q));
    return { reached: !!r?.reached };
  }, [pushLog]);

  const createQuest = useCallback(async (p: NewQuestPayload) => {
    if (!userId) return;
    const { data: q, error } = await supabase.from("quests").insert({
      user_id: userId,
      title: p.title,
      category: p.category,
      task_type: p.task_type,
      frequency_type: "daily",
      scheduled_days: p.scheduled_days,
      target_duration_mins: p.target_duration_mins ?? null,
      target_reps: p.target_reps ?? null,
      target_distance_km: p.target_distance_km ?? null,
      difficulty: p.difficulty ?? null,
      midnight_reset: p.midnight_reset ?? true,
      ai_watch_enabled: p.ai_watch_enabled ?? false,
      sensor_distance_enabled: p.sensor_distance_enabled ?? false,
      strict_window_start: p.strict_window_start ?? null,
      strict_window_end: p.strict_window_end ?? null,
    }).select().single();
    if (error || !q) {
      pushLog("WARN", `Quest forge rejected: ${error?.message ?? "unknown"}`);
      return;
    }
    if (p.task_type !== "floating") {
      const dow = ((new Date().getDay() + 6) % 7);
      if (p.scheduled_days[dow]) {
        await supabase.from("quest_logs").insert({
          quest_id: q.quest_id, user_id: userId, status: "pending", checked_at: localIso(),
        });
      }
    }
    pushLog("SYS", `Forged ${p.task_type.toUpperCase()} quest: ${p.title}`);
    refresh(userId);
  }, [userId, refresh, pushLog]);

  const deleteQuest = useCallback(async (quest_id: string) => {
    if (!userId) return;
    await supabase.from("quests").delete().eq("quest_id", quest_id);
    pushLog("SYS", "Quest purged from matrix.");
    refresh(userId);
  }, [userId, refresh, pushLog]);

  const renameHunter = useCallback(async (name: string) => {
    if (!userId) return;
    const nextName = name.trim().slice(0, 32) || "HUNTER";
    const { error } = await supabase
      .from("profiles")
      .update({ hunter_name: nextName })
      .eq("user_id", userId);
    if (error) { pushLog("WARN", `Rename rejected: ${error.message}`); return; }
    setProfile(prev => prev ? { ...prev, hunter_name: nextName } : prev);
    pushLog("SYS", `Hunter name updated: ${nextName.toUpperCase()}`);
  }, [userId, pushLog]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  }, [nav]);

  const restartAccount = useCallback(async () => {
    if (!userId) return;
    const ok = window.confirm(
      "RESTART SYSTEM?\n\nAll quests, logs, levels, XP, and streaks will be PERMANENTLY ERASED.\nOnly your hunter name will remain.\n\nProceed?"
    );
    if (!ok) return;
    setLocked(true);
    try {
      await supabase.from("quest_logs").delete().eq("user_id", userId);
      await supabase.from("quests").delete().eq("user_id", userId);
      await supabase
        .from("profiles")
        .update({
          current_level: 1, current_xp: 0, current_streak: 0,
          current_rank: "E-RANK HUNTER", last_active_date: null,
          pending_ambush_alert: false, last_ambush_summary: null,
        })
        .eq("user_id", userId);
      setExternalLogs([]);
      pushLog("WARN", "SYSTEM RESET · All progress wiped clean.");
      await refresh(userId);
    } finally {
      setLocked(false);
    }
  }, [userId, refresh, pushLog]);

  const inactiveDim = useMemo(() => {
    if (!profile?.last_active_date) return true;
    const last = new Date(profile.last_active_date + "T00:00:00");
    const diffDays = (Date.now() - last.getTime()) / 86400000;
    return diffDays >= 7;
  }, [profile?.last_active_date]);

  const dailyOnly = useMemo(() => quests.filter(q => q.task_type !== "floating"), [quests]);
  const completed = useMemo(() => dailyOnly.filter(q => q.status === "completed").length, [dailyOnly]);
  const isMonarch = profile?.current_rank === "SHADOW MONARCH";

  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="font-display text-xs uppercase tracking-[0.5em] neon-text animate-pulse">[ INITIALIZING SYSTEM... ]</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden pb-16">
      <ParticleBackground streak={profile.current_streak} />

      {flashKey > 0 && <div key={`pf-${flashKey}`} className="pointer-events-none fixed inset-0 z-40 animate-flash-purple" />}
      {redFlashKey > 0 && <div key={`rf-${redFlashKey}`} className="pointer-events-none fixed inset-0 z-40 animate-flash-red" />}

      <div key={`shake-${shakeKey}`} className={shakeKey > 0 ? "animate-shake" : ""}>
        <header className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pt-6 sm:px-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5em] cyan-text">[ AEGIS SYSTEM ]</div>
            <div className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">PLAYER · {(profile.hunter_name || "MONARCH").toUpperCase()}</div>
          </div>
          <NavBar />
          <div className="flex items-center gap-2">
            <button onClick={restartAccount} className="flex items-center gap-2 border border-destructive/40 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground transition hover:border-destructive hover:danger-text" title="Erase all progress (keeps your name)">
              <RotateCcw className="h-3.5 w-3.5" /> RESTART
            </button>
            <button onClick={signOut} className="flex items-center gap-2 border border-primary/30 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground transition hover:border-destructive/60 hover:danger-text">
              <LogOut className="h-3.5 w-3.5" /> EXIT
            </button>
          </div>
        </header>

        <section className="relative mx-auto mt-6 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <StatusPanel
              hunterName={profile.hunter_name || "MONARCH"}
              level={profile.current_level}
              xp={profile.current_xp}
              streak={profile.current_streak}
              rank={profile.current_rank}
              onRename={renameHunter}
            />
          </div>
          <div className="space-y-4">
            <PermissionsMatrix />
          </div>
        </section>

        <section className="relative mx-auto mt-8 max-w-6xl px-4 sm:px-6">
          <div className="mb-3 flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-[0.5em] cyan-text">
            <div className="flex items-center gap-2"><Swords className="h-3.5 w-3.5" /> [ DAILY DUNGEON · ENGAGE BOSS ]</div>
            {monster && <div className="font-display text-sm danger-text" style={{ textShadow: "0 0 10px oklch(0.65 0.27 300)" }}>≫ {monster.name.toUpperCase()} ≪</div>}
          </div>
          <ShadowMonster slashKey={slashKey} damageText={damageText} dimmed={inactiveDim} />
          <div className="mt-4">
            <BossHpBar completed={completed} total={dailyOnly.length} />
          </div>
        </section>

        <section className="relative mx-auto mt-10 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
          <CategorizedQuests rows={quests} onComplete={handleComplete} onDelete={deleteQuest} onRepDelta={handleRepDelta} locked={locked} />
          <div className="space-y-6">
            <QuestForms onCreate={createQuest} />
            <StatusLog external={externalLogs} />
          </div>
        </section>

        <footer className="mx-auto mt-12 max-w-6xl px-4 text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground sm:px-6">
          [ SINGLE PLAYER · NO LEADERBOARDS · ONLY YOU VS YOURSELF ]
        </footer>
      </div>

      <MidnightBanner trigger={midnightTrigger} isMonarch={!!isMonarch} />
      <LevelUpOverlay trigger={levelUpTrigger} newLevel={levelInfo.level} newRank={levelInfo.rank} rankChanged={levelInfo.rankChanged} />
      <SystemWarningModal
        open={penalty.open}
        oldRank={penalty.oldRank}
        newRank={penalty.newRank}
        newLevel={penalty.newLevel}
        onClose={() => setPenalty(p => ({ ...p, open: false }))}
      />

      {ambush?.open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 backdrop-blur-md p-4">
          <div className="pointer-events-none absolute inset-0 animate-flash-red" />
          <div className="glass-panel-red glass-panel angular-clip relative w-full max-w-lg p-6 animate-shake">
            <div className="text-[10px] uppercase tracking-[0.5em] danger-text">[ SYSTEM WARNING ]</div>
            <h2 className="mt-2 font-display text-2xl danger-text sm:text-3xl">NIGHT AMBUSH</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">
              The dungeon boss <span className="danger-text">counter-attacked</span> while you rested.
              {ambush.failed} quest(s) failed on {ambush.date}.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="border border-destructive/40 p-3 corner-clip text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">HP LOST</div>
                <div className="mt-1 font-display text-2xl danger-text">-{ambush.hp}</div>
              </div>
              <div className="border border-destructive/40 p-3 corner-clip text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">XP DEDUCTED</div>
                <div className="mt-1 font-display text-2xl danger-text">-{ambush.xp}</div>
              </div>
            </div>
            <button
              onClick={() => setAmbush(null)}
              className="mt-6 w-full border border-destructive/70 bg-destructive/20 px-4 py-3 font-display text-sm uppercase tracking-[0.4em] danger-text transition hover:bg-destructive/40 hover:shadow-[var(--glow-red)]"
            >
              ACCEPT LOSS · RELOAD DUNGEON
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

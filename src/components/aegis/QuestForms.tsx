import { useState } from "react";
import { Timer, Repeat, Infinity as InfinityIcon, Plus, AlertTriangle, Footprints } from "lucide-react";

export type QuestCategory = "physical" | "mental" | "daily";
export type TaskType = "time_based" | "rep_based" | "floating" | "distance";

export interface NewQuestPayload {
  category: QuestCategory;
  task_type: TaskType;
  title: string;
  target_duration_mins?: number | null;
  target_reps?: number | null;
  target_distance_km?: number | null;
  difficulty?: string | null;
  midnight_reset?: boolean;
  ai_watch_enabled?: boolean;
  sensor_distance_enabled?: boolean;
  strict_window_start?: string | null;
  strict_window_end?: string | null;
  scheduled_days: boolean[];
}

interface Props {
  onCreate: (p: NewQuestPayload) => Promise<void> | void;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const DIFFS = ["E-RANK", "D-RANK", "C-RANK", "B-RANK", "A-RANK", "S-RANK", "SS-RANK"];
const WAKE_KEYWORDS = ["wake up", "wake-up", "wakeup", "எழுந்திருத்தல்"];

export function QuestForms({ onCreate }: Props) {
  const [tab, setTab] = useState<TaskType>("time_based");
  return (
    <div className="glass-panel angular-clip p-5 sm:p-6">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ MODULAR QUEST FORGE ]</div>
        <h3 className="mt-0.5 font-display text-lg neon-text">INPUT MATRIX</h3>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <TabBtn active={tab === "time_based"} onClick={() => setTab("time_based")} color="cyan" icon={<Timer className="h-3.5 w-3.5" />}>TIMER</TabBtn>
        <TabBtn active={tab === "rep_based"} onClick={() => setTab("rep_based")} color="neon" icon={<Repeat className="h-3.5 w-3.5" />}>REPS</TabBtn>
        <TabBtn active={tab === "distance"} onClick={() => setTab("distance")} color="warn" icon={<Footprints className="h-3.5 w-3.5" />}>DISTANCE</TabBtn>
        <TabBtn active={tab === "floating"} onClick={() => setTab("floating")} color="cyan" icon={<InfinityIcon className="h-3.5 w-3.5" />}>FLOATING</TabBtn>
      </div>
      {tab === "time_based" && <TimeForm onCreate={onCreate} />}
      {tab === "rep_based" && <RepForm onCreate={onCreate} />}
      {tab === "distance" && <DistanceForm onCreate={onCreate} />}
      {tab === "floating" && <FloatingForm onCreate={onCreate} />}
    </div>
  );
}

function TabBtn({ active, onClick, color, icon, children }: { active: boolean; onClick: () => void; color: "neon" | "cyan" | "warn"; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = active
    ? color === "neon"
      ? "border-primary bg-primary/15 neon-text shadow-[var(--glow-neon)]"
      : color === "cyan"
      ? "border-accent bg-accent/15 cyan-text shadow-[var(--glow-cyan)]"
      : "border-destructive bg-destructive/15 danger-text shadow-[var(--glow-red)]"
    : "border-primary/20 text-muted-foreground hover:border-primary/50";
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-1.5 border px-2 py-2 font-display text-[10px] uppercase tracking-[0.25em] transition ${cls}`}>
      {icon}{children}
    </button>
  );
}

function CategoryPicker({ value, onChange }: { value: QuestCategory; onChange: (c: QuestCategory) => void }) {
  const opts: QuestCategory[] = ["physical", "mental", "daily"];
  return (
    <div className="grid grid-cols-3 gap-1">
      {opts.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)} className={`border px-2 py-1.5 font-display text-[9px] uppercase tracking-widest transition ${value === c ? "border-accent bg-accent/15 cyan-text" : "border-primary/20 text-muted-foreground hover:border-primary/50"}`}>
          {c}
        </button>
      ))}
    </div>
  );
}

function DayMatrix({ value, onChange, color }: { value: boolean[]; onChange: (v: boolean[]) => void; color: "neon" | "cyan" | "warn" }) {
  const onClr = color === "neon" ? "border-primary bg-primary/30 neon-text" : color === "cyan" ? "border-accent bg-accent/30 cyan-text" : "border-destructive bg-destructive/30 danger-text";
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">SCHEDULED DAYS</div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d, i) => (
          <button type="button" key={d} onClick={() => { const v = [...value]; v[i] = !v[i]; onChange(v); }}
            className={`border px-1 py-2 font-display text-[10px] tracking-widest transition ${value[i] ? onClr : "border-primary/20 text-muted-foreground hover:border-primary/50"}`}>{d}</button>
        ))}
      </div>
    </div>
  );
}

function FieldShell({ label, children, color = "neon" }: { label: string; children: React.ReactNode; color?: "neon" | "cyan" | "warn" }) {
  const ring = color === "neon" ? "focus-within:border-primary focus-within:shadow-[var(--glow-neon)]" : color === "cyan" ? "focus-within:border-accent focus-within:shadow-[var(--glow-cyan)]" : "focus-within:border-destructive focus-within:shadow-[var(--glow-red)]";
  const border = color === "neon" ? "border-primary/40" : color === "cyan" ? "border-accent/40" : "border-destructive/40";
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
      <div className={`border ${border} bg-black/50 transition ${ring}`}>{children}</div>
    </label>
  );
}

function SubmitBtn({ color, children }: { color: "neon" | "cyan" | "warn"; children: React.ReactNode }) {
  const cls = color === "neon"
    ? "border-primary/70 bg-primary/15 neon-text hover:bg-primary/30 hover:shadow-[var(--glow-neon)]"
    : color === "cyan"
    ? "border-accent/70 bg-accent/15 cyan-text hover:bg-accent/30 hover:shadow-[var(--glow-cyan)]"
    : "border-destructive/70 bg-destructive/15 danger-text hover:bg-destructive/30 hover:shadow-[var(--glow-red)]";
  return (
    <button className={`mt-1 flex w-full items-center justify-center gap-2 border px-4 py-3 font-display text-xs uppercase tracking-[0.4em] transition ${cls}`}>
      <Plus className="h-3.5 w-3.5" />{children}
    </button>
  );
}

function ErrorLine({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[10px] uppercase tracking-widest danger-text">
      <AlertTriangle className="h-3 w-3" /> {msg}
    </div>
  );
}

function TimeForm({ onCreate }: Props) {
  const [name, setName] = useState("");
  const [dur, setDur] = useState("");
  const [diff, setDiff] = useState("A-RANK");
  const [cat, setCat] = useState<QuestCategory>("mental");
  const [days, setDays] = useState<boolean[]>([true, true, true, true, true, true, true]);
  const [winStart, setWinStart] = useState("");
  const [winEnd, setWinEnd] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const isWake = WAKE_KEYWORDS.some(k => name.toLowerCase().includes(k));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("VALIDATION FAILED: NAME REQUIRED");
    const d = parseInt(dur, 10);
    if (!Number.isFinite(d) || d <= 0) return setErr("VALIDATION FAILED: DURATION REQUIRED");
    if (!days.some(Boolean)) return setErr("VALIDATION FAILED: AT LEAST 1 SCHEDULED DAY");
    setErr(null);
    await onCreate({
      category: cat, task_type: "time_based",
      title: `${name.trim()} · ${d}m`,
      target_duration_mins: d, difficulty: diff, scheduled_days: days,
      strict_window_start: isWake && winStart ? winStart : null,
      strict_window_end: isWake && winEnd ? winEnd : null,
    });
    setName(""); setDur(""); setWinStart(""); setWinEnd("");
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <CategoryPicker value={cat} onChange={setCat} />
      <FieldShell label="TASK NAME" color="cyan">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="DEEP WORK · MEDITATION" className="w-full bg-transparent px-3 py-2 font-display text-sm uppercase tracking-wider outline-none placeholder:text-muted-foreground/50" />
      </FieldShell>
      <div className="grid grid-cols-2 gap-3">
        <FieldShell label="DURATION (MIN)" color="cyan">
          <input inputMode="numeric" value={dur} onChange={(e) => setDur(e.target.value.replace(/[^0-9]/g, ""))} placeholder="60" className="w-full bg-transparent px-3 py-2 font-display text-sm cyan-text outline-none" />
        </FieldShell>
        <FieldShell label="DANGER RANK" color="cyan">
          <select value={diff} onChange={(e) => setDiff(e.target.value)} className="w-full bg-transparent px-3 py-2 font-display text-sm cyan-text outline-none">
            {DIFFS.map(d => <option key={d} value={d} className="bg-black">{d}</option>)}
          </select>
        </FieldShell>
      </div>
      {isWake && (
        <div className="border border-destructive/40 bg-destructive/5 p-2.5">
          <div className="mb-1.5 text-[9px] uppercase tracking-widest danger-text">[ STRICT WAKE-WINDOW · BEFORE 6:30 AM ]</div>
          <div className="grid grid-cols-2 gap-2">
            <input type="time" value={winStart} onChange={(e) => setWinStart(e.target.value)} className="bg-black/60 border border-destructive/40 px-2 py-1.5 text-xs danger-text outline-none" />
            <input type="time" value={winEnd} onChange={(e) => setWinEnd(e.target.value)} max="06:30" className="bg-black/60 border border-destructive/40 px-2 py-1.5 text-xs danger-text outline-none" />
          </div>
        </div>
      )}
      <DayMatrix value={days} onChange={setDays} color="cyan" />
      <ErrorLine msg={err} />
      <SubmitBtn color="cyan">DEPLOY TIMER QUEST</SubmitBtn>
    </form>
  );
}

function RepForm({ onCreate }: Props) {
  const [name, setName] = useState("");
  const [reps, setReps] = useState("");
  const [aiWatch, setAiWatch] = useState(false);
  const [cat, setCat] = useState<QuestCategory>("physical");
  const [days, setDays] = useState<boolean[]>([true, true, true, true, true, false, false]);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("VALIDATION FAILED: NAME REQUIRED");
    const n = parseInt(reps, 10);
    if (!Number.isFinite(n) || n <= 0) return setErr("VALIDATION FAILED: TARGET REPS > 0");
    if (!days.some(Boolean)) return setErr("VALIDATION FAILED: AT LEAST 1 DAY");
    setErr(null);
    await onCreate({ category: cat, task_type: "rep_based", title: `${name.trim()} · ${n} reps`, target_reps: n, ai_watch_enabled: aiWatch, scheduled_days: days });
    setName(""); setReps("");
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <CategoryPicker value={cat} onChange={setCat} />
      <FieldShell label="TASK NAME" color="neon">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="PUSH-UPS · DRINK WATER" className="w-full bg-transparent px-3 py-2 font-display text-sm uppercase tracking-wider outline-none placeholder:text-muted-foreground/50" />
      </FieldShell>
      <FieldShell label="TARGET REPS" color="neon">
        <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value.replace(/[^0-9]/g, ""))} placeholder="50" className="w-full bg-transparent px-3 py-2 font-display text-sm neon-text outline-none" />
      </FieldShell>
      <label className="flex cursor-pointer items-center justify-between border border-primary/40 bg-black/50 px-3 py-2.5">
        <div>
          <div className="font-display text-xs uppercase tracking-widest neon-text">ACTIVATE AI WATCH</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">CAMERA POSE COUNTING (PHASE 4)</div>
        </div>
        <button type="button" onClick={() => setAiWatch(!aiWatch)} className={`relative h-6 w-11 border transition ${aiWatch ? "border-primary bg-primary/30" : "border-muted bg-black"}`}>
          <span className={`absolute top-0.5 h-4 w-4 transition-all ${aiWatch ? "left-6 bg-primary shadow-[var(--glow-neon)]" : "left-0.5 bg-muted"}`} />
        </button>
      </label>
      <DayMatrix value={days} onChange={setDays} color="neon" />
      <ErrorLine msg={err} />
      <SubmitBtn color="neon">DEPLOY REP QUEST</SubmitBtn>
    </form>
  );
}

function DistanceForm({ onCreate }: Props) {
  const [name, setName] = useState("");
  const [km, setKm] = useState("");
  const [sensor, setSensor] = useState(false);
  const [cat] = useState<QuestCategory>("physical");
  const [days, setDays] = useState<boolean[]>([true, false, true, false, true, false, false]);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("VALIDATION FAILED: NAME REQUIRED");
    const n = parseFloat(km);
    if (!Number.isFinite(n) || n <= 0) return setErr("VALIDATION FAILED: TARGET KM > 0");
    if (!days.some(Boolean)) return setErr("VALIDATION FAILED: AT LEAST 1 DAY");
    setErr(null);
    await onCreate({ category: cat, task_type: "distance", title: `${name.trim()} · ${n} km`, target_distance_km: n, sensor_distance_enabled: sensor, scheduled_days: days });
    setName(""); setKm("");
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <FieldShell label="ACTIVITY" color="warn">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="RUNNING · CYCLING" className="w-full bg-transparent px-3 py-2 font-display text-sm uppercase tracking-wider outline-none placeholder:text-muted-foreground/50" />
      </FieldShell>
      <FieldShell label="TARGET KM" color="warn">
        <input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="5.0" className="w-full bg-transparent px-3 py-2 font-display text-sm danger-text outline-none" />
      </FieldShell>
      <label className="flex cursor-pointer items-center justify-between border border-destructive/40 bg-black/50 px-3 py-2.5">
        <div>
          <div className="font-display text-xs uppercase tracking-widest danger-text">SENSOR TRACKING</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">GPS / PEDOMETER (PHASE 4)</div>
        </div>
        <button type="button" onClick={() => setSensor(!sensor)} className={`relative h-6 w-11 border transition ${sensor ? "border-destructive bg-destructive/30" : "border-muted bg-black"}`}>
          <span className={`absolute top-0.5 h-4 w-4 transition-all ${sensor ? "left-6 bg-destructive shadow-[var(--glow-red)]" : "left-0.5 bg-muted"}`} />
        </button>
      </label>
      <DayMatrix value={days} onChange={setDays} color="warn" />
      <ErrorLine msg={err} />
      <SubmitBtn color="warn">DEPLOY DISTANCE QUEST</SubmitBtn>
    </form>
  );
}

function FloatingForm({ onCreate }: Props) {
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("VALIDATION FAILED: NAME REQUIRED");
    setErr(null);
    await onCreate({ category: "daily", task_type: "floating", title: name.trim(), midnight_reset: false, scheduled_days: [true, true, true, true, true, true, true] });
    setName("");
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="border border-accent/30 bg-accent/5 p-2.5 text-[10px] uppercase tracking-widest cyan-text">
        [ INFINITE DUNGEON · NO DEADLINE · ON-DEMAND ]
      </div>
      <FieldShell label="QUEST NAME" color="cyan">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="JOURNAL · READ A CHAPTER" className="w-full bg-transparent px-3 py-2 font-display text-sm uppercase tracking-wider outline-none placeholder:text-muted-foreground/50" />
      </FieldShell>
      <ErrorLine msg={err} />
      <SubmitBtn color="cyan">DEPLOY FLOATING QUEST</SubmitBtn>
    </form>
  );
}

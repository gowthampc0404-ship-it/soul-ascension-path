import { useState } from "react";
import { Activity, Brain, Calendar, Plus, AlertTriangle } from "lucide-react";

export type QuestCategory = "physical" | "mental" | "daily";
export interface NewQuestPayload {
  category: QuestCategory;
  title: string;
  target_steps?: number | null;
  duration_minutes?: number | null;
  difficulty?: string | null;
  midnight_reset?: boolean;
  scheduled_days: boolean[]; // length 7, Mon..Sun
}

interface Props {
  onCreate: (p: NewQuestPayload) => Promise<void> | void;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const DIFFS = ["E-RANK", "D-RANK", "C-RANK", "B-RANK", "A-RANK", "S-RANK", "SS-RANK"];

export function QuestForms({ onCreate }: Props) {
  const [tab, setTab] = useState<QuestCategory>("physical");
  return (
    <div className="glass-panel angular-clip p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ MODULAR QUEST FORGE ]</div>
          <h3 className="mt-0.5 font-display text-lg neon-text">INPUT MATRIX</h3>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <TabBtn active={tab === "physical"} onClick={() => setTab("physical")} color="neon" icon={<Activity className="h-3.5 w-3.5" />}>PHYSICAL</TabBtn>
        <TabBtn active={tab === "mental"} onClick={() => setTab("mental")} color="cyan" icon={<Brain className="h-3.5 w-3.5" />}>MENTAL</TabBtn>
        <TabBtn active={tab === "daily"} onClick={() => setTab("daily")} color="warn" icon={<Calendar className="h-3.5 w-3.5" />}>DAILY RAID</TabBtn>
      </div>
      {tab === "physical" && <PhysicalForm onCreate={onCreate} />}
      {tab === "mental" && <MentalForm onCreate={onCreate} />}
      {tab === "daily" && <DailyForm onCreate={onCreate} />}
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

function DayMatrix({ value, onChange, color }: { value: boolean[]; onChange: (v: boolean[]) => void; color: "neon" | "cyan" | "warn" }) {
  const onClr = color === "neon" ? "border-primary bg-primary/30 neon-text" : color === "cyan" ? "border-accent bg-accent/30 cyan-text" : "border-destructive bg-destructive/30 danger-text";
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">SCHEDULED DAYS</div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d, i) => (
          <button
            type="button"
            key={d}
            onClick={() => { const v = [...value]; v[i] = !v[i]; onChange(v); }}
            className={`border px-1 py-2 font-display text-[10px] tracking-widest transition ${value[i] ? onClr : "border-primary/20 text-muted-foreground hover:border-primary/50"}`}
          >{d}</button>
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

function SubmitBtn({ color, children, disabled }: { color: "neon" | "cyan" | "warn"; children: React.ReactNode; disabled?: boolean }) {
  const cls = color === "neon"
    ? "border-primary/70 bg-primary/15 neon-text hover:bg-primary/30 hover:shadow-[var(--glow-neon)]"
    : color === "cyan"
    ? "border-accent/70 bg-accent/15 cyan-text hover:bg-accent/30 hover:shadow-[var(--glow-cyan)]"
    : "border-destructive/70 bg-destructive/15 danger-text hover:bg-destructive/30 hover:shadow-[var(--glow-red)]";
  return (
    <button disabled={disabled} className={`mt-1 flex w-full items-center justify-center gap-2 border px-4 py-3 font-display text-xs uppercase tracking-[0.4em] transition disabled:opacity-40 ${cls}`}>
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

function PhysicalForm({ onCreate }: Props) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState("");
  const [days, setDays] = useState<boolean[]>([true, true, true, true, true, false, false]);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("VALIDATION FAILED: NAME REQUIRED");
    const n = parseInt(steps, 10);
    if (!Number.isFinite(n) || n <= 0) return setErr("VALIDATION FAILED: STEP TARGET MUST BE > 0");
    if (!days.some(Boolean)) return setErr("VALIDATION FAILED: AT LEAST 1 SCHEDULED DAY");
    setErr(null);
    await onCreate({ category: "physical", title: name.trim(), target_steps: n, scheduled_days: days });
    setName(""); setSteps("");
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <FieldShell label="GATE NAME" color="neon">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="10K STEPS GATE" className="w-full bg-transparent px-3 py-2 font-display text-sm uppercase tracking-wider outline-none placeholder:text-muted-foreground/50" />
      </FieldShell>
      <FieldShell label="TARGET STEP COUNT" color="neon">
        <input inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value.replace(/[^0-9]/g, ""))} placeholder="10000" className="w-full bg-transparent px-3 py-2 font-display text-sm neon-text outline-none placeholder:text-muted-foreground/50" />
      </FieldShell>
      <DayMatrix value={days} onChange={setDays} color="neon" />
      <ErrorLine msg={err} />
      <SubmitBtn color="neon">DEPLOY GATE</SubmitBtn>
    </form>
  );
}

function MentalForm({ onCreate }: Props) {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("");
  const [diff, setDiff] = useState("A-RANK");
  const [days, setDays] = useState<boolean[]>([true, true, true, true, true, true, true]);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return setErr("VALIDATION FAILED: TOPIC REQUIRED");
    const d = parseInt(duration, 10);
    if (!Number.isFinite(d) || d <= 0) return setErr("VALIDATION FAILED: FOCUS DURATION REQUIRED");
    if (!days.some(Boolean)) return setErr("VALIDATION FAILED: AT LEAST 1 SCHEDULED DAY");
    setErr(null);
    await onCreate({ category: "mental", title: `${topic.trim()} · ${d}m`, duration_minutes: d, difficulty: diff, scheduled_days: days });
    setTopic(""); setDuration("");
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <FieldShell label="FOCUS TOPIC" color="cyan">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={60} placeholder="PYTHON CODING · EXAM PREP" className="w-full bg-transparent px-3 py-2 font-display text-sm uppercase tracking-wider outline-none placeholder:text-muted-foreground/50" />
      </FieldShell>
      <div className="grid grid-cols-2 gap-3">
        <FieldShell label="DURATION (MIN)" color="cyan">
          <input inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ""))} placeholder="60" className="w-full bg-transparent px-3 py-2 font-display text-sm cyan-text outline-none" />
        </FieldShell>
        <FieldShell label="DIFFICULTY" color="cyan">
          <select value={diff} onChange={(e) => setDiff(e.target.value)} className="w-full bg-transparent px-3 py-2 font-display text-sm cyan-text outline-none">
            {DIFFS.map(d => <option key={d} value={d} className="bg-black">{d}</option>)}
          </select>
        </FieldShell>
      </div>
      <DayMatrix value={days} onChange={setDays} color="cyan" />
      <ErrorLine msg={err} />
      <SubmitBtn color="cyan">DEPLOY DUNGEON</SubmitBtn>
    </form>
  );
}

function DailyForm({ onCreate }: Props) {
  const [name, setName] = useState("");
  const [reset, setReset] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("VALIDATION FAILED: ROUTINE NAME REQUIRED");
    setErr(null);
    await onCreate({
      category: "daily",
      title: name.trim(),
      midnight_reset: reset,
      scheduled_days: [true, true, true, true, true, true, true],
    });
    setName("");
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <FieldShell label="ROUTINE NAME" color="warn">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="DRINK 2L WATER" className="w-full bg-transparent px-3 py-2 font-display text-sm uppercase tracking-wider outline-none placeholder:text-muted-foreground/50" />
      </FieldShell>
      <label className="flex cursor-pointer items-center justify-between border border-destructive/40 bg-black/50 px-3 py-2.5">
        <div>
          <div className="font-display text-xs uppercase tracking-widest danger-text">MIDNIGHT RESET</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">FAILS AT 00:00 IF UNCOMPLETED</div>
        </div>
        <button type="button" onClick={() => setReset(!reset)} className={`relative h-6 w-11 border transition ${reset ? "border-destructive bg-destructive/30" : "border-muted bg-black"}`}>
          <span className={`absolute top-0.5 h-4 w-4 transition-all ${reset ? "left-6 bg-destructive shadow-[var(--glow-red)]" : "left-0.5 bg-muted"}`} />
        </button>
      </label>
      <ErrorLine msg={err} />
      <SubmitBtn color="warn">DEPLOY DAILY RAID</SubmitBtn>
    </form>
  );
}

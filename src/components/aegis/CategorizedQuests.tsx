import { useEffect, useRef, useState } from "react";
import { Activity, Brain, Calendar, Check, Skull, Trash2, Play, Pause, RotateCcw, Minus, Plus, Infinity as InfinityIcon, Timer as TimerIcon, Footprints, Camera, MapPin } from "lucide-react";
import { CameraWatch } from "./CameraWatch";
import { useDistanceTracker } from "@/lib/distance";
import type { QuestCategory, TaskType } from "./QuestForms";

export interface ActiveQuest {
  log_id: string;
  quest_id: string;
  title: string;
  status: "pending" | "completed" | "failed";
  category: QuestCategory;
  task_type?: TaskType;
  target_duration_mins?: number | null;
  target_reps?: number | null;
  target_distance_km?: number | null;
  current_progress_count?: number | null;
  difficulty?: string | null;
}

interface Props {
  rows: ActiveQuest[];
  onComplete: (log_id: string) => void;
  onDelete: (quest_id: string) => void;
  onRepDelta?: (quest_id: string, delta: number) => Promise<{ reached: boolean } | void>;
  locked: boolean;
}

const META: Record<QuestCategory, { label: string; color: "neon" | "cyan" | "warn"; icon: React.ReactNode }> = {
  physical: { label: "PHYSICAL GATES", color: "neon", icon: <Activity className="h-3.5 w-3.5" /> },
  mental:   { label: "MENTAL DUNGEONS", color: "cyan", icon: <Brain className="h-3.5 w-3.5" /> },
  daily:    { label: "DAILY SYSTEM RAIDS", color: "warn", icon: <Calendar className="h-3.5 w-3.5" /> },
};

export function CategorizedQuests({ rows, onComplete, onDelete, onRepDelta, locked }: Props) {
  return (
    <div className="space-y-5">
      {(Object.keys(META) as QuestCategory[]).map((cat) => {
        const items = rows.filter(r => r.category === cat);
        return <CategoryBlock key={cat} cat={cat} items={items} onComplete={onComplete} onDelete={onDelete} onRepDelta={onRepDelta} locked={locked} />;
      })}
    </div>
  );
}

function CategoryBlock({ cat, items, onComplete, onDelete, onRepDelta, locked }: { cat: QuestCategory; items: ActiveQuest[] } & Omit<Props, "rows">) {
  const m = META[cat];
  const borderCls = m.color === "neon" ? "border-primary/40" : m.color === "cyan" ? "border-accent/40" : "border-destructive/40";
  const textCls = m.color === "neon" ? "neon-text" : m.color === "cyan" ? "cyan-text" : "danger-text";
  const done = items.filter(i => i.status === "completed").length;
  return (
    <div className={`glass-panel angular-clip border ${borderCls} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex items-center gap-2 font-display text-xs uppercase tracking-[0.35em] ${textCls}`}>
          {m.icon}{m.label}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{done}/{items.length}</div>
      </div>
      {items.length === 0 ? (
        <div className="border border-dashed border-primary/20 p-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          NO {m.label} QUEUED · FORGE ONE
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <QuestRow key={r.log_id} r={r} borderCls={borderCls} onComplete={onComplete} onDelete={onDelete} onRepDelta={onRepDelta} locked={locked} />
          ))}
        </ul>
      )}
    </div>
  );
}

function QuestRow({ r, borderCls, onComplete, onDelete, onRepDelta, locked }: { r: ActiveQuest; borderCls: string } & Omit<Props, "rows">) {
  const tt: TaskType = (r.task_type as TaskType) || "time_based";
  return (
    <li className={`group flex flex-col gap-2 border p-3 corner-clip transition-all ${
      r.status === "completed" ? `border-primary/40 bg-primary/5` :
      r.status === "failed" ? "border-destructive/50 bg-destructive/5" :
      `${borderCls} bg-black/40 hover:bg-primary/10`
    }`}>
      <div className="flex items-center gap-3">
        <button
          disabled={locked || r.status !== "pending" || tt === "rep_based"}
          onClick={() => onComplete(r.log_id)}
          aria-label={`accept quest ${r.title}`}
          className={`grid h-10 w-10 shrink-0 place-items-center border transition-all ${
            r.status === "completed" ? "border-primary bg-primary/30 neon-text" :
            r.status === "failed" ? "border-destructive/60 bg-destructive/20 danger-text" :
            `${borderCls} hover:shadow-[var(--glow-neon)]`
          } ${tt === "rep_based" && r.status === "pending" ? "opacity-40" : ""}`}
          style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
        >
          {r.status === "completed" ? <Check className="h-4 w-4" /> : r.status === "failed" ? <Skull className="h-4 w-4" /> : <TaskIcon tt={tt} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className={`truncate font-display text-sm uppercase tracking-wider ${
            r.status === "completed" ? "line-through opacity-60" : r.status === "failed" ? "danger-text" : "text-foreground"
          }`}>{r.title}</div>
          <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            <TypeBadge tt={tt} />
            {r.difficulty ? <span className="danger-text">· {r.difficulty}</span> : null}
          </div>
        </div>
        <button onClick={() => onDelete(r.quest_id)} className="opacity-30 transition hover:opacity-100 hover:text-destructive" aria-label="delete quest">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {r.status === "pending" && tt === "time_based" && r.target_duration_mins ? (
        <TimerStrip log_id={r.log_id} minutes={r.target_duration_mins} onDone={() => onComplete(r.log_id)} locked={locked} />
      ) : null}

      {r.status === "pending" && tt === "rep_based" && r.target_reps && onRepDelta ? (
        <RepStrip quest_id={r.quest_id} title={r.title} current={r.current_progress_count ?? 0} target={r.target_reps} onDelta={onRepDelta} log_id={r.log_id} onComplete={onComplete} locked={locked} />
      ) : null}

      {r.status === "pending" && tt === "distance" && r.target_distance_km ? (
        <DistanceStrip target={r.target_distance_km} log_id={r.log_id} onComplete={onComplete} locked={locked} />
      ) : null}
    </li>
  );
}

function TaskIcon({ tt }: { tt: TaskType }) {
  if (tt === "time_based") return <TimerIcon className="h-4 w-4 opacity-50" />;
  if (tt === "rep_based") return <Plus className="h-4 w-4 opacity-50" />;
  if (tt === "distance") return <Footprints className="h-4 w-4 opacity-50" />;
  return <InfinityIcon className="h-4 w-4 opacity-50" />;
}

function TypeBadge({ tt }: { tt: TaskType }) {
  const map: Record<TaskType, { label: string; cls: string }> = {
    time_based: { label: "TIMER", cls: "cyan-text" },
    rep_based: { label: "REPS", cls: "neon-text" },
    distance: { label: "DISTANCE", cls: "danger-text" },
    floating: { label: "FLOATING", cls: "cyan-text" },
  };
  const m = map[tt];
  return <span className={m.cls}>· {m.label}</span>;
}

function TimerStrip({ minutes, onDone, locked }: { log_id: string; minutes: number; onDone: () => void; locked: boolean }) {
  const total = minutes * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setRemaining(s => {
        if (s <= 1) {
          if (ref.current) window.clearInterval(ref.current);
          setRunning(false);
          if (!locked) onDone();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (ref.current) window.clearInterval(ref.current); };
  }, [running, onDone, locked]);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = ((total - remaining) / total) * 100;
  return (
    <div className="flex items-center gap-3 border border-accent/30 bg-black/40 px-3 py-2">
      <div className="font-display text-lg cyan-text tabular-nums" style={{ textShadow: "0 0 8px oklch(0.78 0.18 220 / 0.8)" }}>{mm}:{ss}</div>
      <div className="relative h-1 flex-1 bg-black/60">
        <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg, oklch(0.78 0.18 220), oklch(0.5 0.22 260))", boxShadow: "0 0 8px oklch(0.78 0.18 220)" }} />
      </div>
      <button type="button" onClick={() => setRunning(r => !r)} className="grid h-7 w-7 place-items-center border border-accent/60 cyan-text hover:bg-accent/20">
        {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
      <button type="button" onClick={() => { setRunning(false); setRemaining(total); }} className="grid h-7 w-7 place-items-center border border-primary/30 text-muted-foreground hover:border-accent">
        <RotateCcw className="h-3 w-3" />
      </button>
    </div>
  );
}

function RepStrip({ quest_id, current, target, onDelta, log_id, onComplete, locked }: { quest_id: string; current: number; target: number; onDelta: (q: string, d: number) => Promise<{ reached: boolean } | void>; log_id: string; onComplete: (id: string) => void; locked: boolean }) {
  const [val, setVal] = useState(current);
  useEffect(() => setVal(current), [current]);
  const pct = Math.min(100, (val / target) * 100);
  const handle = async (d: number) => {
    if (locked) return;
    const next = Math.max(0, val + d);
    setVal(next);
    const res = await onDelta(quest_id, d);
    if (res && res.reached && !locked) onComplete(log_id);
  };
  return (
    <div className="flex items-center gap-2 border border-primary/30 bg-black/40 px-3 py-2">
      <button type="button" onClick={() => handle(-1)} className="grid h-9 w-9 place-items-center border border-destructive/50 danger-text hover:bg-destructive/20"><Minus className="h-4 w-4" /></button>
      <div className="flex-1 text-center">
        <div className="font-display text-lg neon-text tabular-nums" style={{ textShadow: "0 0 8px oklch(0.65 0.27 300)" }}>{val} / {target}</div>
        <div className="relative mt-1 h-1 w-full bg-black/60">
          <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg, oklch(0.85 0.18 220), oklch(0.65 0.27 300))", boxShadow: "0 0 8px oklch(0.65 0.27 300)" }} />
        </div>
      </div>
      <button type="button" onClick={() => handle(1)} className="grid h-9 w-9 place-items-center border border-primary/60 neon-text hover:bg-primary/20"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

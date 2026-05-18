import { Activity, Brain, Calendar, Check, Skull, Trash2 } from "lucide-react";
import type { QuestCategory } from "./QuestForms";

export interface ActiveQuest {
  log_id: string;
  quest_id: string;
  title: string;
  status: "pending" | "completed" | "failed";
  category: QuestCategory;
  target_steps?: number | null;
  duration_minutes?: number | null;
  difficulty?: string | null;
}

interface Props {
  rows: ActiveQuest[];
  onComplete: (log_id: string) => void;
  onDelete: (quest_id: string) => void;
  locked: boolean;
}

const META: Record<QuestCategory, { label: string; color: "neon" | "cyan" | "warn"; icon: React.ReactNode }> = {
  physical: { label: "PHYSICAL GATES", color: "neon", icon: <Activity className="h-3.5 w-3.5" /> },
  mental:   { label: "MENTAL DUNGEONS", color: "cyan", icon: <Brain className="h-3.5 w-3.5" /> },
  daily:    { label: "DAILY SYSTEM RAIDS", color: "warn", icon: <Calendar className="h-3.5 w-3.5" /> },
};

export function CategorizedQuests({ rows, onComplete, onDelete, locked }: Props) {
  return (
    <div className="space-y-5">
      {(Object.keys(META) as QuestCategory[]).map((cat) => {
        const items = rows.filter(r => r.category === cat);
        return <CategoryBlock key={cat} cat={cat} items={items} onComplete={onComplete} onDelete={onDelete} locked={locked} />;
      })}
    </div>
  );
}

function CategoryBlock({ cat, items, onComplete, onDelete, locked }: { cat: QuestCategory; items: ActiveQuest[] } & Omit<Props, "rows">) {
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
            <li
              key={r.log_id}
              className={`group flex items-center gap-3 border p-3 corner-clip transition-all ${
                r.status === "completed"
                  ? `border-primary/40 bg-primary/5`
                  : r.status === "failed"
                  ? "border-destructive/50 bg-destructive/5"
                  : `${borderCls} bg-black/40 hover:bg-primary/10`
              }`}
            >
              <button
                disabled={locked || r.status !== "pending"}
                onClick={() => onComplete(r.log_id)}
                aria-label={`accept quest ${r.title}`}
                className={`grid h-10 w-10 shrink-0 place-items-center border transition-all ${
                  r.status === "completed"
                    ? "border-primary bg-primary/30 neon-text"
                    : r.status === "failed"
                    ? "border-destructive/60 bg-destructive/20 danger-text"
                    : `${borderCls} hover:shadow-[var(--glow-neon)]`
                }`}
                style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
              >
                {r.status === "completed" ? <Check className="h-4 w-4" /> : r.status === "failed" ? <Skull className="h-4 w-4" /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <div className={`truncate font-display text-sm uppercase tracking-wider ${
                  r.status === "completed" ? "line-through opacity-60" : r.status === "failed" ? "danger-text" : "text-foreground"
                }`}>{r.title}</div>
                <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>{r.status === "pending" ? "[ ACCEPT QUEST ]" : r.status === "completed" ? "[ CLEARED · +XP ]" : "[ FAILED · PENALTY ]"}</span>
                  {r.target_steps ? <span className="neon-text">· {r.target_steps.toLocaleString()} STEPS</span> : null}
                  {r.duration_minutes ? <span className="cyan-text">· {r.duration_minutes}m</span> : null}
                  {r.difficulty ? <span className="danger-text">· {r.difficulty}</span> : null}
                </div>
              </div>
              <button onClick={() => onDelete(r.quest_id)} className="opacity-30 transition hover:opacity-100 hover:text-destructive" aria-label="delete quest">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

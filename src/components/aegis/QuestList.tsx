import { useState } from "react";
import { Check, Plus, Skull, Trash2 } from "lucide-react";

export interface QuestRow {
  log_id: string;
  quest_id: string;
  title: string;
  status: "pending" | "completed" | "failed";
}

interface Props {
  rows: QuestRow[];
  onComplete: (log_id: string) => void;
  onDelete: (quest_id: string) => void;
  onAdd: (title: string) => void;
  locked: boolean;
}

export function QuestList({ rows, onComplete, onDelete, onAdd, locked }: Props) {
  const [draft, setDraft] = useState("");
  return (
    <div className="glass-panel angular-clip p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">[ ACTIVE QUESTS ]</div>
          <h3 className="mt-0.5 font-display text-lg neon-text">DAILY DUNGEON</h3>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {rows.filter(r => r.status === "completed").length} / {rows.length}
        </div>
      </div>

      <ul className="space-y-2">
        {rows.length === 0 && (
          <li className="border border-dashed border-primary/30 p-6 text-center text-xs uppercase tracking-widest text-muted-foreground">
            NO QUESTS GENERATED · ADD YOUR FIRST BELOW
          </li>
        )}
        {rows.map((r) => (
          <li
            key={r.log_id}
            className={`group flex items-center gap-3 border p-3 transition-all corner-clip ${
              r.status === "completed"
                ? "border-primary/40 bg-primary/5"
                : r.status === "failed"
                ? "border-destructive/50 bg-destructive/5"
                : "border-primary/25 bg-black/40 hover:border-primary/60 hover:bg-primary/10"
            }`}
          >
            <button
              disabled={locked || r.status !== "pending"}
              onClick={() => onComplete(r.log_id)}
              aria-label={`complete ${r.title}`}
              className={`grid h-9 w-9 place-items-center border transition-all ${
                r.status === "completed"
                  ? "border-primary bg-primary/30 neon-text"
                  : r.status === "failed"
                  ? "border-destructive/60 bg-destructive/20 danger-text"
                  : "border-primary/50 hover:bg-primary/20 hover:shadow-[var(--glow-neon)]"
              }`}
              style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
            >
              {r.status === "completed" ? <Check className="h-4 w-4" /> : r.status === "failed" ? <Skull className="h-4 w-4" /> : null}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`truncate font-display text-sm uppercase tracking-wider ${
                r.status === "completed" ? "line-through opacity-60" : r.status === "failed" ? "danger-text" : "text-foreground"
              }`}>{r.title}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {r.status === "completed" ? "[ CLEARED ]" : r.status === "failed" ? "[ FAILED — PENALTY LOGGED ]" : "[ PENDING ]"}
              </div>
            </div>
            <button
              onClick={() => onDelete(r.quest_id)}
              className="opacity-30 transition hover:opacity-100 hover:text-destructive"
              aria-label="delete quest"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onAdd(draft.trim());
          setDraft("");
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add new quest..."
          maxLength={80}
          className="flex-1 border border-primary/30 bg-black/50 px-3 py-2 font-display text-sm uppercase tracking-wider text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:shadow-[var(--glow-neon)]"
        />
        <button
          type="submit"
          className="flex items-center gap-1 border border-accent/60 bg-accent/15 px-4 py-2 font-display text-xs uppercase tracking-widest cyan-text transition hover:bg-accent/30 hover:shadow-[var(--glow-cyan)]"
        >
          <Plus className="h-3.5 w-3.5" /> ADD
        </button>
      </form>
    </div>
  );
}

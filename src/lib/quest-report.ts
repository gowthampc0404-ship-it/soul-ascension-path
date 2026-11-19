export interface ScheduledQuest {
  quest_id: string;
  scheduled_days: boolean[];
  created_at: string;
}

export interface QuestReportLog {
  quest_id: string;
  status: string;
  checked_at: string;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function includeMissedScheduledFailures(
  quests: ScheduledQuest[],
  logs: QuestReportLog[],
  from: Date,
  to: Date,
  today = new Date(),
): QuestReportLog[] {
  const reportLogs = [...logs];
  const recorded = new Set(logs.map((log) => `${log.quest_id}:${log.checked_at.slice(0, 10)}`));
  const todayKey = localDateKey(today);
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  while (date <= end) {
    const dateKey = localDateKey(date);
    if (dateKey >= todayKey) break;
    const weekday = (date.getDay() + 6) % 7;

    for (const quest of quests) {
      const key = `${quest.quest_id}:${dateKey}`;
      const dateEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      if (
        new Date(quest.created_at) < dateEnd &&
        quest.scheduled_days[weekday] &&
        !recorded.has(key)
      ) {
        reportLogs.push({ quest_id: quest.quest_id, status: "failed", checked_at: dateKey });
        recorded.add(key);
      }
    }

    date.setDate(date.getDate() + 1);
  }

  return reportLogs;
}
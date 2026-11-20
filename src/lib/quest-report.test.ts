import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { includeMissedScheduledFailures } from "./quest-report";

const monday = new Date(2026, 5, 1);
const nextMonday = new Date(2026, 5, 8);
const mondayQuest = { quest_id: "quest-1", scheduled_days: [true, false, false, false, false, false, false], created_at: "2026-05-01T12:00:00Z" };

describe("missed scheduled quest reporting", () => {
  it("counts a past scheduled quest without a recorded result as failed", () => {
    const logs = includeMissedScheduledFailures([mondayQuest], [], monday, monday, new Date(2026, 5, 2));
    assert.deepEqual(logs, [{ quest_id: "quest-1", status: "failed", checked_at: "2026-06-01" }]);
  });

  it("does not mark a scheduled quest failed when it already has a result", () => {
    const completed = [{ quest_id: "quest-1", status: "completed", checked_at: "2026-06-01" }];
    const logs = includeMissedScheduledFailures([mondayQuest], completed, monday, monday, new Date(2026, 5, 2));
    assert.deepEqual(logs, completed);
  });

  it("does not mark not-yet-created, unscheduled, current, or future dates failed", () => {
    const notCreated = { ...mondayQuest, created_at: "2026-06-02T12:00:00Z" };
    const unscheduled = { ...mondayQuest, quest_id: "quest-2", scheduled_days: [false, false, false, false, false, false, true] };
    const logs = includeMissedScheduledFailures([notCreated, unscheduled], [], monday, nextMonday, monday);
    assert.deepEqual(logs, []);
  });
});
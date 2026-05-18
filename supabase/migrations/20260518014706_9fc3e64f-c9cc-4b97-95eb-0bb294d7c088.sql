
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'daily' CHECK (category IN ('physical','mental','daily')),
  ADD COLUMN IF NOT EXISTS target_steps INTEGER,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS midnight_reset BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_quests_user_category ON public.quests(user_id, category) WHERE is_archived = false;

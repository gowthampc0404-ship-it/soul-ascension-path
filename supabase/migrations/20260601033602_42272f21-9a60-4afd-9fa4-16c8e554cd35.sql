
-- =========================================================
-- PHASE 1: Task Type Architecture + Monster Rotation
-- =========================================================

-- Quests: new task_type and tracking fields
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'time_based'
    CHECK (task_type IN ('time_based','rep_based','floating','distance')),
  ADD COLUMN IF NOT EXISTS target_duration_mins integer,
  ADD COLUMN IF NOT EXISTS target_reps integer,
  ADD COLUMN IF NOT EXISTS target_distance_km numeric,
  ADD COLUMN IF NOT EXISTS current_progress_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_watch_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sensor_distance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS strict_window_start time,
  ADD COLUMN IF NOT EXISTS strict_window_end time;

-- Profiles: ambush + monster fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_ambush_alert boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_monster_id uuid,
  ADD COLUMN IF NOT EXISTS last_ambush_summary jsonb;

-- Monsters roster (public read; no per-user data)
CREATE TABLE IF NOT EXISTS public.monsters (
  monster_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rank_tier text NOT NULL,
  aura_color text NOT NULL DEFAULT 'purple',
  avatar_key text NOT NULL DEFAULT 'shadow',
  hp_multiplier numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.monsters TO anon, authenticated;
GRANT ALL ON public.monsters TO service_role;

ALTER TABLE public.monsters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS monsters_read ON public.monsters;
CREATE POLICY monsters_read ON public.monsters
  FOR SELECT TO anon, authenticated USING (true);

-- Seed monsters (idempotent)
INSERT INTO public.monsters (name, rank_tier, aura_color, avatar_key, hp_multiplier) VALUES
  ('Lesser Shade',       'E-RANK HUNTER',   'gray',    'shadow',   0.6),
  ('Goblin Stalker',     'E-RANK HUNTER',   'green',   'goblin',   0.7),
  ('Iron Sentry',        'D-RANK SOLDIER',  'blue',    'sentry',   0.9),
  ('Frost Wraith',       'C-RANK KNIGHT',   'cyan',    'wraith',   1.1),
  ('Bone Marauder',      'B-RANK ELITE',    'amber',   'marauder', 1.3),
  ('Crimson Hex Mage',   'A-RANK MAGE',     'red',     'mage',     1.5),
  ('Void Assassin',      'S-RANK ASSASSIN', 'purple',  'assassin', 1.8),
  ('Abyssal Overlord',   'SS-RANK OVERLORD','violet',  'overlord', 2.2),
  ('Monarch of Shadows', 'SHADOW MONARCH',  'magenta', 'monarch',  3.0)
ON CONFLICT DO NOTHING;

-- =========================================================
-- Updated midnight reset: failed tasks + ambush flag + rotate monster
-- =========================================================
CREATE OR REPLACE FUNCTION public.midnight_reset_all()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected RECORD;
BEGIN
  -- Mark yesterday's pending as failed
  UPDATE public.quest_logs
     SET status = 'failed', updated_at = now()
   WHERE status = 'pending' AND checked_at < current_date;

  -- Flag ambush on users who had any failed scheduled tasks yesterday
  UPDATE public.profiles p
     SET pending_ambush_alert = true,
         last_ambush_summary = jsonb_build_object(
           'failed_count', sub.failed_count,
           'hp_lost', sub.failed_count * 15,
           'xp_lost', sub.failed_count * 10,
           'date', (current_date - 1)::text
         )
    FROM (
      SELECT user_id, COUNT(*) AS failed_count
        FROM public.quest_logs
       WHERE status = 'failed' AND checked_at = current_date - 1
       GROUP BY user_id
    ) sub
   WHERE p.user_id = sub.user_id;

  -- Rotate daily monster for every profile based on current rank
  UPDATE public.profiles p
     SET active_monster_id = (
       SELECT m.monster_id FROM public.monsters m
        WHERE m.rank_tier = p.current_rank
        ORDER BY md5(p.user_id::text || current_date::text || m.monster_id::text)
        LIMIT 1
     );

  -- Spawn today's pending logs for scheduled non-floating quests
  INSERT INTO public.quest_logs (quest_id, user_id, status, checked_at)
  SELECT q.quest_id, q.user_id, 'pending', current_date
  FROM public.quests q
  WHERE q.is_archived = false
    AND q.task_type <> 'floating'
    AND COALESCE(q.scheduled_days[((EXTRACT(ISODOW FROM current_date)::INT))], false) = true
  ON CONFLICT (quest_id, checked_at) DO NOTHING;

  -- Reset rep counters at midnight for rep_based quests
  UPDATE public.quests SET current_progress_count = 0
   WHERE task_type = 'rep_based';
END;
$$;

-- Same for spawn_daily_quest_logs (skip floating)
CREATE OR REPLACE FUNCTION public.spawn_daily_quest_logs(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dow INT := ((EXTRACT(ISODOW FROM current_date)::INT) - 1);
BEGIN
  INSERT INTO public.quest_logs (quest_id, user_id, status, checked_at)
  SELECT q.quest_id, q.user_id, 'pending', current_date
  FROM public.quests q
  WHERE q.user_id = p_user
    AND q.is_archived = false
    AND q.task_type <> 'floating'
    AND COALESCE(q.scheduled_days[dow+1], false) = true
  ON CONFLICT (quest_id, checked_at) DO NOTHING;

  -- Ensure user has an active monster assigned
  UPDATE public.profiles p
     SET active_monster_id = (
       SELECT m.monster_id FROM public.monsters m
        WHERE m.rank_tier = p.current_rank
        ORDER BY md5(p.user_id::text || current_date::text || m.monster_id::text)
        LIMIT 1
     )
   WHERE p.user_id = p_user AND p.active_monster_id IS NULL;
END;
$$;

-- =========================================================
-- Acknowledge ambush (clears flag, returns summary)
-- =========================================================
CREATE OR REPLACE FUNCTION public.acknowledge_ambush(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary jsonb;
BEGIN
  IF p_user <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT last_ambush_summary INTO summary FROM public.profiles WHERE user_id = p_user;
  UPDATE public.profiles
     SET pending_ambush_alert = false
   WHERE user_id = p_user;
  RETURN COALESCE(summary, '{}'::jsonb);
END;
$$;

-- =========================================================
-- Increment rep progress (server-validated for rep_based)
-- =========================================================
CREATE OR REPLACE FUNCTION public.increment_rep_progress(p_quest uuid, p_delta integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.quests;
  new_count integer;
BEGIN
  SELECT * INTO q FROM public.quests WHERE quest_id = p_quest FOR UPDATE;
  IF q.user_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF q.task_type <> 'rep_based' THEN RAISE EXCEPTION 'not a rep quest'; END IF;
  new_count := GREATEST(0, q.current_progress_count + p_delta);
  UPDATE public.quests SET current_progress_count = new_count WHERE quest_id = p_quest;
  RETURN jsonb_build_object(
    'current', new_count,
    'target', q.target_reps,
    'reached', new_count >= COALESCE(q.target_reps, 0)
  );
END;
$$;

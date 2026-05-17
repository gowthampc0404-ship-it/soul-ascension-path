
-- PROFILES
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INT NOT NULL DEFAULT 1,
  current_xp INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  current_rank TEXT NOT NULL DEFAULT 'E-RANK HUNTER',
  last_active_date DATE,
  hunter_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- QUESTS
CREATE TABLE public.quests (
  quest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  frequency_type TEXT NOT NULL DEFAULT 'daily' CHECK (frequency_type IN ('daily','custom_days')),
  scheduled_days BOOLEAN[] NOT NULL DEFAULT ARRAY[true,true,true,true,true,true,true],
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quests_own" ON public.quests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.quests(user_id);

-- QUEST_LOGS
CREATE TABLE public.quest_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(quest_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('completed','failed','pending')),
  checked_at DATE NOT NULL DEFAULT current_date,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quest_id, checked_at)
);
ALTER TABLE public.quest_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quest_logs_own" ON public.quest_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.quest_logs(user_id, checked_at);

-- STEP_LOGS
CREATE TABLE public.step_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_count INT NOT NULL DEFAULT 0,
  logged_date DATE NOT NULL DEFAULT current_date,
  UNIQUE(user_id, logged_date)
);
ALTER TABLE public.step_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "step_logs_own" ON public.step_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RANK FUNCTION
CREATE OR REPLACE FUNCTION public.rank_for_level(lvl INT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lvl BETWEEN 1 AND 10 THEN 'E-RANK HUNTER'
    WHEN lvl BETWEEN 11 AND 20 THEN 'D-RANK SOLDIER'
    WHEN lvl BETWEEN 21 AND 30 THEN 'C-RANK KNIGHT'
    WHEN lvl BETWEEN 31 AND 40 THEN 'B-RANK ELITE'
    WHEN lvl BETWEEN 41 AND 50 THEN 'A-RANK MAGE'
    WHEN lvl BETWEEN 51 AND 60 THEN 'S-RANK ASSASSIN'
    WHEN lvl BETWEEN 61 AND 70 THEN 'SS-RANK OVERLORD'
    ELSE 'SHADOW MONARCH'
  END
$$;

-- AUTO PROFILE on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, hunter_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'hunter_name', 'HUNTER'));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SPAWN today's quest logs for active quests on a given weekday (0=Mon..6=Sun)
CREATE OR REPLACE FUNCTION public.spawn_daily_quest_logs(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  dow INT := ((EXTRACT(ISODOW FROM current_date)::INT) - 1); -- 0..6 Mon..Sun
BEGIN
  INSERT INTO public.quest_logs (quest_id, user_id, status, checked_at)
  SELECT q.quest_id, q.user_id, 'pending', current_date
  FROM public.quests q
  WHERE q.user_id = p_user
    AND q.is_archived = false
    AND COALESCE(q.scheduled_days[dow+1], false) = true
  ON CONFLICT (quest_id, checked_at) DO NOTHING;
END; $$;

-- MIDNIGHT RESET: stamp yesterday's pending as failed, spawn today's
CREATE OR REPLACE FUNCTION public.midnight_reset_all()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.quest_logs
     SET status = 'failed', updated_at = now()
   WHERE status = 'pending' AND checked_at < current_date;

  -- spawn today's pending for every user with active quests
  INSERT INTO public.quest_logs (quest_id, user_id, status, checked_at)
  SELECT q.quest_id, q.user_id, 'pending', current_date
  FROM public.quests q
  WHERE q.is_archived = false
    AND COALESCE(q.scheduled_days[((EXTRACT(ISODOW FROM current_date)::INT))], false) = true
  ON CONFLICT (quest_id, checked_at) DO NOTHING;
END; $$;

-- INACTIVITY PENALTY check: returns true if penalty applied
CREATE OR REPLACE FUNCTION public.apply_inactivity_penalty(p_user UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  last_done DATE;
  new_lvl INT;
  penalty_applied BOOLEAN := false;
BEGIN
  SELECT MAX(checked_at) INTO last_done
    FROM public.quest_logs
   WHERE user_id = p_user AND status = 'completed';

  IF last_done IS NULL OR (current_date - last_done) >= 7 THEN
    UPDATE public.profiles
       SET current_level = GREATEST(1, current_level - 10),
           current_xp = 0,
           current_streak = 0,
           updated_at = now()
     WHERE user_id = p_user
       AND (last_active_date IS NULL OR last_active_date < current_date - 6);

    IF FOUND THEN
      UPDATE public.profiles
         SET current_rank = public.rank_for_level(current_level)
       WHERE user_id = p_user;
      penalty_applied := true;
    END IF;
  END IF;

  RETURN penalty_applied;
END; $$;

-- COMPLETE QUEST: atomic XP/level/rank/streak math
CREATE OR REPLACE FUNCTION public.complete_quest(p_log_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID;
  v_today DATE := current_date;
  total_today INT;
  completed_today INT;
  xp_gain INT;
  prof public.profiles;
  leveled_up BOOLEAN := false;
  rank_changed BOOLEAN := false;
  old_rank TEXT;
  new_rank TEXT;
BEGIN
  -- mark completed (idempotent)
  UPDATE public.quest_logs
     SET status = 'completed', updated_at = now()
   WHERE log_id = p_log_id
   RETURNING user_id INTO v_user;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'log not found';
  END IF;

  IF v_user <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO total_today
    FROM public.quest_logs WHERE user_id = v_user AND checked_at = v_today;
  SELECT COUNT(*) INTO completed_today
    FROM public.quest_logs WHERE user_id = v_user AND checked_at = v_today AND status = 'completed';

  xp_gain := GREATEST(1, FLOOR(100.0 / GREATEST(total_today,1))::INT);

  SELECT * INTO prof FROM public.profiles WHERE user_id = v_user FOR UPDATE;
  old_rank := prof.current_rank;

  prof.current_xp := prof.current_xp + xp_gain;
  WHILE prof.current_xp >= 100 LOOP
    prof.current_xp := prof.current_xp - 100;
    prof.current_level := prof.current_level + 1;
    leveled_up := true;
  END LOOP;

  new_rank := public.rank_for_level(prof.current_level);
  IF new_rank <> old_rank THEN rank_changed := true; END IF;

  -- streak: if first completion today, and yesterday had a completion (or streak was 0), bump
  IF completed_today = 1 THEN
    IF prof.last_active_date = v_today - 1 THEN
      prof.current_streak := prof.current_streak + 1;
    ELSIF prof.last_active_date = v_today THEN
      -- already counted
      NULL;
    ELSE
      prof.current_streak := 1;
    END IF;
    prof.last_active_date := v_today;
  END IF;

  UPDATE public.profiles
     SET current_xp = prof.current_xp,
         current_level = prof.current_level,
         current_rank = new_rank,
         current_streak = prof.current_streak,
         last_active_date = prof.last_active_date,
         updated_at = now()
   WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'xp_gain', xp_gain,
    'leveled_up', leveled_up,
    'rank_changed', rank_changed,
    'new_level', prof.current_level,
    'new_xp', prof.current_xp,
    'new_rank', new_rank,
    'old_rank', old_rank,
    'streak', prof.current_streak,
    'total_today', total_today,
    'completed_today', completed_today
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.complete_quest(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spawn_daily_quest_logs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_inactivity_penalty(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.midnight_reset_all() TO anon, authenticated;

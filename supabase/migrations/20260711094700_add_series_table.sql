-- Step 14: User series watchlist items (same shape as movies, plus total_seasons)
CREATE TABLE IF NOT EXISTS public.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  genre_id smallint REFERENCES public.genres (id) ON DELETE SET NULL,
  year smallint,
  total_seasons smallint,
  status public.watch_status NOT NULL DEFAULT 'want_to_watch',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT series_year_check CHECK (year IS NULL OR (year >= 1888 AND year <= 2100)),
  CONSTRAINT series_total_seasons_check CHECK (total_seasons IS NULL OR total_seasons >= 1),
  CONSTRAINT series_position_check CHECK (position >= 0)
);

CREATE INDEX IF NOT EXISTS series_user_id_idx ON public.series (user_id);
CREATE INDEX IF NOT EXISTS series_user_id_position_idx ON public.series (user_id, position);
CREATE INDEX IF NOT EXISTS series_user_id_status_idx ON public.series (user_id, status);

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'series'
      AND policyname = 'Users can view their own series'
  ) THEN
    CREATE POLICY "Users can view their own series"
      ON public.series
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'series'
      AND policyname = 'Users can insert their own series'
  ) THEN
    CREATE POLICY "Users can insert their own series"
      ON public.series
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'series'
      AND policyname = 'Users can update their own series'
  ) THEN
    CREATE POLICY "Users can update their own series"
      ON public.series
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'series'
      AND policyname = 'Users can delete their own series'
  ) THEN
    CREATE POLICY "Users can delete their own series"
      ON public.series
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

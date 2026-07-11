-- Step 16: total episode count for series watchlist items
ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS total_episodes smallint;

ALTER TABLE public.series
  DROP CONSTRAINT IF EXISTS series_total_episodes_check;

ALTER TABLE public.series
  ADD CONSTRAINT series_total_episodes_check
  CHECK (total_episodes IS NULL OR total_episodes >= 1);

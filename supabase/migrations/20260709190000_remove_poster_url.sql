-- Movies no longer store poster images
ALTER TABLE public.movies DROP COLUMN IF EXISTS poster_url;

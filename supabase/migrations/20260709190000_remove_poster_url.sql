-- Movies and series no longer store poster images
ALTER TABLE public.movies DROP COLUMN IF EXISTS poster_url;
ALTER TABLE public.series DROP COLUMN IF EXISTS poster_url;

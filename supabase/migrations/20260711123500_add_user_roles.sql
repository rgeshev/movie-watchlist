-- Admin role support: app_role enum, is_admin() helper, and RLS policies

CREATE TYPE public.app_role AS ENUM ('user', 'admin');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'user';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'avatar_url',
    'user'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_last_admin_demotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  IF OLD.role = 'admin' AND NEW.role = 'user' THEN
    SELECT count(*)::integer
    INTO admin_count
    FROM public.profiles
    WHERE role = 'admin';

    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last admin.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_last_admin_demotion ON public.profiles;

CREATE TRIGGER profiles_prevent_last_admin_demotion
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_demotion();

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update own profile fields"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (public.is_admin() AND auth.uid() <> id);

CREATE POLICY "Admins can view all movies"
  ON public.movies
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all movies"
  ON public.movies
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete all movies"
  ON public.movies
  FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Admins can view all series"
  ON public.series
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all series"
  ON public.series
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete all series"
  ON public.series
  FOR DELETE
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  role public.app_role,
  created_at timestamptz,
  movie_count bigint,
  series_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    u.email::text,
    p.role,
    p.created_at,
    (SELECT count(*) FROM public.movies m WHERE m.user_id = p.id) AS movie_count,
    (SELECT count(*) FROM public.series s WHERE s.user_id = p.id) AS series_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE public.is_admin()
  ORDER BY p.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;

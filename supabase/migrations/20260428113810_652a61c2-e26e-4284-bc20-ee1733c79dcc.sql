
-- 1. Add student_code column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_code text UNIQUE;

-- 2. Code generator (8 uppercase chars)
CREATE OR REPLACE FUNCTION public.generate_student_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  exists_count int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    SELECT COUNT(*) INTO exists_count FROM public.profiles WHERE student_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$;

-- 3. Backfill existing profiles
UPDATE public.profiles SET student_code = public.generate_student_code() WHERE student_code IS NULL;

-- 4. Update handle_new_user to assign code on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, class_level, student_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'class_level',
    public.generate_student_code()
  );
  RETURN NEW;
END;
$$;

-- 5. student_links table
CREATE TABLE IF NOT EXISTS public.student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_id uuid NOT NULL,    -- parent or teacher
  student_id uuid NOT NULL,
  relation text NOT NULL DEFAULT 'parent', -- 'parent' | 'teacher'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (observer_id, student_id)
);

ALTER TABLE public.student_links ENABLE ROW LEVEL SECURITY;

-- 6. Helper: is observer linked to student
CREATE OR REPLACE FUNCTION public.is_linked_observer(_observer uuid, _student uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_links
    WHERE observer_id = _observer AND student_id = _student
  );
$$;

-- 7. RLS for student_links
CREATE POLICY "links observer manage own"
ON public.student_links
FOR ALL
TO authenticated
USING (observer_id = auth.uid())
WITH CHECK (observer_id = auth.uid());

CREATE POLICY "links student can view own"
ON public.student_links
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- 8. Extend profile read so linked observers can see linked student's profile
DROP POLICY IF EXISTS "profiles_observer_read" ON public.profiles;
CREATE POLICY "profiles_observer_read"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_linked_observer(auth.uid(), id));

-- 9. Extend concept_nodes read so linked observers can see student's concepts
DROP POLICY IF EXISTS "nodes_observer_read" ON public.concept_nodes;
CREATE POLICY "nodes_observer_read"
ON public.concept_nodes
FOR SELECT
TO authenticated
USING (public.is_linked_observer(auth.uid(), user_id));

-- 10. Extend sessions read so linked observers can see student's sessions
DROP POLICY IF EXISTS "sessions_observer_read" ON public.sessions;
CREATE POLICY "sessions_observer_read"
ON public.sessions
FOR SELECT
TO authenticated
USING (public.is_linked_observer(auth.uid(), user_id));

-- 11. Lookup helper to find a student by code (returns id + name only)
CREATE OR REPLACE FUNCTION public.find_student_by_code(_code text)
RETURNS TABLE (id uuid, full_name text, nickname text, class_level text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, nickname, class_level, role
  FROM public.profiles
  WHERE student_code = upper(_code) AND role = 'student'
  LIMIT 1;
$$;

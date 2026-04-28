-- 1. Add nickname to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname text;

-- 2. Classrooms
CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  subject text,
  join_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- 3. Memberships
CREATE TABLE IF NOT EXISTS public.classroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, student_id)
);
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cm_student ON public.classroom_members(student_id);
CREATE INDEX IF NOT EXISTS idx_cm_classroom ON public.classroom_members(classroom_id);

-- 4. Helper functions (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_classroom_teacher(_classroom_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.classrooms WHERE id = _classroom_id AND teacher_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_classroom_member(_classroom_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.classroom_members WHERE classroom_id = _classroom_id AND student_id = _user_id);
$$;

-- 5. Posts
CREATE TABLE IF NOT EXISTS public.classroom_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('link','note','file')),
  title text NOT NULL,
  body text,
  url text,
  file_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.classroom_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cp_classroom ON public.classroom_posts(classroom_id, created_at DESC);

-- 6. Policies — classrooms
CREATE POLICY "classrooms teacher manage own"
ON public.classrooms FOR ALL TO authenticated
USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "classrooms members can read"
ON public.classrooms FOR SELECT TO authenticated
USING (auth.uid() = teacher_id OR public.is_classroom_member(id, auth.uid()));

-- Public read by join code (lookup before joining) — anyone authenticated can see the basic row when they know the code.
CREATE POLICY "classrooms lookup by code"
ON public.classrooms FOR SELECT TO authenticated
USING (true);

-- 7. Policies — memberships
CREATE POLICY "members read own"
ON public.classroom_members FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.is_classroom_teacher(classroom_id, auth.uid()));

CREATE POLICY "members can join"
ON public.classroom_members FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "members can leave or teacher remove"
ON public.classroom_members FOR DELETE TO authenticated
USING (student_id = auth.uid() OR public.is_classroom_teacher(classroom_id, auth.uid()));

-- 8. Policies — posts
CREATE POLICY "posts teacher manage"
ON public.classroom_posts FOR ALL TO authenticated
USING (public.is_classroom_teacher(classroom_id, auth.uid()))
WITH CHECK (public.is_classroom_teacher(classroom_id, auth.uid()) AND author_id = auth.uid());

CREATE POLICY "posts members read"
ON public.classroom_posts FOR SELECT TO authenticated
USING (public.is_classroom_teacher(classroom_id, auth.uid()) OR public.is_classroom_member(classroom_id, auth.uid()));

-- 9. Storage bucket for classroom files
INSERT INTO storage.buckets (id, name, public)
VALUES ('classroom-files', 'classroom-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies — files are stored as `<classroom_id>/<filename>`.
CREATE POLICY "classroom files: teacher upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classroom-files'
  AND public.is_classroom_teacher((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY "classroom files: teacher delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'classroom-files'
  AND public.is_classroom_teacher((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY "classroom files: members read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom-files'
  AND (
    public.is_classroom_teacher((storage.foldername(name))[1]::uuid, auth.uid())
    OR public.is_classroom_member((storage.foldername(name))[1]::uuid, auth.uid())
  )
);
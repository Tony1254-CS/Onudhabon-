CREATE OR REPLACE FUNCTION public.is_student_in_teacher_class(_teacher_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classrooms c
    JOIN public.classroom_members cm ON cm.classroom_id = c.id
    WHERE c.teacher_id = _teacher_id
      AND cm.student_id = _student_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_student_in_teacher_class(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_student_in_teacher_class(uuid, uuid) TO authenticated;

CREATE POLICY "profiles classroom teacher read"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_student_in_teacher_class(auth.uid(), id));

CREATE POLICY "nodes classroom teacher read"
ON public.concept_nodes
FOR SELECT
TO authenticated
USING (public.is_student_in_teacher_class(auth.uid(), user_id));

CREATE POLICY "sessions classroom teacher read"
ON public.sessions
FOR SELECT
TO authenticated
USING (public.is_student_in_teacher_class(auth.uid(), user_id));

-- 1) Classrooms: remove public lookup, add secure RPC
DROP POLICY IF EXISTS "classrooms lookup by code" ON public.classrooms;

CREATE OR REPLACE FUNCTION public.find_classroom_by_code(_code text)
RETURNS TABLE(id uuid, name text, subject text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, subject
  FROM public.classrooms
  WHERE join_code = upper(_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_classroom_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_classroom_by_code(text) TO authenticated;

-- 2) Interventions: drop direct student UPDATE, add scoped RPCs
DROP POLICY IF EXISTS "interventions student update own" ON public.interventions;

CREATE OR REPLACE FUNCTION public.submit_intervention_response(_id uuid, _response text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF char_length(coalesce(_response, '')) > 5000 THEN
    RAISE EXCEPTION 'response too long';
  END IF;
  UPDATE public.interventions
     SET student_response = _response,
         submitted_at = now(),
         status = 'submitted',
         updated_at = now()
   WHERE id = _id
     AND student_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.submit_intervention_response(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_intervention_response(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_intervention(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  UPDATE public.interventions
     SET status = 'in_progress',
         updated_at = now()
   WHERE id = _id
     AND student_id = auth.uid()
     AND status = 'assigned';
END;
$$;

REVOKE ALL ON FUNCTION public.start_intervention(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_intervention(uuid) TO authenticated;

-- 3) Notifications: tighten insert policies (type whitelist + length limits)
DROP POLICY IF EXISTS "notif_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert_teacher_for_student" ON public.notifications;

CREATE POLICY "notif_insert_own"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND char_length(title) <= 200
    AND char_length(coalesce(body, '')) <= 1000
  );

CREATE POLICY "notif_insert_teacher_for_student"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() <> user_id
    AND public.is_student_in_teacher_class(auth.uid(), user_id)
    AND type IN ('teacher_message', 'intervention', 'goal_reminder', 'classroom_post')
    AND char_length(title) <= 200
    AND char_length(coalesce(body, '')) <= 1000
  );

-- 4) Storage: explicit UPDATE policy for classroom-files (teacher only)
DROP POLICY IF EXISTS "classroom files: teacher update" ON storage.objects;
CREATE POLICY "classroom files: teacher update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'classroom-files'
    AND public.is_classroom_teacher(((storage.foldername(name))[1])::uuid, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'classroom-files'
    AND public.is_classroom_teacher(((storage.foldername(name))[1])::uuid, auth.uid())
  );

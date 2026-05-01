-- Link notifications to interventions
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS intervention_id uuid REFERENCES public.interventions(id) ON DELETE CASCADE;

-- Allow teachers/parents to insert notifications for students they manage
DROP POLICY IF EXISTS "notif_insert_teacher_for_student" ON public.notifications;
CREATE POLICY "notif_insert_teacher_for_student"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.is_student_in_teacher_class(auth.uid(), user_id)
);

-- Add student response fields on interventions
ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS student_response text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

-- Allow students to update their own intervention (status / response only)
DROP POLICY IF EXISTS "interventions student update own" ON public.interventions;
CREATE POLICY "interventions student update own"
ON public.interventions
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE TABLE public.interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  concept text NOT NULL,
  subject text,
  weakness_reason text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  intervention_type text NOT NULL,
  suggested_action text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'assigned',
  mastery_before real,
  mastery_after real,
  retention_delta real,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  followup_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_interventions_student ON public.interventions(student_id);
CREATE INDEX idx_interventions_teacher ON public.interventions(teacher_id);
CREATE INDEX idx_interventions_status ON public.interventions(status);

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interventions teacher manage"
  ON public.interventions
  FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid() OR public.is_student_in_teacher_class(auth.uid(), student_id))
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "interventions student read own"
  ON public.interventions
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE TRIGGER trg_interventions_updated_at
  BEFORE UPDATE ON public.interventions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_concept_nodes_updated_at();


ALTER TABLE public.concept_nodes
  ADD COLUMN IF NOT EXISTS exposure real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS understanding real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS application real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retention real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS explanation_quality real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS challenge_score real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_accuracy real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retention_score real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hint_dependency real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retention_check timestamptz,
  ADD COLUMN IF NOT EXISTS retention_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.misconceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  concept text NOT NULL,
  subject text,
  statement text NOT NULL,
  tag text NOT NULL,
  weakness_type text NOT NULL DEFAULT 'conceptual',
  resolved boolean NOT NULL DEFAULT false,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_misconceptions_user ON public.misconceptions(user_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_concept ON public.misconceptions(concept);

ALTER TABLE public.misconceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "misconceptions select own"
  ON public.misconceptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "misconceptions insert own"
  ON public.misconceptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "misconceptions update own"
  ON public.misconceptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "misconceptions delete own"
  ON public.misconceptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "misconceptions teacher read"
  ON public.misconceptions FOR SELECT TO authenticated
  USING (public.is_student_in_teacher_class(auth.uid(), user_id));

CREATE POLICY "misconceptions observer read"
  ON public.misconceptions FOR SELECT TO authenticated
  USING (public.is_linked_observer(auth.uid(), user_id));

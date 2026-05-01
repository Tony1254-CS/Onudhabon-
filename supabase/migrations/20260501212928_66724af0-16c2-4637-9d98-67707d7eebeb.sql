-- Mastery engine: progressive concept state tracking
ALTER TABLE public.concept_nodes
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS confidence real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interaction_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS misconception_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prerequisites text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Constrain state values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'concept_nodes_state_check'
  ) THEN
    ALTER TABLE public.concept_nodes
      ADD CONSTRAINT concept_nodes_state_check
      CHECK (state IN ('unknown','exposed','developing','practiced','mastered','fragile'));
  END IF;
END $$;

-- Helpful index for decay sweeps
CREATE INDEX IF NOT EXISTS idx_concept_nodes_user_updated
  ON public.concept_nodes (user_id, updated_at);

-- Touch updated_at on row update
CREATE OR REPLACE FUNCTION public.touch_concept_nodes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_concept_nodes_updated_at ON public.concept_nodes;
CREATE TRIGGER trg_concept_nodes_updated_at
  BEFORE UPDATE ON public.concept_nodes
  FOR EACH ROW EXECUTE FUNCTION public.touch_concept_nodes_updated_at();
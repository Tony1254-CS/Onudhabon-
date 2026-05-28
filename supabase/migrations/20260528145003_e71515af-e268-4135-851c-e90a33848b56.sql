
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_sessions_user_updated
  ON public.sessions (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS sessions_touch_updated_at ON public.sessions;
CREATE TRIGGER sessions_touch_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_concept_nodes_updated_at();

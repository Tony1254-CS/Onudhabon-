UPDATE public.sessions SET updated_at = created_at WHERE updated_at > created_at + interval '1 minute' AND (messages IS NULL OR jsonb_array_length(COALESCE(messages, '[]'::jsonb)) = 0 OR updated_at::date = CURRENT_DATE);
-- Safer broad backfill: align updated_at with created_at for any rows where they appear bulk-touched
UPDATE public.sessions s
SET updated_at = created_at
WHERE abs(extract(epoch from (updated_at - (
  SELECT max(s2.updated_at) FROM public.sessions s2 WHERE s2.user_id = s.user_id
)))) < 2
AND updated_at <> created_at;
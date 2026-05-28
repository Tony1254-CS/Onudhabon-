
ALTER TABLE public.concept_nodes
  ADD COLUMN IF NOT EXISTS topic text;

-- Drop old uniqueness FIRST, since resetting subject would otherwise collide on it.
ALTER TABLE public.concept_nodes
  DROP CONSTRAINT IF EXISTS concept_nodes_user_subject_concept_unique;

UPDATE public.concept_nodes
  SET topic = subject
  WHERE topic IS NULL;

UPDATE public.concept_nodes
  SET subject = 'অন্যান্য'
  WHERE subject IS NULL
     OR subject NOT IN ('গণিত','পদার্থবিজ্ঞান','রসায়ন','জীববিজ্ঞান','বাংলা','ইংরেজি','আইসিটি','অন্যান্য');

-- Deduplicate rows that would conflict on the new key (keep newest by created_at).
DELETE FROM public.concept_nodes a
USING public.concept_nodes b
WHERE a.user_id = b.user_id
  AND a.topic IS NOT DISTINCT FROM b.topic
  AND a.concept = b.concept
  AND a.ctid    < b.ctid;

ALTER TABLE public.concept_nodes
  ADD CONSTRAINT concept_nodes_user_topic_concept_unique UNIQUE (user_id, topic, concept);

CREATE INDEX IF NOT EXISTS idx_concept_nodes_user_subject
  ON public.concept_nodes (user_id, subject);

UPDATE public.sessions s
  SET subject = cn.subject
  FROM public.concept_nodes cn
  WHERE s.subject IS NULL
    AND s.topic IS NOT NULL
    AND cn.user_id = s.user_id
    AND cn.topic   = s.topic
    AND cn.subject IS NOT NULL;

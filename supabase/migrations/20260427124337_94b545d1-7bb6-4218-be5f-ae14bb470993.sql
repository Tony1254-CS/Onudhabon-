ALTER TABLE public.concept_nodes
  ADD CONSTRAINT concept_nodes_user_subject_concept_unique
  UNIQUE (user_id, subject, concept);
ALTER TABLE public.concept_nodes REPLICA IDENTITY FULL;
ALTER TABLE public.sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.concept_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','parent')),
  class_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT,
  subject TEXT,
  cognitive_state TEXT,
  mastery_score REAL DEFAULT 0,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select_own" ON public.sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON public.sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON public.sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON public.sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Concept nodes
CREATE TABLE public.concept_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  subject TEXT,
  mastery_level REAL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 1),
  emotional_tag TEXT CHECK (emotional_tag IN ('gold','cold-blue','fragile')),
  last_reviewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.concept_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nodes_select_own" ON public.concept_nodes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "nodes_insert_own" ON public.concept_nodes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nodes_update_own" ON public.concept_nodes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "nodes_delete_own" ON public.concept_nodes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Demo cache (public read)
CREATE TABLE public.demo_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  response_data JSONB,
  mind_map_data JSONB,
  galaxy_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.demo_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_cache_public_read" ON public.demo_cache FOR SELECT TO anon, authenticated USING (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, class_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'class_level'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
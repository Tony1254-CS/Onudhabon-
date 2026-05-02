-- Concept dependency graph
CREATE TABLE IF NOT EXISTS public.concept_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concept TEXT NOT NULL,
  prerequisite TEXT NOT NULL,
  subject TEXT NOT NULL,
  strength REAL NOT NULL DEFAULT 0.8 CHECK (strength >= 0 AND strength <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (concept, prerequisite, subject)
);

CREATE INDEX IF NOT EXISTS idx_concept_relationships_concept ON public.concept_relationships (lower(concept));
CREATE INDEX IF NOT EXISTS idx_concept_relationships_prereq ON public.concept_relationships (lower(prerequisite));
CREATE INDEX IF NOT EXISTS idx_concept_relationships_subject ON public.concept_relationships (subject);

ALTER TABLE public.concept_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concept_relationships read all authed"
  ON public.concept_relationships
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "concept_relationships read all anon"
  ON public.concept_relationships
  FOR SELECT
  TO anon
  USING (true);

-- Seed: NCTB Physics chains
INSERT INTO public.concept_relationships (concept, prerequisite, subject, strength) VALUES
  -- Mechanics
  ('Velocity', 'Distance', 'Physics', 0.9),
  ('Velocity', 'Time', 'Physics', 0.9),
  ('Acceleration', 'Velocity', 'Physics', 0.95),
  ('Acceleration', 'Time', 'Physics', 0.85),
  ('Force', 'Mass', 'Physics', 0.9),
  ('Force', 'Acceleration', 'Physics', 0.95),
  ('Newton''s Second Law', 'Force', 'Physics', 0.95),
  ('Newton''s Second Law', 'Mass', 'Physics', 0.9),
  ('Newton''s Second Law', 'Acceleration', 'Physics', 0.9),
  ('Momentum', 'Mass', 'Physics', 0.9),
  ('Momentum', 'Velocity', 'Physics', 0.9),
  ('Work', 'Force', 'Physics', 0.9),
  ('Work', 'Distance', 'Physics', 0.85),
  ('Energy', 'Work', 'Physics', 0.9),
  ('Kinetic Energy', 'Mass', 'Physics', 0.85),
  ('Kinetic Energy', 'Velocity', 'Physics', 0.9),
  ('Potential Energy', 'Mass', 'Physics', 0.85),
  ('Potential Energy', 'Gravity', 'Physics', 0.9),
  ('Power', 'Work', 'Physics', 0.9),
  ('Power', 'Time', 'Physics', 0.85),
  -- Electricity
  ('Current', 'Charge', 'Physics', 0.9),
  ('Current', 'Time', 'Physics', 0.8),
  ('Voltage', 'Energy', 'Physics', 0.85),
  ('Voltage', 'Charge', 'Physics', 0.9),
  ('Resistance', 'Voltage', 'Physics', 0.85),
  ('Resistance', 'Current', 'Physics', 0.85),
  ('Ohm''s Law', 'Voltage', 'Physics', 0.95),
  ('Ohm''s Law', 'Current', 'Physics', 0.95),
  ('Ohm''s Law', 'Resistance', 'Physics', 0.95),
  ('Electric Power', 'Voltage', 'Physics', 0.9),
  ('Electric Power', 'Current', 'Physics', 0.9),
  -- Waves & Light
  ('Frequency', 'Time', 'Physics', 0.85),
  ('Wavelength', 'Frequency', 'Physics', 0.9),
  ('Wave Speed', 'Frequency', 'Physics', 0.9),
  ('Wave Speed', 'Wavelength', 'Physics', 0.9),
  ('Refraction', 'Wave Speed', 'Physics', 0.85),
  ('Reflection', 'Wave Speed', 'Physics', 0.8)
ON CONFLICT (concept, prerequisite, subject) DO NOTHING;

-- Seed: NCTB Chemistry chains
INSERT INTO public.concept_relationships (concept, prerequisite, subject, strength) VALUES
  ('Atom', 'Matter', 'Chemistry', 0.95),
  ('Element', 'Atom', 'Chemistry', 0.95),
  ('Molecule', 'Atom', 'Chemistry', 0.95),
  ('Compound', 'Element', 'Chemistry', 0.9),
  ('Compound', 'Molecule', 'Chemistry', 0.9),
  ('Electron Configuration', 'Atom', 'Chemistry', 0.9),
  ('Periodic Table', 'Element', 'Chemistry', 0.9),
  ('Periodic Table', 'Electron Configuration', 'Chemistry', 0.9),
  ('Ionic Bond', 'Electron Configuration', 'Chemistry', 0.9),
  ('Covalent Bond', 'Electron Configuration', 'Chemistry', 0.9),
  ('Chemical Bond', 'Ionic Bond', 'Chemistry', 0.85),
  ('Chemical Bond', 'Covalent Bond', 'Chemistry', 0.85),
  ('Mole', 'Atom', 'Chemistry', 0.9),
  ('Mole', 'Molecule', 'Chemistry', 0.9),
  ('Molar Mass', 'Mole', 'Chemistry', 0.95),
  ('Stoichiometry', 'Mole', 'Chemistry', 0.95),
  ('Stoichiometry', 'Chemical Equation', 'Chemistry', 0.9),
  ('Chemical Equation', 'Compound', 'Chemistry', 0.85),
  ('Acid', 'Ion', 'Chemistry', 0.9),
  ('Base', 'Ion', 'Chemistry', 0.9),
  ('pH', 'Acid', 'Chemistry', 0.9),
  ('pH', 'Base', 'Chemistry', 0.9),
  ('Neutralization', 'Acid', 'Chemistry', 0.9),
  ('Neutralization', 'Base', 'Chemistry', 0.9),
  ('Oxidation', 'Electron', 'Chemistry', 0.9),
  ('Reduction', 'Electron', 'Chemistry', 0.9),
  ('Redox Reaction', 'Oxidation', 'Chemistry', 0.95),
  ('Redox Reaction', 'Reduction', 'Chemistry', 0.95)
ON CONFLICT (concept, prerequisite, subject) DO NOTHING;
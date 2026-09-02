-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia: Podporené projekty (verejná prezentácia podľa rokov)
-- ============================================================

-- 1. Tabuľka supported_projects
CREATE TABLE IF NOT EXISTS public.supported_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  name TEXT NOT NULL,
  organizer TEXT,                 -- Organizátor projektu (farnosť, spoločenstvo…)
  realized_from DATE,             -- Realizovanie projektu od
  realized_to DATE,               -- Realizovanie projektu do
  description TEXT,
  amount NUMERIC(10,2),           -- Podporená suma v €
  support_type TEXT NOT NULL DEFAULT 'grant' CHECK (support_type IN ('grant', 'non_grant')),
  sort_order INTEGER NOT NULL DEFAULT 0,  -- Poradie v rámci roka
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.supported_projects IS 'Podporené projekty fondu KROK – verejná prezentácia rozdelená podľa rokov (grantová/negrantová podpora)';

-- 2. Indexy
CREATE INDEX IF NOT EXISTS idx_supported_projects_year ON public.supported_projects(year DESC, sort_order ASC);

-- 3. Automatické updated_at
CREATE TRIGGER trigger_supported_projects_updated_at
  BEFORE UPDATE ON public.supported_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Row Level Security
ALTER TABLE public.supported_projects ENABLE ROW LEVEL SECURITY;

-- 4.1 Verejnosť vidí len viditeľné projekty, admin všetko
CREATE POLICY "supported_projects_select_all" ON public.supported_projects
  FOR SELECT USING (visible = true OR is_admin());

-- 4.2 Iba admin môže vkladať, upravovať a mazať
CREATE POLICY "supported_projects_modify_admin" ON public.supported_projects
  FOR ALL USING (is_admin());

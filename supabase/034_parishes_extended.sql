-- 034: Register farností (návrh krok_navrh_farnosti.md § 3, fáza F1).
-- Rozšírenie parishes o úradné údaje, filiálky a štatistika veriacich, bohoslužby
-- (cez rok / letný režim, bežné / prvopiatkové), kňazi, predpis na rok, snapshot farnosti
-- na dare, prístupy farnosti a schvaľovanie chránených zmien.
-- Dáta naplní scripts/import-parishes.ts (schematizmus dcza.sk + CSV z FileMakeru).

-- ------------------------------------------------------------
-- 1. parishes – profil farnosti
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE parish_kind AS ENUM ('parish', 'chaplaincy', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.parishes
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS kind parish_kind NOT NULL DEFAULT 'parish',
  ADD COLUMN IF NOT EXISTS official_name TEXT,          -- názov podľa schematizmu dcza.sk
  ADD COLUMN IF NOT EXISTS patrocinium TEXT,
  ADD COLUMN IF NOT EXISTS parish_code TEXT,            -- 4-miestny diecézny kód
  ADD COLUMN IF NOT EXISTS ico TEXT,
  ADD COLUMN IF NOT EXISTS dic TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS administrator_name TEXT,
  ADD COLUMN IF NOT EXISTS administrator_since DATE,
  ADD COLUMN IF NOT EXISTS subdomain TEXT,
  ADD COLUMN IF NOT EXISTS feast_day DATE,              -- hody (CSV stĺpec 6)
  ADD COLUMN IF NOT EXISTS feast_day_note TEXT,
  ADD COLUMN IF NOT EXISTS adoration_date DATE,         -- výročná celodenná poklona (CSV stĺpec 14)
  ADD COLUMN IF NOT EXISTS adoration_note TEXT,         -- „1. septembrová nedeľa“ (schematizmus)
  ADD COLUMN IF NOT EXISTS consecration_date DATE,
  ADD COLUMN IF NOT EXISTS schematizmus_url TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS intro TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,                  -- interná poznámka, nezverejňuje sa
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_on_web BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS parishes_slug_key ON public.parishes (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS parishes_subdomain_key ON public.parishes (subdomain) WHERE subdomain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parishes_deanery ON public.parishes (deanery_id);

DROP TRIGGER IF EXISTS trigger_parishes_updated_at ON public.parishes;
CREATE TRIGGER trigger_parishes_updated_at BEFORE UPDATE ON public.parishes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verejne (anon / prihlásený darca) len bezpečné stĺpce – IČO, DIČ, IBAN, meno správcu
-- a interná poznámka sú len pre server (service role) a admin cez server actions.
REVOKE SELECT ON public.parishes FROM anon, authenticated;
GRANT SELECT (id, name, slug, kind, official_name, city, postal_code, deanery, deanery_id, is_active, visible_on_web, created_at)
  ON public.parishes TO anon, authenticated;

-- ------------------------------------------------------------
-- 2. Filiálky (obce) a štatistika veriacich
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parish_villages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_seat BOOLEAN NOT NULL DEFAULT false,
  district TEXT,
  church_name TEXT,
  has_church BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (parish_id, name)
);

CREATE TABLE IF NOT EXISTS public.parish_population_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id UUID NOT NULL REFERENCES public.parish_villages(id) ON DELETE CASCADE,
  year INT NOT NULL,
  population INT,
  catholics INT,
  source TEXT,                               -- 'SODB 2021' / 'schematizmus dcza.sk'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (village_id, year)
);

CREATE OR REPLACE VIEW public.v_parish_population WITH (security_invoker = true) AS
SELECT v.parish_id, s.year,
       SUM(s.population) AS population,
       SUM(s.catholics)  AS catholics,
       ROUND(100.0 * SUM(s.catholics) / NULLIF(SUM(s.population), 0), 2) AS catholic_pct
FROM public.parish_villages v
JOIN public.parish_population_stats s ON s.village_id = v.id
GROUP BY v.parish_id, s.year;

-- ------------------------------------------------------------
-- 3. Bohoslužby a spovedanie – cez rok / letný režim, bežné / prvopiatkové
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE parish_service_type AS ENUM ('mass', 'confession', 'adoration', 'devotion', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE parish_season AS ENUM ('regular', 'summer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE parish_occasion AS ENUM ('regular', 'first_friday');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.parish_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  season parish_season NOT NULL DEFAULT 'regular',
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (parish_id, season)
);

CREATE TABLE IF NOT EXISTS public.parish_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.parish_schedules(id) ON DELETE CASCADE,
  village_id UUID REFERENCES public.parish_villages(id) ON DELETE SET NULL,
  service_type parish_service_type NOT NULL DEFAULT 'mass',
  occasion parish_occasion NOT NULL DEFAULT 'regular',
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),   -- 0 = nedeľa … 6 = sobota
  day_label TEXT,
  time_from TIME,
  time_to TIME,
  relative_note TEXT,                        -- „30 minút pred sv. omšou“
  note TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  CHECK (day_of_week IS NOT NULL OR day_label IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_parish_schedule_items_schedule ON public.parish_schedule_items (schedule_id);

-- ------------------------------------------------------------
-- 4. Kňazi vo farnosti (prezentačný zoznam; menovanie mení diecéza)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parish_clergy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  title_before TEXT,
  title_after TEXT,
  position TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  since_date DATE,
  is_public BOOLEAN NOT NULL DEFAULT false,  -- súhlas so zverejnením kontaktu (GDPR)
  source TEXT,                               -- 'schematizmus dcza.sk'
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parish_clergy_parish ON public.parish_clergy (parish_id);

-- ------------------------------------------------------------
-- 5. Predpis na rok = katolíci × koeficient (O4, O14, O24)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parish_target_settings (
  year INT PRIMARY KEY,
  rate_per_catholic NUMERIC(8,4) NOT NULL,
  stats_year INT NOT NULL,
  rounding INT NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.parish_target_settings (year, rate_per_catholic, stats_year, note)
VALUES (2026, 2.0000, 2021, 'Koeficient 2 € na katolíka, štatistika SODB 2021 (O14, O24)')
ON CONFLICT (year) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.parish_year_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  year INT NOT NULL,
  catholics INT,
  rate_per_catholic NUMERIC(8,4),
  calculated_amount NUMERIC(12,2),
  prescribed_amount NUMERIC(12,2) NOT NULL,
  override_reason TEXT,
  visible_to_parish BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (parish_id, year)
);

-- ------------------------------------------------------------
-- 6. Snapshot farnosti na dare (O2) – nemení sa pri zmene farnosti darcu
-- ------------------------------------------------------------
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS parish_id UUID REFERENCES public.parishes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_donations_parish ON public.donations (parish_id);

-- Farnosť sa doplní z darcu pri vzniku daru a pri prepárovaní na iného darcu
CREATE OR REPLACE FUNCTION public.donation_set_parish()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.donor_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.parish_id IS NULL THEN
    SELECT parish_id INTO NEW.parish_id FROM donors WHERE id = NEW.donor_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.donor_id IS DISTINCT FROM OLD.donor_id THEN
    SELECT parish_id INTO NEW.parish_id FROM donors WHERE id = NEW.donor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_donation_set_parish ON public.donations;
CREATE TRIGGER trigger_donation_set_parish
  BEFORE INSERT OR UPDATE OF donor_id ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.donation_set_parish();

-- (backfill donations.parish_id robí import AŽ po vyčistení pseudo-farností – § 2)

-- ------------------------------------------------------------
-- 7. Prístup farnosti (O7), schvaľovanie chránených zmien (O6), audit
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE parish_user_role AS ENUM ('admin', 'editor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE parish_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.parish_users (
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role parish_user_role NOT NULL DEFAULT 'editor',
  position TEXT,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (parish_id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_parish_admin ON public.parish_users (parish_id) WHERE role = 'admin';

CREATE TABLE IF NOT EXISTS public.parish_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,                      -- 'parish' | 'population' | 'clergy'
  entity_id UUID,
  payload JSONB NOT NULL,
  status parish_request_status NOT NULL DEFAULT 'pending',
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_parish_change_requests_pending ON public.parish_change_requests (parish_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.parish_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,                      -- 'submit' | 'approve' | 'reject' | 'admin_update' | 'import'
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parish_change_log_parish ON public.parish_change_log (parish_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_parish_member(p_parish UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM parish_users WHERE parish_id = p_parish AND user_id = auth.uid());
$$;

-- ------------------------------------------------------------
-- 8. Plnenie farnosti – len agregáty (O3), nikdy anon
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_parish_year_summary WITH (security_invoker = true) AS
SELECT p.id AS parish_id,
       y.year,
       t.prescribed_amount,
       COUNT(DISTINCT d.donor_id)  AS donors_count,
       COUNT(d.id)                 AS donations_count,
       COALESCE(SUM(d.amount), 0)  AS collected_amount,
       ROUND(100.0 * COALESCE(SUM(d.amount), 0) / NULLIF(t.prescribed_amount, 0), 1) AS fulfillment_pct
FROM public.parishes p
CROSS JOIN generate_series(2019, EXTRACT(YEAR FROM now())::INT) AS y(year)
LEFT JOIN public.parish_year_targets t ON t.parish_id = p.id AND t.year = y.year
LEFT JOIN public.donations d ON d.parish_id = p.id AND d.year = y.year
GROUP BY p.id, y.year, t.prescribed_amount;

REVOKE ALL ON public.v_parish_year_summary FROM anon;
REVOKE ALL ON public.v_parish_population FROM anon;

-- ------------------------------------------------------------
-- 9. RLS – admin všetko; člen farnosti číta svoje (zápis cez server actions)
-- ------------------------------------------------------------
ALTER TABLE public.parish_villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_population_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_clergy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_target_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_year_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_change_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['parish_villages','parish_clergy','parish_schedules','parish_year_targets','parish_change_requests','parish_change_log','parish_users'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (is_admin()) WITH CHECK (is_admin())', t || '_admin_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_member_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (is_parish_member(parish_id))', t || '_member_select', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS parish_population_stats_admin_all ON public.parish_population_stats;
CREATE POLICY parish_population_stats_admin_all ON public.parish_population_stats FOR ALL USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS parish_population_stats_member_select ON public.parish_population_stats;
CREATE POLICY parish_population_stats_member_select ON public.parish_population_stats FOR SELECT
  USING (EXISTS (SELECT 1 FROM parish_villages v WHERE v.id = village_id AND is_parish_member(v.parish_id)));

DROP POLICY IF EXISTS parish_schedule_items_admin_all ON public.parish_schedule_items;
CREATE POLICY parish_schedule_items_admin_all ON public.parish_schedule_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS parish_schedule_items_member_select ON public.parish_schedule_items;
CREATE POLICY parish_schedule_items_member_select ON public.parish_schedule_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM parish_schedules s WHERE s.id = schedule_id AND is_parish_member(s.parish_id)));

DROP POLICY IF EXISTS parish_target_settings_admin_all ON public.parish_target_settings;
CREATE POLICY parish_target_settings_admin_all ON public.parish_target_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- 10. Oprávnenia RBAC
-- ------------------------------------------------------------
INSERT INTO public.permissions (id, name, description)
VALUES ('manage_parishes', 'Správa farností', 'Správa farností, filiálok, štatistiky, predpisov a schvaľovanie návrhov farností'),
       ('view_parishes', 'Prehľad farností', 'Čítanie prehľadu farností a plnenia')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
VALUES ('administrator', 'manage_parishes'), ('zamestnanec', 'manage_parishes'),
       ('administrator', 'view_parishes'), ('zamestnanec', 'view_parishes'),
       ('kuria', 'view_parishes'), ('kontrolor', 'view_parishes')
ON CONFLICT DO NOTHING;

-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia 025: Sponzori / partneri (pás „Podporili nás“ na domovskej stránke)
-- Vzor: tabuľka sponsors z lectio.one, bez i18n (Krok je len SK)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,                                   -- krátky popis / čo podporil
  logo_url TEXT,                                      -- logo na svetlý podklad (biela dlaždica)
  logo_dark_url TEXT,                                 -- voliteľne logo na tmavý podklad
  website_url TEXT,
  amount NUMERIC(12,2),                               -- výška podpory (interne)
  currency TEXT NOT NULL DEFAULT 'EUR',
  amount_public BOOLEAN NOT NULL DEFAULT false,       -- zobraziť sumu aj na webe
  publish_from DATE,                                  -- NULL = od hneď
  publish_until DATE,                                 -- NULL = bez konca
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sponsors IS 'Sponzori a partneri fondu KROK – pás „Podporili nás“ na domovskej stránke';

CREATE INDEX IF NOT EXISTS sponsors_published_idx
  ON public.sponsors (is_active, publish_from, publish_until, sort_order);

DROP TRIGGER IF EXISTS trigger_sponsors_updated_at ON public.sponsors;
CREATE TRIGGER trigger_sponsors_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: verejnosť vidí len aktívne a zverejnené, admin všetko
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsors_select_public" ON public.sponsors;
CREATE POLICY "sponsors_select_public" ON public.sponsors
  FOR SELECT USING (
    (is_active = true
      AND (publish_from IS NULL OR publish_from <= CURRENT_DATE)
      AND (publish_until IS NULL OR publish_until >= CURRENT_DATE))
    OR is_admin()
  );

DROP POLICY IF EXISTS "sponsors_modify_admin" ON public.sponsors;
CREATE POLICY "sponsors_modify_admin" ON public.sponsors
  FOR ALL USING (is_admin());

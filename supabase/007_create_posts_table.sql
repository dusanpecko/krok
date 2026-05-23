-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia: Vytvorenie tabuľky posts (Aktuality)
-- ============================================================

-- 1. Vytvorenie tabuľky posts
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,            -- URL obrázka na Backblaze B2
  audio_url TEXT,                 -- URL audio nahrávky z ElevenLabs na B2
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.posts IS 'Aktuality, správy a články pastoračného fondu KROK';

-- 2. Vytvorenie indexov pre rýchlejšie dopyty
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published ON public.posts(published_at DESC) WHERE status = 'published';

-- 3. Prepojenie so systémom automatického updated_at
CREATE TRIGGER trigger_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Nastavenie Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 4.1 Ktokoľvek (aj neprihlásený darca) môže vidieť publikované články. Admini vidia všetko.
CREATE POLICY "posts_select_all" ON public.posts
  FOR SELECT USING (status = 'published' OR is_admin());

-- 4.2 Iba admin môže vkladať, upravovať a mazať články
CREATE POLICY "posts_modify_admin" ON public.posts
  FOR ALL USING (is_admin());

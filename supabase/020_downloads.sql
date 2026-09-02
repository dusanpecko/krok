-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia: Na stiahnutie (dokumenty, výročné správy, logá) cez databázu
-- Súbory (PDF, DOCX, PNG…) sa ukladajú na Backblaze B2.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('document', 'annual_report', 'logo')),
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER,                    -- pre výročné správy
  image_url TEXT,                  -- ilustračný obrázok / náhľad loga
  files JSONB NOT NULL DEFAULT '[]',  -- [{"label": "PDF", "url": "https://..."}]
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.downloads IS 'Položky stránky Na stiahnutie – dokumenty, výročné správy a logá (súbory na Backblaze B2)';

CREATE INDEX IF NOT EXISTS idx_downloads_category ON public.downloads(category, sort_order ASC);

CREATE TRIGGER trigger_downloads_updated_at
  BEFORE UPDATE ON public.downloads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "downloads_select_all" ON public.downloads
  FOR SELECT USING (visible = true OR is_admin());

CREATE POLICY "downloads_modify_admin" ON public.downloads
  FOR ALL USING (is_admin());

-- Import existujúcich statických položiek zo stránky Na stiahnutie
INSERT INTO public.downloads (category, title, description, files, sort_order) VALUES
('document', 'Darovacia zmluva',
 'Vzor darovacej zmluvy pre poskytnutie finančného daru fondu KROK.',
 '[{"label": "PDF", "url": "/downloads/dokumenty/darovacia_zmluva.pdf"}]', 1),
('document', 'Súhlas s inkasom cez SIPO',
 'Žiadosť o inkasnú platbu vášho pravidelného daru prostredníctvom SIPO.',
 '[{"label": "DOCX", "url": "/downloads/dokumenty/SIPO_ziadost.docx"}]', 2);

INSERT INTO public.downloads (category, title, description, image_url, files, sort_order) VALUES
('logo', 'Základný logotyp',
 'Hlavná verzia loga fondu KROK.',
 '/downloads/logo/logo.png',
 '[{"label": "PNG", "url": "/downloads/logo/logo.png"}, {"label": "SVG", "url": "/downloads/logo/logo.svg"}, {"label": "PDF", "url": "/downloads/logo/logo.pdf"}, {"label": "AI", "url": "/downloads/logo/logo.ai"}]', 1),
('logo', 'Doplnkový logotyp',
 'Alternatívna verzia loga pre špecifické použitie.',
 '/downloads/logo/logo1.png',
 '[{"label": "PNG", "url": "/downloads/logo/logo1.png"}, {"label": "SVG", "url": "/downloads/logo/logo1.svg"}, {"label": "PDF", "url": "/downloads/logo/logo1.pdf"}, {"label": "AI", "url": "/downloads/logo/logo1.ai"}]', 2);

-- 036: Sociálne siete farnosti (YouTube, Facebook, Instagram, TikTok, Google Fotky…).
-- Zoznam [{ kind, url, label }] – farnosť ho mení sama (prezentácia, bez schvaľovania),
-- na verejnej stránke sa zobrazí pod „Farský úrad“. Validácia v lib/parishes/social.ts.

ALTER TABLE public.parishes
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$ BEGIN
  ALTER TABLE public.parishes
    ADD CONSTRAINT parishes_social_links_array CHECK (jsonb_typeof(social_links) = 'array');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 045: Fotogaléria – externé albumy (G6) a predvolená kvóta 1 GB (rozhodnutie 2026-10-08).

-- Album môže namiesto nahratých fotiek odkazovať na existujúci album (Facebook, Google Fotky, Zonerama…)
ALTER TABLE public.parish_albums ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Predvolená kvóta 1 GB (namiesto 100 MB); farnosti s nezmenenou predvolenou hodnotou sa zvýšia
ALTER TABLE public.parishes ALTER COLUMN gallery_quota_bytes SET DEFAULT 1073741824;
UPDATE public.parishes SET gallery_quota_bytes = 1073741824 WHERE gallery_quota_bytes = 104857600;

COMMENT ON COLUMN public.parishes.gallery_quota_bytes IS 'Kvóta úložiska fotogalérie (určuje diecéza, predvolene 1 GB)';

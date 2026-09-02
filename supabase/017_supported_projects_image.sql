-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia: Ilustračný obrázok podporeného projektu (Backblaze B2 URL)
-- ============================================================

ALTER TABLE public.supported_projects ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia: Pripnutie článkov (Aktuality)
-- Pripnuté články sa zobrazujú pred ostatnými, zoradené podľa pin_order,
-- zvyšok podľa dátumu publikovania.
-- ============================================================

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pin_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_pinned ON public.posts(pinned DESC, pin_order ASC) WHERE pinned = true;

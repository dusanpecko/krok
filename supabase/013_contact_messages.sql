-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migration: Tabuľka pre správy z kontaktného formulára
-- ============================================================
--
-- Predtým sa správy z /kontakt iba logovali do konzoly (strácali sa +
-- PII vo Vercel logoch). Teraz ich ukladáme do DB.
--
-- Zápis robí server action cez service_role (obíde RLS). Čítanie majú
-- len administrátori (politika nižšie); anon/authenticated nemajú prístup.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | read | archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx
  ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Len admin má prístup (čítanie/správa). Zápis ide cez service_role v akcii,
-- ktorý RLS obchádza, takže žiadnu anon INSERT politiku nepotrebujeme.
DROP POLICY IF EXISTS "contact_messages_admin_all" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_all" ON public.contact_messages
  FOR ALL USING (public.is_app_admin());

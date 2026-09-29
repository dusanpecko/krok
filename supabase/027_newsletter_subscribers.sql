-- 027: Prihlásenia na newsletter z webu.
-- Záznam je lokálna záloha a evidencia súhlasu; kontakt sa zároveň posiela do Brevo
-- (zoznam BREVO_LIST_ID). Zapisuje sa len cez server (service role) – verejné politiky nie sú.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  source TEXT,                         -- odkiaľ sa prihlásil (napr. 'footer')
  consent_text TEXT,                   -- znenie súhlasu v čase prihlásenia
  consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  donor_id UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  brevo_synced_at TIMESTAMPTZ,         -- NULL = do Brevo sa ešte nepodarilo odoslať
  brevo_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key
  ON public.newsletter_subscribers (lower(email));

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.newsletter_subscribers IS 'Prihlásenia na newsletter z webu (záloha + súhlas); synchronizované do Brevo';

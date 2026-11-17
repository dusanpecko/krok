-- 067: Podujatia – spoločný odkaz (QR kód) pre pozvánky poslané poštou.
-- Kto sa prihlási cez spoločný odkaz, pribudne medzi pozvaných (source = 'public') s vlastným odkazom na úpravu.

ALTER TABLE public.diocese_rsvp_events ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;  -- NULL = spoločný odkaz vypnutý
ALTER TABLE public.diocese_rsvp_invites ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'invite' CHECK (source IN ('invite', 'public'));

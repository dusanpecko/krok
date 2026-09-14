-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia 021: Online platby cez Mollie (jednorazové dary + pravidelné dary)
-- ============================================================
--
-- Tok:
--   1. Darca na webe zvolí sumu → server action založí platbu u Mollie a
--      zapíše riadok do online_payments (status 'open').
--   2. Mollie zavolá webhook (/api/mollie/webhook) alebo sa darca vráti na
--      /dakujeme?ref=<id> → appka stiahne stav z Mollie API a:
--        - pri 'paid' vloží dar do `donations` (payment_method = 'card_online'),
--        - pri prvej platbe pravidelného daru založí Mollie subscription.
--   3. Opakované platby (subscription) prichádzajú cez rovnaký webhook.
--
-- Peniaze z Mollie prichádzajú na účet hromadne (payout) – takú bankovú
-- transakciu NEPÁROVAŤ na darcu, dary sú už zaznamenané cez online_payments.
-- ============================================================

-- 1. Nový spôsob platby (nepoužíva sa v tejto migrácii – ADD VALUE nemôže byť
--    použitý v rovnakej transakcii, v ktorej bol pridaný).
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'card_online';

-- 2. Pravidelné dary (Mollie subscriptions)
CREATE TABLE IF NOT EXISTS public.online_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'mollie',
  mode TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  mollie_customer_id TEXT NOT NULL,
  mollie_subscription_id TEXT UNIQUE,          -- sub_xxx (NULL kým nie je zaplatená prvá platba)
  donor_id UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  donor_name TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  -- pending    = čaká na zaplatenie prvej platby
  -- activating = prvá platba zaplatená, zakladá sa Mollie subscription (zámok)
  -- active     = beží
  -- past_due   = posledná opakovaná platba zlyhala
  -- cancelled  = zrušené (darcom, adminom alebo neúspešnou prvou platbou)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'activating', 'active', 'past_due', 'cancelled')),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  next_payment_at DATE,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.online_subscriptions IS 'Pravidelné online dary (Mollie subscriptions)';

CREATE INDEX IF NOT EXISTS idx_online_subscriptions_donor ON public.online_subscriptions(donor_id);
CREATE INDEX IF NOT EXISTS idx_online_subscriptions_user ON public.online_subscriptions(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_online_subscriptions_email ON public.online_subscriptions(lower(email));
CREATE INDEX IF NOT EXISTS idx_online_subscriptions_status ON public.online_subscriptions(status);

CREATE TRIGGER trigger_online_subscriptions_updated_at
  BEFORE UPDATE ON public.online_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Online platby (každá Mollie platba – jednorazová, prvá aj opakovaná)
CREATE TABLE IF NOT EXISTS public.online_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'mollie',
  mode TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  mollie_payment_id TEXT UNIQUE NOT NULL,      -- tr_xxx
  mollie_customer_id TEXT,
  mollie_subscription_id TEXT,
  -- one_time        = jednorazový dar
  -- recurring_first = prvá platba pravidelného daru (vytvára mandát)
  -- recurring       = opakovaná platba z Mollie subscription
  kind TEXT NOT NULL CHECK (kind IN ('one_time', 'recurring_first', 'recurring')),
  status TEXT NOT NULL DEFAULT 'open',         -- Mollie stav: open/pending/authorized/paid/failed/canceled/expired
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  method TEXT,                                 -- card, applepay, ... (z Mollie)
  description TEXT,
  donor_id UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  donor_name TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  online_subscription_id UUID REFERENCES public.online_subscriptions(id) ON DELETE SET NULL,
  donation_id UUID REFERENCES public.donations(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.online_payments IS 'Online platby cez Mollie – log každej platby (jednorazové aj opakované)';

CREATE INDEX IF NOT EXISTS idx_online_payments_donor ON public.online_payments(donor_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_user ON public.online_payments(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_status ON public.online_payments(status);
CREATE INDEX IF NOT EXISTS idx_online_payments_subscription ON public.online_payments(online_subscription_id);
CREATE INDEX IF NOT EXISTS idx_online_payments_created ON public.online_payments(created_at DESC);

CREATE TRIGGER trigger_online_payments_updated_at
  BEFORE UPDATE ON public.online_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Väzba dar → online platba (UNIQUE = idempotencia: jedna platba = jeden dar)
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS online_payment_id UUID UNIQUE
    REFERENCES public.online_payments(id) ON DELETE SET NULL;

-- 5. RLS
ALTER TABLE public.online_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_payments ENABLE ROW LEVEL SECURITY;

-- Admin vidí a spravuje všetko
CREATE POLICY "online_subscriptions_admin_all" ON public.online_subscriptions
  FOR ALL USING (is_admin());

CREATE POLICY "online_payments_admin_all" ON public.online_payments
  FOR ALL USING (is_admin());

-- Darca vidí len svoje (zápis robí výhradne server cez service_role)
CREATE POLICY "online_subscriptions_select_own" ON public.online_subscriptions
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR donor_id IN (SELECT id FROM public.donors WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "online_payments_select_own" ON public.online_payments
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR donor_id IN (SELECT id FROM public.donors WHERE auth_user_id = auth.uid())
  );

-- Anon nemá k tabuľkám žiadny prístup
REVOKE ALL ON public.online_subscriptions FROM anon;
REVOKE ALL ON public.online_payments FROM anon;

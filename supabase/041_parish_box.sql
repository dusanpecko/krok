-- 041: E-zvonček farnosti (e-pokladnička) – návrh krok_navrh_farnosti.md § 12, rozhodnutia O31–O38.
-- Darca daruje farnosti online (Mollie, jednorazovo alebo mesačne); peniaze prijme fond a mesačne
-- ich po odpočítaní poplatkov (Mollie % + fond %, nastaviteľné pre každú farnosť) pošle farnosti na IBAN.
--
-- Dary do e-zvončeka sú ZÁMERNE v samostatnej tabuľke parish_box_gifts, nie v donations:
-- nerátajú sa do plnenia predpisu ani do štatistík fondu (O32). Zapína ho len diecéza.
-- Všetko sa číta a zapisuje cez server (service role) – verejné politiky nie sú.

-- ------------------------------------------------------------
-- 1. Predvolené poplatky diecézy (jeden riadok) – predvyplnia sa pri zapnutí e-zvončeka farnosti
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parish_box_defaults (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mollie_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 2.00 CHECK (mollie_fee_pct BETWEEN 0 AND 100),
  fund_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (fund_fee_pct BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.parish_box_defaults (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Nastavenie e-zvončeka farnosti (zapína a poplatky určuje diecéza)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parish_box_settings (
  parish_id UUID PRIMARY KEY REFERENCES public.parishes(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  mollie_fee_pct NUMERIC(5,2) NOT NULL CHECK (mollie_fee_pct BETWEEN 0 AND 100),
  fund_fee_pct NUMERIC(5,2) NOT NULL CHECK (fund_fee_pct BETWEEN 0 AND 100),
  title TEXT,                                -- nadpis na stránke farnosti (predvolene „Podporte našu farnosť“)
  description TEXT,                          -- krátky text pre darcov
  enabled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 3. Účel online platby / pravidelného daru: fond (doterajšie) alebo e-zvonček farnosti
-- ------------------------------------------------------------
ALTER TABLE public.online_payments
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'fund' CHECK (purpose IN ('fund', 'parish_box')),
  ADD COLUMN IF NOT EXISTS box_parish_id UUID REFERENCES public.parishes(id) ON DELETE SET NULL;
ALTER TABLE public.online_subscriptions
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'fund' CHECK (purpose IN ('fund', 'parish_box')),
  ADD COLUMN IF NOT EXISTS box_parish_id UUID REFERENCES public.parishes(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 4. Výplaty farnostiam (mesačné vyúčtovanie, O33) – percentá a IBAN ako snapshot
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parish_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE RESTRICT,
  period_month DATE NOT NULL,                -- prvý deň mesiaca, za ktorý sa vypláca
  gift_count INTEGER NOT NULL,
  gross_amount NUMERIC(12,2) NOT NULL,
  mollie_fee_pct NUMERIC(5,2) NOT NULL,
  fund_fee_pct NUMERIC(5,2) NOT NULL,
  mollie_fee NUMERIC(12,2) NOT NULL,
  fund_fee NUMERIC(12,2) NOT NULL,
  net_amount NUMERIC(12,2) NOT NULL,
  iban TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent')),
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (parish_id, period_month)
);
CREATE INDEX IF NOT EXISTS idx_parish_payouts_period ON public.parish_payouts (period_month);

-- ------------------------------------------------------------
-- 5. Dary do e-zvončeka (jeden riadok = jedna zaplatená Mollie platba)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parish_box_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES public.parishes(id) ON DELETE RESTRICT,
  online_payment_id UUID NOT NULL UNIQUE REFERENCES public.online_payments(id) ON DELETE RESTRICT,  -- idempotencia
  -- Bez cudzích kľúčov na predplatné a darcu: tabuľka by sa inak pre PostgREST stala „spojovacou“
  -- (online_payments ↔ donors / online_subscriptions) a existujúce dopyty s donors(...) by boli nejednoznačné.
  online_subscription_id UUID,
  kind TEXT NOT NULL CHECK (kind IN ('one_time', 'recurring_first', 'recurring')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at TIMESTAMPTZ NOT NULL,
  donor_id UUID,                             -- len ak daroval prihlásený darca (bez FK – viď vyššie)
  auth_user_id UUID,
  email TEXT,
  donor_name TEXT,
  payout_id UUID REFERENCES public.parish_payouts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parish_box_gifts_parish ON public.parish_box_gifts (parish_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_parish_box_gifts_unpaid ON public.parish_box_gifts (paid_at) WHERE payout_id IS NULL;

ALTER TABLE public.online_payments
  ADD COLUMN IF NOT EXISTS parish_box_gift_id UUID REFERENCES public.parish_box_gifts(id) ON DELETE SET NULL;

ALTER TABLE public.parish_box_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_box_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parish_box_gifts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.parish_box_settings IS 'E-zvonček farnosti: zapnutie a poplatky (určuje diecéza, O33)';
COMMENT ON TABLE public.parish_box_gifts IS 'Dary do e-zvončeka farnosti – mimo donations, nerátajú sa do predpisu (O32)';
COMMENT ON TABLE public.parish_payouts IS 'Mesačné výplaty e-zvončeka farnostiam (SEPA XML / Excel)';

-- ------------------------------------------------------------
-- 6. E-mailová šablóna – poďakovanie za dar do e-zvončeka
-- ------------------------------------------------------------
INSERT INTO public.email_templates (template_key, name, description, category, subject, body, available_variables) VALUES (
  'parish_box_gift',
  'Dar pre farnosť (e-zvonček)',
  'Po zaplatení daru do e-zvončeka farnosti – jednorazového aj prvej platby pravidelného.',
  'donation',
  'Ďakujeme za Váš dar pre {{parish_name}}',
  '<p>Dobrý deň{{#has_name}}, {{first_name}}{{/has_name}},</p>
<p>ďakujeme za Váš dar <strong>{{amount}}</strong> pre <strong>{{parish_name}}</strong>, ktorý sme prijali {{donation_date}}.</p>
{{#is_recurring}}<p>Zvolili ste pravidelný dar – ďalšie platby budú prebiehať automaticky {{interval}}.{{#is_registered}} Zmeniť alebo zrušiť ho môžete vo svojom <a href="{{profile_url}}">profile</a>.{{/is_registered}}{{^is_registered}} Ak ho budete chcieť zrušiť, napíšte nám odpoveďou na tento e-mail.{{/is_registered}}</p>{{/is_recurring}}
<p>Dary z e-zvončeka Pastoračný fond KROK každý mesiac odovzdáva farnosti. Ďakujeme, že podporujete život svojej farnosti.</p>
<p><a href="{{parish_url}}">Stránka farnosti</a></p>
<p>S vďakou a modlitbou,<br>tím Pastoračného fondu KROK</p>',
  '["{{first_name}}", "{{#has_name}}", "{{email}}", "{{amount}}", "{{donation_date}}", "{{parish_name}}", "{{parish_url}}", "{{interval}}", "{{#is_recurring}}", "{{#is_registered}}", "{{profile_url}}", "{{site_url}}"]'::jsonb
) ON CONFLICT (template_key) DO NOTHING;

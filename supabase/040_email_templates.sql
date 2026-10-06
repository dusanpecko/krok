-- 040: E-mailové šablóny (texty e-mailov upraviteľné v admine bez programovania) + log odoslaných e-mailov.
-- Prevzaté z lectio.one (email_templates), zjednodušené na slovenčinu. Odosiela sa cez Brevo
-- (transakčné API, BREVO_API_KEY). Čítanie aj zápis len cez server (service role) – verejné politiky nie sú.
--
-- Premenné v predmete aj tele: {{first_name}}, {{amount}} …
-- Podmienené bloky: {{#is_recurring}}…{{/is_recurring}} (zobrazí sa, ak je premenná vyplnená/pravdivá),
--                   {{^is_recurring}}…{{/is_recurring}} (zobrazí sa, ak NIE je).

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,      -- kľúč, podľa ktorého šablónu hľadá kód (napr. 'donor_welcome')
  name TEXT NOT NULL,
  description TEXT,                       -- kedy sa e-mail posiela
  category TEXT NOT NULL,                 -- 'account' | 'donation' | 'newsletter'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,                     -- HTML obsah (bez hlavičky a pätičky – tie pridá kód)
  available_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  from_email TEXT NOT NULL DEFAULT 'mojkrok@dcza.sk',
  from_name TEXT NOT NULL DEFAULT 'Pastoračný fond KROK',
  reply_to TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sent_count INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates (category);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  template_key TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  donor_id UUID REFERENCES public.donors(id) ON DELETE SET NULL,
  donation_id UUID REFERENCES public.donations(id) ON DELETE SET NULL,
  is_test BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs (template_key);
CREATE INDEX IF NOT EXISTS idx_email_logs_donor ON public.email_logs (donor_id);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Počítadlo odoslaní (atomicky, bez read-modify-write v aplikácii)
CREATE OR REPLACE FUNCTION public.increment_email_sent_count(p_template_key TEXT)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.email_templates
  SET sent_count = sent_count + 1, last_sent_at = now()
  WHERE template_key = p_template_key;
$$;

REVOKE ALL ON FUNCTION public.increment_email_sent_count(TEXT) FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.email_templates IS 'Texty automatických e-mailov (upraviteľné v /admin/emaily)';
COMMENT ON TABLE public.email_logs IS 'Log odoslaných automatických e-mailov';

-- === Predvolené šablóny ===
-- Spoločné premenné: {{first_name}}, {{last_name}}, {{full_name}}, {{email}}, {{site_url}}, {{profile_url}}
INSERT INTO public.email_templates (template_key, name, description, category, subject, body, available_variables) VALUES

(
  'donor_welcome',
  'Vitajte po registrácii',
  'Po registrácii darcu (e-mailom aj cez Google) – keď si prvýkrát otvorí profil.',
  'account',
  'Vitajte v KROKu, {{first_name}}',
  '<p>Milý/á {{first_name}},</p>
<p>ďakujeme, že ste sa zaregistrovali v Pastoračnom fonde <strong>KROK</strong>. Sme radi, že ste s nami – každý krok, aj ten najmenší, pomáha budovať živé spoločenstvo našej diecézy.</p>
<p>Váš variabilný symbol je <strong>{{variable_symbol}}</strong>. Uvádzajte ho prosím pri každom dare bankovým prevodom, aby sme ho vedeli priradiť k Vám.</p>
<p>Vo svojom profile vidíte svoje dary, môžete si upraviť údaje alebo nastaviť pravidelný dar:</p>
<p><a href="{{profile_url}}">Otvoriť môj profil</a></p>
<p>S vďakou a modlitbou,<br>tím Pastoračného fondu KROK</p>',
  '["{{first_name}}", "{{last_name}}", "{{full_name}}", "{{email}}", "{{variable_symbol}}", "{{profile_url}}", "{{site_url}}"]'::jsonb
),

(
  'donation_one_time',
  'Jednorazový dar – registrovaný darca',
  'Po zaplatení jednorazového online daru kartou do fondu (darca má účet).',
  'donation',
  'Ďakujeme za Váš dar {{amount}}',
  '<p>Milý/á {{first_name}},</p>
<p>z celého srdca ďakujeme za Váš dar <strong>{{amount}}</strong> pre Pastoračný fond KROK, ktorý sme prijali {{donation_date}}.</p>
<p>Vaša štedrosť pomáha kňazom, farnostiam a pastoračným projektom v Žilinskej diecéze. Pamätáme na Vás v modlitbách.</p>
<p>Prehľad všetkých svojich darov nájdete vo svojom profile:</p>
<p><a href="{{profile_url}}">Moje dary</a></p>
<p>S vďakou,<br>tím Pastoračného fondu KROK</p>',
  '["{{first_name}}", "{{last_name}}", "{{full_name}}", "{{email}}", "{{amount}}", "{{donation_date}}", "{{variable_symbol}}", "{{profile_url}}", "{{site_url}}"]'::jsonb
),

(
  'donation_recurring',
  'Pravidelný dar – registrovaný darca',
  'Po zaplatení prvej platby pravidelného online daru do fondu (darca má účet). Ďalšie mesačné platby e-mail neposielajú.',
  'donation',
  'Ďakujeme za Váš pravidelný dar',
  '<p>Milý/á {{first_name}},</p>
<p>ďakujeme, že ste sa rozhodli podporovať Pastoračný fond KROK <strong>pravidelne</strong>. Prvú platbu <strong>{{amount}}</strong> sme prijali {{donation_date}}.</p>
<p>Ďalšie platby vo výške {{amount}} budú prebiehať automaticky <strong>{{interval}}</strong>, najbližšia približne {{next_payment_date}}.</p>
<p>Pravidelný dar je pre nás veľmi vzácny – umožňuje nám plánovať a dlhodobo pomáhať. Kedykoľvek ho môžete zmeniť alebo zrušiť vo svojom profile:</p>
<p><a href="{{profile_url}}">Spravovať pravidelný dar</a></p>
<p>S vďakou a modlitbou,<br>tím Pastoračného fondu KROK</p>',
  '["{{first_name}}", "{{last_name}}", "{{full_name}}", "{{email}}", "{{amount}}", "{{donation_date}}", "{{interval}}", "{{next_payment_date}}", "{{variable_symbol}}", "{{profile_url}}", "{{site_url}}"]'::jsonb
),

(
  'donation_project',
  'Dar na výzvu (projekt)',
  'Po zaplatení online daru na konkrétnu výzvu / projekt – jednorazového aj prvej platby pravidelného, s účtom aj bez.',
  'donation',
  'Ďakujeme za podporu výzvy {{project_name}}',
  '<p>Milý/á {{first_name}},</p>
<p>ďakujeme za Váš dar <strong>{{amount}}</strong> na výzvu <strong>{{project_name}}</strong>, ktorý sme prijali {{donation_date}}.</p>
{{#is_recurring}}<p>Zvolili ste pravidelný dar – ďalšie platby budú prebiehať automaticky {{interval}}.</p>{{/is_recurring}}
<p>Vďaka Vám môže táto výzva napredovať. O jej priebehu sa dočítate tu:</p>
<p><a href="{{project_url}}">Pozrieť výzvu</a></p>
{{#is_registered}}<p>Svoje dary nájdete vo svojom <a href="{{profile_url}}">profile</a>.</p>{{/is_registered}}
{{^is_registered}}<p>Ak si vytvoríte účet s týmto e-mailom, uvidíte v ňom všetky svoje dary: <a href="{{register_url}}">Registrovať sa</a></p>{{/is_registered}}
<p>S vďakou,<br>tím Pastoračného fondu KROK</p>',
  '["{{first_name}}", "{{last_name}}", "{{full_name}}", "{{email}}", "{{amount}}", "{{donation_date}}", "{{project_name}}", "{{project_url}}", "{{interval}}", "{{#is_recurring}}", "{{#is_registered}}", "{{profile_url}}", "{{register_url}}", "{{site_url}}"]'::jsonb
),

(
  'donation_anonymous',
  'Dar bez registrácie',
  'Po zaplatení online daru do fondu darcom bez účtu (jednorazového aj prvej platby pravidelného).',
  'donation',
  'Ďakujeme za Váš dar {{amount}}',
  '<p>Dobrý deň{{#has_name}}, {{first_name}}{{/has_name}},</p>
<p>ďakujeme za Váš dar <strong>{{amount}}</strong> pre Pastoračný fond KROK, ktorý sme prijali {{donation_date}}.</p>
{{#is_recurring}}<p>Zvolili ste pravidelný dar – ďalšie platby budú prebiehať automaticky {{interval}}. Ak ho budete chcieť zmeniť alebo zrušiť, napíšte nám odpoveďou na tento e-mail.</p>{{/is_recurring}}
<p>Ak si vytvoríte účet s týmto e-mailom, uvidíte v ňom prehľad všetkých svojich darov{{#is_recurring}} a pravidelný dar si budete vedieť spravovať sami{{/is_recurring}}:</p>
<p><a href="{{register_url}}">Vytvoriť účet</a></p>
<p>S vďakou a modlitbou,<br>tím Pastoračného fondu KROK</p>',
  '["{{first_name}}", "{{full_name}}", "{{email}}", "{{amount}}", "{{donation_date}}", "{{interval}}", "{{#is_recurring}}", "{{#has_name}}", "{{register_url}}", "{{site_url}}"]'::jsonb
),

(
  'newsletter_welcome',
  'Prihlásenie na newsletter',
  'Po prihlásení na newsletter z webu (len pri novom prihlásení, nie pri opakovanom).',
  'newsletter',
  'Vitajte medzi odberateľmi noviniek KROK',
  '<p>Dobrý deň{{#has_name}}, {{first_name}}{{/has_name}},</p>
<p>ďakujeme za prihlásenie na odber noviniek Pastoračného fondu <strong>KROK</strong>. Občas Vám pošleme správu o tom, čo sa vďaka darcom podarilo, a o nových výzvach na podporu.</p>
<p>Odhlásiť sa môžete kedykoľvek cez odkaz v päte každého newslettera.</p>
<p><a href="{{site_url}}">Navštíviť web KROK</a></p>
<p>S pozdravom,<br>tím Pastoračného fondu KROK</p>',
  '["{{first_name}}", "{{#has_name}}", "{{email}}", "{{site_url}}"]'::jsonb
)

ON CONFLICT (template_key) DO NOTHING;

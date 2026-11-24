-- 069: Prístup do správy farnosti podľa schematizmu (farár / administrátor → správca, farský vikár → editor).
-- Riadky parish_users zo schematizmu majú source = 'clergy' a clergy_id; synchronizácia (lib/parishes/clergy-access.ts)
-- ich pridáva a odoberá podľa aktuálnych pôsobení. Ručne pridelené prístupy (source = 'manual') nemení.
-- Nové šablóny e-mailov: pridelenie a zmena prístupu. Odkazy a texty prístupu do farnosti → dcza.sk.

ALTER TABLE public.parish_users ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.parish_users DROP CONSTRAINT IF EXISTS parish_users_source_check;
ALTER TABLE public.parish_users ADD CONSTRAINT parish_users_source_check CHECK (source IN ('manual', 'clergy'));
ALTER TABLE public.parish_users ADD COLUMN IF NOT EXISTS clergy_id UUID REFERENCES public.clergy(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_parish_users_clergy ON public.parish_users (clergy_id) WHERE clergy_id IS NOT NULL;

COMMENT ON COLUMN public.parish_users.source IS 'manual = pridelil admin ručne; clergy = zo schematizmu (pôsobenie farár / administrátor / farský vikár)';

-- 1. Pridelenie prístupu (nový kňaz vo farnosti)
INSERT INTO public.email_templates (template_key, name, description, category, subject, body, available_variables, from_email, from_name, is_active)
SELECT 'parish_access_clergy_granted',
       'Prístup do správy farnosti (podľa schematizmu)',
       'Kňaz dostal prístup do správy farnosti, lebo je v schematizme farárom, administrátorom alebo farským vikárom farnosti.',
       t.category,
       'Prístup do správy farnosti – {{parishes}}',
       $b$<p>{{salutation}},</p>
<p>podľa schematizmu Žilinskej diecézy pôsobíte vo farnosti <strong>{{parishes}}</strong>. Preto sme Vám pridelili prístup do <strong>správy farnosti</strong> na stránke dcza.sk ({{role_label}}).</p>
<p>V správe farnosti môžete:</p>
<ul>
<li>upravovať verejnú stránku farnosti – rozpis svätých omší, úradné hodiny, oznamy a aktuality,</li>
<li>pridávať fotografie do galérie farnosti,</li>
<li>navrhnúť opravu úradných údajov a štatistiky farnosti.</li>
</ul>
<p><strong>Ako sa prihlásiť:</strong> otvorte odkaz nižšie a kliknite na tlačidlo <strong>„Prihlásiť sa cez Google“</strong>. Vyberte svoj diecézny účet <strong>{{email}}</strong> – ten istý, ktorým sa prihlasujete do pošty. Žiadne ďalšie heslo nepotrebujete.</p>
<p><a href="{{login_url}}">Prihlásiť sa do správy farnosti</a></p>
<p>Neskôr sa do správy farnosti dostanete cez menu svojho účtu vpravo hore – <strong>Správa farnosti</strong>. Návody nájdete priamo v správe farnosti v časti <strong>Pomoc</strong>.</p>
<p>Prístup sa riadi schematizmom: keď sa zmení Vaše pôsobenie, zmení sa aj prístup a dáme Vám vedieť.</p>
<p>V prípade otázok nás kontaktujte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a>.</p>
<p>S úctou</p>
<p>Mgr. Dušan Pecko</p>
<p>Rímskokatolícka cirkev<br>Žilinská diecéza<br>Jána Kalinčiaka 1<br>010 01 Žilina</p>$b$,
       '["{{salutation}}", "{{parishes}}", "{{role_label}}", "{{email}}", "{{login_url}}", "{{site_url}}"]'::jsonb,
       t.from_email, t.from_name, true
FROM public.email_templates t WHERE t.template_key = 'parish_access_google'
ON CONFLICT (template_key) DO NOTHING;

-- 2. Zmena prístupu (preloženie, ukončenie pôsobenia)
INSERT INTO public.email_templates (template_key, name, description, category, subject, body, available_variables, from_email, from_name, is_active)
SELECT 'parish_access_clergy_changed',
       'Zmena prístupu do správy farnosti (podľa schematizmu)',
       'Kňazovi sa zmenilo pôsobenie v schematizme – prístup k doterajšej farnosti zanikol a/alebo pribudol k novej.',
       t.category,
       'Zmena prístupu do správy farnosti',
       $b$<p>{{salutation}},</p>
<p>podľa zmeny v schematizme Žilinskej diecézy sme upravili Váš prístup do <strong>správy farnosti</strong> na stránke dcza.sk.</p>
{{#parishes_removed}}<p>Prístup k farnosti <strong>{{parishes_removed}}</strong> bol ukončený.</p>{{/parishes_removed}}
{{#parishes_added}}<p>Nový prístup máte k farnosti <strong>{{parishes_added}}</strong> ({{role_label}}).</p>
<p><strong>Ako sa prihlásiť:</strong> otvorte odkaz nižšie a kliknite na tlačidlo <strong>„Prihlásiť sa cez Google“</strong>. Vyberte svoj diecézny účet <strong>{{email}}</strong>.</p>
<p><a href="{{login_url}}">Prihlásiť sa do správy farnosti</a></p>{{/parishes_added}}
<p>Ak niečo nesedí, napíšte nám na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a>.</p>
<p>S úctou</p>
<p>Mgr. Dušan Pecko</p>
<p>Rímskokatolícka cirkev<br>Žilinská diecéza<br>Jána Kalinčiaka 1<br>010 01 Žilina</p>$b$,
       '["{{salutation}}", "{{#parishes_added}}", "{{#parishes_removed}}", "{{role_label}}", "{{email}}", "{{login_url}}", "{{site_url}}"]'::jsonb,
       t.from_email, t.from_name, true
FROM public.email_templates t WHERE t.template_key = 'parish_access_google'
ON CONFLICT (template_key) DO NOTHING;

-- 3. Ručný prístup (farská schránka a pod.) – správa farnosti je na dcza.sk
UPDATE public.email_templates
SET body = replace(body, 'jednoduchú správu farnosti na stránke mojkrok.sk', 'jednoduchú správu farnosti na stránke dcza.sk'),
    updated_at = now()
WHERE template_key = 'parish_access_google';

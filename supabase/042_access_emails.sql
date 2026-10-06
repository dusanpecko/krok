-- 042: E-maily k prístupu do zóny farnosti a k heslu – posielame ich sami (Brevo, email_templates),
-- nie cez anglické šablóny Supabase Auth. Odkaz vedie na /auth/confirm (token_hash) → nastavenie hesla.
-- Texty sa dajú upravovať v /admin/emaily.

INSERT INTO public.email_templates (template_key, name, description, category, subject, body, available_variables) VALUES

(
  'parish_access_invite',
  'Pozvánka do zóny farnosti',
  'Diecéza pridelí farnosti prístup novému účtu (admin → farnosť → Prístupy a návrhy). Obsahuje odkaz na aktiváciu a nastavenie hesla.',
  'account',
  'Pozvánka do správy farnosti {{parish_name}} – KROK',
  '<p>{{salutation}},</p>
<p>Pastoračný fond KROK pripravil pre farnosti Žilinskej diecézy jednoduchú správu farnosti na stránke mojkrok.sk. Pre <strong>{{parish_name}}</strong> sme Vám vytvorili prístup ({{role_label}}).</p>
<p>V zóne farnosti môžete:</p>
<ul>
<li>spravovať verejnú stránku farnosti – rozpis svätých omší, úradné hodiny, oznamy a aktuality,</li>
<li>navrhnúť opravu úradných údajov a štatistiky farnosti,</li>
<li>sledovať, ako farnosť prispieva do Pastoračného fondu{{#has_box}}, a e-zvonček farnosti{{/has_box}}.</li>
</ul>
<p>Prístup aktivujete kliknutím na odkaz a nastavením hesla:</p>
<p><a href="{{invite_url}}">Aktivovať prístup k farnosti</a></p>
<p>Odkaz platí obmedzený čas. Ak už nefunguje, napíšte nám a pošleme Vám nový. Prihlasovať sa budete e-mailom <strong>{{email}}</strong> a heslom; ak máte k tejto adrese účet Google, môžete použiť aj tlačidlo „Prihlásiť sa cez Google“.</p>
<p>V prípade otázok nás kontaktujte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a> alebo na čísle +421 903 982 982.</p>
<p>S úctou a vďakou</p>
<p>Mgr. Dušan Pecko<br>Výkonný riaditeľ<br>KROK – Pastoračný fond Žilinskej diecézy<br>Jána Kalinčiaka 1<br>P.O.Box B-46<br>SK-011 36 Žilina<br>web: <a href="https://www.dcza.sk">www.dcza.sk</a> | <a href="https://www.mojkrok.sk">www.mojkrok.sk</a></p>',
  '["{{salutation}}", "{{parish_name}}", "{{role_label}}", "{{invite_url}}", "{{email}}", "{{#has_box}}", "{{site_url}}"]'::jsonb
),

(
  'parish_access_granted',
  'Prístup k farnosti (existujúci účet)',
  'Diecéza pridelí farnosti prístup účtu, ktorý už v Kroku existuje – stačí sa prihlásiť.',
  'account',
  'Prístup do správy farnosti {{parish_name}} – KROK',
  '<p>{{salutation}},</p>
<p>k Vášmu účtu na stránke mojkrok.sk sme pridali prístup do správy farnosti <strong>{{parish_name}}</strong> ({{role_label}}).</p>
<p>Po prihlásení ju nájdete v menu účtu pod položkou „Správa farnosti“:</p>
<p><a href="{{login_url}}">Prihlásiť sa do zóny farnosti</a></p>
<p>Prihlasujete sa e-mailom <strong>{{email}}</strong>. Ak si heslo nepamätáte, použite na prihlasovacej stránke „Zabudli ste heslo?“.</p>
<p>V prípade otázok nás kontaktujte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a> alebo na čísle +421 903 982 982.</p>
<p>S úctou a vďakou</p>
<p>Mgr. Dušan Pecko<br>Výkonný riaditeľ<br>KROK – Pastoračný fond Žilinskej diecézy<br>Jána Kalinčiaka 1<br>P.O.Box B-46<br>SK-011 36 Žilina<br>web: <a href="https://www.dcza.sk">www.dcza.sk</a> | <a href="https://www.mojkrok.sk">www.mojkrok.sk</a></p>',
  '["{{salutation}}", "{{parish_name}}", "{{role_label}}", "{{login_url}}", "{{email}}", "{{site_url}}"]'::jsonb
),

(
  'password_reset',
  'Obnovenie hesla',
  'Po kliknutí na „Zabudli ste heslo?“ na prihlasovacej stránke. Obsahuje odkaz na nastavenie nového hesla.',
  'account',
  'Obnovenie hesla – KROK',
  '<p>Dobrý deň,</p>
<p>dostali sme žiadosť o obnovenie hesla k účtu <strong>{{email}}</strong> na stránke mojkrok.sk. Nové heslo si nastavíte tu:</p>
<p><a href="{{reset_url}}">Nastaviť nové heslo</a></p>
<p>Odkaz platí obmedzený čas. Ak ste o obnovenie hesla nežiadali, tento e-mail pokojne ignorujte – Vaše heslo sa nezmení.</p>
<p>S pozdravom,<br>tím Pastoračného fondu KROK</p>',
  '["{{email}}", "{{reset_url}}", "{{site_url}}"]'::jsonb
)

ON CONFLICT (template_key) DO NOTHING;

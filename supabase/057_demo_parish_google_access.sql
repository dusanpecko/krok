-- 057: Testovacia farnosť „Moja farnosť“ (pilot, natáčanie návodov) a prístupy cez Google Workspace @dcza.sk.
--
-- parishes.is_demo – farnosť funguje (zóna farnosti, stránka /farnosti/moja-farnost), ale nikde sa neponúka:
-- nie je v zozname farností, vo výbere farnosti pri registrácii darcu, v sitemap, v počtoch ani v predpisoch;
-- stránka má noindex. Databáza je spoločná s produkciou, preto príznak namiesto testovacej DB.

ALTER TABLE public.parishes ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN public.parishes.is_demo IS 'Testovacia / ukážková farnosť – nezobrazuje sa v zoznamoch, výbere darcu, sitemap ani štatistikách';
GRANT SELECT (is_demo) ON public.parishes TO anon, authenticated;

INSERT INTO public.parishes (name, official_name, slug, subdomain, kind, is_active, is_demo, visible_on_web, notes)
SELECT 'Moja farnosť', 'Moja farnosť', 'moja-farnost', 'moja-farnost', 'parish', true, true, false,
       'Testovacia farnosť (pilot, natáčanie videonávodov) – is_demo, nezobrazuje sa verejne v zoznamoch.'
WHERE NOT EXISTS (SELECT 1 FROM public.parishes WHERE slug = 'moja-farnost');

-- E-mail pre účty @dcza.sk (Google Workspace): bez hesla, prihlásenie tlačidlom „Prihlásiť sa cez Google“.
INSERT INTO public.email_templates (template_key, name, description, category, subject, body, available_variables, from_email, from_name, is_active)
SELECT 'parish_access_google',
       'Prístup k farnosti (účet Google @dcza.sk)',
       'Pridelenie prístupu do zóny farnosti pre diecéznu adresu @dcza.sk – prihlásenie cez Google, bez hesla.',
       t.category,
       'Prístup do správy farnosti {{parish_name}} – KROK',
       $b$<p>{{salutation}},</p>
<p>Pastoračný fond KROK pripravil pre farnosti Žilinskej diecézy jednoduchú správu farnosti na stránke mojkrok.sk. Pre <strong>{{parish_name}}</strong> sme Vám vytvorili prístup ({{role_label}}).</p>
<p>V zóne farnosti môžete:</p>
<ul>
<li>spravovať verejnú stránku farnosti – rozpis svätých omší, úradné hodiny, oznamy a aktuality,</li>
<li>navrhnúť opravu úradných údajov a štatistiky farnosti,</li>
<li>sledovať, ako farnosť prispieva do Pastoračného fondu{{#has_box}}, a e-zvonček farnosti{{/has_box}}.</li>
</ul>
<p><strong>Ako sa prihlásiť:</strong> otvorte odkaz nižšie a kliknite na tlačidlo <strong>„Prihlásiť sa cez Google“</strong>. Vyberte svoj diecézny účet <strong>{{email}}</strong> – ten istý, ktorým sa prihlasujete do pošty. Žiadne ďalšie heslo nepotrebujete.</p>
<p><a href="{{login_url}}">Prihlásiť sa do zóny farnosti</a></p>
<p>Návody nájdete v zóne farnosti v časti <strong>Pomoc</strong>. V prípade otázok nás kontaktujte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a> alebo na čísle +421 903 982 982.</p>
<p>S úctou a vďakou</p>
<p>Mgr. Dušan Pecko<br>Výkonný riaditeľ<br>KROK – Pastoračný fond Žilinskej diecézy<br>Jána Kalinčiaka 1<br>P.O.Box B-46<br>SK-011 36 Žilina<br>web: <a href="https://www.dcza.sk">www.dcza.sk</a> | <a href="https://www.mojkrok.sk">www.mojkrok.sk</a></p>$b$,
       '["{{salutation}}","{{parish_name}}","{{role_label}}","{{login_url}}","{{email}}","{{#has_box}}","{{site_url}}"]'::jsonb,
       t.from_email, t.from_name, true
FROM public.email_templates t
WHERE t.template_key = 'parish_access_granted'
  AND NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_key = 'parish_access_google');

-- Pomoc: prvé prihlásenie po novom (Google @dcza.sk); admin – pravidlo pre e-maily
UPDATE public.help_articles SET summary = 'Ako sa prvýkrát prihlásiť diecéznym účtom Google a čo robiť, keď to nejde.', updated_at = now(), content = $h$
<p>Prístup do zóny farnosti prideľuje biskupský úrad – vždy na diecéznu adresu <strong>@dcza.sk</strong>. Na ňu príde e-mail „Prístup do správy farnosti“.</p>
<h2>Prihlásenie</h2>
<ol>
<li>V e-maile kliknite na <strong>Prihlásiť sa do zóny farnosti</strong> (alebo otvorte <strong>mojkrok.sk/prihlasenie</strong>).</li>
<li>Kliknite na tlačidlo <strong>Prihlásiť sa cez Google</strong>.</li>
<li>Vyberte svoj diecézny účet <strong>…@dcza.sk</strong> – ten istý, ktorým sa prihlasujete do pošty. Žiadne ďalšie heslo nepotrebujete.</li>
<li>Otvorí sa zóna vašej farnosti.</li>
</ol>
<p>Ak spravujete viac farností, najprv sa zobrazí ich zoznam – kliknite na tú, s ktorou chcete pracovať.</p>
<h2>Keď niečo nejde</h2>
<ul>
<li><strong>„K vášmu účtu zatiaľ nie je priradená žiadna farnosť“</strong> – v Google ste vybrali iný účet (napríklad súkromný Gmail). Odhláste sa a pri prihlásení vyberte adresu @dcza.sk.</li>
<li><strong>Nepamätáte si heslo k diecéznej pošte</strong> – obráťte sa na správcu diecéznej pošty; heslo k Google účtu Krok nemení.</li>
<li>Na cudzom počítači sa po práci odhláste tlačidlom <strong>Odhlásiť</strong> vpravo hore.</li>
</ul>
<p>Ak to stále nejde, napíšte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a>.</p>
$h$ WHERE zone = 'parish' AND slug = 'prve-prihlasenie';

UPDATE public.help_articles SET updated_at = now(), content = replace(content,
  '<p>Nový používateľ dostane pozvánku na nastavenie hesla, existujúci účet len oznámenie.',
  '<p>Prístup môže dostať len <strong>diecézna adresa @dcza.sk</strong> (Google Workspace) – dostane e-mail s pokynom prihlásiť sa tlačidlom „Prihlásiť sa cez Google“, bez hesla.')
WHERE zone = 'admin' AND slug = 'farnosti';

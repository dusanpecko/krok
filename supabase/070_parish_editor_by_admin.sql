-- 070: Správca farnosti (farár / administrátor) sprístupní úpravu stránky farnosti ďalším ľuďom (editor, napr. ministrant).
-- Editor od farára môže mať akúkoľvek e-mailovú adresu (nie len @dcza.sk) – prihlási sa cez Google alebo heslom.
-- Riadky parish_users: role = 'editor', source = 'manual', invited_by = správca. Kód: app/moja-farnost/team-actions.ts.

-- 1. E-mail editorovi (nový účet → aktivácia a nastavenie hesla; existujúci → odkaz na prihlásenie)
INSERT INTO public.email_templates (template_key, name, description, category, subject, body, available_variables, from_email, from_name, is_active)
SELECT 'parish_editor_invite',
       'Prístup k úprave stránky farnosti (pozval správca farnosti)',
       'Farár / administrátor pridal v správe farnosti editora stránky farnosti (napr. ministranta, kostolníka).',
       t.category,
       'Prístup k úprave stránky {{parish_name}}',
       $b$<p>Dobrý deň{{#person_name}}, {{person_name}}{{/person_name}},</p>
<p><strong>{{inviter_name}}</strong> Vám sprístupnil úpravu webovej stránky <strong>{{parish_name}}</strong> na stránke dcza.sk.</p>
<p>Ako editor môžete:</p>
<ul>
<li>pridávať oznamy a aktuality,</li>
<li>upravovať rozpis svätých omší a úradné hodiny,</li>
<li>pridávať fotografie do galérie farnosti.</li>
</ul>
{{#invite_url}}<p>Prístup aktivujete kliknutím na odkaz a nastavením hesla:</p>
<p><a href="{{invite_url}}">Aktivovať prístup</a></p>
<p>Odkaz platí obmedzený čas – ak už nefunguje, požiadajte správcu farnosti, aby Vám pozvánku poslal znova. Prihlasovať sa budete e-mailom <strong>{{email}}</strong> a heslom; ak máte k tejto adrese účet Google, môžete použiť aj tlačidlo „Prihlásiť sa cez Google“.</p>{{/invite_url}}
{{^invite_url}}<p>Prihláste sa e-mailom <strong>{{email}}</strong> (ak máte účet Google, cez tlačidlo „Prihlásiť sa cez Google“):</p>
<p><a href="{{login_url}}">Prihlásiť sa do správy farnosti</a></p>{{/invite_url}}
<p>Po prihlásení nájdete správu farnosti v menu účtu vpravo hore – <strong>Správa farnosti</strong>. Návody sú v správe farnosti v časti <strong>Pomoc</strong>.</p>
<p>Ak ste o prístup nežiadali, tento e-mail ignorujte alebo nám napíšte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a>.</p>
<p>S pozdravom</p>
<p>Žilinská diecéza<br>Jána Kalinčiaka 1<br>010 01 Žilina</p>$b$,
       '["{{person_name}}", "{{inviter_name}}", "{{parish_name}}", "{{email}}", "{{#invite_url}}", "{{login_url}}", "{{site_url}}"]'::jsonb,
       t.from_email, t.from_name, true
FROM public.email_templates t WHERE t.template_key = 'parish_access_google'
ON CONFLICT (template_key) DO NOTHING;

-- 2. Návod v Pomoci zóny farnosti
INSERT INTO public.help_articles (zone, slug, title, summary, sort_order, content) VALUES
('parish', 'ludia-s-pristupom', 'Ľudia s prístupom', 'Ako sprístupniť úpravu stránky farnosti ďalším ľuďom (kaplán, ministrant, kostolník).', 95, $h$
<p>V časti <strong>Ľudia s prístupom</strong> vidíte, kto môže spravovať Vašu farnosť. Farár (administrátor) a farský vikár majú prístup automaticky podľa schematizmu diecézy – keď sa zmení ich pôsobenie, prístup sa zmení sám.</p>
<h3>Pridať editora</h3>
<p>Ak chcete, aby Vám so stránkou farnosti pomáhal niekto ďalší (ministrant, kostolník, člen farskej rady), zadajte jeho e-mail a meno a kliknite na <strong>Pridať editora</strong>. Príde mu e-mail s odkazom na aktiváciu prístupu. Môže to byť akákoľvek e-mailová adresa (aj Gmail).</p>
<p>Editor môže pridávať oznamy a aktuality, upravovať bohoslužby, galériu, prezentáciu a sviatosti. <strong>Nevidí</strong> prehľad príspevkov do Pastoračného fondu ani e-zvonček.</p>
<h3>Odobrať prístup</h3>
<p>Editora, ktorého ste pridali, odoberiete ikonou koša. Prístup kňazov podľa schematizmu meniť nemôžete – ten upravuje biskupský úrad v registri kňazov.</p>
$h$)
ON CONFLICT (zone, slug) DO NOTHING;

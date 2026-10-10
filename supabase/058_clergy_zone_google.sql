-- 058: Kňazská zóna – prístup len pre diecézne adresy @dcza.sk (Google Workspace), prihlásenie cez Google.
-- Nová šablóna clergy_zone_google (pozvánka bez hesla); Pomoc – návod pre admin upravený.

INSERT INTO public.email_templates (template_key, name, description, category, subject, body, available_variables, from_email, from_name, is_active)
SELECT 'clergy_zone_google',
       'Pozvánka do kňazskej zóny (účet Google @dcza.sk)',
       'Prístup do kňazskej zóny pre diecéznu adresu @dcza.sk – prihlásenie cez Google, bez hesla.',
       t.category,
       'Kňazská zóna Žilinskej diecézy – prístup',
       $b$<p>{{salutation}},</p>
<p>dokumenty kúrie pre kňazov – obežníky, smernice, formuláre a ďalšie materiály – nájdete odteraz v <strong>kňazskej zóne</strong> na stránke mojkrok.sk. Pripravili sme pre Vás osobný prístup.</p>
<p>V kňazskej zóne môžete:</p>
<ul>
<li>prezerať a sťahovať dokumenty podľa kategórií,</li>
<li>vyhľadávať aj priamo v texte obežníkov a smerníc,</li>
<li>nájsť aj staršie, archivované dokumenty.</li>
</ul>
<p>O každom novom dokumente Vám pošleme krátky e-mail.</p>
<p><strong>Ako sa prihlásiť:</strong> otvorte odkaz nižšie a kliknite na tlačidlo <strong>„Prihlásiť sa cez Google“</strong>. Vyberte svoj diecézny účet <strong>{{email}}</strong> – ten istý, ktorým sa prihlasujete do pošty. Žiadne ďalšie heslo nepotrebujete.</p>
<p><a href="{{login_url}}">Prihlásiť sa do kňazskej zóny</a></p>
<p>V prípade otázok nás kontaktujte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a>.</p>
<p>S úctou</p>
<p>Biskupský úrad Žilina</p>$b$,
       '["{{salutation}}","{{login_url}}","{{email}}","{{site_url}}"]'::jsonb,
       t.from_email, t.from_name, true
FROM public.email_templates t
WHERE t.template_key = 'clergy_zone_invite'
  AND NOT EXISTS (SELECT 1 FROM public.email_templates WHERE template_key = 'clergy_zone_google');

UPDATE public.help_articles SET updated_at = now(), content = replace(content,
  '<p>V záložke <strong>Kňazi a prístupy</strong> sú kňazi a diakoni z registra. Pozvánka ide na pracovný e-mail (ak chýba, na súkromný); iný e-mail môžete zadať v riadku.</p>',
  '<p>V záložke <strong>Kňazi a prístupy</strong> sú kňazi a diakoni z registra. Pozvánka ide len na <strong>diecézny e-mail @dcza.sk</strong> z registra (súkromný sa nepoužíva); kňaz sa prihlási tlačidlom „Prihlásiť sa cez Google“, bez hesla. Kňaz bez diecézneho e-mailu je vo filtri <strong>Bez e-mailu</strong> – doplňte mu ho v registri.</p>')
WHERE zone = 'admin' AND slug = 'knazska-zona';

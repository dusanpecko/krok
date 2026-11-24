-- 071: Text e-mailu o prístupe do správy farnosti podľa schematizmu – ukážková stránka farnosti,
-- pridávanie ďalších ľudí a základná informácia o e-zvončeku (karta, Apple Pay / Google Pay, poplatky, NFC kartičky a plagáty).

UPDATE public.email_templates
SET subject = 'Správa farnosti {{parishes}} na dcza.sk',
    body = $b$<p>{{salutation}},</p>
<p>podľa schematizmu Žilinskej diecézy pôsobíte vo farnosti <strong>{{parishes}}</strong>. Pripravili sme pre Vás prístup do <strong>správy farnosti</strong> na stránke dcza.sk ({{role_label}}).</p>
<p>Každá farnosť má na dcza.sk vlastnú stránku. Ako môže vyzerať vyplnená stránka farnosti, si pozrite na ukážke: <a href="https://www.dcza.sk/farnosti/moja-farnost">www.dcza.sk/farnosti/moja-farnost</a></p>
<p>V správe farnosti môžete:</p>
<ul>
<li>upravovať rozpis svätých omší, spovedania a úradné hodiny,</li>
<li>pridávať farské oznamy a aktuality,</li>
<li>pridávať fotografie do galérie farnosti,</li>
<li>farár (administrátor) môže sprístupniť úpravu stránky ďalším ľuďom – napríklad kostolníkovi či ministrantovi,</li>
<li>navrhnúť opravu úradných údajov a štatistiky farnosti.</li>
</ul>
<p><strong>Ako sa prihlásiť:</strong> otvorte odkaz nižšie a kliknite na tlačidlo <strong>„Prihlásiť sa cez Google“</strong>. Vyberte svoj diecézny účet <strong>{{email}}</strong> – ten istý, ktorým sa prihlasujete do pošty. Žiadne ďalšie heslo nepotrebujete.</p>
<p><a href="{{login_url}}">Prihlásiť sa do správy farnosti</a></p>
<p>Nabudúce sa do správy farnosti dostanete cez menu svojho účtu vpravo hore – <strong>Správa farnosti</strong>. Návody nájdete priamo v správe farnosti v časti <strong>Pomoc</strong>.</p>
<p><strong>E-zvonček – online zbierka pre farnosť</strong></p>
<p>Na stránke farnosti môžete mať aj <strong>e-zvonček</strong>: veriaci prispejú farnosti platobnou kartou alebo cez <strong>Apple Pay / Google Pay</strong>, jednorazovo alebo pravidelne každý mesiac. Peniaze vyzbiera Pastoračný fond KROK a <strong>raz mesačne ich pošle na účet farnosti</strong> – odpočíta sa len poplatok platobnej brány (2 %) a poplatok fondu (2 %). V správe farnosti uvidíte, koľko sa vyzbieralo, mená darcov sa nezobrazujú. Do kostola Vám pripravíme <strong>NFC kartičky</strong> (stačí priložiť mobil) a <strong>plagáty s QR kódom</strong>. Ak máte záujem, napíšte nám na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a>.</p>
<p>Prístup sa riadi schematizmom: keď sa zmení Vaše pôsobenie, zmení sa aj prístup a dáme Vám vedieť.</p>
<p>V prípade otázok nás kontaktujte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a>.</p>
<p>S úctou</p>
<p>Mgr. Dušan Pecko</p>
<p>Rímskokatolícka cirkev<br>Žilinská diecéza<br>Jána Kalinčiaka 1<br>010 01 Žilina</p>$b$,
    updated_at = now()
WHERE template_key = 'parish_access_clergy_granted';

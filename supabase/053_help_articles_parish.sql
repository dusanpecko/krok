-- 053: Pomoc – úvodné návody pre zónu farnosti (/moja-farnost/pomoc).
-- ON CONFLICT DO NOTHING: opakované spustenie neprepíše návody upravené v admine (/admin/pomoc/sprava).
-- Slugy zodpovedajú odkazom „?“ pri záložkách (ParishZoneView.tsx – TAB_HELP).

INSERT INTO public.help_articles (zone, slug, title, summary, sort_order, content) VALUES

('parish', 'ako-funguje-zona-farnosti', 'Ako funguje zóna farnosti', 'Čo v zóne nájdete, kto čo môže a čo sa zobrazí verejne.', 10, $h$
<p>Zóna farnosti je miesto, kde spravujete stránku svojej farnosti na mojkrok.sk a údaje, ktoré o farnosti vedie biskupský úrad. Nájdete ju na adrese <strong>mojkrok.sk/moja-farnost</strong> po prihlásení.</p>
<h2>Záložky</h2>
<ul>
<li><strong>Prehľad a e-zvonček</strong> – ako farnosť prispieva do fondu KROK a výplaty z e-zvončeka.</li>
<li><strong>Návštevnosť</strong> – koľko ľudí si pozerá stránku farnosti.</li>
<li><strong>Bohoslužby a úradné hodiny</strong> – rozpis svätých omší, spovedania a úradných hodín.</li>
<li><strong>Oznamy a aktuality</strong> – farské oznamy a články.</li>
<li><strong>Galéria</strong> – fotky kostola a albumy zo života farnosti.</li>
<li><strong>Prezentácia</strong> – zapnutie verejnej stránky, text o farnosti, fotka, erb, hody a sociálne siete.</li>
<li><strong>Sviatosti</strong> – čo treba vybaviť pri krste, sobáši a ďalších sviatostiach.</li>
<li><strong>Úradné údaje</strong>, <strong>Obce a štatistika</strong>, <strong>Kňazi</strong> – údaje z registra biskupského úradu.</li>
</ul>
<p>Pod lištou záložiek je vždy odkaz <strong>Návod k záložke</strong>, ktorý otvorí návod práve k tej časti, kde sa nachádzate.</p>
<h2>Správca a editor</h2>
<p>Farnosť má jedného <strong>správcu účtu</strong> (zvyčajne správca farnosti) a môže mať viac <strong>editorov</strong> (napríklad farníka, ktorý píše oznamy). Editor môže písať oznamy a aktuality, spravovať galériu, bohoslužby, prezentáciu a sviatosti. Len správca vidí prehľad darov a e-zvonček, zapína verejnú stránku a navrhuje zmeny úradných údajov a štatistiky. Prístupy prideľuje biskupský úrad.</p>
<h2>Čo sa ukladá hneď a čo ide na schválenie</h2>
<ul>
<li><strong>Hneď</strong> sa uloží: bohoslužby, oznamy a aktuality, galéria, prezentácia a sviatosti.</li>
<li><strong>Na schválenie</strong> biskupskému úradu idú: úradné údaje (adresa, IČO, IBAN…) a štatistika veriacich. Stav návrhu uvidíte v záložke Prehľad.</li>
</ul>
<h2>Čo vidí verejnosť</h2>
<p>Kým v záložke <strong>Prezentácia</strong> nezapnete verejnú stránku, ľudia vidia len základnú stránku farnosti: kontakt, kňazov, obce a vyplnené bohoslužby. Oznamy, aktuality a sviatosti vidíte dovtedy len vy a biskupský úrad – cez tlačidlo <strong>Náhľad stránky</strong> vpravo hore.</p>
<p>Mená darcov sa v zóne nikde nezobrazujú – vidíte len súhrnné čísla.</p>
$h$),

('parish', 'prve-prihlasenie', 'Prvé prihlásenie a heslo', 'Ako aktivovať prístup z pozvánky, prihlásiť sa a čo robiť, keď odkaz neplatí.', 20, $h$
<p>Prístup do zóny farnosti prideľuje biskupský úrad. Na váš e-mail príde pozvánka „Pozvánka do zóny farnosti“.</p>
<h2>Aktivácia prístupu</h2>
<ol>
<li>V e-maile kliknite na odkaz z pozvánky.</li>
<li>Otvorí sa stránka <strong>Aktivácia prístupu</strong>. Kliknite na <strong>Pokračovať</strong>. (Tento krok je tu preto, aby odkaz nepoužil automatický kontrolór pošty skôr ako vy.)</li>
<li>Na stránke <strong>Nastavenie hesla</strong> zadajte nové heslo – aspoň 8 znakov – a zopakujte ho.</li>
<li>Kliknite na <strong>Uložiť heslo a pokračovať</strong>. Otvorí sa zóna vašej farnosti.</li>
</ol>
<h2>Ďalšie prihlásenia</h2>
<p>Na stránke <strong>mojkrok.sk/prihlasenie</strong> zadajte e-mail a heslo a kliknite na <strong>Prihlásiť sa e-mailom</strong>. Ak máte účet Google na ten istý e-mail, môžete použiť aj <strong>Prihlásiť sa cez Google</strong>. Po prihlásení sa otvorí zóna farnosti.</p>
<p>Ak spravujete viac farností, najprv sa zobrazí ich zoznam – kliknite na tú, s ktorou chcete pracovať.</p>
<h2>Keď niečo nejde</h2>
<ul>
<li><strong>„Odkaz už neplatí“</strong> – odkaz z e-mailu sa dá použiť len raz. Kliknite na <strong>Poslať nový odkaz</strong> alebo na prihlasovacej stránke na <strong>Zabudli ste heslo?</strong> a pošlite si nový.</li>
<li><strong>Zabudnuté heslo</strong> – na prihlasovacej stránke kliknite na <strong>Zabudli ste heslo?</strong>, zadajte e-mail a postupujte podľa e-mailu.</li>
<li><strong>„K vášmu účtu zatiaľ nie je priradená žiadna farnosť“</strong> – prihlásili ste sa iným e-mailom, než na ktorý prišla pozvánka. Odhláste sa a prihláste sa správnym e-mailom.</li>
</ul>
<p>Ak to stále nejde, napíšte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a>.</p>
$h$),

('parish', 'oznamy-a-aktuality', 'Oznamy a aktuality', 'Ako pridať farské oznamy (aj ako PDF), aktualitu alebo pozvánku na udalosť.', 30, $h$
<p>V záložke <strong>Oznamy a aktuality</strong> sú dve časti: <strong>Oznamy</strong> (týždenné farské oznamy) a <strong>Aktuality</strong> (články, pozvánky, správy zo života farnosti). Prepnete ich tlačidlami hore.</p>
<h2>Pridanie farských oznamov</h2>
<ol>
<li>Kliknite na <strong>Oznamy</strong> a potom na <strong>Nové oznamy</strong>.</li>
<li>Nadpis a dátumy <strong>Platí od</strong> a <strong>Platí do</strong> sú predvyplnené na najbližšiu nedeľu až sobotu. Skontrolujte ich.</li>
<li>Do poľa <strong>Text</strong> napíšte oznamy alebo ich vložte z Wordu – formátovanie sa samo vyčistí.</li>
<li>Ak máte oznamy ako naskenovaný dokument, kliknite na <strong>Nahrať PDF</strong> (najviac 15 MB). Text vtedy nie je povinný.</li>
<li>Kliknite na <strong>Zverejniť</strong>. Oznamy sú na stránke farnosti hneď.</li>
</ol>
<p>Ak ešte nie ste hotoví, použite <strong>Uložiť ako koncept</strong> – koncept verejnosť nevidí.</p>
<h2>Pridanie aktuality</h2>
<ol>
<li>Kliknite na <strong>Aktuality</strong> a potom na <strong>Nová aktualita</strong>.</li>
<li>Vyplňte <strong>Nadpis</strong> a <strong>Text</strong>. Môžete pridať <strong>Titulný obrázok</strong>, videá z YouTube alebo Vimea a pripojiť album z galérie.</li>
<li>Ak ide o pozvánku na udalosť, vyplňte <strong>Dátum a čas konania</strong> – aktualita sa zobrazí aj v časti „Pripravujeme“.</li>
<li>Do poľa <strong>Krátky popis</strong> môžete napísať jednu-dve vety, ktoré sa zobrazia v zozname a vo vyhľadávačoch.</li>
<li>Kliknite na <strong>Zverejniť</strong>.</li>
</ol>
<h2>Užitočné</h2>
<ul>
<li><strong>Pripnúť navrch</strong> – príspevok ostane prvý v zozname.</li>
<li>Pri zverejnenom príspevku tlačidlo <strong>Zdieľať</strong> pošle odkaz na Facebook, do WhatsAppu, e-mailom alebo ho skopíruje.</li>
<li>Úprava: tlačidlo <strong>Upraviť</strong> pri príspevku, zmazanie: ikona koša.</li>
<li>Do textu sa dajú vkladať obrázky; PDF pridajte cez <strong>Nahrať PDF</strong>.</li>
</ul>
<h2>Stiahnutý príspevok</h2>
<p>Biskupský úrad môže príspevok stiahnuť zo stránky (napríklad pri nevhodnej fotke). Pri príspevku sa zobrazí <strong>Stiahnuté biskupským úradom</strong> aj s dôvodom. Môžete ho opraviť, znova ho však zverejní úrad.</p>
<p>Kým nie je zapnutá verejná stránka farnosti (záložka Prezentácia), príspevky vidíte len vy a biskupský úrad.</p>
$h$),

('parish', 'bohosluzby-a-uradne-hodiny', 'Bohoslužby a úradné hodiny', 'Rozpis svätých omší, spovedania a úradných hodín – cez rok aj v lete.', 40, $h$
<p>V záložke <strong>Bohoslužby a úradné hodiny</strong> pripravíte rozpis, ktorý sa zobrazí na stránke farnosti. Ukladá sa hneď, bez schvaľovania.</p>
<h2>Dva rozpisy: cez rok a letný</h2>
<p>Hore prepínate <strong>Cez rok</strong> a <strong>Letný režim</strong>. Každý rozpis sa ukladá zvlášť. Letný rozpis sa použije, len ak zaškrtnete <strong>Letný režim je zapnutý</strong> a vyplníte <strong>Platí od</strong> a <strong>Platí do</strong>. Tlačidlo <strong>Skopírovať z „cez rok“</strong> vám ušetrí prepisovanie.</p>
<h2>Pridanie svätej omše</h2>
<ol>
<li>Kliknite na <strong>Sv. omša</strong> (alebo <strong>Spovedanie</strong>, <strong>Úradné hodiny</strong>).</li>
<li>V novom riadku zvoľte <strong>Deň</strong>, vyplňte čas <strong>Od</strong> a <strong>Miesto</strong> (farský kostol alebo filiálna obec).</li>
<li>Do <strong>Poznámky</strong> napíšte napríklad „detská“ alebo „len párny týždeň“.</li>
<li>Kliknite na <strong>Uložiť rozvrh</strong>.</li>
</ol>
<h2>Tipy</h2>
<ul>
<li><strong>Prvý piatok</strong> – spovedanie pred prvým piatkom pridajte ako samostatný riadok a v stĺpci <strong>Príležitosť</strong> zvoľte „prvý piatok“.</li>
<li><strong>Namiesto času</strong> – pri spovedaní môžete napísať napríklad „30 minút pred svätou omšou“.</li>
<li><strong>Iný deň</strong> – v stĺpci Deň zvoľte „iné…“ a napíšte napríklad „prikázaný sviatok“.</li>
<li><strong>Úradné hodiny po dohode</strong> – vytvorte riadok Úradné hodiny bez času a do poznámky napíšte „po dohode“.</li>
<li><strong>Zoradiť</strong> usporiada riadky podľa dní a časov.</li>
<li><strong>Poznámka k rozvrhu</strong> sa zobrazí pod rozpisom, napríklad „Počas prázdnin neprebieha detská svätá omša.“</li>
</ul>
$h$),

('parish', 'galeria', 'Galéria – fotky a albumy', 'Ako nahrať fotky kostola, vytvoriť album a na čo myslieť pri fotkách ľudí.', 50, $h$
<p>V záložke <strong>Galéria</strong> sú dve časti: <strong>Kostol a farnosť</strong> (pás fotiek hore na stránke farnosti) a albumy <strong>Zo života farnosti</strong>.</p>
<h2>Nový album</h2>
<ol>
<li>Kliknite na <strong>Nový album</strong>.</li>
<li>Vyplňte <strong>Názov albumu</strong> (napríklad „Prvé sväté prijímanie 2026“), <strong>Dátum udalosti</strong> a prípadne popis.</li>
<li>Nechajte zaškrtnuté <strong>Zverejnené na stránke farnosti</strong> a kliknite na <strong>Uložiť</strong>.</li>
<li>V albume pretiahnite fotky do vyznačeného poľa alebo kliknite a vyberte ich z počítača či telefónu. Naraz môžete vybrať viac fotiek.</li>
</ol>
<p>Fotky sa samy zmenšia a uložia v úspornom formáte – nemusíte ich vopred upravovať. Jedna fotka môže mať najviac 25 MB.</p>
<h2>Úpravy</h2>
<ul>
<li>Pod fotku môžete napísať <strong>Popis</strong> a potom kliknúť na <strong>Uložiť popisy</strong>.</li>
<li>Šípkami meníte poradie, hviezdičkou nastavíte <strong>titulnú fotku albumu</strong>, košom fotku zmažete.</li>
<li>V albume Kostol a farnosť je hlavná prvá fotka.</li>
</ul>
<h2>Fotky z iPhonu</h2>
<p>Fotky vo formáte HEIC sa väčšinou nahrajú bez problémov. Ak sa zobrazí chyba, nahrajte ich cez prehliadač Safari alebo ich v telefóne uložte ako JPG.</p>
<h2>Album na Facebooku alebo Google Fotkách</h2>
<p>Ak máte fotky inde, zaškrtnite <strong>Fotky sú v inom albume</strong> a vložte <strong>Odkaz na album</strong>. Na stránke farnosti sa zobrazí len odkaz.</p>
<h2>Úložisko</h2>
<p>Farnosť má na fotky vyhradené miesto (zvyčajne 1 GB). Koľko je využité, vidíte hore. Keď sa blíži k plnému, zmažte staršie fotky alebo požiadajte biskupský úrad o navýšenie.</p>
<h2>Fotky s ľuďmi</h2>
<ul>
<li>Fotografujte len tam, kde je to dovolené a ľudia nenamietajú.</li>
<li>Pri deťoch majte súhlas rodičov.</li>
<li>Uprednostnite celkové zábery pred detailmi tvárí.</li>
<li>Ak niekto požiada o odstránenie fotky, zmažte ju čo najskôr.</li>
</ul>
<p>Biskupský úrad môže album stiahnuť zo stránky – pri albume sa potom zobrazí dôvod.</p>
$h$),

('parish', 'prezentacia-a-verejna-stranka', 'Prezentácia a verejná stránka', 'Ako zapnúť stránku farnosti, pridať text, fotku, erb, hody a sociálne siete.', 60, $h$
<p>Záložka <strong>Prezentácia</strong> určuje, ako vyzerá stránka farnosti na mojkrok.sk.</p>
<h2>Zapnutie verejnej stránky</h2>
<p>Kým stránku nezapnete, verejnosť vidí len základnú stránku: kontakt na farský úrad, kňazov, obce a vyplnené bohoslužby. Keď máte pripravené oznamy a texty, správca zaškrtne <strong>Verejná stránka farnosti zapnutá</strong>. Potom sa zobrazia aj oznamy, aktuality a sviatosti.</p>
<p>Ako stránka vyzerá, si môžete kedykoľvek pozrieť tlačidlom <strong>Stránka farnosti</strong> (alebo <strong>Náhľad stránky</strong>) vpravo hore.</p>
<h2>Text, fotka a erb</h2>
<ol>
<li>Do <strong>Krátky text o farnosti</strong> napíšte pár viet o farnosti a kostole.</li>
<li>Pri <strong>Titulná fotka</strong> kliknite na <strong>Nahrať fotku</strong> – najlepšie fotka kostola na šírku, aspoň 1600 px.</li>
<li>Ak má farnosť erb alebo logo, nahrajte ho cez <strong>Nahrať erb / logo</strong> – ideálne štvorcový obrázok PNG s priehľadným pozadím. Zobrazí sa v hlavičke stránky.</li>
<li>Vyplňte <strong>Hody</strong> a <strong>Výročnú celodennú poklonu</strong> (dátum alebo poznámku, napríklad „1. septembrová nedeľa“).</li>
<li>Kliknite na <strong>Uložiť</strong>.</li>
</ol>
<p>Obrázky môžu byť JPG, PNG alebo WebP, najviac 15 MB.</p>
<h2>Poloha kostola na mape</h2>
<p>Polia <strong>GPS šírka</strong> a <strong>GPS dĺžka</strong> určujú bod na mape. Zistíte ich napríklad v Google Mapách: kliknite pravým tlačidlom na kostol a skopírujte prvé číslo (šírka) a druhé číslo (dĺžka).</p>
<h2>Sociálne siete</h2>
<p>V časti <strong>Sociálne siete a odkazy</strong> kliknite na <strong>Pridať odkaz</strong>, zvoľte typ (Facebook, Instagram, YouTube…) a vložte adresu. Nakoniec <strong>Uložiť odkazy</strong>. Odkazy sa zobrazia na stránke farnosti pod kontaktom.</p>
$h$),

('parish', 'sviatosti', 'Sviatosti', 'Ako upraviť informácie o krste, sobáši a ďalších sviatostiach pre vašu farnosť.', 70, $h$
<p>Biskupský úrad pripravil pre každú sviatosť spoločný text – čo treba priniesť a vybaviť. V záložke <strong>Sviatosti</strong> ho môžete prispôsobiť svojej farnosti, napríklad doplniť termíny prípravy.</p>
<ol>
<li>Pri sviatosti kliknite na <strong>Upraviť</strong>.</li>
<li>V poli <strong>Text pre našu farnosť</strong> upravte text.</li>
<li>Kliknite na <strong>Uložiť</strong>.</li>
</ol>
<ul>
<li>Štítok ukazuje, či sa zobrazuje <strong>diecézny text</strong> alebo <strong>vlastný text farnosti</strong>.</li>
<li>Tlačidlo <strong>Diecézny text</strong> vráti spoločný text úradu.</li>
<li>Tlačidlom <strong>Skryť</strong> sekciu zo stránky odstránite, <strong>Zobraziť</strong> ju vráti.</li>
</ul>
<p>Sviatosti sa na stránke zobrazia až po zapnutí verejnej stránky v záložke Prezentácia.</p>
$h$),

('parish', 'uradne-udaje', 'Úradné údaje farnosti', 'Ako navrhnúť zmenu adresy, kontaktu, IČO alebo bankového účtu.', 80, $h$
<p>Záložka <strong>Úradné údaje</strong> ukazuje údaje z registra biskupského úradu: názov, adresu, kontakty, IČO, DIČ, IBAN a správcu farnosti. Tieto údaje sa nemenia priamo – zmenu navrhnete a úrad ju schváli.</p>
<ol>
<li>Kliknite na <strong>Požiadať o zmenu</strong> (vidí ho len správca účtu farnosti).</li>
<li>Upravte údaje, ktoré nesedia.</li>
<li>Do <strong>Poznámky pre biskupský úrad</strong> môžete napísať vysvetlenie.</li>
<li>Kliknite na <strong>Odoslať na schválenie</strong>.</li>
</ol>
<p>Stav návrhu uvidíte v záložke <strong>Prehľad a e-zvonček</strong> v časti <strong>Vaše návrhy zmien</strong>: čaká na schválenie, schválené alebo zamietnuté (aj s dôvodom). Po schválení sa zmena prejaví všade, aj na stránke farnosti.</p>
<h2>Kontroly</h2>
<ul>
<li>IBAN musí mať tvar SK a 22 číslic.</li>
<li>IČO má 6 až 8 číslic.</li>
<li>Dekanát sa meniť nedá.</li>
</ul>
$h$),

('parish', 'obce-a-statistika', 'Obce a štatistika veriacich', 'Odkiaľ sú čísla o veriacich a ako navrhnúť ich opravu.', 90, $h$
<p>Záložka <strong>Obce a štatistika</strong> ukazuje obce farnosti a počet obyvateľov a katolíkov podľa sčítania obyvateľov 2021. Z počtu katolíkov sa počíta predpis farnosti do fondu KROK.</p>
<h2>Návrh opravy</h2>
<ol>
<li>Kliknite na <strong>Navrhnúť opravu</strong> (len správca účtu farnosti).</li>
<li>Upravte čísla v tabuľke, prípadne <strong>Pridať obec</strong>.</li>
<li>Do <strong>Zdôvodnenie / zdroj údajov</strong> napíšte, odkiaľ sú nové čísla.</li>
<li>Kliknite na <strong>Odoslať na schválenie</strong>.</li>
</ol>
<p>Opravu posúdi biskupský úrad. Stav uvidíte v záložke Prehľad.</p>
$h$),

('parish', 'prehlad-a-e-zvoncek', 'Prehľad a e-zvonček', 'Plnenie predpisu, dary z farnosti a online zbierka e-zvonček.', 100, $h$
<p>Záložku <strong>Prehľad a e-zvonček</strong> vidí len správca účtu farnosti.</p>
<h2>Prínos farnosti do fondu KROK</h2>
<ul>
<li><strong>Predpis</strong> = počet katolíkov vo farnosti × koeficient diecézy.</li>
<li><strong>Vybrané</strong> = dary darcov, ktorí si pri registrácii zvolili vašu farnosť.</li>
<li><strong>Plnenie</strong> ukazuje, koľko percent predpisu je splnených.</li>
</ul>
<p>Tabuľka <strong>Prínos farnosti po rokoch</strong> ukazuje len súhrnné čísla. Mená ani sumy jednotlivých darcov sa nezobrazujú.</p>
<h2>Vaše návrhy zmien</h2>
<p>Ak ste navrhli zmenu úradných údajov alebo štatistiky, tu vidíte, či čaká na schválenie, bola schválená alebo zamietnutá.</p>
<h2>E-zvonček</h2>
<p>E-zvonček je online zbierka pre farnosť: veriaci môžu na stránke farnosti darovať kartou, jednorazovo alebo každý mesiac. Peniaze vyzbiera fond KROK a raz mesačne ich pošle na účet farnosti. Odpočíta sa poplatok platobnej brány a poplatok fondu – ich výška je uvedená priamo v záložke.</p>
<ul>
<li><strong>Tento mesiac</strong> – koľko sa vyzbieralo.</li>
<li><strong>Čaká na odoslanie farnosti</strong> – suma pripravená na výplatu.</li>
<li><strong>Pravidelní darcovia</strong> – počet aktívnych mesačných darov.</li>
<li><strong>Výplaty od fondu</strong> – prehľad po mesiacoch, aj s poplatkami a stavom (odoslané / pripravuje sa).</li>
</ul>
<p>E-zvonček zapína diecéza. Ak ho chcete zapnúť, napíšte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a>.</p>
$h$),

('parish', 'navstevnost', 'Návštevnosť stránky', 'Koľko ľudí si pozerá stránku farnosti a ktoré časti najviac.', 110, $h$
<p>Záložka <strong>Návštevnosť</strong> ukazuje, ako sa ľuďom darí stránka farnosti. Údaje sú anonymné – bez cookies a bez osobných údajov.</p>
<ul>
<li>Hore zvolíte obdobie: <strong>7 dní</strong>, <strong>30 dní</strong> alebo <strong>90 dní</strong>.</li>
<li><strong>Zobrazenia stránok</strong> – koľkokrát si niekto otvoril niektorú stránku farnosti.</li>
<li><strong>Návštevy</strong> – koľko návštev to bolo (jedna návšteva môže mať viac zobrazení).</li>
<li>Percento ukazuje zmenu oproti predchádzajúcemu obdobiu.</li>
<li><strong>Najčítanejšie</strong> – ktoré stránky (oznamy, aktuality…) ľudí zaujímali najviac.</li>
</ul>
<p>Ak farnosť ešte nemá verejnú stránku, štatistiky sú prázdne.</p>
$h$),

('parish', 'knazi', 'Kňazi vo farnosti', 'Odkiaľ je zoznam kňazov a čo robiť, keď nesedí.', 120, $h$
<p>Záložka <strong>Kňazi</strong> ukazuje kňazov pôsobiacich vo farnosti podľa registra kňazov biskupského úradu. Na stránke farnosti sa zobrazí len meno, tituly a funkcia – žiadne súkromné kontakty ani fotky.</p>
<p>Zoznam sa v zóne farnosti nedá upraviť. Ak niečo nesedí (napríklad po zmene kaplána), napíšte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a> a úrad opraví register.</p>
$h$)

ON CONFLICT (zone, slug) DO NOTHING;

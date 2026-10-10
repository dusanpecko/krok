-- 054: Pomoc – úvodné návody pre administráciu (/admin/pomoc).
-- ON CONFLICT DO NOTHING: opakované spustenie neprepíše návody upravené v admine (/admin/pomoc/sprava).
-- Slugy zodpovedajú odkazu „Návod k tejto stránke“ (lib/help-links.ts – ADMIN_HELP_ROUTES).

INSERT INTO public.help_articles (zone, slug, title, summary, sort_order, content) VALUES

('admin', 'zaciname-v-administracii', 'Začíname v administrácii', 'Ako je administrácia usporiadaná, čo ukazuje Dashboard a prečo niektoré sekcie nevidíte.', 10, $h$
<p>Administrácia KROK slúži diecéze na správu fondu KROK, farností, registra kňazov a webu dcza.sk. Otvoríte ju na <strong>mojkrok.sk/admin</strong> po prihlásení.</p>
<h2>Menu</h2>
<ul>
<li><strong>Dashboard</strong> – rýchly prehľad: počet darcov, príjmy tento mesiac a rok a počet <strong>nespárovaných</strong> platieb (červené číslo = treba spárovať v Banke). Tabuľka <strong>Posledné príjmy</strong> ukazuje 8 najnovších platieb.</li>
<li><strong>Web KROK</strong> – darcovia, banka, online platby, granty, výzvy, aktuality, podporené projekty, na stiahnutie, sponzori.</li>
<li><strong>Farnosti</strong>, <strong>Schematizmus</strong> (register kňazov, kúria), <strong>Kňazská zóna</strong>, <strong>Web diecézy</strong>.</li>
<li><strong>Nastavenia</strong> – dekanáty, e-mailové šablóny, import výpisu, správa rolí.</li>
<li><strong>Pomoc</strong> – tieto návody.</li>
</ul>
<h2>Prečo niektoré sekcie nevidím?</h2>
<p>Každá sekcia vyžaduje oprávnenie a menu ukazuje len tie, ku ktorým máte prístup. Oprávnenia sa prideľujú cez roly (napríklad Zamestnanec biskupského úradu, Kúria) v sekcii <strong>Správa rolí</strong>. Administrátor má všetko. Ak sa zobrazí „Prístup zamietnutý“, požiadajte administrátora o rolu.</p>
<h2>Návody</h2>
<p>Na každej stránke administrácie je vpravo hore odkaz <strong>Návod k tejto stránke</strong>. Návody pre farnosti (ako pracujú kňazi vo svojej zóne) nájdete v Pomoci v zóne farnosti – hodia sa, keď farnosti radíte.</p>
$h$),

('admin', 'darcovia', 'Darcovia', 'Vyhľadanie a úprava darcu, variabilný symbol, filtre a export do Excelu.', 20, $h$
<p>Sekcia <strong>Darcovia</strong> (oprávnenie „view_donors“) je evidencia darcov fondu KROK.</p>
<h2>Vyhľadanie a filtre</h2>
<ul>
<li>Do poľa hľadania zadajte meno, variabilný symbol (VS) alebo e-mail a stlačte Enter.</li>
<li><strong>Filtre</strong> – stav darcu, projekt, farnosť, obdobie darov a označení darcovia. Potvrdíte <strong>Použiť filtre</strong>, zrušíte <strong>Vyčistiť</strong>.</li>
<li>Kliknutím na hlavičku stĺpca zoradíte tabuľku.</li>
</ul>
<h2>Export</h2>
<p><strong>Export</strong> → Excel alebo CSV stiahne <strong>všetkých</strong> darcov podľa aktuálnych filtrov (nielen viditeľnú stranu). Ak zaškrtnete len niektorých, môžete exportovať len označených. Súbor obsahuje osobné údaje – narábajte s ním opatrne.</p>
<h2>Nový darca</h2>
<ol>
<li>Kliknite na <strong>Pridať darcu</strong>.</li>
<li>Zvoľte <strong>Osoba</strong> alebo <strong>Firma / Org.</strong>, vyplňte meno, kontakt a adresu.</li>
<li>Variabilný symbol sa vygeneruje sám. Ak darca už VS má (napríklad zo starého systému), kliknite na <strong>Zadať vlastný VS</strong>.</li>
<li>Zvoľte <strong>Farnosť</strong> a prípadne <strong>Podporovaný projekt</strong>, spôsob potvrdenia o dare (e-mailom / poštou).</li>
<li>Kliknite na <strong>Uložiť darcu</strong>.</li>
</ol>
<h2>Dobré vedieť</h2>
<ul>
<li>VS musí byť jedinečný. Po uložení VS sa k darcovi <strong>samy pripoja</strong> doterajšie nespárované alebo anonymné platby s týmto VS.</li>
<li>Pri úprave darcu vidíte <strong>Históriu darov</strong> po rokoch.</li>
<li>Menu ⋮ v riadku: upraviť, nastaviť ako neaktívny, <strong>Zobraziť platby</strong> (otvorí Banku s VS darcu).</li>
<li>Mazanie darcov zatiaľ nie je možné – nepotrebného darcu nastavte ako neaktívneho.</li>
</ul>
$h$),

('admin', 'banka-a-parovanie', 'Banka – import výpisov a párovanie platieb', 'Ako sa platby dostanú do Kroku, ako ich spárovať s darcami a rozúčtovať inkaso pošty.', 30, $h$
<p>Sekcia <strong>Banka</strong> (oprávnenie „view_bank“) ukazuje platby na účte fondu. Každý príjem treba spárovať s darcom – červené riadky sú <strong>nespárované</strong>.</p>
<h2>Ako sa platby dostanú do Kroku</h2>
<ul>
<li><strong>Automaticky</strong> – každú noc sa stiahnu platby z Fio banky.</li>
<li><strong>Synchronizovať banku</strong> – stiahne posledných 30 dní hneď.</li>
<li><strong>Synchronizovať rok</strong> – celý rok; už načítané platby sa preskočia. Pri starších obdobiach (viac ako 90 dní) treba požiadavku potvrdiť v internetbankingu Fio a spustiť znova.</li>
<li><strong>Import výpisu</strong> (Nastavenia → Import výpisu) – nahráte XML výpis z Fio (formát camt.053). Ten istý výpis sa nedá naimportovať dvakrát.</li>
</ul>
<p>Pri načítaní sa platby párujú samy: podľa <strong>VS</strong> k darcovi a podľa <strong>špecifického symbolu</strong> k výzve.</p>
<h2>Ručné párovanie</h2>
<ol>
<li>Filtrom zvoľte <strong>Len nespárované</strong>.</li>
<li>Pri platbe kliknite na <strong>Spárovať ručne</strong>.</li>
<li>Vyhľadajte darcu podľa mena alebo VS (alebo použite anonymný profil <strong>DARY Donátor</strong>).</li>
<li>Ak treba, zvoľte projekt a kliknite na <strong>Spárovať a uložiť dar</strong>.</li>
</ol>
<p><strong>Inteligentné návrhy</strong> navrhnú darcov podľa IBAN, symbolov a mena – môžete ich spárovať po jednom alebo naraz. Pri „Viacero zhôd“ vyberte správneho darcu ručne.</p>
<p><strong>Spárovať nespárované (Anonymné)</strong> priradí <strong>všetky</strong> nespárované príjmy zvoleného obdobia anonymnému darcovi – použite to až na konci, keď ostali len platby, ktoré sa priradiť nedajú.</p>
<h2>Inkaso Slovenskej pošty</h2>
<p>Pri platbe od pošty kliknite na <strong>Rozúčtovať podľa PDF</strong>, nahrajte PDF „Opis úhrad k prevodu“, pri každom riadku zvoľte darcu (alebo nového darcu z PDF) a potvrďte <strong>Rozúčtovať</strong>. Rozúčtovanie sa dá zrušiť tlačidlom <strong>Zrušiť rozúčtovanie</strong>.</p>
<h2>Pozor</h2>
<ul>
<li><strong>Výplaty Mollie</strong> (online dary) nepárujte – dary sú už zapísané v Online platbách, rátali by sa dvakrát.</li>
<li>Párovať sa dajú len príjmy, nie výdavky.</li>
<li>Stĺpec <strong>Výzva</strong> ukazuje, na ktorú výzvu sa dar ráta; zmeniť ju môžete až pri spárovanej platbe.</li>
</ul>
$h$),

('admin', 'online-platby', 'Online platby (Mollie)', 'Dary kartou – jednorazové a pravidelné, stav platieb a zrušenie pravidelného daru.', 40, $h$
<p><strong>Online platby</strong> ukazujú dary kartou cez platobnú bránu Mollie. Hore vidíte režim: <strong>LIVE</strong> (skutočné platby) alebo <strong>TEST</strong> (skúšobné).</p>
<h2>Záložka Platby</h2>
<ul>
<li>Typ: jednorazový, pravidelný – 1. platba, pravidelný – opakovaná.</li>
<li>Stav: Zaplatené, Otvorené, Čaká, Zlyhalo, Zrušené, Expirované…</li>
<li>Štítok <strong>E-zvonček · farnosť</strong> označuje dar pre farnosť – nie je to príjem fondu.</li>
<li><strong>Sync</strong> pri platbe stiahne aktuálny stav z Mollie.</li>
</ul>
<h2>Záložka Pravidelné dary</h2>
<p>Zoznam mesačných a ročných darov s ďalším termínom platby. <strong>Zrušiť</strong> zastaví ďalšie platby – <strong>nedá sa vrátiť späť</strong>, darca by musel dar založiť znova.</p>
<h2>Upozornenie „Zaplatená prvá platba bez založeného predplatného“</h2>
<p>Darca zaplatil prvú platbu pravidelného daru, ale opakované platby sa nezaložili. Kliknite na <strong>Sync a založiť predplatné</strong>.</p>
<p>Výplaty z Mollie, ktoré prídu na účet, sa v Banke nepárujú.</p>
$h$),

('admin', 'vyzvy-a-projekty', 'Výzvy a projekty', 'Založenie výzvy na podporu, párovanie platieb cez symboly a online darovanie.', 50, $h$
<p>Sekcia <strong>Výzvy a projekty</strong> obsahuje výzvy zobrazené na webe (/vyzvy) aj interné fondy, ku ktorým sa párujú platby.</p>
<h2>Nová výzva</h2>
<ol>
<li>Kliknite na <strong>Nová výzva</strong>.</li>
<li>V záložke <strong>Základné</strong> vyplňte názov, perex, kategóriu, cieľovú sumu, termíny a hlavný obrázok (16:9). <strong>Stav</strong>: Návrh, Aktívna alebo Ukončená. <strong>Zobraziť na webe</strong> ju zverejní, <strong>Zvýrazniť na domovskej stránke</strong> ju pridá na úvod mojkrok.sk.</li>
<li>Kliknite na <strong>Vytvoriť výzvu</strong>. Ďalšie záložky (rozpočet, galéria, harmonogram, správy, dary) sa sprístupnia až po prvom uložení.</li>
<li>V záložke <strong>Obsah</strong> napíšte popis, prípadne video.</li>
<li>V záložke <strong>Financie</strong> nastavte <strong>Špecifický symbol</strong> – bankové platby s týmto symbolom sa k výzve priradia samy – a možnosti online darovania.</li>
</ol>
<h2>Dobré vedieť</h2>
<ul>
<li><strong>Darovať možno do</strong> – po tomto dátume sa formulár na darovanie skryje.</li>
<li>Adresu výzvy (slug) po zverejnení nemeňte – rozbili by sa zdieľané odkazy.</li>
<li>Špecifický symbol a starý VS musia byť jedinečné.</li>
<li>Výzvu s darmi zmazať nemožno – nastavte ju ako <strong>Ukončenú</strong> a skryte ju z webu. Pri ukončenej výzve sa zobrazí <strong>Záverečná správa</strong>.</li>
<li>V záložke <strong>Správy</strong> pridáte aktualitu k výzve.</li>
</ul>
$h$),

('admin', 'granty', 'Granty – výzvy a žiadosti', 'Spustenie grantovej výzvy, hodnotenie žiadostí, schválenie a zamietnutie.', 60, $h$
<p>Sekcia <strong>Granty</strong> (oprávnenie „view_grants“) spravuje grantové výzvy a žiadosti o podporu.</p>
<h2>Spustenie grantovej výzvy</h2>
<ol>
<li>Záložka <strong>Nastavenie Aktívnych Výziev</strong> → <strong>Spustiť novú výzvu</strong>.</li>
<li>Vyplňte názov, adresu (slug), typ formulára (žiadosť alebo záverečná správa) a inštrukcie pre žiadateľov.</li>
<li>Kliknite na <strong>Spustiť výzvu live!</strong> – formulár je hneď verejný.</li>
</ol>
<h2>Žiadosti</h2>
<p>V záložke <strong>Doručené Žiadosti</strong> filtrujete podľa výzvy a stavu. V riadku môžete priradiť <strong>hodnotiteľa</strong> (používateľ s rolou Kontrolór) – žiadosť sa tým presunie do stavu Posudzované. Kontrolór potom napíše posudok a známku.</p>
<h2>Rozhodnutie</h2>
<ul>
<li><strong>Schváliť a vytvoriť projekt</strong> – zadáte schválenú sumu, VS žiadateľa a špecifický symbol. <strong>Automaticky sa vytvorí verejná výzva</strong> vo Výzvach a projektoch, ku ktorej sa budú párovať platby.</li>
<li><strong>Vrátiť na doplnenie</strong> – napíšte pokyny, čo má žiadateľ opraviť.</li>
<li><strong>Zamietnuť žiadosť</strong> – je to <strong>definitívne</strong>, žiadateľ už nemôže nič meniť.</li>
</ul>
<p><strong>Exportovať filtre do CSV</strong> stiahne zoznam žiadostí.</p>
$h$),

('admin', 'web-krok-obsah', 'Web KROK – aktuality, podporené projekty, na stiahnutie, sponzori', 'Obsah webu mojkrok.sk, ktorý nespravujú iné sekcie.', 70, $h$
<h2>Aktuality</h2>
<ol>
<li><strong>Pridať článok</strong>, vyplňte <strong>Nadpis</strong> a <strong>Obsah príspevku</strong> (oba povinné).</li>
<li>Nahrajte titulný obrázok a napíšte krátky úryvok (alebo <strong>Auto-Zhrnutie</strong>).</li>
<li><strong>Stav článku</strong>: Koncept, Zverejnené alebo Archivované; <strong>Dátum publikovania</strong>.</li>
<li>Ak sa článok týka výzvy, zvoľte <strong>Súvisiaca výzva</strong> – zobrazí sa aj na jej stránke.</li>
<li><strong>Uložiť článok</strong>.</li>
</ol>
<p>Asistent AI vie pomôcť s konceptom textu a gramatikou; <strong>Vygenerovať nahrávku</strong> pripraví predčítanie článku. Text vždy skontrolujte. Zmazanie článku je trvalé (aj obrázky a nahrávka). Aktuality Kroku sa zobrazujú aj na dcza.sk v kategórii KROK.</p>
<h2>Podporené projekty</h2>
<p>Verejný prehľad projektov, ktoré fond podporil, podľa rokov. <strong>Pridať projekt</strong> – názov, rok, organizátor, suma, typ podpory (grantová / negrantová), obrázok, <strong>Zobraziť na webe</strong>. Nesúvisí s Výzvami – slúži len na prezentáciu.</p>
<h2>Na stiahnutie</h2>
<p>Dokumenty, výročné správy a logá na stránke Na stiahnutie. <strong>Pridať položku</strong> – kategória, názov, aspoň jeden súbor (do 4 MB). Zmazaním položky sa zmažú aj súbory.</p>
<h2>Sponzori</h2>
<p>Logá v páse „Podporili nás“ na úvode mojkrok.sk. <strong>Pridať sponzora</strong> – názov, web, logo (môžete ho orezať), prípadne logo na tmavý podklad. <strong>Zverejniť od / do</strong> – po skončení obdobia logo samo zmizne. <strong>Poradie</strong> 1 = prvé.</p>
$h$),

('admin', 'emailove-sablony', 'E-mailové šablóny', 'Úprava automatických e-mailov (poďakovanie za dar, pozvánky…) a testovacie odoslanie.', 80, $h$
<p>Krok posiela automatické e-maily – poďakovanie za dar, pozvánky do zóny farnosti a kňazskej zóny, obnovu hesla a ďalšie. Ich text upravíte v Nastavenia → <strong>E-mailové šablóny</strong> (oprávnenie „manage_config“).</p>
<ol>
<li>Kliknite na šablónu.</li>
<li>Upravte <strong>Predmet e-mailu</strong> a <strong>Obsah e-mailu</strong>. Hlavička a pätička KROK sa pridajú samy.</li>
<li>Premenné ako <strong>{{first_name}}</strong> alebo <strong>{{amount}}</strong> sa nahradia údajmi darcu. Zoznam je v časti <strong>Dostupné premenné</strong> – kliknutím premennú skopírujete.</li>
<li>Pozrite si <strong>Náhľad s ukážkovými údajmi</strong>.</li>
<li><strong>Poslať test mne</strong> vám pošle e-mail tak, ako práve vyzerá (aj neuložený).</li>
<li>Kliknite na <strong>Uložiť</strong>.</li>
</ol>
<ul>
<li>Ak zrušíte <strong>Aktívna</strong>, e-mail sa ľuďom prestane posielať (test funguje ďalej).</li>
<li>E-mail odosielateľa musí byť overený v službe Brevo, inak sa e-mail neodošle. Pri zmene odosielateľa sa poraďte s administrátorom.</li>
<li>Nové šablóny sa v administrácii nepridávajú – pripravuje ich vývojár.</li>
<li>Dole je prehľad <strong>Posledných odoslaných e-mailov</strong>.</li>
</ul>
$h$),

('admin', 'roly-a-opravnenia', 'Roly a oprávnenia', 'Ako prideliť používateľovi rolu a ako fungujú oprávnenia.', 90, $h$
<p>Prístup do sekcií administrácie riadia <strong>roly</strong> (Administrátor, Zamestnanec biskupského úradu, Kúria, Kontrolór…). Každá rola má súbor <strong>oprávnení</strong>. Spravuje ich Nastavenia → <strong>Správa rolí</strong> (oprávnenie „manage_roles“).</p>
<h2>Pridelenie roly</h2>
<ol>
<li>Používateľ sa musí najprv sám zaregistrovať na mojkrok.sk (alebo mať účet z pozvánky).</li>
<li>Vyhľadajte ho podľa mena, e-mailu alebo VS.</li>
<li>Kliknite na <strong>Spravovať roly</strong> a kliknutím zapnite alebo vypnite rolu. <strong>Ukladá sa hneď.</strong></li>
<li>Zavrite okno tlačidlom <strong>Hotovo</strong>.</li>
</ol>
<h2>Matica oprávnení</h2>
<p>Záložka <strong>Matica oprávnení</strong> ukazuje, ktorá rola má ktoré oprávnenie. Kliknutím na políčko oprávnenie pridáte alebo odoberiete – zmena platí hneď pre všetkých používateľov s touto rolou. Administrátor má vždy všetko.</p>
<p>Prístupy farností do zóny farnosti sa neprideľujú tu, ale v detaile farnosti (záložka Prístupy a návrhy). Kňazi sa do kňazskej zóny pozývajú v Kňazskej zóne.</p>
$h$),

('admin', 'nastavenia-a-dekanaty', 'Nastavenia – dekanáty', 'Pridanie a premenovanie dekanátu.', 100, $h$
<p>Nastavenia → <strong>Dekanáty</strong> (oprávnenie „manage_config“) obsahuje dekanáty diecézy a počet ich farností.</p>
<ul>
<li><strong>Pridať dekanát</strong> – zadáte názov a <strong>Vytvoriť dekanát</strong>.</li>
<li><strong>Upraviť</strong> – zmena názvu sa prejaví všade.</li>
<li><strong>Zmazať</strong> sa dá len dekanát bez farností. Farnosť presuniete do iného dekanátu v jej detaile (Farnosti → Základné údaje).</li>
</ul>
$h$),

('admin', 'ako-upravovat-navody', 'Ako upravovať návody v Pomoci', 'Pre správcov: úprava a pridávanie návodov pre farnosti a administráciu.', 900, $h$
<p>Návody v Pomoci upravuje používateľ s oprávnením „Pomoc – návody“ (manage_help). Na stránke Pomoc kliknite na <strong>Spravovať návody</strong>.</p>
<ol>
<li>Zvoľte návod alebo <strong>Nový návod</strong>.</li>
<li>Vyplňte <strong>Názov</strong>, <strong>Krátky popis</strong> (zobrazí sa v zozname) a <strong>Zónu</strong> – zóna farnosti alebo administrácia.</li>
<li><strong>Adresa (slug)</strong> – malé písmená bez diakritiky a pomlčky, napr. „oznamy-a-aktuality“. Pri existujúcich návodoch ju nemeňte – vedú na ňu odkazy „Návod k záložke“ a „Návod k tejto stránke“.</li>
<li><strong>Poradie</strong> určuje poradie v zozname (menšie číslo = vyššie).</li>
<li>Napíšte text v editore a kliknite na <strong>Uložiť</strong>. Zrušením <strong>Zverejnený</strong> návod skryjete.</li>
</ol>
<h2>Ako písať</h2>
<ul>
<li>Píšte pre človeka bez technického vzdelania, vykajte.</li>
<li>Postup dajte do číslovaného zoznamu, jeden krok = jedna akcia.</li>
<li>Názvy tlačidiel a záložiek píšte tučne a presne tak, ako sú na obrazovke.</li>
<li>Upozornite na nevratné kroky (zmazanie, e-mail všetkým kňazom…).</li>
</ul>
$h$),

('admin', 'farnosti', 'Farnosti – register a detail farnosti', 'Zoznam farností, detail so záložkami, prístupy do zóny farnosti a „Prihlásiť sa za farnosť“.', 200, $h$
<p>Sekcia <strong>Farnosti</strong> (oprávnenie „manage_parishes“) je register farností a duchovných správ diecézy.</p>
<h2>Zoznam</h2>
<ul>
<li>Hľadať môžete podľa názvu, obce, kódu alebo farára; filtrovať podľa dekanátu a typu.</li>
<li><strong>Len s chýbajúcimi údajmi</strong> ukáže farnosti, ktorým niečo chýba (stĺpec <strong>Chýba</strong>).</li>
<li>Stĺpec <strong>Vybrané / predpis</strong> ukazuje, koľko percent predpisu farnosť tento rok splnila.</li>
<li>Tlačidlá hore vedú na <strong>Predpisy</strong>, <strong>Príspevky</strong> (najnovšie od farností), <strong>Sviatosti</strong> (diecézne texty) a <strong>E-zvonček</strong> (mesačné vyúčtovanie). Ak čakajú návrhy od farností, zobrazí sa aj <strong>Na schválenie</strong>.</li>
<li><strong>Nová</strong> založí farnosť alebo duchovnú správu – zadáte názov, typ a dekanát a ostatné údaje doplníte v detaile.</li>
</ul>
<h2>Detail farnosti</h2>
<p>Záložky: Základné údaje, Obce a štatistika, Bohoslužby a úradné hodiny, Oznamy a aktuality, Galéria, Sviatosti, Kňazi, Dary a história, E-zvonček, Návštevnosť, Prístupy a návrhy. Diecéza tu mení údaje priamo, bez schvaľovania; každá zmena sa zapíše do <strong>História zmien</strong> (záložka Dary a história).</p>
<ul>
<li><strong>Základné údaje</strong> – identita, kontakt, sviatky, text na stránku. <strong>Aktívna</strong> = farnosť sa ponúka darcom pri výbere. <strong>Verejná stránka farnosti zapnutá</strong> = zobrazia sa oznamy, aktuality a sviatosti. <strong>Interná poznámka</strong> farnosť ani verejnosť nevidí.</li>
<li><strong>Obce a štatistika</strong> – prvá obec je sídlo farnosti. Z počtu katolíkov sa počíta predpis.</li>
<li><strong>Kňazi</strong> – len na čítanie; zmenu pôsobenia zapíšte pri kňazovi v registri (<strong>Nové menovanie</strong>).</li>
<li><strong>Galéria</strong> – diecéza môže zmeniť kvótu úložiska (<strong>Zmeniť kvótu</strong>) a album stiahnuť s dôvodom (<strong>Stiahnuť album</strong>, späť <strong>Znova zverejniť</strong>).</li>
<li><strong>E-zvonček</strong> – zapnutie a poplatky farnosti (pozri návod E-zvonček – vyúčtovanie). Bez platného IBAN sa zapnúť nedá.</li>
</ul>
<h2>Prístup do zóny farnosti</h2>
<ol>
<li>V detaile otvorte záložku <strong>Prístupy a návrhy</strong>.</li>
<li>Vyplňte <strong>E-mail</strong>, <strong>Rolu</strong> (správca účtu alebo editor), <strong>Funkciu</strong> (napr. farár) a <strong>Oslovenie v e-maile</strong>.</li>
<li>Kliknite na <strong>Prideliť prístup</strong>.</li>
</ol>
<p>Nový používateľ dostane pozvánku na nastavenie hesla, existujúci účet len oznámenie. Správca účtu je pre farnosť len jeden – pridaním nového sa doterajší zmení na editora. Editor nevidí prehľad darov ani nenavrhuje zmeny údajov. Ak e-mail neodíde, prístup je pridelený – pozvánku pošlete znova ikonou obálky v riadku. <strong>Odobrať prístup</strong> ho okamžite zruší.</p>
<h2>Prihlásiť sa za farnosť</h2>
<p>Tlačidlo v hlavičke detailu otvorí zónu farnosti presne tak, ako ju vidí kňaz. Hore svieti žltý pás – <strong>zmeny sa ukladajú naostro</strong> a v histórii budú pod vaším menom. Späť sa vrátite tlačidlom <strong>Späť do adminu</strong>.</p>
$h$),

('admin', 'predpisy-farnosti', 'Predpisy farností na rok', 'Nastavenie koeficientu, generovanie predpisov, ručná úprava s dôvodom a export.', 210, $h$
<p>Predpis farnosti = počet katolíkov × suma na katolíka. Stránku otvoríte v Farnosti → <strong>Predpisy</strong>; rok zvolíte tlačidlami hore.</p>
<h2>Nový rok</h2>
<ol>
<li>V karte <strong>Nastavenie</strong> vyplňte <strong>€ na katolíka</strong>, <strong>Rok štatistiky</strong>, prípadne <strong>Zaokrúhliť na €</strong> a <strong>Poznámku</strong>.</li>
<li>Kliknite na <strong>Uložiť nastavenie</strong>.</li>
<li>Kliknite na <strong>Vygenerovať chýbajúce predpisy</strong>. Farnosti bez štatistiky sa preskočia – hlásenie ich vymenuje.</li>
</ol>
<p>Vygenerovaný rok sa sám neprepočítava. Ak sa zmení štatistika alebo koeficient, použite <strong>Prepočítať neupravené</strong> – ručne upravené predpisy ostanú bez zmeny.</p>
<h2>Ručná úprava predpisu</h2>
<ol>
<li>Pri farnosti kliknite na ceruzku <strong>Upraviť predpis</strong>.</li>
<li>Zadajte sumu a do poľa <strong>Dôvod</strong> napíšte, prečo sa líši od výpočtu – dôvod je povinný.</li>
<li>Potvrďte ikonou <strong>Uložiť</strong>.</li>
</ol>
<p>Upravený riadok ukazuje „upravené“ aj pôvodný výpočet. <strong>Export XLSX</strong> stiahne celú tabuľku do Excelu.</p>
$h$),

('admin', 'schvalovanie-navrhov', 'Schvaľovanie návrhov od farností', 'Ako schváliť alebo zamietnuť zmenu úradných údajov a štatistiky.', 220, $h$
<p>Farnosti nemenia úradné údaje ani štatistiku veriacich priamo – posielajú návrh. Všetky návrhy nájdete v Farnosti → <strong>Na schválenie</strong> (aj v detaile farnosti v záložke Prístupy a návrhy).</p>
<ul>
<li>Pri návrhu vidíte farnosť, typ (Úradné údaje / Štatistika veriacich), dátum a kto ho poslal.</li>
<li>Pôvodná hodnota je prečiarknutá červenou, navrhovaná zelenou; pri štatistike stĺpce <strong>Teraz</strong> a <strong>Návrh</strong>.</li>
<li>Ak farnosť pridala vysvetlenie, je v riadku <strong>Poznámka farnosti</strong>.</li>
</ul>
<ol>
<li>Skontrolujte zmenu.</li>
<li>Kliknite na <strong>Schváliť</strong> – zmena sa zapíše do registra a do histórie. Schválená štatistika nahradí zoznam obcí farnosti.</li>
<li>Alebo <strong>Zamietnuť</strong> – napíšte dôvod; farnosť ho uvidí vo svojej zóne.</li>
</ol>
<p>Ak sa zmení štatistika, nezabudnite prípadne prepočítať predpis (Predpisy → Prepočítať neupravené).</p>
$h$),

('admin', 'prispevky-farnosti', 'Príspevky farností – kontrola a stiahnutie', 'Prehľad najnovších oznamov a aktualít z farností a ako stiahnuť nevhodný príspevok.', 230, $h$
<p>Farnosti zverejňujú oznamy a aktuality bez schvaľovania. Stránka Farnosti → <strong>Príspevky</strong> („Najnovšie od farností“) ukazuje, čo práve pribudlo.</p>
<ol>
<li>Príspevok si otvorte tlačidlom <strong>Zobraziť</strong>.</li>
<li>Ak je nevhodný, kliknite na <strong>Stiahnuť</strong> a napíšte dôvod – farnosť ho uvidí.</li>
<li>Stiahnutý príspevok zmizne zo stránky. Farnosť ho môže opraviť, znova ho však zverejní len diecéza tlačidlom <strong>Obnoviť</strong> (filter <strong>Stiahnuté</strong>).</li>
</ol>
<p>Albumy galérie sa sťahujú podobne – v detaile farnosti, záložka Galéria → <strong>Stiahnuť album</strong>.</p>
$h$),

('admin', 'sviatosti-dieceza', 'Sviatosti – diecézne texty', 'Spoločné texty o sviatostiach pre všetky farnosti.', 240, $h$
<p>Farnosti → <strong>Sviatosti</strong> obsahuje diecézne texty „čo treba vybaviť“ pri každej sviatosti. Zobrazujú sa na stránkach všetkých farností, ktoré nemajú vlastnú verziu.</p>
<ol>
<li>Pri sviatosti kliknite na <strong>Upraviť</strong>.</li>
<li>Upravte <strong>Názov</strong> a <strong>Text</strong>, prípadne sviatosť vypnite.</li>
<li>Kliknite na <strong>Uložiť</strong>.</li>
</ol>
<p>Označenie <strong>vlastný text má N farností</strong> upozorňuje, že pre tieto farnosti sa zmena neprejaví – majú vlastný text. Text konkrétnej farnosti upravíte v jej detaile v záložke Sviatosti.</p>
$h$),

('admin', 'e-zvoncek-vyuctovanie', 'E-zvonček – zapnutie a mesačné vyúčtovanie', 'Ako zapnúť e-zvonček farnosti a raz mesačne poslať farnostiam vyzbierané peniaze.', 250, $h$
<p>E-zvonček je online zbierka farnosti: veriaci darujú kartou na stránke farnosti, fond peniaze vyzbiera a raz mesačne pošle farnostiam. Dary cez e-zvonček sa <strong>nerátajú do plnenia predpisu</strong>.</p>
<h2>Zapnutie pre farnosť</h2>
<ol>
<li>V detaile farnosti otvorte záložku <strong>E-zvonček</strong>. Farnosť musí mať platný IBAN.</li>
<li>Zaškrtnite <strong>E-zvonček je zapnutý</strong>, skontrolujte <strong>Poplatok Mollie (%)</strong> a <strong>Poplatok fondu (%)</strong>, prípadne nadpis a text pre darcov.</li>
<li>Uložte. Na stránke farnosti sa zobrazí možnosť darovať.</li>
</ol>
<p>Predvolené poplatky pre farnosti, ktoré ešte e-zvonček nemajú nastavený, sú na stránke vyúčtovania v karte <strong>Predvolené poplatky diecézy</strong>.</p>
<h2>Mesačné vyúčtovanie</h2>
<p>Farnosti → <strong>E-zvonček</strong>. Predvolene je zvolený predchádzajúci mesiac (iný zvolíte poľom <strong>Mesiac</strong> a <strong>Zobraziť</strong>).</p>
<ol>
<li>Kliknite na <strong>Vytvoriť výplaty</strong>.</li>
<li>Stiahnite <strong>SEPA XML</strong> a v internetbankingu Fio ho nahrajte cez <strong>Import príkazov</strong>. Pre kontrolu môžete stiahnuť aj <strong>Excel</strong>.</li>
<li>Až keď príkaz v banke zadáte, kliknite na <strong>Označiť ako odoslané</strong>. Farnosti uvidia výplatu ako odoslanú.</li>
</ol>
<p>Farnosť s chýbajúcim IBAN je označená <strong>chýba IBAN</strong>. Výplatu v stave „čaká na odoslanie“ môžete zrušiť – dary sa presunú do ďalšieho vyúčtovania.</p>
$h$),

('admin', 'register-knazov', 'Register kňazov', 'Zoznam, detail kňaza, zmena stavu (diakon, kňaz), menovania a pôsobenia.', 300, $h$
<p><strong>Register kňazov</strong> (Schematizmus) je zdroj pravdy o kňazoch, diakonoch a bohoslovcoch diecézy. Z neho sa berú kňazi na stránkach farností a verejný schematizmus na dcza.sk. Prezerať ho môže rola s oprávnením „view_clergy“, meniť s „manage_clergy“.</p>
<h2>Zoznam</h2>
<ul>
<li>Farebné tlačidlá hore sú zároveň legenda a filter (bohoslovec, diakon, farský vikár, farár…).</li>
<li>Rozsah <strong>V službe</strong> / <strong>Archív</strong> / <strong>Všetci</strong>, filter dekanátu a vyhľadávanie podľa mena, farnosti, funkcie či osobného čísla.</li>
<li><strong>Export – v službe</strong> a <strong>Export – všetci</strong> stiahnu Excel. <strong>Pozor:</strong> obsahuje súkromné údaje (kontakty, dátum narodenia, trvalý pobyt) – neposielajte ho ďalej.</li>
<li><strong>Nová osoba</strong> – meno, priezvisko, kategória (pri bohoslovcovi rok nástupu; ročník sa zvyšuje sám k 1. 9.).</li>
</ul>
<h2>Detail kňaza</h2>
<p>Záložky: Základné, Pôsobenie, Kontakty, Osobné a vzdelanie, Svätenia a ŽD, História zmien. Každá sekcia sa ukladá samostatne. Kontakty sú interné – verejne sa nezobrazujú; na webe je len meno, tituly, funkcia a „pochádza“.</p>
<h2>Nové menovanie</h2>
<ol>
<li>V záložke <strong>Pôsobenie</strong> vyplňte <strong>Nové menovanie</strong>: druh (farnosť, dekanát, diecéza, iné), funkciu, miesto, dátum <strong>Od</strong> a poznámku (napr. číslo dekrétu).</li>
<li>Pri preložení zaškrtnite <strong>Hlavné pôsobenie</strong> a <strong>Ukončiť doterajšie hlavné (a farské) pôsobenie</strong>.</li>
<li>Kliknite na <strong>Zapísať menovanie</strong>. Zmena sa hneď prejaví v zozname kňazov farnosti.</li>
</ol>
<p>Pri pôsobení sú ikony: <strong>Opraviť záznam</strong> (preklep, dátum), <strong>Označiť ako hlavné</strong>, <strong>Ukončiť</strong> (zadáte dátum) a <strong>Zmazať</strong> – len pri chybnom zázname; skončené pôsobenie vždy ukončite, nemažte.</p>
<h2>Zmena stavu</h2>
<p>Tlačidlo <strong>Zmeniť stav</strong> ponúkne ďalší stupeň: bohoslovec → diakon → kňaz. Pri svätení zadáte dátum, miesto a svätiteľa. Odchod alebo úmrtie nastavíte v záložke Základné → <strong>Stav</strong>.</p>
<p>Každá úprava sa zapíše do záložky <strong>História zmien</strong>.</p>
$h$),

('admin', 'vyrocia-a-stitky', 'Výročia, meniny a adresné štítky', 'Zoznam jubileí pre noviny a obežník, tlač adresných štítkov.', 310, $h$
<h2>Výročia a meniny</h2>
<p>Register kňazov → <strong>Výročia a meniny</strong> počíta jubileá kňazstva (každých 5 rokov od 10.), životné jubileá (od 40 rokov), výročia úmrtia (1. a potom každých 5 rokov) a meniny. Výrazné jubileá sú tučne.</p>
<ol>
<li>Zvoľte rok a mesiac (alebo celý rok) a druhy výročí.</li>
<li>Ak chcete len okrúhle výročia, zaškrtnite <strong>len výrazné jubileá</strong>.</li>
<li><strong>Export pre Katolícke noviny / obežník</strong> stiahne Excel.</li>
</ol>
<h2>Adresné štítky</h2>
<p>Register kňazov → <strong>Adresné štítky</strong> pripraví hárok 3 × 8 štítkov (70 × 37 mm). Adresa je farský úrad hlavného pôsobenia, pri kúrii biskupský úrad, inak trvalý pobyt.</p>
<ol>
<li>Zvoľte <strong>V službe</strong> alebo <strong>Aj na odpočinku a štúdiách</strong>, prípadne dekanát, a kliknite na <strong>Zobraziť</strong>.</li>
<li>Kliknite na <strong>Tlačiť</strong>. V okne tlače nastavte mierku <strong>100 %</strong> a <strong>bez okrajov</strong>.</li>
</ol>
$h$),

('admin', 'kuria-rady-a-komisie', 'Kúria, rady a komisie', 'Orgány diecézy a ich členovia – zobrazujú sa na dcza.sk v schematizme.', 320, $h$
<p>Schematizmus → <strong>Kúria, rady a komisie</strong> spravuje orgány diecézy v skupinách Diecézna kúria, Rady a komisie a Pastoračné úseky. Zobrazujú sa na dcza.sk.</p>
<h2>Nový orgán</h2>
<p>Vo formulári <strong>Nový orgán</strong> zadajte názov, <strong>Názov v 2. páde</strong> (použije sa v texte „člen Presbyterskej rady“) a druh. Poradie meníte šípkami <strong>Vyššie</strong> / <strong>Nižšie</strong>.</p>
<h2>Členovia</h2>
<ol>
<li>Otvorte orgán a v časti <strong>Pridať člena</strong> zvoľte <strong>Kňaz / diakon z registra</strong> alebo <strong>Laik, rehoľník (mimo registra)</strong>.</li>
<li>Vyberte kňaza alebo vyplňte meno a tituly, funkciu a dátum <strong>Od</strong>.</li>
<li>Kliknite na <strong>Pridať</strong>.</li>
</ol>
<p>Členstvo kňaza sa zobrazí aj v jeho profile. Skončené členstvo <strong>ukončite</strong> (ostane v histórii); <strong>Zmazať</strong> použite len pri chybnom zázname.</p>
<p>V časti <strong>Údaje orgánu</strong> môžete doplniť popis na webe alebo orgán skryť (<strong>Zobraziť na webe</strong>). Zmazanie orgánu je nevratné.</p>
$h$),

('admin', 'knazska-zona', 'Kňazská zóna – dokumenty pre kňazov', 'Nahranie obežníka, zverejnenie s e-mailom kňazom, kategórie a pozvánky kňazov.', 400, $h$
<p><strong>Kňazská zóna</strong> (oprávnenie „manage_clergy_docs“) obsahuje neverejné dokumenty kúrie pre kňazov a diakonov – obežníky, smernice, formuláre.</p>
<h2>Zverejnenie dokumentu</h2>
<ol>
<li>Kliknite na <strong>Nový dokument</strong>, vyplňte názov, kategóriu, číslo, dátum vydania a krátky popis (ide aj do e-mailu).</li>
<li>Kliknite na <strong>Uložiť a pokračovať súbormi</strong> – súbory sa dajú pridať až po prvom uložení.</li>
<li>V karte <strong>Súbory</strong> pretiahnite súbory alebo použite <strong>Pridať súbory</strong> (do 100 MB). Text z PDF a Wordu sa načíta pre vyhľadávanie; naskenované PDF sa nájde len podľa názvu.</li>
<li>V karte <strong>Zverejnenie</strong> nechajte zaškrtnuté <strong>Poslať e-mail kňazom</strong> (posiela sa odkaz, nie príloha).</li>
<li>Kliknite na <strong>Zverejniť v kňazskej zóne</strong> a potvrďte.</li>
</ol>
<p><strong>Pozor:</strong> e-mail odíde naraz všetkým kňazom a diakonom (približne 250 adresátov) a nedá sa vziať späť. Pred zverejnením skontrolujte názov aj súbory.</p>
<p>Zverejnený dokument môžete <strong>Skryť (koncept)</strong>, <strong>Presunúť do archívu</strong> alebo poslať e-mail znova. Zmazanie dokumentu zmaže aj jeho súbory.</p>
<h2>Kategórie</h2>
<p>Záložka <strong>Kategórie</strong> určuje poradie a názvy v bočnom menu zóny. Skrytá kategória sa v zóne nezobrazí ani s dokumentmi.</p>
<h2>Kňazi a prístupy</h2>
<p>V záložke <strong>Kňazi a prístupy</strong> sú kňazi a diakoni z registra. Pozvánka ide na pracovný e-mail (ak chýba, na súkromný); iný e-mail môžete zadať v riadku.</p>
<ol>
<li>Filtrom zvoľte napr. <strong>Nepozvaný</strong>.</li>
<li><strong>Vybrať všetkých nepozvaných s e-mailom</strong>, potom <strong>Poslať pozvánku vybraným</strong>. Jednotlivo slúži tlačidlo <strong>Pozvať</strong> / <strong>Znova</strong>.</li>
</ol>
<p>Účty farností vidia kňazskú zónu automaticky.</p>
$h$),

('admin', 'web-dieceza-aktuality', 'Web diecézy – aktuality', 'Písanie článkov na dcza.sk, kategórie, plánované zverejnenie a pripnutie.', 500, $h$
<p>Web diecézy → <strong>Aktuality</strong> (oprávnenie „manage_diocese_web“) spravuje články na dcza.sk. Aktuality Kroku sa na dcza.sk pridávajú samy v kategórii KROK – tie upravujete vo Web KROK → Aktuality.</p>
<h2>Nový článok</h2>
<ol>
<li>Kliknite na <strong>Nový článok</strong>.</li>
<li>Vyplňte <strong>Nadpis</strong>, <strong>Perex</strong> (krátky úvod do zoznamu), nahrajte <strong>Titulný obrázok</strong> a zvoľte <strong>Kategórie</strong> (napr. Pozvánky, Zo života farností).</li>
<li>Napíšte <strong>Text článku</strong> – text z Wordu sa dá vložiť.</li>
<li><strong>Dátum zverejnenia</strong> v budúcnosti = článok sa zobrazí až v ten deň.</li>
<li>Kliknite na <strong>Zverejniť</strong>, alebo <strong>Uložiť koncept</strong>.</li>
</ol>
<p><strong>Pripnúť navrch</strong> drží článok na začiatku zoznamu. Zverejnený článok vrátite medzi koncepty tlačidlom <strong>Stiahnuť do konceptu</strong>.</p>
<h2>Kategórie</h2>
<p>V záložke <strong>Kategórie</strong> pridáte novú kategóriu alebo skryjete existujúcu (<strong>Viditeľná</strong>). Kategórie Pozvánky a Zo života farností majú vlastný pás na úvodnej stránke dcza.sk.</p>
<p>E-mailové adresy v článkoch sú na webe automaticky chránené pred robotmi – môžete ich písať normálne.</p>
$h$),

('admin', 'web-dieceza-casopis-a-dokumenty', 'Web diecézy – časopis a dokumenty pápežov', 'Čísla časopisu Naša Žilinská diecéza a zoznam dokumentov pápežov z kbs.sk.', 510, $h$
<h2>Časopis Naša Žilinská diecéza</h2>
<p>Nové čísla sa načítavajú zo Zachej.sk automaticky každú noc; hneď ich načítate tlačidlom <strong>Načítať nové čísla zo Zachej.sk</strong>. Na úvodnej stránke dcza.sk sú štyri najnovšie čísla.</p>
<p>Ručne pridáte číslo tlačidlom <strong>Pridať číslo</strong>: obálka, <strong>Číslo (MM/RRRR)</strong>, téma, popis, odkaz na e-časopis, prípadne PDF. Zaškrtnite <strong>Zverejnené na webe</strong> a <strong>Uložiť</strong>.</p>
<h2>Dokumenty pápežov</h2>
<p>Zoznam sa každú noc načítava z kbs.sk (hneď: <strong>Načítať z kbs.sk</strong>). Pri dokumentoch z KBS sa dá meniť len zverejnenie (<strong>Skryť</strong> / <strong>Zverejniť</strong>).</p>
<p>Vlastný dokument pridáte tlačidlom <strong>Vlastný dokument</strong>: názov, skupina (napr. „Lev XIV.“), popis, dátum a súbor (do 4 MB, bude verejný) alebo odkaz.</p>
$h$),

('admin', 'web-dieceza-galeria', 'Web diecézy – galéria', 'Albumy fotiek na dcza.sk.', 520, $h$
<p>Web diecézy → <strong>Galéria</strong> spravuje albumy na dcza.sk (stránka Galéria a pás na úvodnej stránke). Funguje rovnako ako galéria farnosti.</p>
<ol>
<li>Kliknite na <strong>Nový album</strong>, vyplňte <strong>Názov albumu</strong> a <strong>Dátum udalosti</strong> a uložte.</li>
<li>Pretiahnite fotky do albumu – samy sa zmenšia a uložia v úspornom formáte.</li>
<li>Doplňte popisy (<strong>Uložiť popisy</strong>) a hviezdičkou zvoľte <strong>Titulnú fotku albumu</strong>.</li>
</ol>
<p>Ak sú fotky inde (Facebook, Google Fotky), vytvorte externý album s <strong>Odkazom na album</strong>. Pri fotkách ľudí myslite na súhlas – pri deťoch súhlas rodičov, na žiadosť fotku zmažte.</p>
$h$)

ON CONFLICT (zone, slug) DO NOTHING;

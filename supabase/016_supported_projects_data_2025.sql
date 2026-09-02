-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Import podporených projektov 2025 z mojkrok.dcza.sk/podporene-projekty
-- Pozn.: Web uvádza 22 projektov spolu (34 157 €), vypísaných je 21.
--        Chýbajúci projekt a presné rozdelenie grant/negrant doplňte v admine.
-- ============================================================

INSERT INTO public.supported_projects (year, name, organizer, description, amount, support_type, sort_order) VALUES
(2025, 'GODZONE tour 2025', NULL,
 'Veľká evanjelizačná akcia v rôznych mestách na Slovensku a v Českej republike, ktorá kombinuje hudbu, tanec, osobné svedectvá, video produkciu a divadelné predstavenie. Moderným spôsobom ukazuje účastníkom veľkosť a lásku Boha a evanjelizuje aj na miestach, kam sa tradičná cirkev bežne nedostane. Projekt prináša vieru mladým ľuďom a rodinám atraktívnou a zrozumiteľnou formou, ktorá oslovuje dnešnú generáciu.',
 3000, 'non_grant', 1),

(2025, 'Štúdium teológie', NULL,
 'Teológia nie je len pre kňazov. Vzdelaní laici sú nezastupiteľní v živej Cirkvi. Vyučujú náboženstvo, vedú farské spoločenstvá, pracujú s mládežou a pripravujú ľudí na sviatosti. Bohoslovci zase potrebujú kvalitné vzdelanie, aby dokázali odpovedať na otázky dnešného sveta a viesť veriacich s múdrosťou a empatiou. Investícia do teológie je investícia do budúcnosti Cirkvi – vzdelaní ľudia dokážu obhajovať vieru, inšpirovať druhých a prinášať Božiu lásku tam, kde je to najviac potrebné.',
 1750, 'non_grant', 2),

(2025, 'Taška pútnika', 'Diecézna charita Žilina',
 'Vzdelávaco-charitatívna iniciatíva prináša nádej ľuďom v sociálnom vylúčení, rozvíja empatiu a dobrovoľníctvo u detí a prepája školy s charitnými zariadeniami. Žiaci piatich základných škôl pripravili 200 tašiek s potravinami a osobnými posolstvami nádeje, ktoré osobne odovzdali počas stretnutí s ľuďmi bez domova. Projekt prekonal očakávania, zapojil viaceré mestá a ukázal silný výchovný význam osobného kontaktu detí s ľuďmi v núdzi. Model spolupráce je opakovateľný a postupne sa rozširuje do ďalších regiónov.',
 1500, 'grant', 3),

(2025, 'MAGNIFIKÁT', 'Farnosť sv. Jakuba Kysucké Nové Mesto',
 'Projekt bol stretnutím chrámových zborov a farských spevokolov Žilinskej diecézy, zavŕšený celodenným podujatím v Oščadnici. Súčasťou programu bol seminár o liturgii, slávnostná svätá omša, spoločný koncert zborov aj výstava fotografií z predchádzajúcich ročníkov. Do projektu sa zapojilo 12 zborov z 11 dekanátov s takmer 300 účinkujúcimi. Podujatie podporilo rozvoj chrámovej hudby, vzájomnú výmenu skúseností a prinieslo silný duchovný i umelecký zážitok účastníkom aj verejnosti, čím vytvorilo dobrý základ pre pokračovanie projektu.',
 1500, 'grant', 4),

(2025, 'Lectio divina', NULL,
 'Lectio divina je mobilná a webová aplikácia pre duchovné čítanie a modlitbu nad Svätým písmom, založená na starobylej praxi Lectio Divina. Pomáha ľuďom prežívať hlbší vzťah s Bohom cez jeho Slovo – nejde len o pochopenie textu, ale o to, nechať ho na seba pôsobiť v tichu a kontemplácii. Za prvý mesiac si aplikáciu stiahlo viac ako 5 000 ľudí a stala sa obľúbeným nástrojom pre jednotlivcov, rodiny aj spoločenstvá. Tím neustále pracuje na jej vylepšovaní, aby bola moderným a dostupným spôsobom, ako prežívať „novú duchovnú jar" cez každodenné stretnutie s Božím slovom.',
 5221, 'non_grant', 5),

(2025, 'Diecézna animátorská škola', NULL,
 'DAŠ je dvojročný kurz osobnej duchovnej formácie pre mladých ľudí, ktorý ich pripravuje na vedenie detí a mládeže. Prvý rok je zameraný na duchovný rast a témy ako Božie Kráľovstvo, Duch Svätý, modlitba či duchovný boj. Druhý rok sa venuje animátorstvu – komunikácii, pedagogike, vedeniu spoločenstva a evanjelizácii. Formácia prebieha počas 8 víkendov ročne plus 10-dňovú duchovnú obnovu počas prázdnin. Škola je akreditovaná Ministerstvom školstva SR a Konferenciou biskupov Slovenska.',
 3000, 'non_grant', 6),

(2025, 'Jubilejné slovko diecézy', 'Farnosť Dobrého pastiera Žilina – Solinky',
 'Projekt Jubilejné slovko diecézy prináša sériu videí s katechézami a rozhovormi s osobnosťami Žilinskej diecézy, ktoré pomáhajú veriacim aj širokej verejnosti hlbšie prežívať Jubilejný rok a objavovať tému kresťanskej nádeje v každodennom živote. Videá sú voľne dostupné na YouTube kanáli Pastoračného fondu a slúžia ako podnet pre farské spoločenstvá. Projekt reaguje na aktuálne otázky dnešnej doby a zároveň pomáha priblížiť posolstvo jubilea ľuďom vo farnostiach modernou a prístupnou formou.',
 1500, 'grant', 7),

(2025, 'ESTER – ženské stretnutia', 'Farnosť Žilina – mesto',
 'Projekt Ester vytvára priestor pre budovanie podpornej ženskej komunity, zdieľanie skúseností a osobnostný i duchovný rast. Aktuálny ročník sa venuje téme uzdravenia sebahodnoty a práce s emóciami s cieľom priniesť ženám povzbudenie a nádej, že na životné výzvy nemusia zostať samy. Podujatie spája odborné vstupy, diskusie, kultúrny program aj neformálne stretnutia, pričom prepája ženy rôzneho veku a životných skúseností. Projekt zároveň posilňuje vzťahy medzi ženami aj mimo samotných podujatí a rozvíja komunitný život v regióne.',
 1445, 'grant', 8),

(2025, 'Jubileum umelcov – TKK', 'Inštitút Communio',
 'Grant zabezpečil profesionálnu propagáciu festivalu Týždeň kresťanskej kultúry 2025. Podujatie sa viac zviditeľnilo aj mimo cirkevné prostredie. Vznikla jednotná komunikačná kampaň, profily na sociálnych sieťach a nové tlačené i digitálne propagačné materiály. Výsledkom bola vyššia návštevnosť podujatí aj väčší mediálny dosah festivalu. Vytvorené komunikačné kanály zostávajú funkčné aj po skončení projektu a budú slúžiť pri propagácii ďalších ročníkov a kultúrnych podujatí.',
 1400, 'grant', 9),

(2025, 'V nádeji rastieme spolu', 'Spoločenstvo EFATA',
 'Séria troch stretnutí pre manželské páry zameraná na obnovu a posilnenie manželských vzťahov, duchovné načerpanie a prehĺbenie vzájomnej jednoty. Program ponúkol odborné prednášky, priestor na zdieľanie, modlitbu chvál i neformálne stretnutia, pričom počas podujatí bol zabezpečený program pre deti. Cieľom projektu bolo podporiť manželov, ktorí sa aktívne zapájajú do života farnosti, aby mohli čerpať silu pre rodinný život aj ďalšiu službu v pastorácii rodín a príprave snúbencov.',
 1239, 'grant', 10),

(2025, 'Spolu na ceste k svätosti', 'Farnosť Kotešová',
 'Farský tábor pre deti a mládež v Rodinkove bol zameraný na spoločnú cestu k svätosti a budovanie komunity, pričom deti spoznávali svätcov ako vzory pre život, osobitne blahoslaveného Carla Acutisa. Päťdňový program ponúkol sväté omše, modlitbu, tvorivé aktivity, tímové hry, šport a vedomostné kvízy, ktoré podporili spoluprácu a zodpovednosť mladších i starších účastníkov. Projekt posilnil vzťahy medzi deťmi a mládežou a pokračuje pravidelnými stretnutiami v pastoračnom centre.',
 1200, 'grant', 11),

(2025, 'ZÁHRADA – rozvojový program', 'Farnosť Žilina – saleziáni',
 'Projekt sa zameral na posilnenie komunitného života žien a vytvorenie priestoru na oddych, stretnutia a osobnostný rozvoj bez veľkej časovej záťaže. Tri workshopy pre ženy nad 25 rokov, ktorých sa zúčastnilo 90 účastníčok, ponúkli duchovné stíšenie, prednášky aj tvorivé aktivity na témy osobných darov, vzťahov a zdravého životného štýlu. Pozitívna spätná väzba potvrdila veľkú potrebu takýchto stretnutí, preto bude projekt pokračovať ďalšími workshopmi.',
 1200, 'grant', 12),

(2025, 'Duchovná obnova rodín', 'Farnosť Žilina – Vlčince',
 'Projekt umožnil účasť na víkendovej duchovnej obnove v Rodinkove aj mnohodetným rodinám a rodinám v náročnej finančnej situácii, čím podporil duchovný život rodín a posilnil vzájomné vzťahy. Program Manželstvo – misia možná II. ponúkol rodičom prednášky a svedectvá manželov, zatiaľ čo pre deti bol pripravený animačný program. Vďaka finančnej podpore sa mohli zapojiť aj rodiny, ktoré by si účasť inak nemohli dovoliť. Pozitívne ohlasy viedli k plánovaniu ďalšieho ročníka aj pokračovaniu pravidelných rodinných stretnutí.',
 900, 'grant', 13),

(2025, 'Duchovná obnova birmovancov', 'Farnosť Považská Bystrica – Sv. rodiny',
 'Víkendová duchovná obnova ponúkla mladým príležitosť hlbšie spoznať Boha a prežiť vieru osobnejším spôsobom. Program zahŕňal tematické katechézy, sväté omše, modlitbu, zábavné aktivity, osobné rozhovory i možnosť pristúpiť k sviatosti zmierenia. Cieľom bolo vytvoriť bezpečné prostredie, v ktorom mladí môžu otvorene hľadať odpovede na svoje otázky a zažiť prijatie v spoločenstve. Po obnove birmovanci pokračujú v príprave prostredníctvom farských stretnutí a zapojením sa do miestnych spoločenstiev a služieb.',
 800, 'grant', 14),

(2025, 'Detské ihrisko Rodina', 'Farnosť Považská Bystrica – Rozkvet',
 'Vytvorenie bezpečného a funkčného priestoru pre deti predškolského veku prostredníctvom dobudovania a oplotenia detského ihriska Rodina, ktoré slúži na výchovno-vzdelávacie aktivity materskej školy aj na spoločné podujatia pre rodiny. Na realizácii sa podieľali rodičia, zamestnanci škôlky, pátri saletíni aj sponzori, pričom ihrisko je dnes celoročne využívané deťmi i rodinami. Projekt zároveň potvrdil silnú ochotu miestnej komunity zapájať sa do spoločných aktivít a podporovať ich finančne aj praktickou pomocou.',
 800, 'grant', 15),

(2025, 'Putovné kaplnky Schoenstatt', 'Farnosť Staškov',
 'Rozšírenie siete putovných kaplniek do ďalších farností a rodín na Kysuciach s cieľom podporiť pravidelné stretávanie sa s Bohom v domácom prostredí a posilniť tak duchovný život komunity. Počas duchovnej obnovy v Zázrivej bolo požehnaných 29 nových kaplniek, ktoré boli následne vyslané do viacerých farností v oblasti Turzovky, Čadce a Staškova, vrátane detského domova. Projekt pokračuje pravidelnými stretnutiami a postupne sa rozširuje aj do ďalších regiónov na Slovensku i do zahraničia.',
 500, 'grant', 16),

(2025, 'Jubilejné putovanie', 'Farnosť Skalité',
 'Projekt umožnil farnosti zapojiť všetky generácie do spoločného putovania počas jubilejného roka a posilniť vzájomné vzťahy v spoločenstve. Súčasťou boli pôstne krížové cesty v okolitých obciach, príprava svätenej vody na sviatok Zjavenia Pána a farská púť vlakom do katedrály v Žiline spojená s programom pre deti a návštevou katakomb. Putovaní sa zúčastnilo približne 80 veriacich rôznych vekových kategórií a projekt prispel k lepšiemu vzájomnému poznaniu, pričom farské aktivity pokračujú aj naďalej pravidelnými stretnutiami a podujatiami.',
 500, 'grant', 17),

(2025, 'ANIMA', 'CVČ sv. Jakuba – Kysucké Nové Mesto',
 'Príprava mladých ľudí na službu animátorov vo farnosti prostredníctvom trojdňového formačného programu v Kysuckom Novom Meste, zameraného na osobnostný rast, tímovú spoluprácu, prácu s deťmi a duchovné zakorenenie. Program priniesol odborné školenia, workshop prvej pomoci, spoločné aktivity a požehnanie do služby. Účastníci získali praktické aj teoretické zručnosti a vytvorili stabilný tím animátorov, ktorý sa aktívne zapája do farských aktivít a pokračuje v činnosti aj po skončení projektu.',
 500, 'grant', 18),

(2025, 'Na ceste nádeje', 'Farnosť Ilava',
 'Projekt Na ceste nádeje podporil budovanie spoločenstva rodín vo farnosti prostredníctvom spoločnej púte na Velehrad a ďalších aktivít zameraných na prehlbovanie viery, spoznávanie kresťanských dejín a vytváranie nových vzťahov medzi rodinami i seniormi. Program zahŕňa spoločnú svätú omšu, animačné aktivity pre deti, spev a neformálne stretnutia, ktoré posilňujú vzájomné prepojenie farníkov. Projekt vytvára základ pre ďalšie rodinné podujatia, stretká a spoločné farské aktivity počas celého roka.',
 500, 'grant', 19),

(2025, 'Spolupráca spoločenstiev', 'Farnosť Bytčica',
 'Projekt podporil zapájanie mladšej generácie i celej farskej komunity do spoločných aktivít počas roka, ako sú pravidelné modlitby v ružencovej záhrade, farské púte, kreatívne dielne, dobrovoľnícka pomoc seniorom, detský farský tábor či stretnutia pre seniorov. Aktivity zároveň vytvorili priestor na budovanie vzťahov, odovzdávanie tradícií a nové ohlasovanie viery aj ľuďom vzdialeným od Cirkvi. Projekt tak posilnil spoluprácu medzi generáciami a ponúkol nové možnosti aktívneho zapojenia sa do života farnosti.',
 500, 'grant', 20),

(2025, 'Inovatívne brožúrky', 'Farnosť Domaniža',
 'Projekt otvoril priestor na komunikáciu o náboženských témach a nadväzovanie kontaktu s farníkmi, pútnikmi i ľuďmi hľadajúcimi odpovede na otázky viery. V rámci projektu vzniklo osem evanjelizačných brožúrok, ktoré jednoduchým a zrozumiteľným spôsobom približujú témy zo života Cirkvi a sú voľne dostupné vo farskom kostole v Domaniži. Do prípravy sa zapojili členovia farskej pastoračnej platformy aj birmovanci a farnosť plánuje v tejto vydavateľskej aktivite pokračovať aj v budúcnosti.',
 500, 'grant', 21);

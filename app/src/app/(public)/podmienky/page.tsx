import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { OrgBlock } from '@/components/public/legal/LegalPage'
import { KROK_ORG, LEGAL_EFFECTIVE } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Všeobecné podmienky | KROK – Pastoračný fond Žilinskej diecézy',
  description: 'Darovacie a obchodné podmienky Pastoračného fondu KROK a podmienky používania webu a stránok farností.',
}

const toc = [
  ['darovacie', 'A. Darovacie podmienky'],
  ['obchodne', 'B. Obchodné podmienky'],
  ['pouzivanie', 'C. Používanie webu, účtu a stránok farností'],
  ['formulare', 'Prílohy – formuláre'],
]

export default function PodmienkyPage() {
  return (
    <LegalPage eyebrow="Právne informácie" title="Všeobecné podmienky" effective={LEGAL_EFFECTIVE}>
      <OrgBlock role="Prevádzkovateľ webu a príjemca darov" />
      <nav className="flex flex-wrap gap-2 pt-2">
        {toc.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="!no-underline px-3 py-1.5 rounded-xl bg-white border border-blue/10 text-sm font-bold !text-ink/85 hover:!text-blue">
            {label}
          </a>
        ))}
      </nav>

      {/* ------------------------------------------------------------ A */}
      <h2 id="darovacie" className="scroll-mt-32">A. Darovacie podmienky</h2>
      <p>Pre dary na podporu Pastoračného fondu Žilinskej diecézy prostredníctvom webu {KROK_ORG.web.replace('https://', '')}.</p>

      <h3>Čl. 1 – Základné pojmy</h3>
      <ul>
        <li><strong>Prevádzkovateľ</strong> je {KROK_ORG.name}, ktorý dary prijíma a spravuje.</li>
        <li><strong>Dar</strong> je dobrovoľný peňažný príspevok fyzickej alebo právnickej osoby. Dar je bezodplatný a nevzniká naň právny nárok.</li>
        <li><strong>Darca</strong> je osoba, ktorá dar poskytne a súhlasí s týmito podmienkami.</li>
        <li><strong>Darovacia zmluva</strong> vzniká v elektronickej forme okamihom, keď darca odošle dar cez web (online platbou) alebo ho poukáže prevodom na účet fondu.</li>
      </ul>

      <h3>Čl. 2 – Poskytnutie daru</h3>
      <ul>
        <li>Dar možno poskytnúť <strong>online cez platobnú bránu Mollie</strong> (karta, Apple Pay, Google Pay, bankové tlačidlá) alebo <strong>bankovým prevodom</strong> na účet fondu {KROK_ORG.iban} s variabilným symbolom darcu.</li>
        <li>Dar je poskytnutý okamihom pripísania sumy na účet prevádzkovateľa.</li>
        <li>Darca je povinný uvádzať pravdivé identifikačné a kontaktné údaje.</li>
        <li>Údaje o platobnej karte spracúva výlučne Mollie B.V. podľa svojich bezpečnostných štandardov; prevádzkovateľ k nim nemá prístup.</li>
      </ul>

      <h3>Čl. 3 – Pravidelný dar</h3>
      <ul>
        <li>Pri pravidelnom (mesačnom) dare darca súhlasí s opakovaným strhnutím zvolenej sumy prostredníctvom Mollie.</li>
        <li>Pravidelný dar môže darca kedykoľvek zrušiť vo svojom <Link href="/profil">profile</Link> alebo e-mailom na <a href={`mailto:${KROK_ORG.email}`}>{KROK_ORG.email}</a>; zrušenie platí do budúcna.</li>
        <li>Pri pravidelnom dare prevodom si darca trvalý príkaz nastavuje a ruší sám vo svojej banke.</li>
      </ul>

      <h3>Čl. 4 – Použitie daru</h3>
      <ul>
        <li>Dary slúžia na pastoračné, charitatívne a vzdelávacie diela Žilinskej diecézy podľa poslania fondu.</li>
        <li>Ak darca podporí konkrétnu <Link href="/vyzvy">výzvu</Link>, dar sa použije na jej účel. Ak výzva nemôže byť zrealizovaná alebo sa vyzbiera viac, ako je potrebné, prevádzkovateľ použije dar na príbuzný účel fondu.</li>
        <li>Dar sa eviduje aj pri farnosti, ku ktorej sa darca hlási; farnosť vidí len súhrnné čísla, nie mená darcov.</li>
        <li>Dar je bez protiplnenia; jeho poskytnutím nevzniká darcovi nárok na službu ani na vrátenie daru.</li>
      </ul>

      <h3>Čl. 5 – Potvrdenie o dare a vrátenie daru</h3>
      <ul>
        <li>Na požiadanie vydá prevádzkovateľ potvrdenie o prijatí daru.</li>
        <li>Vrátenie daru je možné len vo výnimočných prípadoch (napr. duplicitná alebo omylom zadaná platba) po dohode s prevádzkovateľom, v súlade s Občianskym zákonníkom – formulár je v prílohe.</li>
      </ul>

      <h3>Čl. 6 – Ochrana osobných údajov</h3>
      <p>
        Osobné údaje darcu spracúvame v rozsahu potrebnom na prijatie daru, komunikáciu a vedenie evidencie podľa zásad
        uvedených na stránke <Link href="/ochrana-udajov">Ochrana osobných údajov</Link>.
      </p>

      <h3>Čl. 7 – Záverečné ustanovenia</h3>
      <ul>
        <li>Prevádzkovateľ nezodpovedá za škodu spôsobenú nesprávnymi údajmi darcu ani výpadkami poskytovateľov platobných služieb.</li>
        <li>Právne vzťahy sa spravujú právnym poriadkom Slovenskej republiky; spory sa riešia predovšetkým dohodou.</li>
        <li>Prevádzkovateľ môže tieto podmienky zmeniť; nové znenie je účinné zverejnením na webe. Na dary poskytnuté pred zmenou sa vzťahuje znenie platné v čase daru.</li>
      </ul>

      {/* ------------------------------------------------------------ B */}
      <h2 id="obchodne" className="scroll-mt-32">B. Obchodné podmienky</h2>
      <p>Pre predaj tovaru na diaľku (napr. kalendáre, publikácie, duchovné a propagačné materiály) na podporu Pastoračného fondu.</p>

      <h3>1. Všeobecné ustanovenia</h3>
      <ul>
        <li>Predávajúcim je {KROK_ORG.name}, {KROK_ORG.street}, {KROK_ORG.city}{KROK_ORG.ico ? `, IČO ${KROK_ORG.ico}` : ''}, e-mail {KROK_ORG.email}.</li>
        <li>Orgánom dozoru je Slovenská obchodná inšpekcia, Inšpektorát SOI pre Žilinský kraj, Predmestská 71, 011 79 Žilina 1, tel.: 041/763 21 30.</li>
        <li>Tieto podmienky sú neoddeliteľnou súčasťou kúpnej zmluvy. Ceny sú konečné a neobsahujú dopravu, ktorá sa uvádza pri objednávke.</li>
        <li>Predávajúci si vyhradzuje právo meniť ceny; na potvrdenú objednávku sa vzťahuje cena platná v čase objednania.</li>
      </ul>

      <h3>2. Uzatvorenie kúpnej zmluvy</h3>
      <ul>
        <li>Odoslaním objednávky kupujúci podáva návrh na uzavretie zmluvy. Automatické potvrdenie o prijatí objednávky nie je jej prijatím.</li>
        <li>Kúpna zmluva je uzatvorená v momente, keď predávajúci objednávku potvrdí e-mailom alebo iným trvanlivým médiom.</li>
        <li>Pred odoslaním objednávky je kupujúci informovaný o cene, doprave, spôsobe platby, práve na odstúpenie a reklamáciách.</li>
        <li>Ak tovar nie je dostupný, predávajúci kupujúceho bezodkladne kontaktuje s návrhom náhrady alebo zrušenia; uhradenú sumu vráti do 14 dní.</li>
      </ul>

      <h3>3. Práva a povinnosti predávajúceho a kupujúceho</h3>
      <ul>
        <li>Predávajúci dodá tovar v dohodnutom množstve a kvalite, riadne zabalený, s dokladom o kúpe.</li>
        <li>Kupujúci uvedie správne dodacie údaje, tovar prevezme a zaplatí dohodnutú cenu.</li>
      </ul>

      <h3>4. Dodacie a platobné podmienky, cena</h3>
      <ul>
        <li>Spôsob dopravy (kuriér, pošta, osobné prevzatie) a jej cena sú uvedené v objednávke.</li>
        <li>Tovar dodáme najneskôr do 30 dní od uzavretia zmluvy, spravidla skôr.</li>
        <li>Ak kupujúci tovar bez dôvodu neprevezme, predávajúci môže požadovať náhradu skutočných nákladov na opakované doručenie.</li>
        <li>Platiť možno vopred prevodom, online platbou alebo iným spôsobom uvedeným v objednávke.</li>
        <li>Pri zjavnej chybe v cene si predávajúci vyhradzuje právo objednávku neprijať a navrhnúť správnu cenu.</li>
      </ul>

      <h3>5. Vlastníctvo a prechod nebezpečenstva</h3>
      <p>Vlastnícke právo prechádza na kupujúceho prevzatím tovaru a zaplatením ceny; nebezpečenstvo škody prevzatím od dopravcu.</p>

      <h3>6. Zodpovednosť za vady a reklamácie</h3>
      <ul>
        <li>Predávajúci zodpovedá za vady tovaru podľa Občianskeho zákonníka.</li>
        <li>Kupujúci skontroluje zásielku pri prevzatí; poškodenú zásielku reklamuje u dopravcu a spíše s ním záznam.</li>
        <li>Reklamáciu možno uplatniť písomne alebo e-mailom; vybavíme ju do 30 dní.</li>
        <li>Pri oprávnenej reklamácii má kupujúci právo na bezplatné odstránenie vady, výmenu tovaru, primeranú zľavu alebo pri podstatnej vade na odstúpenie od zmluvy.</li>
      </ul>

      <h3>7. Odstúpenie od zmluvy (spotrebiteľ)</h3>
      <ul>
        <li>Spotrebiteľ môže od zmluvy odstúpiť bez udania dôvodu do 14 dní od prevzatia tovaru – e-mailom alebo písomne (formulár je v prílohe).</li>
        <li>Tovar je potrebné vrátiť do 14 dní od odstúpenia; náklady na vrátenie znáša kupujúci.</li>
        <li>Predávajúci vráti zaplatenú cenu vrátane základného poštovného do 14 dní od doručenia odstúpenia, nie však skôr, ako dostane tovar alebo doklad o jeho odoslaní.</li>
        <li>Kupujúci zodpovedá za zníženie hodnoty tovaru v dôsledku zaobchádzania nad rámec potrebný na zistenie jeho vlastností.</li>
        <li>Odstúpiť nemožno pri tovare vyrobenom na objednávku a pri digitálnom obsahu, ktorého dodanie začalo s výslovným súhlasom kupujúceho.</li>
      </ul>

      <h3>8. Riešenie sporov</h3>
      <p>
        Nespokojný spotrebiteľ sa môže obrátiť na predávajúceho e-mailom na <a href={`mailto:${KROK_ORG.email}`}>{KROK_ORG.email}</a>.
        Ak predávajúci žiadosť zamietne alebo na ňu do 30 dní neodpovie, môže spotrebiteľ podať návrh na alternatívne riešenie
        sporu Slovenskej obchodnej inšpekcii.
      </p>

      <h3>9. Záverečné ustanovenia</h3>
      <p>
        Osobné údaje kupujúceho (meno, adresa, e-mail, telefón) spracúvame na vybavenie objednávky podľa stránky{' '}
        <Link href="/ochrana-udajov">Ochrana osobných údajov</Link>. Na uzatvorené zmluvy sa vzťahuje znenie podmienok platné
        v čase objednávky.
      </p>

      {/* ------------------------------------------------------------ C */}
      <h2 id="pouzivanie" className="scroll-mt-32">C. Používanie webu, účtu a stránok farností</h2>
      <ul>
        <li>Účet darcu je bezplatný. Darca zodpovedá za správnosť svojich údajov a za ochranu prihlasovacích údajov.</li>
        <li>Účty farností prideľuje biskupský úrad. Farnosť zodpovedá za obsah, ktorý na svojej stránke zverejní (oznamy, aktuality, fotografie, texty), najmä za to, že má právo ho zverejniť a že neporušuje práva iných osôb.</li>
        <li>Úradné údaje farnosti (názov, adresa, IČO, štatistika veriacich a pod.) farnosť len navrhuje, zmeny schvaľuje biskupský úrad.</li>
        <li>Prevádzkovateľ môže bez náhrady stiahnuť obsah, ktorý je v rozpore s právom, s učením Katolíckej cirkvi alebo poškodzuje dobré meno iných.</li>
        <li>Obsah webu (texty, grafika, logo KROK) je chránený autorským právom; jeho ďalšie šírenie je možné len so súhlasom prevádzkovateľa, pri obsahu farností so súhlasom farnosti.</li>
      </ul>

      {/* ------------------------------------------------------------ Prílohy */}
      <h2 id="formulare" className="scroll-mt-32">Prílohy – formuláre</h2>

      <h3>Formulár na odstúpenie od zmluvy</h3>
      <p>
        Adresát: {KROK_ORG.name}, {KROK_ORG.street}, {KROK_ORG.city}, e-mail: {KROK_ORG.email}
        <br />
        Oznamujem, že odstupujem od zmluvy uzavretej na diaľku:
      </p>
      <ul>
        <li>dátum objednania / prevzatia tovaru, číslo objednávky,</li>
        <li>názov tovaru, uhradená suma,</li>
        <li>meno, priezvisko a adresa spotrebiteľa, telefón / e-mail,</li>
        <li>číslo účtu (IBAN) na vrátenie peňazí,</li>
        <li>dátum a podpis (pri listinnej forme).</li>
      </ul>

      <h3>Žiadosť o vrátenie daru</h3>
      <p>
        Adresát: {KROK_ORG.name}, {KROK_ORG.street}, {KROK_ORG.city}, e-mail: {KROK_ORG.email}
        <br />
        Žiadam o vrátenie daru poskytnutého cez web mojkrok.sk:
      </p>
      <ul>
        <li>meno a priezvisko / názov, adresa / sídlo, e-mail zadaný pri darovaní,</li>
        <li>dátum a suma daru, spôsob darovania (online platba / prevod), variabilný symbol,</li>
        <li>pri platbe kartou posledné 4 číslice karty,</li>
        <li>dôvod žiadosti, číslo účtu (IBAN) na vrátenie,</li>
        <li>dátum a podpis (pri listinnej forme).</li>
      </ul>
      <p className="text-sm text-mute">Vrátenie daru je možné len vo výnimočných a odôvodnených prípadoch.</p>
    </LegalPage>
  )
}

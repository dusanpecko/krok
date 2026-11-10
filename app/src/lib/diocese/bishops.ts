/**
 * Biskupi Žilinskej diecézy – stránky /o-nas/biskup (diecézny biskup) a /o-nas/biskup/tomas-galis.
 * Obsah je v kóde (nie v diocese_pages), od 10. 11. 2026 – menovanie Mons. Petra Beňa.
 */

export interface BishopFact {
  label: string
  value: string
}

export interface Bishop {
  /** cesta stránky bez úvodnej lomky */
  path: string
  name: string
  /** krátke meno do menu a kariet */
  shortName: string
  /** úloha v diecéze (pod menom) */
  role: string
  /** zvýraznená informácia nad menom */
  kicker: string
  photo?: string
  coatOfArms?: string
  motto?: { latin: string; slovak?: string; source?: string }
  facts: BishopFact[]
  /** životopis – odseky */
  bio: string[]
  /** pôsobenie – položky zoznamu (môžu obsahovať <em>) */
  career: string[]
  careerTitle?: string
  /** popis erbu */
  coatOfArmsText?: string[]
}

export const BISHOP_BENO: Bishop = {
  path: 'o-nas/biskup',
  name: 'Mons. Peter Beňo',
  shortName: 'Mons. Peter Beňo',
  kicker: 'Menovaný 10. novembra 2026',
  role: 'žilinský diecézny biskup',
  photo: '/dcza/beno.jpg',
  motto: { latin: 'In hoc cognovimus caritatem Dei!', slovak: 'Spoznali sme Božiu lásku!' },
  facts: [
    { label: 'Narodený', value: '2. septembra 1972, Bánovce nad Bebravou' },
    { label: 'Kňazská vysviacka', value: '14. septembra 1996, Terchová' },
    { label: 'Biskupská konsekrácia', value: '24. apríla 2021' },
    { label: 'Žilinský biskup', value: 'menovaný 10. novembra 2026' },
  ],
  bio: [
    'Peter Beňo sa narodil 2. 9. 1972 v Bánovciach nad Bebravou rodičom Jánovi a Anne. Spolu s mladšou sestrou vyrastal v obci Prusy, ktorá je súčasťou Bánovskej farnosti, v rodine, kde viera bola prirodzenou súčasťou každodenného života. Rodičom vďačí za ľudskú i kresťanskú výchovu.',
    'Základnú školu navštevoval najskôr v rodnej obci a potom v Bánovciach nad Bebravou. Po maturite na Bánovskom gymnáziu v roku 1990 vstúpil do novootvoreného Kňazského seminára sv. Gorazda v Nitre. Kňazskú vysviacku prijal z rúk Jána Chryzostoma kardinála Korca 14. 9. 1996 v Terchovej.',
    'Pápež František ho 29. januára 2021 vymenoval za pomocného biskupa starobylej Nitrianskej diecézy a zároveň za titulárneho biskupa amudarského. Biskupskú konsekráciu prijal 24. apríla 2021. Jeho biskupské heslo znie: In hoc cognovimus caritatem Dei! (Spoznali sme Božiu lásku!).',
    'Pápež Lev XIV. ho 10. novembra 2026 vymenoval za žilinského diecézneho biskupa. Hovorí plynule po nemecky a po rusky.',
  ],
  careerTitle: 'Pôsobenie',
  career: [
    '1996 – 1997 kaplán v Púchove',
    '1997 – 2002 administrátor farnosti Nesluša',
    '2002 – 2008 prefekt Kňazského seminára sv. Gorazda v Nitre, zároveň poverený pastoráciou povolaní',
    '2002 – 2004 asistent Teologického inštitútu v Nitre',
    '2004 – 2008 odborný asistent Teologického inštitútu v Nitre',
    '2008 – 2014 farár v Soblahove',
    '2014 – 2021 farár v Skalke nad Váhom',
    '2016 – 2021 rektor Diecéznej svätyne svätých Andreja-Svorada a Beňadika',
    '2018 – 2021 dekan Trenčianskeho dekanátu',
    '29. januára 2021 pápežom Františkom menovaný za pomocného biskupa Nitrianskej diecézy a titulárneho biskupa amudarského',
    '24. apríla 2021 prijal biskupskú konsekráciu',
    '10. novembra 2026 pápežom Levom XIV. menovaný za žilinského diecézneho biskupa',
  ],
}

export const BISHOP_GALIS: Bishop = {
  path: 'o-nas/biskup/tomas-galis',
  name: 'Mons. doc. ThDr. Tomáš Galis, PhD.',
  shortName: 'Mons. Tomáš Galis',
  kicker: 'Apoštolský administrátor',
  role: 'apoštolský administrátor Žilinskej diecézy, prvý žilinský diecézny biskup (2008 – 2026)',
  photo: 'https://s3.eu-central-003.backblazeb2.com/parochia-storage-v1/dcza/media/1791469259022-w7639f.webp',
  coatOfArms: 'https://s3.eu-central-003.backblazeb2.com/parochia-storage-v1/dcza/media/1791469257593-pdrp3.webp',
  motto: { latin: 'Per Mariam ad Iesum', slovak: 'Cez Máriu k Ježišovi' },
  facts: [
    { label: 'Kňazská vysviacka', value: '6. júna 1976, Bratislava' },
    { label: 'Biskupská konsekrácia', value: '25. septembra 1999, Banská Bystrica' },
    { label: 'Žilinský biskup', value: 'od 14. februára 2008' },
    { label: 'Apoštolský administrátor', value: 'od 10. novembra 2026' },
  ],
  bio: [
    'Mons. Tomáš Galis bol prvým diecéznym biskupom Žilinskej diecézy, ktorú viedol od jej zriadenia v roku 2008. Po menovaní nového žilinského biskupa 10. novembra 2026 spravuje diecézu ako apoštolský administrátor až do uvedenia nového biskupa do úradu.',
  ],
  careerTitle: 'Životopis',
  career: [
    '1966 ukončenie základnej školy – ZDŠ Vrútky',
    '1969 maturita na Strednej všeobecnovzdelávacej škole Vrútky',
    'od 1. októbra 1969 do 30. septembra 1973 vysokoškolské štúdium na Rímskokatolíckej Cyrilometodskej bohosloveckej fakulte v Bratislave',
    'od 1. októbra 1973 do 30. septembra 1975 výkon základnej vojenskej služby',
    'od 1. októbra 1975 do 1. júna 1976 dokončenie teologických štúdií; dosiahnutie absolutória na Rímskokatolíckej Cyrilometodskej bohosloveckej fakulte – RK CMBF v Bratislave',
    '2. júna 1976 prijal diakonské svätenie (<em>ordo diaconatus</em>) v Dóme sv. Martina v Bratislave',
    '6. júna 1976 prijal kňazské svätenie (<em>ordo presbyteratus</em>) v Dóme sv. Martina v Bratislave z rúk Mons. RNDr. Júliusa Gábriša, titulárneho biskupa dekorianskeho a apoštolského administrátora trnavského, pre službu v Banskobystrickej diecéze',
    '13. júna 1976 primičná sv. omša v kostole sv. Jána Krstiteľa vo Vrútkach',
    'od 1. júla 1976 kaplán v Hriňovej',
    'od 1. júla 1979 kaplán v Brezne',
    'od 1. októbra 1980 správca farnosti v Lazanoch pri Prievidzi',
    'od 1. júla 1988 správca farnosti Kľak a excurrendo Veľké Pole',
    'od 22. marca 1990 do 31. októbra 1993 generálny vikár Banskobystrickej diecézy',
    'od 1. apríla do 30. júna 1990 okresný dekan v Banskej Bystrici',
    'od 1. júla 1990 do 31. augusta 1999 rektor Kňazského seminára sv. Františka Xaverského v Banskej Bystrici, prechodne zriadeného v priestoroch hradu v Slovenskej Ľupči a od 1. októbra 1993 v novovybudovanom seminári v Badíne pri Banskej Bystrici',
    'od roku 1992 súčasne moderátor zriadeného Teologického inštitútu v Banskej Bystrici – Badíne, afiliovaného k Rímskokatolíckej Cyrilometodskej bohosloveckej fakulte Univerzity Komenského (RK CMBF UK) v Bratislave',
    'od roku 1991 vysokoškolský pedagóg na Teologickom inštitúte v Banskej Bystrici – Badíne',
    '2. februára 1993 akademický titul Mgr. <em>„magister teológie“</em> na Univerzite Komenského v Bratislave',
    '11. januára 1994 menovaný Sv. Otcom Jánom Pavlom II. za „pápežského kaplána“ – monsignor (Mons.)',
    '4. decembra 1995 akademický titul ThLic. <em>„Licentiatus in Sacra Theologia“</em> na Pápežskej teologickej akadémii (PAT) v Krakove, Poľsko',
    '22. júna 1998 akademický titul ThDr. <em>„Doctor Sacrae Theologiae“</em> na RK CMBF UK v Bratislave',
    '25. júna 1998 vedecko-akademická hodnosť PhD. <em>„philosophiae doctor“</em> na Univerzite Komenského v Bratislave',
    'vysokoškolská akademická kvalifikácia vo vednom odbore katolícka teológia; odborná špecializácia: pastorálna teológia',
    'od roku 1998 člen Komisie pre klérus pri Konferencii biskupov Slovenska',
    'od roku 1998 delegát KBS pre pastoráciu povolaní zastupujúci národné centrá pri CCEE a European Vocations Service – EVS',
    '28. augusta 1999 pápežom Jánom Pavlom II. menovaný za titulárneho biskupa bitského (Bita) a pomocného biskupa banskobystrického (<em>episcopus titularis Bitensis et auxiliaris Neosoliensis</em>)',
    'od 1. septembra 1999 vymenovaný za generálneho vikára Banskobystrickej diecézy',
    '25. septembra 1999 prijal biskupskú konsekráciu (<em>ordo episcopatus</em>) vo farskom chráme Nanebovzatia Panny Márie v Banskej Bystrici – hlavný svätiteľ Mons. Rudolf Baláž, banskobystrický diecézny biskup a predseda Konferencie biskupov Slovenska, spolusvätitelia: Mons. Alojz Dossena, titulárny arcibiskup karpitánsky, apoštolský nuncius v Slovenskej republike, a Mons. Peter Dubovský SJ, titulárny biskup karkabijský, emeritný pomocný banskobystrický biskup',
    '22. marca 2000 Konferenciou biskupov Slovenska zvolený za štatutárneho zástupcu pre zriadenie Katolíckej univerzity na Slovensku so sídlom v Ružomberku',
    'od 2. mája 2000 do 17. septembra 2003 Veľký kancelár Katolíckej univerzity v Ružomberku',
    'na základe habilitačnej práce <em>Počiatočná formácia kandidátov kňazstva</em> a verejnej obhajoby 4. mája 2000 na RK CMBF UK v Bratislave vymenovaný za docenta pre odbor katolícka teológia, s účinnosťou od 1. júna 2000',
    '24. októbra 2000 Konferenciou biskupov Slovenska zvolený za predsedu Rady pre univerzity pri KBS a opätovne potvrdený za člena Komisie pre klérus pri KBS',
    'od roku 2000 biskup delegát KBS pre univerzitnú pastoráciu v Rade európskych biskupských konferencií (CCEE) so sídlom v St. Gallen',
    'od roku 2001 relátor o univerzitných štúdiách medzi Konferenciou biskupov Slovenska a Kongregáciou pre katolícku výchovu v Ríme',
    '18. marca 2003 Konferenciou biskupov Slovenska ako člen Komisie pre klérus poverený vedením Subkomisie pre kňazské semináre a pastoráciu povolaní',
    '14. februára 2008 pápežom Benediktom XVI. menovaný za žilinského diecézneho biskupa (<em>episcopus Žilinensis</em>) do novozriadenej diecézy',
    '12. novembra 2020 Konferenciou biskupov Slovenska zvolený za predsedu Slovenskej katolíckej charity',
    '10. novembra 2026 po menovaní nového žilinského biskupa ustanovený za apoštolského administrátora Žilinskej diecézy',
  ],
  coatOfArmsText: [
    'Mons. Tomášovi Galisovi ako diecéznemu biskupovi prináleží štvrtený štít, kde v 1. a 4. poli je umiestnený erb diecézy, v 2. a 3. poli osobný erb biskupa. V osobnom erbe sú umiestnené skrížené kopije, ktoré sú atribútmi sv. apoštola Tomáša, patróna krstného mena nositeľa erbu. Skrížené kopije v tvare písmena X zároveň pripomínajú erb Banskobystrickej diecézy, v ktorej pôsobil Mons. Tomáš Galis ako pomocný biskup.',
    'Strieborná ľalia ako mariánsky symbol vyjadruje, že nositeľ erbu bol vysvätený za biskupa v kostole Nanebovzatia Panny Márie v Banskej Bystrici. Zároveň hovorí o mariánskej úcte nositeľa erbu, čo dopĺňa aj biskupské heslo „PER MARIAM AD IESUM“ (Cez Máriu k Ježišovi). Latinský procesiový kríž a zelený biskupský klobúk so šiestimi zelenými strapcami na každej strane prislúcha podľa pravidiel cirkevnej heraldiky biskupovi.',
  ],
}

export const BISHOPS = [BISHOP_BENO, BISHOP_GALIS]

/** Strom stránok doplnený o stránku Mons. Galisa pod „Biskup“ (bočné menu, omrvinky). */
export function withBishopPages<T extends { id: string; path: string; title: string; children: T[] }>(tree: T[]): T[] {
  return tree.map((n) => {
    if (n.path === 'o-nas/biskup') {
      const extra = { ...n, id: 'bishop-galis', path: BISHOP_GALIS.path, title: BISHOP_GALIS.shortName, children: [] as T[] } as T
      return { ...n, children: [...n.children.filter((c) => c.path !== BISHOP_GALIS.path), extra] }
    }
    return n.children.length ? { ...n, children: withBishopPages(n.children) } : n
  })
}

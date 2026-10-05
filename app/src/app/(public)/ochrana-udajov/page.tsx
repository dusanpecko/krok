import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { OrgBlock } from '@/components/public/legal/LegalPage'
import { KROK_ORG, LEGAL_EFFECTIVE } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Ochrana osobných údajov | KROK – Pastoračný fond Žilinskej diecézy',
  description: 'Ako KROK – Pastoračný fond Žilinskej diecézy spracúva osobné údaje darcov, farností a návštevníkov webu.',
}

export default function OchranaUdajovPage() {
  return (
    <LegalPage eyebrow="Právne informácie" title="Ochrana osobných údajov" effective={LEGAL_EFFECTIVE}>
      <p>
        Vážime si dôveru každého, kto podporuje Pastoračný fond Žilinskej diecézy. S vašimi osobnými údajmi zaobchádzame
        zodpovedne, v súlade s nariadením Európskeho parlamentu a Rady (EÚ) 2016/679 (GDPR) a zákonom č. 18/2018 Z. z.
        o ochrane osobných údajov. Na tejto stránke nájdete, aké údaje spracúvame, prečo, ako dlho a aké máte práva.
      </p>

      <h2>1. Správca osobných údajov</h2>
      <OrgBlock role="Správca" />
      <p>
        Vo veciach ochrany osobných údajov nás môžete kontaktovať e-mailom na <a href={`mailto:${KROK_ORG.email}`}>{KROK_ORG.email}</a>{' '}
        alebo poštou na adrese sídla.
      </p>

      <h2>2. Aké údaje spracúvame</h2>
      <h3>Darcovia</h3>
      <ul>
        <li>meno, priezvisko, titul, e-mail, telefón a adresa (ak ich uvediete),</li>
        <li>farnosť, ku ktorej sa hlásite, a projekty (výzvy), ktoré podporujete,</li>
        <li>variabilný symbol a história darov (dátum, suma, spôsob platby, výzva),</li>
        <li>údaje z bankových výpisov pri dare prevodom (meno platiteľa, číslo účtu, správa pre prijímateľa),</li>
        <li>údaje o online platbe od platobnej brány (identifikátor platby, stav, pri pravidelnom dare identifikátor predplatného) – <strong>údaje o platobnej karte nevidíme a neukladáme</strong>.</li>
      </ul>
      <h3>Používateľský účet</h3>
      <ul>
        <li>e-mail a zašifrované heslo, prípadne údaje z prihlásenia cez Google (meno, e-mail),</li>
        <li>technické údaje potrebné na bezpečné prihlásenie (prihlasovacie súbory cookie, čas prihlásenia).</li>
      </ul>
      <h3>Farnosti a kňazi</h3>
      <ul>
        <li>meno, titul a funkcia kňaza vo farnosti (verejný údaj zo schematizmu diecézy),</li>
        <li>telefón, e-mail a fotografia kňaza – na stránke farnosti len s jeho súhlasom,</li>
        <li>e-mail a meno osoby, ktorá spravuje účet farnosti, a záznamy o zmenách, ktoré vykonala.</li>
      </ul>
      <h3>Newsletter a kontaktný formulár</h3>
      <ul>
        <li>e-mail, prípadne meno, a obsah správy, ktorú nám pošlete.</li>
      </ul>
      <h3>Návštevníci webu</h3>
      <ul>
        <li>
          anonymná štatistika návštevnosti (Umami) – <strong>bez cookies a bez osobných údajov</strong>; zbierame len
          súhrnné údaje, ako je počet zobrazení stránok, typ zariadenia či krajina.
        </li>
      </ul>

      <h2>3. Účely a právne základy spracúvania</h2>
      <ul>
        <li>
          <strong>Prijatie a evidencia darov, vydanie potvrdenia o dare, pravidelné dary</strong> – plnenie darovacej zmluvy
          (čl. 6 ods. 1 písm. b) GDPR).
        </li>
        <li>
          <strong>Vedenie účtovníctva a archivácia účtovných záznamov</strong> – zákonná povinnosť (čl. 6 ods. 1 písm. c)
          GDPR, zákon o účtovníctve).
        </li>
        <li>
          <strong>Priradenie darov k farnosti a výzve, súhrnné prehľady pre farnosti a diecézu</strong> – oprávnený záujem
          na transparentnom hospodárení fondu (čl. 6 ods. 1 písm. f) GDPR). Kňaz a farnosť vidia len súhrnné čísla
          (počet darcov, vybraná suma), nie mená jednotlivých darcov.
        </li>
        <li>
          <strong>Komunikácia s darcami</strong> (poďakovanie, informácie o použití darov) – oprávnený záujem.
        </li>
        <li>
          <strong>Zasielanie newslettera</strong> – váš súhlas (čl. 6 ods. 1 písm. a) GDPR), ktorý môžete kedykoľvek odvolať.
        </li>
        <li>
          <strong>Stránky farností a správa účtov farností</strong> – oprávnený záujem na informovaní veriacich; kontakt a
          fotografia kňaza na základe súhlasu.
        </li>
        <li>
          <strong>Bezpečnosť webu a ochrana pred zneužitím</strong> – oprávnený záujem.
        </li>
      </ul>

      <h2>4. Ako dlho údaje uchovávame</h2>
      <ul>
        <li>údaje o daroch a účtovné záznamy – 10 rokov od konca roka, ktorého sa týkajú (zákon o účtovníctve),</li>
        <li>údaje darcu a používateľský účet – počas trvania darcovského vzťahu; po zrušení účtu ich vymažeme alebo anonymizujeme, okrem údajov, ktoré musíme uchovať zo zákona,</li>
        <li>newsletter – do odvolania súhlasu (odhlásenie),</li>
        <li>správy z kontaktného formulára – najviac 2 roky od vybavenia,</li>
        <li>záznamy o zmenách v údajoch farností – počas existencie farnosti v registri.</li>
      </ul>

      <h2>5. Komu údaje poskytujeme</h2>
      <p>
        Údaje sprístupňujeme len poverenej osobe fondu v nevyhnutnom rozsahu, účtovníkovi a audítorovi. Nižšie uvedení
        poskytovatelia ich spracúvajú ako naši sprostredkovatelia, len na základe zmluvy a podľa našich pokynov:
      </p>
      <ul>
        <li><strong>Supabase</strong> – databáza a prihlasovanie (dátové centrum v Írsku, EÚ),</li>
        <li><strong>Vercel Inc.</strong> – prevádzka webu (hosting),</li>
        <li><strong>Backblaze</strong> – úložisko obrázkov a dokumentov (dátové centrum v Holandsku, EÚ),</li>
        <li><strong>Mollie B.V.</strong> (Holandsko) – platobná brána pre online dary,</li>
        <li><strong>Fio banka, a. s.</strong> – vedenie bankového účtu fondu a výpisy pre párovanie darov,</li>
        <li><strong>Brevo (Sendinblue SAS, Francúzsko)</strong> – rozosielanie e-mailov a newslettera,</li>
        <li><strong>Google Ireland Limited</strong> – len ak sa prihlásite cez účet Google,</li>
        <li><strong>Umami Software</strong> – anonymná štatistika návštevnosti bez osobných údajov.</li>
      </ul>

      <h2>6. Prenos údajov mimo EÚ</h2>
      <p>
        Údaje ukladáme v Európskej únii. Niektorí poskytovatelia (napr. Vercel, Google) sú spoločnosti so sídlom v USA alebo
        s pobočkami v USA. Prípadný prenos údajov do USA sa uskutočňuje na základe rozhodnutia Európskej komisie
        o primeranosti (EU-U.S. Data Privacy Framework) alebo štandardných zmluvných doložiek.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Používame len <strong>nevyhnutné súbory cookie</strong>, ktoré zabezpečujú prihlásenie do účtu a bezpečné fungovanie
        webu. Analytické ani reklamné cookies nepoužívame – štatistiku návštevnosti meriame anonymne bez cookies,
        preto od vás nepotrebujeme súhlas s cookies.
      </p>

      <h2>8. Stránky farností</h2>
      <p>
        Oznamy, aktuality a ďalší obsah na stránkach farností (<Link href="/farnosti">mojkrok.sk/farnosti</Link>) zverejňuje
        príslušná farnosť. Za obsah, ktorý farnosť zverejní (napr. mená v oznamoch), zodpovedá farnosť. Ak sa vás týka
        obsah, s ktorým nesúhlasíte, kontaktujte farnosť alebo nás – príspevok vieme bezodkladne stiahnuť.
      </p>

      <h2>9. Zabezpečenie</h2>
      <p>
        Údaje chránime šifrovaným spojením (HTTPS), zašifrovanými heslami, riadením prístupov podľa rolí (každý vidí len to,
        čo potrebuje), pravidelnými aktualizáciami a zálohovaním. Prístup k údajom darcov majú len poverené osoby fondu.
      </p>

      <h2>10. Vaše práva</h2>
      <ol>
        <li>právo na prístup k svojim údajom a na ich kópiu,</li>
        <li>právo na opravu nesprávnych alebo neúplných údajov (väčšinu si upravíte sami v <Link href="/profil">profile</Link>),</li>
        <li>právo na vymazanie („právo na zabudnutie“), ak nám to nebráni zákonná povinnosť,</li>
        <li>právo na obmedzenie spracúvania,</li>
        <li>právo na prenosnosť údajov,</li>
        <li>právo namietať proti spracúvaniu na základe oprávneného záujmu,</li>
        <li>právo kedykoľvek odvolať súhlas (napr. odhlásením z newslettera odkazom v každom e-maile),</li>
        <li>
          právo podať sťažnosť dozornému orgánu – Úrad na ochranu osobných údajov SR, Hraničná 12, 820 07 Bratislava,{' '}
          <a href="https://dataprotection.gov.sk" target="_blank" rel="noopener noreferrer">dataprotection.gov.sk</a>.
        </li>
      </ol>
      <p>
        Svoje práva si môžete uplatniť e-mailom na <a href={`mailto:${KROK_ORG.email}`}>{KROK_ORG.email}</a>. Odpovieme
        najneskôr do jedného mesiaca.
      </p>
    </LegalPage>
  )
}

# Návrh: Databáza farností (profil, bohoslužby, štatistika, predpis, vlastná stránka)

Stav k **2026-10-08**: fázy **F0–F5 hotové** + e-zvonček (F5b), schematizmus kňazov K0–K3, fotogaléria, zdieľanie a videá. Vývoj beží na vetve `staging` → **test.mojkrok.sk** (spoločná DB s produkciou), do produkcie (`main`) až po kontrole diecézou. Ostáva: F6 (subdomény), pilot, K4–K6, drobnosti v checkliste nižšie. Nadväzuje na `krok_navrh_vyzvy.md` a `krok_databaza_struktura.md`.
Migrácie v produkčnej DB ✅: **032** (sekvencia VS), **033** (onboarding darcu), **034** (register farností), **035** (stránky farností – oznamy, aktuality, sviatosti, motív), **036** (sociálne siete), **037** (sviatosti – premenovanie), **038** (úradné hodiny), **039** (erb / logo), **040** (e-mailové šablóny), **041** (e-zvonček), **042** (prístupové e-maily), **043** (register kňazov), **044–045** (fotogaléria), **046** (videá). *(Pôvodne plánované čísla 026/027 obsadili banka, newsletter a darcovia.)*

Legenda: ✅ hotové · 🟡 čiastočne · ⬜ nezačaté · ~~prečiarknuté~~ = vyriešené / zodpovedané.

## Checklist modulu

**Dáta a model (F0, F1)**
- [x] Zdroj dát: CSV `data/farnosti2.csv` + oficiálny schematizmus dcza.sk (`scripts/fetch-schematizmus.ts`) – § 2, § 7
- [x] Import `scripts/import-parishes.ts` (dry-run / `--apply`): 123 záznamov (114 farností + 9 duchovných správ), 208 obcí, 232 kňazov, IČO 115, IBAN 109 – § 7, § 8.2
- [x] Migrácia 034: rozšírené `parishes`, obce + štatistika, bohoslužby (2 režimy × bežné/prvý piatok), kňazi, predpisy, prístupy, návrhy, audit, RLS – § 3
- [x] Pseudo-farnosti zrušené (Lectio, Dve percentá → projekt aj pri daroch; Charita len `donor_projects`; Rodinkovo bez projektu) – § 2, O19, O22
- [x] Snapshot farnosti na dare `donations.parish_id` + trigger (namiesto 5 miest v kóde) + backfill – § 3.5
- [x] Bezpečnosť: `parishes` pre anon/authenticated len bezpečné stĺpce (predtým `SELECT *` pre každého) – § 4.2, § 5.3
- [ ] Doplniť chýbajúcu štatistiku (Dolný Moštenec, Hvozdnica, Jasenové, Žilina-Bánová) a IČO (Rosina, Hvozdnica) – doplní **Juraj**, keď dostane prístup (po doladení s Juliou); **duchovné správy vlastné IČO nemajú** – nedopĺňa sa *(overené 2026-10-08)*
- [ ] Overiť IČO pri Makove a sv. Barbore (v CSV dve rôzne) – poznámka pri farnosti
- [ ] Odstrániť textový stĺpec `parishes.deanery` (z 001, duplikuje `deanery_id`; nečíta ho kód ani DB, 0 rozdielov) – **migrácia 047 pripravená, spustiť ručne** – § 3.1

**Darca (F1b)**
- [x] Povinný výber farnosti (aj „nepatrím do farnosti“) + projekt pri registrácii – § 6.3, O20
- [x] Onboarding `/profil/vitajte` (aj po Google registrácii) – § 6.3
- [x] Zmena farnosti a projektu v profile – § 6.3
- [x] Darca sa hľadá cez `auth_user_id`, zmena e-mailu nezaloží druhý profil – § 6.4, O21
- [x] VS nových darcov z DB sekvencie (race condition) – O23
- [ ] Riadok „Dary bez farnosti (na projekt)“ v prehľadoch za diecézu – § 2 → **súčasť dashboardu pre kúriu**

**Admin diecézy (F2, F3, F4)**
- [x] `/admin/farnosti` – zoznam (hľadanie, dekanát, typ, chýbajúce údaje, plnenie) – § 6.1
- [x] Detail: Základné údaje, Obce a štatistika, Bohoslužby, Kňazi, Dary a história, Prístupy a návrhy – § 6.1
- [x] Predpisy na rok `/admin/farnosti/predpisy` (generovanie, prepočet, ručná úprava s dôvodom, export XLSX) – § 3.4; **predpisy 2026 vygenerované** (110 farností, 930 982 €)
- [ ] Predpis podľa **podielu pracujúcich katolíkov** – treba vytvoriť vzorec koeficientu, **má čas** – § 10.1
- [x] Prístupy farnosti (existujúci účet / pozvánka) + fronta `/admin/farnosti/schvalovanie` – § 3.6, § 5.1
- [x] „Prihlásiť sa za farnosť“ – náhľad zóny farnosti z adminu
- [ ] Filtre zoznamu: okres, „neaktualizované > 12 mes.“, „bez prístupu“, „čaká na schválenie“ – § 6.1 *(počká)*
- [ ] Graf histórie plnenia (dnes tabuľka) a menný zoznam darcov farnosti v admine (`view_donors`) – § 6.1 *(počká)*
- [ ] E-mail referentovi pri novom návrhu zmeny – § 3.6 *(počká)*
- [ ] **Dashboard pre kúriu** (a kontrolóra) – tabuľka práv `view_parishes` už existuje, chýba prehľadová obrazovka – § 5.2
- [x] ~~Slovenská šablóna pozvánky v Supabase Auth~~ → nahradené vlastnými e-mailmi (migrácia 042): pozvánka farnosti s podpisom, nastavenie a obnova hesla cez `/auth/overenie` (odolné voči skenerom pošty), opätovné poslanie pozvánky z adminu

**Zóna farnosti (F4)**
- [x] `/moja-farnost`: prehľad plnenia bez mien, bohoslužby a prezentácia naživo, úradné údaje a štatistika návrhom, kontakt kňaza – § 6.2
- [x] Foto farnosti (upload) – titulná fotka + erb v Prezentácii – § 6.2 *(foto a kontakt kňaza boli neskôr odstránené – kňazi sa berú z registra, verejne len meno, tituly, funkcia – O47, O48)*
- [ ] Materiály: letáky, QR kód a VS (pay-by-square) – § 6.2 *(neskôr, teraz nie je priorita)*
- [ ] Pilot – rozposlať prístupy prvým 5–8 farnostiam – § 8.1, O16 – **až keď bude všetko pripravené**; predtým **fiktívna testovacia farnosť a fiktívny kňaz** na odskúšanie celého postupu *(2026-10-08: žiadna farnosť nemá prístup, zverejnená len Belá)*

**Verejné stránky (F5, F6)**
- [x] Migrácia 035: `parish_posts` (oznamy, aktuality, PDF príloha), `sacrament_texts`, `parishes.theme` – § 4.1 (+ 036 sociálne siete, 037 sviatosti, 038 úradné hodiny, 039 erb)
- [x] `/farnosti` (zoznam + hľadanie podľa obce, „Najbližšie ku mne“) a `/farnosti/[slug]` (bohoslužby, kňazi, kontakt, mapa, sviatky, oznamy); základná stránka pre nezverejnené farnosti (O43) – § 4.2
- [x] Oznamy a aktuality v zóne farnosti (TipTap) + stiahnutie z webu diecézou (`/admin/farnosti/prispevky` – „Najnovšie od farností“) – § 4.3
- [x] SEO: sitemap, OG, schema.org `CatholicChurch` + sv. omše; staging mimo indexu (noindex) – § 4.2
- [x] Zásady ochrany OÚ a podmienky – obsah od farností, kňazi, fotky farností – § 5.4
- [ ] Subdomény `<farnost>.mojkrok.sk` (301) – § 4.4, F6 – **spolu s webom dcza.sk**, keď presunieme doménu pod nás
- [x] Rozhodnúť W1–W6 (rozsah F5 podľa podkladu `web_parochia`) – § 11, O26–O31
- [x] Sviatosti: diecézny štandard + úprava farnosti – § 4.1, O27
- [x] Motívy: `parishes.theme` + register motívov (zatiaľ `standard`) – § 4.1, O29
- [x] Čistenie vloženého textu z Wordu (TipTap + `sanitize-html`) – § 4.1, O30
- [x] „Podporujem fond“ → registrácia s predvyplnenou farnosťou – § 12, O31
- [x] Rozhodnúť E1–E8 – O32–O38
- [x] E-zvonček farnosti (F5b, migrácia 041; jednorazový + pravidelný, poplatky Mollie/fond per farnosť, mesačné výplaty SEPA XML + Excel, ďakovný e-mail) – § 12; **otestované celým workflow** 2026-10-06
- [ ] Účelové zbierky farností (cieľová suma) – zatiaľ nie, O37

**Fotogaléria farnosti (§ 17)**
- [x] Rozhodnúť G1–G6 – § 17.4, O59–O64
- [x] Realizácia (migrácie 044–045): albumy a fotky, nahrávanie viacerých fotiek so zmenšením do WebP, kvóta, sekcia na stránke farnosti, galéria + zväčšenie, prepojenie s aktualitou, externé albumy, stiahnutie diecézou, upozornenie GDPR + podmienky – § 17.1–17.2
- [ ] Otestovať na test.mojkrok.sk (nahrávanie z mobilu, HEIC z iPhonu, kvóta)
- [x] Pripomienky Julie (2026-10-08): duchovné správy na konci zoznamu, kompaktné bohoslužby, „Chcem podporiť“, jasnejšie spovedanie („svätá omša“), PDF prílohy, úvod a oznamy hore, tmavá pätička ponechaná; gradient – neriešiť (vec vkusu)
- [x] Zdieľanie stránky, príspevkov, albumov a fotiek + zdieľanie zo zóny – § 18, O65
- [ ] Automatické zverejnenie na FB stránku farnosti – § 18, S1 (možno v budúcnosti, teraz nie)
- [x] Videá – odkazy YouTube / Vimeo pri aktualitách a v albumoch, bez nahrávania (migrácia 046) – § 19, O66

**Schematizmus kňazov (K0–K5, § 16)**
- [x] Analýza `KNAZI - ZOZNAM AKTUALNY.xlsx` (11 listov, 274 kňazov, problémy v dátach) – § 16.1
- [x] Rozhodnúť K1–K9 – § 16.8, O44–O52
- [x] K0: migrácia 043 (register `clergy`, pôsobenia, číselníky, `deaneries.code`, oprávnenia) + import (2026-10-07: 440 osôb, 1 698 pôsobení, 259/267 spárovaných so schematizmom dcza.sk, 224/232 `parish_clergy` prepojených; 288 bodov na kontrolu v `data/import-clergy-report.csv`) – § 16.2, § 16.6
- [x] K1: admin `/admin/knazi` (zoznam s farebnými stavmi a filtrami, detail so záložkami, zmena stavu bohoslovec → diakon → kňaz, nové menovanie / ukončenie / hlavné pôsobenie, história zmien, export XLSX v službe / všetci) – § 16.4
- [x] K2: výročia (kňazstvo od 10. každých 5 r., život od 40., úmrtie 1. a každých 5 r.), meniny, export XLSX pre KN, adresné štítky 3 × 8 – `/admin/knazi/vyrocia`, `/admin/knazi/stitky` – § 16.5
- [x] K3: kňazi na stránkach farností z registra – verejne len meno, tituly, funkcia (O47); v zóne farnosti a v admine farnosti len na čítanie, úprava kontaktu a fotky kňaza odstránená (O48); doplnené väzby 11 duchovných správ / farností (`scripts/link-clergy-parishes.ts`). `parish_clergy` ostáva len ako archív starého importu – zmazať neskôr – § 16.2
- [x] K4: kňazská zóna – účet kňaza z registra (`clergy.auth_user_id`, pozvánka z adminu) – § 15
- [ ] K5: verejný schematizmus – **súčasť webu dcza.sk** – § 14
- [ ] K6: digitálne celebrety (QR overenie, karta na tlač, PDF) – § 16.9 – **závisí od webu dcza.sk** (overovacia adresa)

**Ďalšie moduly (zapísané, aby sme nezabudli)**
- [ ] Fáza II: widgety pre farské weby mimo platformy (podpora Kroku + e-zvonček) – § 13 *(až keď bude všetko hotové)*
- [ ] Web diecézy na platforme Krok (doména `dcza.sk`) – migrácia z **beta.dcza.dev** + články zo živého webu, presun domény; odblokuje K5, K6 a F6 – § 14, **§ 20 (O70–O73, fázy D0–D6)**
- [x] **Kňazská zóna** (migrácia 048) – `/knazska-zona` (kategórie, nové, archív, roky, fulltext v PDF/DOCX bez diakritiky s úryvkami), admin `/admin/knazska-zona` (dokumenty, súbory priamo do B2, zverejnenie + e-mail kňazom, kategórie, pozvánky kňazov z registra) – § 15, O39–O42, O67–O69
- [ ] Kňazská zóna: **súkromný bucket B2** (`B2_PRIVATE_BUCKET`) – nastaviť pred nahraním citlivých dokumentov
- [ ] **Dashboard pre kúriu** vrátane riadku „Dary bez farnosti (na projekt)“ – § 5.2, § 2

Cieľ modulu:

1. Úplný **profil farnosti** (kontakty, IČO/DIČ, účet, patrocínium, web).
2. **Bohoslužby a spovedanie** v dvoch režimoch: *cez rok* a *letný/prázdninový*.
3. **Štatistika veriacich** za farnosť aj filiálky (obyvatelia / katolíci / %).
4. **Prínos farnosti do fondu**: počet darcov a vyzbieraná suma.
5. **Predpis na rok** = počet katolíkov × koeficient, + **história rokov**.
6. Kňaz sa prihlási, vidí a **navrhuje zmeny** profilu svojej farnosti.
7. **Verejná stránka farnosti** – pre farnosti bez vlastného webu, vrátane oznamov a článkov.

---

## 0. Rozhodnutia (2026-09-28 až 2026-09-30)

| # | Otázka | **Rozhodnutie** |
|---|---|---|
| O1 | Čo je príspevok farnosti do fondu | **Len dary darcov, ktorí majú priradenú farnosť.** Farnosť ako samostatný darca sa nerieši. |
| O2 | Zmena farnosti darcu | **Neprepočítavať** – dar zostáva vo farnosti, kde bol darca v čase daru → `donations.parish_id` ako snapshot. |
| O3 | Vidí kňaz mená darcov | **Nie – len agregáty** (počet darcov, suma, plnenie). Žiadne mená ani sumy jednotlivcov. |
| O4 | Ako vzniká predpis | Historické predpisy **neexistujú**. Počíta sa **počet veriacich × koeficient**, výsledok sa dá ručne prepísať. |
| O5 | Smie farnosť meniť štatistiku veriacich | **Nie, len navrhnúť.** Zdroj dát je Štatistický úrad. |
| O6 | Zmeny od farnosti | **Schválenie pri všetkých údajoch právneho charakteru** – dekanát, názov, farský kostol, IČO, DIČ, ulica, mesto, PSČ, okres, telefón, e-mail, účet, www + štatistika veriacich. Bohoslužby, spovedanie, oznamy a články idú naživo hneď. |
| O7 | Prístup k farnosti | Diecéza priradí k farnosti **admin účet stránky**. Editorov si farnosť **zatiaľ nepozýva sama** – všetky účty prideľuje diecéza. |
| O8 | Vlastná stránka farnosti | **Áno** – bohoslužby a spovedanie, s rozlíšením letný/prázdninový režim vs. cez rok. |
| O9 | Obsah na stránke farnosti | **Áno** – farnosť vie pridať **oznamy** aj **články**. Mnohé farnosti web nemajú, toto ho nahradí. |
| O10 | Duchovné správy (nemocnice, UPC, pustovňa) | **Áno**, v tom istom registri ako samostatný typ, bez štatistiky a bez predpisu. |
| O11 | Sezónne režimy | **Zatiaľ dva**: „cez rok“ a „letný / prázdninový“. |
| O12 | Význam sporných CSV polí | Stĺpec **6 = Hody** (dátum slávenia), stĺpec **14 = Výročná celodenná poklona** (dátum). 14 stĺpcov spovedania = **7 dní bežné + 7 dní prvopiatkové** (nie letný/zimný režim, ako som pôvodne odhadol). |
| O13 | Subdoména `zilina.mojkrok.sk` | **Technicky áno**, riešená ako **301 presmerovanie** na kanonické `/farnosti/<slug>` – detail v § 4.4. |
| O14 | Koeficient predpisu | **2 € na katolíka**, základ = štatistika SODB 2021. |
| O15 | Maskovanie súm pri málo darcoch | **Nie – zobrazovať reálne čísla.** Transparentnosť je prednejšia. |
| O16 | Rozposlanie prístupov | **Diecéza.** Pilot na farnostiach, ktoré už reálne prispievajú (konkrétny zoznam v § 8.1). |
| O17 | Aktualizácia štatistiky veriacich | **Len pri sčítaní ľudu** (ďalšie 2031). Medzitým sa nemení. |
| O18 | Kňazi na verejnej stránke | **Áno** – kontakt na kňaza aj **zoznam kňazov pôsobiacich vo farnosti** (§ 3.8). Pridanie/odobranie osoby ide cez diecézu, kontakt a foto si mení kňaz sám. |
| O19 | Pseudo-farnosti (Lectio divina, Dve percenta, Charita, Rodinkovo) | Sú to **projekty zvolené namiesto farnosti**. Darcovia idú na **„bez farnosti“**, voľba sa preklopí do `donor_projects` + `donations.project_id`. `Charita` = projekt „S farskou charitou bližšie k vám“, `Rodinkovo` ostáva bez projektu (potvrdené). Postup v § 2. |
| O20 | Výber farnosti a projektu pri registrácii | **Povinný už pri registrácii**, nie až v profile. Google registrácia sa rieši presmerovaním na onboarding krok po návrate (§ 6.3). |
| O21 | Zmena e-mailu darcu | Nesmie spôsobiť nič zlé – profil sa musí hľadať cez `auth_user_id`, nie cez e-mail (§ 6.4). |
| O22 | Staré dary darcov s pseudo-farnosťou **Charita** (12 darov, 1 654,93 €) | **Nepriradiť k výzve** – sú už v `legacy_collected_amount` výzvy „S farskou charitou…“ (rozhodnutie 2026-09-29). Darca dostane len `donor_projects`. Lectio divina a Dve percenta sa priraďujú podľa § 2. |
| O23 | Race condition vo VS (Q1) | **Áno, riešiť spolu s F1b** – DB sekvencia namiesto „max + 1“ v JS na všetkých miestach, kde vzniká darca. |
| O24 | Koeficient (Q3) | **2 €/katolík pre všetky farnosti**, jednotlivé predpisy sa dajú ručne prepísať. |
| O25 | Viditeľnosť plnenia (Q4) | **Každá farnosť vidí len seba**, súhrn a porovnanie má len diecéza. |
| O26 | Rozsah F5 (W1) | Rozloženie stránky, bohoslužby, najnovší oznam + archív, aktuality, kontakt, kňazi, mapa, hody/poklona, tlačidlo „Časy omší“, podpora + **SEO**. ICS a samostatné udalosti neskôr (§ 11). |
| O27 | Sviatosti (W2) | **Spoločný text diecézy ako štandard**, farnosť si ho môže **upraviť** pre seba (vlastná verzia prekryje diecéznu). |
| O28 | Typy obsahu (W3) | **Oznamy + aktuality.** Žiadne samostatné „články“ ani „udalosti“ – udalosť je aktualita (s voliteľným dátumom konania). |
| O29 | Vzhľad (W4) | **Zatiaľ jeden štandardný motív**, ale kód sa robí tak, aby sa dali **neskôr pridávať ďalšie motívy (templaty)** a farnosť si vyberie. |
| O30 | Oznamy (W5) | **Text** – kňaz skopíruje z Wordu do webu; pri vložení sa musí **odstrániť balast z Wordu** (štýly, `mso-*`, prázdne spany…). PDF príloha voliteľne. |
| O31 | Podpora zo stránky farnosti (W6) | **Dve tlačidlá:** „Podporujem fond“ (registrácia s **predvyplnenou farnosťou**) a „Podporujem farnosť“ = **e-pokladnička** – čo sa vyzbiera pre farnosť, fond farnosti pošle. Detail a otvorené otázky v § 12. |
| O32 | E-pokladnička a predpis (E1) | **Nie** – dar do e-pokladničky je dar pre farnosť, do plnenia predpisu sa nerátá. |
| O33 | Poplatky e-pokladničky (E2, E3) | Vyúčtovanie **mesačne**. Odpočítava sa **poplatok Mollie (%)** a **poplatok fondu (%)** – obe **nastaviteľné pre každú farnosť zvlášť** (napr. 1 % + 2 %, iná farnosť inak). Cieľ: spravodlivé rozdelenie – silnejšie farnosti podporujú slabšie a fond z poplatku pokrýva svoju prevádzku. |
| O34 | Spôsob platby (E5) | **Len platobná brána Mollie**, bankový prevod nie. |
| O35 | Účtovanie (E4) | Dar do e-zvončeka sa účtuje ako **dar – kostolná zbierka**. |
| O36 | Typ daru (E6) | **Jednorazový aj pravidelný** (mesačný) – darca si vyberie. |
| O37 | Rozsah prvej verzie (E7) | Začíname **len „e-zvončekom“** (všeobecná zbierka pre farnosť). **Účelové zbierky** („na opravu strechy“, cieľová suma) pridáme neskôr. |
| O38 | Farnosti s vlastným webom (E8) | **Fáza II:** moduly (widgety) pre farské weby mimo našej platformy – podpora fondu Krok aj e-zvonček na ich stránke (§ 13). |
| O39 | Kňazská zóna – prístup (K1) | **Áno aj pre kňazov bez farnosti** (výpomoc, dôchodcovia, rehoľníci) – osobné účty kňazov. |
| O40 | Potvrdenie prečítania (K2) | **Nie.** Zóna je archív; každý dokument sa kňazom posiela aj **e-mailom**. |
| O41 | Kto pridáva dokumenty (K3) | **Len kúria.** |
| O42 | Archív (K4) | Starý archív sa neimportuje – **všetko sa pridáva ručne**. Obežníky sú **platné stále**; čo diecéza archivuje, presunie sa do **Archívu**. |
| O43 | Vyhľadávanie farností a nezverejnené farnosti (2026-10-05) | Stránku `/farnosti/[slug]` má **každá aktívna farnosť**. Kým nie je zapnutá „Verejná stránka farnosti“, je to **základná stránka**: kontakt, kňazi, obce, hody/poklona, **bohoslužby a úradné hodiny, ak sú vyplnené**, podpora fondu cez farnosť (+ e-kasička, keď bude). Bez úvodného textu „zatiaľ nezverejnila…“, bez oznamov, aktualít a sviatostí. Stránku si zapína aj **správca farnosti** v zóne farnosti (Prezentácia). Vyhľadávanie: odkaz v menu a pätičke, blok na domovskej stránke, „Moja farnosť“ pre darcu, hľadanie podľa obce/filiálky/patróna, `?q=` v adrese, „Najbližšie ku mne“ (GPS), obce v popise stránky (SEO). |

| O44 | Archív kňazov (K1, 2026-10-07) | **Áno, povinne** – importujú sa aj **odišli zo ŽD** a **zomrelí** (stav `left` / `deceased`). |
| O45 | Bohoslovci (K2) | Importuje sa **len aktuálny ročník**. **Ročník sa zvyšuje automaticky k 1. 9.**; stav osoby sa dá **zmeniť výberom** (bohoslovec → diakon → kňaz/kaplán…) a v zozname má každý stav **vlastnú farbu**. |
| O46 | Prístup do registra (K3) | Zatiaľ **len KROK a diecéza** (kúria). |
| O47 | Verejné údaje (K4) | Ako dnes na **dcza.sk/schematizmus**: meno s titulmi, funkcia, *Pochádza*, diakonát (dátum, miesto), kňazská vysviacka (dátum, miesto), **história pôsobenia po rokoch**, dekanát a farnosť (odkazy). **Bez fotky a kontaktov.** URL `priezvisko-meno-funkcia`. |
| O48 | Kňaz a jeho údaje (K5) | Kňaz **register nevidí a nič v ňom nemení** – ani kontakt, ani fotku. |
| O49 | Zdroj pravdy (K6) | **Register je hlavný zdroj pravdy.** Preloženie kňaza robí diecéza záznamom v registri a stránky farností ukážu aktuálny stav automaticky. |
| O50 | Osobné číslo (K7) | **Prideľuje diecéza.** |
| O51 | Excel (K8) | Po dokončení **Excel vypadne**, potrebné sú **exporty** z registra. |
| O53 | Celebret pre diakonov (2026-10-07) | **Nie** – celebret majú len kňazi. |
| O54 | Jazyk celebretu | **Latinčina**; prepínač do **angličtiny a španielčiny** by bol fajn, **nie je priorita**. |
| O55 | Platnosť celebretu | **Vždy na rok** od vydania. |
| O56 | Overovacia adresa | **Náhodný kód** v adrese (dnes je pri celebrete aj kód na odomknutie – nahradí ho náhodná adresa), **zákaz indexovania** vyhľadávačmi. |
| O57 | Logo, pečiatka, podpis | Presunúť do Kroku a **dať ich meniť v admine** (zmena biskupa → nový podpis bez programovania). |
| O58 | Kontakt na celebrete | Nadpis **Curia dioecesana** (dnešné „Oratio Dioecesis“ bol preklep). |
| O59 | Fotky kostola (G1, 2026-10-08) | **Áno** – album „Kostol a farnosť“, pás fotiek hore na stránke farnosti (nahradí stmavenú titulnú fotku). |
| O60 | Kvóta galérie (G5) | Určuje **diecéza pre každú farnosť**, predvolene **1 GB** (dá sa zvýšiť v admine). Fotky sa na serveri zmenšia (max. 2000 px) a prevedú do **WebP**. |
| O61 | Kto nahráva (G3) | **Správca aj editor** farnosti; ide na web hneď, diecéza vie album stiahnuť. |
| O62 | Indexovanie (G4) | Fotky kostola na hlavnej stránke farnosti áno, **albumy zo života farnosti `noindex`** (deti). |
| O63 | Externé albumy (G6) | Popri vlastných albumoch aj **odkaz na externý album** (Facebook, Google Fotky, Zonerama) – dlaždica otvorí odkaz. |
| O64 | GDPR | Upozornenie pri nahrávaní v zóne + odsek v **podmienkach používania** (súhlas rodičov pri deťoch, odstránenie na žiadosť). |
| O65 | Zdieľanie (2026-10-08) | Tlačidlo Zdieľať na verejných stránkach (aj jednotlivé fotky) a v zóne farnosti; priame zverejnenie na FB stránku neskôr (S1). |
| O66 | Videá (2026-10-08) | Len **odkazy YouTube / Vimeo** (bez nahrávania) pri aktualitách a v albumoch; prehrávač sa načíta až po kliknutí (YouTube bez cookies). |
| O67 | Kategórie kňazskej zóny (2026-10-08) | **13 kategórií zo starej zóny dcza.sk** (Dokumenty, Štatúty a zmluvy, Obežníky, Formuláre, Ekonomický manuál, Liturgia, Birmovky, Exorcizmus, Homílie, Katechéza, Hospodárenie diecézy, Ochrana osobných údajov, Darujem) – kúria ich premenuje, pridá, zoradí, skryje. |
| O68 | Kto má účet v kňazskej zóne | **Kňazi, diakoni (aj trvalí) a biskupi** z registra v stave v službe / na odpočinku / štúdium – pozvánka z adminu (aj hromadne) na pracovný, inak súkromný e-mail; **účty farností** vidia zónu automaticky; bohoslovci nie. |
| O69 | E-mail pri zverejnení | **Prepínač pri dokumente, predvolene zapnutý**; e-mail obsahuje len odkaz do zóny (dokument sa neprikladá – ostáva neverejný). |
| O70–O73 | Web dcza.sk (2026-10-08) | Viď § 20.2 – štruktúra z bety + články zo živého webu, nový svetlý vzhľad, canonical farností na dcza.sk po spustení, archív 2 roky. |
| O52 | Celebrety (K9) | Súčasťou registra bude **tvorba digitálnych celebretov** (dnes sa robia v programe na vizitky, napr. celebret.dcza.sk/dusan-pecko) – zjednotiť do Kroku (§ 16.9). |

Dôsledok O8+O9: verejná stránka farnosti **prestáva byť voliteľnou fázou** a stáva sa jadrom modulu.

---

## 1. Čo už v Kroku existovalo (audit k 2026-09-28) – *historický stav pred implementáciou*

Zistené priamo z produkčnej DB a kódu:

| Vec | Stav | Poznámka |
|---|---|---|
| `parishes` | **83 riadkov**, 6 stĺpcov (`name, deanery, city, postal_code, deanery_id`) | Skoro prázdny model – žiadne kontakty, IČO, účet |
| `deaneries` | 12 dekanátov (migrácia 003) | **Len 4 farnosti z 83 majú `deanery_id`** – textový `deanery` sa nezhodoval s názvami |
| `donors.parish_id` | 378 z 397 darcov má farnosť | Dobrá kvalita dát |
| `donations` | 7 332 darov, roky **2019–2026**; 6 678 má darcu s farnosťou | Základ pre „prínos farnosti“ existuje už dnes |
| Rola `farnost` | **už existuje** v `roles` (migrácia 009) | Nemá pridelené oprávnenie ani obrazovku |
| RBAC | `permissions` + `role_permissions` + `v_user_permissions`, guardy v `src/lib/auth.ts` | Stačí pridať nové permission ID |
| Admin farností | `/admin/nastavenia/farnosti` – modál nad 4 poľami | Treba povýšiť na plnohodnotný modul |
| TipTap editor | `SimpleRichTextEditor` (obrázky, tabuľky, YouTube) + B2 upload | **Znovupoužiť pre oznamy a články farnosti** |
| RLS na `parishes` | len `is_admin()` | Pre zónu farnosti aj verejné stránky treba nové policy |

**Záver: rozširujeme `parishes`, nezakladáme paralelnú tabuľku.** `donors.parish_id` je už cieľom FK a nesie 6 678 darov histórie.

---

## 2. Zdrojové dáta – CSV `farnosti2.csv` ✅

Export z FileMakeru. Jeden riadok = farnosť, za ňou riadky filiálok (prázdne polia farnosti + blok štatistiky).

| # | Pole | Príklad |
|---|---|---|
| 1 | Dekanát | `Žilina`, `PB`, `Tka`, `KNM` (skratky aj plné názvy!) |
| 2 | DIČ | `2020701804`, často `xxx` |
| 3 | E-mail farnosti | `farnost.zilina@gmail.com` |
| 4 | Názov farnosti | `Žilina-Mesto` |
| 5 | Patrocínium / titul kostola | `Sedembolestnej Panny Márie` |
| 6 | Dátum (?) | `15.09.2024` – pravdepodobne hody/posviacka |
| 7 | IČO | `31924042` |
| 8 | Pošta / obec | `Žilina` |
| 9 | Okres | `Žilina` |
| 10 | Kód farnosti | `1001` (4-miestny diecézny kód) |
| 11 | Telefón | `041/562 13 12` |
| 12 | Účet | starý tvar `0076508054/0900` **aj** IBAN |
| 13 | Ulica | `Katedrálne námestie 25/3` |
| 14 | Dátum (?) | druhý dátum, význam neznámy |
| 15 | Web | `www.farnost-zilina.sk`, často `xxx` |
| … | ~24 prázdnych stĺpcov | rezerva FM |
| +14 | **Spovedanie** – 14 časových polí | `17.00-17.30hod`, `30 minút pred sv. omšou` – zjavne 7 dní × 2 režimy |
| +4 | **Štatistika**: obec, obyvatelia, katolíci, % | `"Lysica","871","780","89,55"` |

~~14 stĺpcov spovedania sedí s rozhodnutím O11 (dva režimy × 7 dní) – potvrdiť pri importe.~~ ✅ Potvrdené ako 7 dní bežné + 7 dní prvopiatkové (O12); spovedanie malo vyplnené len niekoľko farností.

### Problémy v dátach – všetky vyriešené pri importe ✅

- ~~**Testovacie záznamy**: `Farnosť VZOR`, `Farnosť test`, `Majer`, `Mokrade`, `Dekanát`.~~ ✅
- ~~**Placeholder `xxx`** v DIČ a webe (~40 % riadkov) → `NULL`.~~ ✅
- ~~**Duplicita**: `Makov` dvakrát (dekanát `Turzovka`, IČO 31925308 vs. dekanát `Tka`, IČO 31926835).~~ ✅
- ~~**Posunuté riadky štatistiky**: záznam `Trnové` má pod sebou obce `Turany, Krpeľany, Nolčovo…` – patria inej farnosti. Automatické priradenie by vyrobilo nezmysly.~~ ✅
- ~~**Nekonzistentné dekanáty**: `Tka` vs `Turzovka`, `PB`, `KNM`, `Krásno ` (s medzerou) → mapovací slovník.~~ ✅
- ~~**Percentá** s chybami plávajúcej čiarky (`80,819999999999993`) – neimportovať, počítať z `katolíci / obyvatelia`.~~ ✅
- ~~**Duchovné správy** bez IČO a štatistiky → `kind = 'chaplaincy'`.~~ ✅
- ~~Súbor je **poškodený na úrovni riadkov** – niektoré záznamy zlepené (`…"88,83""Púchov","2020617588"…`).~~ ✅

### Zistenia na strane DB (nie CSV) ✅

Pri kontrole produkčných dát vyšli najavo dve veci, ktoré import aj výpočet plnenia priamo ovplyvnia:

1. **Názvy v DB majú predponu „Farnosť “** (`Farnosť Rajec`), CSV ju nemá (`Rajec`). Párovanie musí predponu odstrániť, inak sa nespáruje ani jeden záznam.
2. **Štyri riadky v `parishes` nie sú farnosti**, ale kategórie pôvodu daru: `Lectio divina`, `Dve percenta`, `Charita`, `Rodinkovo`. Visí na nich **12 darcov, 379 darov a 9 678,58 €**:

| „Farnosť“ | Darcov | Darov | Suma |
|---|---:|---:|---:|
| Lectio divina | 9 | 353 | 6 106,39 € |
| Dve percenta | 1 | 14 | 1 917,26 € |
| Charita | 1 | 12 | 1 654,93 € |
| Rodinkovo | 1 | 0 | 0,00 € |

Nie sú to chyby v dátach – sú to **darcovia, ktorí si namiesto farnosti vybrali projekt**. Do fondu prispievajú za projekt, nie za farnosť. Patria teda medzi darcov **bez farnosti**, ale ich voľba sa nesmie stratiť.

Dobrá správa: model na to už má miesto a nič nové netreba.

- **`donor_projects (donor_id, project_id)`** – tabuľka už existuje a znamená presne „tento darca podporuje tento projekt“.
- **`donations.project_id`** – účel konkrétneho daru; už sa plní pri párovaní cez špecifický symbol.
- Projekty **`Lectio divina`** a **`Dve percenta`** už v `projects` sú; `Charita` zodpovedá projektu **„S farskou charitou bližšie k vám“** (treba potvrdiť), `Rodinkovo` projekt nemá – má 1 darcu a 0 darov.

Väčšine tých darov `project_id` chýba, takže sa dá doplniť presne z názvu pseudo-farnosti:

| Pseudo-farnosť | Darov | z toho už má `project_id` | Suma |
|---|---:|---:|---:|
| Lectio divina | 353 | 4 | 6 106,39 € |
| Dve percenta | 14 | 12 | 1 917,26 € |
| Charita | 12 | 0 | 1 654,93 € |

**Poradie krokov (dôležité – informácia sa dá získať len pred zmazaním):**

```sql
-- 1. účel daru z pseudo-farnosti (349 + 2 + 12 darov)
UPDATE donations d SET project_id = pr.id
FROM donors o JOIN parishes p ON p.id = o.parish_id
JOIN projects pr ON pr.slug = CASE p.name
       WHEN 'Lectio divina' THEN 'lectio-divina'
       WHEN 'Dve percenta'  THEN 'dve-percenta'
       END  -- Charita zámerne nie (O22)
WHERE o.id = d.donor_id AND d.project_id IS NULL;

-- 2. voľba darcu do donor_projects (existujúca tabuľka)
INSERT INTO donor_projects (donor_id, project_id) SELECT …  ON CONFLICT DO NOTHING;

-- 3. zmazať 4 pseudo-farnosti – FK je ON DELETE SET NULL,
--    takže darcom sa parish_id vynuluje automaticky
DELETE FROM parishes WHERE name IN ('Lectio divina','Dve percenta','Charita','Rodinkovo');

-- 4. AŽ POTOM donations.parish_id + backfill (§ 3.5)
```

Krok 4 musí ísť **až nakoniec**, inak sa fiktívna farnosť zapečie do snapshotu na 379 daroch.

✅ Darca si potom projekt **vie zmeniť sám v profile** („Podporujem projekt: …“), ale prednastavený ho dostane – nezačína od nuly. ⬜ V admin prehľade pribudne riadok **„Dary bez farnosti (na projekt)“**, aby súčty za diecézu sedeli a týchto 9 678,58 € nezmizlo z dohľadu.

✅ **Vykonané 2026-09-30** (import `--apply`): Lectio divina 127 darov → projekt, Dve percentá 15 darov → projekt, Charita len `donor_projects` (O22), všetky 4 pseudo-farnosti zmazané, 11 darcov „bez farnosti“, backfill `donations.parish_id` až potom.

> ~~**Akcia:** uložiť CSV do `data/farnosti2.csv` a vypýtať čistý export vrátane hlavičky stĺpcov.~~ ✅ CSV dodané 2026-09-30; hlavným zdrojom sa stal oficiálny schematizmus dcza.sk, CSV dopĺňa úradné údaje.

---

## 3. Dátový model – migrácia 034 ✅

### 3.1 Rozšírenie `parishes` ✅

```sql
CREATE TYPE parish_kind AS ENUM ('parish', 'chaplaincy', 'other');

ALTER TABLE parishes
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,                  -- /farnosti/zilina-mesto
  ADD COLUMN IF NOT EXISTS kind parish_kind NOT NULL DEFAULT 'parish',
  ADD COLUMN IF NOT EXISTS official_name TEXT,
  ADD COLUMN IF NOT EXISTS patrocinium TEXT,
  ADD COLUMN IF NOT EXISTS parish_code TEXT,
  ADD COLUMN IF NOT EXISTS ico TEXT,
  ADD COLUMN IF NOT EXISTS dic TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS administrator_name TEXT,           -- správca farnosti (osobný údaj)
  ADD COLUMN IF NOT EXISTS administrator_since DATE,
  ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE,             -- 'zilina' → zilina.mojkrok.sk (§ 4.4)
  ADD COLUMN IF NOT EXISTS feast_day DATE,                    -- Hody (CSV stĺpec 6) – zobrazuje sa deň a mesiac
  ADD COLUMN IF NOT EXISTS feast_day_note TEXT,               -- ak je pohyblivá („nedeľa po 15. 8.“)
  ADD COLUMN IF NOT EXISTS adoration_date DATE,               -- Výročná celodenná poklona (CSV stĺpec 14)
  ADD COLUMN IF NOT EXISTS consecration_date DATE,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS intro TEXT,                        -- krátky text na verejnú stránku
  ADD COLUMN IF NOT EXISTS notes TEXT,                        -- interná poznámka, nezverejňuje sa
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_on_web BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
```

Plus: ~~doplniť `deanery_id` všetkým 83 farnostiam~~ ✅ (všetkým okrem „Duchovnej starostlivosti v zdravotníctve“, ktorá dekanát nemá) a nakoniec ⬜ **dropnúť textový `deanery`**.

### 3.2 Filiálky a štatistika veriacich ✅

Štruktúra (obce) a čísla (ročné) oddelene, aby sa dala viesť história:

```sql
CREATE TABLE parish_villages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                       -- „Lysica“
  is_seat BOOLEAN NOT NULL DEFAULT false,   -- sídlo farnosti
  district TEXT,
  church_name TEXT,                         -- titul kostola/kaplnky
  has_church BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (parish_id, name)
);

CREATE TABLE parish_population_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village_id UUID NOT NULL REFERENCES parish_villages(id) ON DELETE CASCADE,
  year INT NOT NULL,
  population INT,
  catholics INT,
  source TEXT,                              -- 'SODB 2021' (ŠÚ SR)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (village_id, year)
);
```

Percento sa **neukladá**, počíta sa v pohľade:

```sql
CREATE VIEW v_parish_population AS
SELECT v.parish_id, s.year,
       SUM(s.population) AS population,
       SUM(s.catholics)  AS catholics,
       ROUND(100.0 * SUM(s.catholics) / NULLIF(SUM(s.population), 0), 2) AS catholic_pct
FROM parish_villages v
JOIN parish_population_stats s ON s.village_id = v.id
GROUP BY v.parish_id, s.year;
```

Dáta z CSV → rok **2021**, `source = 'SODB 2021'`. **Zapisuje len diecéza** (O5); farnosť vie podať návrh (§ 3.6).

### 3.3 Bohoslužby a spovedanie – dva režimy ✅ *(aj zobrazenie na verejnej stránke ✅)*

```sql
CREATE TYPE parish_service_type AS ENUM ('mass','confession','adoration','devotion','other');
CREATE TYPE parish_season AS ENUM ('regular','summer');       -- cez rok / letný (prázdninový)
CREATE TYPE parish_occasion AS ENUM ('regular','first_friday'); -- bežné / prvopiatkový týždeň

CREATE TABLE parish_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  season parish_season NOT NULL DEFAULT 'regular',
  valid_from DATE, valid_to DATE,     -- pre 'summer' napr. 1.7.–31.8. (opakuje sa každý rok)
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,                          -- „Počas prázdnin neprebieha detská sv. omša“
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (parish_id, season)
);

CREATE TABLE parish_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES parish_schedules(id) ON DELETE CASCADE,
  village_id UUID REFERENCES parish_villages(id) ON DELETE SET NULL,  -- NULL = farský kostol
  service_type parish_service_type NOT NULL DEFAULT 'mass',
  occasion parish_occasion NOT NULL DEFAULT 'regular',   -- prvopiatkové spovedanie (O12)
  day_of_week SMALLINT,          -- 0 = nedeľa … 6 = sobota
  day_label TEXT,                -- 'prikázaný sviatok', 'prvý piatok', 'prvá sobota'
  time_from TIME,
  time_to TIME,                  -- rozsah pre spovedanie/adoráciu
  relative_note TEXT,            -- '30 minút pred sv. omšou' (keď nie je pevný čas)
  note TEXT,                     -- 'detská', 'len v párny týždeň'
  sort_order INT NOT NULL DEFAULT 0,
  CHECK (day_of_week IS NOT NULL OR day_label IS NOT NULL)
);
```

Prečo dva riadky v `parish_schedules` a nie stĺpec `season` priamo na položkách: farnosť prepne celý letný režim jedným prepínačom a **letný rozvrh sa nemusí prepisovať každý rok** (platnosť 1. 7. – 31. 8. sa opakuje). `relative_note` pokrýva reálne dáta z CSV (`„30 minút pred sv. omšou“`), ktoré sa inak nedajú uložiť ako čas.

**Dve nezávislé osi** (dôležité – pôvodne som ich zamieňal):

- `parish_schedules.season` = **cez rok / letný režim** (O11) – prepína celý rozvrh.
- `parish_schedule_items.occasion` = **bežné / prvopiatkové** (O12) – týka sa hlavne spovedania, ktoré býva v prvopiatkovom týždni dlhšie a v iných časoch.

14 stĺpcov spovedania z CSV sa teda mapuje ako **7× `occasion='regular'` + 7× `occasion='first_friday'`**, všetko do rozvrhu `season='regular'`. Letný rozvrh v CSV nie je – farnosti si ho doplnia samy.

Zobrazovacie pravidlo na verejnej stránke: *ak dnešný dátum spadá do platnosti letného rozvrhu a ten je aktívny → zobraz letný, inak „cez rok“.* Vždy sa ukáže aj prepínač na druhý režim; prvopiatkové spovedanie sa zobrazí ako samostatný blok pod bežným.

### 3.4 Predpis na rok (katolíci × koeficient) ✅ *(podiel pracujúcich ⬜ § 10.1)*

Koeficient je **diecézne nastavenie na rok**, nie hodnota na farnosť:

```sql
CREATE TABLE parish_target_settings (
  year INT PRIMARY KEY,
  rate_per_catholic NUMERIC(8,4) NOT NULL,   -- 2026: 2.0000 €/katolík (O14)
  stats_year INT NOT NULL,                   -- 2026: 2021 (SODB) – štatistika sa mení len pri sčítaní (O17)
  rounding INT NOT NULL DEFAULT 1,           -- zaokrúhliť na celé €
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE parish_year_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  year INT NOT NULL,
  catholics INT,                             -- základ v momente výpočtu (snapshot)
  rate_per_catholic NUMERIC(8,4),
  calculated_amount NUMERIC(12,2),           -- catholics × rate, zaokrúhlené
  prescribed_amount NUMERIC(12,2) NOT NULL,  -- platný predpis (default = calculated, dá sa prepísať)
  override_reason TEXT,                      -- prečo sa líši od výpočtu
  visible_to_parish BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (parish_id, year)
);
```

Tok v admine: *Predpisy → rok 2026 → koeficient `2,00 €` (O14) → „Vygenerovať pre všetky farnosti“* → vznikne 83 riadkov s `calculated_amount`; admin vie jednotlivé prepísať (`prescribed_amount` + dôvod). Prepočet sa nikdy nerobí automaticky nad už vygenerovaným rokom – `catholics` aj `rate` sú uložené ako snapshot, takže spätná zmena štatistiky nezmení minulé predpisy.

Keďže štatistika sa mení len pri sčítaní (O17), predpis sa medzi rokmi zmení iba zmenou koeficientu – generovanie na ďalší rok je teda jedno číslo a jedno kliknutie.

**História:** roky 2019–2025 predpis nemajú (O4). Zobrazia sa len so skutočnosťou (vybrané, počet darcov), stĺpec „predpis“ ostane prázdny. Ak diecéza neskôr čísla dohľadá, dajú sa doplniť ručne.

### 3.5 Snapshot farnosti na dare (O2) ✅

Aby zmena farnosti darcu neprepísala históriu:

```sql
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS parish_id UUID REFERENCES parishes(id) ON DELETE SET NULL;

CREATE INDEX idx_donations_parish ON donations(parish_id);

-- POZOR: až po vyčistení 4 pseudo-farností (§ 2), inak sa zapečú do snapshotu
-- backfill z dnešného stavu (jednorazovo, 7 332 riadkov)
UPDATE donations d SET parish_id = o.parish_id
FROM donors o WHERE o.id = d.donor_id AND d.parish_id IS NULL;
```

`parish_id` treba nastaviť pri vzniku daru na **5 miestach v kóde**:

1. `app/api/admin/import-xml/route.ts:319` (import CAMT.053)
2. `lib/bank/fio-sync.ts:360` (nočný cron)
3. `app/admin/banka/actions.ts:341` (`matchTransaction`)
4. `app/admin/banka/actions.ts:609` (`bulkMatchSuggested` / hromadné párovanie)
5. `lib/mollie/process-payment.ts:393` (online dar)

Najčistejšie: **DB trigger `BEFORE INSERT ON donations`**, ktorý doplní `parish_id` z darcu, ak nie je zadaný. Jedno miesto namiesto piatich a nedá sa zabudnúť pri budúcom šiestom.

Pohľad na plnenie:

```sql
CREATE VIEW v_parish_year_summary WITH (security_invoker = true) AS
SELECT p.id AS parish_id,
       y.year,
       t.prescribed_amount,
       COUNT(DISTINCT d.donor_id)  AS donors_count,
       COUNT(d.id)                 AS donations_count,
       COALESCE(SUM(d.amount), 0)  AS collected_amount,
       ROUND(100.0 * COALESCE(SUM(d.amount),0)
             / NULLIF(t.prescribed_amount,0), 1) AS fulfillment_pct
FROM parishes p
CROSS JOIN generate_series(2019, EXTRACT(YEAR FROM now())::INT) AS y(year)
LEFT JOIN parish_year_targets t ON t.parish_id = p.id AND t.year = y.year
LEFT JOIN donations d ON d.parish_id = p.id AND d.year = y.year
GROUP BY p.id, y.year, t.prescribed_amount;

REVOKE ALL ON v_parish_year_summary FROM anon;
```

`REVOKE FROM anon` je nutné – rovnako ako pri `v_donor_summary` po migrácii 011, inak by finančná štatistika všetkých farností unikala cez anon kľúč.

### 3.6 Schvaľovanie – len chránené údaje (O5, O6) ✅ *(e-mail referentovi ⬜)*

Farnosť pracuje **priamo na živých dátach**. Cez schválenie prejde len úzky okruh polí, ktoré určujú identitu farnosti a účtovné údaje:

| Chránené – návrh → schválenie (O6) | Naživo hneď (s audit logom) |
|---|---|
| dekanát (`deanery_id`) | **bohoslužby a spovedanie** – oba režimy aj prvý piatok |
| názov farnosti (`name`, `official_name`) | **oznamy a články** |
| farský kostol / patrocínium | hody (`feast_day`), výročná poklona (`adoration_date`) |
| `ico`, `dic`, `parish_code` | foto, `intro`, GPS |
| ulica, mesto, PSČ, okres | filiálky – poradie, názov kostola |
| telefón, e-mail, www | |
| účet (`iban`) | |
| meno správcu (`administrator_name`) | |
| **personálne obsadenie** – pridať/odobrať kňaza (§ 3.8) | kontaktné údaje a foto konkrétneho kňaza |
| štatistika veriacich (O5) | |

Inými slovami: **celá karta „Úradné údaje o farnosti“ je chránená**, farnosť ju vidí len na čítanie s tlačidlom „Požiadať o zmenu“. Je to ten istý blok, ktorý drží FileMaker a ktorý slúži ako úradný register.

Praktický dôsledok: aj zmena telefónu alebo webu pôjde cez diecézu. Aby to nezdržiavalo, navrhujem vo fronte **jednoklikové „Schváliť“** priamo v zozname (bez otvárania detailu) a e-mail notifikáciu na referenta.

Zoznam chránených polí drží jedna konštanta v kóde (`PROTECTED_PARISH_FIELDS`), aby sa nerozišiel model a UI. Keď farnosť uloží formulár, server rozdelí zmeny: nechránené zapíše rovno, z chránených vyrobí návrh.

Jedna generická tabuľka pre návrhy, jedna obrazovka pre diecézu:

```sql
CREATE TYPE parish_request_status AS ENUM ('pending','approved','rejected');

CREATE TABLE parish_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,           -- 'parish' | 'population'
  entity_id UUID,                 -- NULL pri vytvorení nového
  payload JSONB NOT NULL,         -- len zmenené chránené polia { pole: nová_hodnota }
  status parish_request_status NOT NULL DEFAULT 'pending',
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT
);
```

Pri schválení server action premietne `payload` do cieľovej tabuľky a zapíše riadok do auditu:

```sql
CREATE TABLE parish_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,      -- 'submit' | 'approve' | 'reject' | 'admin_update'
  changes JSONB,             -- { pole: [staré, nové] }
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Diecéza dostane v admine badge **„Na schválenie (3)“** a diff starý → nový. Návrhov bude málo (IČO ani meno farára sa nemenia často), takže fronta nezablokuje bežnú prácu farnosti.

Audit log (`parish_change_log`, nižšie) zaznamenáva **aj nechránené zmeny** – diecéza tak vidí, kto prepísal bohoslužby alebo publikoval oznam, aj keď to nič neschvaľovalo.

### 3.7 Prístup k farnosti – admin účet stránky (O7) ✅

```sql
CREATE TYPE parish_user_role AS ENUM ('admin','editor');

CREATE TABLE parish_users (
  parish_id UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role parish_user_role NOT NULL DEFAULT 'editor',
  position TEXT,                       -- 'farár', 'kaplán', 'ekonóm', 'pastoračná asistentka'
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (parish_id, user_id)
);

-- práve jeden admin na farnosť (pri odovzdávaní správy sa rola preklopí)
CREATE UNIQUE INDEX uq_parish_admin ON parish_users(parish_id) WHERE role = 'admin';
```

**Diecéza priradí k farnosti admin účet stránky a všetky ďalšie účty tiež prideľuje diecéza** (O7) – farnosť si editorov zatiaľ nepozýva sama.

Rolu `editor` necháme v modeli pripravenú (stĺpec aj enum), ale v UI ju zatiaľ nezapíname. Keď sa ukáže, že farár potrebuje pustiť k oznamom kaplána alebo pastoračnú asistentku, zapne sa to bez migrácie – pribudne len tlačidlo „Pozvať editora“ a obmedzenia:

| | `admin` | `editor` (zatiaľ vypnuté) |
|---|---|---|
| Bohoslužby, oznamy, články | ✅ | ✅ |
| Požiadať o zmenu úradných údajov | ✅ | ❌ |
| Vidieť prehľad darov za farnosť (agregát) | ✅ | ❌ |

Join tabuľka, nie stĺpec v `user_roles`: jeden kňaz môže spravovať dve farnosti a pri preložení sa len zmaže riadok – dáta farnosti zostanú a diecéza priradí nový admin účet.

### 3.8 Kňazi vo farnosti (O18) ✅ *(od K3 z registra kňazov § 16 – verejne len meno, tituly, funkcia; `parish_clergy` je už len archív)*

Na verejnej stránke má byť kontakt na kňaza aj zoznam kňazov pôsobiacich vo farnosti. Jedno textové pole `administrator_name` na to nestačí – vo väčších farnostiach je farár, kaplán aj výpomocný duchovný.

```sql
CREATE TABLE parish_clergy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  title_before TEXT,                  -- 'Mgr.', 'ThDr.'
  title_after TEXT,                   -- 'PhD.'
  position TEXT NOT NULL,             -- 'farár', 'administrátor', 'kaplán', 'výpomocný duchovný'
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  since_date DATE,                    -- od kedy vo farnosti
  is_public BOOLEAN NOT NULL DEFAULT false,   -- súhlas so zverejnením kontaktu
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

`parishes.administrator_name` zostáva ako **úradný záznam** (chránené pole, zrkadlí FileMaker); `parish_clergy` je **prezentačný zoznam**. Pri schválení zmeny správcu sa dá ponúknuť „premietnuť aj do zoznamu kňazov“.

Delenie práv (viď § 3.6): **kto vo farnosti pôsobí = chránené** (menovanie je úkon diecézy), **telefón, e-mail a foto konkrétneho kňaza = naživo** (mení si ich sám).

GDPR: telefón a e-mail kňaza sú osobné údaje. Preto `is_public` per osoba, defaultne `false` – zverejní sa až keď kňaz klikne. Na verejnej stránke sa vždy zobrazí aspoň farský úrad (`parishes.phone`, `parishes.email`), aj keď nikto zo zoznamu nie je verejný.

---

## 4. Verejná stránka farnosti – migrácia 035 ✅ (F5) *(subdomény § 4.4 ⬜)*

### 4.1 Oznamy a články ✅

```sql
CREATE TYPE parish_post_type AS ENUM ('announcement','news');   -- oznamy / aktuality (O28)

CREATE TABLE parish_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  type parish_post_type NOT NULL DEFAULT 'announcement',
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,                     -- HTML z TipTap
  image_url TEXT,
  attachment_url TEXT,              -- naskenované oznamy v PDF
  valid_from DATE, valid_to DATE,   -- týždeň platnosti oznamov
  event_at TIMESTAMPTZ,             -- aktualita = udalosť: voliteľný dátum konania („Pripravujeme“)
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (parish_id, slug)
);
```

Znovupoužijeme `SimpleRichTextEditor` a B2 upload z modulu aktualít – nová je len väzba na farnosť a práva.

**Vkladanie z Wordu (O30):** v TipTap `editorProps.transformPastedHTML` vyčistiť Word HTML – odstrániť `<!--[if …]>`, `<o:p>`, `class="Mso…"`, všetky `style`, `<font>`, prázdne `<span>`, `lang`; ponechať len `p, h2, h3, strong, em, u, ul, ol, li, a, br, table/tr/td`. To isté pravidlo **na serveri** cez `sanitize-html` pri uložení (obsah od farností je externý vstup) a tlačidlo „Vložiť ako čistý text“ pre prípad núdze.

**Sviatosti (O27):**

```sql
CREATE TABLE sacrament_texts (           -- štandard diecézy
  type TEXT PRIMARY KEY,                 -- baptism, confirmation, marriage, anointing, funeral, confession…
  title TEXT NOT NULL, content TEXT NOT NULL, sort_order INT, updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE parish_sacrament_texts (    -- úprava farnosti prekryje štandard
  parish_id UUID REFERENCES parishes(id) ON DELETE CASCADE,
  type TEXT REFERENCES sacrament_texts(type),
  content TEXT, is_hidden BOOLEAN NOT NULL DEFAULT false, updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (parish_id, type)
);
```

Verejne: vlastný text farnosti, inak diecézny. V zóne farnosti „Upraviť pre našu farnosť“ (predvyplní diecézny text) a „Vrátiť na diecézny“.

**Motívy (O29):** `parishes.theme TEXT NOT NULL DEFAULT 'standard'` + register motívov v kóde (`lib/parish-themes/` → `{ key, label, preview, Layout }`). Stránka načíta dáta raz (jeden typ `PublicParish`) a vykreslí ich cez `Layout` zvoleného motívu – nový motív = nový priečinok, žiadna zmena DB ani dotazov. Výber motívu v zóne farnosti sa zobrazí, až keď budú aspoň dva.

### 4.2 Stránky ✅ *(+ `/galeria`, zdieľanie, videá – § 17–19)*

| URL | Obsah |
|---|---|
| `/farnosti` | Zoznam + filter podľa dekanátu a **vyhľadávanie podľa obce** (ľudia hľadajú svoju dedinu, nie názov farnosti – preto index musí obsahovať aj `parish_villages.name`) |
| `/farnosti/[slug]` | Hero foto, bohoslužby (aktuálny režim zvýraznený + prepínač na druhý), spovedanie vrátane prvopiatkového, **kňazi vo farnosti** (§ 3.8), filiálky, kontakt farského úradu, mapa, hody a výročná poklona, posledné oznamy, články, „Podporte fond“ (VS + QR cez existujúci `pay-by-square`) |
| `/farnosti/[slug]/oznamy` | Archív oznamov |
| `/farnosti/[slug]/[post-slug]` | Článok |

SEO je hlavná hodnota: dopyt „sv. omše <obec>“ je stály a farnosti bez webu na neho dnes neodpovedajú. Doplniť `sitemap`, OG obrázky a schema.org (`Church` + `Event` pre bohoslužby).

Verejné čítanie **len cez RPC / `security definer` funkciu s vybraným zoznamom stĺpcov** – nikdy `SELECT *` pre `anon` na `parishes` (obsahuje IBAN, IČO, meno správcu, internú poznámku).

### 4.3 Zodpovednosť za obsah ✅ *(„Najnovšie od farností“ so stiahnutím, stiahnutie albumov, audit)*

Oznamy a články idú na web **bez schvaľovania** (O6) – týždenné oznamy publikované v sobotu večer by inak čakali na diecézu cez víkend. Kontrola je preto následná, nie predbežná:

- prehľad „Najnovšie od farností“ v admine s možnosťou **okamžite stiahnuť** príspevok (`published = false`),
- `visible_on_web` na farnosti ako hlavný vypínač celej stránky,
- audit, kto čo publikoval (`created_by` + `parish_change_log`).

### 4.4 Vlastná subdoména farnosti – `zilina.mojkrok.sk` (O13) ⬜ (F6)

Áno, dá sa. Tri veci, ktoré na to treba:

1. **DNS** – jeden wildcard záznam `*.mojkrok.sk` (CNAME na Vercel) namiesto 83 samostatných.
2. **Doména vo Verceli** – buď wildcard doména `*.mojkrok.sk` v projekte, alebo každá subdoména pridaná zvlášť cez Vercel API (`POST /projects/{id}/domains`, dá sa naskriptovať pri založení farnosti). **Wildcard certifikát vo Verceli podľa mojich informácií vyžaduje, aby doména používala Vercel nameservery** – toto treba pred nasadením overiť priamo vo Vercel → Domains, lebo `mojkrok.sk` ešte nie je nastavená (viď P0 v `TODO.md`).
3. **Middleware** – z `request.headers.host` sa odreže subdoména, nájde sa `parishes.subdomain` a request sa presmeruje/prepíše na `/farnosti/<slug>`.

**Odporúčanie: subdoména ako 301 presmerovanie, nie samostatná verzia stránky.**

| | 301 na `/farnosti/<slug>` (odporúčam) | Rewrite – obsah žije na subdoméne |
|---|---|---|
| SEO | Všetko sa ráta jednej doméne | 83 slabých subdomén si konkuruje; Google ich hodnotí zvlášť |
| Farnosť má „svoju adresu“ do oznamov | ✅ (funguje, len sa prepne) | ✅ |
| Prihlásenie kňaza | Bez starostí – beží na apexe | Cookies zo `mojkrok.sk` sa na subdoménu neprenesú, kým sa nenastaví `domain=.mojkrok.sk` |
| Zložitosť | ~20 riadkov v middleware | Vlastný layout, canonical tagy, testovanie auth |

Ak by diecéza neskôr chcela, aby farnosť mohla nasmerovať **vlastnú doménu** (`farnostvarin.sk`), model je na to pripravený – stačí pridať `parishes.custom_domain` a doménu registrovať cez Vercel API. To je už ale plnohodnotný multi-tenant setup, nie úloha na najbližšie mesiace.

**Pozor na middleware:** dnes rieši auth pre `/admin` a `/profil`. Host-based routing doň pribudne ako prvý krok pred auth logikou, aby sa verejné subdomény nepreháňali cez kontrolu session.

---

## 5. Prístup a bezpečnosť 🟡

### 5.1 Ako sa kňaz dostane k svojej farnosti ✅

Odporúčaný tok – **pozvánka od diecézy**, nie automatické párovanie e-mailu:

1. Admin v `/admin/farnosti/[id] → Prístupy` klikne „Prideliť admin účet“, predvyplní sa `parishes.email` (dá sa prepísať na akúkoľvek adresu – O7).
2. Systém pošle Supabase invite → vznikne `auth.users`, riadok v `parish_users` (`role = 'admin'`, `invited_at`) a rola `farnost` v `user_roles`.
3. Kňaz si nastaví heslo, `accepted_at` sa vyplní, `/auth/post-login` ho pošle na `/moja-farnost`.

Ďalšie účty k tej istej farnosti prideľuje rovnakým postupom **diecéza** (O7).

Prečo nie „kto sa prihlási farskou adresou, dostane farnosť“: e-maily sa v CSV opakujú (`makov@fara.sk` aj `makov@dcza.sk`), veľa farností má gmail a kto by si zaregistroval adresu na doméne `fara.sk`, dostal by cudzie dáta.

### 5.2 Roly a oprávnenia ✅ *(obrazovky pre `view_parishes` ⬜)*

| ID | Význam | Komu |
|---|---|---|
| `manage_parishes` | správa farností, filiálok, štatistiky, predpisov, schvaľovanie návrhov | `administrator`, `zamestnanec` |
| `view_parishes` | čítanie prehľadu farností a plnenia | `kuria`, `kontrolor` |
| *(bez permission)* | vlastná farnosť | rola `farnost` + riadok v `parish_users` |

V `src/lib/auth.ts` pribudne `requireParishAccess(parishId)` – overí `parish_users` service-role klientom (rovnaký vzor ako `getUserAccess`).

### 5.3 RLS ✅

```sql
CREATE OR REPLACE FUNCTION is_parish_member(p_parish UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM parish_users WHERE parish_id = p_parish AND user_id = auth.uid());
$$;
```

Policy pre `parish_*` tabuľky: `is_app_admin() OR is_parish_member(parish_id)`.
`SET search_path` je povinné podľa hardeningu z migrácie 012.

### 5.4 GDPR ✅ *(mená darcov skryté, kňazi bez kontaktov, zásady OÚ a podmienky doplnené)*

- **Kňaz nevidí mená darcov** (O3) – zóna farnosti pracuje výhradne s agregátmi z `v_parish_year_summary`. Menný zoznam zostáva za oprávnením `view_donors`, ktoré farnosť nedostane.
- **Sumy sa nemaskujú** (O15) – farnosť vidí reálny počet darcov aj reálnu sumu, aj keď je darca jeden. Rozhodnutie v prospech transparentnosti; keďže mená sa nezobrazujú (O3), farár sa z čísla nedozvie, kto to je, iba ak by mal jediného darcu a vedel o ňom.
- **Kňazi**: telefón a e-mail sa zverejňujú len so súhlasom (`parish_clergy.is_public`, default `false`) – § 3.8.
- Verejná stránka farnosti znamená, že web spracúva obsah od tretích strán → doplniť do zásad ochrany OÚ a podmienok používania.

---

## 6. Obrazovky 🟡

### 6.1 Admin diecézy – `/admin/farnosti` ✅ *(záložky Oznamy, Galéria, E-zvonček, Návštevnosť ✅; doplnkové filtre a graf ⬜)*

Presun z `/admin/nastavenia/farnosti` do hlavnej navigácie (ako pri výzvach).

- **Zoznam**: názov, dekanát, kód, filiálky, katolíci, darcovia, predpis vs. vybrané (progress bar), posledná aktualizácia. Filtre: dekanát, okres, „neaktualizované > 12 mes.“, „bez prístupu“, „čaká na schválenie“.
- **Detail so záložkami** (vzor `/admin/projekty/[id]`):
  1. **Základné** – kontakty, IČO/DIČ, IBAN, patrocínium, GPS, foto, `visible_on_web`
  2. **Filiálky a štatistika** – obce, čísla po rokoch, súčet + %
  3. **Bohoslužby** – rozvrh „cez rok“ a „letný“, mriežka po dňoch
  4. **Predpis a plnenie** – predpis na rok, história 2019→ (predpis, vybrané, %, darcovia), graf
  5. **Kňazi** – personálne obsadenie (§ 3.8)
  6. **Darcovia** – agregát + menný zoznam (len `view_donors`)
  7. **Oznamy a články** – čo farnosť publikovala, stiahnutie z webu
  8. **Prístupy** – prideliť/odobrať účet
  9. **História zmien** – `parish_change_log`
- **Predpisy na rok** (samostatná obrazovka): koeficient, „Vygenerovať pre všetky farnosti“, ručné úpravy, export XLSX.
- **Na schválenie**: fronta návrhov zo všetkých farností s diffom.

### 6.2 Zóna farnosti – `/moja-farnost` ✅ *(materiály ⬜)*

**Mimo `/admin`**, vlastný jednoduchý layout. Middleware vyžaduje riadok v `parish_users`.

- **Prehľad**: „Váš predpis na rok 2026: X €, vybrané Y € (Z %)“, počet darcov z farnosti, graf histórie. **Bez mien.**
- **Úradné údaje** – celá karta (dekanát, názov, farský kostol, IČO, DIČ, adresa, telefón, e-mail, účet, www) len na čítanie + tlačidlo **„Požiadať o zmenu“**. Kód farnosti a dekanát mení výhradne diecéza.
- **Prezentácia** – foto, `intro`, hody, výročná poklona: ukladá sa **hneď**.
- **Bohoslužby** – editor rozvrhu „cez rok“ + „letný režim“, spovedanie vrátane prvopiatkového. **Ukladá sa priamo**, bez schvaľovania.
- **Štatistika veriacich** – zobraziť + tlačidlo „Navrhnúť opravu“ (mení ju len diecéza – O5).
- **Kňazi** – ~~vlastný kontakt a foto si kňaz mení sám~~ len na čítanie z registra kňazov (O48); zmeny robí diecéza v `/admin/knazi`.
- **Oznamy a články** – TipTap editor, publikovanie **hneď na web**.
- **Materiály** – letáky, QR kód a VS pre výzvy (existujúci `pay-by-square`).

Pri chránených poliach a štatistike je vidieť stav návrhu: `Čaká na schválenie` / `Schválené` / `Zamietnuté + dôvod`.

### 6.3 Výber farnosti v profile darcu – chýbajúci článok reťazca ✅

Pri kontrole kódu vyšlo najavo, že **darca si dnes farnosť prakticky nevie nastaviť**. Celý modul predpisu a plnenia pritom stojí na `donors.parish_id`, takže bez opravy budú čísla za farnosti zamrznuté na stave z importu FileMakeru.

Stav k 2026-09-28:

| Miesto | Stav |
|---|---|
| `registracia/RegistrationForm.tsx` | **Žiadne pole na farnosť ani projekt.** `registracia/actions.ts` pritom zoznam farností aj projektov načítava (`getRegistrationOptions`) – dáta sa stiahnu a zahodia. |
| `profil` – editačný formulár (`ProfileContent.tsx`) | Polia: meno, priezvisko, telefón, ulica, mesto, PSČ. **Farnosť tam nie je**, zobrazuje sa len ako text („Všeobecná“). |
| `updateProfile()` (`profil/actions.ts`) | Zapisuje 6 polí, `parish_id` medzi nimi **nie je** – aj keby sa select do formulára pridal, hodnota by sa zahodila. |
| `ProfileCompletionModal.tsx` | Select na farnosť **má** a `completeProfile()` ho aj uloží – lenže modál sa zobrazí len pri podmienke `!phone && !city && !parish_id`. Stačí vyplniť telefón alebo mesto a **farnosť sa už nedá nastaviť nikdy**. |

Dôsledok: kto sa dnes zaregistruje, skončí bez farnosti (19 darcov z 397 ju už nemá) a nikdy sa nezapočíta do plnenia svojej farnosti.

**Oprava (~0,5 dňa, nezávislá od zvyšku modulu):**

1. `RegistrationForm` – doplniť **povinný** select „Moja farnosť“ a „Podporujem projekt“ (O20); options sa už načítavajú.
2. `updateProfile()` – pridať `parish_id` a obsluhu `donor_projects` (rovnako ako to už robí `completeProfile`).
3. `ProfileContent` – tie isté dva selecty do editačného formulára.
4. `/profil/vitajte` – onboarding brána pre každého bez `parish_id` (viď nižšie), napojená na `/auth/post-login`.

#### Ako to prejde cez registráciu (dôležitý detail)

Serverová akcia `registerDonor` už v kóde **neexistuje** – registrácia beží klientsky cez `supabase.auth.signUp` a riadok v `donors` vzniká až lenivo, pri prvej návšteve profilu, vo funkcii `getCurrentDonor()`. Preto:

- **E-mailová registrácia:** `parish_id` a `project_id` sa pribalia do `options.data` (user metadata), rovnako ako dnes `first_name`. `getCurrentDonor()` ich pri zakladaní darcu prepíše do `donors.parish_id` a `donor_projects`.
  **Metadata prichádzajú od klienta**, takže pred zápisom treba overiť, že také `parish_id` naozaj existuje v `parishes` – inak si tam ktokoľvek zapíše čokoľvek.
- **Google registrácia:** tá **nemá žiadny formulár** – používateľ klikne na tlačidlo a odíde na Google, takže si pri registrácii nevyberie nič. Riešenie: **presmerovať ho na výber hneď po návrate.**

#### Onboarding krok po prihlásení (rieši Google aj všetkých ostatných)

Miesto na to už existuje: **`/auth/post-login`** (route handler), cez ktorý prechádza e-mailové prihlásenie aj OAuth callback. Stačí doň pridať vetvu:

```ts
const { isAdmin, roles } = await getUserAccess(user.id)
if (isAdmin || roles.length > 0) → /admin     (alebo /moja-farnost pri role 'farnost')

// darca:
const donor = await getCurrentDonor()          // profil sa tu aj založí, ak ešte nie je
if (!donor?.parish_id) → /profil/vitajte?to=…  // jednoduchá stránka: farnosť + projekt
else                   → /profil
```

Nová stránka `/profil/vitajte` je krátky formulár s dvoma selectmi a tlačidlom „Pokračovať“. Výhody oproti modálu: je to skutočná brána (nedá sa zavrieť krížikom), funguje rovnako pre Google aj e-mail, a zachytí aj starých darcov z FileMakeru, ktorí farnosť nemajú.

**Dva detaily, na ktoré pri tom treba myslieť:**

1. Parameter `to` sa v `post-login` vyhodnocuje **pred** kontrolou role – vracia sa na požadovanú cestu hneď. Onboarding kontrola musí ísť **pred** tým, inak sa dá obísť odkazom `?to=/profil`. Pôvodné `to` sa nesie ďalej a použije až po dokončení výberu.
2. `post-login` dnes posiela **každého s rolou na `/admin`**. Pre rolu `farnost` (§ 5.1) tam treba pridať vetvu na `/moja-farnost`, inak kňaz skončí v admin zóne.

`ProfileCompletionModal` potom môže zostať ako je (doplnenie telefónu a adresy) – farnosť z neho prevezme onboarding stránka.

Keďže časť darcov podporuje projekt namiesto farnosti (O19), select farnosti potrebuje explicitnú možnosť **„Nepatrím do žiadnej farnosti / podporujem projekt“** – inak tých ľudí registrácia zablokuje. Povinné je teda vybrať si, nie vybrať farnosť.

**Táto oprava je predpokladom pre fázu F3** – bez nej sa predpis počíta nad dátami, ktoré darca nevie aktualizovať.

### 6.4 Zmena e-mailu darcu (O21) ✅

Dnes je celý profil postavený na e-maile a zmena adresy v Supabase Auth by narobila škodu:

| Miesto | Čo sa stane po zmene e-mailu |
|---|---|
| `getCurrentDonor()` – `ilike('email', userEmail)` | Darcu nenájde → spadne do vetvy „darca neexistuje“ a **založí druhý profil s novým VS**. História darov zmizne z dohľadu. |
| `getCurrentDonor()` – finálny `.eq('email', userEmail)` | Načíta ten nový, prázdny profil. |
| `updateProfile()` – `.eq('email', user.email)` | Neaktualizuje nič (alebo ten nesprávny riadok). |

Pôvodný riadok pritom stále má `auth_user_id = user.id`, takže RLS ho prepúšťa – používateľ by mal dva „svoje“ profily.

**Oprava – poradie hľadania darcu:**

1. `auth_user_id = user.id` → nájdené? použi tento riadok. Ak sa `donors.email` líši od aktuálneho auth e-mailu, **zosynchronizuj ho**.
2. inak `email = user.email` → toto je prvé prepojenie starého darcu z FileMakeru; doplň `auth_user_id`.
3. inak založ nového darcu.

`updateProfile()` prepnúť na `.eq('auth_user_id', user.id)`. Tým sa zároveň zavrie možnosť vzniku duplicitných profilov.

Pri tejto úprave stojí za zmienku, že `getCurrentDonor()` si generuje variabilný symbol rovnakým spôsobom ako `generateNextVS` (načíta všetky VS a hľadá maximum v JS) – čiže **tá istá race condition, ktorá je v `TODO.md` ako P1**. Dve súbežné prvé prihlásenia dostanú rovnaký VS. Ak sa bude tento súbor aj tak upravovať, oplatí sa to vyriešiť naraz (DB sekvencia alebo RPC).

---

## 7. Import dát ✅

Skript `scripts/import-parishes.ts`, dry-run ako default (vzor: XML import):

1. `data/farnosti2.csv` → normalizácia (trim, `xxx`/prázdne → NULL, číslo účtu → IBAN kde sa dá).
2. **Mapovanie dekanátov** (`Tka → Turzovka`, `PB → Považská Bystrica`, `KNM → Kysucké Nové Mesto`, `Krásno → Krásno nad Kysucou`) → doplniť `deanery_id` všetkým 83.
3. **Párovanie na existujúce farnosti** podľa normalizovaného názvu (bez diakritiky, lowercase, **odstránená predpona „Farnosť “** – v DB je `Farnosť Rajec`, v CSV `Rajec`). Report `zhoda / nová / nepriradená`; nezhody ručne cez mapovací JSON – nikdy fuzzy automaticky.
3b. **Vyriešiť 4 pseudo-farnosti** (`Lectio divina`, `Dve percenta`, `Charita`, `Rodinkovo`) postupom zo sekcie 2 – darcovia idú na „bez farnosti“, ich voľba do `donor_projects` a `donations.project_id`. Musí byť hotové **pred** generovaním predpisov aj pred backfillom `donations.parish_id`.
4. Filiálky → `parish_villages` + `parish_population_stats` (rok 2021). Posunuté riadky (Trnové) vyriešiť ručne pred ostrým behom.
5. Spovedanie z 14 stĺpcov → `parish_schedule_items` (`service_type = 'confession'`, `season = 'regular'`): prvých 7 = `occasion = 'regular'`, druhých 7 = `occasion = 'first_friday'` (O12). Hodnoty typu „30 minút pred sv. omšou“ idú do `relative_note`, časové rozsahy (`17.00-17.30hod`) do `time_from`/`time_to`.
5b. Stĺpec 6 → `feast_day` (hody), stĺpec 14 → `adoration_date` (výročná celodenná poklona).
6. Testovacie a prázdne riadky vynechať; duchovné správy ako `kind = 'chaplaincy'`.
7. Výstup `import-report.csv` na kontrolu.
8. Vygenerovať `slug` pre všetky farnosti (`lib/slug.ts`).

---

## 8. Fázovanie

| Fáza | Obsah | Odhad |
|---|---|---|
| **F0** ✅ | CSV `data/farnosti2.csv` + schematizmus dcza.sk (`scripts/fetch-schematizmus.ts` → `data/schematizmus.json`), dry-run `scripts/import-parishes.ts` | 0,5–1 deň |
| **F1** ✅ | Migrácia **034** (tabuľky, RLS, pohľady, `donations.parish_id` + trigger), import `--apply`: 123 záznamov (114 farností + 9 duchovných správ), 208 obcí, 232 kňazov, pseudo-farnosti zrušené, 9 796 darov so snapshotom farnosti | 2 dni |
| **F1b** ✅ | **Výber farnosti a projektu v registrácii a profile** (§ 6.3) + **oprava hľadania darcu cez `auth_user_id`** (§ 6.4) + **VS zo sekvencie** (O23) – hotové 2026-09-30: migrácie 032 (`next_donor_variable_symbol`), 033 (`donors.onboarding_completed_at`), `/profil/vitajte`, `lib/parishes/choices.ts`, `lib/donors/vs.ts` | 0,5–1 deň |
| **F2** ✅ | Admin `/admin/farnosti` – zoznam (filtre dekanát / typ / chýbajúce údaje) + detail so záložkami Základné údaje, Obce a štatistika, Bohoslužby (cez rok / letný), Kňazi, Dary a história; oprávnenie `manage_parishes`; `/admin/nastavenia/farnosti` presmeruje | 2–3 dni |
| **F3** ✅ | `/admin/farnosti/predpisy`: nastavenie roka (koeficient, rok štatistiky, zaokrúhlenie), „Vygenerovať chýbajúce“ / „Prepočítať neupravené“, ručná úprava s povinným dôvodom (audit), plnenie v zozname aj detaile, export XLSX. Pri 2 €/katolík = 110 farností, ≈ 931 000 € (4 bez štatistiky) | 1–2 dni |
| **F4** ✅ | `/moja-farnost` (prehľad plnenia bez mien, bohoslužby a prezentácia naživo, úradné údaje a štatistika len návrhom, vlastný kontakt kňaza), admin záložka „Prístupy a návrhy“ (pridelenie existujúcemu účtu alebo pozvánka Supabase), fronta `/admin/farnosti/schvalovanie` so schválením / zamietnutím s dôvodom, audit; post-login posiela účet farnosti na `/moja-farnost`. Chránené polia: `lib/parishes/fields.ts` | 3–4 dni |
| **F5** ✅ | Migrácie **035–039** + verejné `/farnosti` a `/farnosti/[slug]` + oznamy a aktuality + sviatosti + SEO (podklad § 11); potom e-zvonček (041), galéria (044–045), zdieľanie, videá (046) | hotové 2026-10 |
| **F6** ⬜ | Subdomény `<farnost>.mojkrok.sk` (wildcard DNS + middleware + 301) | 0,5 dňa *(až po sprevádzkovaní `mojkrok.sk`)* |

### 8.1 Pilot – ktoré farnosti osloviť najskôr (O16) ⬜

Podľa darov za roky 2025–2026 sú najaktívnejšie farnosti tieto (počet darcov / suma 2025 / suma 2026):

| Farnosť | Darcov | 2025 | 2026 |
|---|---:|---:|---:|
| Rajec | 17 | 1 412 € | 1 155 € |
| Žilina-Vlčince | 15 | 1 570 € | 1 266 € |
| Žilina-Mesto | 12 | 1 528 € | 1 263 € |
| Dobrého pastiera (Žilina-Solinky) | 9 | 1 080 € | 886 € |
| Bytča | 7 | 1 220 € | 1 095 € |
| Kysucké Nové Mesto – sv. Jakuba | 6 | 900 € | 711 € |
| Martin | 6 | 733 € | 514 € |
| Nová Dubnica | 6 | 440 € | 251 € |

Prvých 5–8 z tohto zoznamu je dobrý pilot: farnosti už s fondom spolupracujú, takže prístup do zóny je pre ne odmena, nie ďalšia povinnosť. Zároveň pokrývajú mesto aj menšie farnosti a štyri rôzne dekanáty.

**Vzťah k launchu (august 2026):** stále platí, že v `TODO.md` sú otvorené P0 body (doména `mojkrok.sk`, E2E test prihlásenia darcu, privátny bucket pre grantové prílohy, spustenie migrácie 025). F0+F1 sa dajú spraviť hneď – nič nerozbijú a dáta sa pri nich neznehodnotia. F2–F5 až po zavretí P0.

Ak by mala byť skratka pre farnosti čo najskôr, poradie **F0 → F1 → F5 → F2** dá farnostiam viditeľný úžitok (vlastnú stránku) skôr než diecéze administratívu. Riziko: bez F4 nemá kto obsah napĺňať okrem admina.

---

### 8.2 Výsledok importu (2026-09-30) ✅

- **Hlavný zdroj = schematizmus dcza.sk** (oficiálny zoznam 123 záznamov, kontakty, PSČ, kňazi, výročná poklona); CSV dopĺňa IČO, DIČ, účet → IBAN, kód farnosti, okres, obce so SODB 2021, spovedanie.
- Existujúce názvy farností v DB sa nemenili (darcovia ich poznajú); oficiálny názov je v `official_name`.
- Opravy CSV: obce pod Trnovým patria Turanom; „1600“ pri Považskom Podhradí vynechané; Makov zlúčený (IČO 31926835, druhé IČO v poznámke); sv. Barbora zlúčená (obe IČO v poznámke, IČO prázdne – **overiť**).
- Mimo oficiálneho zoznamu sa neimportovalo: DS Nimnica, DS NsP PB, DS ZŠ s MŠ A. Bernoláka, Pustovňa bratov františkánov.
- Mestské farnosti bez čísel v CSV → súhrn obyvatelia/katolíci zo schematizmu (`source = 'schematizmus dcza.sk'`).
- **Bez štatistiky (doplniť ručne):** Dolný Moštenec, Hvozdnica, Jasenové, Žilina-Bánová. Bez IČO: Rosina, Hvozdnica, 4 duchovné správy.
- Pseudo-farnosti: Lectio divina (127 darov → projekt), Dve percentá (15 darov → projekt), Charita (len `donor_projects`, O22), Rodinkovo (bez projektu) – zmazané, 11 darcov je „bez farnosti“.
- Bezpečnosť: `parishes` pre anon/authenticated len bezpečné stĺpce (column GRANT) – predtým `SELECT *` pre každého.

## 9. Zostávajúce otázky – ~~všetky zodpovedané~~ (O23–O25) ✅

| # | Otázka | Návrh |
|---|---|---|
*(Prečíslované – predchádzajúce kolá otázok sú zodpovedané v sekcii 0.)*

| ~~**Q1**~~ | ~~Má sa pri oprave § 6.4 vyriešiť aj **race condition vo variabilnom symbole** (`TODO.md` P1), keď sa ten súbor aj tak mení?~~ | ✅ O23 |
| ~~**Q3**~~ | ~~Koeficient **2 €/katolík** – platí rovnako pre všetky farnosti, alebo majú mestské/vidiecke inú sadzbu?~~ | ✅ O24 |
| ~~**Q4**~~ | ~~Má byť predpis a plnenie **viditeľné aj pre ostatné farnosti** (rebríček), alebo každá vidí len seba?~~ | ✅ O25 |

---

## 10. Na ďalšie pokračovanie (poznámky 2026-09-30)

### 10.1 Predpis – podiel pracujúcich katolíkov ⬜ (doladiť)

Dnes: predpis = **všetci katolíci × 2 € ročne** (≈ 931 000 € za diecézu, napr. Rajec 13 272 €). Treba doladiť, aby sa predpis počítal len z **pracujúcich / zárobkovo činných** katolíkov:

- nový parameter v nastavení roka: **% pracujúcich** (napr. 45 %) → predpis = katolíci × % pracujúcich × koeficient,
- rozhodnúť: jedno % pre celú diecézu, alebo podľa okresu / farnosti (zdroj: ŠÚ SR – ekonomicky aktívne obyvateľstvo, SODB 2021),
- po zmene: „Prepočítať neupravené“ pre rok 2026 (ručne upravené predpisy ostanú),
- zobraziť v predpise aj medzivýpočet (katolíci → pracujúci → predpis), v exporte XLSX tiež.

Technicky: `parish_target_settings.working_share NUMERIC(5,4)` (+ príp. `parish_year_targets.working_share` ako snapshot) – migrácia pri doladení.

### 10.2 F5 – verejné stránky farností: podklad `web_parochia` ✅ analyzované → § 11, F5 realizovaná ✅

Pozastavený projekt **https://github.com/dusanpecko/web_parochia** (vetva `main`, prístup overený, zatiaľ nestiahnutý) poslúži ako pomôcka pre tvorbu stránok farností v Kroku:

1. stiahnuť a zanalyzovať: dátový model, šablóny stránky farnosti, bohoslužby, oznamy/články, editor obsahu, čo sa dá prevziať,
2. zosúladiť s modelom Kroku (§ 3.3 bohoslužby, § 3.8 kňazi, § 4.1 `parish_posts`, § 4.2 URL `/farnosti/[slug]`),
3. navrhnúť, čo prevziať (komponenty, rozloženie, typy obsahu) a čo spraviť nanovo – doplniť do § 4 a naplánovať migráciu **035_parish_pages**.

### 10.3 Testovanie F1b–F4 (pred pushom) ✅ *(používateľ 2026-10-01: zatiaľ všetko funguje)*

Používateľ najprv sám otestuje a doladí, potom push a test Juliou. Na test: registrácia + onboarding (aj Google), admin farností (doplniť štatistiku Dolný Moštenec, Hvozdnica, Jasenové, Bánová a chýbajúce IČO), predpisy 2026 (vygenerované 2026-09-30), zóna farnosti cez „Prihlásiť sa za farnosť“.

---

## 11. Podklad `web_parochia` – čo prevziať pre farské stránky (na diskusiu, 2026-10-01)

Repo `github.com/dusanpecko/web_parochia` (Parochia.one) má jeden commit (20. 2. 2026). Je to pnpm/turbo monorepo, reálna je len aplikácia `apps/web`: Next 16, Tailwind 4, shadcn/ui, Supabase, editor Plate, súbory na B2. Mobilná aplikácia je len „hello world“. Robí multi-tenant (subdoména / vlastná doména → `/sites/[domain]`) a farnosť má vlastný dashboard aj page builder.

**Hlavný záver:** prevziať **štruktúru verejnej stránky, niekoľko komponentov ako vzor a dátové nápady**. Neprevziať dátový model, multi-tenant vrstvu, editor ani page builder – model Kroku (034) je pre naše účely lepší a bezpečnejší.

### 11.1 Čo funguje vs. čo je rozpracované

| Funkčné | Rozpracované / stub / chýba |
|---|---|
| Rozvrh omší + úradné hodiny + spoveď | Page builder (~10 %, časť sekcií vypisuje surový JSON) |
| Oznamy a aktuality (`posts`), archív, detail | Liturgický kalendár – natvrdo mock dáta |
| Sviatosti s FAQ a CTA (`/sviatosti/[type]`) | SEO: žiadne `generateMetadata`, sitemap ani schema.org |
| Udalosti s RRULE + export ICS | Mapa, PDF oznamy, sviatky farnosti, úmysly sv. omší |
| Téma (farby, fonty), upload obrázkov | i18n verejných stránok (preklady sa ukladajú, nezobrazujú) |
| Adorácie, modlitbová stena, rezervácie, newsletter | Testy, rate limiting, CSP, audit log |

### 11.2 Návrh – ÁNO (prevziať ako vzor, prepísať do Kroku)

| # | Čo | Ako u nás | Môj názor |
|---|---|---|---|
| A1 | **Rozloženie verejnej stránky**: hero → najnovší oznam → bohoslužby (omše + kancelária + spoveď) → aktuality → kontakt/pätička | `/farnosti/[slug]` ako server komponent, bez framer-motion, v dizajne Kroku | ✅ jednoznačne · **realizované ✅** |
| A2 | **`ScheduleSection`** – omše zoskupené podľa dňa, bočný panel kancelária + spoveď | Prepísať nad `parish_schedule_items`: aktuálny režim (bežný/letný) zvýraznený, prepínač, samostatný blok „prvý piatok“ | ✅ · **realizované ✅** |
| A3 | **Karta „najnovší oznam“ + archív oznamov** | `parish_posts` (§ 4.1) – už máme `valid_from/valid_to` a PDF prílohu, ktoré tam chýbajú | ✅ · **realizované ✅** |
| A4 | **Plávajúce tlačidlo „Časy omší“** na mobile | Malý client komponent na `/farnosti/[slug]` | ✅ lacné, užitočné · **realizované ✅** (mobilná lišta) |
| A5 | **Sekcia „Podporte“ (IBAN + QR)** | Máme `pay-by-square` a VS – na stránke farnosti odkaz „Podporte Pastoračný fond za farnosť X“ (predvyplnená farnosť pri registrácii) | ✅ – priamo napĺňa cieľ Kroku · **realizované ✅** (+ e-zvonček) |
| A6 | **ICS kalendár** (`lib/calendar.ts`) | `/farnosti/[slug]/calendar.ics` – bohoslužby týždňa (+ neskôr udalosti); doplniť TZID, escapovanie, zalamovanie riadkov | 🟡 až po F5, nice-to-have · ⬜ nerealizované |
| A7 | **Sviatosti per farnosť** („Krst / Sobáš / Pohreb – čo treba vybaviť“, FAQ) | Buď pevné texty diecézy + farský doplnok, alebo pole v `parish_posts` typu `page` | 🤔 na diskusiu – veľmi hľadaný obsah, ale pridá prácu kňazom · **realizované ✅** (O27 – diecézny text + úprava farnosti) |
| A8 | **Udalosti** (`events`: začiatok/koniec, miesto, RRULE, odkaz na článok) | Samostatná tabuľka `parish_events` alebo článok s dátumom | 🤔 na diskusiu – zatiaľ by stačili oznamy · **realizované ✅** (O28 – aktualita s dátumom → „Pripravujeme“) |
| A9 | **História kňazov** (pôsobí od–do, svätenie, foto) | Rozšíriť `parish_clergy` o `active_from/active_to` + foto (foto už je v checkliste) | 🟡 foto áno, dátumy svätenia nie sú nutné · **realizované ✅** cez register kňazov (pôsobenia od–do, § 16); foto zámerne nie (O47) |
| A10 | **„Nepublikovaná farnosť“** (údržbový režim) | Už máme `visible_on_web` – stačí náhľad pre prihlásenú farnosť | ✅ (len využiť existujúce) · **realizované ✅** (náhľad + základná stránka, O43) |

### 11.3 Návrh – NIE

| Čo | Prečo nie |
|---|---|
| Multi-tenant middleware (rewrite na `/sites/[domain]`, 1–2 DB dotazy pri **každom** requeste) | Pre Krok stačí `/farnosti/[slug]` + voliteľný 301 zo subdomény (§ 4.4) |
| Page builder + AI builder | Nedokončený, generický fallback, XSS riziko; farnosti potrebujú vyplniť formulár, nie skladať stránku |
| Editor Plate + Plate JSON (`PostEditor`, `PlateContentRenderer`) | Krok má TipTap HTML (`SimpleRichTextEditor`) – nekompatibilné |
| Tabuľka `masses` + druhý model `parish_schedules` | Náš model (režimy, prvý piatok, položky) je lepší |
| `profiles.parish_id` + jedna rola, RLS cez `belongs_to_parish()` | Koliduje s `parish_users` (M:N, admin/editor) a so schvaľovaním návrhov |
| Téma per farnosť (vlastné farby, fonty, logo) | Jednotný vizuál Kroku = dôvera + menej práce; nanajvýš vlastná titulná fotka |
| Rezervácie, adorácie, modlitbová stena, newsletter, formuláre, CRM, AI, Stripe | Mimo rozsahu fondu; každé je samostatný produkt s GDPR záťažou |
| Liturgický kalendár | Je to mock; ak niekedy, tak nanovo nad reálnym zdrojom (breviar.sk / KBS) s cache |
| Viacjazyčnosť farských stránok | Nie je potrebná |

### 11.4 Čo tam nie je a musíme postaviť sami

- **SEO** – `generateMetadata`, `app/sitemap.ts`, OG obrázok, JSON-LD `CatholicChurch` (adresa, geo, telefón) + `Event` pre bohoslužby. Toto je hlavná hodnota F5 (dopyt „sv. omše <obec>“).
- **Vyhľadávanie podľa obce** na `/farnosti` (cez `parish_villages`).
- **Mapa** – Leaflet/OSM podľa GPS farnosti (GPS už máme v prezentácii).
- **Hody a výročná poklona** – údaje už máme v `parishes`, len ich zobraziť.
- **PDF oznamy** – upload na B2 (ako „Na stiahnutie“), na stránke náhľad + stiahnutie.
- **Sanitizácia HTML** – dnes Krok renderuje TipTap HTML cez `dangerouslySetInnerHTML` bez čistenia (aktuality, výzvy). Kým píše len kancelária, je to v poriadku; obsah od **farností** je externý vstup → pred F5 pridať `sanitize-html` (pri ukladaní aj pri renderi).
- **Výber stĺpcov** vo verejných dotazoch (žiadne `select('*')`) – u nás už vynútené column GRANT-om z 034.

### 11.5 Poučenie z bezpečnostných chýb `web_parochia`

Ak sa projekt niekedy obnoví alebo je repo verejné, treba vedieť:

- RLS „Active parishes are viewable by everyone“ + `select('*')` → verejne čitateľné **`smtp_password` (plaintext)** a `maintenance_password`. To je presne chyba, ktorú sme v Kroku opravili v 034 (column GRANT).
- `lib/crypto.ts` má záložný kľúč `'default-insecure-password-change-me'` a statický salt.
- Sekcia `rich_text` – `dangerouslySetInnerHTML` bez sanitizácie (XSS).
- Rezervácie – verejný SELECT môže vystaviť osobné údaje.
- Schema drift (`parish_menus` chýba v migráciách, duplicitné čísla migrácií).

### 11.6 Otázky na rozhodnutie – ✅ rozhodnuté 2026-10-01 (O26–O31)

| # | Otázka | Rozhodnutie |
|---|---|---|
| W1 | Rozsah F5 | ✅ ako navrhnuté – O26 |
| W2 | Sviatosti | ✅ spoločný text diecézy ako štandard, farnosť si ho môže upraviť – O27 |
| W3 | Udalosti | ✅ oznamy + aktuality; udalosť = aktualita – O28 |
| W4 | Vlastný vzhľad | ✅ zatiaľ jeden motív, architektúra pripravená na ďalšie – O29 |
| W5 | Oznamy | ✅ text kopírovaný z Wordu s čistením balastu – O30 |
| W6 | Podpora zo stránky | ✅ „Podporujem fond“ (predvyplnená farnosť) + „Podporujem farnosť“ (e-pokladnička) – O31, § 12 |

---

## 12. E-zvonček farnosti (e-pokladnička, O31–O37) – ✅ realizované (migrácia 041, otestované 2026-10-06)

**Predstava:** na stránke farnosti sú dve tlačidlá.

1. **„Podporujem Pastoračný fond“** → `/registracia?farnost=<slug>` – farnosť je predvyplnená (darca ju vidí a môže zmeniť). Dar ide do fondu a ráta sa farnosti do predpisu ako doteraz (O1). *Malá úprava, súčasť F5.*
2. **„Podporujem farnosť“ (e-zvonček)** → jednorazový alebo pravidelný online dar cez Mollie (karta, Apple/Google Pay, bankové tlačidlá), s možnosťou aj bez registrácie. Peniaze prijme fond a **vyzbieranú sumu pošle farnosti** na jej IBAN (z registra).

**Návrh dát:** `donations.destination` (`'fund'` | `'parish'`, predvolene `fund`) – pri `parish` je `parish_id` **cieľová farnosť** (nie farnosť darcu). Nastavenie farnosti `parish_box_settings` (`enabled`, `mollie_fee_pct`, `fund_fee_pct`, účel/text, zapnuté kým/kedy) s predvolenými hodnotami diecézy. Nová tabuľka `parish_payouts` (farnosť, mesiac, hrubá suma, poplatok Mollie, poplatok fondu, **použité percentá ako snapshot**, čistá suma, dátum odoslania, kto, poznámka) + v admine „Vyúčtovanie e-pokladničiek“: za obdobie zoznam farností s nevyplatenou sumou → export príkazov (SEPA XML / CSV) → označiť ako odoslané. V zóne farnosti: „E-pokladnička: vyzbierané / poslané / čaká“.

**Otvorené otázky:**

| # | Otázka | Môj návrh |
|---|---|---|
| ~~E1~~ | Ráta sa dar do e-pokladničky farnosti **do plnenia predpisu**? | ✅ **Nie** – O32 |
| ~~E2~~ | Ako často posielať peniaze farnosti? | ✅ **Mesačne** – O33 |
| ~~E3~~ | Poplatky Mollie (~1–2 %) | ✅ **% Mollie + % fondu, nastaviteľné pre každú farnosť** – O33 |
| ~~E4~~ | Kto je príjemca daru a vydáva potvrdenie o dare? | ✅ **Dar – kostolná zbierka** – O35 |
| ~~E5~~ | Len online, alebo aj prevodom (QR s VS farnosti)? | ✅ **Len Mollie** – O34 |
| ~~E6~~ | Pravidelný mesačný dar do e-pokladničky? | ✅ **Jednorazový aj pravidelný** – O36 |
| ~~E7~~ | Môže farnosť uviesť účel („na opravu strechy“) s cieľovou sumou? | ✅ Teraz len **e-zvonček**, účelové zbierky neskôr – O37 |
| ~~E8~~ | Musí byť farnosť zapojená (mať účet v Kroku), aby mala e-pokladničku? | ✅ Áno; fáza II = widgety pre farnosti s vlastným webom – O38 |

---

## 13. Fáza II – widgety pre farské weby mimo platformy (O38)

Farnosti, ktoré majú vlastný web (WordPress, Webnode…) a našu stránku nevyužijú, dostanú **vložiteľné moduly**:

- **„Podporte Pastoračný fond“** – tlačidlo/karta s plnením farnosti (bez mien), odkaz na registráciu s predvyplnenou farnosťou.
- **E-zvonček** – darovací formulár farnosti (Mollie), rovnaký ako na `/farnosti/[slug]`.
- Prípadne **bohoslužby** z registra (aby farnosť nemusela udržiavať dve miesta).

Technicky: `<script src="https://mojkrok.sk/embed.js" data-farnost="varin">` alebo `<iframe>` na `/embed/farnosti/<slug>/…`. Pozor na CSP `frame-ancestors`, cookies tretích strán (platba vždy v novom okne / redirect na Mollie) a vzhľad (svetlý/tmavý, farba tlačidla). Existujúci widget výziev (`/vyzvy`) je dobrý základ.

## 14. Nápad: web diecézy na platforme Krok

Pripravovaný web diecézy beží na WordPresse. Ak by sme ho neskôr presunuli k nám, pobežal by na **vlastnej doméne `dcza.sk`** (Vercel podporuje viac domén na jednom projekte; obsah by sa vyberal podľa hostu – rovnaký mechanizmus ako § 4.4). Výhoda: jeden register farností, bohoslužieb a kňazov pre diecézny web aj farské stránky; jedna správa obsahu. Zatiaľ len zapísané – **držíme sa jednotného dizajnu**, aby bol prechod možný. Rozhodnúť až po F5.

## 15. Kňazská zóna – dokumentácia diecézy pre kňazov (O39–O42, O67–O69) – ✅ realizované (migrácia 048)

**Účel:** neverejný archív, kam diecéza ukladá dokumenty pre kňazov – **obežníky, tlačivá, smernice**, prípadne dekréty, pastoračné a matričné pokyny, liturgické materiály.

- **Kto vidí (O39):** všetci kňazi s osobným účtom – aj bez farnosti (výpomoc, dôchodcovia, rehoľníci). Účet kňaza ≠ účet farnosti: účet kňaza bude priamo osoba z registra kňazov (`clergy.auth_user_id`, § 16), účty zakladá kúria pozvánkou z registra. Účty farností (`parish_users`) prístup dostanú tiež.
- **Kto pridáva (O41):** len kúria – nové oprávnenie `manage_clergy_docs`.
- **Štruktúra:** kategórie (Obežníky, Tlačivá, Smernice…), rok, číslo obežníka, dátum vydania, súbor PDF/DOCX na B2 (ako „Na stiahnutie“ – `downloads`, migrácia 020), stav **aktuálne / archív (O42)** – obežníky sú platné stále, archivovaním sa len presunú do sekcie Archív.
- **E-mail (O40):** pri zverejnení dokumentu ide e-mail všetkým kňazom (príloha alebo odkaz do zóny; odosielanie cez Brevo ako newsletter – `lib/newsletter/brevo.ts`). Žiadne potvrdzovanie prečítania.
- **Funkcie:** vyhľadávanie, filter kategória/rok, „nové“ (napr. posledných 30 dní).
- **Import (O42):** nerobí sa, dokumenty pridáva kúria ručne.
- **Kde:** `/knazska-zona`.

**Realizácia (2026-10-08, migrácia 048):**
- Tabuľky `clergy_doc_categories`, `clergy_docs` (číslo, dátum vydania, popis, voliteľný text, stav aktuálne/archív, zverejnenie, e-mail), `clergy_doc_files`; oprávnenie `manage_clergy_docs` (administrátor, zamestnanec, kúria); `clergy.zone_invited_at`.
- **Súbory** sa nahrávajú z prehliadača priamo do B2 podpísanou adresou (bez limitu 4,5 MB Vercelu, do 100 MB) a sťahujú cez `/knazska-zona/subor/[id]` až po kontrole prístupu krátkodobou podpísanou adresou (5 min). Pre skutočnú neverejnosť treba **samostatný súkromný bucket** (`B2_PRIVATE_BUCKET`) – dnešný bucket webu je verejne čitateľný; admin to zobrazuje ako upozornenie.
- **Fulltext:** pri nahratí sa vytiahne text z PDF (unpdf) a DOCX/ODT; hľadá sa v názve, čísle, popise, texte aj v obsahu súborov, bez ohľadu na diakritiku a aj podľa začiatku slova; výsledky ukazujú zvýraznené úryvky. Naskenované PDF a starý `.doc` sa nájdu len podľa názvu.
- **Zóna:** úvod (nové za 30 dní, dlaždice kategórií), kategória (aktuálne / archív, filter rokov), detail (otvoriť / stiahnuť), vyhľadávanie s filtrom kategórie; `noindex`. Po prihlásení ide kňaz rovno do zóny; v menu účtu „Kňazská zóna“.
- **Admin:** zoznam s filtrami, editor (súbory s priebehom, poradie, zverejniť / skryť / archivovať, e-mail kňazom aj opakovane), kategórie, „Kňazi a prístupy“ (stav účtu, hromadné pozvánky). E-maily `clergy_zone_invite`, `clergy_zone_granted`, `clergy_doc_published` – upraviteľné v `/admin/emaily`.

---

## 16. Schematizmus kňazov – register osôb (návrh 2026-10-07, rozhodnutia O44–O58) – 🟡 K0–K3 ✅, K4–K6 ⬜

**Cieľ:** jeden diecézny register kňazov (a ďalších osôb v duchovnej službe), ktorý nahradí Excel `KNAZI - ZOZNAM AKTUALNY.xlsx`. **Zatiaľ len v admine** (kúria). Neskôr z neho čerpajú: kňazi na stránkach farností (§ 3.8), kňazská zóna (§ 15 – účet kňaza = osoba z registra), web diecézy (§ 14 – verejný schematizmus), výročia a meniny.

### 16.1 Analýza zdrojového súboru (stav 2026-10-07)

Súbor `data/KNAZI - ZOZNAM AKTUALNY.xlsx` (mimo gitu – osobné údaje), 11 listov:

| List | Záznamov | Obsah | Návrh |
|---|---:|---|---|
| **kňazi** | **274** | hlavný zoznam, 52 stĺpcov | import – jadro registra |
| diakoni | 4 | trvalí diakoni + diakoni | import (kategória diakon) |
| bohoslovci | 563 riadkov | aktuálny ročník 2025/2026 + **historické bloky** po rokoch (hlavičky „2024/2025 ročník“…) | import len aktuálneho ročníka (otázka K2) |
| študenti | 4 | kňazi na štúdiách v zahraničí (adresa, skype, zmluva o pôsobení) | import ako stav „štúdium“ |
| odišli zo ŽD | 142 | archív – **stĺpce na mnohých riadkoch posunuté** | import do archívu s ručnou kontrolou (K1) |
| zomrelí | 50 | archív s dátumom úmrtia | import do archívu (K1) |
| dekani – časové obdobie | ~30 | dekanát, meno, od–do | import ako história funkcie „dekan“ |
| 2010 Petráš, výročia pre KN, výročia 2015 | – | ručne robené zostavy | **neimportovať** – výročia bude systém počítať sám (§ 16.5) |

**Stĺpce listu „kňazi“ a vyplnenosť (z 274):**

- Identita: meno, priezvisko (274), **osobné číslo** (172; 166 unikátnych – 6 duplicít), meniny `MM.DD.` (180).
- Služba: funkcia vo farnosti (263), iné úlohy (43), dekanát (245), farnosť (250 – **220 sa spáruje s registrom farností**, 24 bez farnosti, 19 iných miest: biskupský úrad, nemocnice, armáda/polícia, zahraničie…), adresa farnosti (psč 248, ulica 242), vo farnosti od roku (261), pôsobenie – história textom (23), v ŽD od (239), v ŽD do (1).
- Kontakty: pracovný e-mail (247, všetky `@dcza.sk`), súkromný e-mail (262; 235 iný ako pracovný), farský e-mail (17), mobil (268; 19 s viacerými číslami).
- Tituly a oslovenie: akademický titul (257 – zmes pred/za menom: `Mgr.`, `ThLic., PhD.`, `ICDr. PaedDr. - PhD.`…), cirkevný titul (42 – Mons., honorárny dekan, titulárny kanonik…), oslovenie (264 – Dp. 106, Vdp. 100, Vsdp. 34, Mons. 12, Dp. dekan 7, Dp. kanonik 3), rehoľa (50 – SDB 28, OP 5, OFMCap 4+, MS, MSSCC, SVD).
- Osobné: dátum a miesto narodenia (266/250), trvalý pobyt (255), národnosť (258), štátna príslušnosť (257).
- Sviatosti a formácia: krst dátum/miesto (235/238), birmovka (219/239), stredná škola (220), VŠ (211), teológia od–do (230), miesto štúdia teológie (238), postgraduál (49), iné vzdelanie (29), jazyky (128).
- Svätenia: diakonát dátum + svätiteľ (257/255), kňazská vysviacka dátum + svätiteľ (266/254).
- **Odvodené stĺpce – neukladať:** deň/mesiac/rok narodenia a vysviacky, vek a roky kňazstva (stĺpce „2026“), konštanty pre hromadnú poštu („Rímskokatolícka cirkev“, „Farnosť 1“).

**Zistené problémy v dátach (import ich musí ošetriť alebo nahlásiť na ručnú kontrolu):**

1. **Posunuté stĺpce** v niektorých riadkoch – dátum v „národnosti“, telefón v „cirkevnom titule“, adresa v „iných úlohách“, svätiteľ v „reholi“ (list „odišli“ je posunutý vo veľkom).
2. **Dátumy v 4–5 formátoch:** `1977-01-30`, `1.6.1990`, `16. 6. 1990`, `Tue Jan 01 2000 … GMT+0100`, len rok, len `11.`.
3. **Funkcia spojená s inou úlohou:** „farár, dekan“, „farský administrátor, sudca“, „n.o. – Korňa“, „výpomocný duchovný pri kostole … Živčáková“ → rozdeliť na pôsobenie vo farnosti + diecéznu funkciu.
4. **Dekanát nekonzistentne:** `ZA` / `Za`, `RA` / `Ra`, `BU` / `Bú`, `MT` / `Mt`, raz celým menom „Krásno“ → tabuľka `deaneries` dnes **nemá skratku**, doplniť `deaneries.code`.
5. **Tituly v jednom poli:** treba rozdeliť na *pred menom* (Mgr., ThLic., ICDr., PaedDr., doc., Ing.) a *za menom* (PhD., Th.D., M.A.).
6. **Svätitelia v rôznych tvaroch:** „J.CH. Korec“, „Ján CH.kard. Korec“, „J.CH. kard. Korec“; „Rudolf Baláž,biskup, biskup“ → číselník svätiteľov.
7. **Rehole:** „OFMCap“, „OFMCAP“, „OFMCap.“; „MSSCC“, „m.ss.cc“, „MCCSS“ → číselník.
8. **Jazyky:** „Aj, Nj“, „AJ, NJ“, „Ang.“, „Tj“, „Šj“, „Hindi, Konkani“ → zoznam kódov (en, de, it, ru, fr, es, pl…).
9. Viac telefónov v jednom poli (oddelené `;` alebo `,`), osobné číslo 6× duplicitné, 1 duplicitné meno.

**Vzťah k dnešným dátam:** z 232 kňazov v `parish_clergy` (import schematizmu dcza.sk, § 3.8) sa **183 spáruje menom** priamo; zvyšných 49 sú rehoľníci s príponou rádu v mene („Bundzel Marián SDB“) – spárujú sa po odstránení prípony. Register teda na farnosti priamo nadviaže.

### 16.2 Dátový model (migrácia 043_clergy_register)

**Osoba – `clergy`** (jeden riadok = jeden človek, aj keď neskôr odíde alebo zomrie):

```sql
CREATE TABLE clergy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_number TEXT UNIQUE,              -- osobné číslo kúrie (ak je)
  category TEXT NOT NULL,                   -- 'seminarian' | 'deacon' | 'permanent_deacon' | 'priest' | 'bishop' (mení sa výberom, O45)
  status TEXT NOT NULL DEFAULT 'active',    -- 'active' | 'retired' (n.o.) | 'studying' | 'left' | 'deceased' | 'suspended'
  seminary_entry_year SMALLINT,             -- bohoslovec: akademický rok nástupu do 1. ročníka → ročník sa počíta k 1. 9. (O45)
  seminary_year_offset SMALLINT DEFAULT 0,  -- ručná korekcia (opakovanie, prerušenie, rok praxe)
  seminary TEXT,                            -- NR, RM (Redemptoris Mater), Rím…
  origin TEXT,                              -- „Pochádza“ (verejné, O47) – rodná obec / farnosť
  slug TEXT UNIQUE,                         -- verejná URL priezvisko-meno-funkcia (O47)
  first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  title_before TEXT, title_after TEXT,      -- akademické tituly rozdelené pred/za menom
  ecclesiastical_titles TEXT[],             -- Mons., honorárny dekan, titulárny kanonik…
  salutation TEXT,                          -- Dp. | Vdp. | Vsdp. | Mons. (oslovenie v listoch)
  religious_order_id UUID REFERENCES religious_orders(id),   -- NULL = diecézny kňaz
  name_day TEXT,                            -- 'MM-DD'
  birth_date DATE, birth_place TEXT, nationality TEXT, citizenship TEXT,
  permanent_address TEXT,                   -- súkromné
  baptism_date DATE, baptism_place TEXT, confirmation_date DATE, confirmation_place TEXT,
  education_secondary TEXT, education_university TEXT,
  theology_from SMALLINT, theology_to SMALLINT, theology_place TEXT,
  postgraduate TEXT, education_other TEXT, languages TEXT[],
  diaconate_date DATE, diaconate_place TEXT, diaconate_ordainer_id UUID REFERENCES ordainers(id),
  ordination_date DATE, ordination_place TEXT, ordination_ordainer_id UUID REFERENCES ordainers(id),
  in_diocese_from DATE, in_diocese_to DATE, -- v Žilinskej diecéze od–do (inkardinácia / pôsobenie)
  death_date DATE, death_place TEXT,
  work_email TEXT, private_email TEXT, phones TEXT[],
  photo_url TEXT,                           -- interné (celebret, kúria) – verejne sa nezobrazuje (O47)
  auth_user_id UUID REFERENCES auth.users(id),     -- účet do kňazskej zóny (§ 15) – neskôr
  note TEXT,                                -- interná poznámka kúrie
  source TEXT, created_at, updated_at
);
```

**Pôsobenie a funkcie – `clergy_assignments`** (história; aktuálne = `date_to IS NULL`):

```sql
CREATE TABLE clergy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clergy_id UUID NOT NULL REFERENCES clergy(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,          -- 'parish' (farnosť/duchovná správa) | 'deanery' (dekan) | 'diocese' (kúria, súd, KR…) | 'other' (nemocnica, škola, armáda, zahraničie, rehoľa)
  role TEXT NOT NULL,          -- farár, farský administrátor, farský vikár, výpomocný duchovný, rektor kostola, špirituál, dekan, generálny vikár, súdny vikár, notár, ekonóm, člen kňazskej rady…
  parish_id UUID REFERENCES parishes(id),
  deanery_id UUID REFERENCES deaneries(id),
  organization TEXT,           -- keď to nie je farnosť ani dekanát („Univerzitná nemocnica Martin“, „5. pluk“…)
  date_from DATE, date_to DATE,
  is_primary BOOLEAN NOT NULL DEFAULT false,  -- hlavné pôsobenie (pre zoznamy a adresu)
  note TEXT
);
```

**Číselníky:** `religious_orders` (skratka, názov), `ordainers` (svätitelia – meno, funkcia), `deaneries.code` (ZA, BY, CA…). Jazyky ako kódy v poli.

**Napojenie na farnosti (§ 3.8):** `parish_clergy` dostane `clergy_id`. V prvej fáze sa len spárujú (kontakt a foto sa ďalej spravujú v `parish_clergy`); v ďalšej fáze sa zoznam kňazov na stránke farnosti bude **počítať z aktuálnych pôsobení v registri** a `parish_clergy` zanikne. Zmenu pôsobenia (menovanie) robí kúria v registri – farnosť ju už nemusí navrhovať.

**Audit:** `clergy_change_log` (kto, kedy, čo zmenil) – rovnako ako `parish_change_log`.

### 16.3 Prístup a GDPR

- Údaje o kňazoch prezrádzajú náboženské vyznanie (osobitná kategória, čl. 9 GDPR) – spracúva ich cirkev o svojich členoch, čl. 9 ods. 2 písm. d). Navyše citlivé súkromné údaje (rodné údaje, trvalý pobyt, krst, súkromné kontakty).
- **Nové oprávnenia:** `manage_clergy` (úpravy) a `view_clergy` (čítanie) – zatiaľ **len KROK a kúria** (O46). Dekani, farnosti ani samotní kňazi do registra nevidia (O48).
- RLS: žiadne verejné politiky, čítanie len cez server (service role) s overením oprávnenia – ako pri farnostiach.
- **Verejne (O47 – rovnako ako dnes dcza.sk/schematizmus):** meno s titulmi, funkcia, *Pochádza*, diakonát a kňazská vysviacka (dátum + miesto), **história pôsobenia po rokoch** (vrátane diecéznych funkcií), dekanát a farnosť ako odkazy. **Bez fotky a bez kontaktov.** Nikdy dátum narodenia, adresa, krst, súkromné údaje.
- Dôsledok O48 pre stránky farností: kontakt kňaza na stránke farnosti sa prestane zobrazovať (dnes ho kňaz vie zverejniť v zóne farnosti – § 3.8) – verejný ostáva kontakt farského úradu. Úpravu kontaktu kňaza v zóne farnosti odstrániť vo fáze K3.

### 16.4 Obrazovky v admine (`/admin/knazi`)

- **Zoznam:** hľadanie (meno, farnosť, obec), filtre kategória / stav / dekanát / funkcia / rehoľa, stĺpce meno s titulmi, funkcia, farnosť, dekanát, mobil, pracovný e-mail; počty (kňazi v službe, na odpočinku, rehoľníci…). **Každý stav má vlastnú farbu riadku/štítku** (O45) – napr. bohoslovec, diakon, kaplán/farský vikár, farár, na odpočinku, archív.
- **Bohoslovci:** aktuálny ročník sa zobrazuje vypočítaný (k 1. 9. sa zvýši sám); akcia **„Zmeniť stav“** – bohoslovec → diakon (dátum, miesto, svätiteľ) → kňaz (dátum, miesto, svätiteľ) + prvé menovanie.
- **Detail osoby – záložky:** Základné (meno, tituly, oslovenie, kategória, stav, rehoľa, foto) · Kontakty · Pôsobenie (história + „Nové menovanie“ – ukončí doterajšie a založí nové) · Funkcie (dekan, KR, súd…) · Osobné údaje · Sviatosti a formácia · Svätenia · Poznámka · História zmien.
- **Export XLSX** v rovnakej štruktúre ako dnešný súbor (aby kúria mohla Excel prestať udržiavať) + **adresné štítky / hromadná pošta** (oslovenie, meno s titulmi, farnosť, adresa).
- **Archív:** odišli zo ŽD, zomrelí (s dátumom úmrtia), samostatný filter.

### 16.5 Výročia a meniny (náhrada listov „výročia…“)

Prehľad pre zvolený rok/mesiac, počíta sa z dátumov – nič sa neprepisuje ručne:
- **Jubileá kňazstva** 25 / 40 / 50 / 60 / 65 / 70 rokov (zo `ordination_date`), **životné jubileá** 50 / 60 / 70 / 75 / 80 / 85 / 90 (z `birth_date`), **meniny** (`name_day`), výročia úmrtia (archív).
- Export pre Katolícke noviny / obežník (PDF / XLSX).

### 16.6 Import (`scripts/import-clergy.ts`, dry-run / `--apply`)

Rovnaký postup ako import farností (§ 7): suchý beh vypíše **správu na kontrolu** – nespárované farnosti, posunuté stĺpce, nečitateľné dátumy, duplicitné osobné čísla a mená, neznáme rehole/svätitelia. Pravidlá: rozdelenie titulov pred/za, normalizácia dekanátov, reholí, svätiteľov a jazykov, rozdelenie „farár, dekan“ na pôsobenie + funkciu, telefóny do poľa, dátumy zo všetkých formátov, „pôsobenie“ (voľný text) do poznámky pôsobenia. Po importe spárovanie `parish_clergy.clergy_id` (meno, rehoľníci bez prípony).

**Doplnenie z dcza.sk/schematizmus (O47):** Excel nemá miesto diakonátu a kňazskej vysviacky, *Pochádza* ani históriu pôsobenia po rokoch (len 23 záznamov v stĺpci „pôsobenie“ voľným textom). Verejný schematizmus na dcza.sk ich má – doplníme ich skriptom (podobne ako `scripts/fetch-schematizmus.ts` pri farnostiach) a spárujeme podľa mena; nespárované pôjdu do správy na kontrolu.

### 16.7 Fázovanie

| Fáza | Obsah |
|---|---|
| **K0** ✅ | migrácia 043 (register, číselníky, `deaneries.code`, oprávnenia), import s dry-run správou |
| **K1** ✅ | admin `/admin/knazi` – zoznam, detail, úpravy, nové menovanie, audit, export XLSX |
| **K2** ✅ | výročia a meniny, adresné štítky |
| **K3** ✅ | prepojenie so stránkami farností – kňazi z registra, `parish_clergy` zaniká; ~~foto a kontakt si kňaz spravuje sám~~ → verejne bez fotky a kontaktov (O47, O48) |
| **K4** ✅ | kňazská zóna (§ 15) – účet kňaza = osoba z registra (`clergy.auth_user_id`), pozvánky z registra |
| **K5** ⬜ | verejný schematizmus pre web diecézy (§ 14) – údaje podľa O47 |
| **K6** ⬜ | digitálne celebrety (§ 16.9) |

### 16.8 Otázky K1–K9 – ✅ rozhodnuté 2026-10-07 (O44–O52)

| # | Otázka | Môj návrh |
|---|---|---|
| K1 | Importovať aj archív (**odišli** 142, **zomrelí** 50)? | **Áno**, ako stav `left` / `deceased`, po ručnej kontrole posunutých riadkov (dry-run ich označí) |
| K2 | **Bohoslovci:** len aktuálny ročník 2025/2026, alebo aj historické bloky? | **Len aktuálny** – historické bloky sú staré ročníkové zoznamy; kto sa stal kňazom, je už v liste „kňazi“ |
| K3 | Kto má prístup do registra? | `manage_clergy` = kúria (kancelária), `view_clergy` = biskup, generálny vikár; dekani nie |
| K4 | Čo bude **verejné** (farnosti, web diecézy)? | meno, tituly, funkcia, farnosť, fotka, rok vysviacky; pracovný kontakt len so súhlasom |
| K5 | Môže kňaz sám upraviť **svoje** údaje (kontakt, foto) v kňazskej zóne? | **Áno, len kontakt a foto**; ostatné mení kúria |
| K6 | Je **register zdrojom pravdy** pre kňazov vo farnostiach (nahradí import schematizmu dcza.sk)? | **Áno** od fázy K3; menovanie robí kúria v registri |
| K7 | **Osobné číslo** – kto ho prideľuje, má ho mať každý (dnes 172/274, 6 duplicít)? | zachovať, nepovinné, unikátne; duplicity vyrieši kúria pri kontrole importu |
| K8 | Udržiavať ďalej aj Excel? | **Nie** – po K1 je zdroj register, Excel sa z neho exportuje |

**Rozhodnutia:** K1 áno, povinne (O44) · K2 len aktuálny ročník, automaticky +1 k 1. 9., stav na výber s farbou (O45) · K3 zatiaľ len KROK a diecéza (O46) · K4 ako dcza.sk/schematizmus, bez fotky a kontaktov (O47) · K5 kňaz register nevidí ani nemení (O48) · K6 register = hlavný zdroj pravdy (O49) · K7 osobné číslo prideľuje diecéza (O50) · K8 Excel vypadne, exporty áno (O51) · K9 celebrety (O52, § 16.9).

### 16.9 Digitálne celebrety (O52) – návrh, ⬜ neskôr (fáza K6)

**Celebret** (*litterae commendatitiae*) potvrdzuje, že kňaz je v riadnom postavení a môže sláviť sviatosti. Dnes sa vyrába v aplikácii na digitálne vizitky (mypro.one, doména `celebret.dcza.sk/<meno>`) – obsah nižšie. Návrh zjednotenia v Kroku:

- **Celebret = záznam k osobe v registri** – `clergy_celebrets`: číslo, dátum vydania, **platnosť do**, stav (platný / zrušený / vypršaný), vydal (ordinár / kancelár), jazyky, fotka (snímka v čase vydania), poznámka; história všetkých vydaných celebretov.
- **Verejné overenie** cez **QR kód**: `mojkrok.sk/celebret/<token>` (alebo zachovať `celebret.dcza.sk` cez presmerovanie) – zobrazí meno s titulmi, fotku, diecézu, kategóriu, **platnosť a stav veľkým písmom** (platný / neplatný), viacjazyčne. Token je náhodný (nedá sa uhádnuť z mena).
- **Výstupy:** karta vo formáte platobnej karty / vizitky na tlač (PDF, aj hromadne), A4 verzia a **digitálny celebret** do mobilu (PDF / obrázok), poslanie kňazovi e-mailom.
- **Admin:** vydať / predĺžiť / zrušiť celebret z detailu kňaza, hromadné predĺženie (napr. všetkým v službe k 1. 1.), zoznam končiacich platnosť.
- **Rozhodnuté (O53–O58):** len kňazi (nie diakoni) · latinčina, neskôr voliteľne prepínač EN / ES · platnosť **vždy 1 rok** od vydania · overovacia adresa s **náhodným kódom** + `noindex` · logo, pečiatka a podpis **nahrá a mení kúria v admine** – pri zmene biskupa sa nahrá nový podpis; každý vydaný celebret si pamätá, ktorý podpis a pečiatku použil (starší celebret sa nezmení) · nadpis kontaktu **Curia dioecesana**.
- **Nastavenia celebretu v admine:** logo, pečiatka, podpis (obrázky s históriou verzií), meno a funkcia podpisujúceho (voliteľne), kontakt kúrie, texty šablóny.

**Dnešný celebret – obsah (z DB aplikácie mypro.one, 2026-10-07, vzor Dušan Pecko):**

| Prvok | Hodnota / poznámka | Zdroj v registri |
|---|---|---|
| Fotka (zaoblená) | portrét kňaza | `clergy.photo_url` (snímka k celebretu) |
| Podnadpis | **Sacerdos** | z kategórie (diakon → *Diaconus*) |
| Hlavička | **Dioecesis Žilinensis, Slovachia** · **LITTERAE COMMENDATICIAE** · **CELEBRET** | pevný text |
| Logo diecézy | obrázok (dnes na images.sk) | súbor v Kroku |
| *Nomen et cognomen* | Mgr. Dušan Pecko | meno s titulmi |
| *Dies editionis* | 23. 03. 2024 | `clergy_celebrets.issued_on` |
| *Dies nativitatis* | 14. 07. 1982 | `clergy.birth_date` |
| *Dies ordinationis* | 13. 06. 2009 | `clergy.ordination_date` |
| *Valet ad* | 31. 12. 2026 | `clergy_celebrets.valid_until` |
| Vydal | *Curia dioecesana Žilinensis edidit* | pevný text |
| Text odporúčania | *Reverendus Dominus, harum litterarum possessor, Dioecesis Žilinensis presbyter, iurisdictione ad confessiones audiendas præditus, nulla censura ecclesiastica innodatus, omnibus, ad quos in itinere prevenerit, impense commendatur, ut præprimis ad Sacrosanctum Missæ Sacrificium celebrandum admittetur.* | šablóna; časť o spovednej jurisdikcii len ak ju kňaz má (príznak na celebrete) |
| Pečiatka + podpis | obrázky, pod podpisom *subscriptio* | nastavenia celebretu – nahrá a mení kúria (O57) |
| Odkaz *sacerdos profile* | dcza.sk/schematizmus/knazi/… | verejný profil (O47, fáza K5) |
| Kontakt kúrie | **Curia dioecesana:** Jána Kalinčiaka 1, 010 01 Žilina · +421 41 500 22 15 · sekretariat@dcza.sk (O58) | nastavenia celebretu |
| Sociálne siete diecézy | Instagram, Facebook, YouTube | pevné odkazy |
| QR kód | `/<meno>/qr` | QR na overovaciu adresu |

**Čo zlepšiť oproti dnešku:**
- **Adresa podľa mena** (`celebret.dcza.sk/dusan-pecko`) sa dá uhádnuť a je na nej **dátum narodenia** → nová overovacia adresa s **náhodným tokenom**, `noindex`; dátum narodenia ostáva (slúži na identifikáciu), ale stránka nebude dohľadateľná vyhľadávačom ani podľa mena.
- **Stav platnosti viditeľne:** zelené *VALET* / červené *NON VALET* (vypršaný alebo zrušený celebret) – dnes stránka platnosť len vypisuje.
- Obrázky (logo, pečiatka, podpis) dnes ležia na cudzom hostingu images.sk → uložiť v Kroku.
- Dnešná stránka sa načítava vyše minúty (504 – pomalý server mypro.one, 2026-10-07) → v Kroku ide o rýchlu statickú stránku.

---

## 17. Fotogaléria farnosti – „Zo života farnosti“ (návrh 2026-10-08, rozhodnuté O59–O64, ✅ realizované – migrácie 044, 045)

**Podnet (pripomienky Julie, 2026-10-08):** na stránke farnosti chýbajú fotky – kostol, farnosť, život spoločenstva. Stránka je dnes vizuálne strohá (titulná fotka, erb, obrázok pri aktualite).

### 17.1 Čo navrhujem

1. **Fotky kostola a farnosti** (stále, „vizitka“): 3–8 fotiek – exteriér, interiér, oltár, filiálne kostoly. Na stránke farnosti hore ako jemný **pás / slideshow** pod nadpisom (nahradí dnešnú stmavenú titulnú fotku), na mobile posúvanie prstom.
2. **Albumy „Zo života farnosti“** (pribúdajú): album = názov, dátum, krátky popis, titulná fotka, fotky s voliteľným popisom. Napr. „Prvé sväté prijímanie 2026“, „Hody“, „Púť na Živčákovú“.
   - Na domovskej stránke farnosti sekcia **Zo života farnosti** – 3 najnovšie albumy (dlaždice), odkaz na všetky.
   - Samostatná stránka `/farnosti/<slug>/galeria` (zoznam albumov) a `/farnosti/<slug>/galeria/<album>` (mriežka fotiek + zväčšenie na celú obrazovku, posúvanie, popis).
   - Album sa dá **pripojiť k aktualite** (pod článkom sa zobrazí galéria) – kňaz nemusí fotky nahrávať dvakrát.
3. **Nahrávanie v zóne farnosti** (správca aj editor): viac fotiek naraz (presunutím z počítača alebo z mobilu), automatické **zmenšenie a prevod do WebP** (napr. max. 2000 px, ~300 kB), poradie ťahaním, výber titulnej fotky, popisy. Fotky na B2 ako dnešné obrázky.
4. **Kontrola obsahu:** ako pri oznamoch – ide na web hneď, diecéza vie album skryť (§ 4.3).

### 17.2 Dátový model (migrácia pri realizácii)

```sql
parish_albums (id, parish_id, title, slug, description, event_date, cover_photo_id,
               kind 'church' | 'life', published, taken_down_at, takedown_reason, created_by, created_at, updated_at)
parish_photos (id, album_id, url, width, height, caption, sort_order, size_bytes, created_at)
parish_posts.album_id → parish_albums (voliteľné prepojenie aktuality s albumom)
```

`kind = 'church'` = jeden stály album „Kostol a farnosť“ (bod 1), `life` = albumy zo života.

### 17.3 GDPR a pravidlá

- Na fotkách sú ľudia, často **deti** (prvé sväté prijímanie, birmovka). Zodpovednosť za súhlas so zverejnením nesie farnosť – v zóne pri nahrávaní krátke upozornenie + doplniť do podmienok používania stránok farností (§ 5.4).
- Bez mien ľudí v popisoch (odporúčanie), vyhľadávače fotky môžu indexovať (otázka G4).
- Limit, aby sa B2 nezahltilo: **kvóta 1 GB na farnosť**, diecéza ju môže zmeniť (O60).

### 17.4 Otázky na rozhodnutie (G1–G6)

| # | Otázka | Môj návrh (rozhodnutie: O59–O64 – návrhy prijaté, limit 1 GB bez limitu počtu fotiek) |
|---|---|---|
| G1 | Stále **fotky kostola** hore na stránke (pás/slideshow) – áno? | **Áno**, 3–8 fotiek, nahradí stmavenú titulnú fotku |
| G2 | **Albumy** (podujatia) alebo jedna spoločná galéria bez albumov? | **Albumy** – prehľadnejšie, dá sa pripojiť k aktualite |
| G3 | Kto nahráva – len správca farnosti, alebo aj editor? | **Správca aj editor** (ako oznamy) |
| G4 | Smú fotky indexovať vyhľadávače (Google obrázky)? | **Áno pre fotky kostola, nie pre albumy zo života** (deti) |
| G5 | Limit na farnosť | **300 fotiek / 1 GB**, diecéza môže zvýšiť |
| G6 | Prepojenie na existujúce albumy (Facebook, Google Fotky, Zonerama) namiesto nahrávania? | Popri vlastných albumoch povoliť aj **odkaz na externý album** (dlaždica s odkazom) |

## 18. Zdieľanie na sociálne siete (pripomienky Julie, 2026-10-08)

**Hotové (O65):** tlačidlo **Zdieľať** na stránke farnosti, pri oznamoch, aktualitách, zozname albumov, v albume a pri **každej fotke** (lightbox). Na mobile otvorí systémové zdieľanie (Messenger, WhatsApp, Instagram…), na počítači ponuku Facebook / WhatsApp / X / e-mail / kopírovať odkaz. Každá fotka má vlastnú adresu `?foto=N` – otvorí sa rovno v lightboxe a Facebook ukáže v náhľade práve ju (og:image + og:url s `?foto=N`). Úvodná stránka farnosti má v náhľade prvú fotku kostola.

V zóne farnosti je Zdieľať pri každom zverejnenom oznamy/aktualite a albume, navyše **„Kopírovať text s odkazom“** (nadpis + perex + odkaz – na vloženie do Facebooku, Instagramu, skupín). Facebook otvorí okno, kde kňaz príspevok zverejní na svojom profile alebo na stránke farnosti (ak ju spravuje).

**Na rozhodnutie neskôr (S1):** automatické zverejnenie priamo na **Facebook stránku farnosti** po uložení príspevku – vyžaduje Meta aplikáciu so schválením (Page publishing), každá farnosť si raz prepojí svoju FB stránku; Instagram len cez firemný účet a vždy s obrázkom. Rozhodnutie 2026-10-08: **možno v budúcnosti, teraz nie.**

## 19. Videá farností (2026-10-08, O66)

**Hotové (migrácia 046):** farnosť nevie video nahrať, len **vloží odkaz** na YouTube alebo Vimeo (watch, youtu.be, shorts, live, aj súkromný Vimeo odkaz s kódom). Pri uložení sa cez oEmbed doplní názov a náhľad (YouTube 16:9 bez pruhov).
- **Aktualita:** pole „Videá“ (max. 10) – prehrávač pod textom.
- **Album:** videá nad fotkami; album môže mať aj **len videá** (dlaždica s náhľadom videa a počtom).
- **Verejne:** najprv len náhľad s tlačidlom ▶ – na YouTube/Vimeo sa nič neposiela, kým návštevník neklikne (GDPR, rýchlosť); YouTube cez `youtube-nocookie.com`, Vimeo s `dnt=1`.

## 20. Web diecézy dcza.sk na platforme Krok (návrh 2026-10-08, rozhodnuté O70–O73, 🟡 realizácia)

**Cieľ (zadanie):** jedna aplikácia a **jeden admin, dva weby** – `mojkrok.sk` ostáva web fondu KROK, pribudne `dcza.sk` (web diecézy). Web sa vyberie podľa domény.

**Subdomény farností:**
- `<farnost>.mojkrok.sk` → vždy **naša stránka farnosti**,
- `<farnost>.dcza.sk` → ak má farnosť **vlastný web** (`parishes.website`), presmeruje naň (napr. `farnostbela.sk`); inak tá istá naša stránka farnosti.

### 20.1 Čo je dnes (analýza 2026-10-08)

| | **beta.dcza.dev** (WordPress) | **dcza.sk** (živý web, NetBase CMS) |
|---|---|---|
| Stav | rozpracovaná nová štruktúra a vzhľad | aktívne používaný – posledná pozvánka 8. 10. 2026 |
| Obsah | 86 stránok (veľa prázdnych – 0 slov), 169 článkov (posledný 15. 5. 2026), 11 akcií (miesto, dátum od–do, čas), 3 čísla časopisu (odkaz na Zachej), 240 médií | ~270 stránok v mape webu, články v sekciách Udalosti, Pozvánky, Zo života farností, Zamyslenia, Pastorácia, Projekty, Jubilejný rok…, RSS |
| Štruktúra | O nás (diecéza, biskup, chrámy, schematizmus), Kúria (úrady, rady a komisie), Činnosť (pastorácia, charita, misie), Aktuality (články, kalendár akcií), Dokumenty (homílie, pastierske listy, dokumenty pápežov, GDPR), Kontakty | `/sk/dokumenty/...` (biskup, biskupský úrad, úrady, diecéza, kňazi, pastorácia, projekty), `/sk/ostatne/...` (kostoly, kaplnky, verejné obstarávanie, zmluvy), `/sk/knazska-zona` |
| Kategórie článkov | Zamyslenia 60, Homílie 34, Pastierske listy 19, Udalosti 19, Projekty 16, Pozvánky 7, Farnosti 7… | podobné, plus dlhší archív |
| Prístup k dátam | verejné WP REST API (stránky, články, akcie, časopis, médiá) | len HTML (+ RSS 20 posledných) – treba stiahnuť zo stránok |

**Dôsledky:** schematizmus (kňazi, farnosti, dekanáty) **nahradia naše dáta** (register kňazov K5, stránky farností); kňazská zóna je už v Kroku (§ 15); dcza.sk dostane vlastné aktuality, akcie, časopis a statické stránky, editovateľné v spoločnom admine; staré adresy `/sk/dokumenty/...` treba **presmerovať (301)** na nové.

### 20.2 Rozhodnutia (2026-10-08)

| # | Otázka | Rozhodnutie |
|---|---|---|
| O70 | Zdroj obsahu | **Štruktúra a stránky z bety** (menu, stránky, akcie, časopis) + **články zo živého dcza.sk** (aby nechýbalo nič od mája); prázdne stránky bety doplniť zo živého webu. |
| O71 | Vzhľad | **Nový, svetlý** – spoločné komponenty s Krokom, vlastná hlavička, erb a farby diecézy; najprv na test.mojkrok.sk na schválenie. |
| O72 | Hlavná adresa stránky farnosti (canonical) | **dcza.sk/farnosti/<farnosť>** – diecéza je „matka“. Prepne sa až po spustení dcza.sk na Kroku; dovtedy ostáva mojkrok.sk. *Nápad do budúcnosti: mojkrok.sk → `mojkrok.dcza.sk` a jeden branding – teraz nie, mojkrok.sk ostáva.* |
| O73 | Archív článkov zo živého webu | **Len posledné 2 roky** (od 10/2024); staršie adresy sa presmerujú na zoznam aktualít. |

### 20.3 Fázy

| Fáza | Obsah |
|---|---|
| **D0** | Výber webu podľa domény (`mojkrok.sk` / `dcza.sk`, aj `www.`), na test.mojkrok.sk prepínač „web diecézy“ (cookie, len mimo produkcie); spoločný admin |
| **D1** | Dátový model webu diecézy (stránky v strome, články s kategóriami, akcie, časopis, menu) + import z bety (REST API) a článkov zo živého webu (2 roky) |
| **D2** | Verejný web dcza.sk – hlavička/pätička diecézy, úvod, aktuality, kalendár akcií, časopis, stránky, vyhľadávanie; farnosti a kňazská zóna z Kroku |
| **D3** | Admin pre kúriu – stránky, články, akcie, časopis, menu (oprávnenie `manage_diocese_web`) |
| **D4 = K5** | Verejný schematizmus z registra (kňazi, farnosti, dekanáty, rehole) |
| **D5 = F6** | Subdomény `<farnosť>.mojkrok.sk` a `<farnosť>.dcza.sk` (vlastný web farnosti → presmerovanie) |
| **D6** | Spustenie: DNS dcza.sk na Vercel, presmerovania starých adries `/sk/dokumenty/...`, canonical farností na dcza.sk (O72), potom K6 celebrety |

### 20.4 Stav realizácie (2026-10-08)

- **D0 ✅** – výber webu podľa domény (`lib/site.ts`, middleware): dcza.sk → vnútorne `/dcza/...`, spoločné cesty (admin, prihlásenie, farnosti, kňazská zóna) na oboch weboch, `/dcza` z mojkrok.sk nedostupné. Na test.mojkrok.sk prepínač **`/web/dieceza`** a späť **`/web/krok`** (cookie, len mimo produkcie).
- **D1 ✅** – migrácia **049** (`diocese_pages`, `diocese_posts` + kategórie, `diocese_events`, `diocese_magazine_issues`, `diocese_menu_items`, `diocese_redirects`, oprávnenie `manage_diocese_web`). Import `scripts/dcza/` (fetch-beta, fetch-live, import s dry-run): **58 stránok** (37 s obsahom, 21 prázdnych skrytých na doplnenie), **210 článkov** (169 z bety + 41 nových zo živého webu, 92 duplicít zlúčených), 11 akcií, 3 čísla časopisu, **274 obrázkov a príloh skopírovaných na B2** (WebP), **133 presmerovaní** starých adries `/sk/...`. Na živom webe za 2 roky nie sú nové homílie ani pastierske listy (posledné z 2023). Vložené príspevky z Facebooku sa zmenili na odkaz (GDPR).
- **D2 🟡** – verejný web: hlavička s erbom a menu zo stromu stránok (rozbaľovanie, mobil), pätička, úvod (najnovšie články, farnosti, rýchle odkazy, kalendár, časopis), aktuality s kategóriami, detail článku so zdieľaním, kalendár a detail akcie, časopis, obsahové stránky s omrvinkami a bočným menu, jednoduché hľadanie; spoločné stránky (farnosti, kňazská zóna) majú na dcza.sk hlavičku diecézy. Zostáva: stránky farností (`/farnosti/[slug]`) v štýle diecézy, SEO (sitemap/robots/canonical pre dcza.sk), obsah prázdnych stránok.

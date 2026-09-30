# Návrh: Databáza farností (profil, bohoslužby, štatistika, predpis, vlastná stránka)

Stav: **návrh po treťom kole rozhodnutí (2026-09-30)**; **F1b hotová** (lokálne, e2e overené), F0/F1 čaká na CSV. Nadväzuje na `krok_navrh_vyzvy.md` a `krok_databaza_struktura.md`.
Predpokladané migrácie: `supabase/034_parishes_extended.sql` + `035_parish_pages.sql` (+ import skript). *(Čísla 026–033 medzitým obsadili banka, newsletter, darcovia a F1b (032 sekvencia VS, 033 onboarding).)*

Cieľ modulu:

1. Úplný **profil farnosti** (kontakty, IČO/DIČ, účet, patrocínium, web).
2. **Bohoslužby a spovedanie** v dvoch režimoch: *cez rok* a *letný/prázdninový*.
3. **Štatistika veriacich** za farnosť aj filiálky (obyvatelia / katolíci / %).
4. **Prínos farnosti do fondu**: počet darcov a vyzbieraná suma.
5. **Predpis na rok** = počet katolíkov × koeficient, + **história rokov**.
6. Kňaz sa prihlási, vidí a **navrhuje zmeny** profilu svojej farnosti.
7. **Verejná stránka farnosti** – pre farnosti bez vlastného webu, vrátane oznamov a článkov.

---

## 0. Rozhodnutia z 2026-09-28

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

Dôsledok O8+O9: verejná stránka farnosti **prestáva byť voliteľnou fázou** a stáva sa jadrom modulu.

---

## 1. Čo už v Kroku existuje (audit k 2026-09-28)

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

## 2. Zdrojové dáta – CSV `farnosti2.csv`

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

14 stĺpcov spovedania sedí s rozhodnutím O11 (dva režimy × 7 dní) – **potvrdiť pri importe**.

### Problémy v dátach (import potrebuje ručnú kontrolu)

- **Testovacie záznamy**: `Farnosť VZOR`, `Farnosť test`, `Majer`, `Mokrade`, `Dekanát`.
- **Placeholder `xxx`** v DIČ a webe (~40 % riadkov) → `NULL`.
- **Duplicita**: `Makov` dvakrát (dekanát `Turzovka`, IČO 31925308 vs. dekanát `Tka`, IČO 31926835).
- **Posunuté riadky štatistiky**: záznam `Trnové` má pod sebou obce `Turany, Krpeľany, Nolčovo…` – patria inej farnosti. Automatické priradenie by vyrobilo nezmysly.
- **Nekonzistentné dekanáty**: `Tka` vs `Turzovka`, `PB`, `KNM`, `Krásno ` (s medzerou) → mapovací slovník.
- **Percentá** s chybami plávajúcej čiarky (`80,819999999999993`) – neimportovať, počítať z `katolíci / obyvatelia`.
- **Duchovné správy** bez IČO a štatistiky → `kind = 'chaplaincy'`.
- Súbor je **poškodený na úrovni riadkov** – niektoré záznamy zlepené (`…"88,83""Púchov","2020617588"…`).

### Zistenia na strane DB (nie CSV)

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

Darca si potom projekt **vie zmeniť sám v profile** („Podporujem projekt: …“), ale prednastavený ho dostane – nezačína od nuly. V admin prehľade pribudne riadok **„Dary bez farnosti (na projekt)“**, aby súčty za diecézu sedeli a týchto 9 678,58 € nezmizlo z dohľadu.

> **Akcia (stále otvorená k 2026-09-30):** uložiť CSV do `data/farnosti2.csv` (dnes nie je v repe) a vypýtať čistý export vrátane hlavičky stĺpcov. Bez neho sa F0/F1 nedá začať.

---

## 3. Dátový model – migrácia 026

### 3.1 Rozšírenie `parishes`

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

Plus: doplniť `deanery_id` všetkým 83 farnostiam a nakoniec **dropnúť textový `deanery`**.

### 3.2 Filiálky a štatistika veriacich

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

### 3.3 Bohoslužby a spovedanie – dva režimy

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

### 3.4 Predpis na rok (katolíci × koeficient)

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

### 3.5 Snapshot farnosti na dare (O2)

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

### 3.6 Schvaľovanie – len chránené údaje (O5, O6)

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

### 3.7 Prístup k farnosti – admin účet stránky (O7)

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

### 3.8 Kňazi vo farnosti (O18)

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

## 4. Verejná stránka farnosti – migrácia 027

### 4.1 Oznamy a články

```sql
CREATE TYPE parish_post_type AS ENUM ('announcement','article');   -- oznamy / článok

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

### 4.2 Stránky

| URL | Obsah |
|---|---|
| `/farnosti` | Zoznam + filter podľa dekanátu a **vyhľadávanie podľa obce** (ľudia hľadajú svoju dedinu, nie názov farnosti – preto index musí obsahovať aj `parish_villages.name`) |
| `/farnosti/[slug]` | Hero foto, bohoslužby (aktuálny režim zvýraznený + prepínač na druhý), spovedanie vrátane prvopiatkového, **kňazi vo farnosti** (§ 3.8), filiálky, kontakt farského úradu, mapa, hody a výročná poklona, posledné oznamy, články, „Podporte fond“ (VS + QR cez existujúci `pay-by-square`) |
| `/farnosti/[slug]/oznamy` | Archív oznamov |
| `/farnosti/[slug]/[post-slug]` | Článok |

SEO je hlavná hodnota: dopyt „sv. omše <obec>“ je stály a farnosti bez webu na neho dnes neodpovedajú. Doplniť `sitemap`, OG obrázky a schema.org (`Church` + `Event` pre bohoslužby).

Verejné čítanie **len cez RPC / `security definer` funkciu s vybraným zoznamom stĺpcov** – nikdy `SELECT *` pre `anon` na `parishes` (obsahuje IBAN, IČO, meno správcu, internú poznámku).

### 4.3 Zodpovednosť za obsah

Oznamy a články idú na web **bez schvaľovania** (O6) – týždenné oznamy publikované v sobotu večer by inak čakali na diecézu cez víkend. Kontrola je preto následná, nie predbežná:

- prehľad „Najnovšie od farností“ v admine s možnosťou **okamžite stiahnuť** príspevok (`published = false`),
- `visible_on_web` na farnosti ako hlavný vypínač celej stránky,
- audit, kto čo publikoval (`created_by` + `parish_change_log`).

### 4.4 Vlastná subdoména farnosti – `zilina.mojkrok.sk` (O13)

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

## 5. Prístup a bezpečnosť

### 5.1 Ako sa kňaz dostane k svojej farnosti

Odporúčaný tok – **pozvánka od diecézy**, nie automatické párovanie e-mailu:

1. Admin v `/admin/farnosti/[id] → Prístupy` klikne „Prideliť admin účet“, predvyplní sa `parishes.email` (dá sa prepísať na akúkoľvek adresu – O7).
2. Systém pošle Supabase invite → vznikne `auth.users`, riadok v `parish_users` (`role = 'admin'`, `invited_at`) a rola `farnost` v `user_roles`.
3. Kňaz si nastaví heslo, `accepted_at` sa vyplní, `/auth/post-login` ho pošle na `/moja-farnost`.

Ďalšie účty k tej istej farnosti prideľuje rovnakým postupom **diecéza** (O7).

Prečo nie „kto sa prihlási farskou adresou, dostane farnosť“: e-maily sa v CSV opakujú (`makov@fara.sk` aj `makov@dcza.sk`), veľa farností má gmail a kto by si zaregistroval adresu na doméne `fara.sk`, dostal by cudzie dáta.

### 5.2 Roly a oprávnenia

| ID | Význam | Komu |
|---|---|---|
| `manage_parishes` | správa farností, filiálok, štatistiky, predpisov, schvaľovanie návrhov | `administrator`, `zamestnanec` |
| `view_parishes` | čítanie prehľadu farností a plnenia | `kuria`, `kontrolor` |
| *(bez permission)* | vlastná farnosť | rola `farnost` + riadok v `parish_users` |

V `src/lib/auth.ts` pribudne `requireParishAccess(parishId)` – overí `parish_users` service-role klientom (rovnaký vzor ako `getUserAccess`).

### 5.3 RLS

```sql
CREATE OR REPLACE FUNCTION is_parish_member(p_parish UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM parish_users WHERE parish_id = p_parish AND user_id = auth.uid());
$$;
```

Policy pre `parish_*` tabuľky: `is_app_admin() OR is_parish_member(parish_id)`.
`SET search_path` je povinné podľa hardeningu z migrácie 012.

### 5.4 GDPR

- **Kňaz nevidí mená darcov** (O3) – zóna farnosti pracuje výhradne s agregátmi z `v_parish_year_summary`. Menný zoznam zostáva za oprávnením `view_donors`, ktoré farnosť nedostane.
- **Sumy sa nemaskujú** (O15) – farnosť vidí reálny počet darcov aj reálnu sumu, aj keď je darca jeden. Rozhodnutie v prospech transparentnosti; keďže mená sa nezobrazujú (O3), farár sa z čísla nedozvie, kto to je, iba ak by mal jediného darcu a vedel o ňom.
- **Kňazi**: telefón a e-mail sa zverejňujú len so súhlasom (`parish_clergy.is_public`, default `false`) – § 3.8.
- Verejná stránka farnosti znamená, že web spracúva obsah od tretích strán → doplniť do zásad ochrany OÚ a podmienok používania.

---

## 6. Obrazovky

### 6.1 Admin diecézy – `/admin/farnosti`

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

### 6.2 Zóna farnosti – `/moja-farnost`

**Mimo `/admin`**, vlastný jednoduchý layout. Middleware vyžaduje riadok v `parish_users`.

- **Prehľad**: „Váš predpis na rok 2026: X €, vybrané Y € (Z %)“, počet darcov z farnosti, graf histórie. **Bez mien.**
- **Úradné údaje** – celá karta (dekanát, názov, farský kostol, IČO, DIČ, adresa, telefón, e-mail, účet, www) len na čítanie + tlačidlo **„Požiadať o zmenu“**. Kód farnosti a dekanát mení výhradne diecéza.
- **Prezentácia** – foto, `intro`, hody, výročná poklona: ukladá sa **hneď**.
- **Bohoslužby** – editor rozvrhu „cez rok“ + „letný režim“, spovedanie vrátane prvopiatkového. **Ukladá sa priamo**, bez schvaľovania.
- **Štatistika veriacich** – zobraziť + tlačidlo „Navrhnúť opravu“ (mení ju len diecéza – O5).
- **Kňazi** – vlastný kontakt a foto si kňaz mení sám; pridanie/odobranie osoby ide cez diecézu (§ 3.8).
- **Oznamy a články** – TipTap editor, publikovanie **hneď na web**.
- **Materiály** – letáky, QR kód a VS pre výzvy (existujúci `pay-by-square`).

Pri chránených poliach a štatistike je vidieť stav návrhu: `Čaká na schválenie` / `Schválené` / `Zamietnuté + dôvod`.

### 6.3 Výber farnosti v profile darcu – chýbajúci článok reťazca

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

### 6.4 Zmena e-mailu darcu (O21)

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

## 7. Import dát

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
| **F0** | CSV do repa, čistý export, mapovanie dekanátov, dry-run import | 0,5–1 deň |
| **F1** | Migrácia 026 (tabuľky, RLS, pohľady, `donations.parish_id` + trigger + backfill), import dát | 2 dni |
| **F1b** ✅ | **Výber farnosti a projektu v registrácii a profile** (§ 6.3) + **oprava hľadania darcu cez `auth_user_id`** (§ 6.4) + **VS zo sekvencie** (O23) – hotové 2026-09-30: migrácie 032 (`next_donor_variable_symbol`), 033 (`donors.onboarding_completed_at`), `/profil/vitajte`, `lib/parishes/choices.ts`, `lib/donors/vs.ts` | 0,5–1 deň |
| **F2** | Admin `/admin/farnosti` – zoznam + záložky 1–3 | 2–3 dni |
| **F3** | Predpis: `parish_target_settings`, generovanie, história, export | 1–2 dni |
| **F4** | Zóna `/moja-farnost` + pozvánky (admin účet + editori) + schvaľovacia fronta chránených polí + audit | 3–4 dni |
| **F5** | Migrácia 027 + verejné `/farnosti/[slug]` + oznamy a články + SEO | 3–4 dni |
| **F6** | Subdomény `<farnost>.mojkrok.sk` (wildcard DNS + middleware + 301) | 0,5 dňa *(až po sprevádzkovaní `mojkrok.sk`)* |

### 8.1 Pilot – ktoré farnosti osloviť najskôr (O16)

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

## 9. Zostávajúce otázky

| # | Otázka | Návrh |
|---|---|---|
*(Prečíslované – predchádzajúce kolá otázok sú zodpovedané v sekcii 0.)*

| **Q1** | Má sa pri oprave § 6.4 vyriešiť aj **race condition vo variabilnom symbole** (`TODO.md` P1), keď sa ten súbor aj tak mení? | Áno – je to pár riadkov navyše oproti neskoršiemu návratu do tej istej funkcie. |
| **Q3** | Koeficient **2 €/katolík** – platí rovnako pre všetky farnosti, alebo majú mestské/vidiecke inú sadzbu? | Rovnako pre všetky, jednotlivé predpisy sa dajú prepísať ručne. |
| **Q4** | Má byť predpis a plnenie **viditeľné aj pre ostatné farnosti** (rebríček), alebo každá vidí len seba? | Každá len seba; súhrn má diecéza. Rebríček by mohol byť motivujúci, ale aj nepríjemný. |

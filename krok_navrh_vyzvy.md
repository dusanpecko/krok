# Návrh: Výzvy na podporu (grantové výzvy / kampane) – admin zóna a databáza

Stav: implementované 2026-09-14 (migrácie 023 + 024, admin, Mollie widget, verejné stránky `/vyzvy`, bankové doplnky). Čaká na test darov v Mollie test režime a prvý reálny bankový sync. Podrobnosti a otvorené body v `TODO.md`.

## 1. Čo obsahuje starý web (mojkrok.dcza.sk/grantove-vyzvy/…)

Analyzované 4 výzvy: Lectio divina, Diecézna animátorská škola, S farskou charitou bližšie k vám, „Chodíme spolu…“.

Každá výzva má rovnakú šablónu:

| Prvok | Príklad | Poznámka |
|---|---|---|
| Názov (+ podnadpis) | „Chodíme spolu…“ – Pomôžme mladým… | |
| Príjemca daru + adresa | Diecézna charita Žilina, Bratislavská 423/27 | nie je vždy fond, často partner |
| Cieľová čiastka | 12 000 € | |
| Darovať môžete do | 30. 9. 2025 alebo „priebežne“ | |
| Garant projektu | Mgr. Peter Birčák | meno + funkcia |
| IBAN | SK04 8330 … 8673 | vždy ten istý účet fondu |
| Variabilný symbol | 11771415 | **jeden VS na výzvu** (rad 1177xxxx) |
| Počítadlo | 19× podporené, 1 720,93 €, cieľ | aktualizované **ručne**, dátum „Aktualizované 31.01.2026“ |
| Tlačidlá | Pridajte sa (registrácia), Darovať anonymne (24-pay) | |
| Popis projektu | 1–5 odsekov čistého textu | |
| Jeden obrázok | hero fotka | |
| Kategórie na domovskej | Charita, Školstvo, Farnosť | zodpovedá enumu `project_category` |

Čo starý web **nemá**: video, galériu, rozpočet, harmonogram, priebežné správy, dokumenty, živé počítadlo, pravidelný dar viazaný na výzvu, QR kód, zdieľanie, záverečnú správu po ukončení.

## 2. Čo už v Kroku existuje a čo z toho použiť

- Tabuľka **`projects`** (001, 002) je už komentovaná ako „Podporené projekty a grantové výzvy“ a je **cieľom všetkých FK**: `donations.project_id`, `online_payments.project_id`, `online_subscriptions.project_id`, `donor_projects`, `form_submissions.project_id`. Má `slug`, `category`, `status`, `target_amount`, `start_date`, `end_date`, `image_url`, `visible_on_web`, `specific_symbol`.
- Priradenie daru k projektu funguje cez **špecifický symbol** (Fio sync aj XML import mapujú ŠS → `project_id`). VS identifikuje darcu, nie projekt.
- Mollie má `projectId` preplumbovaný od formulára cez metadata až do `donations`, ale **UI ho nikdy nenastaví**.
- TipTap editor (`SimpleRichTextEditor`) už vie obrázky, tabuľky aj YouTube. Je zviazaný s uploadom z modulu aktuality.
- B2 storage (`uploadImage`, `deleteImage`), limit 4 MB na strane klienta.
- Admin `/admin/projekty` je len modálový CRUD pod Nastaveniami s 8 poľami, bez obrázka, bez verejnej stránky. `visible_on_web` sa nikde nečíta.
- `supported_projects` = ročný zoznam podporených grantov (iná vec, nechať tak).

**Odporúčanie: rozšíriť `projects`, nezakladať novú tabuľku.** Vďaka tomu sa vyzbieraná suma počíta automaticky z `donations` a všetko párovanie (banka, Mollie, granty) funguje bez zmeny.

## 3. Pomenovanie (treba rozhodnúť)

„Grantové výzvy“ v kóde Kroku už znamenajú modul žiadostí o grant (`/granty`, tabuľka `forms`). Aby sa to nemiešalo, navrhujem pre darcovské kampane názov **„Výzvy na podporu“** (skrátene Výzvy):

- verejné URL: `/vyzvy` a `/vyzvy/[slug]` (+ redirecty zo starých `/grantove-vyzvy/<slug>/`)
- admin: `/admin/projekty` ostáva (menej zmien), v menu premenovať na „Výzvy a projekty“ a presunúť z Nastavení do hlavnej navigácie

## 4. Návrh databázy (budúca migrácia 023)

### 4.1 Rozšírenie `projects`

```sql
ALTER TABLE projects
  -- prezentácia
  ADD COLUMN IF NOT EXISTS subtitle TEXT,                         -- podnadpis / perex (1–2 vety, karty + OG)
  ADD COLUMN IF NOT EXISTS content TEXT,                          -- dlhý popis, HTML z TipTap
  ADD COLUMN IF NOT EXISTS video_url TEXT,                        -- YouTube/Vimeo hero video (nahrádza obrázok v hero)
  ADD COLUMN IF NOT EXISTS closing_summary TEXT,                  -- záverečná správa po ukončení (HTML)
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false, -- zobraziť na domovskej
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,

  -- kto a kde
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,                   -- Príjemca daru
  ADD COLUMN IF NOT EXISTS recipient_address TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_name TEXT,                   -- Garant projektu
  ADD COLUMN IF NOT EXISTS guarantor_role TEXT,                   -- „riaditeľ fondu“, „kaplán pre mládež“
  ADD COLUMN IF NOT EXISTS guarantor_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS parish_id UUID REFERENCES parishes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location TEXT,                         -- „ZŠ sv. Cyrila a Metoda, Žilina“ (školy)

  -- financie
  ADD COLUMN IF NOT EXISTS legacy_variable_symbol TEXT UNIQUE,    -- VS zo starého webu (11771415) – bežiace trvalé príkazy
  ADD COLUMN IF NOT EXISTS legacy_collected_amount NUMERIC(12,2) NOT NULL DEFAULT 0, -- suma vyzbieraná pred migráciou
  ADD COLUMN IF NOT EXISTS legacy_supporters_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_one_time BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_recurring BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS suggested_amounts INTEGER[] NOT NULL DEFAULT '{10,20,50,100}';

-- end_date = „darovať môžete do“; NULL = priebežne
-- status: draft | active | completed  (completed = ukončená, stále viditeľná so záverečnou správou)
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects (visible_on_web, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_parish ON projects (parish_id);
```

Poznámky:
- `description` (existujúce, krátky text) ostáva pre interné účely a fallback; verejný text je `subtitle` + `content`.
- IBAN sa neukladá per projekt, je spoločný (konštanta `KROK_IBAN`). Ak by niekedy mal partner vlastný účet, doplní sa `iban` nullable.
- Projekty vytvorené automaticky zo schválených grantov (`approveAndCreateProject`) ostávajú `visible_on_web = false`, čiže sa nezobrazia.

### 4.2 Galéria a dokumenty: `project_media`

Tabuľka namiesto JSONB (ako v `downloads.files`), lebo pri rekonštrukciách bude fotiek veľa a potrebujeme poradie, popisky a fázu pred / počas / po.

```sql
CREATE TABLE project_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'document')),
  url TEXT NOT NULL,                       -- B2 URL alebo YouTube/Vimeo pri kind = video
  thumbnail_url TEXT,
  title TEXT,                              -- popisok fotky / názov dokumentu („Rozpočet rekonštrukcie.pdf“)
  phase TEXT CHECK (phase IN ('before', 'during', 'after')), -- len pre rekonštrukcie, inak NULL
  mime_type TEXT,
  file_size INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_project_media_project ON project_media (project_id, kind, sort_order);
```

### 4.3 Rozpočet: `project_budget_items`

```sql
CREATE TABLE project_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                     -- „Výmena okien“, „Ubytovanie a strava 100 účastníkov“
  description TEXT,
  planned_amount NUMERIC(12,2) NOT NULL,   -- plán (súčet položiek ≈ target_amount, admin UI upozorní na rozdiel)
  actual_amount NUMERIC(12,2),             -- skutočné náklady po realizácii (transparentnosť)
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_project_budget_project ON project_budget_items (project_id, sort_order);
```

### 4.4 Harmonogram: `project_milestones` (hlavne rekonštrukcie)

```sql
CREATE TABLE project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                     -- „Stavebné povolenie“, „Začiatok prác“, „Kolaudácia“
  description TEXT,
  due_date DATE,
  completed_at DATE,                       -- NULL = ešte nesplnené
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_project_milestones_project ON project_milestones (project_id, sort_order);
```

### 4.5 Priebežné správy: väzba článkov na projekt

Nová tabuľka netreba. Aktuality už majú TipTap, obrázok, audio, pripnutie. Stačí:

```sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_posts_project ON posts (project_id, published_at DESC);
```

Na stránke výzvy sa zobrazí sekcia „Ako pokračujeme“ = publikované články s daným `project_id`. V admine výzvy tlačidlo „Nová správa k projektu“ predvyplní `project_id`.

### 4.6 Živé štatistiky: pohľad + RPC

```sql
CREATE OR REPLACE VIEW v_project_stats WITH (security_invoker = true) AS
SELECT
  p.id AS project_id,
  p.legacy_collected_amount + COALESCE(SUM(d.amount), 0)          AS collected_amount,
  p.legacy_supporters_count + COUNT(DISTINCT d.donor_id)::INT     AS supporters_count,
  COUNT(d.id)::INT                                                AS donations_count,
  MAX(d.donation_date)                                            AS last_donation_at,
  CASE WHEN p.target_amount > 0
       THEN LEAST(100, ROUND((p.legacy_collected_amount + COALESCE(SUM(d.amount), 0)) / p.target_amount * 100, 1))
  END                                                             AS percent
FROM projects p
LEFT JOIN donations d ON d.project_id = p.id
GROUP BY p.id;

-- verejná stránka číta cez service role (ako get_public_stats v 014), anon nemá EXECUTE
CREATE OR REPLACE FUNCTION get_project_stats(p_project_id UUID) RETURNS v_project_stats
LANGUAGE sql SECURITY DEFINER SET search_path = public AS
$$ SELECT * FROM v_project_stats WHERE project_id = p_project_id $$;
REVOKE ALL ON FUNCTION get_project_stats(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_project_stats(UUID) TO service_role;
```

Tým zaniká ručné „Aktualizované dňa“. Legacy hodnoty sa zadajú raz pri migrácii (1 720,93 € / 19 darcov atď.).

### 4.7 RLS

Nové tabuľky: rovnaký vzor ako `downloads` / `supported_projects`:
`FOR SELECT USING (visible = true OR is_admin())` (kde je `visible`), inak `USING (true)` na čítanie a `FOR ALL USING (is_admin())` na zápis. Verejné stránky aj tak čítajú cez service role a filtrujú v dotaze.

## 5. Tok darov: Mollie ako hlavná cesta (rozhodnuté 2026-09-14)

Dar na stránke výzvy ide primárne cez Mollie. Bankový prevod ostáva ako sekundárna, zbalená možnosť.

### 5.1 Čo už funguje a len sa napojí

- `startDonation` v `(public)/platby/actions.ts` prijíma `projectId`, validuje UUID, dáva ho do Mollie `metadata.project_id` a ukladá na `online_payments` aj `online_subscriptions`.
- `processMolliePayment` prenáša `project_id` do vytvoreného riadku `donations`; pri opakovaných platbách predplatného ho berie zo `online_subscriptions`. Vyzbieraná suma vo `v_project_stats` sa teda zvýši automaticky po každej zaplatenej platbe, jednorazovej aj pravidelnej.
- Neprihlásenému platcovi sa založí darca podľa e-mailu (VS max+1). To plne nahrádza staré „Darovať anonymne“ cez 24-pay, a navyše dar ostane dohľadateľný.

### 5.2 Čo treba dorobiť

1. **Darovací widget na stránke výzvy** (nový komponent `ProjectDonationWidget`, základ z `OnlineDonationForm`):
   - prednastavené sumy z `projects.suggested_amounts` + vlastná suma,
   - prepínač jednorazovo / mesačne podľa `allow_one_time` / `allow_recurring`,
   - e-mail a meno (predvyplnené, ak je darca prihlásený), voliteľný odkaz pre projekt (uloží sa do `online_payments.metadata.message`),
   - súhlas so spracovaním údajov, tlačidlo „Darovať“ → presmerovanie na Mollie checkout,
   - funguje bez prihlásenia; prihláseným sa dar zobrazí v profile.
2. **Popis platby v Mollie**: „KROK – <názov výzvy>“ (dnes fixne „Dar pre Pastoračný fond KROK“), aby bol projekt viditeľný vo výpise Mollie aj darcovi na výpise z karty. Do metadata pridať aj `project_slug` pre návratovú stránku.
3. **Návratová stránka `/dakujeme`**: zobrazí názov výzvy, aktuálny stav počítadla, tlačidlá späť na výzvu a zdieľanie.
4. **Stav výzvy**: widget sa nezobrazí pri `status = completed` alebo po `end_date`; namiesto neho poďakovanie a odkaz na ostatné aktívne výzvy. Server action `startDonation` to musí overiť aj na serveri (neprijať `projectId` neaktívnej výzvy).
5. **Admin záložka Dary**: okrem `donations` zobraziť aj `online_payments` k projektu so stavom (open / paid / failed / expired), aby bolo vidieť aj nedokončené pokusy, a aktívne predplatné (`online_subscriptions`) viazané na výzvu.
6. **Produkčné prostredie**: vo Verceli nastaviť `MOLLIE_MODE=live`, `MOLLIE_API_KEY_LIVE`, `NEXT_PUBLIC_BASE_URL`, overiť dostupnosť webhooku `/api/mollie/webhook` (zatiaľ nie sú nastavené, pozri TODO.md).

### 5.3 Viac pravidelných darov naraz: fond + výzva (požiadavka 2026-09-14)

Darca musí môcť mať cez Mollie súčasne napr. všeobecnú podporu fondu (10 € mesačne) a podporu konkrétnej výzvy (20 € mesačne na rekonštrukciu školy). Každý pravidelný dar je samostatné predplatné s vlastným účelom.

Čo už platí:
- `online_subscriptions` nemá žiaden unikát na darcu, každé predplatné má vlastný `mollie_subscription_id` a vlastný `project_id` (`NULL` = všeobecná podpora fondu).
- Profil už ponúka pri novom pravidelnom dare voľbu „pridať ďalší“ vs. „nahradiť existujúci“ (`RecurringChoice`), takže dve a viac predplatných sú podporované.

Čo treba doplniť:
1. **Účel v DTO predplatného**: `MyOnlineSubscription` rozšíriť o `project_id`, `project_name`, `project_slug` (join `online_subscriptions → projects`). Rovnako `getMyOnlinePayments` (história darov v profile) nech nesie názov výzvy.
2. **Profil, zoznam pravidelných darov**: každý riadok označiť účelom, napr. „Všeobecná podpora fondu“ / „Rekonštrukcia ZŠ Rajec“, s odkazom na výzvu. Rovnako v histórii darov.
3. **`RecurringChoice` podľa účelu**: možnosť „Zmeniť výšku“ ponúkať len pre predplatné s **rovnakým účelom** (rovnaký `project_id`, alebo obe všeobecné). Predplatné na iný účel len informatívne vypísať („Máte aj pravidelný dar 10 € na fond, ten ostáva“). Predvolená voľba na stránke výzvy = „pridať“, ak darca ešte na túto výzvu pravidelne neprispieva; „zmeniť výšku“, ak už prispieva.
4. **Popis v Mollie per účel**: `subscriptionDescription(interval, projectName?)` → „Pravidelný mesačný dar – KROK – Rekonštrukcia ZŠ Rajec“, bez projektu ostáva dnešný text. Darca tak vo výpise z karty rozlíši oba dary.
5. **Kontrola na serveri v `startDonation`**: `replaceSubscriptionId` prijať len vtedy, ak má nahrádzané predplatné rovnaký `project_id` ako nová platba (inak by sa zámenou zrušila podpora iného účelu).
6. **Admin**: v darcovi zobraziť všetky aktívne predplatné s účelom; v záložke Dary výzvy len tie, ktoré patria k nej. Výzva pri stave `completed`: predplatné na ňu viazané neukončovať automaticky, ale admin dostane zoznam a rozhodne (kontaktovať darcu / presmerovať na fond). Do návrhu zatiaľ nedávam automatické presmerovanie.
7. **Widget na výzve pre prihláseného darcu s existujúcou všeobecnou podporou**: nezobrazovať výstrahu „už máte pravidelný dar“ ako prekážku, ale neutrálne: „Váš pravidelný dar na fond ostáva. Chcete k nemu pridať pravidelnú podporu tejto výzvy?“

Schéma sa kvôli tomu nemení, stačí `project_id`, ktorý už existuje.

### 5.4 Bankový prevod ako doplnok (nižšia priorita)

- Zbalená sekcia „Radšej prevodom“: IBAN, VS (ak prihlásený), ŠS projektu, QR. `pay-by-square.ts` doplniť `specificSymbol`.
- **Legacy VS**: bežiace trvalé príkazy zo starého webu (VS 11771415 a pod.) budú chodiť ďalej. Fio sync a XML import, ak VS nenájde darcu, skúsia `projects.legacy_variable_symbol` a dar priradia k projektu cez systémového darcu „Anonymný darca“ (bez zmeny schémy). Bez toho tieto dary skončia ako nespárované.
- Manuálne párovanie v Banke už výber projektu má, netreba meniť.

## 6. Admin zóna: navrhovaná štruktúra

Prejsť z modálu na **celostránkový formulár so záložkami** (vzor aktuality), lebo polí bude 30+.

```
/admin/projekty                 zoznam: názov, kategória, stav, viditeľné, vyzbierané / cieľ (progress), darcov, ŠS, akcie
/admin/projekty/novy
/admin/projekty/[id]            záložky:
  1. Základné      názov, slug (editovateľný kým je draft), podnadpis, kategória, stav, viditeľné na webe, featured,
                   poradie, hero obrázok, príjemca (+adresa), garant (+funkcia, foto), farnosť / lokalita,
                   termín od–do (do = NULL → priebežne), cieľová suma
  2. Obsah         TipTap dlhý popis, video URL, záverečná správa (len pri stave completed)
  3. Financie      ŠS, legacy VS, legacy suma + počet darcov, povolené typy darov, navrhované sumy,
                   živé štatistiky z v_project_stats (len na čítanie)
  4. Rozpočet      položky (názov, plán, skutočnosť, stav), súčet vs. cieľová suma s upozornením na rozdiel
  5. Galéria       hromadný upload fotiek (4 MB / súbor), fáza pred/počas/po, popisky, drag poradie,
                   dokumenty (PDF rozpočet, povolenia), ďalšie videá
  6. Harmonogram   míľniky s dátumom a odškrtnutím
  7. Správy        články naviazané na projekt + tlačidlo „Nová správa k projektu“
  8. Dary          zoznam donations k projektu (dátum, suma, darca, spôsob), súčet, export CSV – len na čítanie
```

Ďalšie admin úpravy:
- Sidebar: „Výzvy a projekty“ do hlavnej navigácie (dnes je pod Nastaveniami ako „Projekty“).
- Nový permission key `manage_projects` („Správa výziev a projektov“), aby zamestnanec mohol editovať obsah bez `manage_config`. Alternatíva: ponechať `manage_config`.
- Dashboard admin: karta „Aktívne výzvy“ s progress barmi.
- `SimpleRichTextEditor`: prijať `uploader` prop (dnes natvrdo `uploadPostImage` z aktualít).
- Uploady do B2 pod `projects/<id>/gallery|documents|hero`.

## 7. Verejná stránka výzvy (na neskôr, len aby schéma sedela)

Hero (video alebo obrázok) → počítadlo (vyzbierané / cieľ / darcov / dní do konca) → tlačidlá Darovať (Mollie, jednorazovo / pravidelne, prednastavené sumy) a Bankový prevod (IBAN, VS, ŠS, QR) → popis → rozpočet (pruhy plán / skutočnosť) → galéria pred / počas / po → harmonogram → „Ako pokračujeme“ (články) → dokumenty → garant a príjemca → zdieľanie. Pri `completed` navrch záverečná správa a poďakovanie.

Zoznam `/vyzvy`: filtre podľa kategórie (Charita / Školstvo / Farnosť / …), aktívne hore, ukončené v sekcii „Podarilo sa“. Domovská: karty s `featured = true`.

## 8. Rozhodnutia

Rozhodnuté 2026-09-14:
1. Dary primárne cez Mollie, viac predplatných s rôznym účelom naraz (sekcia 5).
2. Rozšíriť existujúcu tabuľku `projects`, žiadna nová tabuľka `campaigns`.
3. Názov „Výzvy na podporu“, verejné URL `/vyzvy` a `/vyzvy/[slug]`, redirecty zo starých `/grantove-vyzvy/…`.
4. Nový permission key `manage_projects`.
5. Harmonogram (`project_milestones`) hneď v migrácii 023.

## 9. Poradie implementácie

1. ✅ Migrácia 023 (4.1–4.7) + seed legacy hodnôt pre 4 existujúce výzvy (2026-09-14).
2. ✅ Admin: všetkých 8 záložiek + zoznam s progress barom (2026-09-14, otestované).
3. ✅ Mollie: `ProjectDonationWidget`, kontrola stavu výzvy a účelu v `startOnlineDonation`, názov výzvy v popise platby a predplatného, účel v profile, `/dakujeme` s kontextom výzvy (2026-09-14).
4. ✅ Verejná stránka `/vyzvy` + `/vyzvy/[slug]`, karty `featured` na domovskej, odkazy v navigácii, redirecty zo starých adries (2026-09-14).
5. ✅ Doplnky: QR so ŠS, legacy VS v bankovom synce cez „Anonymný darca“ (migrácia 024) (2026-09-14).
6. ⏳ Test darov v Mollie test režime, produkčné Mollie env vo Verceli, zapnúť `featured` vybraným výzvam.

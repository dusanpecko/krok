# KROK – TODO pred spustením

**Cieľ:** Spustiť stránku Krok začiatkom augusta 2026. Nemusí byť plne funkčná ako lectio.one.
Rozsah pre launch = **(1) informovanosť o projekte Krok** + **(2) darcovia sa vedia prihlásiť/registrovať**.
Admin sekcia môže zostať interná, ale musí byť bezpečná (nesmú unikať dáta darcov).

Stav: projekt beží zatiaľ len na localhoste. Build aj `tsc` prechádzajú.

> **Aktuálny stav (k 2026-07-13):** Obe kritické bezpečnostné diery ZAVRETÉ.
> (1) Migrácia `supabase/011_fix_function_grants.sql` spustená – anon-key leak zavretý.
> (2) Serverová autorizácia hotová – `app/src/lib/auth.ts` + guardy vo všetkých admin
> server actions a `import-xml` route. Zmeny NIE SÚ commitnuté v gite.
> Ďalší krok: commit bezpečnostných opráv, potom P0 – prihlásenie darcov a deploy.

Legenda: `[ ]` treba · `[x]` hotové · 🔴 blocker · 🟠 dôležité · 🟢 neskôr

---

## P0 — BLOCKERY pred spustením (bez týchto sa nespúšťa)

### Bezpečnosť (nesmú unikať dáta darcov – GDPR)
- [x] 🔴 **Zavrieť únik cez RPC a pohľady** – spustená migrácia `supabase/011_fix_function_grants.sql`. Overené: anon dostáva `permission denied` na `search_donors_unaccent`, `get_suggested_matches`, `v_donor_summary`, `v_monthly_summary`.
- [x] 🔴 **Autorizácia v server actions.** HOTOVO. Vytvorený `src/lib/auth.ts` (`requireAuth`/`requireAdmin`/`requirePermission` – identita cez cookie session, roly cez service-role klient kvôli rekurznej RLS na user_roles). Guardy pridané do:
    - [x] `src/app/admin/roly/actions.ts` (`manage_roles` – zavretá eskalácia práv)
    - [x] `src/app/admin/roly/opravnenia/actions.ts` (`manage_roles`)
    - [x] `src/app/admin/banka/actions.ts` (`view_bank` – všetkých 10 akcií)
    - [x] `src/app/admin/aktuality/actions.ts` (`requireAdmin` – vrátane AI akcií)
    - [x] `src/app/admin/import/actions.ts` (`import_bank`)
    - [x] `src/app/admin/darcovia/actions.ts` (`view_donors`), `projekty` + `nastavenia/**` (`manage_config`), `granty` (`view_grants` – admin funkcie)
    - [x] `src/app/api/admin/import-xml/route.ts` (`import_bank`, vracia 401/403)
    - Overené: `tsc` aj `next build` prechádzajú, permission ID sedia s DB.
- [x] 🟠 **Middleware kontrola role pre `/admin/*`** – HOTOVO. `src/middleware.ts` teraz okrem prihlásenia overuje aj prístup (admin_users alebo aspoň jedna rola v user_roles); neoprávnený prihlásený používateľ je presmerovaný na `/`. Defense-in-depth navyše k guardom v akciách. tsc + build OK.
- [x] 🟠 **Rate limiting + anti-enumeration na registrácii** – HOTOVO. Pridaný `src/lib/rate-limit.ts` (Upstash Redis, fail-open ak nenakonfigurovaný) + limit 5 registrácií/hod/IP v `registerDonor`. Odexportovaný `generateNextVSAdmin` (bol verejne volateľný, unikal ďalší VS). `EMAIL_EXISTS` hláška ponechaná (užitočná UX), enumerácia zmiernená rate-limitom.
  - [x] ⚙️ Upstash Redis DB vytvorená, env `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` pridané lokálne. Overené (PING → PONG, SET/GET/DEL OK).
  - [x] ⚙️ Upstash env kľúče pridané aj do Vercel (Production).
- [ ] 🟠 Grantové prílohy idú do **verejného** B2 bucketu (`src/lib/storage.ts`). Pre launch buď skryť grantový modul, alebo prepnúť na privátny bucket + podpísané URL.

### Prihlásenie / registrácia darcov (kľúčová funkcia launchu)
- [x] 🔴 **Rolovo-podmienené smerovanie po prihlásení** – HOTOVO. Nový route `/auth/post-login` rozhodne cieľ podľa role (admin/pracovník → `/admin`, darca → `/profil`). Email aj Google login ním prechádzajú. Predtým default `/admin` vyhadzoval darcov na `/`.
- [x] 🔴 **Nezrovnalosť darcovskej zóny** – HOTOVO. Middleware teraz chráni `/profil` (nie neexistujúce `/moj-krok`); neprihlásený je presmerovaný na login s `redirect`. Login copy zjemnené („svoja zóna" namiesto „admin zóna"). Overené lokálne (307 redirecty sedia).
- [ ] 🔴 **Otestovať flow E2E s reálnym účtom** (po nasadení domény): registrácia → e-mail → prihlásenie (email + Google) → `/profil`. Rolová vetva post-login sa dá plne overiť až s prihláseným účtom.
- [ ] 🟠 Overiť, že darca po prihlásení vidí len **svoje** dáta (RLS `auth_user_id = auth.uid()` je nastavené – otestovať s reálnym testovacím účtom).
- [ ] 🟠 Reset hesla / zabudnuté heslo – funguje? Ak nie, doplniť.

### Verejný obsah (informovanosť)
- [x] 🔴 **Nahradiť fake dáta reálnymi:** HOTOVO (kód).
  - `(public)/page.tsx` – placeholdery na 0, štatistiky sa vždy berú z `getPublicStats()` (žiadne vymyslené čísla, ani pri nulách).
  - `admin/darcovia/page.tsx` – odstránený fake „+12 tento mesiac" (reálny mesačný počet sa dá doplniť ako query neskôr).
a- [ ] 🟠 Skontrolovať/doplniť obsah stránok: domov, o projekte Krok, aktuality, kontakt. Texty, logá, kontaktné údaje OZ.
- [ ] 🟠 SEO základ: `title`/`description`, OG obrázok, favicon, `sitemap`/`robots`.
- [ ] 🟠 GDPR: zásady spracovania osobných údajov + cookie/consent (zbierate e-maily, IBAN, adresy darcov).

### Nasadenie (deploy)
- [x] 🔴 Nastaviť **všetky env premenné vo Vercel** (Production) – HOTOVO (vrátane Upstash).
- [ ] 🔴 **Doména `mojkrok.sk`** + Supabase **Redirect URLs** (Auth) pre produkciu (inak Google/email login nepôjde). ⏳ *Naplánované na budúci týždeň.*
  - Supabase → Authentication → URL Configuration → **Site URL:** `https://mojkrok.sk`
  - **Redirect URLs** (Add URL): `https://mojkrok.sk/**` a `http://localhost:3000/**` (dev)
  - Google provider: v Google Cloud OAuth klientovi musí byť authorized redirect `https://jobfunwpvzxsffofzhwm.supabase.co/auth/v1/callback` (zvyčajne už je).
  - Vo Verceli priradiť doménu `mojkrok.sk` k projektu (Domains) + DNS.
- [ ] 🟠 Overiť cron `vercel.json` (`/api/cron/sync-bank` o 02:00) beží na produkcii a `CRON_SECRET` sedí.
  - [x] 2026-09-04: cron volal server action `syncFioTransactions` → `requirePermission` bez session by padal. Implementácia presunutá do `src/lib/bank/fio-sync.ts` (`runFioSync`), cron ju volá priamo. Pridaná brzda 30 s (Fio limit, inak blokuje IP) + 20 s timeout fetchu.
- [ ] 🟢 Skontrolovať/vyčistiť leftover Next scaffolding v roote repa (`/package.json`, `node_modules` v roote) – appka je v `app/`.
- [ ] 🟠 Commitnúť migráciu `supabase/011_fix_function_grants.sql` do gitu (je untracked).

---

## P1 — Dôležité, ideálne pred/tesne po spustení

- [ ] 🟠 **Peňažná logika nie je atómová.** `matchTransaction` (`banka/actions.ts`) označí transakciu za spárovanú, a keď zlyhá insert daru, vráti `success:true` bez záznamu daru. Zabaliť update+insert do jednej DB transakcie (RPC). Rovnako `bulkMatchAnonymous`, `bulkMatchSuggested`, `syncFioTransactions`.
- [ ] 🟠 **Race condition vo variabilnom symbole.** `generateNextVS` (`darcovia/actions.ts`) načíta všetky VS a počíta max v JS – dve súbežné registrácie dostanú rovnaký VS (rozbije bankové párovanie). Nahradiť DB sekvenciou / `max()+1` v RPC.
- [ ] 🟠 **Idempotencia importu** (`api/admin/import-xml/route.ts`): unique constraint na `entry_ref` + `upsert(onConflict)` namiesto select-then-insert; ošetriť `NtryRef=UNKNOWN_REF` (blokuje ďalšie importy); ošetriť `TxDtls` ako pole.
- [ ] 🟠 **Chybové stavy:** fetch-akcie vracajú `[]` pri chybe DB → UI ukáže „0 výsledkov" namiesto chyby. Vracať `{data, error}`. Pridať `error.tsx` a `loading.tsx` pre admin routy.
- [ ] 🟢 Skryť/vypnúť nedokončené moduly na launch (granty, kontrolór dashboard), ak nebudú hotové.

---

## P2 — Technický dlh (po spustení)

- [ ] 🟢 **Generovať Supabase typy** (`supabase gen types typescript`) + jeden zdieľaný `lib/supabase/admin.ts`. Odstráni 7× duplikovaný service-role klient a väčšinu `any`.
- [ ] 🟢 Vstupná validácia (zod) pre peňažné/identitné akcie: darca create/update, registrácia, grant submission.
- [ ] 🟢 Odstrániť duplikáty: `generateSlug()` (3×) → `lib/slug.ts`; date-range výpočty; spoločná „insert donations" funkcia pre import aj Fio sync.
- [ ] 🟢 Opraviť ESLint (246 problémov / 157 errorov, väčšinou `any`), aby mohol strážiť CI.
- [ ] 🟢 N+1 v `getSuggestedMatches` – batchovať dopyty (`.in(...)`) alebo presunúť do RPC.
- [ ] 🟢 Prvé testy okolo CAMT.053/Fio parsingu (vitest) – najprv extrahovať parsing do `lib/bank/`.
- [ ] 🟢 **Zmazať/uzamknúť deštruktívne skripty** commitnuté v repe: `scripts/clear_bank_data.ts`, `scripts/clear_may_transactions.js` (spustiteľné proti produkcii).
- [x] 🟢 `is_admin()` a ostatné SECURITY DEFINER funkcie – `SET search_path = public, pg_temp` (hardening). HOTOVO v migrácii 012.
- [x] 🔴 **Rekurzia RLS na user_roles (`42P17`)** – opravená migráciou 012 (`is_app_admin()` obchádza RLS). Zamknuté aj RBAC tabuľky (`user_roles`/`permissions`/`role_permissions`/`roles`) proti anon čítaniu. Bonus: rozbehol sa dynamický systém rolí (`useUserRole`), predtým fungoval len legacy `admin_users`. Overené naživo.
- [ ] 🟢 Centralizovať Gemini model ID do env (`gemini-1.5-*` je hardcoded a zastaraný rad).
- [x] 🟢 **Sanitizácia `.or()` / `.ilike` filtrov** – HOTOVO. `src/lib/search.ts` (`sanitizeSearchTerm`/`sanitizeFilterValue`) aplikované v `banka/actions.ts` (3×) a `darcovia/page.tsx`. Odstraňuje PostgREST rezervované znaky + wildcardy zo vstupu.
- [x] 🟢 Znížiť logovanie PII – čiastočne HOTOVO. `profil/actions.ts` už neloguje e-maily/ID (len chybové `.message`). `kontakt/actions.ts` ponechané zámerne – je to jediný záznam správy (viď nižšie).
- [x] 🟠 **Kontaktný formulár ukladá správy do DB** – HOTOVO a overené naživo. Migrácia 013 (`contact_messages`, admin-only RLS) spustená; anon nemá prístup, service-role zápis funguje. Akcia ukladá cez service_role + rate-limit 5/hod/IP, PII logovanie odstránené.
  - [ ] 🟢 Follow-up: admin stránka na čítanie správ (zatiaľ viditeľné cez Supabase dashboard) + neskôr e-mail notifikácia (Brevo).
- [ ] 🟢 Accessibility: `htmlFor` na labeloch, `aria-label` na icon-only tlačidlách.

---

## Poznámka
Body **P0 → Bezpečnosť** a **P0 → Prihlásenie/Deploy** sú nutné pred verejným spustením:
kým autorizácia žije len na klientovi, ktokoľvek prihlásený sa vie stať adminom a čítať dáta darcov.
Migrácia 011 zavrela priamy únik cez anon kľúč; server-action autorizácia je ďalší nutný krok.


## Online platby – Mollie (implementované 2026-09-04)
Stav: kód hotový, `tsc` + `next build` OK, migrácia `supabase/021_online_payments.sql` spustená v DB, testovací kľúč overený (test platba vytvorená). Zatiaľ NECOMMITNUTÉ.
- Kód: `src/lib/mollie/{client,process-payment}.ts`, `src/app/api/mollie/webhook/route.ts`, `src/app/(public)/platby/actions.ts`, `/dakujeme`, `/admin/platby`, `components/public/OnlineDonationForm.tsx`.
- Env: `MOLLIE_MODE=test|live`, `MOLLIE_API_KEY_TEST`, `MOLLIE_API_KEY_LIVE`, `NEXT_PUBLIC_BASE_URL` (lokálne nastavené v `.env.local`).
- [x] 🔴 E2E na localhoste – HOTOVO (2026-09-04): jednorazový dar 10 € kartou → `/dakujeme` → `donations` (`card_online`), viditeľné v `/admin/platby`.
- [x] 🔴 Pravidelný dar – HOTOVO (2026-09-04): 15 € → Mollie subscription so startDate +1 mesiac; zmena výšky na 20 € (staré zrušené po úspešnej platbe nového); neúspešná prvá platba správne bez daru aj bez predplatného. Zrušenie z profilu tlačidlom ešte neodkliknuté, ide cez tú istú funkciu ako zmena výšky.
- [ ] 🟠 Po nasadení na doménu: do Vercel pridať `MOLLIE_MODE`, `MOLLIE_API_KEY_TEST`/`MOLLIE_API_KEY_LIVE`, `NEXT_PUBLIC_BASE_URL=https://mojkrok.sk`; webhook sa posiela automaticky na `/api/mollie/webhook`. Prepnúť na `live` až po produkčnom teste.
- [x] 🟠 Mollie metódy – HOTOVO: karta, Apple Pay, Google Pay zapnuté a schválené.
- [x] 🟠 Banka: payout z Mollie – HOTOVO (2026-09-04): migrácia 022 (`transaction_category` + `mollie_payout`), detekcia `src/lib/bank/mollie-payout.ts` (názov/správa obsahuje „Mollie“, voliteľne env `MOLLIE_PAYOUT_IBANS`). Fio sync aj XML import payout označia, ručné/hromadné/navrhované párovanie ho odmietne, v Banke má badge. ⏳ Po prvej reálnej výplate overiť, že sa rozpoznala (ak nie, doplniť IBAN do env).
- [ ] 🟢 E-mail potvrdenie daru (Brevo) – teraz žiadny e-mail neposielame, darca vidí stav na `/dakujeme` a v profile.
- [x] 🟢 Homepage IBAN v modáli – HOTOVO (2026-09-04): reálny IBAN `SK04 8330 0000 0029 0168 8673`, VS sa berie z profilu prihláseného darcu (`getMyDonorVariableSymbol`), neprihlásený dostane odkaz na registráciu. QR kód je reálny PAY by square (`src/lib/bank/pay-by-square.ts`, knižnice `bysquare` + `qrcode`): verzia štandardu v hlavičke 1.0.0 – jediná, ktorú bankové appky akceptujú (1.2.0 = default knižnice v4, ani 1.1.0 ČSOB/Fio neprečítali; Fio hlási 'Nepodporovaná verzia BySquare QR kódu', bysquare issue #9). Výstup je bajt po bajte zhodný s bysquare v2, ktorá roky fungovala v produkcii, oba typy daru ako bežný platobný príkaz (trvalý príkaz z QR banky nepodporujú – prepínač `USE_STANDING_ORDER`), tichá zóna 3 moduly. QR aj v profile (karta Podporiť). ✅ Overené skenom v ČSOB (2026-09-04). Príjemca: Pastoračný fond Žilinskej diecézy.- zemn na SK0483300000002901688673 a  vs aky ma v profile

## Pripomienky 
- [x] clánky moznot pridať poradie - nie len podľa dátumu ale ako pripnutie clánku + poradie 
- [x]Na stiahnutie výročná správa
- [x] https://mojkrok.dcza.sk/podporene-projekty/ Projekty

## Výzvy na podporu – admin + DB (implementované 2026-09-14)
Návrh a rozhodnutia: `krok_navrh_vyzvy.md`. Stav: `tsc` + `next build` OK, migrácia `supabase/023_project_campaigns.sql` spustená v DB. NECOMMITNUTÉ.
- DB: `projects` rozšírená (perex, TipTap obsah, video, príjemca, garant, farnosť, legacy VS + legacy suma/darcovia, Mollie nastavenia), nové `project_media`, `project_budget_items`, `project_milestones`, `posts.project_id`, pohľad `v_project_stats` + RPC `get_project_stats`, oprávnenie `manage_projects`. Údaje 4 výziev zo starého webu doplnené, `moj-krok` a `dve-percenta` skryté z webu.
- Admin: `/admin/projekty` (zoznam s progress barom), `/admin/projekty/novy`, `/admin/projekty/[id]` so záložkami Základné · Obsah · Financie · Rozpočet · Galéria a dokumenty · Harmonogram · Správy · Dary. Kód: `src/app/admin/projekty/actions.ts`, `src/components/admin/projects/*`, typy `src/lib/projects/types.ts`. Články majú výber „Súvisiaca výzva“.
- [x] 🔴 Admin otestovaný v prehliadači (2026-09-14, pridaná škola).
- [x] 🔴 Mollie na stránke výzvy – HOTOVO (2026-09-14): `components/public/ProjectDonationWidget.tsx` (bez prihlásenia, jednorazovo/mesačne, sumy z `suggested_amounts`, bankový prevod so ŠS + QR ako doplnok). `startOnlineDonation` overí, že výzva je zverejnená, aktívna, pred termínom a povoľuje typ daru; `replaceSubscriptionId` len s rovnakým `project_id`. Popis platby „Dar – KROK – <výzva>“, predplatné „Pravidelný mesačný dar – Pastoračný fond KROK – <výzva>“. `MyOnlineSubscription` nesie `project_id/name/slug`; profil aj modál na domovskej nahrádzajú len všeobecné predplatné, výzvové ukazujú s odkazom. `/dakujeme` zobrazí názov výzvy a tlačidlo späť na ňu.
  - [ ] ⏳ Otestovať v Mollie test režime: jednorazový + mesačný dar na výzvu bez prihlásenia aj s prihlásením (dar musí pribudnúť do záložky Dary výzvy a počítadlo sa zvýšiť); darca so všeobecným predplatným pridá výzvové (obe ostanú aktívne).
- [x] 🔴 Verejná stránka – HOTOVO (2026-09-14): `/vyzvy` (filtre podľa kategórie, sekcie Otvorené / Po termíne / Podarilo sa), `/vyzvy/[slug]` (hero video/obrázok, počítadlo, widget, popis, rozpočet, harmonogram, galéria pred/počas/po, videá, správy, dokumenty, garant/príjemca, zdieľanie, OG metadata). Dáta: `src/lib/projects/public.ts`. Domovská: sekcia „Aktuálne výzvy“ (`FeaturedProjects`, len výzvy s `featured = true`). NavBar + Footer odkaz „Výzvy“. Redirecty `/grantove-vyzvy/*` → `/vyzvy/*` v `next.config.ts` (platia, keď bude stará doména smerovať na nový web).
  - [ ] 🟠 Zapnúť `featured` aspoň jednej výzve v admine, inak sa sekcia na domovskej nezobrazí.
- [x] 🟠 Bankový prevod – HOTOVO (2026-09-14): `pay-by-square.ts` + `getPaymentQrCode` majú `specificSymbol`; Fio sync a XML import: ak VS nesedí s darcom, ale sedí s `projects.legacy_variable_symbol`, dar sa zapíše k výzve cez systémového darcu „Anonymný darca“ (`donors.legacy_id = ANONYMOUS_DONOR`, migrácia 024 spustená; pohľad `v_project_stats` počíta anonymné dary po jednom). Kód `src/lib/bank/legacy-project-vs.ts`.
  - [ ] ⏳ Po prvom reálnom synce overiť, že platba s VS 1177xxxx skončila ako dar k výzve.
- [ ] 🟢 Zmazať `src/components/admin/projects/ProjectDialog.tsx` (už len re-export, auto režim nepovolil rm).
- [ ] 🟢 Pri ukončení výzvy: zoznam predplatných naviazaných na ňu pre admina (neukončovať automaticky).

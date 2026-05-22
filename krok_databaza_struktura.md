# KROK - Pastoračný fond Žilinskej diecézy
## Návrh štruktúry a parametrov

Tento dokument slúži na definíciu štruktúry dát, ktorá kombinuje aktuálny stav z webovej stránky (WordPress) a databázu darcov (FileMaker). Bude slúžiť ako zadanie pre vytvorenie databázy v [Supabase](https://supabase.com/).

---

### 1. Časť: Štruktúra z webu (WordPress / mojkrok.dcza.sk)

Z existujúcej stránky sme identifikovali nasledovné hlavné subjekty a sekcie, ktoré bude dôležité zohľadniť v novej aplikácii:

#### A. Grantové výzvy / Podporené projekty
*   **Lectio divina**
*   **Diecézna animátorská škola**
*   **S farskou charitou bližšie k vám**
*   **„Chodíme spolu…“**
*   *Atribúty (návrh):* Názov projektu, popis, url odkaz, stav (aktívny/ukončený), kategória.

#### B. Oblasti podpory
*   Predevanjelizačná a evanjelizačná
*   Katechizačná a formačná
*   Vytváranie a rozvoj menších kresťanských spoločenstiev
*   Vytváranie a rozvoj rôznych foriem služby
*   Podpora živého liturgického slávenia
*   Práca s verejnosťou

#### C. Možnosti a formy darovania
*   Darovať anonymne (cez 24-pay)
*   2% z dane
*   Mesačná podpora / Jednorazová podpora (registrovaný darca)

#### D. Súťaže a iniciatívy
*   Súťaž: TVOJ KROK, TVOJA KNIHA (Aktuálne bežiace akcie)

#### E. Používatelia a registrácia
*   Darcovia a podporovatelia (prihlasovanie linkuje na *aplikacia.org/fmi/webd/krok* - toto nahradíme)

---

### 2. Časť: Dáta z FileMaker (Doplňte svoje parametre)

*(Prosím, rozpíšte nižšie všetky polia a parametre, ktoré momentálne evidujete vo FileMakeri pre darcov a párovanie banky. Toto nám pomôže vytvoriť presné SQL tabuľky v Supabase.)*

#### A. Databáza darcov (Používatelia)
*Tu vypíšte, aké údaje si o darcoch ukladáte:*
- Meno
- Priezvisko
- E-mail
- Telefón
- Adresa (Ulica, Mesto, PSČ)
- Variabilný symbol (pre párovanie platieb)
- Dátum registrácie
- Farnosť?
- ... *(doplňte)* ...

#### B. Bankové transakcie a párovanie
*Akým spôsobom evidujete platby:*
- ID transakcie
- Suma
- Mena (EUR)
- Dátum prijatia platby
- Informácia pre prijímateľa
- Účet odosielateľa (IBAN)
- Priradený darca (Cudzí kľúč)
- ... *(doplňte)* ...

#### C. Parametre na párovanie (Logika)
*Ako presne prebieha párovanie v aktuálnom riešení? (Automatický import cez API z banky, manuálny import .csv z výpisu, výpočet variabilného symbolu podľa ID darcu atď.)*
- ... *(popíšte logiku)* ...

#### D. Ďalšie špecifiká FileMakeru
*Máte tam aj nejaké iné evidencie (napr. zasielanie newsletterov, poznámky k darcom a pod.)?*
- ... *(doplňte)* ...

---

### 3. Technologický Stack (Prehľad pre novú aplikáciu)
- **Frontend / Backend-End:** Next.js (React)
- **Databáza & Back-end as a Service:** Supabase (správa používateľov, PostgreSQL)
- **Hosting:** Vercel
- **Styling:** Tailwind CSS (ak sa použije) alebo Vanilla CSS pre maximálnu flexibilitu a rýchlosť.
- **Budúce rozšírenie:** React Native (pre iOS a Android)

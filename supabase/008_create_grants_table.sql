-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia: Zriadenie modulu dynamických formulárov, rolí a workflow
-- ============================================================

-- 1. Tabuľka rolí pre grantový modul s podporou viacerých rolí na používateľa (zložený primárny kľúč)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'kontrolor', 'zadavatel')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, role)
);

-- RLS pre tabuľku rolí
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_select_public" ON public.user_roles;
CREATE POLICY "roles_select_public" ON public.user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "roles_all_admin" ON public.user_roles;
CREATE POLICY "roles_all_admin" ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrator')
);

-- 2. Tabuľka šablón formulárov (Žiadosti, Záverečné správy, atď.)
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                             -- napr. "Žiadosť o schválenie projektu 2025/2026"
  slug TEXT UNIQUE NOT NULL,                       -- napr. "ziadost-cesty-obnovy-2025"
  description TEXT,                                -- Úvodné pokyny k výzve
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,       -- Zoznam polí (id, typ, label, required, placeholder, options)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabuľka odoslaných odpovedí (Submissions)
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL, -- Prepojenie so schváleným projektom
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,         -- Zadávateľ projektu (žiadateľ)
  
  -- Odoslané hodnoty a súbory
  data JSONB NOT NULL DEFAULT '{}'::jsonb,         -- Odoslané dáta (klúč: hodnota)
  files JSONB NOT NULL DEFAULT '[]'::jsonb,        -- Zoznam URL príloh nahraných na Backblaze B2
  signature_url TEXT,                              -- URL podpisu nahraného na B2
  
  -- Workflow stav prihlášky
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',                      -- Rozpracovaný koncept (editovateľný zadávateľom)
    'submitted',                  -- Podaný projekt (žiadosť odoslaná)
    'returned_for_changes',       -- Vrátený na doplnenie (editovateľný zadávateľom, prechádza do draftu)
    'accepted_for_evaluation',    -- Prijatý na hodnotenie (viditeľný pre kontrolóra)
    'evaluated',                  -- Hodnotený kontrolórom
    'approved',                   -- Schválený adminom (pridelená suma a vytvorený projekt)
    'rejected'                    -- Neschválený adminom
  )),
  
  -- Hodnotenie kontrolórom (Kontrolór projektu)
  assigned_evaluator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Priradený kontrolór
  evaluation_rating INTEGER CHECK (evaluation_rating >= 1 AND evaluation_rating <= 10), -- Kvalita (1 až 10)
  evaluation_notes TEXT,                          -- Posudok kontrolóra
  evaluated_at TIMESTAMPTZ,                       -- Dátum ohodnotenia
  
  -- Pridelenie administratívou
  variable_symbol TEXT UNIQUE,                     -- VS pridelený adminom
  specific_symbol TEXT,                            -- ŠS pridelený adminom
  approved_amount DECIMAL(12,2),                   -- Hodnota schváleného príspevku
  admin_notes TEXT,                                -- Interné poznámky administrátora
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexy pre bleskové dopyty
CREATE INDEX IF NOT EXISTS idx_forms_slug ON public.forms(slug);
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON public.form_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_evaluator ON public.form_submissions(assigned_evaluator_id);

-- RLS Zabezpečenie
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Helper: Pomocné funkcie pre kontrolu rolí v RLS
CREATE OR REPLACE FUNCTION grants_has_role(req_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE id = auth.uid() AND role = req_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politiky pre public.forms
DROP POLICY IF EXISTS "forms_select_active" ON public.forms;
CREATE POLICY "forms_select_active" ON public.forms 
  FOR SELECT USING (status = 'active' OR grants_has_role('administrator'));

DROP POLICY IF EXISTS "forms_all_admin" ON public.forms;
CREATE POLICY "forms_all_admin" ON public.forms 
  FOR ALL USING (grants_has_role('administrator'));

-- Politiky pre public.form_submissions
-- 1. ADMINISTRÁTOR: Plný prístup (čítanie, úprava, mazanie všetkých)
DROP POLICY IF EXISTS "submissions_admin_all" ON public.form_submissions;
CREATE POLICY "submissions_admin_all" ON public.form_submissions 
  FOR ALL USING (grants_has_role('administrator'));

-- 2. KONTROLÓR: Vidí žiadosti priradené na hodnotenie a môže ich aktualizovať (hodnotiť)
DROP POLICY IF EXISTS "submissions_evaluator_select" ON public.form_submissions;
CREATE POLICY "submissions_evaluator_select" ON public.form_submissions 
  FOR SELECT USING (
    grants_has_role('kontrolor') AND 
    (assigned_evaluator_id = auth.uid() OR status = 'accepted_for_evaluation')
  );

DROP POLICY IF EXISTS "submissions_evaluator_update" ON public.form_submissions;
CREATE POLICY "submissions_evaluator_update" ON public.form_submissions 
  FOR UPDATE USING (
    grants_has_role('kontrolor') AND assigned_evaluator_id = auth.uid()
  );

-- 3. ZADÁVATEĽ: Vidí svoje prihlášky, môže ich vytvárať a upravovať (len v stave draft alebo returned_for_changes)
DROP POLICY IF EXISTS "submissions_zadavatel_select" ON public.form_submissions;
CREATE POLICY "submissions_zadavatel_select" ON public.form_submissions 
  FOR SELECT USING (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "submissions_zadavatel_insert" ON public.form_submissions;
CREATE POLICY "submissions_zadavatel_insert" ON public.form_submissions 
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND grants_has_role('zadavatel')
  );

DROP POLICY IF EXISTS "submissions_zadavatel_update" ON public.form_submissions;
CREATE POLICY "submissions_zadavatel_update" ON public.form_submissions 
  FOR UPDATE USING (
    user_id = auth.uid() AND (status = 'draft' OR status = 'returned_for_changes')
  );

-- Triggery pre updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_forms_updated_at ON public.forms;
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_submissions_updated_at ON public.form_submissions;
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.form_submissions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Seeding: Základný formulár pre Žiadosť o projekt
INSERT INTO public.forms (title, slug, description, status, fields)
VALUES (
  'Žiadosť o schválenie projektu 2025/2026',
  'ziadost-cesty-obnovy-2025',
  'Žiadosť o schválenie projektu a jeho podporu prostredníctvom Pastoračného fondu Žilinskej diecézy pre grantovú výzvu "Cesty obnovy života a vzťahov".',
  'active',
  '[
    {"id": "organizacia_section", "type": "section", "label": "I. ŽIADATEĽ (Osoba zodpovedná za realizáciu projektu)"},
    {"id": "text_1", "type": "text", "label": "Názov organizácie:", "required": true, "width": "col-6"},
    {"id": "text_3", "type": "text", "label": "IČO:", "required": false, "width": "col-6"},
    {"id": "text_4", "type": "text", "label": "Zastúpená:", "required": true, "width": "col-12"},
    {"id": "address_heading", "type": "heading", "label": "Sídlo organizácie:", "level": 3},
    {"id": "text_10", "type": "text", "label": "Ulica:", "required": true, "width": "col-12"},
    {"id": "text_11", "type": "text", "label": "PSČ:", "required": true, "width": "col-4"},
    {"id": "text_2", "type": "text", "label": "Mesto:", "required": true, "width": "col-8"},
    {"id": "text_13", "type": "text", "label": "Telefónne číslo:", "required": true, "placeholder": "+421", "width": "col-6"},
    {"id": "email_1", "type": "email", "label": "E-mail:", "required": true, "placeholder": "@", "width": "col-6"},
    
    {"id": "projekt_section", "type": "section", "label": "II. REGISTROVANIE PROJEKTU"},
    {"id": "text_5", "type": "text", "label": "Názov projektu (max. 25 znakov):", "required": true, "max": 25, "width": "col-12"},
    {"id": "text_6", "type": "text", "label": "Garant Projektu:", "required": true, "placeholder": "Meno a priezvisko osoby zodpovednej za realizáciu", "width": "col-12"},
    {"id": "text_7", "type": "text", "label": "Číslo bankového účtu organizácie (IBAN):", "required": true, "width": "col-12"},
    {"id": "text_9", "type": "text", "label": "VS (pridelí správca fondu)", "required": false, "readonly": true, "width": "col-6"},
    {"id": "text_8", "type": "text", "label": "ŠS (pridelí správca fondu)", "required": false, "readonly": true, "width": "col-6"},
    {"id": "selectlist_1", "type": "parish_select", "label": "Farnosť:", "required": true, "placeholder": "Vyberte farnosť kde bude projekt realizovaný", "width": "col-12"},
    {"id": "selectlist_2", "type": "select", "label": "Cieľ projektovej výzvy:", "required": true, "options": [
      "Nové ohlasovanie neveriacim a tým, čo stratili kresťanskú vieru.",
      "Posilnenie komunitného života.",
      "Prehĺbenie duchovného života.",
      "Solidarita a služba blížnemu.",
      "Milosrdenstvo a odpustenie."
    ], "width": "col-12"},
    {"id": "selectlist_3", "type": "select", "label": "Typ žiadateľa:", "required": true, "options": [
      "Neformálna skupina",
      "Farnosti Žilinskej diecézy",
      "Dekanát Žilinskej diecézy",
      "Rehoľné spoločenstvo pôsobiace v Žilinskej diecéze",
      "Cirkevná škola a školské zariadenie v Žilinskej diecéze",
      "Občianske združenie",
      "Nezisková organizácia",
      "Účelové zariadenie Cirkvi"
    ], "width": "col-12"},
    
    {"id": "rozpocet_section", "type": "section", "label": "III. STANOVENIE VÝŠKY GRANTU A CELKOVÉHO ROZPOČTU"},
    {"id": "text_14", "type": "number", "label": "Suma požadovaná od Pastoračného fondu (€):", "required": true, "placeholder": "max. 1500 €", "width": "col-6"},
    {"id": "text_677666", "type": "number", "label": "Vlastné a iné zdroje (€):", "required": true, "placeholder": "spolufinancovanie min. 30%", "width": "col-6"},
    {"id": "text_15", "type": "calculated_total", "label": "Spolu na projekt (€):", "formula": "text_14 + text_677666", "readonly": true, "width": "col-12"},
    {"id": "file_1", "type": "file", "label": "Priložiť súbor \"Rozpočet projektu\":", "required": true, "accept": ".gif,.jpg,.png,.pdf,.xlsx,.xls", "placeholder": "Vzorec rozpočtu stiahnete na webe", "width": "col-12"},
    
    {"id": "detaily_section", "type": "section", "label": "IV. OBSAHOVÉ NÁLEŽITOSTI PROJEKTU"},
    {"id": "text_16", "type": "text", "label": "4. Cieľová skupina:", "required": true, "width": "col-12"},
    {"id": "text_17", "type": "text", "label": "5. S kým plánujete spolupracovať:", "required": true, "width": "col-12"},
    {"id": "date_4", "type": "date", "label": "Predpokladaný začiatok projektu:", "required": true, "width": "col-6"},
    {"id": "date_2", "type": "date", "label": "Predpokladané ukončenie projektu:", "required": true, "width": "col-6"},
    {"id": "text_20", "type": "text", "label": "7. Udržateľnosť projektu:", "required": true, "width": "col-12"},
    {"id": "text_21", "type": "text", "label": "8. Kvalitatívne ukazovatele hodnotenia projektu:", "required": true, "width": "col-12"},
    {"id": "text_19", "type": "text", "label": "9. Kvantitatívne ukazovatele hodnotenia projektu:", "required": true, "width": "col-12"},
    {"id": "textarea_1", "type": "textarea", "label": "Opis projektu:", "required": true, "placeholder": "Snažte sa v opise projektu zdôrazniť jeho jedinečnosť a prínos (max 1800 znakov)...", "rows": 10, "max": 1800, "width": "col-12"},
    
    {"id": "prilohy_section", "type": "section", "label": "V. PRÍLOHY (DOPLŇUJÚCE DOKUMENTY)"},
    {"id": "file_2", "type": "file", "label": "Priložiť súbor - ilustračná fotografia (min. 350x180 px):", "required": false, "accept": ".gif,.jpg,.png", "width": "col-12"},
    {"id": "file_4", "type": "file", "label": "Štatút organizácie (ak je relevantné):", "required": false, "accept": ".gif,.jpg,.png,.pdf,.xlsx,.xls,.doc,.docx", "width": "col-12"},
    {"id": "file_5", "type": "file", "label": "Pri neformálnej skupine kópia OP:", "required": false, "accept": ".gif,.jpg,.png,.pdf,.xlsx,.xls,.doc,.docx", "width": "col-12"},
    {"id": "file_3", "type": "file", "label": "Pri PO kópia IČO, prípadne zriaďovaciu listinu:", "required": false, "accept": ".gif,.jpg,.png,.pdf,.xlsx,.xls,.doc,.docx", "width": "col-12"},
    
    {"id": "podpis_section", "type": "section", "label": "VI. POTVRDENIE A DIGITÁLNY PODPIS"},
    {"id": "text_18", "type": "text", "label": "Miesto podpisu (V):", "required": true, "placeholder": "napr. Žiline", "width": "col-6"},
    {"id": "date_3", "type": "date", "label": "Dňa:", "required": true, "width": "col-6"},
    {"id": "signature_1", "type": "signature", "label": "Elektronický podpis žiadateľa (nakreslite prstom/myšou):", "required": true, "width": "col-12"},
    {"id": "checkbox_1_0", "type": "checkbox", "label": "Súhlasím so spracovaním osobných údajov (Zásady ochrany osobných údajov Pastoračného fondu KROK)", "required": true, "width": "col-12"}
  ]'::jsonb
) ON CONFLICT (slug) DO UPDATE 
SET fields = EXCLUDED.fields, description = EXCLUDED.description;

-- Seeding: Základný formulár pre Záverečnú správu
INSERT INTO public.forms (title, slug, description, status, fields)
VALUES (
  'Záverečná správa projektu',
  'zaverecna-sprava-2025',
  'Tento formulár slúži na celkové záverečné vyhodnotenie a vyúčtovanie podporeného projektu z Pastoračného fondu Žilinskej diecézy.',
  'active',
  '[
    {"id": "info_section", "type": "section", "label": "I. ZÁKLADNÉ INFORMÁCIE O PROJEKTE"},
    {"id": "text_18", "type": "text", "label": "Číslo zmluvy:", "required": true, "width": "col-12"},
    {"id": "text_1", "type": "text", "label": "Názov projektu:", "required": true, "width": "col-12"},
    {"id": "text_2", "type": "text", "label": "Názov prijímateľa/organizácie:", "required": true, "width": "col-12"},
    {"id": "text_8", "type": "text", "label": "Zodpovedný garant za projekt:", "required": true, "width": "col-12"},
    {"id": "textarea_1", "type": "textarea", "label": "Adresa prijímateľa:", "required": true, "rows": 3, "width": "col-12"},
    {"id": "text_3", "type": "text", "label": "IČO (ak je relevantné):", "required": false, "width": "col-6"},
    {"id": "text_4", "type": "text", "label": "DIČ (ak je relevantné):", "required": false, "width": "col-6"},
    {"id": "text_5", "type": "text", "label": "IBAN (číslo účtu pre prípadné vrátenie/doplatok):", "required": true, "width": "col-12"},
    {"id": "text_6", "type": "text", "label": "Telefón / Mobil:", "required": true, "width": "col-6"},
    {"id": "email_1", "type": "email", "label": "E-mail:", "required": true, "width": "col-6"},
    
    {"id": "obdobie_heading", "type": "heading", "label": "Obdobie realizácie projektu:", "level": 3},
    {"id": "date_1", "type": "date", "label": "Od:", "required": true, "width": "col-6"},
    {"id": "date_2", "type": "date", "label": "Do:", "required": true, "width": "col-6"},
    
    {"id": "vyhodnotenie_section", "type": "section", "label": "II. VECNÉ VYHODNOTENIE PROJEKTU"},
    {"id": "textarea_2", "type": "textarea", "label": "Stručný priebeh projektu (čo všetko sa podarilo zrealizovať):", "required": true, "rows": 5, "width": "col-12"},
    {"id": "textarea_3", "type": "textarea", "label": "Splnenie stanovených cieľov a udržateľnosť (aký mal projekt duchovný/komunitný prínos):", "required": true, "rows": 5, "width": "col-12"},
    {"id": "text_22", "type": "text", "label": "Reálny celkový počet účastníkov:", "required": true, "width": "col-6"},
    {"id": "text_23", "type": "text", "label": "Z toho odhadovaný počet mládeže/detí:", "required": true, "width": "col-6"},
    
    {"id": "financie_section", "type": "section", "label": "III. FINANČNÉ VYÚČTOVANIE GRANTU"},
    {"id": "text_14", "type": "number", "label": "Celkové reálne náklady na projekt (€):", "required": true, "width": "col-4"},
    {"id": "text_15", "type": "number", "label": "Výška poskytnutého príspevku z PF (€):", "required": true, "width": "col-4"},
    {"id": "text_16", "type": "number", "label": "Reálne vyčerpaná suma z príspevku PF (€):", "required": true, "width": "col-4"},
    {"id": "file_1", "type": "file", "label": "Priložiť vyúčtovaciu tabuľku (zoznam dokladov + faktúry/bločky v jednom PDF/Excel):", "required": true, "accept": ".pdf,.xlsx,.xls,.zip", "width": "col-12"},
    {"id": "file_2", "type": "file", "label": "Fotodokumentácia z realizácie projektu (min. 3 fotografie, zabaliť do ZIP alebo nahrať PDF):", "required": true, "accept": ".pdf,.zip,.jpg,.png", "width": "col-12"},
    
    {"id": "podpis_section", "type": "section", "label": "IV. POTVRDENIE SPRÁVNOSTI ÚDAJOV"},
    {"id": "text_24", "type": "text", "label": "Miesto podpisu:", "required": true, "placeholder": "napr. Žiline", "width": "col-6"},
    {"id": "date_3", "type": "date", "label": "Dňa:", "required": true, "width": "col-6"},
    {"id": "signature_1", "type": "signature", "label": "Elektronický podpis zodpovedného garanta:", "required": true, "width": "col-12"},
    {"id": "checkbox_1_0", "type": "checkbox", "label": "Vyhlasujem, že všetky uvedené údaje sú pravdivé, úplné a zhodujú sa s účtovnou dokumentáciou.", "required": true, "width": "col-12"}
  ]'::jsonb
) ON CONFLICT (slug) DO UPDATE 
SET fields = EXCLUDED.fields, description = EXCLUDED.description;

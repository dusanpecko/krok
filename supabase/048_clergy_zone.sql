-- 048: Kňazská zóna (krok_navrh_farnosti.md § 15, O39–O42, O67–O69).
-- Neverejný archív dokumentov kúrie pre kňazov: kategórie (13 zo starej zóny dcza.sk, upraviteľné),
-- dokumenty s viacerými súbormi (PDF/DOCX/…) v súkromnom úložisku, fulltext v texte súborov,
-- stav aktuálne / archív, e-mail kňazom pri zverejnení (prepínač). Čítanie aj zápis len cez server.

-- 1. Kategórie --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clergy_doc_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.clergy_doc_categories (slug, name, sort_order) VALUES
  ('dokumenty', 'Dokumenty', 10),
  ('statuty-a-zmluvy', 'Štatúty a zmluvy', 20),
  ('obezniky', 'Obežníky', 30),
  ('formulare', 'Formuláre', 40),
  ('ekonomicky-manual', 'Ekonomický manuál', 50),
  ('liturgia', 'Liturgia', 60),
  ('birmovky', 'Birmovky', 70),
  ('exorcizmus', 'Exorcizmus', 80),
  ('homilie', 'Homílie', 90),
  ('katecheza', 'Katechéza', 100),
  ('hospodarenie-diecezy', 'Hospodárenie diecézy', 110),
  ('ochrana-osobnych-udajov', 'Ochrana osobných údajov', 120),
  ('darujem', 'Darujem', 130)
ON CONFLICT (slug) DO NOTHING;

-- 2. Dokumenty --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clergy_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.clergy_doc_categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  doc_number TEXT,                            -- napr. číslo obežníka „3/2026“
  issued_on DATE,                             -- dátum vydania
  summary TEXT,                               -- krátky popis (zoznam, e-mail)
  body TEXT,                                  -- voliteľný text priamo v zóne (sanitizované HTML)
  status TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'archived')),   -- O42
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,                    -- kedy odišiel e-mail kňazom (O40)
  notified_count INT,
  search_text TEXT NOT NULL DEFAULT '',       -- normalizovaný text (bez diakritiky) – názov, číslo, popis, text, obsah súborov
  search_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', search_text)) STORED,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clergy_docs_category ON public.clergy_docs (category_id, status, issued_on DESC);
CREATE INDEX IF NOT EXISTS idx_clergy_docs_published ON public.clergy_docs (published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_clergy_docs_search ON public.clergy_docs USING GIN (search_tsv);

-- 3. Súbory (súkromné úložisko, sťahuje sa cez Krok po kontrole prístupu) -------
CREATE TABLE IF NOT EXISTS public.clergy_doc_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES public.clergy_docs(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  content_text TEXT,                          -- vytiahnutý text (PDF, DOCX) – úryvky vo výsledkoch hľadania
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clergy_doc_files_doc ON public.clergy_doc_files (doc_id, sort_order);

-- 4. Účet kňaza v zóne (O39, O68) – pozvánka z registra --------------------------
ALTER TABLE public.clergy
  ADD COLUMN IF NOT EXISTS zone_invited_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS clergy_auth_user_key ON public.clergy (auth_user_id) WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.clergy_doc_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clergy_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clergy_doc_files ENABLE ROW LEVEL SECURITY;

-- 5. Oprávnenie – dokumenty pridáva len kúria (O41) -------------------------------
INSERT INTO public.permissions (id, name, description)
VALUES ('manage_clergy_docs', 'Kňazská zóna – dokumenty', 'Pridávanie a archivácia dokumentov pre kňazov, pozvánky kňazov do zóny')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
VALUES ('administrator', 'manage_clergy_docs'), ('zamestnanec', 'manage_clergy_docs'), ('kuria', 'manage_clergy_docs')
ON CONFLICT DO NOTHING;

-- 6. E-maily (upraviteľné v /admin/emaily) ---------------------------------------
INSERT INTO public.email_templates (template_key, name, description, category, subject, body, available_variables) VALUES
(
  'clergy_zone_invite',
  'Pozvánka do kňazskej zóny',
  'Kúria pozve kňaza alebo diakona z registra kňazov (admin → Kňazi → osoba → Kňazská zóna). Obsahuje odkaz na aktiváciu a nastavenie hesla.',
  'clergy',
  'Kňazská zóna Žilinskej diecézy – prístup',
  '<p>{{salutation}},</p>
<p>dokumenty kúrie pre kňazov – obežníky, smernice, formuláre a ďalšie materiály – nájdete odteraz v <strong>kňazskej zóne</strong> na stránke mojkrok.sk. Pripravili sme pre Vás osobný prístup.</p>
<p>V kňazskej zóne môžete:</p>
<ul>
<li>prezerať a sťahovať dokumenty podľa kategórií,</li>
<li>vyhľadávať aj priamo v texte obežníkov a smerníc,</li>
<li>nájsť aj staršie, archivované dokumenty.</li>
</ul>
<p>O každom novom dokumente Vám pošleme krátky e-mail.</p>
<p>Prístup aktivujete kliknutím na odkaz a nastavením hesla:</p>
<p><a href="{{invite_url}}">Aktivovať prístup do kňazskej zóny</a></p>
<p>Odkaz platí obmedzený čas. Ak už nefunguje, napíšte nám a pošleme Vám nový. Prihlasovať sa budete e-mailom <strong>{{email}}</strong> a heslom.</p>
<p>V prípade otázok nás kontaktujte na <a href="mailto:mojkrok@dcza.sk">mojkrok@dcza.sk</a>.</p>
<p>S úctou</p>
<p>Biskupský úrad Žilina</p>',
  '["{{salutation}}", "{{invite_url}}", "{{email}}", "{{site_url}}"]'::jsonb
),
(
  'clergy_zone_granted',
  'Kňazská zóna – prístup (existujúci účet)',
  'Kňaz už má v Kroku účet (napr. účet farnosti) – k nemu sa pridá kňazská zóna, stačí sa prihlásiť.',
  'clergy',
  'Kňazská zóna Žilinskej diecézy – prístup',
  '<p>{{salutation}},</p>
<p>k Vášmu účtu na stránke mojkrok.sk sme pridali prístup do <strong>kňazskej zóny</strong> – archívu dokumentov kúrie pre kňazov (obežníky, smernice, formuláre).</p>
<p><a href="{{login_url}}">Otvoriť kňazskú zónu</a></p>
<p>Prihlasujete sa e-mailom <strong>{{email}}</strong>. Ak si heslo nepamätáte, použite na prihlasovacej stránke „Zabudli ste heslo?“.</p>
<p>S úctou</p>
<p>Biskupský úrad Žilina</p>',
  '["{{salutation}}", "{{login_url}}", "{{email}}", "{{site_url}}"]'::jsonb
),
(
  'clergy_doc_published',
  'Nový dokument v kňazskej zóne',
  'Posiela sa kňazom pri zverejnení dokumentu, ak je pri ňom zapnuté „Poslať e-mail kňazom“. Dokument sa neprikladá – odkaz vedie do zóny (po prihlásení).',
  'clergy',
  '{{category}}: {{title}}',
  '<p>Dobrý deň,</p>
<p>v kňazskej zóne pribudol nový dokument v kategórii <strong>{{category}}</strong>:</p>
<p style="font-size:18px"><strong>{{title}}</strong>{{#doc_number}} ({{doc_number}}){{/doc_number}}</p>
{{#summary}}<p>{{summary}}</p>{{/summary}}
<p><a href="{{doc_url}}">Otvoriť dokument v kňazskej zóne</a></p>
<p>Dokument sa otvorí po prihlásení. Všetky dokumenty nájdete na <a href="{{zone_url}}">mojkrok.sk/knazska-zona</a>.</p>
<p>S úctou</p>
<p>Biskupský úrad Žilina</p>',
  '["{{category}}", "{{title}}", "{{#doc_number}}", "{{doc_number}}", "{{#summary}}", "{{summary}}", "{{doc_url}}", "{{zone_url}}", "{{site_url}}"]'::jsonb
)
ON CONFLICT (template_key) DO NOTHING;

COMMENT ON TABLE public.clergy_docs IS 'Kňazská zóna – dokumenty kúrie pre kňazov (§ 15); súbory v súkromnom úložisku';

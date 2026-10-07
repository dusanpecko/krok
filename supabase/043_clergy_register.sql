-- 043: Schematizmus kňazov – register osôb (krok_navrh_farnosti.md § 16, rozhodnutia O44–O52).
-- Nahrádza Excel „KNAZI - ZOZNAM AKTUALNY.xlsx“: kňazi, diakoni, bohoslovci, archív (odišli, zomrelí).
-- Register je hlavný zdroj pravdy o tom, kto kde pôsobí (O49). Prístup len KROK a diecéza (O46);
-- čítanie a zápis výlučne cez server (service role) – verejné politiky nie sú.

-- ------------------------------------------------------------
-- 1. Číselníky
-- ------------------------------------------------------------
ALTER TABLE public.deaneries ADD COLUMN IF NOT EXISTS code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS deaneries_code_key ON public.deaneries (code) WHERE code IS NOT NULL;
-- skratky z Excelu kúrie (BU / Bú = Biskupský úrad – nie je dekanát, ide do pôsobenia „diocese“)
UPDATE public.deaneries d SET code = v.code
FROM (VALUES ('Bytča', 'BY'), ('Čadca', 'CA'), ('Ilava', 'IL'), ('Krásno nad Kysucou', 'KRA'), ('Kysucké Nové Mesto', 'KNM'),
             ('Martin', 'MT'), ('Považská Bystrica', 'PB'), ('Púchov', 'PU'), ('Rajec', 'RA'), ('Turzovka', 'TKA'),
             ('Varín', 'VA'), ('Žilina', 'ZA')) AS v(name, code)
WHERE d.name = v.name AND d.code IS NULL;

CREATE TABLE IF NOT EXISTS public.religious_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,                 -- SDB, OP, OFMCap, SVD, MS, MSSCC…
  name TEXT
);

CREATE TABLE IF NOT EXISTS public.ordainers (   -- svätitelia (diakonát, presbyterát)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,                 -- „Ján Chryzostom Korec“
  note TEXT                                  -- funkcia (kardinál, diecézny / pomocný biskup)
);

-- ------------------------------------------------------------
-- 2. Osoba
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clergy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_number TEXT,                      -- osobné číslo – prideľuje diecéza (O50)
  category TEXT NOT NULL DEFAULT 'priest'
    CHECK (category IN ('seminarian', 'deacon', 'permanent_deacon', 'priest', 'bishop')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired', 'studying', 'left', 'deceased', 'suspended')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title_before TEXT,                         -- akademické tituly pred menom (Mgr., ThLic., ICDr.…)
  title_after TEXT,                          -- za menom (PhD., Th.D.…)
  ecclesiastical_titles TEXT[] NOT NULL DEFAULT '{}',  -- Mons., honorárny dekan, titulárny kanonik…
  salutation TEXT,                           -- Dp. | Vdp. | Vsdp. | Mons.
  religious_order_id UUID REFERENCES public.religious_orders(id),
  -- bohoslovci (O45): ročník = rok, ktorý práve beží od nástupu (k 1. 9.) + korekcia
  seminary_entry_year SMALLINT,              -- akademický rok nástupu do 1. ročníka (2025 = 2025/2026)
  seminary_year_offset SMALLINT NOT NULL DEFAULT 0,  -- 1. ročník = propedeutický
  seminary TEXT,                             -- NR, RM (Redemptoris Mater), Rím…
  origin TEXT,                               -- „Pochádza“ (verejné, O47)
  slug TEXT,                                 -- verejná URL priezvisko-meno-funkcia (O47)
  name_day TEXT CHECK (name_day IS NULL OR name_day ~ '^\d{2}-\d{2}$'),
  birth_date DATE,
  birth_place TEXT,
  nationality TEXT,
  citizenship TEXT,
  permanent_address TEXT,
  baptism_date DATE,
  baptism_place TEXT,
  confirmation_date DATE,
  confirmation_place TEXT,
  education_secondary TEXT,
  education_university TEXT,
  theology_from SMALLINT,
  theology_to SMALLINT,
  theology_place TEXT,
  postgraduate TEXT,
  education_other TEXT,
  languages TEXT[] NOT NULL DEFAULT '{}',
  diaconate_date DATE,
  diaconate_place TEXT,
  diaconate_ordainer_id UUID REFERENCES public.ordainers(id),
  ordination_date DATE,
  ordination_place TEXT,
  ordination_ordainer_id UUID REFERENCES public.ordainers(id),
  in_diocese_from DATE,
  in_diocese_to DATE,
  death_date DATE,
  death_place TEXT,
  work_email TEXT,
  private_email TEXT,
  phones TEXT[] NOT NULL DEFAULT '{}',
  photo_url TEXT,                            -- interné (celebret) – verejne sa nezobrazuje (O47)
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- kňazská zóna (§ 15) – neskôr
  schematizmus_slug TEXT,                    -- profil na dcza.sk/sk/schematizmus/knazi/<slug>
  note TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS clergy_personal_number_key ON public.clergy (personal_number) WHERE personal_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clergy_slug_key ON public.clergy (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clergy_name ON public.clergy (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_clergy_status ON public.clergy (category, status);

-- ------------------------------------------------------------
-- 3. Pôsobenie a funkcie (história; aktuálne = date_to IS NULL)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clergy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clergy_id UUID NOT NULL REFERENCES public.clergy(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('parish', 'deanery', 'diocese', 'other')),
  role TEXT NOT NULL,                        -- farár, farský administrátor, farský vikár, výpomocný duchovný, dekan…
  parish_id UUID REFERENCES public.parishes(id) ON DELETE SET NULL,
  deanery_id UUID REFERENCES public.deaneries(id) ON DELETE SET NULL,
  organization TEXT,                         -- mimo farnosti/dekanátu (nemocnica, škola, armáda, zahraničie…)
  date_from DATE,
  date_to DATE,
  year_from SMALLINT,                        -- história zo schematizmu má často len roky
  year_to SMALLINT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clergy_assignments_clergy ON public.clergy_assignments (clergy_id);
CREATE INDEX IF NOT EXISTS idx_clergy_assignments_parish ON public.clergy_assignments (parish_id) WHERE date_to IS NULL AND year_to IS NULL;

-- ------------------------------------------------------------
-- 4. Audit zmien
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clergy_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clergy_id UUID REFERENCES public.clergy(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,                      -- clergy | assignment | import
  action TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clergy_change_log_clergy ON public.clergy_change_log (clergy_id, created_at DESC);

-- ------------------------------------------------------------
-- 5. Väzba zoznamu kňazov farnosti na register (§ 3.8 → fáza K3)
-- ------------------------------------------------------------
ALTER TABLE public.parish_clergy ADD COLUMN IF NOT EXISTS clergy_id UUID REFERENCES public.clergy(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 6. RLS – bez verejných politík (len service role)
-- ------------------------------------------------------------
ALTER TABLE public.religious_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clergy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clergy_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clergy_change_log ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 7. Oprávnenia – zatiaľ len KROK a diecéza (O46)
-- ------------------------------------------------------------
INSERT INTO public.permissions (id, name, description)
VALUES ('manage_clergy', 'Správa schematizmu kňazov', 'Úpravy registra kňazov, menovania a archív'),
       ('view_clergy', 'Schematizmus kňazov', 'Čítanie registra kňazov')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
VALUES ('administrator', 'manage_clergy'), ('zamestnanec', 'manage_clergy'), ('kuria', 'manage_clergy'),
       ('administrator', 'view_clergy'), ('zamestnanec', 'view_clergy'), ('kuria', 'view_clergy')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.clergy IS 'Schematizmus – register kňazov, diakonov a bohoslovcov (aj archív); zdroj pravdy o pôsobení (O49)';
COMMENT ON TABLE public.clergy_assignments IS 'Pôsobenie a funkcie kňaza – história; aktuálne = bez konca';

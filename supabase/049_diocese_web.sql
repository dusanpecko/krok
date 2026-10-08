-- 049: Web diecézy dcza.sk (krok_navrh_farnosti.md § 20, D1, O70–O73).
-- Stránky v strome (štruktúra z bety), články s kategóriami (beta + živý web za 2 roky),
-- kalendár akcií, časopis „Naša Žilinská diecéza“, menu a presmerovania starých adries.
-- Čítanie aj zápis len cez server (service role) – verejné politiky nie sú.

-- 1. Stránky (strom; path = celá adresa bez lomky na konci, napr. 'o-nas/biskup/zivotopis')
CREATE TABLE IF NOT EXISTS public.diocese_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.diocese_pages(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,                               -- sanitizované HTML
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  show_in_menu BOOLEAN NOT NULL DEFAULT true,
  source TEXT,                                -- 'beta' | 'live' | 'krok'
  source_id TEXT,                             -- id / adresa v zdroji (opakovaný import)
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_pages_parent ON public.diocese_pages (parent_id, sort_order);

-- 2. Kategórie a články
CREATE TABLE IF NOT EXISTS public.diocese_post_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.diocese_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pinned BOOLEAN NOT NULL DEFAULT false,
  source TEXT,                                -- 'beta' | 'live' | 'krok'
  source_id TEXT,
  legacy_path TEXT,                           -- napr. /sk/dokumenty/udalosti/novi-knazi… (presmerovanie)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_posts_published ON public.diocese_posts (published, published_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS diocese_posts_source_key ON public.diocese_posts (source, source_id) WHERE source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.diocese_post_category_links (
  post_id UUID NOT NULL REFERENCES public.diocese_posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.diocese_post_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- 3. Kalendár akcií (z bety: miesto, dátum od–do, čas od–do, celý deň)
CREATE TABLE IF NOT EXISTS public.diocese_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT,
  place TEXT,
  starts_on DATE NOT NULL,
  ends_on DATE,
  time_from TIME,
  time_to TIME,
  all_day BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  link_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  source TEXT,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_events_date ON public.diocese_events (published, starts_on);

-- 4. Časopis „Naša Žilinská diecéza“
CREATE TABLE IF NOT EXISTS public.diocese_magazine_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  issue_number TEXT,                          -- napr. '05/2026'
  sort_index INT NOT NULL DEFAULT 0,          -- napr. 202605
  description TEXT,
  cover_url TEXT,
  pdf_url TEXT,
  link_url TEXT,                              -- e-časopis na Zachej.sk
  published BOOLEAN NOT NULL DEFAULT true,
  source TEXT,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Menu (strom položiek – stránka alebo ľubovoľný odkaz)
CREATE TABLE IF NOT EXISTS public.diocese_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.diocese_menu_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true
);

-- 6. Presmerovania starých adries (/sk/dokumenty/… → nová adresa), O73
CREATE TABLE IF NOT EXISTS public.diocese_redirects (
  from_path TEXT PRIMARY KEY,
  to_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diocese_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_post_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_magazine_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_redirects ENABLE ROW LEVEL SECURITY;

-- 7. Oprávnenie – web diecézy spravuje kúria (D3)
INSERT INTO public.permissions (id, name, description)
VALUES ('manage_diocese_web', 'Web diecézy', 'Stránky, články, akcie, časopis a menu webu dcza.sk')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
VALUES ('administrator', 'manage_diocese_web'), ('zamestnanec', 'manage_diocese_web'), ('kuria', 'manage_diocese_web')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.diocese_posts IS 'Web dcza.sk – články (beta + živý web za 2 roky, O70, O73)';

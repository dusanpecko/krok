-- 052: Pomoc – návody na použitie pre zónu farnosti (/moja-farnost/pomoc) a administráciu (/admin/pomoc).
-- Texty upravuje diecéza v admine (/admin/pomoc/sprava, oprávnenie manage_help); len slovenčina.
-- Čítajú sa na serveri cez service role po overení prístupu (zóna farnosti = riadok v parish_users, admin = rola).
-- Odkazy „?“ pri záložkách a sekciách vedú na /…/pomoc/<slug> – slug sa preto po zverejnení nemá meniť.

CREATE TABLE IF NOT EXISTS public.help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone TEXT NOT NULL CHECK (zone IN ('parish', 'admin')),
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title TEXT NOT NULL,
  summary TEXT,                              -- jedna veta do zoznamu návodov
  content TEXT NOT NULL DEFAULT '',          -- HTML z editora (sanitizované pri uložení)
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (zone, slug)
);
CREATE INDEX IF NOT EXISTS idx_help_articles_zone ON public.help_articles (zone, sort_order);

-- bez politík: anon/authenticated nevidia nič, číta a zapisuje len server (service role)
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

INSERT INTO public.permissions (id, name, description)
VALUES ('manage_help', 'Pomoc – návody', 'Úprava návodov na použitie pre zónu farnosti a administráciu')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
VALUES ('administrator', 'manage_help'), ('zamestnanec', 'manage_help')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.help_articles IS 'Pomoc – návody na použitie (zóna farnosti, admin); úprava v /admin/pomoc/sprava';

-- 051: Kúria, rady a komisie (schematizmus, web dcza.sk).
-- Orgán = úrad kúrie, rada, komisia alebo pastoračný úsek. Členovia:
--   • kňazi a diakoni z registra – menovanie v clergy_assignments s body_id (zobrazí sa aj v profile kňaza),
--   • ostatní (laici, rehoľníci mimo registra) – diocese_body_members.

CREATE TABLE IF NOT EXISTS public.diocese_bodies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_genitive TEXT,                        -- „Presbyterskej rady“ → funkcia „člen Presbyterskej rady“
  kind TEXT NOT NULL DEFAULT 'rada' CHECK (kind IN ('kuria', 'rada', 'usek')),
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_bodies_order ON public.diocese_bodies (kind, sort_order);

ALTER TABLE public.clergy_assignments ADD COLUMN IF NOT EXISTS body_id UUID REFERENCES public.diocese_bodies(id) ON DELETE SET NULL;
ALTER TABLE public.clergy_assignments ADD COLUMN IF NOT EXISTS body_role TEXT;   -- funkcia v orgáne (predseda, tajomník, člen…)
CREATE INDEX IF NOT EXISTS idx_clergy_assignments_body ON public.clergy_assignments (body_id) WHERE body_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.diocese_body_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_id UUID NOT NULL REFERENCES public.diocese_bodies(id) ON DELETE CASCADE,
  title_before TEXT,
  first_name TEXT,
  last_name TEXT NOT NULL,
  title_after TEXT,
  affiliation TEXT,                          -- napr. „laik“, „rehoľná sestra“, „SDB“
  body_role TEXT NOT NULL DEFAULT 'člen',
  date_from DATE,
  date_to DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diocese_body_members_body ON public.diocese_body_members (body_id) WHERE date_to IS NULL;

ALTER TABLE public.diocese_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diocese_body_members ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.diocese_bodies IS 'Kúria, rady, komisie a pastoračné úseky diecézy – schematizmus a web dcza.sk';
COMMENT ON TABLE public.diocese_body_members IS 'Členovia orgánov mimo registra kňazov (laici, rehoľníci); kňazi sú v clergy_assignments.body_id';

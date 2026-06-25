-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia: Zavedenie matice oprávnení pre dynamické roly (RBAC)
-- ============================================================

-- 1. Vytvorenie tabuľky pre definície oprávnení
CREATE TABLE IF NOT EXISTS public.permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pre tabuľku permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions_select_public" ON public.permissions;
CREATE POLICY "permissions_select_public" ON public.permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "permissions_all_admin" ON public.permissions;
CREATE POLICY "permissions_all_admin" ON public.permissions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrator')
);

-- 2. Vytvorenie prepájacej tabuľky pre roly a oprávnenia
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id TEXT REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  permission_id TEXT REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- RLS pre tabuľku role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_select_public" ON public.role_permissions;
CREATE POLICY "role_permissions_select_public" ON public.role_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "role_permissions_all_admin" ON public.role_permissions;
CREATE POLICY "role_permissions_all_admin" ON public.role_permissions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrator')
);

-- 3. Naplnenie základných systémových oprávnení
INSERT INTO public.permissions (id, name, description) VALUES
  ('view_donors', 'Zobrazenie darcov', 'Prístup k zoznamu darcov a detailom o ich daroch.'),
  ('view_bank', 'Zobrazenie banky', 'Prístup k bankovému modulu a prehľadu transakcií.'),
  ('import_bank', 'Import výpisov', 'Možnosť nahrávať a importovať bankové XML výpisy.'),
  ('view_grants', 'Správa grantov', 'Prístup k prehľadu a správe projektových žiadostí.'),
  ('grade_grants', 'Hodnotenie grantov', 'Prístup k posudzovaniu a hodnoteniu projektov kontrolórmi.'),
  ('manage_roles', 'Správa rolí', 'Možnosť priraďovať roly používateľom a spravovať oprávnenia.'),
  ('manage_config', 'Správa konfigurácie', 'Prístup k nastaveniam projektov, farností a dekanátov.')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 4. Predvolené priradenie oprávnení rolám
-- Administrátor dostane všetky oprávnenia
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'administrator', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- Kontrolór dostane hodnotenie a prehľad grantov
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('kontrolor', 'view_grants'),
  ('kontrolor', 'grade_grants')
ON CONFLICT DO NOTHING;

-- Žiadateľ dostane prehľad grantov (pre prácu s vlastnými žiadosťami)
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('zadavatel', 'view_grants')
ON CONFLICT DO NOTHING;

-- Kúria dostane zobrazenie darcov, banky a grantov pre celkový prehľad
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('kuria', 'view_donors'),
  ('kuria', 'view_bank'),
  ('kuria', 'view_grants')
ON CONFLICT DO NOTHING;

-- Zamestnanec úradu dostane prístup k darcom a banke
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('zamestnanec', 'view_donors'),
  ('zamestnanec', 'view_bank')
ON CONFLICT DO NOTHING;

-- 5. Pomocný pohľad (View) na získanie všetkých oprávnení používateľa
CREATE OR REPLACE VIEW public.v_user_permissions 
WITH (security_invoker = true) AS
SELECT DISTINCT
  ur.id AS user_id,
  rp.permission_id
FROM public.user_roles ur
JOIN public.role_permissions rp ON rp.role_id = ur.role;


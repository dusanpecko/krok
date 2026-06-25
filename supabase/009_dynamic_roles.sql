-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migrácia: Zavedenie tabuľky pre dynamické roly a prepojenie s user_roles
-- ============================================================

-- 1. Vytvorenie tabuľky pre dynamické roly
CREATE TABLE IF NOT EXISTS public.roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Naplnenie počiatočných systémových rolí
INSERT INTO public.roles (id, name, description, is_system) VALUES
  ('administrator', 'Administrátor', 'Úplný prístup k správe systému a nastaveniam.', true),
  ('kontrolor', 'Kontrolór', 'Prístup k hodnoteniu projektov a schvaľovaniu správ.', true),
  ('zadavatel', 'Žiadateľ', 'Prístup k vytváraniu a podávaniu grantových žiadostí.', true),
  ('farnost', 'Farnosť', 'Prístup pre lokálne farnosti k správe svojich údajov a darov.', false),
  ('zamestnanec', 'Zamestnanec biskupského úradu', 'Prístup pre úradníkov a referentov k príslušným agendám.', false),
  ('kuria', 'Kúria', 'Prístup pre členov biskupskej kúrie k celkovým prehľadom a schvaľovaniu.', false)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 3. Odstránenie starého check constraintu na stĺpci role v user_roles
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name 
  INTO constraint_name
  FROM information_schema.table_constraints tc 
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.table_name = 'user_roles' AND tc.constraint_type = 'CHECK' AND ccu.column_name = 'role';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.user_roles DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

-- 4. Pridanie cudzieho kľúča (Foreign Key) na stĺpec role v user_roles
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_role_fkey
FOREIGN KEY (role) REFERENCES public.roles(id)
ON UPDATE CASCADE ON DELETE CASCADE;

-- ============================================================
-- KROK – Pastoračný fond Žilinskej diecézy
-- Migration: Oprava rekurzie RLS na user_roles + hardening funkcií
-- ============================================================
--
-- PROBLÉM 1 (bug + bezpečnosť): Politiky na user_roles, permissions a
--   role_permissions obsahovali inline poddotaz:
--     EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrator')
--   Vyhodnotenie politiky NA user_roles spustí SELECT Z user_roles, čo
--   znova spustí tú istú politiku → nekonečná rekurzia (42P17). Táto chyba
--   rozbíja celý dynamický systém rolí/oprávnení (useUserRole hook aj
--   pohľad v_user_permissions vracajú prázdno – funguje len legacy admin_users).
--
-- PROBLÉM 2 (bezpečnosť – hardening): SECURITY DEFINER funkcie nemali
--   pripnutý search_path (riziko search_path injection).
--
-- PROBLÉM 3 (bezpečnosť – reconnaissance): SELECT politiky USING (true) na
--   user_roles/permissions/role_permissions sprístupňovali RBAC mapu komukoľvek.
--
-- RIEŠENIE: Bezpečný SECURITY DEFINER helper is_app_admin(), ktorý beží s
--   právami vlastníka a OBCHÁDZA RLS (žiadna rekurzia). Ním nahradíme inline
--   poddotazy v politikách. SELECT politiky zúžime na "vlastné riadky / admin"
--   resp. len prihlásených.
-- ============================================================

-- 1. Bezpečný admin-check (obíde RLS → žiadna rekurzia), s pripnutým search_path
--    LANGUAGE plpgsql (nie sql) – validácia tela sa odloží na runtime, rovnako
--    ako pri existujúcich is_admin/grants_has_role. (SQL funkcia sa validuje hneď
--    pri CREATE a v Supabase SQL editore to padne na 42P01.)
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'administrator');
END;
$$;

-- 2. Hardening existujúcich SECURITY DEFINER funkcií (pripnutý search_path)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.grants_has_role(req_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = req_role
  );
END;
$$;

-- ============================================================
-- 3. Prepis rekurzívnych politík (user_roles / permissions / role_permissions)
-- ============================================================

-- user_roles: správa len admin; čítanie len vlastné riadky alebo admin
DROP POLICY IF EXISTS "roles_all_admin" ON public.user_roles;
CREATE POLICY "roles_all_admin" ON public.user_roles
  FOR ALL USING (public.is_app_admin());

DROP POLICY IF EXISTS "roles_select_public" ON public.user_roles;
CREATE POLICY "roles_select_own_or_admin" ON public.user_roles
  FOR SELECT USING (id = auth.uid() OR public.is_app_admin());

-- permissions: správa len admin; čítanie len prihlásení
-- (v_user_permissions je security_invoker a potrebuje čítať katalóg pre neadmin roly)
DROP POLICY IF EXISTS "permissions_all_admin" ON public.permissions;
CREATE POLICY "permissions_all_admin" ON public.permissions
  FOR ALL USING (public.is_app_admin());

DROP POLICY IF EXISTS "permissions_select_public" ON public.permissions;
CREATE POLICY "permissions_select_authenticated" ON public.permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- role_permissions: správa len admin; čítanie len prihlásení
DROP POLICY IF EXISTS "role_permissions_all_admin" ON public.role_permissions;
CREATE POLICY "role_permissions_all_admin" ON public.role_permissions
  FOR ALL USING (public.is_app_admin());

DROP POLICY IF EXISTS "role_permissions_select_public" ON public.role_permissions;
CREATE POLICY "role_permissions_select_authenticated" ON public.role_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 4. roles (katalóg rolí): mal chýbať jednoznačný prístup – čítanie prihlásení,
--    zápis len admin. (roles je referencovaný FK z user_roles/role_permissions.)
-- ============================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_catalog_select_authenticated" ON public.roles;
CREATE POLICY "roles_catalog_select_authenticated" ON public.roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "roles_catalog_all_admin" ON public.roles;
CREATE POLICY "roles_catalog_all_admin" ON public.roles
  FOR ALL USING (public.is_app_admin());

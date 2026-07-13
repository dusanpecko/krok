import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

/**
 * Serverová autorizácia pre admin server actions a API routy.
 *
 * Identita používateľa sa overuje cez cookie-viazaného klienta (auth.getUser()
 * validuje JWT na strane Supabase – nedá sa sfalšovať). Roly/oprávnenia sa
 * načítavajú service-role klientom, pretože:
 *   1) service role spoľahlivo obíde rozbité (rekurzívne) RLS na user_roles,
 *   2) identita už je overená, takže čítame len práva pre KONKRÉTNE user id.
 *
 * Klientske kontroly (useUserRole, admin/layout.tsx) sú len UX – skutočná
 * ochrana musí byť tu, na serveri.
 */

// Chyby, ktoré vracajú akcie pri zlyhaní autorizácie.
export class UnauthorizedError extends Error {
  constructor() {
    super('Neprihlásený používateľ.')
    this.name = 'UnauthorizedError'
  }
}
export class ForbiddenError extends Error {
  constructor() {
    super('Nemáte oprávnenie na túto akciu.')
    this.name = 'ForbiddenError'
  }
}

// Service-role klient (len na čítanie práv – nikdy sa neposiela klientovi).
function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface UserAccess {
  isAdmin: boolean
  roles: string[]
  permissions: string[]
}

/** Vráti prihláseného používateľa alebo null. */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ?? null
}

/** Vyhodí UnauthorizedError ak nikto nie je prihlásený. */
export async function requireAuth(): Promise<User> {
  const user = await getSessionUser()
  if (!user) throw new UnauthorizedError()
  return user
}

/** Načíta roly a oprávnenia pre dané user id (service role). */
export async function getUserAccess(userId: string): Promise<UserAccess> {
  const admin = serviceClient()

  const [rolesRes, adminRes, permsRes] = await Promise.all([
    admin.from('user_roles').select('role').eq('id', userId),
    admin.from('admin_users').select('role').eq('id', userId).maybeSingle(),
    admin.from('v_user_permissions').select('permission_id').eq('user_id', userId),
  ])

  const roles = (rolesRes.data ?? []).map((r: { role: string }) => r.role)
  const permissions = (permsRes.data ?? []).map(
    (p: { permission_id: string }) => p.permission_id
  )
  const isAdmin = roles.includes('administrator') || !!adminRes.data

  return { isAdmin, roles, permissions }
}

/**
 * Vyžaduje prístup do administrácie: buď rola administrator, alebo aspoň
 * jedna priradená (pracovná) rola. Samo-registrovaný darca nemá žiadnu rolu,
 * takže je zamietnutý. Zrkadlí `hasAccess` z admin/layout.tsx.
 */
export async function requireAdmin(): Promise<{ user: User } & UserAccess> {
  const user = await requireAuth()
  const access = await getUserAccess(user.id)
  if (!access.isAdmin && access.roles.length === 0) {
    throw new ForbiddenError()
  }
  return { user, ...access }
}

/**
 * Vyžaduje konkrétne oprávnenie (napr. 'manage_roles', 'view_bank').
 * Administrátor má prístup ku všetkému.
 */
export async function requirePermission(
  permission: string
): Promise<{ user: User } & UserAccess> {
  const user = await requireAuth()
  const access = await getUserAccess(user.id)
  if (!access.isAdmin && !access.permissions.includes(permission)) {
    throw new ForbiddenError()
  }
  return { user, ...access }
}

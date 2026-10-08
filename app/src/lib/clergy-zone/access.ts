import { redirect } from 'next/navigation'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { getSessionUser, getUserAccess } from '@/lib/auth'

/**
 * Kto smie do kňazskej zóny (O39, O68): kňazi, diakoni a biskupi z registra s účtom
 * (`clergy.auth_user_id`, stav v službe / na odpočinku / štúdium), účty farností
 * (`parish_users`) a kúria (oprávnenie manage_clergy_docs alebo view_clergy). Serverový modul.
 */

export const ZONE_CATEGORIES = ['priest', 'bishop', 'deacon', 'permanent_deacon'] as const
export const ZONE_STATUSES = ['active', 'retired', 'studying'] as const

export const zoneDb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export interface ZoneAccess {
  user: User
  db: SupabaseClient
  /** meno na privítanie */
  name: string
  /** kúria – môže pridávať dokumenty (O41) */
  canManage: boolean
  via: 'clergy' | 'parish' | 'staff'
}

export async function getZoneAccess(user: User): Promise<ZoneAccess | null> {
  const db = zoneDb()
  const [access, { data: clergy }, { count: parishCount }] = await Promise.all([
    getUserAccess(user.id),
    db
      .from('clergy')
      .select('first_name, last_name, title_before, category, status')
      .eq('auth_user_id', user.id)
      .in('category', ZONE_CATEGORIES as unknown as string[])
      .in('status', ZONE_STATUSES as unknown as string[])
      .maybeSingle(),
    db.from('parish_users').select('parish_id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])
  const canManage = access.isAdmin || access.permissions.includes('manage_clergy_docs')
  const staff = canManage || access.permissions.includes('view_clergy')
  const emailName = (user.email ?? '').split('@')[0]
  if (clergy) {
    return { user, db, canManage, via: 'clergy', name: [clergy.title_before, clergy.first_name, clergy.last_name].filter(Boolean).join(' ') }
  }
  if ((parishCount ?? 0) > 0) return { user, db, canManage, via: 'parish', name: emailName }
  if (staff) return { user, db, canManage, via: 'staff', name: emailName }
  return null
}

/** Pre stránky zóny: neprihlásený → prihlásenie, bez prístupu → null (stránka zobrazí vysvetlenie). */
export async function requireZonePage(path: string): Promise<ZoneAccess | null> {
  const user = await getSessionUser()
  if (!user) redirect(`/prihlasenie?redirect=${encodeURIComponent(path)}`)
  return getZoneAccess(user)
}

/** Má používateľ kňazskú zónu? (menu účtu, presmerovanie po prihlásení) */
export async function hasZoneAccess(userId: string): Promise<boolean> {
  const db = zoneDb()
  const { count } = await db
    .from('clergy')
    .select('id', { count: 'exact', head: true })
    .eq('auth_user_id', userId)
    .in('category', ZONE_CATEGORIES as unknown as string[])
    .in('status', ZONE_STATUSES as unknown as string[])
  return (count ?? 0) > 0
}

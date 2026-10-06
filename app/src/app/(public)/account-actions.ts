'use server'

import { getSessionUser, getUserAccess } from '@/lib/auth'
import { getMyParishes, serviceDb } from '@/lib/parishes/access'

export interface AccountMenu {
  /** Krstné meno darcu (alebo začiatok e-mailu) – na tlačidlo účtu */
  displayName: string
  /** Prístup do administrácie: administrátor alebo pracovná rola (ako requireAdmin) */
  canAdmin: boolean
  /** Spravuje aspoň jednu farnosť (parish_users) → odkaz do zóny farnosti */
  hasParishZone: boolean
  /** Verejná stránka farnosti, ktorú si darca zvolil v profile */
  myParishSlug: string | null
}

/**
 * Položky menu „Môj účet“ v navigácii. Roly sa čítajú service-role klientom
 * (rovnako ako lib/auth) – len pre overeného prihláseného používateľa.
 */
export async function getAccountMenu(): Promise<AccountMenu | null> {
  const user = await getSessionUser()
  if (!user) return null

  const [access, parishes, donorRes] = await Promise.all([
    getUserAccess(user.id),
    getMyParishes(user.id),
    serviceDb().from('donors').select('first_name, parishes(slug, is_active)').eq('auth_user_id', user.id).maybeSingle(),
  ])

  const donor = donorRes.data as { first_name: string | null; parishes: { slug: string | null; is_active: boolean } | null } | null
  const parish = donor?.parishes
  const emailName = (user.email ?? '').split('@')[0]

  return {
    displayName: donor?.first_name?.trim() || emailName || 'Môj účet',
    canAdmin: access.isAdmin || access.roles.length > 0,
    hasParishZone: parishes.length > 0,
    myParishSlug: parish?.is_active && parish.slug ? parish.slug : null,
  }
}

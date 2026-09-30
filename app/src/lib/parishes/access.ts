import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

/**
 * Prístup kňaza / farnosti k vlastnej farnosti (návrh § 3.7, § 5.2).
 * Oprávnenie = riadok v parish_users (prideľuje diecéza). Serverový modul.
 */

export function serviceDb(): SupabaseClient {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export class ParishForbiddenError extends Error {
  constructor() {
    super('K tejto farnosti nemáte prístup.')
    this.name = 'ParishForbiddenError'
  }
}

export interface MyParish {
  id: string
  name: string
  official_name: string | null
  role: 'admin' | 'editor'
}

/** Farnosti, ku ktorým má používateľ prístup. */
export async function getMyParishes(userId: string): Promise<MyParish[]> {
  const { data } = await serviceDb()
    .from('parish_users')
    .select('role, parishes(id, name, official_name)')
    .eq('user_id', userId)
  return ((data ?? []) as unknown as { role: 'admin' | 'editor'; parishes: { id: string; name: string; official_name: string | null } | null }[])
    .filter((r) => r.parishes)
    .map((r) => ({ id: r.parishes!.id, name: r.parishes!.name, official_name: r.parishes!.official_name, role: r.role }))
}

/** Overí, že prihlásený používateľ spravuje farnosť; prvé použitie zapíše accepted_at. */
export async function requireParishMember(parishId: string) {
  const user = await requireAuth()
  const db = serviceDb()
  const { data } = await db.from('parish_users').select('role, accepted_at').eq('parish_id', parishId).eq('user_id', user.id).maybeSingle()
  if (!data) throw new ParishForbiddenError()
  if (!data.accepted_at) await db.from('parish_users').update({ accepted_at: new Date().toISOString() }).eq('parish_id', parishId).eq('user_id', user.id)
  return { user, role: data.role as 'admin' | 'editor', db }
}

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Výnimky z pravidla „prístup len pre @dcza.sk“ (075) – biskupi, rehoľníci, testovací účet.
 * Spravuje admin v Kňazskej zóne → Výnimky. Serverový modul (service role).
 */
export interface AccessExceptions {
  /** všetky povolené adresy mimo @dcza.sk */
  emails: Set<string>
  /** kňaz z registra → jeho adresa (má prednosť pred diecéznym e-mailom z registra) */
  byClergy: Map<string, string>
}

export async function loadAccessExceptions(db: SupabaseClient): Promise<AccessExceptions> {
  const { data, error } = await db.from('access_email_exceptions').select('email, clergy_id')
  if (error) console.error('[access-exceptions]', error.message)
  const emails = new Set<string>()
  const byClergy = new Map<string, string>()
  for (const r of data ?? []) {
    emails.add(r.email)
    if (r.clergy_id) byClergy.set(r.clergy_id, r.email)
  }
  return { emails, byClergy }
}

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Párovanie darov prevodom podľa VS výzvy zo starého webu (rad 1177xxxx).
 *
 * Na starom webe mala každá výzva vlastný variabilný symbol a darcovia si naň
 * nastavili trvalé príkazy. V Kroku VS identifikuje darcu, nie výzvu, takže by
 * tieto platby ostali nespárované. Ak VS platby nesedí so žiadnym darcom, ale
 * sedí s `projects.legacy_variable_symbol`, dar sa zapíše k výzve cez systémový
 * záznam „Anonymný darca“ (donors.legacy_id = ANONYMOUS_DONOR, založený v migrácii 024).
 */

export const ANONYMOUS_DONOR_LEGACY_ID = 'ANONYMOUS_DONOR'

/** Normalizácia VS na porovnanie: len číslice, bez úvodných núl. */
export function normalizeVs(vs: string | null | undefined): string {
  if (!vs) return ''
  const digits = String(vs).replace(/\D/g, '').replace(/^0+/, '')
  return digits
}

/** Mapa normalizovaný legacy VS → project_id. */
export async function loadProjectLegacyVsMap(admin: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const { data, error } = await admin
    .from('projects')
    .select('id, legacy_variable_symbol')
    .not('legacy_variable_symbol', 'is', null)
  if (error) {
    console.error('[bank] loadProjectLegacyVsMap:', error.message)
    return map
  }
  for (const p of (data ?? []) as { id: string; legacy_variable_symbol: string | null }[]) {
    const key = normalizeVs(p.legacy_variable_symbol)
    if (key) map.set(key, p.id)
  }
  return map
}

/** Id systémového anonymného darcu; ak neexistuje, založí ho. */
export async function getAnonymousDonorId(admin: SupabaseClient): Promise<string | null> {
  const { data: existing } = await admin
    .from('donors')
    .select('id')
    .eq('legacy_id', ANONYMOUS_DONOR_LEGACY_ID)
    .maybeSingle()
  if (existing?.id) return existing.id as string

  const { data: created, error } = await admin
    .from('donors')
    .insert({
      legacy_id: ANONYMOUS_DONOR_LEGACY_ID,
      first_name: 'Anonymný',
      last_name: 'darca',
      donor_type: 'individual',
      status: 'active',
      notes: 'Systémový záznam: dary prevodom bez známeho darcu, priradené k výzve podľa VS zo starého webu. Nemazať.',
    })
    .select('id')
    .single()
  if (error) {
    console.error('[bank] getAnonymousDonorId: založenie zlyhalo:', error.message)
    return null
  }
  return created.id as string
}

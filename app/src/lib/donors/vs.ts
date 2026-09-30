import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Pridelí nový variabilný symbol darcu – atomicky cez DB sekvenciu (migrácia 032),
 * takže dve súbežné registrácie nedostanú rovnaký VS. Klient musí byť service role.
 */
export async function allocateDonorVs(admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin.rpc('next_donor_variable_symbol')
  if (error || !data) throw new Error(`Nepodarilo sa prideliť variabilný symbol: ${error?.message ?? 'prázdna odpoveď'}`)
  return String(data)
}

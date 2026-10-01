'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { loadDonorChoiceOptions, resolveParishSlug } from '@/lib/parishes/choices'

// Service-role klient – parishes a projects majú pre anonymného návštevníka obmedzené čítanie
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Možnosti výberu pre registráciu, onboarding a profil: farnosti (bez pseudo-farností,
 * zoradené podľa mena) a zverejnené projekty. Vracia len id a názov.
 */
export async function getRegistrationFormOptions() {
  try {
    return await loadDonorChoiceOptions(supabaseAdmin)
  } catch (err) {
    console.error('Error fetching registration options:', err)
    return { parishes: [], projects: [] }
  }
}

/** Predvyplnená farnosť z odkazu /registracia?farnost=<slug> (stránka farnosti, O31). */
export async function getParishIdBySlug(slug: string | undefined | null) {
  return resolveParishSlug(supabaseAdmin, slug)
}

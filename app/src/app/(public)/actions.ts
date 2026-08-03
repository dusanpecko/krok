'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Privileged admin client to fetch statistics safely, bypassing public RLS restrictions
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface PublicStats {
  donorsCount: number
  totalAmount: number
  projectsCount: number
}

/**
 * Fetches dynamic statistics for the current year
 */
export async function getPublicStats(): Promise<PublicStats> {
  try {
    // Agregácia prebieha v DB (RPC), aby nebola obmedzená 1000-riadkovým
    // limitom PostgREST. Vracia iba súhrnné čísla za aktuálny rok.
    const { data, error } = await supabaseAdmin.rpc('get_public_stats').single()

    if (error) {
      console.error('Error fetching public stats:', error.message)
      return { donorsCount: 0, totalAmount: 0, projectsCount: 0 }
    }

    const stats = data as { donors_count: number; total_amount: number; projects_count: number }
    return {
      donorsCount: stats.donors_count || 0,
      totalAmount: Math.round(Number(stats.total_amount || 0)),
      projectsCount: stats.projects_count || 0,
    }
  } catch (error) {
    console.error('Unexpected error fetching public stats:', error)
    return {
      donorsCount: 0,
      totalAmount: 0,
      projectsCount: 0
    }
  }
}

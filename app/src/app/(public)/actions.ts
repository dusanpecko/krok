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
    const currentYear = new Date().getFullYear()
    const startOfYear = `${currentYear}-01-01`
    const endOfYear = `${currentYear}-12-31`

    // 1. Darcovia v rodine – count of distinct donor_id in matched credit transactions this year
    const { data: matchedTx, error: donorsError } = await supabaseAdmin
      .from('bank_transactions')
      .select('donor_id')
      .eq('direction', 'credit')
      .eq('matched', true)
      .gte('booking_date', startOfYear)
      .lte('booking_date', endOfYear)

    if (donorsError) {
      console.error('Error fetching donors count for stats:', donorsError)
    }

    const uniqueDonors = new Set(matchedTx?.map(tx => tx.donor_id).filter(Boolean) || [])
    const donorsCount = uniqueDonors.size

    // 2. Vyzbieraná suma – sum of amount in credit transactions this year
    const { data: creditTx, error: amountError } = await supabaseAdmin
      .from('bank_transactions')
      .select('amount')
      .eq('direction', 'credit')
      .gte('booking_date', startOfYear)
      .lte('booking_date', endOfYear)

    if (amountError) {
      console.error('Error fetching collected amount for stats:', amountError)
    }

    const totalAmount = creditTx?.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0

    // 3. Podporené projekty – count of all non-draft projects
    const { count: projectsCount, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'draft')

    if (projectsError) {
      console.error('Error counting projects for stats:', projectsError)
    }

    return {
      donorsCount: donorsCount || 0,
      totalAmount: Math.round(totalAmount), // Round to nearest euro for premium clean visual representation
      projectsCount: projectsCount || 0
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

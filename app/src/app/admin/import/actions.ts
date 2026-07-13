'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/auth'

// We use service role to bypass RLS for administrative readout of history
export async function getImportHistory() {
  await requirePermission('import_bank')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabaseAdmin
    .from('bank_import_batches')
    .select('*')
    .order('imported_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching history:', error)
    return []
  }

  return data
}

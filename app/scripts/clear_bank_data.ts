import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function clearData() {
  // Zmažeme všetky donations vytvorené z importov ("payment_method" = 'bank_transfer' alebo kde bolo matched)
  // Prípadne len vsetky kde bank_transaction_id je null a zaroven payment_method='bank_transfer'
  const { error } = await supabase.from('donations').delete().eq('payment_method', 'bank_transfer')
  console.log('Orphaned donations deleted:', error || 'OK')
}

clearData()

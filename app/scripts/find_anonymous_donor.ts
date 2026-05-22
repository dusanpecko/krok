import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findDonor() {
  const { data, error } = await supabase
    .from('donors')
    .select('id, first_name, last_name, variable_symbol')
    .eq('variable_symbol', '11770000')
    .single()

  if (error) {
    console.error('Donor not found or error:', error)
  } else {
    console.log('FOUND_DONOR:', JSON.stringify(data))
  }
}

findDonor()

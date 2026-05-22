import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function createView() {
  console.log('Creating view donors_with_stats...')
  
  const { error } = await supabase.rpc('exec_sql', {
    sql_query: \`
      CREATE OR REPLACE VIEW donors_with_stats AS
      SELECT 
        d.*,
        COALESCE((SELECT SUM(amount) FROM donations WHERE donor_id = d.id), 0) as total_donated,
        COALESCE((SELECT COUNT(*) FROM donations WHERE donor_id = d.id), 0) as donations_count,
        (SELECT MAX(donation_date) FROM donations WHERE donor_id = d.id) as last_donation_at
      FROM donors d;
      
      GRANT SELECT ON donors_with_stats TO authenticated;
      GRANT SELECT ON donors_with_stats TO service_role;
    \`
  })

  if (error) {
    console.error('Error creating view:', error)
    // If exec_sql doesn't exist, we might need another way or just do it in JS
  } else {
    console.log('View created successfully.')
  }
}

createView()

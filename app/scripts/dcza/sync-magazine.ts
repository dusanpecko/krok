/** Časopis – doplní chýbajúce čísla zo Zachej.sk (rovnaké ako tlačidlo v admine).  npx tsx scripts/dcza/sync-magazine.ts */
import { createClient } from '@supabase/supabase-js'
import { syncFromZachej } from '../../src/lib/diocese/magazine'

syncFromZachej(createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)).then((r) =>
  console.log(`pridané ${r.added.length}: ${r.added.join(', ')}\ndoplnené ${r.updated.length}: ${r.updated.join(', ')}\nchyby ${r.errors.length}: ${r.errors.join(' | ')}`)
)

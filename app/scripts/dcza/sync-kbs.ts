/** Dokumenty pápežov z kbs.sk (rovnaké ako tlačidlo v admine a denný cron).  npx tsx scripts/dcza/sync-kbs.ts */
import { createClient } from '@supabase/supabase-js'
import { syncKbsDocuments } from '../../src/lib/diocese/documents'

syncKbsDocuments(createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)).then((r) =>
  console.log(`pridané ${r.added}, aktualizované ${r.updated}\nskupiny: ${r.groups.join(', ')}\nchyby: ${r.errors.join(' | ') || '—'}`)
)

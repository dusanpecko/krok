import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/auth'
import ReportsView from '@/components/admin/clergy/ReportsView'

export const dynamic = 'force-dynamic'

/** Tlačové zostavy schematizmu kňazov. */
export default async function ReportsPage() {
  await requirePermission('view_clergy')
  const { data: deaneries } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!).from('deaneries').select('id, name').order('name')
  return <ReportsView deaneries={deaneries ?? []} />
}

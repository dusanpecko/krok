import { createClient } from '@supabase/supabase-js'
import { getClergyLabels } from '../actions'
import LabelsView from '@/components/admin/clergy/LabelsView'

export const dynamic = 'force-dynamic'

/** Adresné štítky kňazov na hromadnú poštu (§ 16.5, fáza K2) – tlač na hárok 3 × 8 (70 × 37 mm). */
export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ rozsah?: string; dekanat?: string }> }) {
  const { rozsah, dekanat } = await searchParams
  const scope = rozsah === 'vsetci' ? 'living' : 'service'
  const deaneryId = dekanat && /^[0-9a-f-]{36}$/i.test(dekanat) ? dekanat : null
  const [labels, { data: deaneries }] = await Promise.all([
    getClergyLabels(scope, deaneryId),
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!).from('deaneries').select('id, name').order('name'),
  ])
  return <LabelsView labels={labels} deaneries={deaneries ?? []} scope={scope} deaneryId={deaneryId} />
}

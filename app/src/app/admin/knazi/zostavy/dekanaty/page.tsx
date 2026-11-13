import { getDeaneryOverview } from '../actions'
import DeaneryOverviewSheet from '@/components/admin/clergy/DeaneryOverviewSheet'

export const dynamic = 'force-dynamic'

/** Prehľad dekanátov a farností – dekan, farnosti, kňazi s funkciou, rokom nástupu a fotkou (náhľad na tlač). */
export default async function DeaneryOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const deaneryId = sp.dekanat && /^[0-9a-f-]{36}$/i.test(sp.dekanat) ? sp.dekanat : null
  const deaneries = await getDeaneryOverview(deaneryId)
  return <DeaneryOverviewSheet deaneries={deaneries} title={(sp.n ?? '').trim()} />
}

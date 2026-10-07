import { getAnniversaryPeople } from '../actions'
import AnniversariesView from '@/components/admin/clergy/AnniversariesView'

export const dynamic = 'force-dynamic'

/** Výročia a meniny kňazov (§ 16.5, fáza K2). */
export default async function AnniversariesPage() {
  const people = await getAnniversaryPeople()
  return <AnniversariesView people={people} />
}

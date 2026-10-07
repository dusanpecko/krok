import { listClergy } from './actions'
import ClergyList from '@/components/admin/clergy/ClergyList'

export const dynamic = 'force-dynamic'

/** Schematizmus kňazov – zoznam (krok_navrh_farnosti.md § 16.4). */
export default async function ClergyPage() {
  const clergy = await listClergy()
  return <ClergyList clergy={clergy} />
}

import { getZoneAdminOverview } from './actions'
import ZoneAdminView from '@/components/admin/clergy-zone/ZoneAdminView'

export const dynamic = 'force-dynamic'

/** Kňazská zóna – správa dokumentov kúriou (krok_navrh_farnosti.md § 15). */
export default async function ClergyZoneAdminPage() {
  return <ZoneAdminView overview={await getZoneAdminOverview()} />
}

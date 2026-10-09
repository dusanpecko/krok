import { listBodies } from './actions'
import { BodiesList } from '@/components/admin/clergy/BodiesView'

export const dynamic = 'force-dynamic'

/** Kúria, rady a komisie – orgány diecézy a ich členovia (051). */
export default async function BodiesPage() {
  return <BodiesList bodies={await listBodies()} />
}

import { getPayoutOverview } from './actions'
import BoxPayoutsView from '@/components/admin/parishes/BoxPayoutsView'
import { isValidMonth } from '@/lib/parish-box/types'

export const dynamic = 'force-dynamic'

/** Predvolene predchádzajúci mesiac – vypláca sa po jeho skončení. */
function previousMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function ParishBoxPayoutsPage({ searchParams }: { searchParams: Promise<{ mesiac?: string }> }) {
  const { mesiac } = await searchParams
  const month = mesiac && isValidMonth(mesiac) ? mesiac : previousMonth()
  const overview = await getPayoutOverview(month)
  return <BoxPayoutsView overview={overview} />
}

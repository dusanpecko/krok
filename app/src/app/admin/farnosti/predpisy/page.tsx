import Link from 'next/link'
import { ArrowLeft, Target } from 'lucide-react'
import { getTargetsOverview } from './actions'
import TargetsView from '@/components/admin/parishes/TargetsView'

export const dynamic = 'force-dynamic'

export default async function ParishTargetsPage({ searchParams }: { searchParams: Promise<{ rok?: string }> }) {
  const { rok } = await searchParams
  const year = Number(rok) || new Date().getFullYear()
  const overview = await getTargetsOverview(year)

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <Link href="/admin/farnosti" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={16} /> Farnosti
      </Link>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-1">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Target className="w-7 h-7 text-blue-600" />
          Predpisy farností na rok
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Predpis = katolíci × koeficient. Vygenerovaný rok sa sám neprepočítava; jednotlivé predpisy sa dajú ručne upraviť s dôvodom.
        </p>
      </div>
      <TargetsView key={year} overview={overview} />
    </div>
  )
}

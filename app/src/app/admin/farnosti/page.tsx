import { Church } from 'lucide-react'
import { getDeaneryOptions, getParishesForAdmin } from './actions'
import ParishTable from '@/components/admin/parishes/ParishTable'

export const dynamic = 'force-dynamic'

export default async function ParishesAdminPage() {
  const [parishes, deaneries] = await Promise.all([getParishesForAdmin(), getDeaneryOptions()])

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-1">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Church className="w-7 h-7 text-blue-600" />
          Farnosti
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          Register farností a duchovných správ Žilinskej diecézy – úradné údaje, obce a štatistika veriacich, bohoslužby a kňazi.
        </p>
      </div>
      <ParishTable parishes={parishes} deaneries={deaneries} />
    </div>
  )
}

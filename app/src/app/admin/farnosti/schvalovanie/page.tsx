import Link from 'next/link'
import { ArrowLeft, Inbox } from 'lucide-react'
import { getChangeRequests } from '../actions'
import ChangeRequestList from '@/components/admin/parishes/ChangeRequestList'

export const dynamic = 'force-dynamic'

/** Fronta návrhov zmien od všetkých farností (návrh farností § 6.1). */
export default async function ParishApprovalsPage() {
  const requests = await getChangeRequests({ status: 'pending' })
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <Link href="/admin/farnosti" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600"><ArrowLeft size={16} /> Farnosti</Link>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Inbox className="w-7 h-7 text-blue-600" /> Na schválenie</h1>
        <p className="text-sm text-gray-500 mt-1">Návrhy zmien úradných údajov a štatistiky od farností. Po schválení sa premietnu do registra.</p>
      </div>
      <ChangeRequestList requests={requests} showParish />
    </div>
  )
}

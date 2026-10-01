import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { getSacramentTexts } from '../web-actions'
import SacramentTextsEditor from '@/components/admin/parishes/SacramentTextsEditor'

export const dynamic = 'force-dynamic'

/** Diecézne texty sviatostí – štandard pre stránky farností, farnosť si ho môže upraviť (O27). */
export default async function SacramentTextsPage() {
  const rows = await getSacramentTexts()
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <Link href="/admin/farnosti" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600"><ArrowLeft size={16} /> Farnosti</Link>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><BookOpen className="w-7 h-7 text-blue-600" /> Sviatosti – diecézne texty</h1>
        <p className="text-sm text-gray-500 mt-1">Spoločné texty „čo treba vybaviť“ pre stránky všetkých farností. Farnosť, ktorá si text upravila, má vlastnú verziu – zmena tu sa jej netýka.</p>
      </div>
      <SacramentTextsEditor rows={rows} />
    </div>
  )
}

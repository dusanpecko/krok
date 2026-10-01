import Link from 'next/link'
import { ArrowLeft, Newspaper } from 'lucide-react'
import { getRecentParishPosts } from '../web-actions'
import RecentPostsList from '@/components/admin/parishes/RecentPostsList'

export const dynamic = 'force-dynamic'

/** „Najnovšie od farností“ – následná kontrola obsahu s možnosťou stiahnuť príspevok (návrh § 4.3). */
export default async function ParishPostsAdminPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams
  const f = filter === 'stiahnute' ? 'taken_down' : 'all'
  const posts = await getRecentParishPosts(f)
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <Link href="/admin/farnosti" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600"><ArrowLeft size={16} /> Farnosti</Link>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Newspaper className="w-7 h-7 text-blue-600" /> Najnovšie od farností</h1>
        <p className="text-sm text-gray-500 mt-1">Oznamy a aktuality idú na web bez schvaľovania. Nevhodný príspevok môžete stiahnuť – farnosť ho potom sama znova nezverejní.</p>
        <div className="flex gap-2 mt-4">
          <Link href="/admin/farnosti/prispevky" className={`px-4 py-2 rounded-xl text-sm font-bold ${f === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Zverejnené</Link>
          <Link href="/admin/farnosti/prispevky?filter=stiahnute" className={`px-4 py-2 rounded-xl text-sm font-bold ${f === 'taken_down' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Stiahnuté</Link>
        </div>
      </div>
      <RecentPostsList posts={posts} />
    </div>
  )
}

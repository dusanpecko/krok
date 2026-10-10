import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, EyeOff, Plus } from 'lucide-react'
import { getSessionUser, getUserAccess } from '@/lib/auth'
import { HELP_BASE, HELP_ZONE_LABEL, listHelpArticles, type HelpZone } from '@/lib/help'

export const dynamic = 'force-dynamic'

/** Správa návodov Pomoci – obe zóny, aj skryté (oprávnenie manage_help). */
export default async function HelpAdminPage() {
  const user = await getSessionUser()
  if (!user) redirect('/prihlasenie?redirect=/admin/pomoc/sprava')
  const access = await getUserAccess(user.id)
  if (!access.isAdmin && !access.permissions.includes('manage_help')) redirect('/admin/pomoc')
  const zones: HelpZone[] = ['parish', 'admin']
  const lists = await Promise.all(zones.map((z) => listHelpArticles(z, { includeHidden: true })))

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link href="/admin/pomoc" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={15} /> Pomoc
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Správa návodov</h1>
          <p className="text-gray-500 mt-2">Návody pre zónu farnosti a administráciu. Adresu (slug) zverejneného návodu nemeňte – vedú na ňu odkazy „?“ pri záložkách.</p>
        </div>
        <Link href="/admin/pomoc/sprava/novy" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700">
          <Plus size={16} /> Nový návod
        </Link>
      </header>
      {zones.map((zone, i) => (
        <section key={zone}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-gray-900">{HELP_ZONE_LABEL[zone]}</h2>
            <Link href={HELP_BASE[zone]} className="text-sm font-bold text-blue-600 hover:underline">Zobraziť ako používateľ</Link>
          </div>
          {lists[i].length === 0 ? (
            <p className="rounded-2xl bg-white border border-gray-100 p-5 text-sm text-gray-500">Zatiaľ žiadne návody.</p>
          ) : (
            <ul className="rounded-2xl bg-white border border-gray-100 divide-y divide-gray-100">
              {lists[i].map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/pomoc/sprava/${a.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-gray-50">
                    <span className="min-w-0">
                      <span className="font-bold text-gray-900">{a.title}</span>
                      <span className="block text-xs text-gray-400">{a.slug} · poradie {a.sort_order}</span>
                    </span>
                    {!a.published && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700"><EyeOff size={13} /> skrytý</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

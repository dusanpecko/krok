import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Church, ChevronRight } from 'lucide-react'
import { getSessionUser } from '@/lib/auth'
import { getMyParishes } from '@/lib/parishes/access'

export const dynamic = 'force-dynamic'

/** Rozcestník: jedna farnosť → rovno detail, viac farností → výber. */
export default async function MyParishIndexPage() {
  const user = await getSessionUser()
  if (!user) redirect(`/prihlasenie?redirect=${encodeURIComponent('/moja-farnost')}`)
  const parishes = await getMyParishes(user.id)
  if (parishes.length === 1) redirect(`/moja-farnost/${parishes[0].id}`)

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-5">
      <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Church className="text-blue-600" /> Moja farnosť</h1>
      {parishes.length === 0 ? (
        <p className="text-sm text-gray-600 leading-relaxed">
          K vášmu účtu zatiaľ nie je priradená žiadna farnosť. Prístup prideľuje biskupský úrad – ak ste ho už dostali, skontrolujte,
          že ste sa prihlásili e-mailom, na ktorý prišla pozvánka.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {parishes.map((p) => (
            <li key={p.id}>
              <Link href={`/moja-farnost/${p.id}`} className="flex items-center justify-between py-3 font-bold text-gray-900 hover:text-blue-600">
                {p.official_name ?? p.name} <ChevronRight size={18} className="text-gray-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

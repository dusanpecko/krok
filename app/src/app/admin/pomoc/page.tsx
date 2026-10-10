import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LifeBuoy, Pencil } from 'lucide-react'
import { getSessionUser, getUserAccess } from '@/lib/auth'
import { HELP_BASE, canReadHelp, helpPlainText, listHelpArticles } from '@/lib/help'
import HelpIndex from '@/components/help/HelpIndex'

export const dynamic = 'force-dynamic'

/** Pomoc – návody pre administráciu (migrácia 052); návody zóny farnosti sú v /moja-farnost/pomoc. */
export default async function AdminHelpPage() {
  const user = await getSessionUser()
  if (!user) redirect(`/prihlasenie?redirect=${encodeURIComponent(HELP_BASE.admin)}`)
  if (!(await canReadHelp(user, 'admin'))) redirect('/')
  const [articles, access] = await Promise.all([listHelpArticles('admin'), getUserAccess(user.id)])
  const canEdit = access.isAdmin || access.permissions.includes('manage_help')
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2"><LifeBuoy className="text-blue-600" /> Pomoc</h1>
          <p className="text-gray-500 mt-2">
            Návody na prácu v administrácii. Návody pre farnosti nájdete v <Link href={HELP_BASE.parish} className="text-blue-600 font-bold hover:underline">zóne farnosti</Link>.
          </p>
        </div>
        {canEdit && (
          <Link href="/admin/pomoc/sprava" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700">
            <Pencil size={15} /> Spravovať návody
          </Link>
        )}
      </header>
      <HelpIndex base={HELP_BASE.admin} items={articles.map((a) => ({ slug: a.slug, title: a.title, summary: a.summary, text: helpPlainText(a.content) }))} />
    </div>
  )
}

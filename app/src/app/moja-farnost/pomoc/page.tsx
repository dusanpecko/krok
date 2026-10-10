import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, LifeBuoy } from 'lucide-react'
import { getSessionUser } from '@/lib/auth'
import { HELP_BASE, canReadHelp, helpPlainText, listHelpArticles } from '@/lib/help'
import HelpIndex from '@/components/help/HelpIndex'
import { KROK_ORG } from '@/lib/legal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pomoc | Moja farnosť' }

/** Pomoc – návody pre zónu farnosti (migrácia 052). */
export default async function ParishHelpPage() {
  const user = await getSessionUser()
  if (!user) redirect(`/prihlasenie?redirect=${encodeURIComponent(HELP_BASE.parish)}`)
  if (!(await canReadHelp(user, 'parish'))) redirect('/moja-farnost')
  const articles = await listHelpArticles('parish')
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/moja-farnost" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-blue-600">
        <ArrowLeft size={15} /> Späť na farnosť
      </Link>
      <header>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2"><LifeBuoy className="text-blue-600" /> Pomoc</h1>
        <p className="text-gray-500 mt-2">Návody, ako spravovať stránku a údaje farnosti. Ak ste nenašli odpoveď, napíšte nám na <a href={`mailto:${KROK_ORG.email}`} className="text-blue-600 font-bold hover:underline">{KROK_ORG.email}</a>.</p>
      </header>
      <HelpIndex base={HELP_BASE.parish} items={articles.map((a) => ({ slug: a.slug, title: a.title, summary: a.summary, text: helpPlainText(a.content), hasVideo: !!a.video_url }))} />
    </div>
  )
}

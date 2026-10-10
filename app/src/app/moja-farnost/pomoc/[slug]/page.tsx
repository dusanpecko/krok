import { notFound, redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { HELP_BASE, canReadHelp, getHelpArticle, listHelpArticles } from '@/lib/help'
import HelpArticleView from '@/components/help/HelpArticleView'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const article = await getHelpArticle('parish', (await params).slug)
  return { title: `${article?.title ?? 'Pomoc'} | Moja farnosť` }
}

export default async function ParishHelpArticlePage({ params }: PageProps) {
  const { slug } = await params
  const user = await getSessionUser()
  if (!user) redirect(`/prihlasenie?redirect=${encodeURIComponent(`${HELP_BASE.parish}/${slug}`)}`)
  if (!(await canReadHelp(user, 'parish'))) redirect('/moja-farnost')
  const [article, all] = await Promise.all([getHelpArticle('parish', slug), listHelpArticles('parish')])
  if (!article) notFound()
  return <HelpArticleView article={article} base={HELP_BASE.parish} others={all.filter((a) => a.slug !== slug)} />
}

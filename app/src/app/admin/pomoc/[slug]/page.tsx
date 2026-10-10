import { notFound, redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { HELP_BASE, canReadHelp, getHelpArticle, listHelpArticles } from '@/lib/help'
import HelpArticleView from '@/components/help/HelpArticleView'

export const dynamic = 'force-dynamic'

export default async function AdminHelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getSessionUser()
  if (!user) redirect(`/prihlasenie?redirect=${encodeURIComponent(`${HELP_BASE.admin}/${slug}`)}`)
  if (!(await canReadHelp(user, 'admin'))) redirect('/')
  const [article, all] = await Promise.all([getHelpArticle('admin', slug), listHelpArticles('admin')])
  if (!article) notFound()
  return <HelpArticleView article={article} base={HELP_BASE.admin} others={all.filter((a) => a.slug !== slug)} />
}

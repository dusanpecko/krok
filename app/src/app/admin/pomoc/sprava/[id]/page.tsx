import { notFound, redirect } from 'next/navigation'
import { getSessionUser, getUserAccess } from '@/lib/auth'
import { getHelpArticleById } from '@/lib/help'
import HelpArticleEditor from '@/components/help/HelpArticleEditor'

export const dynamic = 'force-dynamic'

/** Úprava návodu; „novy“ = nový návod. */
export default async function HelpArticleEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ zona?: string }> }) {
  const [{ id }, { zona }] = await Promise.all([params, searchParams])
  const user = await getSessionUser()
  if (!user) redirect('/prihlasenie?redirect=/admin/pomoc/sprava')
  const access = await getUserAccess(user.id)
  if (!access.isAdmin && !access.permissions.includes('manage_help')) redirect('/admin/pomoc')
  if (id === 'novy') return <HelpArticleEditor article={null} defaultZone={zona === 'admin' ? 'admin' : 'parish'} />
  const article = await getHelpArticleById(id)
  if (!article) notFound()
  return <HelpArticleEditor article={article} defaultZone={article.zone} />
}

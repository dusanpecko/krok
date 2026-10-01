import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getParishPost, getParishPosts, getPublicParishBySlug } from '@/lib/parishes/public'
import { jsonLdScript, parishMetadata, postJsonLd } from '@/lib/parishes/seo'
import { htmlToText } from '@/lib/html/sanitize'
import { getParishTheme } from '@/components/parish-themes'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string; postSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, postSlug } = await params
  const parish = await getPublicParishBySlug(slug)
  if (!parish) return { title: 'Farnosť nenájdená | KROK' }
  const post = await getParishPost(parish.id, 'announcement', postSlug)
  if (!post) return { title: 'Príspevok nenájdený | KROK' }
  return parishMetadata(parish, {
    title: post.title,
    description: post.excerpt || htmlToText(post.content, 180) || undefined,
    path: `/oznamy/${post.slug}`,
    image: post.image_url,
  })
}

export default async function ParishPostPage({ params }: PageProps) {
  const { slug, postSlug } = await params
  const parish = await getPublicParishBySlug(slug)
  if (!parish) notFound()
  const post = await getParishPost(parish.id, 'announcement', postSlug)
  if (!post) notFound()
  const related = (await getParishPosts(parish.id, 'announcement', 4)).filter((p) => p.id !== post.id).slice(0, 3)
  const { PostDetail } = getParishTheme(parish.theme)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(postJsonLd(parish, post))} />
      <PostDetail parish={parish} post={post} related={related} />
    </>
  )
}

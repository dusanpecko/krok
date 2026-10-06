import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getParishPosts, getPublicParishBySlug } from '@/lib/parishes/public'
import { parishMetadata } from '@/lib/parishes/seo'
import { getParishTheme } from '@/components/parish-themes'

export const dynamic = 'force-dynamic'

const PER_PAGE = 12

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ strana?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const parish = await getPublicParishBySlug(slug)
  if (!parish || parish.basic) return { title: 'Farnosť nenájdená | KROK' }
  return parishMetadata(parish, { title: 'Farské oznamy', path: '/oznamy' })
}

export default async function ParishPostsPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { strana } = await searchParams
  const parish = await getPublicParishBySlug(slug)
  if (!parish || parish.basic) notFound()
  const page = Math.max(1, Number.parseInt(strana ?? '1', 10) || 1)
  const rows = await getParishPosts(parish.id, 'announcement', PER_PAGE + 1, (page - 1) * PER_PAGE)
  const { PostList } = getParishTheme(parish.theme)
  return <PostList parish={parish} type="announcement" posts={rows.slice(0, PER_PAGE)} page={page} hasMore={rows.length > PER_PAGE} />
}

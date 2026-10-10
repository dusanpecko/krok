import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getParishAlbums, getPublicParishBySlug } from '@/lib/parishes/public'
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
  // fotky ľudí z farského života sa neindexujú (§ 17)
  return { ...(await parishMetadata(parish, { title: 'Zo života farnosti', path: '/galeria' })), robots: { index: false, follow: !parish.preview } }
}

export default async function ParishGalleryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { strana } = await searchParams
  const parish = await getPublicParishBySlug(slug)
  if (!parish || parish.basic) notFound()
  const page = Math.max(1, Number.parseInt(strana ?? '1', 10) || 1)
  const rows = await getParishAlbums(parish.id, PER_PAGE + 1, (page - 1) * PER_PAGE)
  const { Gallery } = getParishTheme(parish.theme)
  return <Gallery parish={parish} albums={rows.slice(0, PER_PAGE)} page={page} hasMore={rows.length > PER_PAGE} />
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getParishAlbum, getPublicParishBySlug } from '@/lib/parishes/public'
import { parishMetadata } from '@/lib/parishes/seo'
import { getParishTheme } from '@/components/parish-themes'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string; album: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, album: albumSlug } = await params
  const parish = await getPublicParishBySlug(slug)
  if (!parish || parish.basic) return { title: 'Farnosť nenájdená | KROK' }
  const album = await getParishAlbum(parish.id, albumSlug)
  if (!album) return { title: 'Album nenájdený | KROK' }
  return {
    ...parishMetadata(parish, { title: album.title, description: album.description || undefined, path: `/galeria/${album.slug}`, image: album.cover_url }),
    robots: { index: false, follow: !parish.preview },
  }
}

export default async function ParishAlbumPage({ params }: PageProps) {
  const { slug, album: albumSlug } = await params
  const parish = await getPublicParishBySlug(slug)
  if (!parish || parish.basic) notFound()
  const album = await getParishAlbum(parish.id, albumSlug)
  if (!album) notFound()
  const { AlbumDetail } = getParishTheme(parish.theme)
  return <AlbumDetail parish={parish} album={album} />
}

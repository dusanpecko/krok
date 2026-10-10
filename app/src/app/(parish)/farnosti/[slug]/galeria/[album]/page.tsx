import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getParishAlbum, getPublicParishBySlug } from '@/lib/parishes/public'
import { parishMetadata } from '@/lib/parishes/seo'
import { getParishTheme } from '@/components/parish-themes'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string; album: string }>
  searchParams: Promise<{ foto?: string }>
}

/** ?foto=N (1-based) – zdieľaná konkrétna fotka */
const photoIndex = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) - 1 : null)

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug, album: albumSlug } = await params
  const { foto } = await searchParams
  const parish = await getPublicParishBySlug(slug)
  if (!parish || parish.basic) return { title: 'Farnosť nenájdená | KROK' }
  const album = await getParishAlbum(parish.id, albumSlug)
  if (!album) return { title: 'Album nenájdený | KROK' }
  const shared = album.photos[photoIndex(foto) ?? -1]
  return {
    ...(await parishMetadata(parish, {
      title: album.title,
      description: shared?.caption || album.description || undefined,
      path: `/galeria/${album.slug}`,
      image: shared?.url ?? album.cover_url,
      ogQuery: shared ? `foto=${foto}` : undefined,
    })),
    robots: { index: false, follow: !parish.preview },
  }
}

export default async function ParishAlbumPage({ params, searchParams }: PageProps) {
  const { slug, album: albumSlug } = await params
  const { foto } = await searchParams
  const parish = await getPublicParishBySlug(slug)
  if (!parish || parish.basic) notFound()
  const album = await getParishAlbum(parish.id, albumSlug)
  if (!album) notFound()
  const { AlbumDetail } = getParishTheme(parish.theme)
  return <AlbumDetail parish={parish} album={album} initialPhoto={photoIndex(foto)} />
}

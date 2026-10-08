import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getParishAlbums, getParishChurchPhotos, getParishPosts, getParishSacraments, getPublicParishBySlug, getUpcomingEvents } from '@/lib/parishes/public'
import { jsonLdScript, parishJsonLd, parishMetadata } from '@/lib/parishes/seo'
import { getParishTheme } from '@/components/parish-themes'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ foto?: string }>
}

/** ?foto=N (1-based) – zdieľaná fotka kostola */
const photoIndex = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) - 1 : null)

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { foto } = await searchParams
  const parish = await getPublicParishBySlug(slug)
  if (!parish) return { title: 'Farnosť nenájdená | KROK' }
  // náhľad pri zdieľaní: zdieľaná fotka, inak prvá fotka kostola, inak titulná fotka
  const photos = parish.basic ? [] : await getParishChurchPhotos(parish.id)
  const shared = photos[photoIndex(foto) ?? -1]
  return parishMetadata(parish, {
    description: parish.intro?.slice(0, 200) || undefined,
    image: shared?.url ?? photos[0]?.url,
    ogQuery: shared ? `foto=${foto}` : undefined,
  })
}

/** Verejná stránka farnosti (návrh § 4.2, F5) – vykreslí ju zvolený motív (O29). */
export default async function ParishPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { foto } = await searchParams
  const parish = await getPublicParishBySlug(slug)
  if (!parish) notFound()

  // základná stránka (verejná stránka nie je zapnutá) – bez oznamov, aktualít a sviatostí
  const [announcements, news, events, sacraments, churchPhotos, albums] = parish.basic
    ? [[], [], [], [], [], []]
    : await Promise.all([
        getParishPosts(parish.id, 'announcement', 2),
        getParishPosts(parish.id, 'news', 6),
        getUpcomingEvents(parish.id),
        getParishSacraments(parish.id),
        getParishChurchPhotos(parish.id),
        parish.hasAlbums ? getParishAlbums(parish.id, 3) : Promise.resolve([]),
      ])
  const { Home } = getParishTheme(parish.theme)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(parishJsonLd(parish))} />
      <Home parish={parish} announcements={announcements} news={news} events={events} sacraments={sacraments} churchPhotos={churchPhotos} albums={albums} initialPhoto={photoIndex(foto)} />
    </>
  )
}

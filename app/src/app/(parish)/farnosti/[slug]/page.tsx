import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getParishPosts, getParishSacraments, getPublicParishBySlug, getUpcomingEvents } from '@/lib/parishes/public'
import { jsonLdScript, parishJsonLd, parishMetadata } from '@/lib/parishes/seo'
import { getParishTheme } from '@/components/parish-themes'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const parish = await getPublicParishBySlug(slug)
  if (!parish) return { title: 'Farnosť nenájdená | KROK' }
  return parishMetadata(parish, { description: parish.intro?.slice(0, 200) || undefined })
}

/** Verejná stránka farnosti (návrh § 4.2, F5) – vykreslí ju zvolený motív (O29). */
export default async function ParishPage({ params }: PageProps) {
  const { slug } = await params
  const parish = await getPublicParishBySlug(slug)
  if (!parish) notFound()

  // základná stránka (verejná stránka nie je zapnutá) – bez oznamov, aktualít a sviatostí
  const [announcements, news, events, sacraments] = parish.basic
    ? [[], [], [], []]
    : await Promise.all([
        getParishPosts(parish.id, 'announcement', 2),
        getParishPosts(parish.id, 'news', 6),
        getUpcomingEvents(parish.id),
        getParishSacraments(parish.id),
      ])
  const { Home } = getParishTheme(parish.theme)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(parishJsonLd(parish))} />
      <Home parish={parish} announcements={announcements} news={news} events={events} sacraments={sacraments} />
    </>
  )
}

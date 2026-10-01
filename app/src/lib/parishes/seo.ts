import type { Metadata } from 'next'
import type { PublicParish, PublicPost } from './public'
import { parishDisplayName } from './format'
import { getBaseUrl } from '@/lib/mollie/client'

/** SEO stránok farností (návrh § 4.2): metadata, OG a schema.org CatholicChurch. */

export function parishMetadata(parish: PublicParish, opts: { title?: string; description?: string; path?: string; image?: string | null } = {}): Metadata {
  const name = parishDisplayName(parish)
  const place = parish.city ? ` – ${parish.city}` : ''
  const title = opts.title ? `${opts.title} | ${name}` : `${name}${place} – bohoslužby, oznamy, kontakt`
  const description =
    opts.description ??
    `Sväté omše, spovedanie, farské oznamy a kontakt na farský úrad – ${name}${parish.deanery_name ? `, dekanát ${parish.deanery_name}` : ''}, Žilinská diecéza.`
  const url = `${getBaseUrl()}/farnosti/${parish.slug}${opts.path ?? ''}`
  const image = opts.image ?? parish.image_url
  return {
    title: `${title} | KROK`,
    description,
    alternates: { canonical: url },
    robots: parish.preview ? { index: false, follow: false } : undefined,
    openGraph: { title, description, url, type: 'website', ...(image ? { images: [{ url: image }] } : {}) },
  }
}

const SCHEMA_DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** JSON-LD: CatholicChurch s adresou, kontaktom, GPS a pravidelnými sv. omšami (Event so schedule). */
export function parishJsonLd(parish: PublicParish) {
  const base = getBaseUrl()
  const url = `${base}/farnosti/${parish.slug}`
  const schedule = parish.schedules[parish.currentSeason]
  const masses = (schedule?.items ?? []).filter((i) => i.service_type === 'mass' && i.occasion === 'regular' && i.day_of_week != null && i.time_from)
  const byTime = new Map<string, number[]>()
  for (const m of masses) byTime.set(m.time_from!, [...(byTime.get(m.time_from!) ?? []), m.day_of_week!])

  return {
    '@context': 'https://schema.org',
    '@type': 'CatholicChurch',
    '@id': url,
    name: parishDisplayName(parish),
    url,
    ...(parish.image_url ? { image: parish.image_url } : {}),
    ...(parish.phone ? { telephone: parish.phone } : {}),
    ...(parish.email ? { email: parish.email } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(parish.street ? { streetAddress: parish.street } : {}),
      ...(parish.postal_code ? { postalCode: parish.postal_code } : {}),
      ...(parish.city ? { addressLocality: parish.city } : {}),
      addressCountry: 'SK',
    },
    ...(parish.latitude != null && parish.longitude != null ? { geo: { '@type': 'GeoCoordinates', latitude: parish.latitude, longitude: parish.longitude } } : {}),
    ...(parish.website || parish.social_links.length
      ? { sameAs: [...(parish.website ? [parish.website.startsWith('http') ? parish.website : `https://${parish.website}`] : []), ...parish.social_links.map((l) => l.url)] }
      : {}),
    containedInPlace: { '@type': 'Place', name: 'Žilinská diecéza' },
    ...(byTime.size
      ? {
          event: [...byTime.entries()].map(([time, days]) => ({
            '@type': 'Event',
            name: 'Svätá omša',
            eventSchedule: {
              '@type': 'Schedule',
              byDay: days.map((d) => `https://schema.org/${SCHEMA_DAY[d]}`),
              startTime: time,
              repeatFrequency: 'P1W',
              scheduleTimezone: 'Europe/Bratislava',
            },
            location: { '@id': url },
          })),
        }
      : {}),
  }
}

export function postJsonLd(parish: PublicParish, post: PublicPost) {
  const url = `${getBaseUrl()}/farnosti/${parish.slug}/${post.type === 'announcement' ? 'oznamy' : 'aktuality'}/${post.slug}`
  if (post.event_at) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: post.title,
      startDate: post.event_at,
      url,
      location: { '@type': 'Place', name: parishDisplayName(parish), address: [parish.street, parish.city].filter(Boolean).join(', ') || undefined },
      organizer: { '@type': 'Organization', name: parishDisplayName(parish), url: `${getBaseUrl()}/farnosti/${parish.slug}` },
    }
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    url,
    ...(post.image_url ? { image: [post.image_url] } : {}),
    publisher: { '@type': 'Organization', name: parishDisplayName(parish) },
  }
}

/** Bezpečné vloženie JSON-LD do <script> (escapovanie `<`). */
export function jsonLdScript(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') }
}


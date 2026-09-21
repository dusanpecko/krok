/** Sponzori / partneri fondu (tabuľka sponsors, migrácia 025). */

export interface Sponsor {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  logo_dark_url: string | null
  website_url: string | null
  amount: number | null
  currency: string
  amount_public: boolean
  publish_from: string | null
  publish_until: string | null
  is_active: boolean
  sort_order: number
  internal_note: string | null
  created_at: string
  updated_at: string
}

export interface SponsorPayload {
  id?: string
  name: string
  description?: string | null
  logo_url?: string | null
  logo_dark_url?: string | null
  website_url?: string | null
  amount?: number | null
  amount_public: boolean
  publish_from?: string | null
  publish_until?: string | null
  is_active: boolean
  sort_order: number
  internal_note?: string | null
}

/** Verejná podoba sponzora (bez interných polí; suma len ak je verejná). */
export interface PublicSponsor {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  logo_dark_url: string | null
  website_url: string | null
  amount: number | null
}

/** Je sponzor práve zverejnený? (aktívny + v období zverejnenia) */
export function isSponsorPublished(s: Pick<Sponsor, 'is_active' | 'publish_from' | 'publish_until'>, today = new Date()): boolean {
  if (!s.is_active) return false
  const d = today.toISOString().slice(0, 10)
  if (s.publish_from && s.publish_from > d) return false
  if (s.publish_until && s.publish_until < d) return false
  return true
}

export function formatSponsorAmount(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('sk-SK', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

/**
 * Radenie sponzorov: poradie 1, 2, 3… ide prvé, hodnota 0 (= bez poradia) až za nimi.
 * Pri rovnakom poradí abecedne podľa názvu.
 */
export function sortSponsors<T extends { name: string; sort_order: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ao = a.sort_order > 0 ? a.sort_order : Number.POSITIVE_INFINITY
    const bo = b.sort_order > 0 ? b.sort_order : Number.POSITIVE_INFINITY
    if (ao !== bo) return ao - bo
    return a.name.localeCompare(b.name, 'sk')
  })
}

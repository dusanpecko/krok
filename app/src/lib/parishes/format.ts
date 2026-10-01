/** Formátovanie pre verejné stránky farností – bez serverových závislostí. */

/** Texty v sekcii Sviatosti, ktoré nie sú sviatosťou – zobrazia sa za oddeľovačom (migrácia 037). */
export const NON_SACRAMENT_TYPES = ['pohreb']

const MONTHS_GEN = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra']

/** „2026-09-14“ → „14. septembra“ (hody a poklona sa slávia každý rok – bez roku). */
export function dayMonth(date: string | null): string | null {
  if (!date) return null
  const [, m, d] = date.slice(0, 10).split('-').map(Number)
  if (!m || !d) return null
  return `${d}. ${MONTHS_GEN[m - 1]}`
}

export function formatDate(date: string | null, withYear = true): string {
  if (!date) return ''
  return new Date(date.length === 10 ? `${date}T12:00:00` : date).toLocaleDateString('sk-SK', {
    day: 'numeric', month: 'numeric', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'Europe/Bratislava',
  })
}

export function formatDateTime(date: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleString('sk-SK', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava',
  })
}

/** Rozsah platnosti oznamov: „5. 10. – 12. 10. 2026“. */
export function validRange(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  if (from && to) return `${formatDate(from, false)} – ${formatDate(to)}`
  return from ? `od ${formatDate(from)}` : `do ${formatDate(to)}`
}

export function clergyName(c: { full_name: string; title_before: string | null; title_after: string | null }): string {
  return [c.title_before, c.full_name].filter(Boolean).join(' ') + (c.title_after ? `, ${c.title_after}` : '')
}

export function parishDisplayName(p: { name: string; official_name: string | null }): string {
  return p.official_name ?? p.name
}

export function googleMapsUrl(p: { latitude: number | null; longitude: number | null; street: string | null; city: string | null; postal_code: string | null; name: string }) {
  if (p.latitude != null && p.longitude != null) return `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`
  const q = [p.street, p.postal_code, p.city].filter(Boolean).join(', ') || p.name
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

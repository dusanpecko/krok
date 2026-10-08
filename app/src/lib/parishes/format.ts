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

/** Úradné hodiny pre aktuálny režim (v lete letné, ak sú zadané; inak „cez rok“), zoradené podľa času. */
/** Má farnosť vyplnené bohoslužby (nie len úradné hodiny)? */
export function hasParishSchedule(p: { schedules: Partial<Record<'regular' | 'summer', { items: { service_type: string }[] }>> }): boolean {
  return Object.values(p.schedules).some((s) => s?.items.some((i) => i.service_type !== 'office'))
}

export function officeHoursFor<T extends { service_type: string; time_from: string | null }>(p: {
  currentSeason: 'regular' | 'summer'
  schedules: Partial<Record<'regular' | 'summer', { items: T[] }>>
}): { season: 'regular' | 'summer'; items: T[] } {
  const pick = (s: 'regular' | 'summer') => (p.schedules[s]?.items ?? []).filter((i) => i.service_type === 'office')
  const season = p.currentSeason === 'summer' && pick('summer').length ? 'summer' : 'regular'
  return { season, items: pick(season).sort((a, b) => (a.time_from ?? '99').localeCompare(b.time_from ?? '99')) }
}

/** „1 fotka“, „3 fotky“, „12 fotiek“ */
export function photoCount(n: number): string {
  return `${n} ${n === 1 ? 'fotka' : n >= 2 && n <= 4 ? 'fotky' : 'fotiek'}`
}

/** „1 video“, „3 videá“, „5 videí“ */
export function videoCount(n: number): string {
  return `${n} ${n === 1 ? 'video' : n >= 2 && n <= 4 ? 'videá' : 'videí'}`
}

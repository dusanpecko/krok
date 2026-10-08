/** Formátovanie pre web diecézy – bez serverových závislostí. */

const MONTHS = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra']

export function longDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function shortDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`
}

/** „12. – 18. júla 2026“, „31. mája 2026, 8:00 – 16:00“ */
export function eventWhen(e: { starts_on: string; ends_on: string | null; time_from: string | null; time_to: string | null; all_day: boolean }): string {
  const time = !e.all_day && e.time_from ? `, ${e.time_from.slice(0, 5).replace(/^0/, '')}${e.time_to ? ` – ${e.time_to.slice(0, 5).replace(/^0/, '')}` : ''}` : ''
  if (e.ends_on && e.ends_on !== e.starts_on) return `${shortDate(e.starts_on)} – ${longDate(e.ends_on)}`
  return `${longDate(e.starts_on)}${time}`
}

export function dayBadge(iso: string): { day: string; month: string } {
  const d = new Date(`${iso}T12:00:00`)
  return { day: String(d.getDate()), month: ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'][d.getMonth()] }
}

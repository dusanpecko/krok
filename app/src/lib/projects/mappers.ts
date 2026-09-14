import {
  EMPTY_STATS,
  type ProjectBudgetItem,
  type ProjectMedia,
  type ProjectMilestone,
  type ProjectRow,
  type ProjectStats,
} from './types'

/** Mapovanie surových riadkov zo Supabase na typy (numeric → number, defaulty). Zdieľa admin aj verejná časť. */

export type Raw = Record<string, unknown>

export function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function mapProject(r: Raw): ProjectRow {
  const base = r as unknown as ProjectRow
  return {
    ...base,
    target_amount: numOrNull(r.target_amount),
    legacy_collected_amount: num(r.legacy_collected_amount),
    legacy_supporters_count: num(r.legacy_supporters_count),
    sort_order: num(r.sort_order),
    suggested_amounts: Array.isArray(r.suggested_amounts)
      ? (r.suggested_amounts as unknown[]).map((x) => num(x)).filter((x) => x > 0)
      : [],
    visible_on_web: !!r.visible_on_web,
    featured: !!r.featured,
    allow_one_time: r.allow_one_time !== false,
    allow_recurring: r.allow_recurring !== false,
  }
}

export function mapStats(r: Raw | null | undefined): ProjectStats {
  if (!r) return EMPTY_STATS
  return {
    collected_amount: num(r.collected_amount),
    supporters_count: num(r.supporters_count),
    donations_count: num(r.donations_count),
    last_donation_at: (r.last_donation_at as string | null) ?? null,
    percent: numOrNull(r.percent),
  }
}

export function mapMedia(r: Raw): ProjectMedia {
  return {
    ...(r as unknown as ProjectMedia),
    file_size: numOrNull(r.file_size),
    sort_order: num(r.sort_order),
    visible: r.visible !== false,
  }
}

export function mapBudget(r: Raw): ProjectBudgetItem {
  return {
    ...(r as unknown as ProjectBudgetItem),
    planned_amount: num(r.planned_amount),
    actual_amount: numOrNull(r.actual_amount),
    sort_order: num(r.sort_order),
  }
}

export function mapMilestone(r: Raw): ProjectMilestone {
  return { ...(r as unknown as ProjectMilestone), sort_order: num(r.sort_order) }
}

/** Je výzva otvorená na dary? Zverejnená, aktívna a pred termínom (alebo bez termínu). */
export function isProjectOpen(p: Pick<ProjectRow, 'visible_on_web' | 'status' | 'end_date'>): boolean {
  if (!p.visible_on_web || p.status !== 'active') return false
  if (p.end_date && new Date(`${p.end_date}T23:59:59`) < new Date()) return false
  return true
}

/** Počet dní do termínu (null = bez termínu). Záporné = po termíne. */
export function daysLeft(endDate: string | null): number | null {
  if (!endDate) return null
  const end = new Date(`${endDate}T23:59:59`)
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000)
}

/** Prevedie YouTube / Vimeo URL na embed URL. Vráti null, ak formát nepoznáme. */
export function toEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname.startsWith('/embed/')) return `https://www.youtube-nocookie.com${u.pathname}`
      if (u.pathname.startsWith('/shorts/')) return `https://www.youtube-nocookie.com/embed/${u.pathname.split('/')[2]}`
      const id = u.searchParams.get('v')
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean).pop()
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {
    return null
  }
  return null
}

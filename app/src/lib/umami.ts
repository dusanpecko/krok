import { UMAMI_WEBSITE_ID as WEBSITE_ID } from '@/lib/analytics'
/**
 * Umami Cloud API – návštevnosť stránok farností pre zónu farnosti a admin.
 * Skript na meranie je v root layoute (website id nižšie); tu sa len čítajú štatistiky.
 * Potrebuje UMAMI_API_KEY (Umami Cloud → Settings → API keys). Serverový modul.
 */

const API = (process.env.UMAMI_API_URL ?? 'https://api.umami.is/v1').replace(/\/+$/, '')
const TZ = 'Europe/Bratislava'

export const umamiConfigured = () => !!process.env.UMAMI_API_KEY

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  const res = await fetch(`${API}/websites/${WEBSITE_ID}/${path}?${qs}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${process.env.UMAMI_API_KEY}` },
    // štatistiky stačí obnoviť raz za hodinu (limit API: 50 volaní / 15 s)
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Umami ${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

interface ExpandedRow {
  name: string
  pageviews: number
  visitors: number
  visits: number
  bounces: number
  totaltime: number
}

export interface PageTraffic {
  path: string
  pageviews: number
  visits: number
}

export interface ParishTraffic {
  days: number
  pageviews: number
  visits: number
  prevPageviews: number
  prevVisits: number
  /** zobrazenia po dňoch (YYYY-MM-DD) – celý web farnosti, alebo len hlavná stránka (pozri dailyScope) */
  daily: { date: string; value: number }[]
  dailyScope: 'all' | 'home'
  pages: PageTraffic[]
}

/** Riadky metrics/expanded pre stránky danej farnosti – presne (bez /farnosti/cadca-kycerka pri /farnosti/cadca). */
async function parishPages(base: string, startAt: number, endAt: number): Promise<PageTraffic[]> {
  const rows = await get<ExpandedRow[]>('metrics/expanded', { type: 'path', search: base, startAt, endAt, limit: 500 })
  const map = new Map<string, PageTraffic>()
  for (const r of rows ?? []) {
    const path = (r.name ?? '').split(/[?#]/)[0].replace(/\/+$/, '') || '/'
    if (path !== base && !path.startsWith(`${base}/`)) continue
    const cur = map.get(path) ?? { path, pageviews: 0, visits: 0 }
    cur.pageviews += Number(r.pageviews) || 0
    cur.visits += Number(r.visits) || 0
    map.set(path, cur)
  }
  return [...map.values()].sort((a, b) => b.pageviews - a.pageviews)
}

const dayKey = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: TZ })

/**
 * Návštevnosť stránok farnosti za posledných `days` dní + predchádzajúce obdobie.
 * `prefixUnique` = žiadna iná farnosť nemá slug začínajúci týmto (inak denný graf len pre hlavnú stránku).
 */
export async function getParishTraffic(slug: string, days: number, prefixUnique: boolean): Promise<ParishTraffic> {
  const base = `/farnosti/${slug}`
  const endAt = Date.now()
  const startAt = endAt - days * 86400_000
  const prevStart = startAt - days * 86400_000

  const [pages, prevPages, series] = await Promise.all([
    parishPages(base, startAt, endAt),
    parishPages(base, prevStart, startAt),
    // c. = obsahuje (filter Umami); pri prekrývajúcich sa slugoch len presná hlavná stránka
    get<{ pageviews: { x: string; y: number }[] }>('pageviews', { startAt, endAt, unit: 'day', timezone: TZ, path: prefixUnique ? `c.${base}` : base }),
  ])

  const byDay = new Map((series.pageviews ?? []).map((p) => [dayKey(new Date(p.x)), Number(p.y) || 0]))
  const daily: ParishTraffic['daily'] = []
  for (let t = startAt; t <= endAt; t += 86400_000) {
    const key = dayKey(new Date(t))
    if (!daily.some((d) => d.date === key)) daily.push({ date: key, value: byDay.get(key) ?? 0 })
  }

  const sum = (rows: PageTraffic[], k: 'pageviews' | 'visits') => rows.reduce((a, r) => a + r[k], 0)
  return {
    days,
    pageviews: sum(pages, 'pageviews'),
    visits: sum(pages, 'visits'),
    prevPageviews: sum(prevPages, 'pageviews'),
    prevVisits: sum(prevPages, 'visits'),
    daily,
    dailyScope: prefixUnique ? 'all' : 'home',
    pages: pages.slice(0, 10),
  }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { getParishTraffic, umamiConfigured, type ParishTraffic } from '@/lib/umami'

/** Návštevnosť stránky farnosti (Umami) s čitateľnými názvami stránok. Serverový modul. */

export type TrafficResult =
  | { status: 'ok'; data: Omit<ParishTraffic, 'pages'> & { pages: (ParishTraffic['pages'][number] & { label: string })[] }; slug: string }
  | { status: 'not_configured' }
  | { status: 'no_slug' }
  | { status: 'error'; message: string }

export const TRAFFIC_PERIODS = [7, 30, 90] as const

export async function loadParishTraffic(db: SupabaseClient, parishId: string, days: number): Promise<TrafficResult> {
  if (!umamiConfigured()) return { status: 'not_configured' }
  const period = (TRAFFIC_PERIODS as readonly number[]).includes(days) ? days : 30
  const { data: parish } = await db.from('parishes').select('slug').eq('id', parishId).maybeSingle()
  const slug = parish?.slug as string | undefined
  if (!slug) return { status: 'no_slug' }
  const { count } = await db.from('parishes').select('id', { count: 'exact', head: true }).like('slug', `${slug}%`).neq('id', parishId)
  try {
    const data = await getParishTraffic(slug, period, !count)
    const { data: posts } = await db.from('parish_posts').select('type, slug, title').eq('parish_id', parishId)
    const title = new Map((posts ?? []).map((p) => [`${p.type === 'announcement' ? 'oznamy' : 'aktuality'}/${p.slug}`, p.title as string]))
    const base = `/farnosti/${slug}`
    const label = (path: string) => {
      const rest = path.slice(base.length).replace(/^\//, '')
      if (!rest) return 'Hlavná stránka farnosti'
      if (rest === 'oznamy') return 'Farské oznamy (zoznam)'
      if (rest === 'aktuality') return 'Aktuality (zoznam)'
      return title.get(rest) ?? rest
    }
    return { status: 'ok', slug, data: { ...data, pages: data.pages.map((p) => ({ ...p, label: label(p.path) })) } }
  } catch (e) {
    console.error('[umami]', e)
    return { status: 'error', message: 'Štatistiky sa nepodarilo načítať. Skúste to neskôr.' }
  }
}

import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { getUserAccess } from '@/lib/auth'
import { getMyParishes } from '@/lib/parishes/access'
import type { HelpZone } from './help-links'

/**
 * Pomoc – návody na použitie (migrácia 052). Zóna farnosti a administrácia, len slovenčina.
 * Číta server cez service role až po overení prístupu k danej zóne. Serverový modul.
 */

export type { HelpZone } from './help-links'
export { HELP_BASE, HELP_ZONE_LABEL, helpHref } from './help-links'

export interface HelpArticle {
  id: string
  zone: HelpZone
  slug: string
  title: string
  summary: string | null
  content: string
  /** YouTube / Vimeo – prehrávač navrchu návodu (migrácia 055) */
  video_url: string | null
  sort_order: number
  published: boolean
  updated_at: string
}

const db = () => createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const COLUMNS = 'id, zone, slug, title, summary, content, video_url, sort_order, published, updated_at'

/** Zónu farnosti vidí, kto má prístup aspoň k jednej farnosti; administráciu, kto má rolu. Admin vidí obe. */
export async function canReadHelp(user: User, zone: HelpZone): Promise<boolean> {
  const access = await getUserAccess(user.id)
  if (access.isAdmin || access.roles.length > 0) return true
  return zone === 'parish' && (await getMyParishes(user.id)).length > 0
}

export async function listHelpArticles(zone: HelpZone, opts: { includeHidden?: boolean } = {}): Promise<HelpArticle[]> {
  let q = db().from('help_articles').select(COLUMNS).eq('zone', zone)
  if (!opts.includeHidden) q = q.eq('published', true)
  const { data } = await q.order('sort_order').order('title')
  return (data ?? []) as HelpArticle[]
}

export async function getHelpArticle(zone: HelpZone, slug: string, opts: { includeHidden?: boolean } = {}): Promise<HelpArticle | null> {
  let q = db().from('help_articles').select(COLUMNS).eq('zone', zone).eq('slug', slug)
  if (!opts.includeHidden) q = q.eq('published', true)
  const { data } = await q.maybeSingle()
  return (data as HelpArticle | null) ?? null
}

export async function getHelpArticleById(id: string): Promise<HelpArticle | null> {
  const { data } = await db().from('help_articles').select(COLUMNS).eq('id', id).maybeSingle()
  return (data as HelpArticle | null) ?? null
}

export const helpDb = db

/** Čistý text z HTML návodu – na vyhľadávanie v zozname. */
export const helpPlainText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

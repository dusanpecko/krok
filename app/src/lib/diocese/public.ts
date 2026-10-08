import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

/** Web diecézy dcza.sk – čítanie obsahu (§ 20, D2). Serverový modul, service role, len zverejnené. */

export const dioceseDb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export interface DiocesePageNode {
  id: string
  parent_id: string | null
  path: string
  title: string
  sort_order: number
  show_in_menu: boolean
  children: DiocesePageNode[]
}

export interface DiocesePage {
  id: string
  path: string
  title: string
  excerpt: string | null
  content: string | null
  image_url: string | null
  updated_at: string
}

export interface DiocesePostSummary {
  id: string
  slug: string
  title: string
  excerpt: string | null
  image_url: string | null
  published_at: string
  categories: { slug: string; name: string }[]
}

export interface DiocesePost extends DiocesePostSummary {
  content: string | null
}

export interface DioceseEvent {
  id: string
  slug: string
  title: string
  content: string | null
  place: string | null
  starts_on: string
  ends_on: string | null
  time_from: string | null
  time_to: string | null
  all_day: boolean
  image_url: string | null
  link_url: string | null
}

export interface MagazineIssue {
  id: string
  title: string
  issue_number: string | null
  cover_url: string | null
  pdf_url: string | null
  link_url: string | null
}

/** Strom zverejnených stránok – menu a bočná navigácia. */
export const getPageTree = cache(async (): Promise<DiocesePageNode[]> => {
  const { data } = await dioceseDb().from('diocese_pages').select('id, parent_id, path, title, sort_order, show_in_menu').eq('published', true).order('sort_order').order('title')
  const nodes = new Map<string, DiocesePageNode>((data ?? []).map((p) => [p.id, { ...p, children: [] }]))
  const roots: DiocesePageNode[] = []
  for (const n of nodes.values()) {
    const parent = n.parent_id ? nodes.get(n.parent_id) : null
    if (parent) parent.children.push(n)
    else roots.push(n)
  }
  return roots
})

export async function getPage(path: string): Promise<DiocesePage | null> {
  const { data } = await dioceseDb().from('diocese_pages').select('id, path, title, excerpt, content, image_url, updated_at').eq('path', path).eq('published', true).maybeSingle()
  return (data as DiocesePage | null) ?? null
}

const POST_COLUMNS = 'id, slug, title, excerpt, image_url, published_at, diocese_post_category_links(diocese_post_categories(slug, name))'

type PostRow = Omit<DiocesePostSummary, 'categories'> & { content?: string | null; diocese_post_category_links: { diocese_post_categories: { slug: string; name: string } | null }[] }
const toPost = ({ diocese_post_category_links: links, ...p }: PostRow) => ({
  ...p,
  categories: (links ?? []).map((l) => l.diocese_post_categories).filter((c): c is { slug: string; name: string } => !!c),
})

export async function getPosts(opts: { limit?: number; offset?: number; category?: string | null } = {}): Promise<DiocesePostSummary[]> {
  const limit = opts.limit ?? 12
  let q = dioceseDb().from('diocese_posts').select(opts.category ? POST_COLUMNS.replace('diocese_post_category_links(', 'diocese_post_category_links!inner(') : POST_COLUMNS).eq('published', true)
  if (opts.category) q = q.eq('diocese_post_category_links.diocese_post_categories.slug', opts.category)
  const { data } = await q.order('published_at', { ascending: false }).range(opts.offset ?? 0, (opts.offset ?? 0) + limit - 1)
  return ((data ?? []) as unknown as PostRow[]).map(toPost)
}

export async function getPost(slug: string): Promise<DiocesePost | null> {
  const { data } = await dioceseDb().from('diocese_posts').select(`${POST_COLUMNS}, content`).eq('slug', slug).eq('published', true).maybeSingle()
  return data ? (toPost(data as unknown as PostRow) as DiocesePost) : null
}

export const getCategories = cache(async () => {
  const { data } = await dioceseDb().from('diocese_post_categories').select('slug, name, diocese_post_category_links(post_id)').eq('is_visible', true).order('sort_order')
  return (data ?? []).map((c) => ({ slug: c.slug as string, name: c.name as string, count: (c.diocese_post_category_links as unknown[]).length })).filter((c) => c.count > 0)
})

const EVENT_COLUMNS = 'id, slug, title, content, place, starts_on, ends_on, time_from, time_to, all_day, image_url, link_url'

export async function getUpcomingEvents(limit = 6): Promise<DioceseEvent[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await dioceseDb().from('diocese_events').select(EVENT_COLUMNS).eq('published', true).or(`starts_on.gte.${today},ends_on.gte.${today}`).order('starts_on').limit(limit)
  return (data ?? []) as DioceseEvent[]
}

export async function getPastEvents(limit = 6): Promise<DioceseEvent[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await dioceseDb().from('diocese_events').select(EVENT_COLUMNS).eq('published', true).lt('starts_on', today).order('starts_on', { ascending: false }).limit(limit)
  return ((data ?? []) as DioceseEvent[]).filter((e) => !e.ends_on || e.ends_on < today)
}

export async function getEvent(slug: string): Promise<DioceseEvent | null> {
  const { data } = await dioceseDb().from('diocese_events').select(EVENT_COLUMNS).eq('slug', slug).eq('published', true).maybeSingle()
  return (data as DioceseEvent | null) ?? null
}

export async function getMagazine(limit = 12): Promise<MagazineIssue[]> {
  const { data } = await dioceseDb().from('diocese_magazine_issues').select('id, title, issue_number, cover_url, pdf_url, link_url').eq('published', true).order('sort_index', { ascending: false }).limit(limit)
  return (data ?? []) as MagazineIssue[]
}

/** Presmerovanie starej adresy živého webu (/sk/…), O73. */
export async function findRedirect(path: string): Promise<string | null> {
  const { data } = await dioceseDb().from('diocese_redirects').select('to_path').eq('from_path', path).maybeSingle()
  return data?.to_path ?? null
}

import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { uploadBuffer } from '@/lib/storage'
import { generateSlug } from '@/lib/slug'
import { htmlToText } from '@/lib/html/sanitize'
import { sanitizeDioceseHtml } from './html'

/** Web diecézy – správa článkov a kategórií kúriou (§ 20, D3). Serverový modul. */

export interface AdminDiocesePost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string | null
  image_url: string | null
  published: boolean
  published_at: string
  pinned: boolean
  source: string | null
  updated_at: string
  category_ids: string[]
}

export interface DiocesePostInput {
  id?: string
  title: string
  excerpt?: string | null
  content?: string | null
  image_url?: string | null
  published: boolean
  published_at?: string | null
  pinned?: boolean
  category_ids: string[]
}

export interface AdminDioceseCategory {
  id: string
  slug: string
  name: string
  description: string | null
  sort_order: number
  is_visible: boolean
  post_count: number
}

const COLUMNS = 'id, slug, title, excerpt, content, image_url, published, published_at, pinned, source, updated_at, diocese_post_category_links(category_id)'
type Row = Omit<AdminDiocesePost, 'category_ids'> & { diocese_post_category_links: { category_id: string }[] }
const toPost = ({ diocese_post_category_links: l, ...p }: Row): AdminDiocesePost => ({ ...p, category_ids: (l ?? []).map((x) => x.category_id) })

export async function listAdminPosts(db: SupabaseClient): Promise<AdminDiocesePost[]> {
  const { data } = await db.from('diocese_posts').select(COLUMNS.replace('content, ', '')).order('pinned', { ascending: false }).order('published_at', { ascending: false }).limit(2000)
  return ((data ?? []) as unknown as Row[]).map((r) => toPost({ ...r, content: null }))
}

export async function getAdminPost(db: SupabaseClient, id: string): Promise<AdminDiocesePost | null> {
  const { data } = await db.from('diocese_posts').select(COLUMNS).eq('id', id).maybeSingle()
  return data ? toPost(data as unknown as Row) : null
}

async function uniqueSlug(db: SupabaseClient, title: string, exceptId?: string): Promise<string> {
  const base = generateSlug(title).slice(0, 90) || 'clanok'
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`
    let q = db.from('diocese_posts').select('id').eq('slug', slug)
    if (exceptId) q = q.neq('id', exceptId)
    const { data } = await q.maybeSingle()
    if (!data) return slug
  }
  return `${base}-${Date.now()}`
}

export async function writePost(db: SupabaseClient, userId: string, input: DiocesePostInput): Promise<{ success: true; id: string; slug: string } | { success: false; error: string }> {
  const title = input.title?.trim()
  if (!title) return { success: false, error: 'Vyplňte nadpis.' }
  const content = sanitizeDioceseHtml(input.content)
  if (input.published && !content && !input.excerpt?.trim()) return { success: false, error: 'Doplňte text článku.' }
  const publishedAt = input.published_at && !Number.isNaN(Date.parse(input.published_at)) ? new Date(input.published_at).toISOString() : new Date().toISOString()
  const image = input.image_url && /^https:\/\//.test(input.image_url) ? input.image_url : null
  const row = {
    title: title.slice(0, 300),
    excerpt: input.excerpt?.trim().slice(0, 500) || htmlToText(content, 240) || null,
    content: content || null,
    image_url: image,
    published: !!input.published,
    published_at: publishedAt,
    pinned: !!input.pinned,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }
  let id = input.id
  let slug: string
  if (id) {
    const { data: existing } = await db.from('diocese_posts').select('slug, published, title').eq('id', id).maybeSingle()
    if (!existing) return { success: false, error: 'Článok sa nenašiel.' }
    // adresa sa mení len pri nezverejnenom článku (zdieľané odkazy majú fungovať)
    slug = !existing.published && existing.title !== title ? await uniqueSlug(db, title, id) : existing.slug
    const { error } = await db.from('diocese_posts').update({ ...row, slug }).eq('id', id)
    if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  } else {
    slug = await uniqueSlug(db, title)
    const { data, error } = await db.from('diocese_posts').insert({ ...row, slug, source: 'krok', created_by: userId }).select('id').single()
    if (error || !data) return { success: false, error: 'Článok sa nepodarilo založiť.' }
    id = data.id as string
  }
  await db.from('diocese_post_category_links').delete().eq('post_id', id)
  const cats = Array.from(new Set(input.category_ids ?? []))
  if (cats.length) await db.from('diocese_post_category_links').insert(cats.map((category_id) => ({ post_id: id, category_id })))
  return { success: true, id: id!, slug }
}

/** Obrázok článku (titulný aj v texte) → WebP na B2, max. 2000 px. */
export async function storePostImage(buf: Buffer): Promise<string | null> {
  const webp = await sharp(buf, { failOn: 'none' }).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
  return (await uploadBuffer(webp, 'image/webp', 'dcza/media'))?.url ?? null
}

export async function listAdminCategories(db: SupabaseClient): Promise<AdminDioceseCategory[]> {
  const { data } = await db.from('diocese_post_categories').select('id, slug, name, description, sort_order, is_visible, diocese_post_category_links(post_id)').order('sort_order')
  return (data ?? []).map(({ diocese_post_category_links: l, ...c }) => ({ ...(c as Omit<AdminDioceseCategory, 'post_count'>), post_count: (l as unknown[]).length }))
}

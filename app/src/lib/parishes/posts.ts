import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeRichHtml, htmlToText } from '@/lib/html/sanitize'
import { generateSlug } from '@/lib/slug'

/** Oznamy a aktuality farnosti (migrácia 035) – zdieľané zónou farnosti a adminom. Serverový modul. */

export type ParishPostType = 'announcement' | 'news'

export interface ParishPostRow {
  id: string
  parish_id: string
  type: ParishPostType
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  image_url: string | null
  attachment_url: string | null
  attachment_name: string | null
  valid_from: string | null
  valid_to: string | null
  event_at: string | null
  published: boolean
  published_at: string | null
  pinned: boolean
  taken_down_at: string | null
  takedown_reason: string | null
  created_at: string
  updated_at: string
}

export interface ParishPostInput {
  id?: string
  type: ParishPostType
  title: string
  excerpt?: string | null
  content?: string | null
  image_url?: string | null
  attachment_url?: string | null
  attachment_name?: string | null
  valid_from?: string | null
  valid_to?: string | null
  event_at?: string | null
  published: boolean
  pinned?: boolean
}

export const POST_COLUMNS =
  'id, parish_id, type, title, slug, excerpt, content, image_url, attachment_url, attachment_name, valid_from, valid_to, event_at, published, published_at, pinned, taken_down_at, takedown_reason, created_at, updated_at'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const httpsUrl = (v: string | null | undefined) => (v && /^https?:\/\//i.test(v.trim()) ? v.trim() : null)

async function uniqueSlug(db: SupabaseClient, parishId: string, base: string, exceptId?: string) {
  const root = generateSlug(base).slice(0, 80) || 'prispevok'
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? root : `${root}-${i + 1}`
    let q = db.from('parish_posts').select('id').eq('parish_id', parishId).eq('slug', slug)
    if (exceptId) q = q.neq('id', exceptId)
    const { data } = await q.maybeSingle()
    if (!data) return slug
  }
  return `${root}-${Date.now()}`
}

/** Uloží (vytvorí / upraví) oznam alebo aktualitu. Obsah sa sanitizuje; stiahnutý príspevok farnosť nezverejní. */
export async function writeParishPost(
  db: SupabaseClient,
  parishId: string,
  userId: string,
  input: ParishPostInput,
): Promise<{ success: true; id: string; slug: string } | { success: false; error: string }> {
  const title = input.title?.trim()
  if (!title) return { success: false, error: 'Vyplňte nadpis.' }
  if (title.length > 200) return { success: false, error: 'Nadpis je príliš dlhý.' }
  if (input.type !== 'announcement' && input.type !== 'news') return { success: false, error: 'Neplatný typ príspevku.' }
  const content = sanitizeRichHtml(input.content)
  const attachment = httpsUrl(input.attachment_url)
  if (input.published && !content && !attachment) return { success: false, error: 'Doplňte text alebo PDF prílohu.' }
  const validFrom = input.valid_from && DATE_RE.test(input.valid_from) ? input.valid_from : null
  const validTo = input.valid_to && DATE_RE.test(input.valid_to) ? input.valid_to : null
  if (validFrom && validTo && validTo < validFrom) return { success: false, error: 'Dátum „platí do“ je skôr ako „platí od“.' }
  const eventAt = input.type === 'news' && input.event_at && !Number.isNaN(Date.parse(input.event_at)) ? new Date(input.event_at).toISOString() : null

  let existing: Pick<ParishPostRow, 'id' | 'slug' | 'title' | 'published_at' | 'taken_down_at'> | null = null
  if (input.id) {
    const { data } = await db.from('parish_posts').select('id, slug, title, published_at, taken_down_at').eq('id', input.id).eq('parish_id', parishId).maybeSingle()
    if (!data) return { success: false, error: 'Príspevok sa nenašiel.' }
    existing = data
  }
  if (existing?.taken_down_at && input.published) {
    return { success: false, error: 'Príspevok stiahol biskupský úrad – zverejniť ho môže znova len on. Upravte ho a kontaktujte referenta.' }
  }

  const row = {
    type: input.type,
    title,
    excerpt: input.excerpt?.trim() || htmlToText(content, 220) || null,
    content: content || null,
    image_url: httpsUrl(input.image_url),
    attachment_url: attachment,
    attachment_name: attachment ? input.attachment_name?.trim().slice(0, 150) || null : null,
    valid_from: input.type === 'announcement' ? validFrom : null,
    valid_to: input.type === 'announcement' ? validTo : null,
    event_at: eventAt,
    published: !!input.published,
    published_at: input.published ? existing?.published_at ?? new Date().toISOString() : existing?.published_at ?? null,
    pinned: !!input.pinned,
    updated_by: userId,
  }

  if (existing) {
    // slug sa mení len pri nezverejnenom príspevku (zverejnený odkaz nemá prestať fungovať)
    const slug = !existing.published_at && existing.title !== title ? await uniqueSlug(db, parishId, title, existing.id) : existing.slug
    const { error } = await db.from('parish_posts').update({ ...row, slug }).eq('id', existing.id)
    if (error) return { success: false, error: 'Uloženie zlyhalo.' }
    return { success: true, id: existing.id, slug }
  }
  const slug = await uniqueSlug(db, parishId, title)
  const { data, error } = await db.from('parish_posts').insert({ ...row, slug, parish_id: parishId, created_by: userId }).select('id').single()
  if (error || !data) return { success: false, error: 'Uloženie zlyhalo.' }
  return { success: true, id: data.id as string, slug }
}

export interface SacramentEditRow {
  type: string
  title: string
  base_content: string
  own_content: string | null
  is_hidden: boolean
}

export async function loadSacramentEditRows(db: SupabaseClient, parishId: string): Promise<SacramentEditRow[]> {
  const [{ data: base }, { data: own }] = await Promise.all([
    db.from('sacrament_texts').select('type, title, content, sort_order').eq('is_active', true).order('sort_order'),
    db.from('parish_sacrament_texts').select('type, content, is_hidden').eq('parish_id', parishId),
  ])
  const ownMap = new Map((own ?? []).map((o) => [o.type as string, o]))
  return (base ?? []).map((b) => ({
    type: b.type,
    title: b.title,
    base_content: b.content,
    own_content: (ownMap.get(b.type)?.content as string | null) ?? null,
    is_hidden: !!ownMap.get(b.type)?.is_hidden,
  }))
}

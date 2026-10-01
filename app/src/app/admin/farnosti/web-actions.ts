'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { logParishChange, writeSocialLinks } from '@/lib/parishes/writes'
import type { SocialLink } from '@/lib/parishes/social'
import { sanitizeRichHtml } from '@/lib/html/sanitize'
import { uploadImage } from '@/lib/storage'
import { POST_COLUMNS, loadSacramentEditRows, writeParishPost, type ParishPostInput, type ParishPostRow, type SacramentEditRow } from '@/lib/parishes/posts'

/**
 * Web farností – diecézna strana (fáza F5): diecézne texty sviatostí (O27)
 * a následná kontrola obsahu farností – „Najnovšie od farností“ so stiahnutím (§ 4.3).
 */

const PERM = 'manage_parishes'
const db = () => createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
type Result = { success: true } | { success: false; error: string }

export interface RecentParishPost {
  id: string
  type: 'announcement' | 'news'
  title: string
  slug: string
  excerpt: string | null
  published: boolean
  published_at: string | null
  updated_at: string
  taken_down_at: string | null
  takedown_reason: string | null
  parish_id: string
  parish_name: string
  parish_slug: string | null
}

export async function getRecentParishPosts(filter: 'all' | 'taken_down' = 'all'): Promise<RecentParishPost[]> {
  await requirePermission(PERM)
  let q = db()
    .from('parish_posts')
    .select('id, type, title, slug, excerpt, published, published_at, updated_at, taken_down_at, takedown_reason, parish_id, parishes(name, official_name, slug)')
    .order('updated_at', { ascending: false })
    .limit(100)
  q = filter === 'taken_down' ? q.not('taken_down_at', 'is', null) : q.or('published.eq.true,taken_down_at.not.is.null')
  const { data } = await q
  type Row = Omit<RecentParishPost, 'parish_name' | 'parish_slug'> & { parishes: { name: string; official_name: string | null; slug: string | null } | null }
  return ((data ?? []) as unknown as Row[]).map(({ parishes, ...r }) => ({
    ...r,
    parish_name: parishes?.official_name ?? parishes?.name ?? '—',
    parish_slug: parishes?.slug ?? null,
  }))
}

/** Stiahnutie príspevku z webu (farnosť ho potom znova zverejniť nemôže) alebo jeho obnovenie. */
export async function setPostTakedown(postId: string, takeDown: boolean, reason?: string): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const client = db()
  const { data: post } = await client.from('parish_posts').select('id, parish_id, title, parishes(slug)').eq('id', postId).maybeSingle()
  if (!post) return { success: false, error: 'Príspevok sa nenašiel.' }
  const patch = takeDown
    ? { taken_down_at: new Date().toISOString(), taken_down_by: user.id, takedown_reason: reason?.trim().slice(0, 300) || null, published: false }
    : { taken_down_at: null, taken_down_by: null, takedown_reason: null, published: true }
  const { error } = await client.from('parish_posts').update(patch).eq('id', postId)
  if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  await logParishChange(client, post.parish_id, user.id, 'post', takeDown ? 'takedown' : 'restore', { title: post.title, reason: reason ?? null })
  revalidatePath('/admin/farnosti/prispevky')
  const slug = (post.parishes as unknown as { slug: string | null } | null)?.slug
  if (slug) revalidatePath(`/farnosti/${slug}`, 'layout')
  return { success: true }
}

export interface SacramentTextRow {
  type: string
  title: string
  content: string
  sort_order: number
  is_active: boolean
  customized_count: number
}

export async function getSacramentTexts(): Promise<SacramentTextRow[]> {
  await requirePermission(PERM)
  const client = db()
  const [{ data }, { data: own }] = await Promise.all([
    client.from('sacrament_texts').select('type, title, content, sort_order, is_active').order('sort_order'),
    client.from('parish_sacrament_texts').select('type').not('content', 'is', null),
  ])
  const counts = new Map<string, number>()
  for (const o of own ?? []) counts.set(o.type, (counts.get(o.type) ?? 0) + 1)
  return ((data ?? []) as Omit<SacramentTextRow, 'customized_count'>[]).map((r) => ({ ...r, customized_count: counts.get(r.type) ?? 0 }))
}

export async function saveSacramentText(type: string, input: { title: string; content: string; is_active: boolean }): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const title = input.title.trim()
  if (!title) return { success: false, error: 'Vyplňte názov.' }
  const { error } = await db()
    .from('sacrament_texts')
    .update({ title, content: sanitizeRichHtml(input.content), is_active: input.is_active, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('type', type)
  if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  revalidatePath('/admin/farnosti/sviatosti')
  revalidatePath('/farnosti', 'layout')
  return { success: true }
}

// ------------------------------------------------------------ Web farnosti v detaile farnosti (admin)

async function revalidateParish(parishId: string) {
  const { data } = await db().from('parishes').select('slug').eq('id', parishId).maybeSingle()
  revalidatePath(`/admin/farnosti/${parishId}`)
  if (data?.slug) revalidatePath(`/farnosti/${data.slug}`, 'layout')
}

export async function getParishWebForAdmin(parishId: string): Promise<{ posts: ParishPostRow[]; sacraments: SacramentEditRow[] }> {
  await requirePermission(PERM)
  const client = db()
  const [{ data: posts }, sacraments] = await Promise.all([
    client.from('parish_posts').select(POST_COLUMNS).eq('parish_id', parishId).order('created_at', { ascending: false }).limit(200),
    loadSacramentEditRows(client, parishId),
  ])
  return { posts: (posts ?? []) as ParishPostRow[], sacraments }
}

/** Diecéza píše za farnosť; stiahnutie nerieši (na to je setPostTakedown). */
export async function adminSaveParishPost(parishId: string, input: ParishPostInput) {
  const { user } = await requirePermission(PERM)
  const client = db()
  const res = await writeParishPost(client, parishId, user.id, input)
  if (!res.success) return res
  await logParishChange(client, parishId, user.id, 'post', input.id ? 'admin_update' : 'post_create', { title: input.title, published: input.published })
  await revalidateParish(parishId)
  return res
}

export async function adminDeleteParishPost(parishId: string, postId: string): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const client = db()
  const { data } = await client.from('parish_posts').select('title').eq('id', postId).eq('parish_id', parishId).maybeSingle()
  if (!data) return { success: false, error: 'Príspevok sa nenašiel.' }
  const { error } = await client.from('parish_posts').delete().eq('id', postId)
  if (error) return { success: false, error: 'Zmazanie zlyhalo.' }
  await logParishChange(client, parishId, user.id, 'post', 'post_delete', { title: data.title })
  await revalidateParish(parishId)
  return { success: true }
}

export async function adminUploadParishFile(parishId: string, formData: FormData): Promise<{ url?: string; name?: string; error?: string }> {
  await requirePermission(PERM)
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Žiadny súbor.' }
  if (file.size > 15 * 1024 * 1024) return { error: 'Súbor je väčší ako 15 MB.' }
  const isPdf = file.type === 'application/pdf'
  if (!isPdf && !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return { error: 'Povolené sú obrázky (JPG, PNG, WebP) a PDF.' }
  const res = await uploadImage(file, `parishes/${parishId}/${isPdf ? 'files' : 'images'}`)
  return res ? { url: res.url, name: file.name } : { error: 'Nahrávanie zlyhalo.' }
}

export async function adminUploadEditorImage(parishId: string, formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get('file')
  if (file instanceof File && file.type === 'application/pdf') return { error: 'Do textu vkladajte len obrázky.' }
  const res = await adminUploadParishFile(parishId, formData)
  return res.url ? { url: res.url } : { error: res.error }
}

export async function adminSaveParishSacrament(parishId: string, type: string, content: string | null, isHidden: boolean): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const client = db()
  const clean = content == null ? null : sanitizeRichHtml(content) || null
  if (!clean && !isHidden) {
    await client.from('parish_sacrament_texts').delete().eq('parish_id', parishId).eq('type', type)
  } else {
    const { error } = await client
      .from('parish_sacrament_texts')
      .upsert({ parish_id: parishId, type, content: clean, is_hidden: isHidden, updated_by: user.id, updated_at: new Date().toISOString() })
    if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  }
  await logParishChange(client, parishId, user.id, 'sacrament', 'admin_update', { [type]: isHidden ? 'skryté' : clean ? 'vlastný text' : 'diecézny text' })
  await revalidateParish(parishId)
  return { success: true }
}

export async function adminSaveSocialLinks(parishId: string, links: SocialLink[]): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const res = await writeSocialLinks(db(), parishId, user.id, links, 'admin_update')
  if (res.success) await revalidateParish(parishId)
  return res
}

'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { dioceseDb } from '@/lib/diocese/public'
import { listIssues, saveIssue, storeCover, syncFromZachej, type MagazineInput, type MagazineRow } from '@/lib/diocese/magazine'
import { generateSlug } from '@/lib/slug'
import {
  getAdminPost, listAdminCategories, listAdminPosts, storePostImage, writePost,
  type AdminDioceseCategory, type AdminDiocesePost, type DiocesePostInput,
} from '@/lib/diocese/posts-admin'

/** Web diecézy dcza.sk – správa kúriou (§ 20, D3). Zatiaľ časopis. */

const PERM = 'manage_diocese_web'
type Result<T = object> = ({ success: true } & T) | { success: false; error: string }
const fail = (err: unknown) => ({ success: false as const, error: err instanceof Error ? err.message : 'Neznáma chyba' })

function revalidateMagazine() {
  revalidatePath('/admin/web-dieceza/casopis')
  revalidatePath('/dcza', 'layout')
}

export async function adminListMagazine(): Promise<MagazineRow[]> {
  await requirePermission(PERM)
  return listIssues(dioceseDb())
}

export async function adminSaveMagazine(id: string | null, input: MagazineInput): Promise<Result<{ id: string }>> {
  try {
    await requirePermission(PERM)
    const res = await saveIssue(dioceseDb(), id, input)
    if (res.success) revalidateMagazine()
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function adminDeleteMagazine(id: string): Promise<Result> {
  try {
    await requirePermission(PERM)
    const { error } = await dioceseDb().from('diocese_magazine_issues').delete().eq('id', id)
    if (error) return { success: false, error: 'Zmazanie zlyhalo.' }
    revalidateMagazine()
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

/** Nahratie obálky (JPG/PNG/WebP) → WebP na B2. */
export async function adminUploadMagazineCover(formData: FormData): Promise<Result<{ url: string }>> {
  try {
    await requirePermission(PERM)
    const file = formData.get('file')
    if (!(file instanceof File) || !file.type.startsWith('image/')) return { success: false, error: 'Vyberte obrázok obálky.' }
    if (file.size > 15 * 1024 * 1024) return { success: false, error: 'Obrázok je väčší ako 15 MB.' }
    const url = await storeCover(Buffer.from(await file.arrayBuffer()))
    return url ? { success: true, url } : { success: false, error: 'Nahratie zlyhalo.' }
  } catch (err) {
    return fail(err)
  }
}

export async function adminSyncMagazine(): Promise<Result<{ added: string[]; updated: string[]; errors: string[] }>> {
  try {
    await requirePermission(PERM)
    const res = await syncFromZachej(dioceseDb())
    revalidateMagazine()
    return { success: true, ...res }
  } catch (err) {
    return fail(err)
  }
}

// ------------------------------------------------------------ aktuality diecézy (D3)


function revalidateNews(slug?: string) {
  revalidatePath('/admin/web-dieceza/aktuality')
  revalidatePath('/dcza', 'layout')
  if (slug) revalidatePath(`/dcza/aktuality/${slug}`)
}

export async function adminListDiocesePosts(): Promise<{ posts: AdminDiocesePost[]; categories: AdminDioceseCategory[] }> {
  await requirePermission(PERM)
  const db = dioceseDb()
  const [posts, categories] = await Promise.all([listAdminPosts(db), listAdminCategories(db)])
  return { posts, categories }
}

export async function adminGetDiocesePost(id: string): Promise<AdminDiocesePost | null> {
  await requirePermission(PERM)
  return /^[0-9a-f-]{36}$/i.test(id) ? getAdminPost(dioceseDb(), id) : null
}

export async function adminSaveDiocesePost(input: DiocesePostInput): Promise<Result<{ id: string; slug: string }>> {
  try {
    const { user } = await requirePermission(PERM)
    const res = await writePost(dioceseDb(), user.id, input)
    if (res.success) revalidateNews(res.slug)
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function adminDeleteDiocesePost(id: string): Promise<Result> {
  try {
    await requirePermission(PERM)
    const db = dioceseDb()
    const { data } = await db.from('diocese_posts').select('slug').eq('id', id).maybeSingle()
    const { error } = await db.from('diocese_posts').delete().eq('id', id)
    if (error) return { success: false, error: 'Zmazanie zlyhalo.' }
    // stará adresa (import) už nemá kam viesť – presmerovanie na zoznam
    if (data?.slug) await db.from('diocese_redirects').update({ to_path: '/aktuality' }).eq('to_path', `/aktuality/${data.slug}`)
    revalidateNews()
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

/** Obrázok pre článok (titulný alebo v texte editora). */
export async function adminUploadDioceseImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  try {
    await requirePermission(PERM)
    const file = formData.get('file') ?? formData.get('image')
    if (!(file instanceof File) || !file.type.startsWith('image/')) return { error: 'Vyberte obrázok.' }
    if (file.size > 15 * 1024 * 1024) return { error: 'Obrázok je väčší ako 15 MB.' }
    const url = await storePostImage(Buffer.from(await file.arrayBuffer()))
    return url ? { url } : { error: 'Nahratie zlyhalo.' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Nahratie zlyhalo.' }
  }
}

export async function adminSaveDioceseCategory(input: { id?: string; name: string; description?: string | null; is_visible: boolean }): Promise<Result> {
  try {
    await requirePermission(PERM)
    const db = dioceseDb()
    const name = input.name?.trim()
    if (!name) return { success: false, error: 'Zadajte názov kategórie.' }
    const row = { name: name.slice(0, 80), description: input.description?.trim() || null, is_visible: input.is_visible }
    if (input.id) {
      const { error } = await db.from('diocese_post_categories').update(row).eq('id', input.id)
      if (error) return { success: false, error: 'Uloženie zlyhalo.' }
    } else {
      const base = generateSlug(name).slice(0, 60) || 'kategoria'
      const { data: same } = await db.from('diocese_post_categories').select('slug').like('slug', `${base}%`)
      if (base === 'krok') return { success: false, error: 'Názov „krok“ je vyhradený pre aktuality Kroku.' }
      const { data: last } = await db.from('diocese_post_categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
      const { error } = await db.from('diocese_post_categories').insert({ ...row, slug: same?.length ? `${base}-${same.length + 1}` : base, sort_order: (last?.sort_order ?? 0) + 10 })
      if (error) return { success: false, error: 'Kategóriu sa nepodarilo založiť.' }
    }
    revalidateNews()
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

export async function adminMoveDioceseCategory(id: string, dir: -1 | 1): Promise<Result> {
  try {
    await requirePermission(PERM)
    const db = dioceseDb()
    const { data } = await db.from('diocese_post_categories').select('id').order('sort_order')
    const ids = (data ?? []).map((x) => x.id as string)
    const i = ids.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return { success: true }
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    for (const [k, cid] of ids.entries()) await db.from('diocese_post_categories').update({ sort_order: (k + 1) * 10 }).eq('id', cid)
    revalidateNews()
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

export async function adminDeleteDioceseCategory(id: string): Promise<Result> {
  try {
    await requirePermission(PERM)
    const db = dioceseDb()
    const { count } = await db.from('diocese_post_category_links').select('post_id', { count: 'exact', head: true }).eq('category_id', id)
    if (count) return { success: false, error: 'Kategória obsahuje články – presuňte ich alebo kategóriu len skryte.' }
    const { error } = await db.from('diocese_post_categories').delete().eq('id', id)
    if (error) return { success: false, error: 'Zmazanie zlyhalo.' }
    revalidateNews()
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

export async function adminListDioceseCategories(): Promise<AdminDioceseCategory[]> {
  await requirePermission(PERM)
  return listAdminCategories(dioceseDb())
}

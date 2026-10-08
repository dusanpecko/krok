'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { sanitizeRichHtml } from '@/lib/html/sanitize'
import { generateSlug } from '@/lib/slug'
import { zoneDb } from '@/lib/clergy-zone/access'
import { rebuildSearchText } from '@/lib/clergy-zone/docs'
import { extractFileText } from '@/lib/clergy-zone/extract'
import { deleteObject, isPrivateStorage, MAX_FILE_BYTES, newFileKey, presignUpload, readObject } from '@/lib/clergy-zone/storage'
import { inviteClergyToZone, listZoneMembers, notifyNewDoc, type ZoneMember } from '@/lib/clergy-zone/notify'
import type { AdminZoneDoc, ZoneCategory, ZoneDocInput, ZoneFile } from '@/lib/clergy-zone/types'

/** Kňazská zóna – správa dokumentov kúriou (O41), kategórie a pozvánky kňazov (§ 15). */

const PERM = 'manage_clergy_docs'
type Result<T = object> = ({ success: true } & T) | { success: false; error: string }
const fail = (err: unknown) => ({ success: false as const, error: err instanceof Error ? err.message : 'Neznáma chyba' })
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function revalidateZone(docId?: string) {
  revalidatePath('/admin/knazska-zona')
  revalidatePath('/knazska-zona', 'layout')
  if (docId) revalidatePath(`/admin/knazska-zona/${docId}`)
}

const ADMIN_COLUMNS =
  'id, category_id, title, doc_number, issued_on, summary, body, status, published, published_at, notified_at, notified_count, updated_at, clergy_doc_categories!inner(name, slug), clergy_doc_files(id, file_name, mime_type, size_bytes, sort_order)'

type AdminRow = Omit<AdminZoneDoc, 'category_name' | 'category_slug' | 'files'> & {
  clergy_doc_categories: { name: string; slug: string }
  clergy_doc_files: { id: string; file_name: string; mime_type: string | null; size_bytes: number; sort_order: number }[] | null
}

function toAdmin(r: AdminRow, withText = new Set<string>()): AdminZoneDoc {
  const { clergy_doc_categories: cat, clergy_doc_files: files, ...rest } = r
  return {
    ...rest,
    category_name: cat.name,
    category_slug: cat.slug,
    files: [...(files ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((f): ZoneFile => ({ id: f.id, file_name: f.file_name, mime_type: f.mime_type, size_bytes: Number(f.size_bytes), has_text: withText.has(f.id) })),
  }
}

// ------------------------------------------------------------ prehľad

export interface ZoneAdminOverview {
  docs: AdminZoneDoc[]
  categories: (ZoneCategory & { doc_count: number })[]
  privateStorage: boolean
}

export async function getZoneAdminOverview(): Promise<ZoneAdminOverview> {
  await requirePermission(PERM)
  const db = zoneDb()
  const [{ data: docs }, { data: cats }] = await Promise.all([
    db.from('clergy_docs').select(ADMIN_COLUMNS).order('updated_at', { ascending: false }).limit(1000),
    db.from('clergy_doc_categories').select('id, slug, name, description, sort_order, is_visible').order('sort_order'),
  ])
  const rows = (docs ?? []) as unknown as AdminRow[]
  return {
    docs: rows.map((r) => toAdmin(r)),
    categories: ((cats ?? []) as ZoneCategory[]).map((c) => ({ ...c, doc_count: rows.filter((d) => d.category_id === c.id).length })),
    privateStorage: isPrivateStorage(),
  }
}

export async function getZoneAdminDoc(id: string): Promise<AdminZoneDoc | null> {
  await requirePermission(PERM)
  const db = zoneDb()
  const [{ data }, { data: texts }] = await Promise.all([
    db.from('clergy_docs').select(ADMIN_COLUMNS).eq('id', id).maybeSingle(),
    db.from('clergy_doc_files').select('id').eq('doc_id', id).not('content_text', 'is', null).neq('content_text', ''),
  ])
  return data ? toAdmin(data as unknown as AdminRow, new Set((texts ?? []).map((t) => t.id))) : null
}

// ------------------------------------------------------------ dokumenty

export async function saveZoneDoc(input: ZoneDocInput): Promise<Result<{ id: string }>> {
  try {
    const { user } = await requirePermission(PERM)
    const db = zoneDb()
    const title = input.title?.trim()
    if (!title) return { success: false, error: 'Zadajte názov dokumentu.' }
    if (!input.category_id) return { success: false, error: 'Vyberte kategóriu.' }
    if (input.issued_on && !DATE_RE.test(input.issued_on)) return { success: false, error: 'Dátum vydania má tvar RRRR-MM-DD.' }
    const row = {
      category_id: input.category_id,
      title: title.slice(0, 300),
      doc_number: input.doc_number?.trim().slice(0, 50) || null,
      issued_on: input.issued_on || null,
      summary: input.summary?.trim().slice(0, 1000) || null,
      body: sanitizeRichHtml(input.body) || null,
      status: input.status === 'archived' ? 'archived' : 'current',
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }
    let id = input.id
    if (id) {
      const { error } = await db.from('clergy_docs').update(row).eq('id', id)
      if (error) return { success: false, error: 'Dokument sa nepodarilo uložiť.' }
    } else {
      const { data, error } = await db.from('clergy_docs').insert({ ...row, created_by: user.id }).select('id').single()
      if (error || !data) return { success: false, error: 'Dokument sa nepodarilo založiť.' }
      id = data.id as string
    }
    await rebuildSearchText(db, id)
    revalidateZone(id)
    return { success: true, id }
  } catch (err) {
    return fail(err)
  }
}

/**
 * Zverejnenie / skrytie. Pri prvom zverejnení so zapnutým `notify` odíde e-mail kňazom (O40, O69);
 * znova sa posiela len výslovne (`resend`).
 */
export async function publishZoneDoc(
  id: string,
  opts: { publish: boolean; notify?: boolean; resend?: boolean }
): Promise<Result<{ sent?: number; failed?: number; withoutEmail?: number }>> {
  try {
    await requirePermission(PERM)
    const db = zoneDb()
    const { data: doc } = await db.from('clergy_docs').select('id, published_at, notified_at, clergy_doc_files(id), body').eq('id', id).maybeSingle()
    if (!doc) return { success: false, error: 'Dokument sa nenašiel.' }
    if (opts.publish && !(doc.clergy_doc_files as unknown[] | null)?.length && !doc.body) {
      return { success: false, error: 'Pridajte aspoň jeden súbor alebo text dokumentu.' }
    }
    await db
      .from('clergy_docs')
      .update({ published: opts.publish, published_at: opts.publish ? doc.published_at ?? new Date().toISOString() : doc.published_at })
      .eq('id', id)
    let stats: { sent?: number; failed?: number; withoutEmail?: number } = {}
    if (opts.publish && opts.notify && (!doc.notified_at || opts.resend)) stats = await notifyNewDoc(db, id)
    revalidateZone(id)
    return { success: true, ...stats }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteZoneDoc(id: string): Promise<Result> {
  try {
    await requirePermission(PERM)
    const db = zoneDb()
    const { data: files } = await db.from('clergy_doc_files').select('storage_key').eq('doc_id', id)
    const { error } = await db.from('clergy_docs').delete().eq('id', id)
    if (error) return { success: false, error: 'Dokument sa nepodarilo zmazať.' }
    for (const f of files ?? []) await deleteObject(f.storage_key)
    revalidateZone()
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

// ------------------------------------------------------------ súbory (priamo do B2 podpísanou adresou)

export async function prepareZoneUpload(docId: string, fileName: string, contentType: string, size: number): Promise<Result<{ url: string; key: string }>> {
  try {
    await requirePermission(PERM)
    if (!fileName) return { success: false, error: 'Chýba názov súboru.' }
    if (size > MAX_FILE_BYTES) return { success: false, error: `${fileName}: súbor je väčší ako 100 MB.` }
    const { data } = await zoneDb().from('clergy_docs').select('id').eq('id', docId).maybeSingle()
    if (!data) return { success: false, error: 'Dokument sa nenašiel.' }
    const key = newFileKey(docId, fileName)
    return { success: true, key, url: await presignUpload(key, contentType || 'application/octet-stream') }
  } catch (err) {
    return fail(err)
  }
}

/** Po nahratí: overí súbor v úložisku, vytiahne text na hľadanie a uloží záznam. */
export async function finishZoneUpload(docId: string, key: string, fileName: string, contentType: string): Promise<Result<{ file: ZoneFile }>> {
  try {
    await requirePermission(PERM)
    if (!key.startsWith(`knazska-zona/${docId}/`)) return { success: false, error: 'Neplatný súbor.' }
    const db = zoneDb()
    const obj = await readObject(key)
    if (!obj) return { success: false, error: `${fileName}: súbor sa v úložisku nenašiel – skúste ho nahrať znova.` }
    if (obj.size > MAX_FILE_BYTES) {
      await deleteObject(key)
      return { success: false, error: `${fileName}: súbor je väčší ako 100 MB.` }
    }
    const text = await extractFileText(obj.bytes, fileName, contentType || obj.contentType)
    const { data: last } = await db.from('clergy_doc_files').select('sort_order').eq('doc_id', docId).order('sort_order', { ascending: false }).limit(1).maybeSingle()
    const { data, error } = await db
      .from('clergy_doc_files')
      .insert({
        doc_id: docId,
        storage_key: key,
        file_name: fileName.slice(0, 200),
        mime_type: contentType || obj.contentType,
        size_bytes: obj.size,
        content_text: text || null,
        sort_order: (last?.sort_order ?? -1) + 1,
      })
      .select('id, file_name, mime_type, size_bytes')
      .single()
    if (error || !data) {
      await deleteObject(key)
      return { success: false, error: 'Súbor sa nepodarilo uložiť.' }
    }
    await db.from('clergy_docs').update({ updated_at: new Date().toISOString() }).eq('id', docId)
    await rebuildSearchText(db, docId)
    revalidateZone(docId)
    return { success: true, file: { ...data, size_bytes: Number(data.size_bytes), has_text: !!text } }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteZoneFile(fileId: string): Promise<Result> {
  try {
    await requirePermission(PERM)
    const db = zoneDb()
    const { data: f } = await db.from('clergy_doc_files').select('doc_id, storage_key').eq('id', fileId).maybeSingle()
    if (!f) return { success: false, error: 'Súbor sa nenašiel.' }
    await db.from('clergy_doc_files').delete().eq('id', fileId)
    await deleteObject(f.storage_key)
    await rebuildSearchText(db, f.doc_id)
    revalidateZone(f.doc_id)
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

export async function moveZoneFile(fileId: string, dir: -1 | 1): Promise<Result> {
  try {
    await requirePermission(PERM)
    const db = zoneDb()
    const { data: f } = await db.from('clergy_doc_files').select('doc_id').eq('id', fileId).maybeSingle()
    if (!f) return { success: false, error: 'Súbor sa nenašiel.' }
    const { data: all } = await db.from('clergy_doc_files').select('id').eq('doc_id', f.doc_id).order('sort_order')
    const ids = (all ?? []).map((x) => x.id as string)
    const i = ids.indexOf(fileId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return { success: true }
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    for (const [k, id] of ids.entries()) await db.from('clergy_doc_files').update({ sort_order: k }).eq('id', id)
    revalidateZone(f.doc_id)
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

// ------------------------------------------------------------ kategórie

export async function saveZoneCategory(input: { id?: string; name: string; description?: string | null; is_visible: boolean }): Promise<Result> {
  try {
    await requirePermission(PERM)
    const db = zoneDb()
    const name = input.name?.trim()
    if (!name) return { success: false, error: 'Zadajte názov kategórie.' }
    const row = { name: name.slice(0, 80), description: input.description?.trim() || null, is_visible: input.is_visible }
    if (input.id) {
      const { error } = await db.from('clergy_doc_categories').update(row).eq('id', input.id)
      if (error) return { success: false, error: 'Kategóriu sa nepodarilo uložiť.' }
    } else {
      const base = generateSlug(name).slice(0, 60) || 'kategoria'
      const { data: same } = await db.from('clergy_doc_categories').select('slug').like('slug', `${base}%`)
      const slug = same?.length ? `${base}-${same.length + 1}` : base
      const { data: last } = await db.from('clergy_doc_categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
      const { error } = await db.from('clergy_doc_categories').insert({ ...row, slug, sort_order: (last?.sort_order ?? 0) + 10 })
      if (error) return { success: false, error: 'Kategóriu sa nepodarilo založiť.' }
    }
    revalidateZone()
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

export async function moveZoneCategory(id: string, dir: -1 | 1): Promise<Result> {
  try {
    await requirePermission(PERM)
    const db = zoneDb()
    const { data: all } = await db.from('clergy_doc_categories').select('id').order('sort_order')
    const ids = (all ?? []).map((x) => x.id as string)
    const i = ids.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return { success: true }
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    for (const [k, cid] of ids.entries()) await db.from('clergy_doc_categories').update({ sort_order: (k + 1) * 10 }).eq('id', cid)
    revalidateZone()
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteZoneCategory(id: string): Promise<Result> {
  try {
    await requirePermission(PERM)
    const db = zoneDb()
    const { count } = await db.from('clergy_docs').select('id', { count: 'exact', head: true }).eq('category_id', id)
    if (count) return { success: false, error: 'Kategória obsahuje dokumenty – presuňte ich najprv do inej kategórie alebo ju len skryte.' }
    const { error } = await db.from('clergy_doc_categories').delete().eq('id', id)
    if (error) return { success: false, error: 'Kategóriu sa nepodarilo zmazať.' }
    revalidateZone()
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

// ------------------------------------------------------------ kňazi – prístupy (O68)

export async function getZoneMembers(): Promise<ZoneMember[]> {
  await requirePermission(PERM)
  return listZoneMembers(zoneDb())
}

export async function inviteZoneMember(clergyId: string, opts: { email?: string | null; salutation?: string | null } = {}): Promise<Result<{ invited: boolean }>> {
  try {
    await requirePermission(PERM)
    const res = await inviteClergyToZone(zoneDb(), clergyId, opts)
    revalidatePath('/admin/knazska-zona')
    return res
  } catch (err) {
    return fail(err)
  }
}

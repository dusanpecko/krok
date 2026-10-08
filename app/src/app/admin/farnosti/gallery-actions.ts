'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { logParishChange } from '@/lib/parishes/writes'
import {
  addPhoto,
  deleteAlbum,
  deletePhoto,
  ensureChurchAlbum,
  loadGallery,
  updatePhotos,
  writeAlbum,
  type AlbumInput,
  type GalleryOverview,
  type GalleryPhoto,
} from '@/lib/parishes/gallery'

/** Fotogaléria farnosti – diecézna strana: rovnaké úpravy ako v zóne + kvóta úložiska a stiahnutie albumu (§ 17). */

const PERM = 'manage_parishes'
const db = () => createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
type Result<T = object> = ({ success: true } & T) | { success: false; error: string }
const fail = (err: unknown) => ({ success: false as const, error: err instanceof Error ? err.message : 'Neznáma chyba' })

async function revalidate(parishId: string) {
  const { data } = await db().from('parishes').select('slug').eq('id', parishId).maybeSingle()
  revalidatePath(`/admin/farnosti/${parishId}`)
  if (data?.slug) revalidatePath(`/farnosti/${data.slug}`, 'layout')
}

export async function adminGetGallery(parishId: string): Promise<GalleryOverview> {
  const { user } = await requirePermission(PERM)
  await ensureChurchAlbum(db(), parishId, user.id)
  return loadGallery(db(), parishId)
}

export async function adminSaveAlbum(parishId: string, albumId: string | null, input: AlbumInput): Promise<Result<{ id: string }>> {
  try {
    const { user } = await requirePermission(PERM)
    const res = await writeAlbum(db(), parishId, albumId, input, user.id)
    if (res.success) {
      await logParishChange(db(), parishId, user.id, 'gallery', albumId ? 'admin_album_update' : 'admin_album_create', { title: input.title })
      await revalidate(parishId)
    }
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function adminUploadPhoto(parishId: string, albumId: string, formData: FormData): Promise<Result<{ photo: GalleryPhoto }>> {
  try {
    const { user } = await requirePermission(PERM)
    const file = formData.get('file')
    if (!(file instanceof File)) return { success: false, error: 'Chýba súbor.' }
    const res = await addPhoto(db(), parishId, albumId, file, user.id)
    if (res.success) await revalidate(parishId)
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function adminUpdatePhotos(parishId: string, albumId: string, input: { order?: string[]; captions?: Record<string, string>; coverId?: string | null }): Promise<Result> {
  try {
    await requirePermission(PERM)
    const res = await updatePhotos(db(), parishId, albumId, input)
    if (res.success) await revalidate(parishId)
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function adminDeletePhoto(parishId: string, photoId: string): Promise<Result> {
  try {
    const { user } = await requirePermission(PERM)
    const res = await deletePhoto(db(), parishId, photoId)
    if (res.success) {
      await logParishChange(db(), parishId, user.id, 'gallery', 'admin_photo_delete', { photo_id: photoId })
      await revalidate(parishId)
    }
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function adminDeleteAlbum(parishId: string, albumId: string): Promise<Result> {
  try {
    const { user } = await requirePermission(PERM)
    const res = await deleteAlbum(db(), parishId, albumId)
    if (res.success) {
      await logParishChange(db(), parishId, user.id, 'gallery', 'admin_album_delete', { album_id: albumId })
      await revalidate(parishId)
    }
    return res
  } catch (err) {
    return fail(err)
  }
}

/** Kvóta úložiska galérie v MB (O60 – určuje diecéza, predvolene 1 GB). */
export async function adminSetGalleryQuota(parishId: string, megabytes: number): Promise<Result> {
  try {
    const { user } = await requirePermission(PERM)
    if (!Number.isFinite(megabytes) || megabytes < 10 || megabytes > 20480) return { success: false, error: 'Kvóta musí byť od 10 MB do 20 GB.' }
    const bytes = Math.round(megabytes * 1024 * 1024)
    const { error } = await db().from('parishes').update({ gallery_quota_bytes: bytes }).eq('id', parishId)
    if (error) return { success: false, error: 'Kvótu sa nepodarilo uložiť.' }
    await logParishChange(db(), parishId, user.id, 'gallery', 'quota', { megabytes })
    await revalidate(parishId)
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

/** Stiahnutie albumu diecézou (§ 4.3); reason = null album znova zverejní. */
export async function adminTakedownAlbum(parishId: string, albumId: string, reason: string | null): Promise<Result> {
  try {
    const { user } = await requirePermission(PERM)
    const { error } = await db()
      .from('parish_albums')
      .update(reason ? { taken_down_at: new Date().toISOString(), takedown_reason: reason.slice(0, 500) } : { taken_down_at: null, takedown_reason: null })
      .eq('id', albumId)
      .eq('parish_id', parishId)
    if (error) return { success: false, error: 'Nepodarilo sa uložiť.' }
    await logParishChange(db(), parishId, user.id, 'gallery', reason ? 'album_takedown' : 'album_restore', { album_id: albumId, reason })
    await revalidate(parishId)
    return { success: true }
  } catch (err) {
    return fail(err)
  }
}

/** Albumy „Zo života farnosti“ na pripojenie k aktualite. */
export async function adminListAlbumOptions(parishId: string): Promise<{ id: string; title: string; event_date: string | null }[]> {
  await requirePermission(PERM)
  const { data } = await db()
    .from('parish_albums')
    .select('id, title, event_date')
    .eq('parish_id', parishId)
    .eq('kind', 'life')
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}

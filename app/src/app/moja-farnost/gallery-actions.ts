'use server'

import { revalidatePath } from 'next/cache'
import { requireParishMember } from '@/lib/parishes/access'
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

/** Fotogaléria v zóne farnosti (§ 17) – správca aj editor (G3); ide na web hneď, diecéza vie album skryť. */

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

async function revalidate(db: Awaited<ReturnType<typeof requireParishMember>>['db'], parishId: string) {
  const { data } = await db.from('parishes').select('slug').eq('id', parishId).maybeSingle()
  revalidatePath(`/moja-farnost/${parishId}`)
  if (data?.slug) revalidatePath(`/farnosti/${data.slug}`, 'layout')
}

const fail = (err: unknown) => ({ success: false as const, error: err instanceof Error ? err.message : 'Neznáma chyba' })

export async function getMyGallery(parishId: string): Promise<GalleryOverview> {
  const { user, db } = await requireParishMember(parishId)
  await ensureChurchAlbum(db, parishId, user.id)
  return loadGallery(db, parishId)
}

export async function saveMyAlbum(parishId: string, albumId: string | null, input: AlbumInput): Promise<Result<{ id: string }>> {
  try {
    const { user, db } = await requireParishMember(parishId)
    const res = await writeAlbum(db, parishId, albumId, input, user.id)
    if (res.success) {
      await logParishChange(db, parishId, user.id, 'gallery', albumId ? 'album_update' : 'album_create', { title: input.title })
      await revalidate(db, parishId)
    }
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function uploadMyPhoto(parishId: string, albumId: string, formData: FormData): Promise<Result<{ photo: GalleryPhoto }>> {
  try {
    const { user, db } = await requireParishMember(parishId)
    const file = formData.get('file')
    if (!(file instanceof File)) return { success: false, error: 'Chýba súbor.' }
    const res = await addPhoto(db, parishId, albumId, file, user.id)
    if (res.success) await revalidate(db, parishId)
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function updateMyPhotos(parishId: string, albumId: string, input: { order?: string[]; captions?: Record<string, string>; coverId?: string | null }): Promise<Result> {
  try {
    const { db } = await requireParishMember(parishId)
    const res = await updatePhotos(db, parishId, albumId, input)
    if (res.success) await revalidate(db, parishId)
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function deleteMyPhoto(parishId: string, photoId: string): Promise<Result> {
  try {
    const { user, db } = await requireParishMember(parishId)
    const res = await deletePhoto(db, parishId, photoId)
    if (res.success) {
      await logParishChange(db, parishId, user.id, 'gallery', 'photo_delete', { photo_id: photoId })
      await revalidate(db, parishId)
    }
    return res
  } catch (err) {
    return fail(err)
  }
}

export async function deleteMyAlbum(parishId: string, albumId: string): Promise<Result> {
  try {
    const { user, db } = await requireParishMember(parishId)
    const res = await deleteAlbum(db, parishId, albumId)
    if (res.success) {
      await logParishChange(db, parishId, user.id, 'gallery', 'album_delete', { album_id: albumId })
      await revalidate(db, parishId)
    }
    return res
  } catch (err) {
    return fail(err)
  }
}

/** Albumy „Zo života farnosti“ na pripojenie k aktualite. */
export async function listMyAlbumOptions(parishId: string): Promise<{ id: string; title: string; event_date: string | null }[]> {
  const { db } = await requireParishMember(parishId)
  const { data } = await db
    .from('parish_albums')
    .select('id, title, event_date')
    .eq('parish_id', parishId)
    .eq('kind', 'life')
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}

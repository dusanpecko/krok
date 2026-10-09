import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deleteImage, uploadBuffer } from '@/lib/storage'
import { generateSlug } from '@/lib/slug'
import { normalizeVideos, type ParishVideo } from '@/lib/parishes/video'
import { resolveVideos } from '@/lib/parishes/video-server'
import type { AlbumInput, GalleryAlbum, GalleryOverview, GalleryPhoto, PublicAlbumSummary, PublicGalleryPhoto } from '@/lib/parishes/gallery'

/**
 * Fotogaléria diecézy (O75) – rovnaké správanie ako galéria farností (§ 17), tabuľky diocese_albums/photos.
 * Vracia rovnaké typy, takže admin používa ten istý komponent ako zóna farnosti. Serverový modul.
 */

const QUOTA = 20 * 1024 ** 3 // 20 GB
const MAX_SIDE = 2000
const ALBUM_COLUMNS = 'id, title, slug, description, event_date, cover_photo_id, external_url, videos, published, updated_at'
const PHOTO_COLUMNS = 'id, album_id, url, width, height, size_bytes, caption, sort_order'
type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

export async function loadDioceseGallery(db: SupabaseClient): Promise<GalleryOverview> {
  const [{ data: albums }, { data: photos }] = await Promise.all([
    db.from('diocese_albums').select(ALBUM_COLUMNS).order('event_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
    db.from('diocese_photos').select(PHOTO_COLUMNS).order('sort_order'),
  ])
  let used = 0
  const byAlbum = new Map<string, GalleryPhoto[]>()
  for (const p of (photos ?? []) as GalleryPhoto[]) {
    used += Number(p.size_bytes) || 0
    byAlbum.set(p.album_id, [...(byAlbum.get(p.album_id) ?? []), { ...p, size_bytes: Number(p.size_bytes) }])
  }
  return {
    albums: (albums ?? []).map((a) => ({
      ...(a as Omit<GalleryAlbum, 'kind' | 'photos' | 'videos' | 'taken_down_at' | 'takedown_reason'>),
      kind: 'life' as const,
      taken_down_at: null,
      takedown_reason: null,
      videos: normalizeVideos(a.videos),
      photos: byAlbum.get(a.id) ?? [],
    })),
    usedBytes: used,
    quotaBytes: QUOTA,
  }
}

async function uniqueSlug(db: SupabaseClient, title: string, exceptId?: string | null) {
  const base = generateSlug(title).slice(0, 80) || 'album'
  for (let i = 0; i < 50; i++) {
    const slug = i ? `${base}-${i + 1}` : base
    let q = db.from('diocese_albums').select('id').eq('slug', slug)
    if (exceptId) q = q.neq('id', exceptId)
    if (!(await q.maybeSingle()).data) return slug
  }
  return `${base}-${Date.now()}`
}

export async function writeDioceseAlbum(db: SupabaseClient, albumId: string | null, input: AlbumInput, userId: string): Promise<Result<{ id: string }>> {
  const title = input.title?.trim()
  if (!title) return { success: false, error: 'Zadajte názov albumu.' }
  const external = input.external_url?.trim() || null
  if (external && !/^https:\/\/\S+$/.test(external)) return { success: false, error: 'Odkaz na externý album musí začínať https://' }
  const videos = await resolveVideos(input.video_urls)
  if (!videos.success) return videos
  const row = {
    title: title.slice(0, 150),
    description: input.description?.trim().slice(0, 1000) || null,
    event_date: input.event_date || null,
    external_url: external,
    videos: videos.videos,
    published: input.published !== false,
    updated_at: new Date().toISOString(),
  }
  if (albumId) {
    const { error } = await db.from('diocese_albums').update({ ...row, slug: await uniqueSlug(db, title, albumId) }).eq('id', albumId)
    return error ? { success: false, error: 'Album sa nepodarilo uložiť.' } : { success: true, id: albumId }
  }
  const { data, error } = await db.from('diocese_albums').insert({ ...row, slug: await uniqueSlug(db, title), created_by: userId }).select('id').single()
  return error || !data ? { success: false, error: 'Album sa nepodarilo založiť.' } : { success: true, id: data.id }
}

export async function addDiocesePhoto(db: SupabaseClient, albumId: string, file: File, userId: string): Promise<Result<{ photo: GalleryPhoto }>> {
  if (file.type && !file.type.startsWith('image/')) return { success: false, error: `${file.name}: nie je obrázok.` }
  const { data: album } = await db.from('diocese_albums').select('id, cover_photo_id').eq('id', albumId).maybeSingle()
  if (!album) return { success: false, error: 'Album sa nenašiel.' }
  let out: Buffer
  let width: number | null = null
  let height: number | null = null
  try {
    const r = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'none' }).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true })
    out = r.data
    width = r.info.width
    height = r.info.height
  } catch {
    return { success: false, error: `${file.name}: obrázok sa nepodarilo spracovať (JPG, PNG alebo WebP).` }
  }
  const up = await uploadBuffer(out, 'image/webp', 'dcza/galeria')
  if (!up) return { success: false, error: `${file.name}: nahratie zlyhalo.` }
  const { data: last } = await db.from('diocese_photos').select('sort_order').eq('album_id', albumId).order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const { data: photo, error } = await db
    .from('diocese_photos')
    .insert({ album_id: albumId, url: up.url, storage_key: up.key, width, height, size_bytes: out.length, sort_order: (last?.sort_order ?? -1) + 1, created_by: userId })
    .select(PHOTO_COLUMNS)
    .single()
  if (error || !photo) {
    await deleteImage(up.key)
    return { success: false, error: 'Fotku sa nepodarilo uložiť.' }
  }
  if (!album.cover_photo_id) await db.from('diocese_albums').update({ cover_photo_id: photo.id }).eq('id', albumId)
  return { success: true, photo: { ...(photo as GalleryPhoto), size_bytes: Number(photo.size_bytes) } }
}

export async function updateDiocesePhotos(db: SupabaseClient, albumId: string, input: { order?: string[]; captions?: Record<string, string>; coverId?: string | null }): Promise<Result> {
  const { data: photos } = await db.from('diocese_photos').select('id').eq('album_id', albumId)
  const ids = new Set((photos ?? []).map((p) => p.id))
  if (input.order) for (const [i, id] of input.order.entries()) if (ids.has(id)) await db.from('diocese_photos').update({ sort_order: i }).eq('id', id)
  if (input.captions) for (const [id, c] of Object.entries(input.captions)) if (ids.has(id)) await db.from('diocese_photos').update({ caption: c.trim().slice(0, 300) || null }).eq('id', id)
  if (input.coverId !== undefined) {
    if (input.coverId && !ids.has(input.coverId)) return { success: false, error: 'Titulná fotka nepatrí do albumu.' }
    await db.from('diocese_albums').update({ cover_photo_id: input.coverId }).eq('id', albumId)
  }
  return { success: true }
}

export async function deleteDiocesePhoto(db: SupabaseClient, photoId: string): Promise<Result> {
  const { data: p } = await db.from('diocese_photos').select('storage_key').eq('id', photoId).maybeSingle()
  if (!p) return { success: false, error: 'Fotka sa nenašla.' }
  await db.from('diocese_photos').delete().eq('id', photoId)
  if (p.storage_key) await deleteImage(p.storage_key)
  return { success: true }
}

export async function deleteDioceseAlbum(db: SupabaseClient, albumId: string): Promise<Result> {
  const { data: photos } = await db.from('diocese_photos').select('storage_key').eq('album_id', albumId)
  await db.from('diocese_albums').update({ cover_photo_id: null }).eq('id', albumId)
  const { error } = await db.from('diocese_albums').delete().eq('id', albumId)
  if (error) return { success: false, error: 'Album sa nepodarilo zmazať.' }
  for (const p of photos ?? []) if (p.storage_key) await deleteImage(p.storage_key)
  return { success: true }
}

// ------------------------------------------------------------ verejné

export async function getDioceseAlbums(db: SupabaseClient, limit = 24, offset = 0): Promise<PublicAlbumSummary[]> {
  const { data: albums } = await db
    .from('diocese_albums')
    .select('id, title, slug, description, event_date, cover_photo_id, external_url, videos')
    .eq('published', true)
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (!albums?.length) return []
  const { data: photos } = await db.from('diocese_photos').select('id, album_id, url').in('album_id', albums.map((a) => a.id)).order('sort_order')
  return albums
    .map((a) => {
      const mine = (photos ?? []).filter((p) => p.album_id === a.id)
      const videos = normalizeVideos(a.videos)
      const cover = mine.find((p) => p.id === a.cover_photo_id) ?? mine[0]
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        description: a.description,
        event_date: a.event_date,
        cover_url: cover?.url ?? videos.find((v) => v.thumbnail)?.thumbnail ?? null,
        photo_count: mine.length,
        video_count: videos.length,
        external_url: a.external_url,
      }
    })
    .filter((a) => a.photo_count > 0 || a.video_count > 0 || a.external_url)
}

export async function getDioceseAlbum(db: SupabaseClient, slug: string): Promise<(PublicAlbumSummary & { photos: PublicGalleryPhoto[]; videos: ParishVideo[] }) | null> {
  const { data: a } = await db.from('diocese_albums').select('id, title, slug, description, event_date, cover_photo_id, videos').eq('slug', slug).eq('published', true).maybeSingle()
  if (!a) return null
  const { data: photos } = await db.from('diocese_photos').select('id, url, width, height, caption').eq('album_id', a.id).order('sort_order')
  const videos = normalizeVideos(a.videos)
  if (!photos?.length && !videos.length) return null
  const cover = photos?.find((p) => p.id === a.cover_photo_id) ?? photos?.[0]
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    description: a.description,
    event_date: a.event_date,
    cover_url: cover?.url ?? null,
    photo_count: photos?.length ?? 0,
    video_count: videos.length,
    external_url: null,
    photos: (photos ?? []).map(({ url, width, height, caption }) => ({ url, width, height, caption })),
    videos,
  }
}

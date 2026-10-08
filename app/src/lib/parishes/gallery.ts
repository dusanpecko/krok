import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deleteImage, uploadBuffer } from '@/lib/storage'
import { generateSlug } from '@/lib/slug'

/**
 * Fotogaléria farnosti (krok_navrh_farnosti.md § 17, O59–O64): album „Kostol a farnosť“ (kind = church,
 * pás fotiek hore na stránke) a albumy „Zo života farnosti“ (kind = life). Fotky sa na serveri zmenšia
 * a prevedú do WebP; súčet veľkostí stráži kvóta farnosti (parishes.gallery_quota_bytes). Serverový modul.
 */

export type AlbumKind = 'church' | 'life'

export interface GalleryPhoto {
  id: string
  album_id: string
  url: string
  width: number | null
  height: number | null
  size_bytes: number
  caption: string | null
  sort_order: number
}

export interface GalleryAlbum {
  id: string
  kind: AlbumKind
  title: string
  slug: string
  description: string | null
  event_date: string | null
  cover_photo_id: string | null
  /** externý album (Facebook, Google Fotky, Zonerama…) – dlaždica s odkazom namiesto fotiek (G6) */
  external_url: string | null
  published: boolean
  taken_down_at: string | null
  takedown_reason: string | null
  updated_at: string
  photos: GalleryPhoto[]
}

export interface GalleryOverview {
  albums: GalleryAlbum[]
  usedBytes: number
  quotaBytes: number
}

export interface AlbumInput {
  title: string
  description?: string | null
  event_date?: string | null
  external_url?: string | null
  published?: boolean
}

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

export const CHURCH_ALBUM_TITLE = 'Kostol a farnosť'
const MAX_SIDE = 2000
const MAX_INPUT_BYTES = 25 * 1024 * 1024
const ALBUM_COLUMNS = 'id, kind, title, slug, description, event_date, cover_photo_id, external_url, published, taken_down_at, takedown_reason, updated_at'
const PHOTO_COLUMNS = 'id, album_id, url, width, height, size_bytes, caption, sort_order'

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} kB`
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

// ------------------------------------------------------------ čítanie (správa)

export async function loadGallery(db: SupabaseClient, parishId: string): Promise<GalleryOverview> {
  const [{ data: albums }, { data: photos }, { data: parish }] = await Promise.all([
    db.from('parish_albums').select(ALBUM_COLUMNS).eq('parish_id', parishId).order('kind').order('event_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
    db.from('parish_photos').select(PHOTO_COLUMNS).eq('parish_id', parishId).order('sort_order'),
    db.from('parishes').select('gallery_quota_bytes').eq('id', parishId).maybeSingle(),
  ])
  const byAlbum = new Map<string, GalleryPhoto[]>()
  let used = 0
  for (const p of (photos ?? []) as GalleryPhoto[]) {
    used += Number(p.size_bytes) || 0
    byAlbum.set(p.album_id, [...(byAlbum.get(p.album_id) ?? []), { ...p, size_bytes: Number(p.size_bytes) }])
  }
  return {
    albums: ((albums ?? []) as Omit<GalleryAlbum, 'photos'>[]).map((a) => ({ ...a, photos: byAlbum.get(a.id) ?? [] })),
    usedBytes: used,
    quotaBytes: Number(parish?.gallery_quota_bytes ?? 1073741824),
  }
}

async function uniqueSlug(db: SupabaseClient, parishId: string, title: string, exceptId?: string): Promise<string> {
  const base = generateSlug(title).slice(0, 80) || 'album'
  let slug = base
  for (let n = 2; n < 50; n++) {
    let q = db.from('parish_albums').select('id').eq('parish_id', parishId).eq('slug', slug)
    if (exceptId) q = q.neq('id', exceptId)
    const { data } = await q.maybeSingle()
    if (!data) return slug
    slug = `${base}-${n}`
  }
  return `${base}-${Date.now()}`
}

/** Album „Kostol a farnosť“ – vznikne pri prvom otvorení galérie. */
export async function ensureChurchAlbum(db: SupabaseClient, parishId: string, userId: string | null): Promise<void> {
  const { data } = await db.from('parish_albums').select('id').eq('parish_id', parishId).eq('kind', 'church').maybeSingle()
  if (data) return
  await db.from('parish_albums').insert({ parish_id: parishId, kind: 'church', title: CHURCH_ALBUM_TITLE, slug: 'kostol-a-farnost', created_by: userId })
}

// ------------------------------------------------------------ zápis

export async function writeAlbum(db: SupabaseClient, parishId: string, albumId: string | null, input: AlbumInput, userId: string): Promise<Result<{ id: string }>> {
  const title = input.title?.trim()
  if (!title) return { success: false, error: 'Zadajte názov albumu.' }
  if (input.event_date && !/^\d{4}-\d{2}-\d{2}$/.test(input.event_date)) return { success: false, error: 'Dátum má tvar RRRR-MM-DD.' }
  const external = input.external_url?.trim() || null
  if (external && !/^https:\/\/[^\s]+$/i.test(external)) return { success: false, error: 'Odkaz na externý album musí začínať https://' }
  const row = {
    title: title.slice(0, 150),
    description: input.description?.trim().slice(0, 1000) || null,
    event_date: input.event_date || null,
    external_url: external,
    published: input.published !== false,
    updated_at: new Date().toISOString(),
  }
  if (albumId) {
    const { data: a } = await db.from('parish_albums').select('id, kind').eq('id', albumId).eq('parish_id', parishId).maybeSingle()
    if (!a) return { success: false, error: 'Album sa nenašiel.' }
    const patch = a.kind === 'church' ? { description: row.description, published: row.published, updated_at: row.updated_at } : { ...row, slug: await uniqueSlug(db, parishId, title, albumId) }
    const { error } = await db.from('parish_albums').update(patch).eq('id', albumId)
    return error ? { success: false, error: 'Album sa nepodarilo uložiť.' } : { success: true, id: albumId }
  }
  const { data, error } = await db
    .from('parish_albums')
    .insert({ ...row, parish_id: parishId, kind: 'life', slug: await uniqueSlug(db, parishId, title), created_by: userId })
    .select('id')
    .single()
  return error ? { success: false, error: 'Album sa nepodarilo založiť.' } : { success: true, id: data.id }
}

/** Zmenší (max. 2000 px), otočí podľa EXIF, prevedie do WebP a nahrá na B2; skontroluje kvótu farnosti. */
export async function addPhoto(db: SupabaseClient, parishId: string, albumId: string, file: File, userId: string): Promise<Result<{ photo: GalleryPhoto }>> {
  if (file.type && !file.type.startsWith('image/')) return { success: false, error: `${file.name}: nie je obrázok.` }
  if (file.size > MAX_INPUT_BYTES) return { success: false, error: `${file.name}: súbor je väčší ako 25 MB.` }
  const { data: album } = await db.from('parish_albums').select('id, cover_photo_id').eq('id', albumId).eq('parish_id', parishId).maybeSingle()
  if (!album) return { success: false, error: 'Album sa nenašiel.' }

  let out: Buffer
  let width: number | null = null
  let height: number | null = null
  try {
    const { data, info } = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'none' })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true })
    out = data
    width = info.width
    height = info.height
  } catch {
    return { success: false, error: `${file.name}: obrázok sa nepodarilo spracovať. Podporované sú JPG, PNG a WebP – fotku HEIC z iPhonu uložte ako JPG alebo ju nahrajte cez Safari.` }
  }

  const [{ data: parish }, { data: sizes }] = await Promise.all([
    db.from('parishes').select('gallery_quota_bytes').eq('id', parishId).maybeSingle(),
    db.from('parish_photos').select('size_bytes').eq('parish_id', parishId),
  ])
  const used = (sizes ?? []).reduce((a, r) => a + Number(r.size_bytes || 0), 0)
  const quota = Number(parish?.gallery_quota_bytes ?? 1073741824)
  if (used + out.length > quota) {
    return { success: false, error: `Úložisko galérie je plné (${formatBytes(used)} z ${formatBytes(quota)}). Zmažte staršie fotky alebo požiadajte diecézu o navýšenie.` }
  }

  const uploaded = await uploadBuffer(out, 'image/webp', `parishes/${parishId}/gallery`)
  if (!uploaded) return { success: false, error: `${file.name}: nahratie na úložisko zlyhalo.` }

  const { data: last } = await db.from('parish_photos').select('sort_order').eq('album_id', albumId).order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const { data: photo, error } = await db
    .from('parish_photos')
    .insert({ album_id: albumId, parish_id: parishId, url: uploaded.url, storage_key: uploaded.key, width, height, size_bytes: out.length, sort_order: (last?.sort_order ?? -1) + 1, created_by: userId })
    .select(PHOTO_COLUMNS)
    .single()
  if (error) {
    await deleteImage(uploaded.key)
    return { success: false, error: 'Fotku sa nepodarilo uložiť.' }
  }
  if (!album.cover_photo_id) await db.from('parish_albums').update({ cover_photo_id: photo.id }).eq('id', albumId)
  await db.from('parish_albums').update({ updated_at: new Date().toISOString() }).eq('id', albumId)
  return { success: true, photo: { ...(photo as GalleryPhoto), size_bytes: Number(photo.size_bytes) } }
}

export async function updatePhotos(
  db: SupabaseClient,
  parishId: string,
  albumId: string,
  input: { order?: string[]; captions?: Record<string, string>; coverId?: string | null }
): Promise<Result> {
  const { data: photos } = await db.from('parish_photos').select('id').eq('album_id', albumId).eq('parish_id', parishId)
  const ids = new Set((photos ?? []).map((p) => p.id))
  if (input.order) {
    for (const [i, id] of input.order.entries()) if (ids.has(id)) await db.from('parish_photos').update({ sort_order: i }).eq('id', id)
  }
  if (input.captions) {
    for (const [id, caption] of Object.entries(input.captions)) if (ids.has(id)) await db.from('parish_photos').update({ caption: caption.trim().slice(0, 300) || null }).eq('id', id)
  }
  if (input.coverId !== undefined) {
    if (input.coverId && !ids.has(input.coverId)) return { success: false, error: 'Titulná fotka nepatrí do albumu.' }
    await db.from('parish_albums').update({ cover_photo_id: input.coverId }).eq('id', albumId).eq('parish_id', parishId)
  }
  return { success: true }
}

export async function deletePhoto(db: SupabaseClient, parishId: string, photoId: string): Promise<Result> {
  const { data: p } = await db.from('parish_photos').select('id, storage_key, album_id').eq('id', photoId).eq('parish_id', parishId).maybeSingle()
  if (!p) return { success: false, error: 'Fotka sa nenašla.' }
  const { error } = await db.from('parish_photos').delete().eq('id', photoId)
  if (error) return { success: false, error: 'Fotku sa nepodarilo zmazať.' }
  if (p.storage_key) await deleteImage(p.storage_key)
  return { success: true }
}

export async function deleteAlbum(db: SupabaseClient, parishId: string, albumId: string): Promise<Result> {
  const { data: a } = await db.from('parish_albums').select('id, kind').eq('id', albumId).eq('parish_id', parishId).maybeSingle()
  if (!a) return { success: false, error: 'Album sa nenašiel.' }
  if (a.kind === 'church') return { success: false, error: 'Album „Kostol a farnosť“ sa nemaže – zmažte jednotlivé fotky.' }
  const { data: photos } = await db.from('parish_photos').select('storage_key').eq('album_id', albumId)
  await db.from('parish_albums').update({ cover_photo_id: null }).eq('id', albumId)
  const { error } = await db.from('parish_albums').delete().eq('id', albumId)
  if (error) return { success: false, error: 'Album sa nepodarilo zmazať.' }
  for (const p of photos ?? []) if (p.storage_key) await deleteImage(p.storage_key)
  return { success: true }
}

// ------------------------------------------------------------ verejné čítanie

export interface PublicAlbumSummary {
  id: string
  title: string
  slug: string
  description: string | null
  event_date: string | null
  cover_url: string | null
  photo_count: number
  /** externý album – dlaždica vedie na tento odkaz */
  external_url: string | null
}

export interface PublicGalleryPhoto {
  url: string
  width: number | null
  height: number | null
  caption: string | null
}

export async function getChurchPhotos(db: SupabaseClient, parishId: string): Promise<PublicGalleryPhoto[]> {
  const { data: album } = await db.from('parish_albums').select('id').eq('parish_id', parishId).eq('kind', 'church').eq('published', true).is('taken_down_at', null).maybeSingle()
  if (!album) return []
  const { data } = await db.from('parish_photos').select('url, width, height, caption').eq('album_id', album.id).order('sort_order')
  return (data ?? []) as PublicGalleryPhoto[]
}

export async function getLifeAlbums(db: SupabaseClient, parishId: string, limit = 24, offset = 0): Promise<PublicAlbumSummary[]> {
  const { data: albums } = await db
      .from('parish_albums')
      .select('id, title, slug, description, event_date, cover_photo_id, external_url, created_at')
      .eq('parish_id', parishId)
      .eq('kind', 'life')
      .eq('published', true)
      .is('taken_down_at', null)
      .order('event_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
  if (!albums?.length) return []
  const { data: photos } = await db.from('parish_photos').select('id, album_id, url, sort_order').in('album_id', albums.map((a) => a.id)).order('sort_order')
  return albums
    .map((a) => {
      const mine = (photos ?? []).filter((p) => p.album_id === a.id)
      const cover = mine.find((p) => p.id === a.cover_photo_id) ?? mine[0]
      return { id: a.id, title: a.title, slug: a.slug, description: a.description, event_date: a.event_date, cover_url: cover?.url ?? null, photo_count: mine.length, external_url: a.external_url }
    })
    // album bez fotiek sa zobrazí len ako odkaz na externý album
    .filter((a) => a.photo_count > 0 || a.external_url)
}

export async function getPublicAlbum(db: SupabaseClient, parishId: string, slugOrId: { slug?: string; id?: string }): Promise<(PublicAlbumSummary & { photos: PublicGalleryPhoto[] }) | null> {
  let q = db.from('parish_albums').select('id, title, slug, description, event_date, cover_photo_id').eq('parish_id', parishId).eq('kind', 'life').eq('published', true).is('taken_down_at', null)
  q = slugOrId.id ? q.eq('id', slugOrId.id) : q.eq('slug', slugOrId.slug ?? '')
  const { data: a } = await q.maybeSingle()
  if (!a) return null
  const { data: photos } = await db.from('parish_photos').select('id, url, width, height, caption').eq('album_id', a.id).order('sort_order')
  if (!photos?.length) return null
  const cover = photos.find((p) => p.id === a.cover_photo_id) ?? photos[0]
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    description: a.description,
    event_date: a.event_date,
    cover_url: cover.url,
    photo_count: photos.length,
    external_url: null,
    photos: photos.map(({ url, width, height, caption }) => ({ url, width, height, caption })),
  }
}

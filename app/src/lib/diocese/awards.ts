import type { SupabaseClient } from '@supabase/supabase-js'
import { clergyDisplayName } from '@/lib/clergy/types'
import { slugify } from './bodies'

/**
 * Ocenenia a vyznamenania (063) – stránka o-nas/dieceza/ocenenia na dcza.sk.
 * Ocenený kňaz/diakon z registra (clergy_id) má odkaz na profil v schematizme a † podľa registra. Serverový modul.
 */

export type AwardGrantor = 'papez' | 'biskup'

export const AWARD_GRANTOR_LABEL: Record<AwardGrantor, string> = {
  papez: 'Ocenení Svätým Otcom',
  biskup: 'Ocenení diecéznym biskupom',
}

export const AWARDS_PAGE_PATH = 'o-nas/dieceza/ocenenia'

const AWARD_COLUMNS = 'id, slug, name, grantor, description, image_url, album_id, sort_order, published'
const RECIPIENT_COLUMNS = 'id, award_id, name, clergy_id, deceased, year, note, sort_order'
const PUBLIC_CLERGY_STATUSES = ['active', 'retired', 'studying'] // ako verejný schematizmus
type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

export interface AwardRecipientInput {
  name: string
  clergy_id: string | null
  deceased: boolean
  year: number | null
  note: string | null
}

export interface AwardInput {
  name: string
  grantor: AwardGrantor
  description: string | null
  image_url: string | null
  album_id: string | null
  published: boolean
  recipients: AwardRecipientInput[]
}

export interface AdminAward extends AwardInput {
  id: string
  slug: string
  sort_order: number
}

export interface AwardsAdminData {
  awards: AdminAward[]
  clergyOptions: { id: string; label: string }[]
  albumOptions: { id: string; label: string }[]
}

// ------------------------------------------------------------ web

export interface PublicAwardRecipient {
  name: string
  deceased: boolean
  year: number | null
  note: string | null
  profileSlug: string | null
}

export interface PublicAward {
  slug: string
  name: string
  grantor: AwardGrantor
  description: string | null
  image_url: string | null
  album: { slug: string; title: string; cover_url: string | null; photo_count: number } | null
  recipients: PublicAwardRecipient[]
}

type ClergyRef = { slug: string | null; schematizmus_slug: string | null; status: string }

export async function getPublicAwards(db: SupabaseClient): Promise<PublicAward[]> {
  const { data: awards } = await db.from('diocese_awards').select(AWARD_COLUMNS).eq('published', true).order('sort_order').order('name')
  if (!awards?.length) return []
  const albumIds = awards.map((a) => a.album_id).filter(Boolean) as string[]
  const [{ data: recipients }, { data: albums }, { data: photos }] = await Promise.all([
    db
      .from('diocese_award_recipients')
      .select(`${RECIPIENT_COLUMNS}, clergy:clergy_id(slug, schematizmus_slug, status)`)
      .in('award_id', awards.map((a) => a.id))
      .order('sort_order')
      .order('name'),
    albumIds.length ? db.from('diocese_albums').select('id, slug, title, cover_photo_id').in('id', albumIds).eq('published', true) : Promise.resolve({ data: [] }),
    albumIds.length ? db.from('diocese_photos').select('id, album_id, url').in('album_id', albumIds).order('sort_order') : Promise.resolve({ data: [] }),
  ])
  return awards.map((a) => {
    const album = (albums ?? []).find((x) => x.id === a.album_id)
    const albumPhotos = (photos ?? []).filter((p) => p.album_id === a.album_id)
    return {
      slug: a.slug,
      name: a.name,
      grantor: a.grantor as AwardGrantor,
      description: a.description,
      image_url: a.image_url,
      album: album && albumPhotos.length
        ? { slug: album.slug, title: album.title, cover_url: (albumPhotos.find((p) => p.id === album.cover_photo_id) ?? albumPhotos[0]).url, photo_count: albumPhotos.length }
        : null,
      recipients: (recipients ?? [])
        .filter((r) => r.award_id === a.id)
        .map((r) => {
          const c = r.clergy as unknown as ClergyRef | null
          return {
            name: r.name,
            deceased: r.deceased || c?.status === 'deceased',
            year: r.year,
            note: r.note,
            profileSlug: c && PUBLIC_CLERGY_STATUSES.includes(c.status) ? c.slug || c.schematizmus_slug : null,
          }
        }),
    }
  })
}

// ------------------------------------------------------------ admin

export async function loadAwardsAdmin(db: SupabaseClient): Promise<AwardsAdminData> {
  const [{ data: awards }, { data: recipients }, { data: clergy }, { data: albums }] = await Promise.all([
    db.from('diocese_awards').select(AWARD_COLUMNS).order('grantor', { ascending: false }).order('sort_order'),
    db.from('diocese_award_recipients').select(RECIPIENT_COLUMNS).order('sort_order'),
    db.from('clergy').select('id, first_name, last_name, title_before, title_after, status').in('category', ['bishop', 'priest', 'deacon', 'permanent_deacon']).order('last_name').order('first_name'),
    db.from('diocese_albums').select('id, title, event_date').order('event_date', { ascending: false, nullsFirst: false }),
  ])
  return {
    awards: (awards ?? []).map((a) => ({
      ...a,
      grantor: a.grantor as AwardGrantor,
      recipients: (recipients ?? [])
        .filter((r) => r.award_id === a.id)
        .map(({ name, clergy_id, deceased, year, note }) => ({ name, clergy_id, deceased, year, note })),
    })),
    clergyOptions: (clergy ?? []).map((c) => ({ id: c.id, label: `${clergyDisplayName(c)}${c.status === 'deceased' ? ' †' : ''}` })),
    albumOptions: (albums ?? []).map((a) => ({ id: a.id, label: a.event_date ? `${a.title} (${a.event_date.slice(0, 4)})` : a.title })),
  }
}

/** Uloží ocenenie aj so zoznamom ocenených (zoznam sa nahradí celý v poradí z formulára). */
export async function writeAward(db: SupabaseClient, id: string | null, input: AwardInput): Promise<Result<{ id: string }>> {
  const name = input.name.trim()
  if (!name) return { success: false, error: 'Zadajte názov ocenenia.' }
  const recipients = input.recipients
    .map((r) => ({ ...r, name: r.name.trim(), note: r.note?.trim() || null }))
    .filter((r) => r.name)
  if (recipients.some((r) => r.year !== null && (!Number.isInteger(r.year) || r.year < 1900 || r.year > 2100))) {
    return { success: false, error: 'Rok udelenia musí byť medzi 1900 a 2100.' }
  }
  const row = {
    name,
    grantor: input.grantor === 'biskup' ? 'biskup' : 'papez',
    description: input.description?.trim() || null,
    image_url: input.image_url?.trim() || null,
    album_id: input.album_id || null,
    published: input.published,
    updated_at: new Date().toISOString(),
  }

  let awardId = id
  if (awardId) {
    const { error } = await db.from('diocese_awards').update(row).eq('id', awardId)
    if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  } else {
    const base = slugify(name) || 'ocenenie'
    const { data: taken } = await db.from('diocese_awards').select('slug').like('slug', `${base}%`)
    const slugs = new Set((taken ?? []).map((t) => t.slug))
    let slug = base
    for (let i = 2; slugs.has(slug); i++) slug = `${base}-${i}`
    const { data: last } = await db.from('diocese_awards').select('sort_order').eq('grantor', row.grantor).order('sort_order', { ascending: false }).limit(1).maybeSingle()
    const { data, error } = await db.from('diocese_awards').insert({ ...row, slug, sort_order: (last?.sort_order ?? 0) + 10 }).select('id').single()
    if (error || !data) return { success: false, error: 'Uloženie zlyhalo.' }
    awardId = data.id as string
  }

  const { error: delError } = await db.from('diocese_award_recipients').delete().eq('award_id', awardId)
  if (delError) return { success: false, error: 'Uloženie ocenených zlyhalo.' }
  if (recipients.length) {
    const { error } = await db.from('diocese_award_recipients').insert(
      recipients.map((r, i) => ({ award_id: awardId, name: r.name, clergy_id: r.clergy_id || null, deceased: r.deceased, year: r.year, note: r.note, sort_order: i + 1 })),
    )
    if (error) return { success: false, error: 'Uloženie ocenených zlyhalo.' }
  }
  return { success: true, id: awardId }
}

/** Posun ocenenia v rámci skupiny (pápežské / diecézne). */
export async function moveAward(db: SupabaseClient, id: string, dir: -1 | 1): Promise<Result> {
  const { data: award } = await db.from('diocese_awards').select('id, grantor').eq('id', id).maybeSingle()
  if (!award) return { success: false, error: 'Ocenenie neexistuje.' }
  const { data: list } = await db.from('diocese_awards').select('id').eq('grantor', award.grantor).order('sort_order').order('name')
  const ids = (list ?? []).map((a) => a.id as string)
  const i = ids.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= ids.length) return { success: true }
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  for (const [k, awardId] of ids.entries()) {
    await db.from('diocese_awards').update({ sort_order: (k + 1) * 10 }).eq('id', awardId)
  }
  return { success: true }
}

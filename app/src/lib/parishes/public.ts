import { cache } from 'react'
import { getActiveBox } from '@/lib/parish-box/server'
import type { PublicParishBox } from '@/lib/parish-box/types'
import { serviceDb } from './access'
import { loadParishClergy } from './parish-clergy'
import { getSessionUser, getUserAccess } from '@/lib/auth'
import type { ParishKind, ParishOccasion, ParishSeason, ParishServiceType } from './types'
import { normalizeSocialLinks, type SocialLink } from './social'
import { normalizeVideos, type ParishVideo } from './video'
import { getChurchPhotos, getLifeAlbums, getPublicAlbum, type PublicAlbumSummary, type PublicGalleryPhoto } from './gallery'

/**
 * Verejné stránky farností /farnosti (návrh § 4, fáza F5). Serverový modul.
 * Číta cez service role, ale VŽDY s explicitným zoznamom stĺpcov – nikdy IČO, DIČ, IBAN,
 * internú poznámku ani mená darcov (§ 4.2). Nezverejnenú farnosť vidí len jej účet a diecéza (náhľad).
 */

const PUBLIC_PARISH_COLUMNS =
  'id, slug, name, official_name, kind, deanery_id, patrocinium, street, postal_code, city, phone, email, website, ' +
  'feast_day, feast_day_note, adoration_date, adoration_note, latitude, longitude, image_url, logo_url, intro, social_links, theme, visible_on_web, is_active, updated_at'

export interface PublicScheduleItem {
  service_type: ParishServiceType
  occasion: ParishOccasion
  day_of_week: number | null
  day_label: string | null
  time_from: string | null
  time_to: string | null
  relative_note: string | null
  note: string | null
  place: string | null
}

export interface PublicSchedule {
  season: ParishSeason
  valid_from: string | null
  valid_to: string | null
  note: string | null
  items: PublicScheduleItem[]
}

/** Kňaz na stránke farnosti – z registra kňazov (K3); verejne len meno, tituly a funkcia (O47). */
export interface PublicClergy {
  full_name: string
  title_before: string | null
  title_after: string | null
  position: string
  /** vedie farnosť (farár, administrátor, duchovný správca, rektor) – na stránke prvý a zvýraznený */
  is_head: boolean
}

/** Farár (aj „farár, dekan“), administrátor alebo duchovný správca – kto vedie farnosť / duchovnú správu. */

export interface PublicPostSummary {
  id: string
  type: 'announcement' | 'news'
  title: string
  slug: string
  excerpt: string | null
  image_url: string | null
  attachment_url: string | null
  attachment_name: string | null
  valid_from: string | null
  valid_to: string | null
  event_at: string | null
  published_at: string | null
  pinned: boolean
}

export interface PublicPost extends PublicPostSummary {
  content: string | null
  updated_at: string
  /** pripojený album zo života farnosti (§ 17) – fotky sa zobrazia pod príspevkom */
  album: PublicAlbum | null
  /** videá YouTube / Vimeo pod aktualitou (O66) */
  videos: ParishVideo[]
}

export type PublicAlbum = PublicAlbumSummary & { photos: PublicGalleryPhoto[]; videos: ParishVideo[] }

export interface PublicSacrament {
  type: string
  title: string
  content: string
  customized: boolean
}

export interface PublicParish {
  id: string
  slug: string
  name: string
  official_name: string | null
  kind: ParishKind
  deanery_name: string | null
  patrocinium: string | null
  street: string | null
  postal_code: string | null
  city: string | null
  phone: string | null
  email: string | null
  website: string | null
  feast_day: string | null
  feast_day_note: string | null
  adoration_date: string | null
  adoration_note: string | null
  latitude: number | null
  longitude: number | null
  image_url: string | null
  /** erb / logo – v hlavičke a pätičke má prednosť pred titulnou fotkou */
  logo_url: string | null
  intro: string | null
  social_links: SocialLink[]
  theme: string
  visible_on_web: boolean
  updated_at: string | null
  /** stránku vidí diecéza / farnosť pred zverejnením */
  preview: boolean
  /** verejná stránka nie je zapnutá – základná stránka bez oznamov a aktualít (bohoslužby len ak sú vyplnené) */
  basic: boolean
  /** prihlásený spravuje farnosť – odkaz do zóny farnosti */
  manageUrl: string | null
  villages: { name: string; church_name: string | null; is_seat: boolean }[]
  schedules: Partial<Record<ParishSeason, PublicSchedule>>
  currentSeason: ParishSeason
  clergy: PublicClergy[]
  /** E-zvonček farnosti – len ak ho diecéza zapla a farnosť má IBAN (aj na základnej stránke, O43) */
  box: PublicParishBox | null
  /** má zverejnené albumy „Zo života farnosti“ – položka Galéria v menu */
  hasAlbums: boolean
}

type ParishDbRow = Omit<PublicParish, 'deanery_name' | 'preview' | 'basic' | 'manageUrl' | 'villages' | 'schedules' | 'currentSeason' | 'clergy' | 'box' | 'hasAlbums' | 'latitude' | 'longitude'> & {
  deanery_id: string | null
  is_active: boolean
  latitude: string | number | null
  longitude: string | number | null
}

/** Je dnešok v rozsahu platnosti (porovnáva sa mesiac-deň, aby letný režim platil každý rok)? */
function inSeasonRange(from: string | null, to: string | null, today = new Date()): boolean {
  if (!from || !to) return false
  const md = (d: string) => d.slice(5, 10)
  const t = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const a = md(from)
  const b = md(to)
  return a <= b ? t >= a && t <= b : t >= a || t <= b
}

/**
 * Vzťah prihláseného k farnosti: náhľad nezverejnenej stránky (jej účet, diecéza, kontrolór)
 * a odkaz „Spravovať farnosť“ (účet farnosti alebo manage_parishes – vstup do zóny farnosti).
 */
async function viewerAccess(parishId: string): Promise<{ preview: boolean; manage: boolean }> {
  const user = await getSessionUser()
  if (!user) return { preview: false, manage: false }
  const db = serviceDb()
  const { data } = await db.from('parish_users').select('role').eq('parish_id', parishId).eq('user_id', user.id).maybeSingle()
  if (data) return { preview: true, manage: true }
  const access = await getUserAccess(user.id)
  const manage = access.isAdmin || access.permissions.includes('manage_parishes')
  return { preview: manage || access.permissions.includes('view_parishes'), manage }
}

export const getPublicParishBySlug = cache(async (slug: string): Promise<PublicParish | null> => {
  const db = serviceDb()
  const { data } = await db.from('parishes').select(PUBLIC_PARISH_COLUMNS).eq('slug', slug).maybeSingle()
  const row = data as unknown as ParishDbRow | null
  if (!row || !row.is_active) return null
  const viewer = await viewerAccess(row.id)
  // nezverejnená farnosť má verejne základnú stránku; plnú (náhľad) vidí len jej účet a diecéza
  const basic = !row.visible_on_web && !viewer.preview
  const preview = !row.visible_on_web && viewer.preview

  const [{ data: deanery }, { data: villages }, { data: schedules }, clergy, activeBox, { count: albumCount }] = await Promise.all([
    row.deanery_id ? db.from('deaneries').select('name').eq('id', row.deanery_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('parish_villages').select('id, name, church_name, is_seat, sort_order').eq('parish_id', row.id).order('sort_order'),
    db.from('parish_schedules')
      .select('season, is_active, valid_from, valid_to, note, parish_schedule_items(service_type, occasion, day_of_week, day_label, time_from, time_to, relative_note, note, village_id, sort_order)')
      .eq('parish_id', row.id),
    loadParishClergy(db, row.id),
    getActiveBox(row.id),
    basic
      ? Promise.resolve({ count: 0 })
      : db.from('parish_albums').select('id', { count: 'exact', head: true }).eq('parish_id', row.id).eq('kind', 'life').eq('published', true).is('taken_down_at', null),
  ])

  const villageName = new Map((villages ?? []).map((v) => [v.id as string, v.name as string]))
  const out: Partial<Record<ParishSeason, PublicSchedule>> = {}
  for (const s of schedules ?? []) {
    if (s.season === 'summer' && !s.is_active) continue
    const items = ((s.parish_schedule_items ?? []) as (Omit<PublicScheduleItem, 'place'> & { village_id: string | null; sort_order: number })[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((it) => ({
        service_type: it.service_type,
        occasion: it.occasion,
        day_of_week: it.day_of_week,
        day_label: it.day_label,
        time_from: it.time_from?.slice(0, 5) ?? null,
        time_to: it.time_to?.slice(0, 5) ?? null,
        relative_note: it.relative_note,
        note: it.note,
        place: it.village_id ? villageName.get(it.village_id) ?? null : null,
      }))
    if (items.length) out[s.season as ParishSeason] = { season: s.season, valid_from: s.valid_from, valid_to: s.valid_to, note: s.note, items }
  }
  const currentSeason: ParishSeason = out.summer && inSeasonRange(out.summer.valid_from, out.summer.valid_to) ? 'summer' : 'regular'

  return {
    ...row,
    social_links: normalizeSocialLinks(row.social_links ?? []).value,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    deanery_name: (deanery as { name: string } | null)?.name ?? null,
    preview,
    basic,
    manageUrl: viewer.manage ? `/moja-farnost/${row.id}` : null,
    villages: (villages ?? []).map((v) => ({ name: v.name, church_name: v.church_name, is_seat: v.is_seat })),
    schedules: out,
    currentSeason,
    // z registra kňazov (O49) – verejne len meno, tituly a funkcia (O47)
    clergy: clergy.map(({ full_name, title_before, title_after, position, is_head }) => ({ full_name, title_before, title_after, position, is_head })),
    box: activeBox ? { title: activeBox.title, description: activeBox.description } : null,
    hasAlbums: (albumCount ?? 0) > 0,
  }
})

const POST_SUMMARY_COLUMNS =
  'id, type, title, slug, excerpt, image_url, attachment_url, attachment_name, valid_from, valid_to, event_at, published_at, pinned'

const publishedPosts = (parishId: string) =>
  serviceDb().from('parish_posts').select(POST_SUMMARY_COLUMNS).eq('parish_id', parishId).eq('published', true).is('taken_down_at', null)

/** Oznamy (najnovšie hore; pripnutý vždy prvý) alebo aktuality farnosti. */
export async function getParishPosts(parishId: string, type: 'announcement' | 'news', limit = 20, offset = 0): Promise<PublicPostSummary[]> {
  const { data } = await publishedPosts(parishId)
    .eq('type', type)
    .order('pinned', { ascending: false })
    .order(type === 'announcement' ? 'valid_from' : 'published_at', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return (data ?? []) as PublicPostSummary[]
}

/** Pripravované udalosti (aktuality s dátumom konania v budúcnosti). */
export async function getUpcomingEvents(parishId: string, limit = 4): Promise<PublicPostSummary[]> {
  const { data } = await publishedPosts(parishId).eq('type', 'news').gte('event_at', new Date().toISOString()).order('event_at').limit(limit)
  return (data ?? []) as PublicPostSummary[]
}

export async function getParishPost(parishId: string, type: 'announcement' | 'news', slug: string): Promise<PublicPost | null> {
  const { data } = await serviceDb()
    .from('parish_posts')
    .select(`${POST_SUMMARY_COLUMNS}, content, updated_at, album_id, videos`)
    .eq('parish_id', parishId)
    .eq('type', type)
    .eq('slug', slug)
    .eq('published', true)
    .is('taken_down_at', null)
    .maybeSingle()
  if (!data) return null
  const { album_id, videos, ...post } = data as unknown as Omit<PublicPost, 'album' | 'videos'> & { album_id: string | null; videos: unknown }
  return { ...post, videos: normalizeVideos(videos), album: album_id ? await getPublicAlbum(serviceDb(), parishId, { id: album_id }) : null }
}

// ------------------------------------------------------------ fotogaléria (§ 17)

/** Pás fotiek „Kostol a farnosť“ hore na stránke farnosti. */
export const getParishChurchPhotos = (parishId: string) => getChurchPhotos(serviceDb(), parishId)

/** Albumy „Zo života farnosti“ (najnovšie hore), aj externé odkazy (G6). */
export const getParishAlbums = (parishId: string, limit = 24, offset = 0) => getLifeAlbums(serviceDb(), parishId, limit, offset)

export const getParishAlbum = (parishId: string, slug: string): Promise<PublicAlbum | null> => getPublicAlbum(serviceDb(), parishId, { slug })

/** Sviatosti: text farnosti prekryje diecézny štandard (O27); skryté sa vynechajú. */
export async function getParishSacraments(parishId: string): Promise<PublicSacrament[]> {
  const db = serviceDb()
  const [{ data: base }, { data: own }] = await Promise.all([
    db.from('sacrament_texts').select('type, title, content, sort_order').eq('is_active', true).order('sort_order'),
    db.from('parish_sacrament_texts').select('type, content, is_hidden').eq('parish_id', parishId),
  ])
  const ownMap = new Map((own ?? []).map((o) => [o.type as string, o as { content: string | null; is_hidden: boolean }]))
  return (base ?? [])
    .filter((b) => !ownMap.get(b.type)?.is_hidden)
    .map((b) => {
      const o = ownMap.get(b.type)
      return { type: b.type, title: b.title, content: o?.content || b.content, customized: !!o?.content }
    })
    .filter((s) => s.content.trim())
}

export interface PublicParishListItem {
  slug: string
  name: string
  official_name: string | null
  kind: ParishKind
  city: string | null
  deanery_id: string | null
  deanery_name: string | null
  patrocinium: string | null
  latitude: number | null
  longitude: number | null
  /** má zapnutú verejnú stránku (bohoslužby, oznamy); inak len základná stránka */
  has_web: boolean
  villages: string[]
}

/** Všetky aktívne farnosti – vyhľadávanie podľa obce musí nájsť aj tie, ktoré ešte nemajú zapnutú stránku. */
export async function getPublicParishList(): Promise<PublicParishListItem[]> {
  const db = serviceDb()
  const { data } = await db
    .from('parishes')
    .select('id, slug, name, official_name, kind, city, deanery_id, patrocinium, latitude, longitude, visible_on_web, deaneries(name), parish_villages(name, sort_order)')
    .eq('is_active', true)
    .not('slug', 'is', null)
  type Row = Omit<PublicParishListItem, 'latitude' | 'longitude' | 'has_web' | 'villages' | 'deanery_name'> & {
    latitude: string | number | null
    longitude: string | number | null
    visible_on_web: boolean
    deaneries: { name: string } | null
    parish_villages: { name: string; sort_order: number }[]
  }
  return ((data ?? []) as unknown as Row[])
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      official_name: r.official_name,
      kind: r.kind,
      city: r.city,
      deanery_id: r.deanery_id,
      deanery_name: r.deaneries?.name ?? null,
      patrocinium: r.patrocinium,
      latitude: r.latitude != null ? Number(r.latitude) : null,
      longitude: r.longitude != null ? Number(r.longitude) : null,
      has_web: r.visible_on_web,
      villages: (r.parish_villages ?? []).sort((a, b) => a.sort_order - b.sort_order).map((v) => v.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sk'))
}

/** Slugy aktívnych farností (aj základné stránky) a príspevkov zverejnených farností – sitemap. */
export async function getSitemapParishEntries() {
  const db = serviceDb()
  const { data: parishes } = await db.from('parishes').select('id, slug, updated_at, visible_on_web').eq('is_active', true).not('slug', 'is', null)
  const ids = (parishes ?? []).filter((p) => p.visible_on_web).map((p) => p.id)
  const { data: posts } = ids.length
    ? await db.from('parish_posts').select('parish_id, type, slug, updated_at').in('parish_id', ids).eq('published', true).is('taken_down_at', null)
    : { data: [] as { parish_id: string; type: string; slug: string; updated_at: string }[] }
  const slugById = new Map((parishes ?? []).map((p) => [p.id as string, p.slug as string]))
  return {
    parishes: (parishes ?? []).map((p) => ({ slug: p.slug as string, updated_at: p.updated_at as string | null })),
    posts: (posts ?? []).map((p) => ({ parishSlug: slugById.get(p.parish_id)!, type: p.type as 'announcement' | 'news', slug: p.slug, updated_at: p.updated_at })),
  }
}

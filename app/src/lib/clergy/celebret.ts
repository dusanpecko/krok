import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto'
import sharp from 'sharp'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { uploadBuffer } from '@/lib/storage'
import { displayName } from '@/lib/diocese/schematizmus'

/**
 * Digitálne celebrety (K6, § 16.9, migrácia 059). Serverový modul – číta a zapisuje cez service role.
 * Platnosť vždy 1 rok od vydania (O55), len kňazi (O53), overenie celebret.dcza.sk/<token>.
 */

export const celebretDb = (): SupabaseClient => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/** Celebret dostane kňaz (aj biskup) v službe, na odpočinku alebo na štúdiu. */
export const CELEBRET_CATEGORIES = ['priest', 'bishop'] as const
export const CELEBRET_STATUSES = ['active', 'retired', 'studying'] as const

export type CelebretState = 'valid' | 'expired' | 'revoked'

export interface CelebretSettings {
  id: string
  logo_url: string | null
  stamp_url: string | null
  signature_url: string | null
  signer_name: string | null
  signer_function: string | null
  curia_address: string
  curia_phone: string
  curia_email: string
  /** web na rube karty (060) */
  curia_web: string
  created_at: string
}

export interface Celebret {
  id: string
  clergy_id: string
  number: string
  token: string
  issued_on: string
  valid_until: string
  confession_jurisdiction: boolean
  photo_url: string | null
  settings_id: string | null
  revoked_at: string | null
  revoked_reason: string | null
  note: string | null
  /** heslo z karty (061) – len na serveri, do prehliadača sa neposiela */
  access_code: string
  created_at: string
}

/** Údaje celebretu na overovaciu stránku a tlač (kňaz + nastavenia, ktoré platili pri vydaní). */
export interface CelebretView extends Celebret {
  state: CelebretState
  name: string
  category: string
  birth_date: string | null
  ordination_date: string | null
  profile_slug: string | null
  settings: CelebretSettings | null
}

const COLUMNS = 'id, clergy_id, number, token, issued_on, valid_until, confession_jurisdiction, photo_url, settings_id, revoked_at, revoked_reason, note, access_code, created_at'
const SETTINGS_COLUMNS = 'id, logo_url, stamp_url, signature_url, signer_name, signer_function, curia_address, curia_phone, curia_email, curia_web, created_at'
const CLERGY_COLUMNS = 'id, first_name, last_name, title_before, title_after, ecclesiastical_titles, category, status, birth_date, ordination_date, slug, schematizmus_slug, photo_url, religious_orders(code)'

const today = () => new Date().toISOString().slice(0, 10)

export function celebretState(c: Pick<Celebret, 'revoked_at' | 'valid_until'>, on = today()): CelebretState {
  if (c.revoked_at) return 'revoked'
  return c.valid_until < on ? 'expired' : 'valid'
}

/** Platnosť 1 rok od vydania: vydaný 13. 10. 2026 → platí do 12. 10. 2027 (O55). */
export function validUntilFor(issuedOn: string): string {
  const d = new Date(`${issuedOn}T00:00:00Z`)
  d.setUTCFullYear(d.getUTCFullYear() + 1)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Náhodný kód overovacej adresy – nedá sa uhádnuť z mena (§ 16.9). */
export const newCelebretToken = () =>
  Array.from(randomBytes(20), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('')

/** Heslo z karty – 4 náhodné číslice (061). */
export const newAccessCode = () => String(randomInt(0, 10000)).padStart(4, '0')

/** Podpis odomknutia (cookie) – viaže sa na kód aj heslo; po vydaní nového celebretu neplatí. */
const unlockSecret = () => process.env.CELEBRET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'celebret'
export const celebretUnlockValue = (token: string, code: string) => createHmac('sha256', unlockSecret()).update(`${token}:${code}`).digest('base64url')
export const celebretCookieName = (token: string) => `cb_${token.slice(0, 12)}`

export function isUnlocked(token: string, code: string, cookieValue: string | undefined): boolean {
  if (!cookieValue) return false
  const expected = Buffer.from(celebretUnlockValue(token, code))
  const got = Buffer.from(cookieValue)
  return expected.length === got.length && timingSafeEqual(expected, got)
}

/** Verejná adresa overenia (QR). Na stagingu cez CELEBRET_BASE_URL (napr. https://celebret.dcza.dev). */
export const celebretBaseUrl = () => (process.env.CELEBRET_BASE_URL?.trim() || 'https://celebret.dcza.sk').replace(/\/+$/, '')
export const celebretUrl = (token: string) => `${celebretBaseUrl()}/${token}`

export async function getCurrentSettings(db = celebretDb()): Promise<CelebretSettings | null> {
  const { data } = await db.from('celebret_settings').select(SETTINGS_COLUMNS).order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (data as CelebretSettings | null) ?? null
}

type ClergyRow = {
  id: string
  first_name: string
  last_name: string
  title_before: string | null
  title_after: string | null
  ecclesiastical_titles: string[] | null
  category: string
  status: string
  birth_date: string | null
  ordination_date: string | null
  slug: string | null
  schematizmus_slug: string | null
  photo_url: string | null
  religious_orders: { code: string } | null
}

async function toView(db: SupabaseClient, rows: Celebret[]): Promise<CelebretView[]> {
  if (!rows.length) return []
  const clergyIds = [...new Set(rows.map((r) => r.clergy_id))]
  const settingsIds = [...new Set(rows.map((r) => r.settings_id).filter((x): x is string => !!x))]
  const [{ data: clergy }, { data: settings }] = await Promise.all([
    db.from('clergy').select(CLERGY_COLUMNS).in('id', clergyIds),
    settingsIds.length ? db.from('celebret_settings').select(SETTINGS_COLUMNS).in('id', settingsIds) : Promise.resolve({ data: [] }),
  ])
  const byClergy = new Map(((clergy ?? []) as unknown as ClergyRow[]).map((c) => [c.id, c]))
  const bySettings = new Map(((settings ?? []) as CelebretSettings[]).map((s) => [s.id, s]))
  return rows.map((r) => {
    const c = byClergy.get(r.clergy_id)
    return {
      ...r,
      state: celebretState(r),
      name: c ? displayName(c, c.religious_orders?.code) : '',
      category: c?.category ?? 'priest',
      birth_date: c?.birth_date ?? null,
      ordination_date: c?.ordination_date ?? null,
      profile_slug: c ? c.slug || c.schematizmus_slug : null,
      settings: r.settings_id ? bySettings.get(r.settings_id) ?? null : null,
    }
  })
}

export async function getCelebretByToken(token: string): Promise<CelebretView | null> {
  if (!/^[a-z0-9]{16,40}$/.test(token)) return null
  const db = celebretDb()
  const { data } = await db.from('clergy_celebrets').select(COLUMNS).eq('token', token).maybeSingle()
  return data ? (await toView(db, [data as Celebret]))[0] : null
}

export async function getCelebretsByIds(ids: string[]): Promise<CelebretView[]> {
  const db = celebretDb()
  const { data } = await db.from('clergy_celebrets').select(COLUMNS).in('id', ids)
  const views = await toView(db, (data ?? []) as Celebret[])
  return ids.map((id) => views.find((v) => v.id === id)).filter((v): v is CelebretView => !!v)
}

export async function listCelebretsForClergy(clergyId: string): Promise<CelebretView[]> {
  const db = celebretDb()
  const { data } = await db.from('clergy_celebrets').select(COLUMNS).eq('clergy_id', clergyId).order('issued_on', { ascending: false }).order('created_at', { ascending: false })
  return toView(db, (data ?? []) as Celebret[])
}

/** Najnovší celebret osoby podľa verejného slugu – presmerovanie starých adries celebret.dcza.sk/<meno>. */
export async function latestTokenForSlug(slug: string): Promise<string | null> {
  if (!/^[a-z0-9-]{2,120}$/.test(slug)) return null
  const db = celebretDb()
  const { data: person } = await db.from('clergy').select('id').or(`slug.eq.${slug},schematizmus_slug.eq.${slug}`).limit(1).maybeSingle()
  if (!person) return null
  const { data } = await db.from('clergy_celebrets').select('token').eq('clergy_id', person.id).order('issued_on', { ascending: false }).limit(1).maybeSingle()
  return (data?.token as string | undefined) ?? null
}

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

/**
 * Vydá celebret (nový kód, číslo, platnosť 1 rok). Fotka: zadaná, inak fotka z registra.
 * Pamätá si aktuálnu verziu nastavení (podpis, pečiatka – O57).
 */
export async function issueCelebret(
  db: SupabaseClient,
  clergyId: string,
  input: { issued_on?: string; confession_jurisdiction?: boolean; photo_url?: string | null; note?: string | null },
  userId: string,
): Promise<Result<{ id: string; token: string }>> {
  const { data: c } = await db.from('clergy').select('id, category, status, photo_url').eq('id', clergyId).maybeSingle()
  if (!c) return { success: false, error: 'Osoba sa nenašla v registri.' }
  if (!(CELEBRET_CATEGORIES as readonly string[]).includes(c.category) || !(CELEBRET_STATUSES as readonly string[]).includes(c.status))
    return { success: false, error: 'Celebret sa vydáva len kňazom v službe, na odpočinku alebo na štúdiu (O53).' }
  const issuedOn = input.issued_on && /^\d{4}-\d{2}-\d{2}$/.test(input.issued_on) ? input.issued_on : today()
  const settings = await getCurrentSettings(db)
  const { data: number, error: numError } = await db.rpc('next_celebret_number', { p_year: Number(issuedOn.slice(0, 4)) })
  if (numError || !number) return { success: false, error: 'Nepodarilo sa prideliť číslo celebretu.' }
  const token = newCelebretToken()
  const { data, error } = await db
    .from('clergy_celebrets')
    .insert({
      clergy_id: clergyId,
      number,
      token,
      issued_on: issuedOn,
      valid_until: validUntilFor(issuedOn),
      confession_jurisdiction: input.confession_jurisdiction ?? true,
      photo_url: input.photo_url ?? c.photo_url ?? null,
      settings_id: settings?.id ?? null,
      note: input.note?.trim() || null,
      access_code: newAccessCode(),
      issued_by: userId,
    })
    .select('id')
    .single()
  if (error || !data) return { success: false, error: 'Celebret sa nepodarilo vydať.' }
  return { success: true, id: data.id as string, token }
}

/** Portrét na celebret – štvorec 600 px, WebP. */
export async function processPortrait(file: File): Promise<string | null> {
  if (file.size > 20 * 1024 * 1024) return null
  const buffer = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize(600, 600, { fit: 'cover', position: 'attention' }).webp({ quality: 85 }).toBuffer()
  return (await uploadBuffer(buffer, 'image/webp', 'celebret/foto', 'webp'))?.url ?? null
}

/** Logo, pečiatka, podpis – zachová priehľadnosť, max. 900 px. */
export async function processSettingsImage(file: File): Promise<string | null> {
  if (file.size > 10 * 1024 * 1024) return null
  const buffer = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true }).webp({ quality: 92, alphaQuality: 100 }).toBuffer()
  return (await uploadBuffer(buffer, 'image/webp', 'celebret/nastavenia', 'webp'))?.url ?? null
}

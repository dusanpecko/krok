'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import {
  CELEBRET_CATEGORIES,
  CELEBRET_STATUSES,
  celebretDb,
  celebretState,
  getCurrentSettings,
  issueCelebret,
  listCelebretsForClergy,
  processPortrait,
  processSettingsImage,
  type CelebretSettings,
  type CelebretState,
  type CelebretView,
} from '@/lib/clergy/celebret'
import { displayName } from '@/lib/diocese/schematizmus'

const VIEW = 'view_clergy'
const MANAGE = 'manage_clergy'

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

const fail = (e: unknown): { success: false; error: string } => ({ success: false, error: e instanceof Error ? e.message : 'Neznáma chyba.' })

function revalidate(clergyId?: string) {
  revalidatePath('/admin/knazi/celebrety')
  if (clergyId) revalidatePath(`/admin/knazi/${clergyId}`)
}

async function logChange(clergyId: string, userId: string, action: string, changes: Record<string, unknown>) {
  await celebretDb().from('clergy_change_log').insert({ clergy_id: clergyId, user_id: userId, entity: 'celebret', action, changes })
}

// ---------- detail kňaza ----------

export interface ClergyCelebretData {
  celebrets: CelebretView[]
  photo_url: string | null
  eligible: boolean
  pendingPhoto: { id: string; photo_url: string; created_at: string } | null
  hasSettings: boolean
}

export async function getClergyCelebretData(clergyId: string): Promise<ClergyCelebretData> {
  await requirePermission(VIEW)
  const db = celebretDb()
  const [celebrets, { data: c }, { data: pending }, settings] = await Promise.all([
    listCelebretsForClergy(clergyId),
    db.from('clergy').select('category, status, photo_url').eq('id', clergyId).maybeSingle(),
    db.from('clergy_photo_requests').select('id, photo_url, created_at').eq('clergy_id', clergyId).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    getCurrentSettings(db),
  ])
  return {
    celebrets,
    photo_url: c?.photo_url ?? null,
    eligible: !!c && (CELEBRET_CATEGORIES as readonly string[]).includes(c.category) && (CELEBRET_STATUSES as readonly string[]).includes(c.status),
    pendingPhoto: pending ?? null,
    hasSettings: !!settings,
  }
}

/** Fotka kňaza (len pre celebret) – nahrá kúria. */
export async function uploadClergyPhoto(clergyId: string, form: FormData): Promise<Result<{ url: string }>> {
  try {
    const { user } = await requirePermission(MANAGE)
    const file = form.get('file')
    if (!(file instanceof File) || !file.size) return { success: false, error: 'Vyberte fotku.' }
    const url = await processPortrait(file)
    if (!url) return { success: false, error: 'Fotku sa nepodarilo spracovať (JPG, PNG alebo WebP, najviac 20 MB).' }
    await celebretDb().from('clergy').update({ photo_url: url }).eq('id', clergyId)
    await logChange(clergyId, user.id, 'photo', { photo_url: [null, url] })
    revalidate(clergyId)
    return { success: true, url }
  } catch (e) {
    return fail(e)
  }
}

export async function issueCelebretAction(clergyId: string, input: { issued_on: string; confession_jurisdiction: boolean; note: string }): Promise<Result<{ id: string }>> {
  try {
    const { user } = await requirePermission(MANAGE)
    const db = celebretDb()
    const res = await issueCelebret(db, clergyId, input, user.id)
    if (!res.success) return res
    await logChange(clergyId, user.id, 'issue', { celebret: [null, res.id] })
    revalidate(clergyId)
    return { success: true, id: res.id }
  } catch (e) {
    return fail(e)
  }
}

export async function revokeCelebret(id: string, reason: string): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    const db = celebretDb()
    const { data } = await db.from('clergy_celebrets').update({ revoked_at: new Date().toISOString(), revoked_reason: reason.trim() || null }).eq('id', id).is('revoked_at', null).select('clergy_id').maybeSingle()
    if (!data) return { success: false, error: 'Celebret sa nenašiel alebo už je zrušený.' }
    await logChange(data.clergy_id, user.id, 'revoke', { celebret: [id, null], reason: [null, reason] })
    revalidate(data.clergy_id)
    return { success: true }
  } catch (e) {
    return fail(e)
  }
}

// ---------- prehľad, hromadné vydanie ----------

export interface CelebretOverviewRow {
  clergy_id: string
  name: string
  sort: string
  status: string
  has_photo: boolean
  latest: { id: string; number: string; valid_until: string; state: CelebretState } | null
}

export async function getCelebretOverview(): Promise<{ rows: CelebretOverviewRow[]; pendingPhotos: { id: string; clergy_id: string; name: string; photo_url: string; created_at: string }[]; settings: CelebretSettings | null }> {
  await requirePermission(VIEW)
  const db = celebretDb()
  const [{ data: clergy }, { data: celebrets }, { data: pending }, settings] = await Promise.all([
    db.from('clergy').select('id, first_name, last_name, title_before, title_after, ecclesiastical_titles, status, photo_url, religious_orders(code)').in('category', CELEBRET_CATEGORIES as unknown as string[]).in('status', CELEBRET_STATUSES as unknown as string[]),
    db.from('clergy_celebrets').select('id, clergy_id, number, issued_on, valid_until, revoked_at, created_at').order('issued_on', { ascending: false }).order('created_at', { ascending: false }),
    db.from('clergy_photo_requests').select('id, clergy_id, photo_url, created_at').eq('status', 'pending').order('created_at'),
    getCurrentSettings(db),
  ])
  const latest = new Map<string, CelebretOverviewRow['latest']>()
  for (const c of celebrets ?? []) if (!latest.has(c.clergy_id)) latest.set(c.clergy_id, { id: c.id, number: c.number, valid_until: c.valid_until, state: celebretState(c) })
  type Row = { id: string; first_name: string; last_name: string; title_before: string | null; title_after: string | null; ecclesiastical_titles: string[] | null; status: string; photo_url: string | null; religious_orders: { code: string } | null }
  const rows = ((clergy ?? []) as unknown as Row[]).map((c) => ({
    clergy_id: c.id,
    name: displayName(c, c.religious_orders?.code),
    sort: `${c.last_name} ${c.first_name}`.toLocaleLowerCase('sk'),
    status: c.status,
    has_photo: !!c.photo_url,
    latest: latest.get(c.id) ?? null,
  }))
  rows.sort((a, b) => a.sort.localeCompare(b.sort, 'sk'))
  const names = new Map(rows.map((r) => [r.clergy_id, r.name]))
  return {
    rows,
    pendingPhotos: (pending ?? []).map((p) => ({ ...p, name: names.get(p.clergy_id) ?? '' })),
    settings,
  }
}

/** Hromadné vydanie (napr. všetkým v službe naraz) – preskočí tých, čo majú platný celebret dlhšie ako `skipValidDays` dní. */
export async function issueCelebretsBulk(clergyIds: string[], issuedOn: string): Promise<Result<{ issued: number; skipped: number; errors: string[] }>> {
  try {
    const { user } = await requirePermission(MANAGE)
    const db = celebretDb()
    let issued = 0
    let skipped = 0
    const errors: string[] = []
    for (const id of clergyIds.slice(0, 400)) {
      const res = await issueCelebret(db, id, { issued_on: issuedOn }, user.id)
      if (res.success) {
        issued++
        await logChange(id, user.id, 'issue', { celebret: [null, res.id], bulk: [null, true] })
      } else {
        skipped++
        if (errors.length < 10) errors.push(res.error)
      }
    }
    revalidate()
    return { success: true, issued, skipped, errors }
  } catch (e) {
    return fail(e)
  }
}

// ---------- fotky od kňazov ----------

export async function reviewPhotoRequest(id: string, approve: boolean, reason = ''): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    const db = celebretDb()
    const { data: req } = await db.from('clergy_photo_requests').select('id, clergy_id, photo_url, status').eq('id', id).maybeSingle()
    if (!req || req.status !== 'pending') return { success: false, error: 'Návrh fotky sa nenašiel.' }
    await db.from('clergy_photo_requests').update({ status: approve ? 'approved' : 'rejected', reject_reason: approve ? null : reason.trim() || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', id)
    if (approve) {
      await db.from('clergy').update({ photo_url: req.photo_url }).eq('id', req.clergy_id)
      await logChange(req.clergy_id, user.id, 'photo', { photo_url: [null, req.photo_url], from_request: [null, id] })
    }
    revalidate(req.clergy_id)
    return { success: true }
  } catch (e) {
    return fail(e)
  }
}

// ---------- nastavenia (verzie) ----------

/** Uloží novú verziu nastavení – nenahrané obrázky sa prevezmú z predošlej verzie (O57). */
export async function saveCelebretSettings(form: FormData): Promise<Result> {
  try {
    const { user } = await requirePermission(MANAGE)
    const db = celebretDb()
    const prev = await getCurrentSettings(db)
    const image = async (field: string, prevUrl: string | null | undefined) => {
      const file = form.get(field)
      if (form.get(`${field}_remove`) === '1') return null
      if (file instanceof File && file.size) {
        const url = await processSettingsImage(file)
        if (!url) throw new Error('Obrázok sa nepodarilo spracovať (PNG s priehľadným pozadím, najviac 10 MB).')
        return url
      }
      return prevUrl ?? null
    }
    const text = (k: string, fallback: string | null | undefined) => {
      const v = form.get(k)
      return typeof v === 'string' ? v.trim() || null : fallback ?? null
    }
    const row = {
      logo_url: await image('logo', prev?.logo_url),
      stamp_url: await image('stamp', prev?.stamp_url),
      signature_url: await image('signature', prev?.signature_url),
      signer_name: text('signer_name', prev?.signer_name),
      signer_function: text('signer_function', prev?.signer_function),
      curia_address: text('curia_address', prev?.curia_address) ?? 'Jána Kalinčiaka 1, 010 01 Žilina',
      curia_phone: text('curia_phone', prev?.curia_phone) ?? '+421 41 500 22 15',
      curia_email: text('curia_email', prev?.curia_email) ?? 'sekretariat@dcza.sk',
      created_by: user.id,
    }
    const { error } = await db.from('celebret_settings').insert(row)
    if (error) return { success: false, error: 'Nastavenia sa nepodarilo uložiť.' }
    revalidatePath('/admin/knazi/celebrety/nastavenia')
    revalidatePath('/admin/knazi/celebrety')
    return { success: true }
  } catch (e) {
    return fail(e)
  }
}

export async function getCelebretSettingsHistory(): Promise<CelebretSettings[]> {
  await requirePermission(VIEW)
  const { data } = await celebretDb().from('celebret_settings').select('id, logo_url, stamp_url, signature_url, signer_name, signer_function, curia_address, curia_phone, curia_email, created_at').order('created_at', { ascending: false }).limit(20)
  return (data ?? []) as CelebretSettings[]
}

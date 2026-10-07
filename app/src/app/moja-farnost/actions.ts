'use server'

import { revalidatePath } from 'next/cache'
import { getMyParishes, requireParishMember, type MyParish } from '@/lib/parishes/access'
import { requireAuth } from '@/lib/auth'
import { loadParishDetail } from '@/lib/parishes/load'
import { logParishChange, writeSchedule } from '@/lib/parishes/writes'
import { LIVE_PARISH_FIELDS, PROTECTED_PARISH_FIELDS, normalizeParishValue, FIELD_LABEL } from '@/lib/parishes/fields'
import type { ClergyMember, ParishDetail, Schedule, VillageWithStats } from '@/lib/parishes/types'
import { POST_COLUMNS, loadSacramentEditRows, type ParishPostRow, type SacramentEditRow } from '@/lib/parishes/posts'

/**
 * Zóna farnosti /moja-farnost (návrh farností § 6.2, fáza F4).
 * Kňaz vidí len agregáty (O3) – žiadne mená darcov. Úradné údaje a štatistiku len navrhuje (O5, O6);
 * prezentáciu, bohoslužby a vlastný kontakt ukladá hneď (s auditom).
 */

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

export async function getMyParishList(): Promise<MyParish[]> {
  const user = await requireAuth()
  return getMyParishes(user.id)
}

export interface MyParishRequest {
  id: string
  entity: string
  payload: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  review_note: string | null
}

export interface MyParishView extends Omit<ParishDetail, 'log' | 'donorsCount'> {
  role: 'admin' | 'editor'
  /** diecéza je „prihlásená za farnosť“ (náhľad z adminu) */
  impersonating: boolean
  deaneryName: string | null
  donorsCount: number
  requests: MyParishRequest[]
  posts: ParishPostRow[]
  sacraments: SacramentEditRow[]
}

export async function getMyParishView(parishId: string): Promise<MyParishView> {
  const { role, db, impersonating } = await requireParishMember(parishId)
  const detail = await loadParishDetail(db, parishId)
  if (!detail) throw new Error('Farnosť sa nenašla.')
  const [{ data: deanery }, { data: requests }, { data: posts }, sacraments] = await Promise.all([
    detail.parish.deanery_id ? db.from('deaneries').select('name').eq('id', detail.parish.deanery_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('parish_change_requests').select('id, entity, payload, status, submitted_at, review_note').eq('parish_id', parishId).order('submitted_at', { ascending: false }).limit(20),
    db.from('parish_posts').select(POST_COLUMNS).eq('parish_id', parishId).order('created_at', { ascending: false }).limit(200),
    loadSacramentEditRows(db, parishId),
  ])
  // interná poznámka diecézy sa farnosti nezobrazuje
  const { log: _log, ...rest } = detail
  void _log
  // editor nevidí prehľad darov (§ 3.7)
  return {
    ...rest,
    parish: { ...detail.parish, notes: null },
    summary: role === 'admin' ? detail.summary : [],
    donorsCount: role === 'admin' ? detail.donorsCount : 0,
    role,
    impersonating,
    deaneryName: (deanery as { name: string } | null)?.name ?? null,
    requests: (requests ?? []) as MyParishRequest[],
    posts: (posts ?? []) as ParishPostRow[],
    sacraments,
  }
}

/** Prezentácia (text na web, hody, poklona, GPS) – ukladá sa hneď. */
export async function updateMyPresentation(parishId: string, input: Record<string, unknown>): Promise<Result> {
  const { user, db } = await requireParishMember(parishId)
  const { data: before } = await db.from('parishes').select(LIVE_PARISH_FIELDS.join(',')).eq('id', parishId).maybeSingle()
  const patch: Record<string, unknown> = {}
  const changes: Record<string, [unknown, unknown]> = {}
  for (const f of LIVE_PARISH_FIELDS) {
    if (!(f in input)) continue
    const { value, error } = normalizeParishValue(f, input[f])
    if (error) return { success: false, error: `${FIELD_LABEL[f]}: ${error}` }
    const old = (before as unknown as Record<string, unknown> | null)?.[f] ?? null
    if (String(old ?? '') !== String(value ?? '')) {
      patch[f] = value
      changes[f] = [old, value]
    }
  }
  if (!Object.keys(patch).length) return { success: true }
  const { error } = await db.from('parishes').update({ ...patch, profile_updated_at: new Date().toISOString(), profile_updated_by: user.id }).eq('id', parishId)
  if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  await logParishChange(db, parishId, user.id, 'parish', 'parish_update', changes)
  revalidatePath(`/moja-farnost/${parishId}`)
  return { success: true }
}

/** Bohoslužby – farnosť ukladá priamo (O6). */
export async function saveMySchedule(parishId: string, schedule: Schedule): Promise<Result> {
  const { user, db } = await requireParishMember(parishId)
  const res = await writeSchedule(db, parishId, schedule, user.id)
  if (!res.success) return res
  await logParishChange(db, parishId, user.id, 'schedule', 'parish_update', { season: schedule.season, items: schedule.items.length, is_active: schedule.is_active })
  revalidatePath(`/moja-farnost/${parishId}`)
  return { success: true }
}

/** Návrh zmeny úradných údajov – ide na schválenie diecéze. Len admin účet farnosti. */
export async function submitParishChange(parishId: string, input: Record<string, unknown>, note?: string): Promise<Result> {
  const { user, role, db } = await requireParishMember(parishId)
  if (role !== 'admin') return { success: false, error: 'Zmenu úradných údajov môže navrhnúť len správca účtu farnosti.' }
  const fields = PROTECTED_PARISH_FIELDS.filter((f) => f in input)
  const { data: before } = await db.from('parishes').select(fields.join(',') || 'id').eq('id', parishId).maybeSingle()
  const payload: Record<string, unknown> = {}
  for (const f of fields) {
    const { value, error } = normalizeParishValue(f, input[f])
    if (error) return { success: false, error: `${FIELD_LABEL[f]}: ${error}` }
    if (String((before as unknown as Record<string, unknown> | null)?.[f] ?? '') !== String(value ?? '')) payload[f] = value
  }
  if (!Object.keys(payload).length) return { success: false, error: 'Nezmenili ste žiadny údaj.' }
  if (note?.trim()) payload._note = note.trim().slice(0, 500)
  const { error } = await db.from('parish_change_requests').insert({ parish_id: parishId, entity: 'parish', payload, submitted_by: user.id })
  if (error) return { success: false, error: 'Odoslanie návrhu zlyhalo.' }
  await logParishChange(db, parishId, user.id, 'parish', 'submit', { fields: Object.keys(payload).filter((k) => k !== '_note') })
  revalidatePath(`/moja-farnost/${parishId}`)
  return { success: true }
}

/** Návrh opravy štatistiky veriacich (O5) – mení len diecéza. */
export async function submitPopulationChange(parishId: string, villages: VillageWithStats[], note?: string): Promise<Result> {
  const { user, role, db } = await requireParishMember(parishId)
  if (role !== 'admin') return { success: false, error: 'Opravu štatistiky môže navrhnúť len správca účtu farnosti.' }
  const clean = villages
    .map((v) => ({ id: v.id, name: v.name.trim(), is_seat: false, district: v.district, church_name: v.church_name, has_church: v.has_church, population: v.population, catholics: v.catholics, source: 'návrh farnosti' }))
    .filter((v) => v.name)
  if (!clean.length) return { success: false, error: 'Zoznam obcí je prázdny.' }
  const { error } = await db.from('parish_change_requests').insert({ parish_id: parishId, entity: 'population', payload: { villages: clean, _note: note?.trim() || null }, submitted_by: user.id })
  if (error) return { success: false, error: 'Odoslanie návrhu zlyhalo.' }
  await logParishChange(db, parishId, user.id, 'population', 'submit', { villages: clean.length })
  revalidatePath(`/moja-farnost/${parishId}`)
  return { success: true }
}

/** Kontakt, foto a súhlas so zverejnením kontaktu konkrétneho kňaza – mení sa hneď (§ 3.8). */
export async function updateMyClergyContact(parishId: string, clergyId: string, input: Pick<ClergyMember, 'phone' | 'email' | 'photo_url' | 'is_public'>): Promise<Result> {
  const { user, db } = await requireParishMember(parishId)
  const { data: c } = await db.from('parish_clergy').select('id, full_name, photo_url').eq('id', clergyId).eq('parish_id', parishId).maybeSingle()
  if (!c) return { success: false, error: 'Kňaz sa nenašiel.' }
  const email = input.email?.trim().toLowerCase() || null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Neplatný e-mail.' }
  const photo = input.photo_url?.trim() || null
  if (photo && !/^https:\/\//i.test(photo)) return { success: false, error: 'Foto musí byť nahraté cez tlačidlo.' }
  const patch = { phone: input.phone?.trim() || null, email, photo_url: photo, is_public: !!input.is_public, updated_at: new Date().toISOString() }
  const { error } = await db.from('parish_clergy').update(patch).eq('id', clergyId)
  if (error) return { success: false, error: 'Uloženie zlyhalo.' }
  const changes: Record<string, string> = { [c.full_name]: `kontakt ${patch.is_public ? 'verejný' : 'neverejný'}` }
  if ((c.photo_url ?? null) !== photo) changes.foto = photo ? 'nahraté' : 'odstránené'
  await logParishChange(db, parishId, user.id, 'clergy', 'parish_update', changes)
  revalidatePath(`/moja-farnost/${parishId}`)
  return { success: true }
}

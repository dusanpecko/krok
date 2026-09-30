'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth'
import { generateSlug } from '@/lib/slug'
import {
  PARISH_EDITABLE_FIELDS,
  type ClergyMember,
  type ParishDetail,
  type ParishListItem,
  type ParishRow,
  type ParishSeason,
  type ParishYearSummary,
  type Schedule,
  type ScheduleItem,
  type VillageWithStats,
} from '@/lib/parishes/types'

/**
 * Admin modul farností (návrh farností § 6.1, fáza F2).
 * Citlivé stĺpce parishes nie sú čitateľné cez klienta používateľa (migrácia 034) –
 * všetko ide cez service role za kontrolou oprávnenia manage_parishes.
 */

const PERM = 'manage_parishes'

function db() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type Result<T = object> = ({ success: true } & T) | { success: false; error: string }

async function log(parishId: string, userId: string, entity: string, action: string, changes: Record<string, unknown>) {
  await db().from('parish_change_log').insert({ parish_id: parishId, user_id: userId, entity, action, changes })
}

const STATS_YEAR = 2021

// ------------------------------------------------------------ zoznam

export async function getParishesForAdmin(): Promise<ParishListItem[]> {
  await requirePermission(PERM)
  const admin = db()
  const year = new Date().getFullYear()

  const [{ data: parishes }, { data: deaneries }, { data: population }, { data: villages }, { data: donors }, { data: summary }] = await Promise.all([
    admin
      .from('parishes')
      .select('id, name, official_name, slug, kind, deanery_id, parish_code, city, is_active, visible_on_web, administrator_name, ico, iban, email, updated_at'),
    admin.from('deaneries').select('id, name'),
    admin.from('v_parish_population').select('parish_id, catholics').eq('year', STATS_YEAR),
    admin.from('parish_villages').select('parish_id'),
    admin.from('donors').select('parish_id').not('parish_id', 'is', null),
    admin.from('v_parish_year_summary').select('parish_id, collected_amount, prescribed_amount').eq('year', year),
  ])

  const deaneryName = new Map((deaneries ?? []).map((d) => [d.id as string, d.name as string]))
  const catholics = new Map((population ?? []).map((p) => [p.parish_id as string, Number(p.catholics)]))
  const count = (rows: { parish_id: string | null }[] | null) => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) if (r.parish_id) m.set(r.parish_id, (m.get(r.parish_id) ?? 0) + 1)
    return m
  }
  const villagesCount = count(villages as { parish_id: string }[] | null)
  const donorsCount = count(donors as { parish_id: string }[] | null)
  const collected = new Map((summary ?? []).map((s) => [s.parish_id as string, Number(s.collected_amount)]))
  const prescribed = new Map((summary ?? []).filter((s) => s.prescribed_amount != null).map((s) => [s.parish_id as string, Number(s.prescribed_amount)]))

  return (parishes ?? [])
    .map((p) => {
      const missing: string[] = []
      if (p.kind === 'parish' && !catholics.get(p.id)) missing.push('štatistika')
      if (!p.ico) missing.push('IČO')
      if (!p.iban) missing.push('IBAN')
      if (!p.email) missing.push('e-mail')
      if (!p.deanery_id && p.kind === 'parish') missing.push('dekanát')
      return {
        id: p.id,
        name: p.name,
        official_name: p.official_name,
        slug: p.slug,
        kind: p.kind,
        deanery_id: p.deanery_id,
        deanery_name: p.deanery_id ? deaneryName.get(p.deanery_id) ?? null : null,
        parish_code: p.parish_code,
        city: p.city,
        is_active: p.is_active,
        visible_on_web: p.visible_on_web,
        administrator_name: p.administrator_name,
        catholics: catholics.get(p.id) ?? null,
        villages_count: villagesCount.get(p.id) ?? 0,
        donors_count: donorsCount.get(p.id) ?? 0,
        collected_this_year: collected.get(p.id) ?? 0,
        prescribed_this_year: prescribed.get(p.id) ?? null,
        missing,
        updated_at: p.updated_at,
      } satisfies ParishListItem
    })
    .sort((a, b) => (a.official_name ?? a.name).localeCompare(b.official_name ?? b.name, 'sk'))
}

export async function getDeaneryOptions(): Promise<{ id: string; name: string }[]> {
  await requirePermission(PERM)
  const { data } = await db().from('deaneries').select('id, name').order('name')
  return (data ?? []) as { id: string; name: string }[]
}

// ------------------------------------------------------------ detail

const emptySchedule = (season: ParishSeason): Schedule => ({
  season,
  is_active: season === 'regular',
  valid_from: season === 'summer' ? `${new Date().getFullYear()}-07-01` : null,
  valid_to: season === 'summer' ? `${new Date().getFullYear()}-08-31` : null,
  note: null,
  items: [],
})

export async function getParishForAdmin(id: string): Promise<ParishDetail | null> {
  await requirePermission(PERM)
  const admin = db()
  const { data: parish } = await admin.from('parishes').select('*').eq('id', id).maybeSingle()
  if (!parish) return null

  const [{ data: villages }, { data: schedules }, { data: clergy }, { data: summary }, { count: donorsCount }, { data: logRows }] = await Promise.all([
    admin.from('parish_villages').select('id, name, is_seat, district, church_name, has_church, sort_order, parish_population_stats(year, population, catholics, source)').eq('parish_id', id).order('sort_order'),
    admin.from('parish_schedules').select('id, season, is_active, valid_from, valid_to, note, parish_schedule_items(*)').eq('parish_id', id),
    admin.from('parish_clergy').select('*').eq('parish_id', id).order('sort_order'),
    admin.from('v_parish_year_summary').select('*').eq('parish_id', id).order('year', { ascending: false }),
    admin.from('donors').select('id', { count: 'exact', head: true }).eq('parish_id', id),
    admin.from('parish_change_log').select('id, action, entity, changes, created_at, user_id').eq('parish_id', id).order('created_at', { ascending: false }).limit(30),
  ])

  const schedMap: Record<ParishSeason, Schedule> = { regular: emptySchedule('regular'), summer: emptySchedule('summer') }
  for (const s of schedules ?? []) {
    const items = ((s.parish_schedule_items ?? []) as (ScheduleItem & { sort_order: number; schedule_id: string })[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ sort_order: _o, schedule_id: _s, ...it }) => {
        void _o
        void _s
        return { ...it, time_from: it.time_from?.slice(0, 5) ?? null, time_to: it.time_to?.slice(0, 5) ?? null }
      })
    schedMap[s.season as ParishSeason] = { season: s.season, is_active: s.is_active, valid_from: s.valid_from, valid_to: s.valid_to, note: s.note, items }
  }

  // E-maily autorov zmien v histórii
  const userIds = [...new Set((logRows ?? []).map((l) => l.user_id).filter(Boolean) as string[])]
  const emails = new Map<string, string>()
  for (const uid of userIds) {
    const { data } = await admin.auth.admin.getUserById(uid)
    if (data?.user?.email) emails.set(uid, data.user.email)
  }

  return {
    parish: parish as ParishRow,
    villages: (villages ?? []).map((v) => {
      const st = ((v.parish_population_stats ?? []) as { year: number; population: number | null; catholics: number | null; source: string | null }[]).find((s) => s.year === STATS_YEAR)
      return {
        id: v.id,
        name: v.name,
        is_seat: v.is_seat,
        district: v.district,
        church_name: v.church_name,
        has_church: v.has_church,
        population: st?.population ?? null,
        catholics: st?.catholics ?? null,
        source: st?.source ?? null,
      }
    }),
    schedules: schedMap,
    clergy: (clergy ?? []) as ClergyMember[],
    summary: ((summary ?? []) as ParishYearSummary[]).map((s) => ({
      ...s,
      prescribed_amount: s.prescribed_amount != null ? Number(s.prescribed_amount) : null,
      collected_amount: Number(s.collected_amount),
      fulfillment_pct: s.fulfillment_pct != null ? Number(s.fulfillment_pct) : null,
    })),
    donorsCount: donorsCount ?? 0,
    log: (logRows ?? []).map((l) => ({ id: l.id, action: l.action, entity: l.entity, changes: l.changes, created_at: l.created_at, user_email: l.user_id ? emails.get(l.user_id) ?? null : null })),
  }
}

// ------------------------------------------------------------ zápis

const trimOrNull = (v: unknown) => {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v === 'boolean' || typeof v === 'number') return v
  const s = String(v).trim()
  return s === '' ? null : s
}

/** Uloží základné údaje; do histórie zapíše len zmenené polia (staré → nové). */
export async function updateParish(id: string, input: Partial<Record<(typeof PARISH_EDITABLE_FIELDS)[number], unknown>>): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const { data: before } = await admin.from('parishes').select('*').eq('id', id).maybeSingle()
  if (!before) return { success: false, error: 'Farnosť sa nenašla.' }

  const patch: Record<string, unknown> = {}
  for (const f of PARISH_EDITABLE_FIELDS) {
    if (!(f in input)) continue
    let v = trimOrNull(input[f])
    if (f === 'iban' && typeof v === 'string') v = v.replace(/\s+/g, '').toUpperCase()
    if (f === 'email' && typeof v === 'string') v = v.toLowerCase()
    if ((f === 'latitude' || f === 'longitude') && v != null) v = Number(v)
    patch[f] = v
  }
  if (!patch.name) return { success: false, error: 'Názov je povinný.' }
  if (patch.iban && !/^SK\d{22}$/.test(String(patch.iban))) return { success: false, error: 'IBAN musí mať tvar SK + 22 číslic.' }
  if (patch.ico && !/^\d{6,8}$/.test(String(patch.ico))) return { success: false, error: 'IČO musí mať 6–8 číslic.' }

  const changes: Record<string, [unknown, unknown]> = {}
  for (const [k, v] of Object.entries(patch)) {
    const old = (before as Record<string, unknown>)[k] ?? null
    if (String(old ?? '') !== String(v ?? '')) changes[k] = [old, v]
  }
  if (Object.keys(changes).length === 0) return { success: true }

  const { error } = await admin
    .from('parishes')
    .update({ ...patch, profile_updated_at: new Date().toISOString(), profile_updated_by: user.id })
    .eq('id', id)
  if (error) return { success: false, error: error.message.includes('parishes_slug_key') ? 'Farnosť s týmto názvom už existuje.' : 'Uloženie zlyhalo.' }

  await log(id, user.id, 'parish', 'admin_update', changes)
  revalidatePath('/admin/farnosti')
  revalidatePath(`/admin/farnosti/${id}`)
  return { success: true }
}

export async function createParish(input: { name: string; kind: string; deanery_id: string | null }): Promise<Result<{ id: string }>> {
  const { user } = await requirePermission(PERM)
  const name = input.name?.trim()
  if (!name) return { success: false, error: 'Názov je povinný.' }
  const kind = ['parish', 'chaplaincy', 'other'].includes(input.kind) ? input.kind : 'parish'
  const admin = db()
  let slug = generateSlug(name.replace(/^Farnosť\s+/i, ''))
  const { data: clash } = await admin.from('parishes').select('id').eq('slug', slug).maybeSingle()
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`
  const { data, error } = await admin
    .from('parishes')
    .insert({ name, official_name: name.replace(/^Farnosť\s+/i, ''), slug, kind, deanery_id: input.deanery_id || null })
    .select('id')
    .single()
  if (error || !data) return { success: false, error: 'Založenie farnosti zlyhalo.' }
  await log(data.id, user.id, 'parish', 'admin_update', { created: [null, name] })
  revalidatePath('/admin/farnosti')
  return { success: true, id: data.id }
}

/** Obce a štatistika (rok SODB 2021) – celý zoznam naraz; odstránené obce sa zmažú. */
export async function saveVillages(parishId: string, villages: VillageWithStats[]): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const clean = villages
    .map((v) => ({ ...v, name: v.name.trim() }))
    .filter((v) => v.name)
  const names = clean.map((v) => v.name.toLowerCase())
  if (new Set(names).size !== names.length) return { success: false, error: 'Názvy obcí sa nesmú opakovať.' }

  const { data: existing } = await admin.from('parish_villages').select('id').eq('parish_id', parishId)
  const keepIds = new Set(clean.map((v) => v.id).filter(Boolean) as string[])
  const removeIds = (existing ?? []).map((e) => e.id as string).filter((id) => !keepIds.has(id))
  if (removeIds.length) await admin.from('parish_villages').delete().in('id', removeIds)

  for (const [i, v] of clean.entries()) {
    const row = { parish_id: parishId, name: v.name, is_seat: i === 0 || v.is_seat, district: v.district || null, church_name: v.church_name || null, has_church: v.has_church, sort_order: i }
    const { data: saved, error } = v.id
      ? await admin.from('parish_villages').update(row).eq('id', v.id).select('id').single()
      : await admin.from('parish_villages').insert(row).select('id').single()
    if (error || !saved) return { success: false, error: `Obec „${v.name}“: uloženie zlyhalo.` }
    if (v.population != null || v.catholics != null) {
      await admin
        .from('parish_population_stats')
        .upsert({ village_id: saved.id, year: STATS_YEAR, population: v.population, catholics: v.catholics, source: v.source || 'ručne' }, { onConflict: 'village_id,year' })
    } else {
      await admin.from('parish_population_stats').delete().eq('village_id', saved.id).eq('year', STATS_YEAR)
    }
  }

  await log(parishId, user.id, 'population', 'admin_update', { villages: clean.map((v) => `${v.name}: ${v.catholics ?? '–'}/${v.population ?? '–'}`) })
  revalidatePath(`/admin/farnosti/${parishId}`)
  revalidatePath('/admin/farnosti')
  return { success: true }
}

/** Rozvrh bohoslužieb pre jeden režim (cez rok / letný) – položky sa prepíšu celé. */
export async function saveSchedule(parishId: string, schedule: Schedule): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const items = schedule.items.filter((it) => it.day_of_week != null || it.day_label)
  for (const it of items) {
    if (!it.time_from && !it.relative_note) return { success: false, error: 'Každá položka potrebuje čas alebo poznámku (napr. „30 minút pred sv. omšou“).' }
    if (it.time_to && it.time_from && it.time_to < it.time_from) return { success: false, error: 'Koniec nesmie byť skôr ako začiatok.' }
  }

  const { data: sched, error } = await admin
    .from('parish_schedules')
    .upsert(
      { parish_id: parishId, season: schedule.season, is_active: schedule.is_active, valid_from: schedule.valid_from || null, valid_to: schedule.valid_to || null, note: schedule.note || null, updated_at: new Date().toISOString(), updated_by: user.id },
      { onConflict: 'parish_id,season' }
    )
    .select('id')
    .single()
  if (error || !sched) return { success: false, error: 'Uloženie rozvrhu zlyhalo.' }

  await admin.from('parish_schedule_items').delete().eq('schedule_id', sched.id)
  if (items.length) {
    const { error: itemsErr } = await admin.from('parish_schedule_items').insert(
      items.map((it, i) => ({
        schedule_id: sched.id,
        service_type: it.service_type,
        occasion: it.occasion,
        day_of_week: it.day_of_week,
        day_label: it.day_label || null,
        time_from: it.time_from || null,
        time_to: it.time_to || null,
        relative_note: it.relative_note || null,
        note: it.note || null,
        village_id: it.village_id || null,
        sort_order: i,
      }))
    )
    if (itemsErr) return { success: false, error: 'Uloženie položiek rozvrhu zlyhalo.' }
  }

  await log(parishId, user.id, 'schedule', 'admin_update', { season: schedule.season, items: items.length, is_active: schedule.is_active })
  revalidatePath(`/admin/farnosti/${parishId}`)
  return { success: true }
}

/** Kňazi vo farnosti – celý zoznam naraz. */
export async function saveClergy(parishId: string, clergy: ClergyMember[]): Promise<Result> {
  const { user } = await requirePermission(PERM)
  const admin = db()
  const clean = clergy.map((c) => ({ ...c, full_name: c.full_name.trim() })).filter((c) => c.full_name)
  await admin.from('parish_clergy').delete().eq('parish_id', parishId)
  if (clean.length) {
    const { error } = await admin.from('parish_clergy').insert(
      clean.map((c, i) => ({
        parish_id: parishId,
        full_name: c.full_name,
        title_before: c.title_before || null,
        title_after: c.title_after || null,
        position: c.position?.trim() || '',
        phone: c.phone || null,
        email: c.email || null,
        is_public: c.is_public,
        source: c.source || 'ručne',
        sort_order: i,
      }))
    )
    if (error) return { success: false, error: 'Uloženie kňazov zlyhalo.' }
  }
  await log(parishId, user.id, 'clergy', 'admin_update', { clergy: clean.map((c) => `${c.full_name} (${c.position})`) })
  revalidatePath(`/admin/farnosti/${parishId}`)
  return { success: true }
}
